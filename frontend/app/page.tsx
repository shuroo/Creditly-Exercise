"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiGet, apiPost, type Role } from "@/app/lib/api";
import { useSession } from "@/app/lib/session";

type EntityKey = "accounts" | "events" | "auctions" | "bankOffers";

type Entity = {
  key: EntityKey;
  label: string;
  path: string;
  /** Roles allowed to create this entity (mirrors backend guards). */
  createRoles: Role[];
  build: (form: Record<string, string>) => unknown;
  fields: Array<
    | { name: string; label: string; type?: "text" | "number" }
    | { name: string; label: string; type: "select"; options: string[] }
  >;
  initial: Record<string, string>;
};

const ENTITIES: Entity[] = [
  {
    key: "accounts",
    label: "Account",
    path: "/accounts",
    createRoles: ["ADMIN", "MANAGER"],
    initial: {
      customerName: "",
      phone: "",
      email: "",
      status: "ELIGIBLE",
    },
    fields: [
      { name: "customerName", label: "Customer name" },
      { name: "phone", label: "Phone" },
      { name: "email", label: "Email" },
      {
        name: "status",
        label: "Status",
        type: "select",
        options: ["NEW", "ELIGIBLE", "AUCTION_OPEN", "WON", "EXPIRED"],
      },
    ],
    // managerId is stamped by the server from the token.
    build: (f) => ({
      customerName: f.customerName,
      phone: f.phone,
      email: f.email,
      status: f.status,
      highActivity: false,
    }),
  },
  {
    key: "events",
    label: "Event",
    path: "/events",
    createRoles: ["ADMIN", "MANAGER", "USER"],
    initial: {
      accountId: "",
      type: "note_added",
      description: "",
    },
    fields: [
      { name: "accountId", label: "Account ID" },
      {
        name: "type",
        label: "Type",
        type: "select",
        options: [
          "document_uploaded",
          "status_changed",
          "note_added",
          "auction_opened",
          "offer_submitted",
          "auction_closed",
        ],
      },
      { name: "description", label: "Description (optional)" },
    ],
    // createdByUserId is stamped by the server from the token.
    build: (f) => ({
      accountId: f.accountId,
      type: f.type,
      ...(f.description ? { description: f.description } : {}),
    }),
  },
  {
    key: "auctions",
    label: "Auction",
    path: "/auction-opportunities",
    createRoles: ["ADMIN", "MANAGER"],
    // status, openedAt, expiresAt, model are server-controlled.
    initial: {
      accountId: "",
      eligibleBankIds: "bank-1",
    },
    fields: [
      { name: "accountId", label: "Account ID" },
      { name: "eligibleBankIds", label: "Eligible bank IDs (comma separated)" },
    ],
    build: (f) => ({
      accountId: f.accountId,
      eligibleBankIds: f.eligibleBankIds
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    }),
  },
  {
    key: "bankOffers",
    label: "Bank Offer",
    path: "/bank-offers",
    createRoles: ["ADMIN", "BANKER"],
    initial: {
      auctionId: "",
      interestRate: "",
    },
    fields: [
      { name: "auctionId", label: "Auction ID" },
      { name: "interestRate", label: "Interest rate", type: "number" },
    ],
    // bankId is taken from the banker's token by the server.
    build: (f) => ({
      auctionId: f.auctionId,
      interestRate: Number(f.interestRate),
    }),
  },
];

const GET_ACTIONS: Array<{ label: string; path: string; roles: Role[] }> = [
  { label: "Get Accounts", path: "/accounts", roles: ["ADMIN", "MANAGER", "USER", "BANKER"] },
  { label: "Get Events", path: "/events", roles: ["ADMIN", "MANAGER", "USER"] },
  {
    label: "Get Auctions",
    path: "/auction-opportunities",
    roles: ["ADMIN", "MANAGER", "BANKER"],
  },
  { label: "Get Bank Offers", path: "/bank-offers", roles: ["ADMIN", "BANKER"] },
  { label: "Get Users", path: "/users", roles: ["ADMIN"] },
];

export default function Workspace() {
  const { session, ready, logout } = useSession();
  const router = useRouter();

  // Guard: bounce to login when there's no session.
  useEffect(() => {
    if (ready && !session) router.replace("/login");
  }, [ready, session, router]);

  const role = session?.user.role;
  const token = session?.token ?? "";

  const [result, setResult] = useState("");
  const [closeId, setCloseId] = useState("");

  // Entities this role may create.
  const visibleEntities = useMemo(
    () => (role ? ENTITIES.filter((e) => e.createRoles.includes(role)) : []),
    [role]
  );
  const visibleGets = useMemo(
    () => (role ? GET_ACTIONS.filter((g) => g.roles.includes(role)) : []),
    [role]
  );

  const [activeKey, setActiveKey] = useState<EntityKey | null>(null);
  // Default the active tab to the first one this role can use.
  useEffect(() => {
    if (visibleEntities.length && !activeKey) {
      setActiveKey(visibleEntities[0].key);
    }
  }, [visibleEntities, activeKey]);

  const active = useMemo(
    () => ENTITIES.find((e) => e.key === activeKey) ?? null,
    [activeKey]
  );

  const [forms, setForms] = useState<Record<EntityKey, Record<string, string>>>(
    () =>
      ENTITIES.reduce(
        (acc, e) => ({ ...acc, [e.key]: { ...e.initial } }),
        {} as Record<EntityKey, Record<string, string>>
      )
  );

  const [json, setJson] = useState("");
  const [jsonDirty, setJsonDirty] = useState(false);

  useEffect(() => {
    if (!active || jsonDirty) return;
    setJson(JSON.stringify(active.build(forms[active.key]), null, 2));
  }, [active, forms, jsonDirty]);

  if (!ready || !session || !role) {
    return <main style={{ padding: 30 }}>Loading…</main>;
  }

  function selectTab(key: EntityKey) {
    setActiveKey(key);
    setJsonDirty(false);
  }

  function updateField(name: string, value: string) {
    if (!active) return;
    setForms((prev) => ({
      ...prev,
      [active.key]: { ...prev[active.key], [name]: value },
    }));
    setJsonDirty(false);
  }

  async function run(action: () => Promise<unknown>) {
    try {
      const data = await action();
      setResult(JSON.stringify(data, null, 2));
    } catch (error) {
      setResult(error instanceof Error ? error.message : "Unknown error");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!active) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      setResult("Invalid JSON: please fix the object before submitting.");
      return;
    }
    await run(() => apiPost(active.path, parsed, token));
  }

  async function closeAuction() {
    if (!closeId.trim()) {
      setResult("Enter an auction id to close.");
      return;
    }
    await run(() =>
      apiPost(`/auction-opportunities/${closeId.trim()}/close`, {}, token)
    );
  }

  return (
    <main
      style={{
        padding: 30,
        fontFamily: "system-ui, Arial, sans-serif",
        color: "#1f2937",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <h1 style={{ margin: 0 }}>Creditly Workspace</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 14, color: "#6b7280" }}>
            {session.user.name} · <strong>{role}</strong>
            {session.user.bankId ? ` · ${session.user.bankId}` : ""}
          </span>
          <button onClick={logout} style={ghostButtonStyle}>
            Log out
          </button>
        </div>
      </header>

      <section
        style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24, alignItems: "center" }}
      >
        {visibleGets.map((a) => (
          <button
            key={a.path}
            onClick={() => run(() => apiGet(a.path, token))}
            style={ghostButtonStyle}
          >
            {a.label}
          </button>
        ))}
        {(role === "ADMIN" || role === "MANAGER" || role === "USER" || role === "BANKER") && (
          <Link href="/accounts" style={ghostButtonStyle}>
            Accounts Page
          </Link>
        )}
        {(role === "ADMIN" || role === "MANAGER") && (
          <Link href="/analytics" style={ghostButtonStyle}>
            Analytics
          </Link>
        )}
      </section>

      {(role === "ADMIN" || role === "MANAGER") && (
        <section
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            marginBottom: 24,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 13, color: "#6b7280" }}>
            Close auction &amp; pick winner (lowest rate):
          </span>
          <input
            placeholder="auction id"
            value={closeId}
            onChange={(e) => setCloseId(e.target.value)}
            style={{ ...inputStyle, minWidth: 280 }}
          />
          <button onClick={closeAuction} style={ghostButtonStyle}>
            Close Auction
          </button>
        </section>
      )}

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        {active && (
          <div
            style={{ flex: "1 1 420px", minWidth: 320, display: "flex", gap: 20 }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                borderRight: "2px solid #e5e7eb",
                paddingRight: 12,
                flexShrink: 0,
              }}
            >
              {visibleEntities.map((e) => {
                const isActive = e.key === activeKey;
                return (
                  <button
                    key={e.key}
                    onClick={() => selectTab(e.key)}
                    style={{
                      border: "none",
                      background: isActive ? "#eff6ff" : "none",
                      padding: "10px 14px",
                      cursor: "pointer",
                      fontSize: 14,
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? "#2563eb" : "#6b7280",
                      borderRadius: 6,
                      textAlign: "left",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {e.label}
                  </button>
                );
              })}
            </div>

            <form
              onSubmit={submit}
              style={{ display: "grid", gap: 14, flex: 1, minWidth: 0 }}
            >
              <h2 style={{ margin: 0, fontSize: 18 }}>Create {active.label}</h2>

              {active.fields.map((field) => (
                <label
                  key={field.name}
                  style={{ display: "grid", gap: 4, fontSize: 13 }}
                >
                  <span style={{ color: "#6b7280" }}>{field.label}</span>
                  {field.type === "select" ? (
                    <select
                      value={forms[active.key][field.name]}
                      onChange={(ev) => updateField(field.name, ev.target.value)}
                      style={inputStyle}
                    >
                      {field.options.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type === "number" ? "number" : "text"}
                      step={field.type === "number" ? "0.01" : undefined}
                      placeholder={field.label}
                      value={forms[active.key][field.name]}
                      onChange={(ev) => updateField(field.name, ev.target.value)}
                      style={inputStyle}
                    />
                  )}
                </label>
              ))}

              <div style={{ display: "grid", gap: 4 }}>
                <span
                  style={{
                    fontSize: 13,
                    color: "#6b7280",
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>
                    Payload to{" "}
                    <code
                      style={{
                        background: "#f3f4f6",
                        padding: "1px 5px",
                        borderRadius: 4,
                      }}
                    >
                      POST {active.path}
                    </code>
                  </span>
                  {jsonDirty && (
                    <button
                      type="button"
                      onClick={() => setJsonDirty(false)}
                      style={{
                        border: "none",
                        background: "none",
                        color: "#2563eb",
                        cursor: "pointer",
                        fontSize: 12,
                      }}
                    >
                      reset from fields
                    </button>
                  )}
                </span>
                <textarea
                  value={json}
                  onChange={(ev) => {
                    setJson(ev.target.value);
                    setJsonDirty(true);
                  }}
                  rows={10}
                  spellCheck={false}
                  style={{
                    fontFamily: "ui-monospace, monospace",
                    fontSize: 13,
                    padding: 10,
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    resize: "vertical",
                  }}
                />
              </div>

              <button type="submit" style={primaryButtonStyle}>
                SUBMIT
              </button>
            </form>
          </div>
        )}

        <pre
          style={{
            flex: "1 1 360px",
            minWidth: 300,
            margin: 0,
            background: "#0f172a",
            color: "#e2e8f0",
            padding: 20,
            borderRadius: 8,
            whiteSpace: "pre-wrap",
            minHeight: 300,
            fontSize: 13,
            overflow: "auto",
          }}
        >
          {result || "// response will appear here"}
        </pre>
      </div>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "8px 10px",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  fontSize: 14,
};

const primaryButtonStyle: React.CSSProperties = {
  padding: "10px 16px",
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: 6,
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};

const ghostButtonStyle: React.CSSProperties = {
  padding: "8px 12px",
  background: "white",
  color: "#374151",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  fontSize: 13,
  cursor: "pointer",
};

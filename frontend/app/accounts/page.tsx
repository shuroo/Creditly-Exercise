"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiGet, apiPost } from "@/app/lib/api";
import { useSession } from "@/app/lib/session";

type Account = {
  id: string;
  customerName?: string;  // absent when viewed by BANKER
  phone?: string;         // absent when viewed by BANKER
  email?: string;         // absent when viewed by BANKER
  status?: "NEW" | "ELIGIBLE" | "AUCTION_OPEN" | "WON" | "EXPIRED"; // absent for BANKER
  managerId?: string;     // absent when viewed by BANKER
  lastActivity?: string;
  highActivity: boolean;
  salary?: number;
  loanAmount?: number;
  propertyValue?: number;
};

type AuctionOpportunity = {
  id: string;
  accountId: string;
  model: string;
  status: "OPEN" | "CLOSED" | "EXPIRED";
  eligibleBankIds: string[];
  openedAt: string;
  expiresAt: string;
  winningOfferId?: string;
};

type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  bankId?: string;
};

type AccountDetails = {
  auctions: AuctionOpportunity[];
  loading: boolean;
  error: string | null;
};

type CreateAuctionForm = {
  open: boolean;
  bankIds: string;
  loading: boolean;
  error: string | null;
};

type CloseState = { loading: boolean; error: string | null };

type AddOfferForm = {
  open: boolean;
  rate: string;
  bankId: string;
  loading: boolean;
  error: string | null;
};

const STATUS_COLORS: Record<string, React.CSSProperties> = {
  NEW: { background: "#dbeafe", color: "#1d4ed8" },
  ELIGIBLE: { background: "#dcfce7", color: "#15803d" },
  AUCTION_OPEN: { background: "#fef9c3", color: "#a16207" },
  WON: { background: "#d1fae5", color: "#065f46" },
  EXPIRED: { background: "#f3f4f6", color: "#6b7280" },
};

const AUCTION_STATUS_COLORS: Record<string, React.CSSProperties> = {
  OPEN: { background: "#dcfce7", color: "#15803d" },
  CLOSED: { background: "#dbeafe", color: "#1d4ed8" },
  EXPIRED: { background: "#f3f4f6", color: "#6b7280" },
};

export default function AccountsPage() {
  const { session, ready, logout } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (ready && !session) router.replace("/login");
  }, [ready, session, router]);

  const role = session?.user.role;
  const token = session?.token ?? "";

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [accountsError, setAccountsError] = useState<string | null>(null);

  const [users, setUsers] = useState<PublicUser[]>([]);
  const [details, setDetails] = useState<Record<string, AccountDetails>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Per-account create-auction inline form state
  const [createForms, setCreateForms] = useState<Record<string, CreateAuctionForm>>({});
  // Per-auction close-action state
  const [closeStates, setCloseStates] = useState<Record<string, CloseState>>({});
  // Per-auction add-offer inline form state
  const [offerForms, setOfferForms] = useState<Record<string, AddOfferForm>>({});

  useEffect(() => {
    if (!ready || !session) return;
    setLoadingAccounts(true);
    setAccountsError(null);
    apiGet("/accounts", token)
      .then((data) => setAccounts(data))
      .catch((e) =>
        setAccountsError(e instanceof Error ? e.message : "Failed to load accounts")
      )
      .finally(() => setLoadingAccounts(false));
  }, [ready, session, token]);

  useEffect(() => {
    if (!ready || !session || role !== "ADMIN") return;
    apiGet("/users", token)
      .then((data) => setUsers(data))
      .catch(() => {});
  }, [ready, session, role, token]);

  async function loadAuctions(accountId: string) {
    if (role === "USER") {
      setDetails((prev) => ({
        ...prev,
        [accountId]: { auctions: [], loading: false, error: null },
      }));
      return;
    }
    setDetails((prev) => ({
      ...prev,
      [accountId]: { auctions: prev[accountId]?.auctions ?? [], loading: true, error: null },
    }));
    try {
      const all: AuctionOpportunity[] = await apiGet("/auction-opportunities", token);
      const accountAuctions = all.filter((a) => a.accountId === accountId);
      setDetails((prev) => ({
        ...prev,
        [accountId]: { auctions: accountAuctions, loading: false, error: null },
      }));
    } catch (e) {
      setDetails((prev) => ({
        ...prev,
        [accountId]: {
          auctions: [],
          loading: false,
          error: e instanceof Error ? e.message : "Failed to load auctions",
        },
      }));
    }
  }

  async function handleShowDetails(account: Account) {
    if (expandedId === account.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(account.id);
    if (!details[account.id]) {
      await loadAuctions(account.id);
    }
  }

  async function handleCreateAuction(accountId: string) {
    const form = createForms[accountId];
    const bankIds = (form?.bankIds ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    setCreateForms((prev) => ({
      ...prev,
      [accountId]: { ...prev[accountId], loading: true, error: null },
    }));

    try {
      await apiPost(`/accounts/${accountId}/auctions`, { eligibleBankIds: bankIds }, token);
      setCreateForms((prev) => ({
        ...prev,
        [accountId]: { open: false, bankIds: "", loading: false, error: null },
      }));
      await loadAuctions(accountId);
    } catch (e) {
      setCreateForms((prev) => ({
        ...prev,
        [accountId]: {
          ...prev[accountId],
          loading: false,
          error: e instanceof Error ? e.message : "Failed to create auction",
        },
      }));
    }
  }

  async function handleCloseAuction(auctionId: string, accountId: string) {
    setCloseStates((prev) => ({
      ...prev,
      [auctionId]: { loading: true, error: null },
    }));
    try {
      await apiPost(`/auctions/${auctionId}/close`, {}, token);
      setCloseStates((prev) => ({
        ...prev,
        [auctionId]: { loading: false, error: null },
      }));
      await loadAuctions(accountId);
    } catch (e) {
      setCloseStates((prev) => ({
        ...prev,
        [auctionId]: {
          loading: false,
          error: e instanceof Error ? e.message : "Failed to close auction",
        },
      }));
    }
  }

  async function handleAddOffer(auctionId: string, accountId: string) {
    const form = offerForms[auctionId];
    setOfferForms((prev) => ({
      ...prev,
      [auctionId]: { ...prev[auctionId], loading: true, error: null },
    }));
    try {
      await apiPost(`/auctions/${auctionId}/offers`, {
        interestRate: Number(form?.rate),
        ...(role === "ADMIN" ? { bankId: form?.bankId } : {}),
      }, token);
      setOfferForms((prev) => ({
        ...prev,
        [auctionId]: { open: false, rate: "", bankId: "", loading: false, error: null },
      }));
    } catch (e) {
      setOfferForms((prev) => ({
        ...prev,
        [auctionId]: {
          ...prev[auctionId],
          loading: false,
          error: e instanceof Error ? e.message : "Failed to submit offer",
        },
      }));
    }
  }

  if (!ready || !session || !role) {
    return <main style={{ padding: 30 }}>Loading…</main>;
  }

  const isBanker = role === "BANKER";
  const canManage = role === "ADMIN" || role === "MANAGER";

  return (
    <main style={{ padding: 30, fontFamily: "system-ui, Arial, sans-serif", color: "#1f2937" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link href="/" style={linkStyle}>← Workspace</Link>
          <h1 style={{ margin: 0 }}>Accounts</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 14, color: "#6b7280" }}>
            {session.user.name} · <strong>{role}</strong>
          </span>
          <button onClick={logout} style={ghostButtonStyle}>Log out</button>
        </div>
      </header>

      {loadingAccounts && <p style={{ color: "#6b7280" }}>Loading accounts…</p>}
      {accountsError && <p style={{ color: "#dc2626" }}>{accountsError}</p>}
      {!loadingAccounts && !accountsError && accounts.length === 0 && (
        <p style={{ color: "#6b7280" }}>No accounts found.</p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {accounts.map((account) => {
          const isExpanded = expandedId === account.id;
          const det = details[account.id];
          const manager = users.find((u) => u.id === account.managerId) ?? null;
          const cf = createForms[account.id] ?? { open: false, bankIds: "", loading: false, error: null };

          return (
            <div
              key={account.id}
              style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}
            >
              {/* Account row */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr auto auto",
                  gap: 16,
                  alignItems: "center",
                  padding: "14px 16px",
                  background: isExpanded ? "#eff6ff" : "white",
                }}
              >
                <div>
                  {isBanker ? (
                    <div style={{ fontSize: 13, color: "#6b7280" }}>
                      {account.loanAmount != null && (
                        <span>Loan: <strong>₪{account.loanAmount.toLocaleString()}</strong></span>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{account.customerName}</div>
                  )}
                  <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{account.id}</div>
                </div>
                <div style={{ fontSize: 13 }}>
                  {isBanker ? (
                    <div style={{ color: "#6b7280" }}>
                      {account.salary != null && <div>Salary: ₪{account.salary.toLocaleString()}</div>}
                      {account.propertyValue != null && <div>Property: ₪{account.propertyValue.toLocaleString()}</div>}
                    </div>
                  ) : (
                    <>
                      <div>{account.email}</div>
                      <div style={{ color: "#6b7280" }}>{account.phone}</div>
                    </>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {account.status && (
                    <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 8px", borderRadius: 12, ...(STATUS_COLORS[account.status] ?? {}) }}>
                      {account.status}
                    </span>
                  )}
                  {account.highActivity && (
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 7px", borderRadius: 12, background: "#fef3c7", color: "#92400e" }}>
                      High Activity
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleShowDetails(account)}
                  style={isExpanded ? activeButtonStyle : ghostButtonStyle}
                >
                  {isExpanded ? "Hide Details" : "Show Details"}
                </button>
              </div>

              {/* Details panel */}
              {isExpanded && (
                <div style={{ padding: 16, background: "#f9fafb", borderTop: "1px solid #e5e7eb", display: "grid", gap: 20 }}>

                  {/* Manager — not shown to bankers (PII) */}
                  {!isBanker && (
                    <section>
                      <h3 style={sectionHeadStyle}>Manager</h3>
                      {manager ? (
                        <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 6, padding: "10px 14px", fontSize: 13, display: "flex", gap: 10, alignItems: "center" }}>
                          <span style={{ fontWeight: 600 }}>{manager.name}</span>
                          <span style={{ color: "#6b7280" }}>{manager.email}</span>
                          <span style={{ fontSize: 11, padding: "2px 6px", borderRadius: 10, background: "#f3f4f6", color: "#6b7280" }}>{manager.role}</span>
                        </div>
                      ) : (
                        <div style={{ fontSize: 13, color: "#6b7280" }}>
                          ID: <code style={{ background: "#f3f4f6", padding: "2px 6px", borderRadius: 4, fontSize: 12 }}>{account.managerId}</code>
                        </div>
                      )}
                    </section>
                  )}

                  {/* Auctions */}
                  <section>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      <h3 style={{ ...sectionHeadStyle, margin: 0 }}>
                        Auctions{det && !det.loading ? ` (${det.auctions.length})` : ""}
                      </h3>
                      {canManage && !cf.open && (
                        <button
                          onClick={() =>
                            setCreateForms((prev) => ({
                              ...prev,
                              [account.id]: { open: true, bankIds: "", loading: false, error: null },
                            }))
                          }
                          style={smallPrimaryButtonStyle}
                        >
                          + New Auction
                        </button>
                      )}
                    </div>

                    {/* Create auction inline form */}
                    {canManage && cf.open && (
                      <div style={{ background: "white", border: "1px solid #bfdbfe", borderRadius: 6, padding: 12, marginBottom: 10, display: "grid", gap: 8 }}>
                        <label style={{ fontSize: 13 }}>
                          <span style={{ color: "#6b7280", display: "block", marginBottom: 3 }}>Eligible bank IDs (comma-separated)</span>
                          <input
                            type="text"
                            placeholder="e.g. bank-1, bank-2"
                            value={cf.bankIds}
                            onChange={(e) =>
                              setCreateForms((prev) => ({
                                ...prev,
                                [account.id]: { ...prev[account.id], bankIds: e.target.value },
                              }))
                            }
                            style={inputStyle}
                          />
                        </label>
                        {cf.error && <p style={{ margin: 0, fontSize: 12, color: "#dc2626" }}>{cf.error}</p>}
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            disabled={cf.loading}
                            onClick={() => handleCreateAuction(account.id)}
                            style={cf.loading ? disabledButtonStyle : smallPrimaryButtonStyle}
                          >
                            {cf.loading ? "Creating…" : "Create Auction"}
                          </button>
                          <button
                            onClick={() =>
                              setCreateForms((prev) => ({
                                ...prev,
                                [account.id]: { open: false, bankIds: "", loading: false, error: null },
                              }))
                            }
                            style={ghostButtonStyle}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {role === "USER" ? (
                      <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>Auction data is not available for your role.</p>
                    ) : det?.loading ? (
                      <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>Loading auctions…</p>
                    ) : det?.error ? (
                      <p style={{ fontSize: 13, color: "#dc2626", margin: 0 }}>{det.error}</p>
                    ) : det?.auctions.length === 0 ? (
                      <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>No auctions yet.</p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {det!.auctions.map((auction) => {
                          const cs = closeStates[auction.id] ?? { loading: false, error: null };
                          const of_ = offerForms[auction.id] ?? { open: false, rate: "", bankId: "", loading: false, error: null };
                          return (
                            <div
                              key={auction.id}
                              style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 6, padding: "10px 14px", fontSize: 13 }}
                            >
                              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                                <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 10, ...(AUCTION_STATUS_COLORS[auction.status] ?? {}) }}>
                                  {auction.status}
                                </span>
                                <code style={{ fontSize: 11, color: "#6b7280" }}>{auction.id}</code>
                                <span style={{ marginLeft: "auto", fontSize: 12, color: "#6b7280" }}>
                                  {new Date(auction.openedAt).toLocaleDateString()} → {new Date(auction.expiresAt).toLocaleDateString()}
                                </span>
                                {/* Close button — ADMIN/MANAGER, only for OPEN auctions */}
                                {canManage && auction.status === "OPEN" && (
                                  <button
                                    disabled={cs.loading}
                                    onClick={() => handleCloseAuction(auction.id, account.id)}
                                    style={cs.loading ? disabledButtonStyle : dangerButtonStyle}
                                  >
                                    {cs.loading ? "Closing…" : "Close"}
                                  </button>
                                )}
                                {/* Add Offer button — ADMIN and BANKER */}
                                {(role === "ADMIN" || role === "BANKER") && auction.status === "OPEN" && !of_.open && (
                                  <button
                                    onClick={() =>
                                      setOfferForms((prev) => ({
                                        ...prev,
                                        [auction.id]: { open: true, rate: "", bankId: "", loading: false, error: null },
                                      }))
                                    }
                                    style={smallPrimaryButtonStyle}
                                  >
                                    Add Offer
                                  </button>
                                )}
                              </div>

                              {auction.winningOfferId && (
                                <div style={{ marginTop: 6, fontSize: 11, color: "#059669", fontWeight: 600 }}>
                                  Winner: <code style={{ fontWeight: 400 }}>{auction.winningOfferId}</code>
                                </div>
                              )}
                              {cs.error && (
                                <p style={{ margin: "6px 0 0", fontSize: 11, color: "#dc2626" }}>{cs.error}</p>
                              )}

                              {/* Add offer inline form */}
                              {of_.open && (
                                <div style={{ marginTop: 10, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 6, padding: 10, display: "grid", gap: 8 }}>
                                  <label style={{ fontSize: 13 }}>
                                    <span style={{ color: "#6b7280", display: "block", marginBottom: 3 }}>Interest rate (%)</span>
                                    <input
                                      type="number"
                                      step="0.01"
                                      placeholder="e.g. 3.75"
                                      value={of_.rate}
                                      onChange={(e) =>
                                        setOfferForms((prev) => ({
                                          ...prev,
                                          [auction.id]: { ...prev[auction.id], rate: e.target.value },
                                        }))
                                      }
                                      style={inputStyle}
                                    />
                                  </label>
                                  {role === "ADMIN" && (
                                    <label style={{ fontSize: 13 }}>
                                      <span style={{ color: "#6b7280", display: "block", marginBottom: 3 }}>Bank ID</span>
                                      <input
                                        type="text"
                                        placeholder="e.g. bank-1"
                                        value={of_.bankId}
                                        onChange={(e) =>
                                          setOfferForms((prev) => ({
                                            ...prev,
                                            [auction.id]: { ...prev[auction.id], bankId: e.target.value },
                                          }))
                                        }
                                        style={inputStyle}
                                      />
                                    </label>
                                  )}
                                  {role === "BANKER" && session.user.bankId && (
                                    <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>
                                      Submitting as <strong>{session.user.bankId}</strong>
                                    </p>
                                  )}
                                  {of_.error && <p style={{ margin: 0, fontSize: 12, color: "#dc2626" }}>{of_.error}</p>}
                                  <div style={{ display: "flex", gap: 8 }}>
                                    <button
                                      disabled={of_.loading}
                                      onClick={() => handleAddOffer(auction.id, account.id)}
                                      style={of_.loading ? disabledButtonStyle : smallPrimaryButtonStyle}
                                    >
                                      {of_.loading ? "Submitting…" : "Submit Offer"}
                                    </button>
                                    <button
                                      onClick={() =>
                                        setOfferForms((prev) => ({
                                          ...prev,
                                          [auction.id]: { open: false, rate: "", bankId: "", loading: false, error: null },
                                        }))
                                      }
                                      style={ghostButtonStyle}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}

const sectionHeadStyle: React.CSSProperties = {
  margin: "0 0 8px",
  fontSize: 13,
  fontWeight: 700,
  color: "#374151",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const inputStyle: React.CSSProperties = {
  padding: "7px 10px",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  fontSize: 13,
  width: "100%",
  boxSizing: "border-box",
};

const ghostButtonStyle: React.CSSProperties = {
  padding: "7px 12px",
  background: "white",
  color: "#374151",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  fontSize: 13,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const activeButtonStyle: React.CSSProperties = {
  padding: "7px 12px",
  background: "#eff6ff",
  color: "#2563eb",
  border: "1px solid #bfdbfe",
  borderRadius: 6,
  fontSize: 13,
  cursor: "pointer",
  fontWeight: 600,
  whiteSpace: "nowrap",
};

const smallPrimaryButtonStyle: React.CSSProperties = {
  padding: "5px 10px",
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: 6,
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const dangerButtonStyle: React.CSSProperties = {
  padding: "5px 10px",
  background: "white",
  color: "#dc2626",
  border: "1px solid #fca5a5",
  borderRadius: 6,
  fontSize: 12,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const disabledButtonStyle: React.CSSProperties = {
  padding: "5px 10px",
  background: "#f3f4f6",
  color: "#9ca3af",
  border: "1px solid #e5e7eb",
  borderRadius: 6,
  fontSize: 12,
  cursor: "not-allowed",
  whiteSpace: "nowrap",
};

const linkStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#6b7280",
  textDecoration: "none",
};

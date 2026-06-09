"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiGet } from "@/app/lib/api";
import { useSession } from "@/app/lib/session";

type AnalyticsSummary = {
  accounts: {
    total: number;
    byStatus: Record<string, number>;
    highActivity: number;
  };
  auctions: {
    total: number;
    byStatus: Record<string, number>;
  };
  events: {
    total: number;
    byType: Record<string, number>;
  };
  bankOffers: {
    total: number;
  };
};

const ACCOUNT_STATUS_COLORS: Record<string, string> = {
  NEW: "#1d4ed8",
  ELIGIBLE: "#15803d",
  AUCTION_OPEN: "#a16207",
  WON: "#065f46",
  EXPIRED: "#6b7280",
};

const AUCTION_STATUS_COLORS: Record<string, string> = {
  OPEN: "#15803d",
  CLOSED: "#1d4ed8",
  EXPIRED: "#6b7280",
};

export default function AnalyticsPage() {
  const { session, ready, logout } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (ready && !session) router.replace("/login");
  }, [ready, session, router]);

  const role = session?.user.role;
  const token = session?.token ?? "";

  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !session) return;
    setLoading(true);
    setError(null);
    apiGet("/analytics/summary", token)
      .then((data) => setSummary(data))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load analytics"))
      .finally(() => setLoading(false));
  }, [ready, session, token]);

  if (!ready || !session || !role) {
    return <main style={{ padding: 30 }}>Loading…</main>;
  }

  if (role !== "ADMIN" && role !== "MANAGER") {
    return (
      <main style={{ padding: 30, fontFamily: "system-ui, Arial, sans-serif", color: "#1f2937" }}>
        <p style={{ color: "#6b7280" }}>Analytics are not available for your role.</p>
        <Link href="/" style={linkStyle}>← Back to workspace</Link>
      </main>
    );
  }

  return (
    <main style={{ padding: 30, fontFamily: "system-ui, Arial, sans-serif", color: "#1f2937" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link href="/" style={linkStyle}>← Workspace</Link>
          <h1 style={{ margin: 0 }}>Analytics</h1>
          {role === "MANAGER" && (
            <span style={{ fontSize: 12, color: "#6b7280", background: "#f3f4f6", padding: "3px 8px", borderRadius: 10 }}>
              Your accounts only
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 14, color: "#6b7280" }}>
            {session.user.name} · <strong>{role}</strong>
          </span>
          <button onClick={logout} style={ghostButtonStyle}>Log out</button>
        </div>
      </header>

      {loading && <p style={{ color: "#6b7280" }}>Loading summary…</p>}
      {error && <p style={{ color: "#dc2626" }}>{error}</p>}

      {summary && (
        <div style={{ display: "grid", gap: 24 }}>
          {/* Top-level totals */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
            <StatCard label="Total Accounts" value={summary.accounts.total} accent="#2563eb" />
            <StatCard label="High Activity" value={summary.accounts.highActivity} accent="#d97706" />
            <StatCard label="Total Auctions" value={summary.auctions.total} accent="#7c3aed" />
            <StatCard label="Bank Offers" value={summary.bankOffers.total} accent="#059669" />
            <StatCard label="Total Events" value={summary.events.total} accent="#0891b2" />
          </div>

          {/* Accounts by status */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <BreakdownCard
              title="Accounts by Status"
              data={summary.accounts.byStatus}
              total={summary.accounts.total}
              colorMap={ACCOUNT_STATUS_COLORS}
            />
            <BreakdownCard
              title="Auctions by Status"
              data={summary.auctions.byStatus}
              total={summary.auctions.total}
              colorMap={AUCTION_STATUS_COLORS}
            />
          </div>

          {/* Events by type */}
          <BreakdownCard
            title="Events by Type"
            data={summary.events.byType}
            total={summary.events.total}
            colorMap={{}}
          />
        </div>
      )}
    </main>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div
      style={{
        background: "white",
        border: "1px solid #e5e7eb",
        borderRadius: 10,
        padding: "18px 20px",
        borderLeft: `4px solid ${accent}`,
      }}
    >
      <div style={{ fontSize: 28, fontWeight: 700, color: "#111827" }}>{value}</div>
      <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>{label}</div>
    </div>
  );
}

function BreakdownCard({
  title,
  data,
  total,
  colorMap,
}: {
  title: string;
  data: Record<string, number>;
  total: number;
  colorMap: Record<string, string>;
}) {
  const entries = Object.entries(data).sort(([, a], [, b]) => b - a);

  return (
    <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 10, padding: "18px 20px" }}>
      <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: "#374151" }}>{title}</h3>
      {entries.length === 0 ? (
        <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>No data.</p>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {entries.map(([key, count]) => {
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            const color = colorMap[key] ?? "#6b7280";
            return (
              <div key={key}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                  <span style={{ fontWeight: 500, color: "#374151" }}>{key}</span>
                  <span style={{ color: "#6b7280" }}>{count} ({pct}%)</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: "#f3f4f6", overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${pct}%`,
                      background: color,
                      borderRadius: 3,
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const ghostButtonStyle: React.CSSProperties = {
  padding: "7px 12px",
  background: "white",
  color: "#374151",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  fontSize: 13,
  cursor: "pointer",
};

const linkStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#6b7280",
  textDecoration: "none",
};

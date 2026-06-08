"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/app/lib/session";
import type { Role } from "@/app/lib/api";

const ROLES: Role[] = ["ADMIN", "MANAGER", "USER", "BANKER"];

export default function RegisterPage() {
  const { session, ready, register } = useSession();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("USER");
  const [bankId, setBankId] = useState("bank-1");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && session) router.replace("/");
  }, [ready, session, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await register({
        name,
        email,
        password,
        role,
        ...(role === "BANKER" ? { bankId } : {}),
      });
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={pageStyle}>
      <form onSubmit={onSubmit} style={cardStyle}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Create account</h1>

        <label style={labelStyle}>
          <span style={hintStyle}>Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inputStyle}
            required
          />
        </label>

        <label style={labelStyle}>
          <span style={hintStyle}>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
            required
          />
        </label>

        <label style={labelStyle}>
          <span style={hintStyle}>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
            required
          />
        </label>

        <label style={labelStyle}>
          <span style={hintStyle}>Role</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            style={inputStyle}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>

        {role === "BANKER" && (
          <label style={labelStyle}>
            <span style={hintStyle}>Bank</span>
            <select
              value={bankId}
              onChange={(e) => setBankId(e.target.value)}
              style={inputStyle}
            >
              <option value="bank-1">bank-1</option>
              <option value="bank-2">bank-2</option>
              <option value="bank-3">bank-3</option>
            </select>
          </label>
        )}

        {error && <p style={errorStyle}>{error}</p>}

        <button type="submit" disabled={busy} style={primaryButtonStyle}>
          {busy ? "Creating…" : "Create account"}
        </button>

        <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </form>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "system-ui, Arial, sans-serif",
  color: "#1f2937",
  background: "#f9fafb",
};
const cardStyle: React.CSSProperties = {
  display: "grid",
  gap: 16,
  width: 360,
  padding: 28,
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
};
const labelStyle: React.CSSProperties = { display: "grid", gap: 4 };
const hintStyle: React.CSSProperties = { fontSize: 13, color: "#6b7280" };
const inputStyle: React.CSSProperties = {
  padding: "9px 11px",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  fontSize: 14,
};
const errorStyle: React.CSSProperties = {
  margin: 0,
  color: "#b91c1c",
  fontSize: 13,
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

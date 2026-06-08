"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  apiLogin,
  apiRegister,
  type AuthResponse,
  type Role,
  type SessionUser,
} from "@/app/lib/api";

type Session = { token: string; user: SessionUser } | null;

type SessionContextValue = {
  session: Session;
  /** Becomes true once localStorage has been read (avoids redirect flicker). */
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: {
    name: string;
    email: string;
    password: string;
    role: Role;
    bankId?: string;
  }) => Promise<void>;
  logout: () => void;
};

const STORAGE_KEY = "creditly.session";

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>(null);
  const [ready, setReady] = useState(false);

  // Restore a persisted session on first mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSession(JSON.parse(raw));
    } catch {
      // ignore malformed storage
    }
    setReady(true);
  }, []);

  function persist(next: Session) {
    setSession(next);
    if (next) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  async function login(email: string, password: string) {
    const res: AuthResponse = await apiLogin(email, password);
    persist({ token: res.token, user: res.user });
  }

  async function register(payload: {
    name: string;
    email: string;
    password: string;
    role: Role;
    bankId?: string;
  }) {
    const res: AuthResponse = await apiRegister(payload);
    persist({ token: res.token, user: res.user });
  }

  function logout() {
    persist(null);
  }

  return (
    <SessionContext.Provider
      value={{ session, ready, login, register, logout }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return ctx;
}

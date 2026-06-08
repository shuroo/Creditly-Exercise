export type Role = "ADMIN" | "MANAGER" | "USER" | "BANKER";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  bankId?: string;
};

export type AuthResponse = {
  token: string;
  user: SessionUser;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function authHeaders(token?: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function parse(response: Response) {
  const text = await response.text();
  if (!response.ok) {
    // Surface the backend's { message } when present.
    try {
      const body = JSON.parse(text);
      throw new Error(body.message || `Request failed (${response.status})`);
    } catch (e) {
      if (e instanceof Error && e.message) throw e;
      throw new Error(text || `Request failed (${response.status})`);
    }
  }
  return text ? JSON.parse(text) : null;
}

// --- Auth (public) ---------------------------------------------------------

export async function apiRegister(payload: {
  name: string;
  email: string;
  password: string;
  role: Role;
  bankId?: string;
}): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/register`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return parse(response);
}

export async function apiLogin(
  email: string,
  password: string
): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/login`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ email, password }),
  });
  return parse(response);
}

// --- Authenticated requests ------------------------------------------------

export async function apiGet(path: string, token: string) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    headers: authHeaders(token),
    cache: "no-store",
  });
  return parse(response);
}

export async function apiPost(path: string, body: unknown, token: string) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  return parse(response);
}

export async function apiDelete(path: string, token: string) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  return parse(response);
}

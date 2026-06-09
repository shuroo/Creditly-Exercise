import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SessionProvider, useSession } from "../session";

vi.mock("@/app/lib/api", () => ({
  apiLogin: vi.fn(),
  apiRegister: vi.fn(),
}));

import { apiLogin, apiRegister } from "@/app/lib/api";

const mockLogin = apiLogin as ReturnType<typeof vi.fn>;
const mockRegister = apiRegister as ReturnType<typeof vi.fn>;

const STORAGE_KEY = "creditly.session";

function TestConsumer() {
  const { session, ready, logout } = useSession();
  return (
    <div>
      <span data-testid="ready">{String(ready)}</span>
      <span data-testid="session">{session ? session.user.name : "none"}</span>
      <button onClick={logout}>logout</button>
    </div>
  );
}

function LoginConsumer() {
  const { login } = useSession();
  return <button onClick={() => login("a@a.com", "pass")}>login</button>;
}

function RegisterConsumer() {
  const { register } = useSession();
  return (
    <button
      onClick={() =>
        register({ name: "Bob", email: "b@b.com", password: "pw", role: "USER" })
      }
    >
      register
    </button>
  );
}

beforeEach(() => {
  localStorage.clear();
  mockLogin.mockReset();
  mockRegister.mockReset();
});

afterEach(() => {
  localStorage.clear();
});

describe("SessionProvider", () => {
  it("starts as ready with no session when localStorage is empty", async () => {
    render(
      <SessionProvider>
        <TestConsumer />
      </SessionProvider>
    );
    await act(async () => {});
    expect(screen.getByTestId("ready").textContent).toBe("true");
    expect(screen.getByTestId("session").textContent).toBe("none");
  });

  it("restores a persisted session from localStorage", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ token: "t", user: { id: "u1", name: "Alice", email: "a@a.com", role: "ADMIN" } })
    );
    render(
      <SessionProvider>
        <TestConsumer />
      </SessionProvider>
    );
    await act(async () => {});
    expect(screen.getByTestId("session").textContent).toBe("Alice");
  });

  it("sets the session and saves to localStorage after login", async () => {
    mockLogin.mockResolvedValue({
      token: "tok",
      user: { id: "u1", name: "Charlie", email: "c@c.com", role: "USER" },
    });
    render(
      <SessionProvider>
        <LoginConsumer />
        <TestConsumer />
      </SessionProvider>
    );
    await act(async () => {});
    await userEvent.click(screen.getByText("login"));
    expect(screen.getByTestId("session").textContent).toBe("Charlie");
    expect(localStorage.getItem(STORAGE_KEY)).toContain("Charlie");
  });

  it("sets the session after register", async () => {
    mockRegister.mockResolvedValue({
      token: "tok2",
      user: { id: "u2", name: "Bob", email: "b@b.com", role: "USER" },
    });
    render(
      <SessionProvider>
        <RegisterConsumer />
        <TestConsumer />
      </SessionProvider>
    );
    await act(async () => {});
    await userEvent.click(screen.getByText("register"));
    expect(screen.getByTestId("session").textContent).toBe("Bob");
  });

  it("clears the session and localStorage on logout", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ token: "t", user: { id: "u1", name: "Alice", email: "a@a.com", role: "ADMIN" } })
    );
    render(
      <SessionProvider>
        <TestConsumer />
      </SessionProvider>
    );
    await act(async () => {});
    await userEvent.click(screen.getByText("logout"));
    expect(screen.getByTestId("session").textContent).toBe("none");
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});

describe("useSession", () => {
  it("throws when used outside SessionProvider", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow(
      "useSession must be used within a SessionProvider"
    );
    consoleError.mockRestore();
  });
});

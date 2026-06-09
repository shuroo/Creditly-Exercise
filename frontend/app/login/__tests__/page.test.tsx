import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "../page";

const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

const mockLogin = vi.fn();
const mockUseSession = vi.fn();
vi.mock("@/app/lib/session", () => ({
  useSession: () => mockUseSession(),
}));

beforeEach(() => {
  mockLogin.mockReset();
  mockReplace.mockReset();
  mockUseSession.mockReturnValue({
    session: null,
    ready: true,
    login: mockLogin,
  });
});

describe("LoginPage", () => {
  it("renders email, password fields and submit button", () => {
    render(<LoginPage />);
    expect(screen.getByLabelText(/email/i) ?? screen.getByPlaceholderText(/email/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeTruthy();
  });

  it("calls login with typed credentials on submit", async () => {
    mockLogin.mockResolvedValue(undefined);
    render(<LoginPage />);
    const inputs = screen.getAllByRole("textbox");
    // email is a textbox; password is not (type=password), grab by label proximity
    await userEvent.type(inputs[0], "a@a.com");
    // password field
    const pwInput = document.querySelector('input[type="password"]') as HTMLInputElement;
    await userEvent.type(pwInput, "secret");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect(mockLogin).toHaveBeenCalledWith("a@a.com", "secret");
  });

  it("shows an error message when login fails", async () => {
    mockLogin.mockRejectedValue(new Error("Invalid email or password"));
    render(<LoginPage />);
    const inputs = screen.getAllByRole("textbox");
    await userEvent.type(inputs[0], "x@x.com");
    const pwInput = document.querySelector('input[type="password"]') as HTMLInputElement;
    await userEvent.type(pwInput, "wrong");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect(await screen.findByText("Invalid email or password")).toBeTruthy();
  });

  it("redirects to / when the user is already logged in", async () => {
    mockUseSession.mockReturnValue({
      session: { token: "t", user: { id: "u1" } },
      ready: true,
      login: mockLogin,
    });
    render(<LoginPage />);
    // useEffect fires after render; wait a tick
    await new Promise((r) => setTimeout(r, 0));
    expect(mockReplace).toHaveBeenCalledWith("/");
  });
});

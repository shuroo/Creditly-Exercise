import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RegisterPage from "../page";

const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

const mockRegister = vi.fn();
const mockUseSession = vi.fn();
vi.mock("@/app/lib/session", () => ({
  useSession: () => mockUseSession(),
}));

beforeEach(() => {
  mockRegister.mockReset();
  mockReplace.mockReset();
  mockUseSession.mockReturnValue({
    session: null,
    ready: true,
    register: mockRegister,
  });
});

describe("RegisterPage", () => {
  it("renders name, email, password, role fields", () => {
    render(<RegisterPage />);
    expect(screen.getByRole("button", { name: /create account/i })).toBeTruthy();
    expect(screen.getAllByRole("textbox").length).toBeGreaterThanOrEqual(2);
  });

  it("shows the Bank field only when BANKER role is selected", async () => {
    render(<RegisterPage />);
    expect(screen.queryByText("Bank", { exact: true })).toBeNull();
    const roleSelect = screen.getByRole("combobox");
    await userEvent.selectOptions(roleSelect, "BANKER");
    expect(screen.getByText("Bank", { exact: true })).toBeTruthy();
  });

  it("calls register with form data on submit", async () => {
    mockRegister.mockResolvedValue(undefined);
    render(<RegisterPage />);
    const [nameInput, emailInput] = screen.getAllByRole("textbox");
    await userEvent.type(nameInput, "Alice");
    await userEvent.type(emailInput, "alice@example.com");
    const pwInput = document.querySelector('input[type="password"]') as HTMLInputElement;
    await userEvent.type(pwInput, "password123");
    await userEvent.click(screen.getByRole("button", { name: /create account/i }));
    expect(mockRegister).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Alice", email: "alice@example.com", password: "password123" })
    );
  });

  it("shows an error when registration fails", async () => {
    mockRegister.mockRejectedValue(new Error("Email already registered"));
    render(<RegisterPage />);
    const [nameInput, emailInput] = screen.getAllByRole("textbox");
    await userEvent.type(nameInput, "Bob");
    await userEvent.type(emailInput, "bob@example.com");
    const pwInput = document.querySelector('input[type="password"]') as HTMLInputElement;
    await userEvent.type(pwInput, "pw");
    await userEvent.click(screen.getByRole("button", { name: /create account/i }));
    expect(await screen.findByText("Email already registered")).toBeTruthy();
  });

  it("redirects to / when the user is already logged in", async () => {
    mockUseSession.mockReturnValue({
      session: { token: "t", user: {} },
      ready: true,
      register: mockRegister,
    });
    render(<RegisterPage />);
    await new Promise((r) => setTimeout(r, 0));
    expect(mockReplace).toHaveBeenCalledWith("/");
  });
});

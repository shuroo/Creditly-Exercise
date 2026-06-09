import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiLogin, apiRegister, apiGet, apiPost } from "../api";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function okResponse(body: unknown) {
  return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
}
function errorResponse(body: unknown, status = 400) {
  return Promise.resolve(new Response(JSON.stringify(body), { status }));
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe("apiLogin", () => {
  it("POSTs credentials and returns the parsed response", async () => {
    const data = { token: "tok", user: { id: "u1", name: "Alice", email: "a@a.com", role: "ADMIN" } };
    mockFetch.mockResolvedValue(okResponse(data));
    const result = await apiLogin("a@a.com", "pass");
    expect(result).toEqual(data);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/login"),
      expect.objectContaining({ method: "POST" })
    );
  });

  it("throws with the backend message on failure", async () => {
    mockFetch.mockResolvedValue(errorResponse({ message: "Invalid email or password" }, 401));
    await expect(apiLogin("x@x.com", "wrong")).rejects.toThrow("Invalid email or password");
  });
});

describe("apiRegister", () => {
  it("POSTs registration data and returns the response", async () => {
    const data = { token: "tok2", user: { id: "u2", name: "Bob", email: "b@b.com", role: "USER" } };
    mockFetch.mockResolvedValue(okResponse(data));
    const result = await apiRegister({ name: "Bob", email: "b@b.com", password: "pw", role: "USER" });
    expect(result).toEqual(data);
  });

  it("throws when the email is already registered", async () => {
    mockFetch.mockResolvedValue(errorResponse({ message: "Email already registered" }, 409));
    await expect(
      apiRegister({ name: "Bob", email: "b@b.com", password: "pw", role: "USER" })
    ).rejects.toThrow("Email already registered");
  });
});

describe("apiGet", () => {
  it("sends a GET with the auth header and returns data", async () => {
    mockFetch.mockResolvedValue(okResponse([{ id: "a1" }]));
    const result = await apiGet("/accounts", "mytoken");
    expect(result).toEqual([{ id: "a1" }]);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/accounts"),
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ Authorization: "Bearer mytoken" }),
      })
    );
  });
});

describe("apiPost", () => {
  it("sends a POST with the body and auth header", async () => {
    mockFetch.mockResolvedValue(okResponse({ id: "new1" }));
    const result = await apiPost("/accounts", { customerName: "Acme" }, "mytoken");
    expect(result).toEqual({ id: "new1" });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/accounts"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ customerName: "Acme" }),
        headers: expect.objectContaining({ Authorization: "Bearer mytoken" }),
      })
    );
  });
});

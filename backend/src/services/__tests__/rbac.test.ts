import { describe, it, expect } from "vitest";
import {
  canManageAccount,
  scopeAccountsForUser,
  scopeEventsForUser,
  toPublicUser,
} from "../rbac.js";
import type { Account, Event } from "../../models/types.js";
import type { AuthUser } from "../../middleware/authContext.js";

const makeAccount = (o: Partial<Account> = {}): Account => ({
  id: "acc1",
  customerName: "Acme",
  phone: "123",
  email: "acme@test.com",
  status: "ELIGIBLE",
  managerId: "mgr1",
  highActivity: false,
  ...o,
});

const makeEvent = (o: Partial<Event> = {}): Event => ({
  id: "ev1",
  accountId: "acc1",
  type: "note_added",
  createdByUserId: "u1",
  createdAt: new Date().toISOString(),
  ...o,
});

const user = (role: AuthUser["role"], id = "u1"): AuthUser => ({
  id,
  role,
  name: "Test",
  email: "t@t.com",
});

describe("canManageAccount", () => {
  it("ADMIN can manage any account", () => {
    expect(canManageAccount(makeAccount({ managerId: "other" }), user("ADMIN"))).toBe(true);
  });

  it("MANAGER can manage their own account", () => {
    expect(canManageAccount(makeAccount({ managerId: "mgr1" }), user("MANAGER", "mgr1"))).toBe(true);
  });

  it("MANAGER cannot manage another manager's account", () => {
    expect(canManageAccount(makeAccount({ managerId: "mgr2" }), user("MANAGER", "mgr1"))).toBe(false);
  });

  it("USER cannot manage accounts", () => {
    expect(canManageAccount(makeAccount(), user("USER"))).toBe(false);
  });
});

describe("scopeAccountsForUser", () => {
  const accounts = [
    makeAccount({ id: "a1", managerId: "mgr1" }),
    makeAccount({ id: "a2", managerId: "mgr2" }),
  ];

  it("ADMIN sees all accounts", () => {
    expect(scopeAccountsForUser(accounts, user("ADMIN"), [])).toEqual(accounts);
  });

  it("MANAGER sees only their accounts", () => {
    const result = scopeAccountsForUser(accounts, user("MANAGER", "mgr1"), []);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("a1");
  });

  it("USER sees accounts related to their events", () => {
    const events = [makeEvent({ accountId: "a2", createdByUserId: "usr1" })];
    const result = scopeAccountsForUser(accounts, user("USER", "usr1"), events);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("a2");
  });

  it("USER sees no accounts when they have no events", () => {
    expect(scopeAccountsForUser(accounts, user("USER"), [])).toHaveLength(0);
  });

  it("BANKER sees no accounts", () => {
    expect(scopeAccountsForUser(accounts, user("BANKER"), [])).toHaveLength(0);
  });
});

describe("scopeEventsForUser", () => {
  const events = [
    makeEvent({ id: "e1", accountId: "a1", createdByUserId: "usr1" }),
    makeEvent({ id: "e2", accountId: "a2", createdByUserId: "usr2" }),
  ];
  const accounts = [
    makeAccount({ id: "a1", managerId: "mgr1" }),
    makeAccount({ id: "a2", managerId: "mgr2" }),
  ];

  it("ADMIN sees all events", () => {
    expect(scopeEventsForUser(events, user("ADMIN"), accounts)).toEqual(events);
  });

  it("MANAGER sees events on their accounts only", () => {
    const result = scopeEventsForUser(events, user("MANAGER", "mgr1"), accounts);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("e1");
  });

  it("USER sees only their own events", () => {
    const result = scopeEventsForUser(events, user("USER", "usr2"), accounts);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("e2");
  });

  it("BANKER sees no events", () => {
    expect(scopeEventsForUser(events, user("BANKER"), accounts)).toHaveLength(0);
  });
});

describe("toPublicUser", () => {
  it("strips the passwordHash field", () => {
    const full = {
      id: "u1",
      name: "Alice",
      email: "a@a.com",
      role: "ADMIN" as const,
      passwordHash: "secret",
    };
    const pub = toPublicUser(full);
    expect("passwordHash" in pub).toBe(false);
    expect(pub.id).toBe("u1");
  });
});

import type {
  Account,
  Event,
  PublicUser,
} from "../models/types.js";
import type { AuthUser } from "../middleware/authContext.js";

/**
 * Remove personal customer data from an account. Bankers must never see
 * customerName/phone/email (spec: "Banker cannot view customer name").
 */
export function stripAccountPII(
  account: Account
): Omit<Account, "customerName" | "phone" | "email"> {
  const { customerName, phone, email, ...safe } = account;
  return safe;
}

/** An account is manageable by an admin or by the manager it is assigned to. */
export function canManageAccount(account: Account, user: AuthUser): boolean {
  if (user.role === "ADMIN") return true;
  if (user.role === "MANAGER") return account.managerId === user.id;
  return false;
}

/**
 * Which accounts a user may see:
 * - ADMIN: all
 * - MANAGER: only accounts assigned to them (managerId === user.id)
 * - USER: only accounts referenced by their own events (related data)
 * - BANKER: none (bankers don't access customer accounts at all)
 */
export function scopeAccountsForUser(
  accounts: Account[],
  user: AuthUser,
  userEvents: Event[]
): Account[] {
  switch (user.role) {
    case "ADMIN":
      return accounts;
    case "MANAGER":
      return accounts.filter((a) => a.managerId === user.id);
    case "USER": {
      const relatedIds = new Set(
        userEvents
          .filter((e) => e.createdByUserId === user.id)
          .map((e) => e.accountId)
      );
      return accounts.filter((a) => relatedIds.has(a.id));
    }
    default:
      return [];
  }
}

/**
 * Which events a user may see:
 * - ADMIN: all
 * - MANAGER: events on accounts assigned to them
 * - USER: only events they created
 * - BANKER: none
 */
export function scopeEventsForUser(
  events: Event[],
  user: AuthUser,
  accounts: Account[]
): Event[] {
  switch (user.role) {
    case "ADMIN":
      return events;
    case "MANAGER": {
      const myAccountIds = new Set(
        accounts.filter((a) => a.managerId === user.id).map((a) => a.id)
      );
      return events.filter((e) => myAccountIds.has(e.accountId));
    }
    case "USER":
      return events.filter((e) => e.createdByUserId === user.id);
    default:
      return [];
  }
}

/** Strip the password hash before returning a user to a client. */
export function toPublicUser(user: { passwordHash: string } & PublicUser): PublicUser {
  const { passwordHash, ...rest } = user as PublicUser & {
    passwordHash: string;
  };
  return rest;
}

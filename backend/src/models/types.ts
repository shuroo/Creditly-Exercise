export type Role = "ADMIN" | "MANAGER" | "USER" | "BANKER";

/** Auctions run for a fixed window. Spec: "Auction duration: 3 days". */
export const AUCTION_DURATION_DAYS = 3;

/**
 * Auction visibility/submission model. We implement SEALED: one blind offer
 * per bank, winner (lowest rate) revealed only on close.
 */
export type AuctionModel = "SEALED";

export type AccountStatus = "NEW" | "ELIGIBLE" | "AUCTION_OPEN" | "WON" | "EXPIRED";

export type EventType =
  | "document_uploaded"
  | "status_changed"
  | "note_added"
  | "auction_opened"
  | "offer_submitted"
  | "auction_closed";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  bankId?: string;
  /** bcrypt hash; never serialized to clients (see PublicUser). */
  passwordHash: string;
}

/** A User safe to return to clients — the password hash is stripped. */
export type PublicUser = Omit<User, "passwordHash">;

export interface Account {
  id: string;
  customerName: string;
  phone: string;
  email: string;
  status: AccountStatus;
  managerId: string;
  lastActivity?: string;
  highActivity: boolean;
}

export interface Event {
  id: string;
  accountId: string;
  type: EventType;
  description?: string;
  createdByUserId: string;
  createdAt: string;
}

export interface AuctionOpportunity {
  id: string;
  accountId: string;
  model: AuctionModel;
  status: "OPEN" | "CLOSED" | "EXPIRED";
  eligibleBankIds: string[];
  openedAt: string;
  expiresAt: string;
  winningOfferId?: string;
}

export interface BankOffer {
  id: string;
  auctionId: string;
  bankId: string;
  interestRate: number;
  createdAt: string;
}
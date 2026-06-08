import type {
  Account,
  AuctionOpportunity,
  BankOffer,
} from "../models/types.js";
import { isExpired, selectWinner } from "./auctionRules.js";
import * as crm from "./crmService.js";

/**
 * Dependencies injected so this service is decoupled from app.ts and testable.
 */
export type SettlementDeps = {
  findAccount: (id: string) => Account | undefined;
  persistAccount: (account: Account) => void;
};

export type SettleOptions = {
  /** true = explicit manual close (close regardless of the 3-day window). */
  force?: boolean;
};

/**
 * Settle an auction and apply its account/CRM side effects. This is the single
 * place that turns an auction outcome into account state, so both the manual
 * close endpoint and the timeout sweep behave identically.
 *
 * - Already-settled (CLOSED/EXPIRED) -> no-op.
 * - Not expired and not forced -> left OPEN (no-op).
 * - No offers -> EXPIRED (spec: "No offers -> Expired"), account untouched.
 * - With offers -> CLOSED + lowest-rate winner; the account is marked WON and
 *   the CRM is notified (spec: "Winning offer -> Account marked as Won").
 *
 * Mutates and returns the auction; the caller persists the auction itself.
 */
export function settleAuction(
  auction: AuctionOpportunity,
  offers: BankOffer[],
  deps: SettlementDeps,
  options: SettleOptions = {},
  now: number = Date.now()
): AuctionOpportunity {
  if (auction.status !== "OPEN") return auction;
  if (!options.force && !isExpired(auction, now)) return auction;

  const winner = selectWinner(offers);

  if (!winner) {
    auction.status = "EXPIRED";
    return auction;
  }

  auction.status = "CLOSED";
  auction.winningOfferId = winner.id;

  // Winning offer -> account marked as Won + CRM sync.
  const account = deps.findAccount(auction.accountId);
  if (account) {
    account.status = "WON";
    deps.persistAccount(account);
    crm.notifyAccountWon(account, winner);
  }

  return auction;
}

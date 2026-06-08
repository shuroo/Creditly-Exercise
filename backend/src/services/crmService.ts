import type { Account, BankOffer } from "../models/types.js";

/**
 * Mock CRM integration layer. In a real system this would push to an external
 * CRM over the network; here we record calls in memory and log them, so the
 * integration is demonstrable (see GET /crm-log) without any external service.
 */
export type CrmEvent = {
  kind: "sync" | "won";
  accountId: string;
  at: string;
  detail: string;
};

const log: CrmEvent[] = [];

function record(event: CrmEvent) {
  log.push(event);
  console.log(`[crm] ${event.kind} account=${event.accountId} :: ${event.detail}`);
}

/** Push the latest account state to the CRM (e.g. after a document upload). */
export function syncAccount(account: Account, reason: string): void {
  record({
    kind: "sync",
    accountId: account.id,
    at: new Date().toISOString(),
    detail: `sync (${reason}); lastActivity=${account.lastActivity ?? "n/a"}`,
  });
}

/** Notify the CRM that an account won an auction at a given rate. */
export function notifyAccountWon(account: Account, offer: BankOffer): void {
  record({
    kind: "won",
    accountId: account.id,
    at: new Date().toISOString(),
    detail: `won auction ${offer.auctionId} via ${offer.bankId} @ ${offer.interestRate}`,
  });
}

/** Read-only view of everything the CRM has been told (newest last). */
export function getCrmLog(): CrmEvent[] {
  return [...log];
}

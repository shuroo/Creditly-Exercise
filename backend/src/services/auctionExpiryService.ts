import type { AuctionOpportunity, BankOffer } from "../models/types.js";
import { settleIfExpired } from "./auctionRules.js";

/**
 * Dependencies the sweep needs, injected so this service stays decoupled from
 * app.ts (avoids a circular import) and is easy to test.
 */
export type ExpirySweepDeps = {
  listAuctions: () => AuctionOpportunity[];
  offersForAuction: (auctionId: string) => BankOffer[];
  persist: (auction: AuctionOpportunity) => void;
};

/**
 * One pass over all auctions: settle any whose 3-day window has elapsed. This
 * is the *active* counterpart to the lazy settle that already runs on reads —
 * it guarantees an auction closes even if nobody ever touches it again. Reuses
 * settleIfExpired so the outcome (CLOSED+winner, or EXPIRED when no offers) is
 * identical to the request-driven path. Returns the number settled.
 */
export function runExpirySweep(
  deps: ExpirySweepDeps,
  now: number = Date.now()
): number {
  let settled = 0;
  for (const auction of deps.listAuctions()) {
    const before = auction.status;
    settleIfExpired(auction, deps.offersForAuction(auction.id), now);
    if (auction.status !== before) {
      deps.persist(auction);
      settled++;
    }
  }
  return settled;
}

const DEFAULT_INTERVAL_MS = 60_000; // 1 minute — far finer than a 3-day window.

/**
 * Start the periodic auction-expiry sweep. Runs one pass immediately, then on
 * the given interval. The timer is unref'd so it never keeps the process alive
 * on its own. Returns a stop() to clear it (useful for tests / shutdown).
 */
export function startAuctionExpiryService(
  deps: ExpirySweepDeps,
  intervalMs: number = DEFAULT_INTERVAL_MS
): { stop: () => void } {
  const tick = () => {
    const settled = runExpirySweep(deps);
    if (settled > 0) {
      console.log(`[auction-expiry] settled ${settled} expired auction(s)`);
    }
  };

  tick(); // settle anything already overdue at startup

  const handle = setInterval(tick, intervalMs);
  handle.unref?.();

  return { stop: () => clearInterval(handle) };
}

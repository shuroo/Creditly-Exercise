import type { AuctionOpportunity } from "../models/types.js";

/**
 * Dependencies the sweep needs, injected so this service stays decoupled from
 * app.ts (avoids a circular import) and is easy to test.
 *
 * `settle` settles one auction (timeout path) and persists it + its side
 * effects (account WON / EXPIRED, CRM). It must be idempotent on already-
 * settled auctions and return the auction so we can detect a status change.
 */
export type ExpirySweepDeps = {
  listAuctions: () => Promise<AuctionOpportunity[]>;
  settle: (auction: AuctionOpportunity) => Promise<AuctionOpportunity>;
};

/**
 * One pass over all auctions: settle any whose 3-day window has elapsed. This
 * is the *active* counterpart to the lazy settle that runs on reads — it
 * guarantees an auction closes even if nobody ever touches it again. The actual
 * outcome (CLOSED+winner+account WON, or EXPIRED when no offers) lives in the
 * injected settle, so this path is identical to the request-driven one.
 * Returns the number settled.
 */
export async function runExpirySweep(deps: ExpirySweepDeps): Promise<number> {
  let settled = 0;
  for (const auction of await deps.listAuctions()) {
    const before = auction.status;
    await deps.settle(auction);
    if (auction.status !== before) settled++;
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
    runExpirySweep(deps)
      .then((settled) => {
        if (settled > 0) {
          console.log(`[auction-expiry] settled ${settled} expired auction(s)`);
        }
      })
      .catch((err) => console.error("[auction-expiry] sweep failed", err));
  };

  tick(); // settle anything already overdue at startup

  const handle = setInterval(tick, intervalMs);
  handle.unref?.();

  return { stop: () => clearInterval(handle) };
}

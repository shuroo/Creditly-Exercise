import type { AuctionOpportunity, BankOffer } from "../models/types.js";

/** An auction is expired once the current time passes its expiresAt. */
export function isExpired(
  auction: AuctionOpportunity,
  now: number = Date.now()
): boolean {
  return now > Date.parse(auction.expiresAt);
}

/**
 * Best offer = lowest total interest rate (spec). Ties are broken by the
 * earliest submission, so the bank that bid the winning rate first wins.
 * Returns undefined when there are no offers.
 */
export function selectWinner(offers: BankOffer[]): BankOffer | undefined {
  return offers.reduce<BankOffer | undefined>((best, offer) => {
    if (!best) return offer;
    if (offer.interestRate < best.interestRate) return offer;
    if (
      offer.interestRate === best.interestRate &&
      Date.parse(offer.createdAt) < Date.parse(best.createdAt)
    ) {
      return offer;
    }
    return best;
  }, undefined);
}

/**
 * Lazy auto-close: if an OPEN auction's 3-day window has elapsed, settle it.
 * - With offers -> CLOSED and the winner (lowest rate) is selected.
 * - Without offers -> EXPIRED, no winner.
 * Mutates and returns the auction; the caller persists it. Non-OPEN auctions
 * are returned untouched.
 */
export function settleIfExpired(
  auction: AuctionOpportunity,
  offers: BankOffer[],
  now: number = Date.now()
): AuctionOpportunity {
  if (auction.status !== "OPEN" || !isExpired(auction, now)) {
    return auction;
  }

  if (offers.length === 0) {
    auction.status = "EXPIRED";
    return auction;
  }

  return closeAuction(auction, offers);
}

/**
 * Explicitly close an auction and select the winner (lowest rate). Used by the
 * manager/admin close endpoint. Always results in CLOSED; winningOfferId is set
 * only when at least one offer exists.
 */
export function closeAuction(
  auction: AuctionOpportunity,
  offers: BankOffer[]
): AuctionOpportunity {
  auction.status = "CLOSED";
  const winner = selectWinner(offers);
  if (winner) {
    auction.winningOfferId = winner.id;
  }
  return auction;
}

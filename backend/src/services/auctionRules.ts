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


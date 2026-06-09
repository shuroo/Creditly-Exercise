import { crmIntegration } from "../integrations/crm.integration.js";

export class CrmService {

  async syncDocumentUploaded(event: unknown) {
    return crmIntegration.sync(
      "document_uploaded",
      event
    );
  }

  async syncStatusChanged(account: unknown) {
    return crmIntegration.sync(
      "status_changed",
      account
    );
  }

  async syncAuctionOpened(auction: unknown) {
    return crmIntegration.sync(
      "auction_opened",
      auction
    );
  }

  async syncWinningOfferSelected(payload: {
    auctionId: string;
    winningOfferId: string;
    interestRate: number;
  }) {
    return crmIntegration.sync(
      "winning_offer_selected",
      payload
    );
  }
}

export const crmService = new CrmService();
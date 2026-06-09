export type CrmTrigger =
  | "status_changed"
  | "document_uploaded"
  | "auction_opened"
  | "winning_offer_selected";

export type CrmSyncStatus = "SYNCED" | "FAILED";

export interface CrmSyncResult {
  status: CrmSyncStatus;
  failureReason?: string;
  syncedAt?: string;
}

export class CrmIntegration {
  async sync(trigger: CrmTrigger, payload: unknown): Promise<CrmSyncResult> {
    console.log("[Mock CRM] sync started", {
      trigger,
      payload,
    });

    const shouldFail = Math.random() < 0.2;

    if (shouldFail) {
      return {
        status: "FAILED",
        failureReason: "Mock CRM failure",
      };
    }

    return {
      status: "SYNCED",
      syncedAt: new Date().toISOString(),
    };
  }
}

export const crmIntegration = new CrmIntegration();
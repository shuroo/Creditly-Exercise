import type { Account, Event } from "../models/types.js";
import * as crm from "./crmService.js";

/**
 * Dependencies injected so the rules stay decoupled from app.ts (no circular
 * import) and are unit-testable with in-memory fakes.
 */
export type EventRuleDeps = {
  /** All events currently stored (used to count recent activity). */
  listEvents: () => Promise<Event[]>;
  findAccount: (id: string) => Promise<Account | undefined>;
  persistAccount: (account: Account) => Promise<void>;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const HIGH_ACTIVITY_THRESHOLD = 3; // strictly MORE than 3 events in 24h

/**
 * Apply the event-driven business rules after an event is created. Dedicated
 * service entry point — controllers call this instead of inlining the logic.
 *
 * - More than 3 events for the account within 24h -> mark High Activity.
 * - document_uploaded -> update account.lastActivity and trigger a CRM sync.
 */
export async function applyEventRules(
  event: Event,
  deps: EventRuleDeps,
  now: number = Date.now()
): Promise<void> {
  const account = await deps.findAccount(event.accountId);
  if (!account) return; // event may reference an account not in the store

  let changed = false;

  // High-activity rule.
  const cutoff = now - DAY_MS;
  const recentCount = (await deps.listEvents())
    .filter(
      (e) => e.accountId === account.id && Date.parse(e.createdAt) >= cutoff
    ).length;
  if (recentCount > HIGH_ACTIVITY_THRESHOLD && !account.highActivity) {
    account.highActivity = true;
    changed = true;
  }

  // document_uploaded rule: update lastActivity + trigger CRM sync.
  if (event.type === "document_uploaded") {
    account.lastActivity = event.createdAt;
    changed = true;
    await deps.persistAccount(account);
    crm.syncAccount(account, "document_uploaded");
    return;
  }

  if (changed) {
    await deps.persistAccount(account);
  }
}

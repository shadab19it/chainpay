/**
 * ChainPay domain types. Shared by the UI today and by the API routes later
 * (GET /api/ledger, POST /api/fail/:id, POST /api/reschedule, ...).
 */

export type EntryType = "in" | "out";

export type EntryStatus =
  | "scheduled"
  | "failed"
  | "at_risk"
  | "rescheduled"
  | "paid";

export type PaymentMethod = "UPI" | "Bank transfer";

export type Entry = {
  id: string;
  type: EntryType;
  /** Full business name, e.g. "Sharma Kirana Store". */
  party: string;
  /** Short name that fits in a calendar block. */
  shortName: string;
  /** How the agent addresses the person on a call, e.g. "Sharma ji". */
  contactName: string;
  /** Optional role label from the PRD, e.g. "Supplier A". */
  role?: string;
  phone: string;
  amount: number;
  /** ISO date, YYYY-MM-DD. */
  dueDate: string;
  status: EntryStatus;
  method: PaymentMethod;
  /** For outgoing payouts: the incoming payment that funds it. */
  dependsOn?: string;
  /** Set when the entry was moved by the agent. */
  originalDueDate?: string;
  /** Set when the agent called the payee about the delay. */
  payeeInformed?: boolean;
};

export type Merchant = {
  id: string;
  name: string;
  owner: string;
  city: string;
  business: string;
  /** Bank balance on the 1st of the month, used for the cash position line. */
  openingBalance: number;
};

export type Ledger = {
  merchant: Merchant;
  entries: Entry[];
};

/** What the LLM pulls out of the client's reply (POST /api/extract). */
export type Extraction = {
  reason: string;
  newDate: string;
  confidence: number;
};

/** One Cashfree Payouts transfer created by a reschedule (POST /api/reschedule). */
export type PayoutTransfer = {
  transferId: string;
  entryId: string;
  beneficiary: string;
  amount: number;
  scheduledFor: string;
  request: Record<string, unknown>;
};

export type RescheduleResult = {
  entries: Entry[];
  transfers: PayoutTransfer[];
  status: "sent" | "queued";
};

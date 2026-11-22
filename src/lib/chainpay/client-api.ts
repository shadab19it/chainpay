import type {
  Entry,
  Extraction,
  Ledger,
  PayoutTransfer,
  RescheduleResult,
} from "@/types/chainpay";
import { addDays, parseISODate, toISODate } from "./format";
import { applyFailure, applyReschedule, getDependents } from "./ledger";
import { cloneSeedLedger } from "./seed";

/**
 * Browser-side API client.
 *
 * MOCK MODE: every function below simulates its PRD endpoint in memory, with
 * realistic delays. To go live, replace each body with a fetch to the route
 * named in its comment — the signatures and return types stay the same.
 */
export const API_MODE: "mock" | "live" = "mock";

let ledger: Ledger = cloneSeedLedger();

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Initial data for the first render (sync in mock mode). */
export function getInitialLedger(): Ledger {
  return structuredClone(ledger);
}

/** GET /api/ledger */
export async function fetchLedger(): Promise<Ledger> {
  await wait(150);
  return structuredClone(ledger);
}

/** Demo-only: restore the seed data. */
export async function resetLedger(): Promise<Ledger> {
  ledger = cloneSeedLedger();
  return structuredClone(ledger);
}

/** POST /api/fail/:entryId */
export async function markPaymentFailed(
  entryId: string,
): Promise<{ entries: Entry[]; atRiskIds: string[] }> {
  await wait(250);
  ledger = { ...ledger, entries: applyFailure(ledger.entries, entryId) };
  const atRiskIds = getDependents(ledger.entries, entryId)
    .filter((e) => e.status === "at_risk")
    .map((e) => e.id);
  return { entries: structuredClone(ledger.entries), atRiskIds };
}

/**
 * POST /api/tts — later returns Sarvam Bulbul audio that the browser plays.
 * Mock: resolves after roughly the time it would take to speak the text.
 */
export async function speak(text: string): Promise<{ durationMs: number }> {
  const durationMs = Math.min(5200, Math.max(1800, text.length * 42));
  await wait(durationMs);
  return { durationMs };
}

/**
 * POST /api/stt — later sends recorded audio to Sarvam Saarika.
 * Mock: returns the preset reply text it is given.
 */
export async function transcribe(fallbackText: string): Promise<{ transcript: string }> {
  await wait(900);
  return { transcript: fallbackText };
}

/**
 * POST /api/extract — later an LLM returns { reason, new_date } as JSON.
 * Mock: a small rule-based parser over the transcript.
 */
export async function extractCommitment(
  transcript: string,
  originalDueDate: string,
): Promise<Extraction> {
  await wait(1100);
  const lower = transcript.toLowerCase();
  const reason = /bank/.test(lower)
    ? "Bank issue at client's end"
    : /upi|server/.test(lower)
      ? "UPI transfer failed"
      : /cash|paisa|paise/.test(lower)
        ? "Short on cash this week"
        : "Not stated";

  const { y, m, d } = parseISODate(originalDueDate);
  const day = Number(lower.match(/(\d{1,2})\s*(tarikh|tareekh|ko)/)?.[1]);
  let newDate = addDays(originalDueDate, 4);
  if (day >= 1 && day <= 31) {
    newDate =
      day >= d
        ? toISODate(y, m, day)
        : toISODate(m === 12 ? y + 1 : y, m === 12 ? 1 : m + 1, day);
  }
  return { reason, newDate, confidence: Number.isNaN(day) ? 0.61 : 0.93 };
}

/** POST /api/reschedule — moves dependent payouts and creates Cashfree Payouts transfers. */
export async function reschedulePayouts(
  paymentId: string,
  newDate: string,
): Promise<RescheduleResult> {
  await wait(1300);
  const before = getDependents(ledger.entries, paymentId).filter(
    (e) => e.status === "at_risk",
  );
  ledger = {
    ...ledger,
    entries: applyReschedule(ledger.entries, paymentId, newDate),
  };

  const transfers: PayoutTransfer[] = before.map((e) => {
    const moved = ledger.entries.find((x) => x.id === e.id)!;
    const transferId = `CP_${e.id}_${moved.dueDate.replaceAll("-", "")}`;
    return {
      transferId,
      entryId: e.id,
      beneficiary: e.party,
      amount: e.amount,
      scheduledFor: moved.dueDate,
      request: {
        transfer_id: transferId,
        transfer_amount: e.amount,
        transfer_currency: "INR",
        transfer_mode: e.method === "UPI" ? "upi" : "banktransfer",
        beneficiary_details: { beneficiary_id: `BENE_${e.id.toUpperCase()}` },
        transfer_remarks: `ChainPay reschedule ${paymentId}`,
        scheduled_for: moved.dueDate,
      },
    };
  });

  return {
    entries: structuredClone(ledger.entries),
    transfers,
    status: "queued",
  };
}

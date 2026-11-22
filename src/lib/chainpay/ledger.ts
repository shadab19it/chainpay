import type { Entry } from "@/types/chainpay";
import { addDays, daysInMonth, monthKey, toISODate } from "./format";

/**
 * Pure ledger rules. No I/O, so the same functions can run in the browser
 * (mock mode) and later inside the API route handlers.
 */

export function getDependents(entries: Entry[], paymentId: string): Entry[] {
  return entries.filter((e) => e.dependsOn === paymentId);
}

export type Chain = { rootId: string; dependentIds: string[] };

/** The incoming payment an entry belongs to, plus every payout it funds. */
export function getChain(entries: Entry[], entryId: string): Chain | null {
  const entry = entries.find((e) => e.id === entryId);
  if (!entry) return null;
  const rootId = entry.type === "in" ? entry.id : entry.dependsOn;
  if (!rootId) return null;
  return {
    rootId,
    dependentIds: getDependents(entries, rootId).map((e) => e.id),
  };
}

/** F3: the payment fails and the payouts that depend on it become at risk. */
export function applyFailure(entries: Entry[], paymentId: string): Entry[] {
  return entries.map((e) => {
    if (e.id === paymentId) return { ...e, status: "failed" };
    if (e.dependsOn === paymentId && e.status === "scheduled") {
      return { ...e, status: "at_risk" };
    }
    return e;
  });
}

/** PRD rule: new payout date = new incoming date + 1 day. */
export function payoutDateFor(newIncomingDate: string): string {
  return addDays(newIncomingDate, 1);
}

/** F6: the payment moves to the promised date and its payouts follow. */
export function applyReschedule(
  entries: Entry[],
  paymentId: string,
  newDate: string,
): Entry[] {
  const payoutDate = payoutDateFor(newDate);
  return entries.map((e) => {
    if (e.id === paymentId) {
      return {
        ...e,
        status: "rescheduled",
        originalDueDate: e.originalDueDate ?? e.dueDate,
        dueDate: newDate,
      };
    }
    if (e.dependsOn === paymentId && e.status === "at_risk") {
      return {
        ...e,
        status: "rescheduled",
        originalDueDate: e.originalDueDate ?? e.dueDate,
        dueDate: payoutDate,
        payeeInformed: true,
      };
    }
    return e;
  });
}

export type BalancePoint = { date: string; balance: number };

export type MonthSummary = {
  incoming: number;
  incomingCount: number;
  received: number;
  outgoing: number;
  outgoingCount: number;
  atRisk: number;
  atRiskCount: number;
  failed: number;
  series: BalancePoint[];
  /** Lowest projected balance from `fromDate` to month end. */
  low: BalancePoint;
};

/** F8: numbers for the cash flow strip, plus a day-by-day balance line. */
export function summarizeMonth(
  entries: Entry[],
  y: number,
  m: number,
  openingBalance: number,
  fromDate: string,
): MonthSummary {
  const key = monthKey(y, m);
  const inMonth = entries.filter((e) => e.dueDate.startsWith(key));
  const ins = inMonth.filter((e) => e.type === "in");
  const outs = inMonth.filter((e) => e.type === "out");
  const atRisk = outs.filter((e) => e.status === "at_risk");
  const sum = (list: Entry[]) => list.reduce((t, e) => t + e.amount, 0);

  let balance = openingBalance;
  const series: BalancePoint[] = [];
  for (let d = 1; d <= daysInMonth(y, m); d++) {
    const date = toISODate(y, m, d);
    for (const e of inMonth) {
      if (e.dueDate !== date) continue;
      if (e.type === "in" && e.status !== "failed") balance += e.amount;
      if (e.type === "out") balance -= e.amount;
    }
    series.push({ date, balance });
  }

  const upcoming = series.filter((p) => p.date >= fromDate);
  const low = (upcoming.length ? upcoming : series).reduce((a, b) =>
    b.balance < a.balance ? b : a,
  );

  return {
    incoming: sum(ins),
    incomingCount: ins.length,
    received: sum(ins.filter((e) => e.status === "paid")),
    outgoing: sum(outs),
    outgoingCount: outs.length,
    atRisk: sum(atRisk),
    atRiskCount: atRisk.length,
    failed: sum(ins.filter((e) => e.status === "failed")),
    series,
    low,
  };
}

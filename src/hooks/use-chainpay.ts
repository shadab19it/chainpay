"use client";

import { useCallback, useRef, useState } from "react";
import { flushSync } from "react-dom";
import * as api from "@/lib/chainpay/client-api";
import { addDays, formatINR, formatShortDate } from "@/lib/chainpay/format";
import { getDependents, payoutDateFor } from "@/lib/chainpay/ledger";
import * as script from "@/lib/chainpay/scripts";
import type {
  Entry,
  Extraction,
  Ledger,
  PayoutTransfer,
} from "@/types/chainpay";

/* ------------------------------------------------------------------ types */

export const STEP_ORDER = [
  "detected",
  "call_client",
  "reply",
  "extract",
  "warn",
  "reschedule",
] as const;

export type StepKey = (typeof STEP_ORDER)[number];
export type StepState = "pending" | "active" | "done";
export type RunStep = { state: StepState; at?: number; detail?: string };

export type CallMode =
  | "dialing"
  | "speaking"
  | "listening"
  | "recording"
  | "processing";

export type ActiveCall = {
  key: string;
  name: string;
  contactName: string;
  phone: string;
  role: "client" | "supplier";
  mode: CallMode;
};

export type TranscriptLine = {
  id: string;
  speaker: "agent" | "party";
  to: string;
  text: string;
  translation?: string;
};

export type SupplierCall = {
  entryId: string;
  party: string;
  amount: number;
  state: "pending" | "calling" | "done";
};

export type AgentRun = {
  id: number;
  paymentId: string;
  party: string;
  amount: number;
  originalDueDate: string;
  status: "running" | "done";
  steps: Record<StepKey, RunStep>;
  call: ActiveCall | null;
  transcript: TranscriptLine[];
  extracted?: Extraction;
  supplierCalls: SupplierCall[];
  transfers?: PayoutTransfer[];
  transferStatus?: "sent" | "queued";
  replyCountdown: number | null;
  totalSeconds?: number;
};

export type ReplyMode = "sample" | "mic";

export type Toast = { id: number; title: string; detail: string };

const AUTO_REPLY_SECONDS = 5;

class RunCancelled extends Error {}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Animate calendar moves with the View Transitions API when the browser has it. */
function withViewTransition(update: () => void) {
  if (
    typeof document !== "undefined" &&
    document.startViewTransition &&
    !document.hidden
  ) {
    const transition = document.startViewTransition(() => flushSync(update));
    // The browser aborts the animation if the tab is hidden mid-way; the update still applies.
    transition.ready.catch(() => {});
    transition.finished.catch(() => {});
  } else {
    update();
  }
}

/* ------------------------------------------------------------------- hook */

/**
 * Owns the ledger and the recovery agent run (F3–F7).
 * Every external call goes through `@/lib/chainpay/client-api`.
 */
export function useChainPay() {
  const [ledger, setLedger] = useState<Ledger>(() => api.getInitialLedger());
  const [run, setRun] = useState<AgentRun | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const runIdRef = useRef(0);
  const replyRef = useRef<((mode: ReplyMode) => void) | null>(null);

  const setEntries = (entries: Entry[]) =>
    setLedger((prev) => ({ ...prev, entries }));

  async function startRecovery(paymentId: string) {
    if (run?.status === "running") return;
    const payment = ledger.entries.find((e) => e.id === paymentId);
    if (!payment || payment.type !== "in" || payment.status !== "scheduled") {
      return;
    }

    const runId = ++runIdRef.current;
    const startedAt = performance.now();
    const merchant = ledger.merchant;
    const seconds = () => Math.round((performance.now() - startedAt) / 1000);
    const ensure = () => {
      if (runIdRef.current !== runId) throw new RunCancelled();
    };
    const sleep = async (ms: number) => {
      await wait(ms);
      ensure();
    };
    const patch = (fn: (r: AgentRun) => AgentRun) =>
      setRun((prev) => (prev && prev.id === runId ? fn(prev) : prev));
    const step = (key: StepKey, state: StepState, detail?: string) =>
      patch((r) => ({
        ...r,
        steps: {
          ...r.steps,
          [key]: {
            state,
            at: state === "done" ? seconds() : r.steps[key].at,
            detail: detail ?? r.steps[key].detail,
          },
        },
      }));
    const setCall = (call: ActiveCall | null) => patch((r) => ({ ...r, call }));
    const setMode = (mode: CallMode) =>
      patch((r) => (r.call ? { ...r, call: { ...r.call, mode } } : r));
    const say = (line: TranscriptLine) =>
      patch((r) => ({ ...r, transcript: [...r.transcript, line] }));

    const waitForReply = () =>
      new Promise<ReplyMode>((resolve) => {
        let remaining = AUTO_REPLY_SECONDS;
        patch((r) => ({ ...r, replyCountdown: remaining }));
        const finish = (mode: ReplyMode) => {
          clearInterval(timer);
          replyRef.current = null;
          patch((r) => ({ ...r, replyCountdown: null }));
          resolve(mode);
        };
        const timer = setInterval(() => {
          remaining -= 1;
          if (remaining <= 0) finish("sample");
          else patch((r) => ({ ...r, replyCountdown: remaining }));
        }, 1000);
        replyRef.current = finish;
      });

    try {
      // F3 — mark failed, dependents become at risk
      const dependents = getDependents(ledger.entries, paymentId);
      setRun({
        id: runId,
        paymentId,
        party: payment.party,
        amount: payment.amount,
        originalDueDate: payment.dueDate,
        status: "running",
        steps: {
          detected: { state: "active" },
          call_client: { state: "pending" },
          reply: { state: "pending" },
          extract: { state: "pending" },
          warn: { state: "pending" },
          reschedule: { state: "pending" },
        },
        call: null,
        transcript: [],
        supplierCalls: dependents.map((d) => ({
          entryId: d.id,
          party: d.party,
          amount: d.amount,
          state: "pending",
        })),
        replyCountdown: null,
      });
      const failed = await api.markPaymentFailed(paymentId);
      ensure();
      setEntries(failed.entries);
      step(
        "detected",
        "done",
        `${formatINR(payment.amount)} failed · ${failed.atRiskIds.length} payouts at risk`,
      );
      await sleep(900);

      // F4 — call the client in Hindi
      step("call_client", "active", `Calling ${payment.contactName}`);
      setCall({
        key: `client-${paymentId}`,
        name: payment.party,
        contactName: payment.contactName,
        phone: payment.phone,
        role: "client",
        mode: "dialing",
      });
      await sleep(1600);
      const opening = script.clientOpening(merchant, payment);
      setMode("speaking");
      say({ id: "c1", speaker: "agent", to: payment.contactName, ...opening });
      await api.speak(opening.text);
      ensure();
      step("call_client", "done", "Asked for reason and new date");

      // Reply — mic (STT) or the preset reply
      step("reply", "active", "Waiting for the client");
      setMode("listening");
      const mode = await waitForReply();
      ensure();
      // Demo reply promises payment 4 days after the original due date.
      const preset = script.sampleReply(addDays(payment.dueDate, 4));
      let replyText = preset.text;
      if (mode === "mic") {
        setMode("recording");
        await sleep(2600);
        setMode("processing");
        replyText = (await api.transcribe(preset.text)).transcript;
        ensure();
      } else {
        setMode("processing");
        await sleep(500);
      }
      say({
        id: "c2",
        speaker: "party",
        to: payment.contactName,
        text: replyText,
        translation: preset.translation,
      });
      step("reply", "done", mode === "mic" ? "Transcribed reply" : "Sample reply used");

      // Extract reason + new date
      step("extract", "active", "Reading the reply");
      const extracted = await api.extractCommitment(replyText, payment.dueDate);
      ensure();
      patch((r) => ({ ...r, extracted }));
      step(
        "extract",
        "done",
        `${extracted.reason} · new date ${formatShortDate(extracted.newDate)}`,
      );
      const closing = script.clientClosing(payment, extracted.newDate);
      setMode("speaking");
      say({ id: "c3", speaker: "agent", to: payment.contactName, ...closing });
      await api.speak(closing.text);
      ensure();
      setCall(null);
      await sleep(600);

      // F5 — warn every affected supplier before moving anything
      const payoutDate = payoutDateFor(extracted.newDate);
      const atRisk = dependents.filter((d) => failed.atRiskIds.includes(d.id));
      step("warn", "active", `0 of ${atRisk.length} suppliers`);
      for (const [i, payout] of atRisk.entries()) {
        patch((r) => ({
          ...r,
          supplierCalls: r.supplierCalls.map((c) =>
            c.entryId === payout.id ? { ...c, state: "calling" } : c,
          ),
        }));
        setCall({
          key: `supplier-${payout.id}`,
          name: payout.party,
          contactName: payout.contactName,
          phone: payout.phone,
          role: "supplier",
          mode: "dialing",
        });
        await sleep(1300);
        const warning = script.supplierWarning(merchant, payout, payoutDate);
        setMode("speaking");
        say({ id: `s-${payout.id}`, speaker: "agent", to: payout.contactName, ...warning });
        await api.speak(warning.text);
        ensure();
        patch((r) => ({
          ...r,
          supplierCalls: r.supplierCalls.map((c) =>
            c.entryId === payout.id ? { ...c, state: "done" } : c,
          ),
        }));
        setLedger((prev) => ({
          ...prev,
          entries: prev.entries.map((e) =>
            e.id === payout.id ? { ...e, payeeInformed: true } : e,
          ),
        }));
        step("warn", "active", `${i + 1} of ${atRisk.length} suppliers`);
        setCall(null);
        await sleep(500);
      }
      step("warn", "done", `${atRisk.length} suppliers informed`);

      // F6 — cascade reschedule + Cashfree Payouts
      step("reschedule", "active", "Creating transfers on Cashfree");
      const result = await api.reschedulePayouts(paymentId, extracted.newDate);
      ensure();
      withViewTransition(() => setEntries(result.entries));
      patch((r) => ({
        ...r,
        transfers: result.transfers,
        transferStatus: result.status,
      }));
      step(
        "reschedule",
        "done",
        `${result.transfers.length} payouts moved to ${formatShortDate(payoutDate)}`,
      );
      patch((r) => ({ ...r, status: "done", totalSeconds: seconds() }));

      setToast({
        id: runId,
        title: "1 delay handled",
        detail: `${atRisk.length} suppliers informed · 0 relationships broken`,
      });
    } catch (error) {
      if (!(error instanceof RunCancelled)) throw error;
    }
  }

  const dismissToast = useCallback(() => setToast(null), []);

  function submitReply(mode: ReplyMode) {
    replyRef.current?.(mode);
  }

  async function reset() {
    runIdRef.current++;
    replyRef.current?.("sample");
    const fresh = await api.resetLedger();
    setLedger(fresh);
    setRun(null);
    setToast(null);
  }

  return {
    merchant: ledger.merchant,
    entries: ledger.entries,
    run,
    toast,
    dismissToast,
    startRecovery,
    submitReply,
    reset,
  };
}

"use client";

import {
  Check,
  ChevronRight,
  Loader2,
  Mic,
  Phone,
  PhoneCall,
  RotateCcw,
} from "lucide-react";
import { type Ref, useEffect, useState } from "react";
import type {
  ActiveCall,
  AgentRun,
  ReplyMode,
  StepKey,
} from "@/hooks/use-chainpay";
import { STEP_ORDER } from "@/hooks/use-chainpay";
import {
  formatINR,
  formatShortDate,
  initials,
  maskPhone,
} from "@/lib/chainpay/format";
import { getDependents } from "@/lib/chainpay/ledger";
import { cn } from "@/lib/utils";
import type { Entry, Merchant } from "@/types/chainpay";

type AgentPanelProps = {
  merchant: Merchant;
  entries: Entry[];
  run: AgentRun | null;
  onStart: (paymentId: string) => void;
  onReply: (mode: ReplyMode) => void;
  onReset: () => void;
  className?: string;
  ref?: Ref<HTMLElement>;
};

/** F7 — the agent's live workspace: call, transcript, extracted fields and step log. */
export function AgentPanel({
  merchant,
  entries,
  run,
  onStart,
  onReply,
  onReset,
  className,
  ref,
}: AgentPanelProps) {
  const live = run?.status === "running";
  return (
    <aside
      ref={ref}
      aria-label="Recovery agent"
      className={cn("flex flex-col bg-background", className)}
    >
      <header className="flex items-center gap-3 border-b border-border px-5 py-4">
        <span className="grid size-9 place-items-center rounded-lg bg-foreground text-background">
          <PhoneCall className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">Recovery agent</h2>
          <p className="text-xs text-muted-foreground">
            Speaks Hindi · calls on behalf of {merchant.name}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex h-6 items-center gap-1.5 rounded-full border px-2 text-[11px] font-medium",
            live
              ? "border-fail-line bg-fail-soft text-fail"
              : run
                ? "border-in-line bg-in-soft text-in"
                : "border-border text-muted-foreground",
          )}
        >
          <span
            className={cn(
              "size-1.5 rounded-full bg-current",
              live && "animate-pulse",
            )}
            aria-hidden
          />
          {live ? "Live" : run ? "Resolved" : "Watching"}
        </span>
      </header>

      <div className="flex-1 overflow-y-auto">
        {run ? (
          <RunView run={run} onReply={onReply} />
        ) : (
          <IdleView entries={entries} onStart={onStart} />
        )}
      </div>

      {run?.status === "done" && (
        <footer className="cp-rise border-t border-border px-5 py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Handled in{" "}
              <span className="font-medium text-foreground tabular-nums">
                {run.totalSeconds}s
              </span>{" "}
              without anyone touching it.
            </p>
            <button
              type="button"
              onClick={onReset}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-medium hover:bg-muted"
            >
              <RotateCcw className="size-3.5" aria-hidden /> Reset
            </button>
          </div>
        </footer>
      )}
    </aside>
  );
}

/* ------------------------------------------------------------------ idle */

function IdleView({
  entries,
  onStart,
}: {
  entries: Entry[];
  onStart: (id: string) => void;
}) {
  const incoming = entries
    .filter((e) => e.type === "in")
    .toSorted((a, b) => a.dueDate.localeCompare(b.dueDate));
  const watching = incoming.filter((e) => e.status === "scheduled").length;

  return (
    <div className="space-y-6 px-5 py-5">
      <p className="text-sm leading-relaxed text-muted-foreground">
        Watching <span className="font-medium text-foreground">{watching} incoming payments</span>.
        If one fails, the agent calls the client, warns every supplier who
        depends on that money, then moves their payouts.
      </p>

      <section>
        <h3 className="mb-2 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
          Incoming this month
        </h3>
        <ul className="divide-y divide-border rounded-lg border border-border">
          {incoming.map((e) => {
            const funds = getDependents(entries, e.id).length;
            const canFail = e.status === "scheduled";
            return (
              <li key={e.id} className="flex items-center gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{e.party}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {formatShortDate(e.dueDate)} · funds {funds} payout
                    {funds === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums">
                    {formatINR(e.amount)}
                  </p>
                  {canFail ? (
                    <button
                      type="button"
                      onClick={() => onStart(e.id)}
                      className="text-[11px] font-medium text-fail underline-offset-2 hover:underline"
                    >
                      Simulate failure
                    </button>
                  ) : (
                    <p className="text-[11px] text-in">
                      {e.status === "paid" ? "Received" : e.status}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h3 className="mb-2 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
          How it works
        </h3>
        <ol className="space-y-2.5 text-xs">
          {[
            ["Calls the client", "Asks why it failed and when it will come"],
            ["Warns suppliers first", "Before any date changes"],
            ["Moves the payouts", "New date + 1 day, on Cashfree Payouts"],
          ].map(([title, sub], i) => (
            <li key={title} className="flex gap-3">
              <span className="grid size-5 shrink-0 place-items-center rounded-full border border-border text-[10px] font-semibold tabular-nums text-muted-foreground">
                {i + 1}
              </span>
              <span>
                <span className="font-medium">{title}</span>
                <span className="block text-muted-foreground">{sub}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-lg bg-surface px-3 py-2.5 text-[11px]">
        <dt className="text-muted-foreground">Voice</dt>
        <dd className="text-right">Sarvam Bulbul · hi-IN</dd>
        <dt className="text-muted-foreground">Listening</dt>
        <dd className="text-right">Sarvam Saarika</dd>
        <dt className="text-muted-foreground">Payouts</dt>
        <dd className="text-right">Cashfree · sandbox</dd>
      </dl>
    </div>
  );
}

/* ------------------------------------------------------------------- run */

const STEP_LABEL: Record<StepKey, string> = {
  detected: "Payment failed",
  call_client: "Calling client",
  reply: "Client reply",
  extract: "Reason and new date",
  warn: "Warning suppliers",
  reschedule: "Rescheduling payouts",
};

function RunView({
  run,
  onReply,
}: {
  run: AgentRun;
  onReply: (mode: ReplyMode) => void;
}) {
  const resolved = run.status === "done" && run.extracted;
  return (
    <div className="space-y-5 px-5 py-5">
      <div
        className={cn(
          "flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition-colors duration-500",
          resolved
            ? "border-in-line bg-in-soft/70"
            : "border-fail-line/70 bg-fail-soft/60",
        )}
      >
        <div className="min-w-0">
          <p
            className={cn(
              "text-[11px] font-medium uppercase tracking-[0.06em]",
              resolved ? "text-in" : "text-fail",
            )}
          >
            {resolved ? "Recovered · promised" : "Failed payment"}
          </p>
          <p className="truncate text-sm font-medium">{run.party}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold tabular-nums">{formatINR(run.amount)}</p>
          <p className="text-[11px] text-muted-foreground tabular-nums">
            {resolved && run.extracted ? (
              <>
                <span className="line-through">
                  {formatShortDate(run.originalDueDate)}
                </span>{" "}
                → {formatShortDate(run.extracted.newDate)}
              </>
            ) : (
              <>was due {formatShortDate(run.originalDueDate)}</>
            )}
          </p>
        </div>
      </div>

      {run.call && <CallCard key={run.call.key} call={run.call} />}

      {run.replyCountdown !== null && (
        <div className="cp-rise rounded-lg border border-border p-3">
          <p className="mb-2.5 text-xs text-muted-foreground">
            Client is replying. Record from the mic or use the sample reply.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onReply("mic")}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-foreground text-sm font-medium text-background hover:opacity-90"
            >
              <Mic className="size-4" aria-hidden /> Record
            </button>
            <button
              type="button"
              onClick={() => onReply("sample")}
              className="inline-flex h-9 items-center justify-center rounded-md border border-border text-sm font-medium hover:bg-muted"
            >
              Sample reply
            </button>
          </div>
          <p className="mt-2 text-center text-[11px] text-muted-foreground tabular-nums">
            Continues with the sample in {run.replyCountdown}s
          </p>
        </div>
      )}

      <section aria-label="Agent steps">
        <h3 className="mb-3 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
          Activity
        </h3>
        <ol className="relative">
          {STEP_ORDER.map((key, i) => {
            const s = run.steps[key];
            const last = i === STEP_ORDER.length - 1;
            return (
              <li key={key} className="relative flex gap-3 pb-4 last:pb-0">
                {!last && (
                  <span
                    className={cn(
                      "absolute top-6 bottom-0 left-[9.5px] w-px",
                      s.state === "done" ? "bg-foreground/25" : "bg-border",
                    )}
                    aria-hidden
                  />
                )}
                <StepIcon state={s.state} />
                <div className="min-w-0 flex-1 pt-px">
                  <div className="flex items-baseline justify-between gap-2">
                    <p
                      className={cn(
                        "text-sm",
                        s.state === "pending"
                          ? "text-muted-foreground"
                          : "font-medium",
                      )}
                    >
                      {STEP_LABEL[key]}
                    </p>
                    {s.at !== undefined && (
                      <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                        0:{String(s.at).padStart(2, "0")}
                      </span>
                    )}
                  </div>
                  {s.detail && s.state !== "pending" && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{s.detail}</p>
                  )}
                  {key === "extract" && run.extracted && (
                    <div className="cp-rise mt-2 flex flex-wrap gap-1.5">
                      <Chip label="Reason" value={run.extracted.reason} />
                      <Chip
                        label="New date"
                        value={formatShortDate(run.extracted.newDate)}
                        strong
                      />
                      <Chip
                        label="Confidence"
                        value={`${Math.round(run.extracted.confidence * 100)}%`}
                      />
                    </div>
                  )}
                  {key === "warn" && s.state !== "pending" && (
                    <ul className="mt-2 space-y-1">
                      {run.supplierCalls.map((c) => (
                        <li
                          key={c.entryId}
                          className="flex items-center gap-2 text-xs"
                        >
                          {c.state === "done" ? (
                            <Check className="size-3.5 text-in" aria-hidden />
                          ) : c.state === "calling" ? (
                            <Phone className="size-3.5 animate-pulse text-foreground" aria-hidden />
                          ) : (
                            <span className="grid size-3.5 place-items-center" aria-hidden>
                              <span className="size-1.5 rounded-full bg-border-strong" />
                            </span>
                          )}
                          <span className="min-w-0 flex-1 truncate">{c.party}</span>
                          <span className="text-muted-foreground tabular-nums">
                            {formatINR(c.amount)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {key === "reschedule" && run.transfers && (
                    <TransfersCard run={run} />
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {run.transcript.length > 0 && (
        <section aria-label="Call transcript">
          <h3 className="mb-3 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
            Transcript
          </h3>
          <ul className="space-y-3">
            {run.transcript.map((line) => (
              <li
                key={line.id}
                className={cn(
                  "cp-rise flex flex-col",
                  line.speaker === "party" ? "items-end" : "items-start",
                )}
              >
                <span className="mb-1 text-[11px] text-muted-foreground">
                  {line.speaker === "agent" ? `Agent → ${line.to}` : line.to}
                </span>
                <div
                  className={cn(
                    "max-w-[92%] rounded-2xl px-3 py-2 text-sm leading-snug",
                    line.speaker === "agent"
                      ? "rounded-tl-sm bg-muted"
                      : "rounded-tr-sm border border-in-line bg-in-soft",
                  )}
                  lang="hi-Latn"
                >
                  {line.text}
                  {line.translation && (
                    <span className="mt-1 block text-xs text-muted-foreground" lang="en">
                      {line.translation}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function StepIcon({ state }: { state: "pending" | "active" | "done" }) {
  if (state === "done") {
    return (
      <span className="relative z-[1] grid size-5 shrink-0 place-items-center rounded-full bg-foreground text-background">
        <Check className="size-3" strokeWidth={3} aria-hidden />
      </span>
    );
  }
  if (state === "active") {
    return (
      <span className="relative z-[1] grid size-5 shrink-0 place-items-center rounded-full border border-foreground bg-background">
        <Loader2 className="size-3 animate-spin" aria-hidden />
      </span>
    );
  }
  return (
    <span className="relative z-[1] grid size-5 shrink-0 place-items-center rounded-full border border-border bg-background">
      <span className="size-1 rounded-full bg-border-strong" />
    </span>
  );
}

function Chip({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-md border px-2 text-[11px]",
        strong ? "border-foreground bg-foreground text-background" : "border-border bg-background",
      )}
    >
      <span className={strong ? "text-background/70" : "text-muted-foreground"}>
        {label}
      </span>
      <span className="font-medium">{value}</span>
    </span>
  );
}

function TransfersCard({ run }: { run: AgentRun }) {
  const transfers = run.transfers ?? [];
  return (
    <div className="cp-rise mt-2 overflow-hidden rounded-lg border border-border">
      <div className="flex items-center justify-between bg-surface px-3 py-2">
        <span className="text-xs font-medium">Cashfree Payouts</span>
        <span className="rounded bg-risk-soft px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-risk">
          {run.transferStatus === "sent" ? "Sent · test" : "Queued · mock"}
        </span>
      </div>
      <ul className="divide-y divide-border">
        {transfers.map((t) => (
          <li key={t.transferId} className="px-3 py-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-medium">{t.beneficiary}</span>
              <span className="font-medium tabular-nums">{formatINR(t.amount)}</span>
            </div>
            <div className="mt-0.5 flex items-center justify-between gap-2 text-muted-foreground">
              <span className="font-mono text-[10.5px]">{t.transferId}</span>
              <span className="tabular-nums">{formatShortDate(t.scheduledFor)}</span>
            </div>
          </li>
        ))}
      </ul>
      <details className="group border-t border-border">
        <summary className="flex cursor-pointer list-none items-center gap-1 px-3 py-2 text-[11px] font-medium text-muted-foreground hover:text-foreground">
          <ChevronRight className="size-3.5 transition-transform group-open:rotate-90" aria-hidden />
          Request payload
        </summary>
        <pre className="max-h-56 overflow-auto bg-[#151413] px-3 py-2.5 font-mono text-[10.5px] leading-relaxed text-[#e8e6e1]">
          {JSON.stringify(
            transfers.map((t) => t.request),
            null,
            2,
          )}
        </pre>
      </details>
    </div>
  );
}

/* ------------------------------------------------------------------ call */

const MODE_LABEL: Record<ActiveCall["mode"], string> = {
  dialing: "Ringing…",
  speaking: "Agent speaking",
  listening: "Listening",
  recording: "Recording reply",
  processing: "Understanding reply",
};

function CallCard({ call }: { call: ActiveCall }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const active = call.mode === "speaking" || call.mode === "recording";

  return (
    <div className="cp-rise overflow-hidden rounded-xl bg-[#151413] text-[#f3f1ec]">
      <div className="flex items-center gap-3 px-4 pt-4">
        <span className="relative grid size-10 shrink-0 place-items-center rounded-full bg-white/10 text-sm font-semibold">
          {initials(call.name)}
          {call.mode === "dialing" && (
            <span className="absolute inset-0 animate-ping rounded-full border border-white/30" aria-hidden />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{call.name}</p>
          <p className="text-xs text-white/55 tabular-nums">
            {call.role === "client" ? "Client" : "Supplier"} · {maskPhone(call.phone)}
          </p>
        </div>
        <span className="font-mono text-xs text-white/60 tabular-nums">
          {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
        </span>
      </div>
      <div className="px-4 pt-4 pb-3">
        <Waveform active={active} tone={call.mode === "recording" ? "#5fd08a" : "#f3f1ec"} idle={call.mode === "listening"} />
        <div className="mt-3 flex items-center justify-between text-[11px]">
          <span className="flex items-center gap-1.5 text-white/75" aria-live="polite">
            {call.mode === "processing" ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : call.mode === "recording" ? (
              <Mic className="size-3.5 text-[#5fd08a]" aria-hidden />
            ) : (
              <span className="size-1.5 rounded-full bg-[#5fd08a]" aria-hidden />
            )}
            {MODE_LABEL[call.mode]}
          </span>
          <span className="text-white/40">
            {call.mode === "recording" || call.mode === "processing"
              ? "Sarvam Saarika"
              : "Sarvam Bulbul · hi-IN"}
          </span>
        </div>
      </div>
    </div>
  );
}

// Fixed heights so the bars look like speech, not noise.
const BARS = [
  0.35, 0.6, 0.45, 0.8, 0.55, 0.95, 0.7, 0.4, 0.65, 0.9, 0.5, 0.75, 0.3, 0.6,
  0.85, 0.45, 0.7, 1, 0.55, 0.4, 0.75, 0.6, 0.35, 0.8, 0.5, 0.65, 0.4, 0.55,
];

function Waveform({
  active,
  idle,
  tone,
}: {
  active: boolean;
  idle: boolean;
  tone: string;
}) {
  return (
    <div className="flex h-10 items-center justify-between" aria-hidden>
      {BARS.map((h, i) => (
        <span
          key={i}
          className={cn("w-[3px] rounded-full", active && "cp-wave-bar")}
          style={{
            height: `${active ? h * 100 : idle ? 12 + (i % 3) * 6 : 8}%`,
            backgroundColor: tone,
            opacity: active ? 0.9 : 0.3,
            animationDelay: `${(i % 7) * -0.13}s`,
            animationDuration: `${0.7 + (i % 5) * 0.12}s`,
            transition: "height 300ms ease, opacity 300ms ease",
          }}
        />
      ))}
    </div>
  );
}

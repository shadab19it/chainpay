"use client";

import {
  Check,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useChainPay, type Toast } from "@/hooks/use-chainpay";
import { API_MODE } from "@/lib/chainpay/client-api";
import { initials, MONTHS, parseISODate } from "@/lib/chainpay/format";
import { summarizeMonth } from "@/lib/chainpay/ledger";
import { DEMO_TODAY } from "@/lib/chainpay/seed";
import { cn } from "@/lib/utils";
import { AgentPanel } from "./agent-panel";
import { BrandMark } from "./brand";
import { MonthCalendar } from "./month-calendar";
import { SummaryStrip } from "./summary-strip";

const DEMO_PAYMENT_ID = "in1";

/** Screen 1 — summary strip, month calendar and the agent panel. */
export function Dashboard() {
  const chainpay = useChainPay();
  const { merchant, entries, run, toast } = chainpay;
  const today = parseISODate(DEMO_TODAY);
  const [view, setView] = useState({ y: today.y, m: today.m });
  const panelRef = useRef<HTMLElement>(null);

  const summary = summarizeMonth(
    entries,
    view.y,
    view.m,
    merchant.openingBalance,
    DEMO_TODAY,
  );
  const running = run?.status === "running";
  const demoPayment = entries.find((e) => e.id === DEMO_PAYMENT_ID);
  const canSimulate = !running && demoPayment?.status === "scheduled";

  function start(id: string) {
    setView({ y: today.y, m: today.m });
    void chainpay.startRecovery(id);
    // On small screens the panel sits below the calendar; bring it into view.
    if (window.matchMedia("(max-width: 1023px)").matches) {
      setTimeout(
        () => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
        300,
      );
    }
  }

  function shiftMonth(delta: number) {
    setView(({ y, m }) => {
      const next = m + delta;
      if (next < 1) return { y: y - 1, m: 12 };
      if (next > 12) return { y: y + 1, m: 1 };
      return { y, m: next };
    });
  }

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <BrandMark className="size-7" />
            <span className="text-[15px] font-semibold tracking-tight">ChainPay</span>
          </div>
          <span className="hidden h-5 w-px bg-border sm:block" aria-hidden />
          <div className="hidden min-w-0 sm:block">
            <p className="truncate text-sm font-medium leading-tight">{merchant.name}</p>
            <p className="truncate text-[11px] leading-tight text-muted-foreground">
              {merchant.business} · {merchant.city}
            </p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {API_MODE === "mock" && (
              <span
                className="hidden h-6 items-center rounded-full border border-dashed border-border-strong px-2 text-[11px] text-muted-foreground md:inline-flex"
                title="UI runs on seeded data and simulated calls. APIs connect later."
              >
                Demo data
              </span>
            )}
            <button
              type="button"
              onClick={() => void chainpay.reset()}
              className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <RotateCcw className="size-3.5" aria-hidden />
              <span className="hidden sm:inline">Reset</span>
            </button>
            <button
              type="button"
              disabled={!canSimulate}
              onClick={() => start(DEMO_PAYMENT_ID)}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-foreground px-3 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-35"
            >
              <Zap className="size-3.5" aria-hidden />
              <span className="hidden sm:inline">Simulate failure</span>
              <span className="sm:hidden">Fail</span>
            </button>
            <span
              className="ml-1 hidden size-8 place-items-center rounded-full bg-muted text-xs font-semibold sm:grid"
              aria-label={merchant.owner}
            >
              {initials(merchant.name)}
            </span>
          </div>
        </div>
      </header>

      <div className="grid flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(340px,390px)]">
        <main className="min-w-0 space-y-4 p-4 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Payment calendar</h1>
              <p className="text-sm text-muted-foreground">
                Every payout is linked to the payment that funds it.
              </p>
            </div>
          </div>

          <SummaryStrip summary={summary} month={view.m} today={DEMO_TODAY} />

          <section className="overflow-hidden rounded-xl border border-border bg-background">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-3 py-2.5 sm:px-4">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => shiftMonth(-1)}
                  className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <h2 className="min-w-[8.5rem] text-center text-sm font-semibold tabular-nums">
                  {MONTHS[view.m - 1]} {view.y}
                </h2>
                <button
                  type="button"
                  onClick={() => shiftMonth(1)}
                  className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Next month"
                >
                  <ChevronRight className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setView({ y: today.y, m: today.m })}
                  className="ml-1 h-8 rounded-md border border-border px-2.5 text-xs font-medium hover:bg-muted"
                >
                  Today
                </button>
              </div>
              <Legend />
            </div>
            <MonthCalendar
              year={view.y}
              month={view.m}
              today={DEMO_TODAY}
              entries={entries}
              focusId={run?.paymentId}
              canFail={!running}
              onMarkFailed={start}
            />
          </section>
          <p className="px-1 text-xs text-muted-foreground">
            Hover a block to see its chain. Click it for details.
          </p>
        </main>

        <AgentPanel
          ref={panelRef}
          merchant={merchant}
          entries={entries}
          run={run}
          onStart={start}
          onReply={chainpay.submitReply}
          onReset={() => void chainpay.reset()}
          className="border-t border-border lg:sticky lg:top-14 lg:h-[calc(100dvh-3.5rem)] lg:border-t-0 lg:border-l"
        />
      </div>

      {toast && (
        <ToastView key={toast.id} toast={toast} onDismiss={chainpay.dismissToast} />
      )}
    </div>
  );
}

function Legend() {
  const items = [
    ["bg-in", "Money in"],
    ["bg-out", "Money out"],
    ["bg-fail", "Failed"],
    ["bg-risk", "At risk"],
  ] as const;
  return (
    <ul className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs text-muted-foreground">
      {items.map(([color, label]) => (
        <li key={label} className="flex items-center gap-1.5">
          <span className={cn("h-2.5 w-[3px] rounded-full", color)} aria-hidden />
          {label}
        </li>
      ))}
    </ul>
  );
}

function ToastView({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 7000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div
      role="status"
      className="cp-rise fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-xl bg-[#151413] px-4 py-3 text-[#f3f1ec] shadow-[0_16px_40px_-12px_rgb(0_0_0/0.45)] sm:inset-x-auto sm:right-6"
    >
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#5fd08a] text-[#0d3a1e]">
        <Check className="size-4" strokeWidth={3} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{toast.title}</p>
        <p className="text-xs text-white/65">{toast.detail}</p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="grid size-7 place-items-center rounded-md text-white/60 hover:bg-white/10 hover:text-white"
        aria-label="Dismiss"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

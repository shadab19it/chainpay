"use client";

import { ArrowDownLeft, ArrowUpRight, Check, Link2, X, Zap } from "lucide-react";
import type { CSSProperties } from "react";
import {
  formatINR,
  formatLongDate,
  formatShortDate,
} from "@/lib/chainpay/format";
import { getDependents } from "@/lib/chainpay/ledger";
import { cn } from "@/lib/utils";
import type { Entry } from "@/types/chainpay";
import { entryTone, StatusBadge } from "./status";

type EntryPopoverProps = {
  entry: Entry;
  entries: Entry[];
  canFail: boolean;
  style: CSSProperties;
  onClose: () => void;
  onMarkFailed: (id: string) => void;
};

/** Screen 2 — entry details and its place in the chain. */
export function EntryPopover({
  entry,
  entries,
  canFail,
  style,
  onClose,
  onMarkFailed,
}: EntryPopoverProps) {
  const isIn = entry.type === "in";
  const Arrow = isIn ? ArrowDownLeft : ArrowUpRight;
  const dependents = isIn ? getDependents(entries, entry.id) : [];
  const funder = entry.dependsOn
    ? entries.find((e) => e.id === entry.dependsOn)
    : undefined;
  const failable = isIn && entry.status === "scheduled";

  return (
    <div
      data-cp-popover
      role="dialog"
      aria-label={`${entry.party} details`}
      style={style}
      className="cp-rise fixed z-50 rounded-xl border border-border bg-background shadow-[0_12px_40px_-12px_rgb(26_25_23/0.28),0_2px_6px_-2px_rgb(26_25_23/0.08)]"
    >
      <div className="flex items-start justify-between gap-3 px-4 pt-3.5">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <span
            className={cn(
              "grid size-5 place-items-center rounded-md",
              isIn ? "bg-in-soft text-in" : "bg-out-soft text-out",
            )}
          >
            <Arrow className="size-3.5" aria-hidden />
          </span>
          {isIn ? "Incoming payment" : "Outgoing payout"}
          {entry.role && <span className="text-muted-foreground/70">· {entry.role}</span>}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="-mr-1.5 -mt-0.5 grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="px-4 pt-2 pb-3">
        <p className="text-sm font-medium">{entry.party}</p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="text-2xl font-semibold tracking-tight tabular-nums">
            {formatINR(entry.amount)}
          </p>
          <StatusBadge entry={entry} />
        </div>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 border-t border-border px-4 py-3 text-xs">
        <dt className="text-muted-foreground">Due</dt>
        <dd className="text-right tabular-nums">
          {entry.originalDueDate && (
            <span className="mr-1.5 text-muted-foreground line-through">
              {formatShortDate(entry.originalDueDate)}
            </span>
          )}
          {formatLongDate(entry.dueDate)}
        </dd>
        <dt className="text-muted-foreground">Method</dt>
        <dd className="text-right">{entry.method}</dd>
        <dt className="text-muted-foreground">Phone</dt>
        <dd className="text-right tabular-nums">{entry.phone}</dd>
        {entry.payeeInformed && (
          <>
            <dt className="text-muted-foreground">Payee</dt>
            <dd className="flex items-center justify-end gap-1 text-in">
              <Check className="size-3.5" aria-hidden /> Informed by agent
            </dd>
          </>
        )}
      </dl>

      <div className="border-t border-border px-4 py-3">
        <p className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
          <Link2 className="size-3.5" aria-hidden />
          {isIn ? `Funds ${dependents.length} payouts` : "Funded by"}
        </p>
        <ul className="space-y-1">
          {(isIn ? dependents : funder ? [funder] : []).map((e) => (
            <ChainRow key={e.id} entry={e} />
          ))}
          {isIn && dependents.length === 0 && (
            <li className="text-xs text-muted-foreground">No payouts depend on this.</li>
          )}
        </ul>
      </div>

      {failable && (
        <div className="border-t border-border p-2">
          <button
            type="button"
            disabled={!canFail}
            onClick={() => onMarkFailed(entry.id)}
            className="flex h-9 w-full items-center justify-center gap-2 rounded-lg text-sm font-medium text-fail transition-colors hover:bg-fail-soft disabled:pointer-events-none disabled:opacity-40"
          >
            <Zap className="size-4" aria-hidden />
            Mark payment failed
          </button>
        </div>
      )}
    </div>
  );
}

function ChainRow({ entry }: { entry: Entry }) {
  const tone = entryTone(entry);
  return (
    <li className="flex items-center gap-2 text-xs">
      <span className={cn("h-4 w-[3px] rounded-full", tone.bar)} aria-hidden />
      <span className="min-w-0 flex-1 truncate">{entry.party}</span>
      <span className="text-muted-foreground tabular-nums">
        {formatShortDate(entry.dueDate)}
      </span>
      <span className="w-16 text-right font-medium tabular-nums">
        {formatINR(entry.amount)}
      </span>
    </li>
  );
}

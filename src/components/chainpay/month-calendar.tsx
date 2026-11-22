"use client";

import { ArrowDownLeft, ArrowUpRight, Check } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  formatINR,
  formatINRCompact,
  monthGrid,
  monthKey,
  parseISODate,
  WEEKDAYS,
} from "@/lib/chainpay/format";
import { getChain } from "@/lib/chainpay/ledger";
import { cn } from "@/lib/utils";
import type { Entry } from "@/types/chainpay";
import { EntryPopover } from "./entry-popover";
import { entryTone } from "./status";

type MonthCalendarProps = {
  year: number;
  month: number;
  today: string;
  entries: Entry[];
  /** Chain kept highlighted while the agent works on it. */
  focusId?: string | null;
  canFail: boolean;
  onMarkFailed: (id: string) => void;
};

type PopoverState = { id: string; left: number; top?: number; bottom?: number };
type Connector = { id: string; d: string; len: number; tone: string };

const MAX_PER_CELL = 3;
const POPOVER_W = 320;

/** F1 + F2 — month grid of money in/out with dependency links drawn between blocks. */
export function MonthCalendar({
  year,
  month,
  today,
  entries,
  focusId,
  canFail,
  onMarkFailed,
}: MonthCalendarProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef(new Map<string, HTMLElement>());

  const days = monthGrid(year, month);
  const key = monthKey(year, month);
  const byDay = new Map<string, Entry[]>();
  for (const e of entries) {
    const list = byDay.get(e.dueDate) ?? [];
    list.push(e);
    byDay.set(e.dueDate, list);
  }

  const chainSource = hoveredId ?? popover?.id ?? focusId ?? null;
  const chain = chainSource ? getChain(entries, chainSource) : null;
  const inChain = chain
    ? new Set([chain.rootId, ...chain.dependentIds])
    : null;
  const root = chain ? entries.find((e) => e.id === chain.rootId) : undefined;
  const lineTone =
    root?.status === "failed"
      ? "var(--fail)"
      : root?.status === "rescheduled"
        ? "var(--in)"
        : "var(--foreground)";
  const chainKey = chain
    ? `${chain.rootId}:${chain.dependentIds.join(",")}:${entries
        .map((e) => e.dueDate + e.status)
        .join("|")}:${key}`
    : "";

  // Measure block positions and draw curved links from the payment to its payouts.
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const compute = () => {
      if (!chain) {
        setConnectors([]);
        return;
      }
      const box = container.getBoundingClientRect();
      const from = chipRefs.current.get(chain.rootId)?.getBoundingClientRect();
      if (!from) {
        setConnectors([]);
        return;
      }
      const next: Connector[] = [];
      for (const id of chain.dependentIds) {
        const to = chipRefs.current.get(id)?.getBoundingClientRect();
        if (!to) continue;
        let d: string;
        let x2: number;
        let y2: number;
        if (to.left >= from.right - 4) {
          // Target is to the right: leave from the right edge, arrive at the left edge.
          const x1 = from.right - box.left - 4;
          const y1 = from.top + from.height / 2 - box.top;
          x2 = to.left - box.left + 4;
          y2 = to.top + to.height / 2 - box.top;
          const bend = Math.max(36, Math.abs(x2 - x1) * 0.45);
          // On the same row, arc above the blocks in between instead of cutting through them.
          const lift =
            Math.abs(y2 - y1) < 12 && x2 - x1 > 60
              ? Math.min(46, (x2 - x1) * 0.22)
              : 0;
          d = `M ${x1} ${y1} C ${x1 + bend} ${y1 - lift}, ${x2 - bend} ${y2 - lift}, ${x2} ${y2}`;
        } else {
          // Target wrapped to a later week: drop from the bottom edge to its top edge.
          const x1 = from.left + from.width / 2 - box.left;
          const y1 = from.bottom - box.top - 2;
          x2 = to.left + to.width / 2 - box.left;
          y2 = to.top - box.top + 2;
          const drop = Math.max(30, (y2 - y1) * 0.5);
          d = `M ${x1} ${y1} C ${x1} ${y1 + drop}, ${x2} ${y2 - drop}, ${x2} ${y2}`;
        }
        next.push({
          id,
          d,
          len: 2000,
          tone: lineTone,
        });
      }
      setConnectors(next);
    };
    const frame = requestAnimationFrame(compute);
    const observer = new ResizeObserver(() => requestAnimationFrame(compute));
    observer.observe(container);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
    // chainKey captures everything that moves a block.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chainKey]);

  // Close the popover on Escape or a click elsewhere.
  useEffect(() => {
    if (!popover) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPopover(null);
    const onDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-cp-popover],[data-cp-chip]")) setPopover(null);
    };
    // The popover is fixed to the viewport, so close it rather than let it drift.
    const onScroll = () => setPopover(null);
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [popover]);

  function openPopover(id: string, el: HTMLElement) {
    if (popover?.id === id) {
      setPopover(null);
      return;
    }
    // Viewport coordinates: the popover is position: fixed so no card can clip it.
    const r = el.getBoundingClientRect();
    const x = Math.max(
      8,
      Math.min(r.left, window.innerWidth - POPOVER_W - 8),
    );
    const room = 380;
    const above = r.bottom + room > window.innerHeight && r.top > room;
    setPopover(
      above
        ? { id, left: x, bottom: window.innerHeight - r.top + 6 }
        : { id, left: x, top: r.bottom + 6 },
    );
  }

  const popoverEntry = popover
    ? entries.find((e) => e.id === popover.id)
    : undefined;

  return (
    <div ref={containerRef} className="relative">
      <div className="grid grid-cols-7 border-b border-border">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="px-2 py-2 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground sm:px-3"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((date, i) => {
          const inMonth = date.startsWith(key);
          const isToday = date === today;
          const list = (byDay.get(date) ?? []).toSorted(
            (a, b) =>
              (a.type === "in" ? 0 : 1) - (b.type === "in" ? 0 : 1) ||
              b.amount - a.amount,
          );
          const visible = list.slice(0, MAX_PER_CELL);
          const hidden = list.length - visible.length;
          const { d } = parseISODate(date);
          return (
            <div
              key={date}
              className={cn(
                "relative min-h-[84px] border-border p-1 sm:min-h-[118px] sm:p-1.5",
                i % 7 !== 6 && "border-r",
                i < days.length - 7 && "border-b",
                !inMonth &&
                  "bg-[repeating-linear-gradient(135deg,transparent_0_6px,var(--muted)_6px_7px)]",
                date < today && inMonth && "bg-surface/60",
              )}
            >
              <div className="mb-1 flex items-center justify-between px-1 pt-0.5">
                <span
                  className={cn(
                    "grid h-6 min-w-6 place-items-center rounded-full px-1 text-xs tabular-nums",
                    inMonth ? "text-foreground" : "text-muted-foreground/60",
                    isToday && "bg-foreground font-semibold text-background",
                  )}
                  aria-current={isToday ? "date" : undefined}
                >
                  {d}
                </span>
                {isToday && (
                  <span className="hidden text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground sm:inline">
                    Today
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-1">
                {visible.map((entry) => (
                  <EntryBlock
                    key={entry.id}
                    entry={entry}
                    dimmed={inChain ? !inChain.has(entry.id) : false}
                    selected={popover?.id === entry.id}
                    registerRef={(el) => {
                      if (el) chipRefs.current.set(entry.id, el);
                      else chipRefs.current.delete(entry.id);
                    }}
                    onHover={setHoveredId}
                    onOpen={openPopover}
                  />
                ))}
                {hidden > 0 && (
                  <span className="px-1.5 text-[11px] text-muted-foreground">
                    +{hidden} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <svg
        className="pointer-events-none absolute inset-0 z-10 size-full overflow-visible"
        aria-hidden
      >
        {connectors.map((c) => (
          <g key={c.id + c.d}>
            <path
              d={c.d}
              fill="none"
              stroke={c.tone}
              strokeOpacity="0.55"
              strokeWidth="1.5"
              strokeLinecap="round"
              className="cp-draw"
              style={{ ["--len" as string]: c.len }}
            />
            <circle
              cx={c.d.split(" ").at(-2)}
              cy={c.d.split(" ").at(-1)}
              r="2.5"
              fill={c.tone}
              className="cp-rise"
            />
          </g>
        ))}
      </svg>

      {popover && popoverEntry && (
        <EntryPopover
          entry={popoverEntry}
          entries={entries}
          canFail={canFail}
          style={{
            left: popover.left,
            top: popover.top,
            bottom: popover.bottom,
            width: POPOVER_W,
          }}
          onClose={() => setPopover(null)}
          onMarkFailed={(id) => {
            setPopover(null);
            onMarkFailed(id);
          }}
        />
      )}
    </div>
  );
}

type EntryBlockProps = {
  entry: Entry;
  dimmed: boolean;
  selected: boolean;
  registerRef: (el: HTMLButtonElement | null) => void;
  onHover: (id: string | null) => void;
  onOpen: (id: string, el: HTMLElement) => void;
};

function EntryBlock({
  entry,
  dimmed,
  selected,
  registerRef,
  onHover,
  onOpen,
}: EntryBlockProps) {
  const tone = entryTone(entry);
  const Arrow = entry.type === "in" ? ArrowDownLeft : ArrowUpRight;
  return (
    <button
      ref={registerRef}
      type="button"
      data-cp-chip
      onPointerEnter={() => onHover(entry.id)}
      onPointerLeave={() => onHover(null)}
      onFocus={() => onHover(entry.id)}
      onBlur={() => onHover(null)}
      onClick={(e) => onOpen(entry.id, e.currentTarget)}
      aria-label={`${entry.type === "in" ? "Incoming from" : "Payout to"} ${entry.party}, ${formatINR(entry.amount)}${tone.tag ? `, ${tone.tag}` : ""}`}
      style={{ viewTransitionName: `entry-${entry.id}` }}
      className={cn(
        "group relative w-full rounded-md border py-1 pr-1.5 pl-2.5 text-left transition-[opacity,box-shadow,transform] duration-200",
        "hover:-translate-y-px hover:shadow-[0_2px_8px_-2px_rgb(26_25_23/0.18)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-foreground",
        tone.box,
        dimmed && "opacity-35",
        selected && "ring-2 ring-foreground/80 ring-offset-1",
      )}
    >
      <span
        className={cn("absolute inset-y-1 left-1 w-[3px] rounded-full", tone.bar)}
        aria-hidden
      />
      <span className="hidden items-center gap-1 sm:flex">
        <Arrow className={cn("size-3 shrink-0", tone.text)} aria-hidden />
        <span className="truncate text-xs font-medium">{entry.shortName}</span>
      </span>
      <span className="flex items-center justify-between gap-1">
        <span className="text-[11px] font-semibold tabular-nums sm:text-xs">
          <span className="sm:hidden">{formatINRCompact(entry.amount)}</span>
          <span className="hidden sm:inline">{formatINR(entry.amount)}</span>
        </span>
        {tone.tag && (
          <span
            className={cn(
              "hidden items-center gap-0.5 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.04em] xl:inline-flex",
              tone.text,
            )}
          >
            {entry.payeeInformed && <Check className="size-3" aria-hidden />}
            {entry.payeeInformed && entry.status !== "rescheduled"
              ? "Informed"
              : tone.tag}
          </span>
        )}
      </span>
    </button>
  );
}

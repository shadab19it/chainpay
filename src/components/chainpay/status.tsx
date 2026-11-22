import { cn } from "@/lib/utils";
import type { Entry } from "@/types/chainpay";

/** Visual tone for one ledger entry, shared by calendar blocks, the popover and the agent panel. */
export function entryTone(entry: Entry) {
  if (entry.status === "failed") {
    return {
      box: "bg-fail-soft border-fail-line text-[#5c1215]",
      bar: "bg-fail",
      text: "text-fail",
      tag: "Failed",
    };
  }
  if (entry.status === "at_risk") {
    return {
      box: "bg-risk-soft border-risk-line text-[#4d3000] cp-risk",
      bar: "bg-risk",
      text: "text-risk",
      tag: "At risk",
    };
  }
  if (entry.type === "in") {
    if (entry.status === "paid") {
      return {
        box: "bg-in-soft/70 border-transparent text-[#0d3a1e]/70",
        bar: "bg-in/50",
        text: "text-in",
        tag: "Received",
      };
    }
    if (entry.status === "rescheduled") {
      return {
        box: "bg-in-soft border-in-line border-dashed text-[#0d3a1e]",
        bar: "bg-in",
        text: "text-in",
        tag: "Promised",
      };
    }
    return {
      box: "bg-in-soft border-transparent text-[#0d3a1e]",
      bar: "bg-in",
      text: "text-in",
      tag: null,
    };
  }
  if (entry.status === "paid") {
    return {
      box: "bg-muted border-transparent text-muted-foreground",
      bar: "bg-border-strong",
      text: "text-muted-foreground",
      tag: "Paid",
    };
  }
  if (entry.status === "rescheduled") {
    return {
      box: "bg-out-soft border-out-line text-[#4a1d03]",
      bar: "bg-out",
      text: "text-out",
      tag: "Moved",
    };
  }
  return {
    box: "bg-out-soft border-transparent text-[#4a1d03]",
    bar: "bg-out",
    text: "text-out",
    tag: null,
  };
}

const STATUS_LABEL: Record<Entry["status"], string> = {
  scheduled: "Scheduled",
  failed: "Failed",
  at_risk: "At risk",
  rescheduled: "Rescheduled",
  paid: "Paid",
};

export function StatusBadge({
  entry,
  className,
}: {
  entry: Entry;
  className?: string;
}) {
  const styles: Record<Entry["status"], string> = {
    scheduled: "bg-muted text-muted-foreground",
    failed: "bg-fail-soft text-fail",
    at_risk: "bg-risk-soft text-risk",
    rescheduled:
      entry.type === "in" ? "bg-in-soft text-in" : "bg-out-soft text-out",
    paid: "bg-in-soft text-in",
  };
  const label =
    entry.type === "in" && entry.status === "paid"
      ? "Received"
      : entry.type === "in" && entry.status === "rescheduled"
        ? "Promised"
        : STATUS_LABEL[entry.status];
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1 rounded px-1.5 text-[11px] font-medium",
        styles[entry.status],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {label}
    </span>
  );
}

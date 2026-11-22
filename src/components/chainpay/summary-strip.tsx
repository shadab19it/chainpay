import { ArrowDownLeft, ArrowUpRight, TriangleAlert, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { formatINR, formatShortDate, MONTHS } from "@/lib/chainpay/format";
import type { BalancePoint, MonthSummary } from "@/lib/chainpay/ledger";
import { cn } from "@/lib/utils";

type SummaryStripProps = {
  summary: MonthSummary;
  month: number;
  today: string;
};

/** F8 — cash flow for the visible month. */
export function SummaryStrip({ summary, month, today }: SummaryStripProps) {
  const monthName = MONTHS[month - 1].slice(0, 3);
  const short = summary.low.balance < 0;

  return (
    <section
      aria-label="Cash flow summary"
      className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3 xl:grid-cols-[1fr_1fr_1fr_1.35fr]"
    >
      <Stat
        icon={<ArrowDownLeft className="size-3.5" />}
        iconClass="bg-in-soft text-in"
        label={`Incoming · ${monthName}`}
        value={formatINR(summary.incoming)}
        sub={`${summary.incomingCount} payments · ${formatINR(summary.received)} received`}
      />
      <Stat
        icon={<ArrowUpRight className="size-3.5" />}
        iconClass="bg-out-soft text-out"
        label={`Outgoing · ${monthName}`}
        value={formatINR(summary.outgoing)}
        sub={`${summary.outgoingCount} payouts to suppliers`}
      />
      <Stat
        icon={<TriangleAlert className="size-3.5" />}
        iconClass={
          summary.atRisk > 0 ? "bg-risk-soft text-risk" : "bg-muted text-muted-foreground"
        }
        label="At risk"
        className="col-span-2 sm:col-span-1"
        value={formatINR(summary.atRisk)}
        valueClass={summary.atRisk > 0 ? "text-risk" : undefined}
        sub={
          summary.atRisk > 0
            ? `${summary.atRiskCount} payouts waiting on a failed payment`
            : "Every payout is funded"
        }
      />
      <div className="col-span-2 flex items-center gap-4 bg-background px-4 py-3.5 sm:col-span-3 xl:col-span-1">
        <div className="min-w-0 flex-1">
          <Label
            icon={<Wallet className="size-3.5" />}
            iconClass={short ? "bg-fail-soft text-fail" : "bg-muted text-foreground"}
          >
            Projected low point
          </Label>
          <p
            className={cn(
              "mt-2 text-xl font-semibold tracking-tight tabular-nums transition-colors",
              short && "text-fail",
            )}
          >
            {formatINR(summary.low.balance)}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {short
              ? `Short on ${formatShortDate(summary.low.date)} — payouts can bounce`
              : `On ${formatShortDate(summary.low.date)}, from today onward`}
          </p>
        </div>
        <Sparkline series={summary.series} today={today} danger={short} />
      </div>
    </section>
  );
}

function Label({
  icon,
  iconClass,
  children,
}: {
  icon: ReactNode;
  iconClass: string;
  children: ReactNode;
}) {
  return (
    <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
      <span
        className={cn(
          "grid size-5 place-items-center rounded-md transition-colors",
          iconClass,
        )}
        aria-hidden
      >
        {icon}
      </span>
      {children}
    </p>
  );
}

function Stat({
  icon,
  iconClass,
  label,
  value,
  valueClass,
  sub,
  className,
}: {
  icon: ReactNode;
  iconClass: string;
  label: string;
  value: string;
  valueClass?: string;
  sub: string;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 bg-background px-4 py-3.5", className)}>
      <Label icon={icon} iconClass={iconClass}>
        {label}
      </Label>
      <p
        className={cn(
          "mt-2 text-xl font-semibold tracking-tight tabular-nums transition-colors",
          valueClass,
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

/** Day-by-day projected balance for the month, with a zero line and a "today" tick. */
function Sparkline({
  series,
  today,
  danger,
}: {
  series: BalancePoint[];
  today: string;
  danger: boolean;
}) {
  const W = 148;
  const H = 44;
  const values = series.map((p) => p.balance);
  const min = Math.min(0, ...values);
  const max = Math.max(...values, 1);
  const x = (i: number) => (i / (series.length - 1)) * W;
  const y = (v: number) => H - 3 - ((v - min) / (max - min)) * (H - 6);

  // Step line: balance changes on a day and holds until the next change.
  let d = `M 0 ${y(values[0])}`;
  values.forEach((v, i) => {
    if (i === 0) return;
    d += ` H ${x(i)} V ${y(v)}`;
  });
  const todayIndex = series.findIndex((p) => p.date === today);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-11 w-[148px] shrink-0 overflow-visible"
      role="img"
      aria-label="Projected balance for the month"
    >
      <line
        x1="0"
        x2={W}
        y1={y(0)}
        y2={y(0)}
        stroke="var(--border-strong)"
        strokeDasharray="2 3"
      />
      {todayIndex >= 0 && (
        <line
          x1={x(todayIndex)}
          x2={x(todayIndex)}
          y1="0"
          y2={H}
          stroke="var(--border-strong)"
        />
      )}
      <path
        d={d}
        fill="none"
        stroke={danger ? "var(--fail)" : "var(--foreground)"}
        strokeWidth="1.6"
        strokeLinejoin="round"
        className="transition-[stroke] duration-500"
      />
    </svg>
  );
}

/** Formatting and date helpers. Dates are plain ISO strings (YYYY-MM-DD) to avoid timezone drift. */

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/** ₹1,05,000 (Indian digit grouping). */
export function formatINR(amount: number): string {
  return inr.format(amount);
}

/** ₹48k / ₹1.05L — for tight calendar cells. */
export function formatINRCompact(amount: number): string {
  const sign = amount < 0 ? "−" : "";
  const abs = Math.abs(amount);
  const trim = (n: number) => String(Number(n.toFixed(2)));
  if (abs >= 100000) return `${sign}₹${trim(abs / 100000)}L`;
  if (abs >= 1000) return `${sign}₹${trim(abs / 1000)}k`;
  return `${sign}₹${abs}`;
}

export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function parseISODate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
}

export function toISODate(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function utc(iso: string): Date {
  const { y, m, d } = parseISODate(iso);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDays(iso: string, days: number): string {
  const date = utc(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return toISODate(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
  );
}

/** "24 Nov" */
export function formatShortDate(iso: string): string {
  const { m, d } = parseISODate(iso);
  return `${d} ${MONTHS[m - 1].slice(0, 3)}`;
}

/** "Tue, 24 Nov 2026" */
export function formatLongDate(iso: string): string {
  const { y, m, d } = parseISODate(iso);
  return `${WEEKDAYS[utc(iso).getUTCDay()]}, ${d} ${MONTHS[m - 1].slice(0, 3)} ${y}`;
}

/** "2026-11" */
export function monthKey(y: number, m: number): string {
  return `${y}-${String(m).padStart(2, "0")}`;
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** All dates shown in a Sunday-first month grid, including leading/trailing days. */
export function monthGrid(y: number, m: number): string[] {
  const first = toISODate(y, m, 1);
  const lead = utc(first).getUTCDay();
  const total = Math.ceil((lead + daysInMonth(y, m)) / 7) * 7;
  return Array.from({ length: total }, (_, i) => addDays(first, i - lead));
}

/** "+91 98260 14521" -> "+91 98••• ••521" */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "").slice(-10);
  return `+91 ${digits.slice(0, 2)}••• ••${digits.slice(-3)}`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

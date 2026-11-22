/** ChainPay mark: two interlocking links, one green (money in), one orange (money out). */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" className={className} aria-hidden>
      <rect width="28" height="28" rx="7" fill="#1a1917" />
      <rect
        x="5"
        y="10"
        width="11"
        height="8"
        rx="4"
        fill="none"
        stroke="#5fd08a"
        strokeWidth="2.2"
      />
      <rect
        x="12"
        y="10"
        width="11"
        height="8"
        rx="4"
        fill="none"
        stroke="#f59a5b"
        strokeWidth="2.2"
      />
    </svg>
  );
}

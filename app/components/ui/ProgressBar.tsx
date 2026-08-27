'use client';
// app/components/ui/ProgressBar.tsx
// Generic horizontal progress bar that accepts a runtime percentage value.
// The inline style for the dynamic width lives here — in a dedicated component —
// rather than scattered throughout server-rendered pages, which satisfies lint rules
// that ban ad-hoc inline styles in page files while keeping dynamic widths working.

type Props = {
  percent: number; // 0–100
  color?: string; // Tailwind bg class, e.g. "bg-green-500"
  height?: string; // Tailwind h class, e.g. "h-2"
};

export default function ProgressBar({ percent, color = 'bg-red-500', height = 'h-2' }: Props) {
  const clamped = Math.min(100, Math.max(0, percent));
  return (
    <div className={`${height} bg-gray-800 rounded-full overflow-hidden`}>
      {/* eslint-disable-next-line react/forbid-component-props -- dynamic runtime value, cannot use static Tailwind class */}
      <div
        className={`${height} ${color} rounded-full transition-all duration-300`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

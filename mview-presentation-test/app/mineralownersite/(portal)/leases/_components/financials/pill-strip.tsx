"use client";

import type { ReactNode } from "react";

/**
 * A ROW OF PILLS WHERE ONE IS CHOSEN — the Financials panel uses two of them.
 *
 * THE TWO TONES ARE NOT DECORATION, THEY ARE DEPTH. The scope switch (Full
 * lease / Your share) is green, matching the module tab strip directly above
 * it, because it changes what the WHOLE PANEL is about. The chart's own strip
 * (Oil & gas / Gas only / Oil only / Cash flow) is near-black, because it only
 * changes what one card draws. Two green strips stacked read as two equals and
 * leave a reader unsure which one they are inside.
 *
 * A `role="group"` of `aria-pressed` buttons rather than a tablist: these
 * redraw a panel in place, they do not switch between panels, and claiming
 * `role="tab"` without a matching `tabpanel` misreports the structure to a
 * screen reader. The module's real tabs — the ones with panels — are in
 * `leases-tabs.tsx`.
 */

export interface PillOption<T extends string> {
  value: T;
  label: ReactNode;
}

const TONES = {
  green: "border-mv-green-deep bg-mv-green-deep text-white",
  dark: "border-mv-ink bg-mv-ink text-white",
} as const;

export function PillStrip<T extends string>({
  label,
  options,
  value,
  onChange,
  tone = "green",
  className = "",
}: {
  /** Announced to screen readers; never rendered. */
  label: string;
  options: PillOption<T>[];
  value: T;
  onChange: (next: T) => void;
  tone?: keyof typeof TONES;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={`flex flex-wrap gap-1.5 ${className}`.trim()}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={`cursor-pointer rounded-full border px-[15px] py-[7px] text-[13px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep ${
              selected
                ? TONES[tone]
                : "border-mv-line bg-mv-card text-mv-slate hover:bg-mv-bg"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

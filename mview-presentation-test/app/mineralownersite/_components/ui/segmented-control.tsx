import type { ReactNode } from "react";

/**
 * A SEGMENTED CONTROL — `portal.css`'s `.view-switch`, generalised.
 *
 * The portal already has one of these for the four density tiers; My Leases
 * needs another for List / Grid. Same look, so it is one component with the
 * options passed in rather than a second copy of the pill geometry.
 *
 * WHY NOT shadcn's ToggleGroup (Radix). A segmented control with two options is
 * a set of buttons where one is pressed. `aria-pressed` on a `<button>` says
 * exactly that, in one attribute, and is announced correctly by every screen
 * reader; Radix ToggleGroup would add a dependency and a roving-focus model to
 * the same two buttons. Radix earns its place in `tabs.tsx` because tabs carry a
 * real relationship between a strip and its panels — this does not.
 *
 * `role="group"` with a label is what ties the two buttons together, so a screen
 * reader announces "Lease layout, List, pressed" rather than a bare "List".
 */

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
}

export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  className = "",
}: {
  /** Announced to screen readers; never rendered. */
  label: string;
  options: SegmentedOption<T>[];
  value: T;
  onChange: (next: T) => void;
  className?: string;
}) {
  return (
    <span
      role="group"
      aria-label={label}
      className={`inline-flex gap-0.5 rounded-[10px] bg-mv-portal-wash p-[3px] ${className}`.trim()}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={`cursor-pointer rounded-lg border-0 px-3 py-1.5 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep ${
              selected
                ? "bg-mv-card text-mv-ink shadow-mv"
                : "bg-transparent text-mv-slate hover:text-mv-ink"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </span>
  );
}

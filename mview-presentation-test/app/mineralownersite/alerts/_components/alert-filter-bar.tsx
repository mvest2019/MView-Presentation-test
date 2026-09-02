"use client";

import { alertFilters, type AlertFilter } from "../_lib/alert-filters";

/**
 * THE FIVE FILTER PILLS — `.al-filter`.
 *
 * ── THE COUNTS ARE NOT TYPED HERE, AND THAT IS THE POINT ──
 *
 * `alertFilters` reads them from `alertCounts`, which counts `alertRecords`. The
 * reference typed "All · 9" into the markup and then had to add JavaScript to
 * correct it at runtime once the same numbers appeared in the watch ledger below
 * (v50 · BG-03). There is nothing to correct here because there is only one
 * source.
 *
 * ── WHY BUTTONS AND NOT THE PORTAL'S `SegmentedControl` ──
 *
 * A segmented control is one choice out of a small fixed set, styled as a single
 * grouped object — the density switch, List/Grid. This row is five pills that
 * WRAP onto a second line on a phone, each carrying its own count, and the
 * design draws them as separate rounded buttons rather than as one strip. Forcing
 * them through the segmented control would mean rewriting its geometry to look
 * like something else.
 *
 * `aria-pressed` still carries the state, which is what a screen reader needs,
 * and `role="group"` with a label is what ties the five together.
 *
 * ── IT IS `hide-s`: NO FILTER ROW IN ESSENTIALS ──
 *
 * The plain-English tier gets the nine alerts and the one-line summary above
 * them. Nine is a list you read, not a list you query, and the filter row is the
 * first thing that makes an inbox feel like software. The gate is on the caller
 * so the search box and this row are hidden by the same decision — see
 * `alert-inbox.tsx`.
 */
export function AlertFilterBar({
  value,
  onChange,
}: {
  value: AlertFilter;
  onChange: (next: AlertFilter) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Filter alerts"
      className="my-3 flex flex-wrap gap-1.5"
    >
      {alertFilters.map((filter) => {
        const active = filter.value === value;
        return (
          <button
            key={filter.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(filter.value)}
            className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep ${
              active
                ? "border-mv-green bg-mv-mint text-mv-green-ink"
                : "border-mv-line bg-mv-card text-mv-slate hover:bg-mv-bg"
            }`}
          >
            {filter.label} · <span className="tabular-nums">{filter.count}</span>
          </button>
        );
      })}
    </div>
  );
}

"use client";

/**
 * 2 YR · 5 YR · 10 YR · ALL — shortcuts for the brush beside them.
 *
 * ── EVERY PRESET IS CENTRED ON THE LAST FILING, NOT ON THE END OF THE RECORD ──
 *
 * "Five years" of a record that runs to 2030 could mean the last five filed
 * years or the next five modelled ones, and either reading leaves out the thing
 * the chart is for: the handover between them. So a preset puts just under half
 * its months behind the last filing and the rest in front, which is what makes
 * "2 yr" show a year of filings against a year of forecast rather than two
 * years of one of them.
 *
 * ── THE ACTIVE PRESET IS DERIVED, NEVER STORED ──
 *
 * The window can also be set by dragging, and most drags land on a width no
 * preset has. Holding "which preset is selected" in its own state would leave
 * a button looking pressed while the brush showed something else; comparing
 * widths means the row goes quiet the moment a drag makes it untrue, which is
 * the honest answer — the default 49-month window matches none of them either.
 */

export interface MonthWindow {
  from: number;
  to: number;
}

const PRESETS: { label: string; months: number | "all" }[] = [
  { label: "2 yr", months: 24 },
  { label: "5 yr", months: 60 },
  { label: "10 yr", months: 120 },
  { label: "All", months: "all" },
];

/**
 * A window of `months`, sat astride `lastPostedIndex` and clamped to the record.
 *
 * The 0.48 is the "just under half" above: it is what places the default
 * 49-month window at July 2024 to July 2028, with twenty-three filed months
 * before the join and twenty-five modelled ones after it.
 */
export function windowAround(
  months: number,
  lastPostedIndex: number,
  length: number,
): MonthWindow {
  const span = Math.min(months, length) - 1;
  const behind = Math.round(span * 0.48);
  /* Clamped as a PAIR, so a window that runs off either end slides back inside
     rather than being squashed — asking for ten years and getting six because
     the record ended is not what the button says. */
  const from = Math.max(0, Math.min(lastPostedIndex - behind, length - 1 - span));
  return { from, to: from + span };
}

export function RangePresets({
  months,
  lastPostedIndex,
  length,
  onChange,
}: {
  /** How many months are showing now — decides which button reads as pressed. */
  months: number;
  lastPostedIndex: number;
  length: number;
  onChange: (next: MonthWindow) => void;
}) {
  return (
    <div
      role="group"
      aria-label="How much of the record to show"
      className="flex flex-wrap gap-1.5"
    >
      {PRESETS.map((preset) => {
        const width = preset.months === "all" ? length : preset.months;
        const selected = months === Math.min(width, length);
        return (
          <button
            key={preset.label}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(windowAround(width, lastPostedIndex, length))}
            className={`cursor-pointer rounded-lg border px-[11px] py-[5px] text-[11.5px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep ${
              selected
                ? "border-mv-green-deep bg-mv-green-deep text-white"
                : "border-mv-line bg-mv-card text-mv-slate hover:bg-mv-bg"
            }`}
          >
            {preset.label}
          </button>
        );
      })}
    </div>
  );
}

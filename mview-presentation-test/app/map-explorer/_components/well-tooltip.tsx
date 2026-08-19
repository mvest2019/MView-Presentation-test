"use client";

import { edgeClamped } from "./tooltip-edge";

/*
 * The card that appears over an individual well on hover.
 *
 * Same rules as the cluster card: `pointer-events-none`, so it cannot steal
 * the hover from the mark it describes, and it flips below the well when the
 * top of the map is too close for it to fit above.
 */

export type HoveredWell = {
  api: string;
  lease: string;
  well: string;
  operator: string;
  status: string;
  wtype: string;
  county: string;
  /** Which filing the row came from — "Permit", "Completion". */
  recordType?: string;
  /** Where the well is, so a click can ring the well and not the cursor. */
  lon: number;
  lat: number;
  /** Screen position of the well, in view-container pixels. */
  x: number;
  y: number;
};

/** Roughly the card's height, for deciding which side of the well it goes on. */
const CARD_HEIGHT = 150;

/** The card's own width, for holding it inside the map near the edges. */
const CARD_WIDTH = 236;

export function WellTooltip({ well }: { well: HoveredWell }) {
  const below = well.y < CARD_HEIGHT;
  const { left, tail } = edgeClamped(well.x, CARD_WIDTH);

  return (
    <div
      role="tooltip"
      className={`pointer-events-none absolute z-30 w-[236px] -translate-x-1/2 ${
        below ? "" : "-translate-y-full"
      }`}
      style={{ left, top: below ? well.y + 14 : well.y - 12 }}
    >
      <div className="overflow-hidden rounded-xl border border-mv-line bg-white shadow-mv-lg">
        <div className="bg-[#f4faf6] px-[14px] pb-[9px] pt-[9px]">
          <div className="truncate text-[12.5px] font-bold leading-tight text-mv-ink">
            {well.lease}
          </div>
          <div className="mt-[5px] font-mono text-[11px] leading-none text-mv-muted">
            {well.api}
          </div>
        </div>

        <dl className="px-[14px] py-[9px] text-[11.5px] leading-none">
          <Row label="Well" value={well.well} />
          <Row label="Operator" value={well.operator} />
          <Row label="Status" value={well.status} />
          <Row label="Type" value={well.wtype} />
          <Row label="County" value={well.county} />
          <Row label="Record" value={well.recordType ?? ""} />
        </dl>
      </div>

      <span
        aria-hidden="true"
        style={{ left: tail }}
        className={`absolute h-[9px] w-[9px] -translate-x-1/2 -translate-y-[5px] rotate-45 border-mv-line ${
          below
            ? "top-0 border-l border-t bg-[#f4faf6]"
            : "top-full border-b border-r bg-white"
        }`}
      />
    </div>
  );
}

/** Label left, value right — truncated, because operator names run long. */
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-3 py-[4px]">
      <dt className="shrink-0 text-mv-muted">{label}</dt>
      <dd className="min-w-0 flex-1 truncate text-right font-semibold text-mv-ink">
        {value || "—"}
      </dd>
    </div>
  );
}

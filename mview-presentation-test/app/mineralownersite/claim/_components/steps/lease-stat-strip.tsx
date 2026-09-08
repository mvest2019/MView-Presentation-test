import { Building2, Droplet, FileText, PauseCircle } from "lucide-react";

import { claimTotals } from "../../_lib/claim-totals";

/**
 * THE FOUR-TILE SUMMARY under step 4's table.
 *
 * EVERY FIGURE COMES FROM `claimTotals`, which derives them from the same array
 * the table above prints — see the note in `_lib/claim-totals.ts` for what that
 * prevents. Nothing here is typed as a literal.
 *
 * ── WHAT WAS REMOVED, AND WHERE IT WENT ──
 *
 * Two tiles and a summary row came out at the design's request: the Counties
 * tile, the Total value tile, and the bar beneath them that carried the
 * producing percentage, the combined decimal interest and the "modeled
 * MVestimates — not an appraisal" line.
 *
 * The four that remain are counts of things, which is what a summary strip is
 * good at. Three of the removed figures are still on the page — the county is
 * in the step heading and in every table row, the per-lease values are the
 * table's Value column, and the producing/inactive split is two of the tiles
 * below. The two that are NOT anywhere on this step now are the portfolio TOTAL
 * and the estimate qualifier that used to sit beside it.
 */
const TILES = [
  { icon: FileText, value: String(claimTotals.count), label: "Total leases", sub: "joined" },
  { icon: Droplet, value: String(claimTotals.producing), label: "Producing", sub: "with volumes" },
  { icon: PauseCircle, value: String(claimTotals.inactive), label: "Inactive", sub: "still owned" },
  { icon: Building2, value: String(claimTotals.operators), label: "Operators", sub: "on record" },
];

export function LeaseStatStrip() {
  return (
    /* THE SEPARATORS ARE THE GRID'S OWN BACKGROUND showing through 1px gaps,
       not borders on the tiles. With the bar row gone the tiles are the last
       thing in the card, and a `border-b` on the final row would have doubled
       up against the card's own edge — while a `border-r` on the last tile of a
       wrapped row would have drawn a stray line down the right edge on a phone.
       A gap-px grid over a tinted ground has neither problem at any column
       count, so the two-column phone layout needs no special-casing. */
    <section
      className="overflow-hidden rounded-mv border border-mv-line"
      aria-label="Lease set summary"
    >
      <div className="grid grid-cols-2 gap-px bg-mv-line @[420px]:grid-cols-4">
        {TILES.map((tile) => (
          <div key={tile.label} className="bg-mv-card px-3 py-[10px]">
            <p className="flex items-center gap-[5px] text-[15px] font-extrabold text-mv-ink">
              <tile.icon
                aria-hidden="true"
                className="h-[13px] w-[13px] flex-none text-mv-muted"
              />
              {tile.value}
            </p>
            <p className="mt-[2px] text-[11px] font-semibold text-mv-slate">
              {tile.label}
            </p>
            <p className="text-[10.5px] leading-[1.3] text-mv-muted">{tile.sub}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

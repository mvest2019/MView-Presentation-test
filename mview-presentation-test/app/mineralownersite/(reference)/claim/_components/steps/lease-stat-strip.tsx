import { Building2, Droplet, FileText, PauseCircle } from "lucide-react";

import { leaseTotals } from "../../_lib/claim-format";
import type { FlowLease } from "../../_lib/claim-types";

/**
 * THE FOUR-TILE SUMMARY — now ABOVE step 4's table, not under it.
 *
 * ── WHY IT MOVED ──
 *
 * It is the answer to "how big is this claim", and that is the question a
 * reader has BEFORE they start reading rows, not after. Under a table capped at
 * 440px with its own scrollbar it was also easy to miss entirely: the eye that
 * reaches the bottom of a scrolling table has usually already decided.
 *
 * Above it, the four figures frame the table — you know it is eight leases
 * across four operators before the first row, and the rows are then detail
 * rather than a tally to keep in your head.
 *
 * ── EVERY FIGURE COMES FROM THE ROWS ON SCREEN ──
 *
 * `leaseTotals` counts the same array the table prints, so a tile cannot
 * disagree with it.
 *
 * ── EACH TILE IS ONE LINE ──
 *
 * Icon, name, figure. The figure used to sit above its own label, which made
 * four tiles read as eight rows and gave a summary strip more vertical weight
 * than the table it summarises.
 *
 * ── ONE TILE IS COLOURED AND THREE ARE NOT ──
 *
 * "With value" is the only figure that is good news rather than a measurement,
 * and it is the one an owner looks for. Colouring all four would make the strip
 * a stripe of chips with no emphasis anywhere; colouring none made it a row of
 * grey numbers. The rest stay neutral so that one reads.
 *
 * The separators are the container's background showing through 1px gaps rather
 * than borders on the tiles — a `border-r` on the last tile of a wrapped row
 * draws a stray line down the right edge on a narrow column.
 */
export function LeaseStatStrip({ leases }: { leases: FlowLease[] }) {
  const totals = leaseTotals(leases);

  /* TWO LINES PER TILE, NOT THREE. Each carried a third caption — "joined",
     "on the roll", "still owned", "on record" — that only restated its label in
     other words, and at 10.5px under a 15px figure it read as an artefact
     rather than a sentence. The figure and its name are the whole tile. */
  const tiles = [
    {
      icon: FileText,
      value: totals.count,
      label: "Total leases",
      tone: "bg-mv-portal-wash text-mv-slate",
    },
    {
      icon: Droplet,
      value: totals.producing,
      label: "With value",
      tone: "bg-mv-mint text-mv-green-deep",
    },
    {
      icon: PauseCircle,
      value: totals.inactive,
      label: "No value",
      tone: "bg-mv-portal-wash text-mv-muted",
    },
    {
      icon: Building2,
      value: totals.operators,
      label: "Operators",
      tone: "bg-mv-portal-wash text-mv-slate",
    },
  ];

  return (
    <section
      className="overflow-hidden rounded-mv border border-mv-line"
      aria-label="Lease set summary"
    >
      <div className="grid grid-cols-2 gap-px bg-mv-line @[620px]:grid-cols-4">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className="flex items-center gap-[9px] bg-mv-card px-[14px] py-[10px]"
          >
            <span
              className={`flex h-[28px] w-[28px] flex-none items-center justify-center rounded-[9px] ${tile.tone}`}
            >
              <tile.icon aria-hidden="true" className="h-[15px] w-[15px]" />
            </span>

            {/* ONE LINE: icon, name, figure (requested). Stacked, the number
                sat above its own label and the four tiles read as eight rows;
                in a line each tile is a single short sentence.

                THE FIGURE IS RANGED RIGHT so the four numbers line up down the
                strip whatever length their labels are — "Operators" and "Total
                leases" differ by half a tile, and left-packed values stepped
                raggedly across the row. */}
            <span className="min-w-0 truncate text-[12px] font-semibold text-mv-muted">
              {tile.label}
            </span>

            <span className="ml-auto pl-2 text-[17px] leading-none font-extrabold text-mv-ink tabular-nums">
              {tile.value}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

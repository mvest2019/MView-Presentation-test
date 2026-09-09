import { Building2, Droplet, FileText, PauseCircle } from "lucide-react";

import { leaseTotals } from "../../_lib/claim-format";
import type { FlowLease } from "../../_lib/claim-types";

/**
 * THE FOUR-TILE SUMMARY under step 4's table.
 *
 * EVERY FIGURE IS DERIVED FROM THE ROWS THE PAGE IS SHOWING — `leaseTotals`
 * counts the same array the table prints, so a tile cannot disagree with it.
 *
 * The separators are the grid's own background through 1px gaps rather than
 * borders on the tiles: the tiles are the last thing in the card, so a
 * `border-b` on the final row would double against the card's edge, and a
 * `border-r` on the last tile of a wrapped row would draw a stray line down the
 * right edge on a phone.
 */
export function LeaseStatStrip({ leases }: { leases: FlowLease[] }) {
  const totals = leaseTotals(leases);

  /* TWO LINES PER TILE, NOT THREE. Each carried a third caption — "joined",
     "on the roll", "still owned", "on record" — that only restated its label in
     other words, and at 10.5px under a 15px figure it read as an artefact
     rather than a sentence. The figure and its name are the whole tile. */
  const tiles = [
    { icon: FileText, value: totals.count, label: "Total leases" },
    { icon: Droplet, value: totals.producing, label: "With value" },
    { icon: PauseCircle, value: totals.inactive, label: "No value" },
    { icon: Building2, value: totals.operators, label: "Operators" },
  ];

  return (
    <section
      className="overflow-hidden rounded-mv border border-mv-line"
      aria-label="Lease set summary"
    >
      <div className="grid grid-cols-2 gap-px bg-mv-line @[420px]:grid-cols-4">
        {tiles.map((tile) => (
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
          </div>
        ))}
      </div>
    </section>
  );
}

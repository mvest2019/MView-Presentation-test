import { fieldGroupLabelClass } from "@/app/_components/typography";
import {
  QUICK_FILTERS,
  type QuickFilterKey,
  type OperatorPage,
} from "@/lib/operator-types";

import { FilterPill } from "./filter-pill";

/**
 * The four quick-filter pills, each carrying a live match count.
 *
 * LAYOUT — this is the §7 fix. The prototype put `flex:1 1 auto` on the chip
 * group inside a `.qrow` flex row, which told the chips to absorb every spare
 * pixel. Anything sharing the row got shoved to the far edge and wrapped the
 * moment things tightened, leaving a wide empty band under the pills. There is
 * no grow here: the pills are one `flex-wrap` group that packs from the left,
 * wraps only when the viewport genuinely runs out of room, and keeps the same
 * `gap-[10px]` rhythm on both axes so a wrapped second row sits at the same
 * spacing as the first. Nothing about the pill design changes.
 *
 * One pill is active at a time — clicking the active one clears it, which is
 * the prototype's toggle behaviour.
 */

const QUICK_KEYS = Object.keys(QUICK_FILTERS) as QuickFilterKey[];

/** Only this pill's label differs from its key's plain reading. */
const TITLES: Partial<Record<QuickFilterKey, string>> = {
  recent:
    "Illustrative activity placeholder — switches to reported activity when the operator API wires",
};

export function OperatorQuickFilters({
  active,
  counts,
  onToggle,
}: {
  active: QuickFilterKey | "";
  counts: OperatorPage["quickCounts"];
  onToggle: (key: QuickFilterKey) => void;
}) {
  return (
    <div>
      <h4 className={`${fieldGroupLabelClass} mb-[10px]`}>Quick filters</h4>

      <div
        role="group"
        aria-label="Quick filters"
        className="flex flex-wrap items-center gap-[10px]"
      >
        {QUICK_KEYS.map((key) => (
          <FilterPill
            key={key}
            active={active === key}
            count={counts[key]}
            srLabel={QUICK_FILTERS[key]}
            onClick={() => onToggle(key)}
          >
            <span title={TITLES[key]}>{QUICK_FILTERS[key]}</span>
          </FilterPill>
        ))}
      </div>
    </div>
  );
}

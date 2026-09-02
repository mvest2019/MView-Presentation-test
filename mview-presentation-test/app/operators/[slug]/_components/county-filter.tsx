"use client";

import { SelectControl } from "@/app/_components/select-control";
import { titleCase } from "@/lib/text-case";

/**
 * The production chart's county filter.
 *
 * THE SAME `SelectControl` THE OPERATOR LISTING AND THE PRODUCTION COMPARISON USE
 * (requested). All three operator pages now carry one dropdown, imported rather than
 * reproduced, so the style cannot drift between them.
 *
 * WHAT THAT COSTS, since it was a styled listbox with a filter field before: the popup
 * is the operating system's again, so with eighty-odd counties it runs the height of
 * the viewport and looks nothing like the card around it, and there is no longer a way
 * to type to narrow the list. That is the trade the shared style asks for. What it buys
 * back is the platform's own keyboard handling and mobile wheel picker, and no
 * JavaScript at all for the control.
 *
 * WHAT STAYS HERE is everything about counties rather than about dropdowns: the "All
 * counties" sentinel, and the "Andrews County" label format that matches the listing's
 * own options.
 */

/** The sentinel for "no county filter" — every county the operator reports in. */
export const ALL_COUNTIES = "__all__";

export function CountyFilter({
  value,
  options,
  onChange,
}: {
  /** The selected county, or `ALL_COUNTIES`. */
  value: string;
  /** Raw county names, upper-cased as the API returns them. */
  options: readonly string[];
  onChange: (next: string) => void;
}) {
  return (
    <SelectControl
      label="Filter production by county"
      value={value}
      onChange={onChange}
      className="min-w-[180px] max-[560px]:w-full max-[767px]:min-w-full"
    >
      <option value={ALL_COUNTIES}>All counties</option>
      {options.map((name) => (
        <option key={name} value={name}>
          {/* DEFECT 132 — see the note in `operator-leases.tsx`. */}
          {titleCase(name)}
        </option>
      ))}
    </SelectControl>
  );
}

"use client";

import { X } from "lucide-react";

import { FilterPill } from "./filter-pill";
import type { AppliedFilter } from "./use-operator-directory";

/**
 * The applied-filter tag row (`#opTagRow` / `.ftag`) — one removable tag per
 * active filter, plus "Clear all".
 *
 * `useOperatorDirectory` builds the list, because only it knows how to undo
 * each filter. The whole row is hidden when nothing is applied, so the panel
 * does not carry an empty strip.
 */

export function OperatorAppliedTags({
  filters,
  onClearAll,
}: {
  filters: AppliedFilter[];
  onClearAll: () => void;
}) {
  if (filters.length === 0) return null;

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#eef1f4] pt-4">
      <span className="text-[12.5px] font-extrabold uppercase tracking-[.07em] text-mv-muted">
        Applied:
      </span>

      {filters.map((filter) => (
        <span
          key={filter.id}
          className="inline-flex items-center gap-[6px] rounded-full border border-[#bfe6d3] bg-[#e6f6ee] py-[5px] pl-3 pr-2 text-[12.5px] font-semibold text-mv-green-deep"
        >
          {filter.label}
          <button
            type="button"
            onClick={filter.onRemove}
            aria-label={`Remove filter ${filter.label}`}
            className="inline-flex h-[18px] w-[18px] cursor-pointer items-center justify-center rounded-full border-0 bg-[rgba(47,138,102,.14)] text-mv-green-deep hover:bg-[rgba(47,138,102,.28)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-mv-green-deep"
          >
            <X aria-hidden="true" className="h-[11px] w-[11px]" strokeWidth={3} />
          </button>
        </span>
      ))}

      <FilterPill active={false} onClick={onClearAll} className="!py-[7px]">
        Clear all ✕
      </FilterPill>
    </div>
  );
}

"use client";

import { ChevronDown, Search } from "lucide-react";
import { useId } from "react";

import { PLAY_NAMES, OPERATORS_BY_PLAY } from "@/lib/operator-mock-data";
import { TEXAS_COUNTIES } from "@/lib/texas-counties";
import {
  ALL_PLAYS,
  type OperatorPage,
  type OperatorStatus,
} from "@/lib/operator-types";

/**
 * The prototype's `.findbar` — search, Play type, Status, County on one desktop
 * row, from `.search-wrap` and the `.findbar select` rules.
 *
 * The design draws the select chevron with an inline SVG data-URI background.
 * Here it is a `lucide-react` icon absolutely positioned and `pointer-events-
 * none` over a native `<select>` with `appearance-none`, which renders the same
 * and keeps a 200-character data URI out of the class string. The control is
 * still a real `<select>`, so keyboard and mobile pickers behave.
 *
 * Responsive: `flex-wrap` with the search box on `flex-1 min-w-[240px]` holds
 * one row down to roughly 900px, then the selects wrap in pairs. Below 767px
 * every control goes full width so nothing is squeezed under a usable size.
 */

/** The mint-edged control border and lift — the design's `--mint-line`. */
const CONTROL_TINT = "border-mv-mint-line shadow-[0_1px_2px_rgba(13,14,23,.04)]";

const SELECT_CLASS =
  "w-full cursor-pointer appearance-none rounded-[10px] border bg-white py-2 pl-[14px] pr-9 text-sm font-medium text-mv-ink outline-none transition-colors hover:border-mv-green focus-visible:border-mv-green focus-visible:ring-[3px] focus-visible:ring-[rgba(84,191,150,.16)]";

export function OperatorFindBar({
  search,
  play,
  status,
  county,
  statusCounts,
  onSearch,
  onPlay,
  onStatus,
  onCounty,
}: {
  search: string;
  play: string;
  status: OperatorStatus | "";
  county: string;
  statusCounts: OperatorPage["statusCounts"];
  onSearch: (value: string) => void;
  onPlay: (value: string) => void;
  onStatus: (value: OperatorStatus | "") => void;
  onCounty: (value: string) => void;
}) {
  const searchId = useId();

  return (
    <div
      role="group"
      aria-label="Search operators, filter by play, status and county"
      className="flex flex-wrap items-center gap-3"
    >
      <div className="relative min-w-[240px] flex-1 max-[767px]:min-w-full">
        <label htmlFor={searchId} className="sr-only">
          Search operators by name or operator number
        </label>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-[15px] top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-mv-green-deep"
          strokeWidth={1.9}
        />
        <input
          id={searchId}
          type="text"
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Search by Operator Name or Operator Number…"
          className={`w-full rounded-xl border bg-white py-[13px] pl-11 pr-[14px] text-[15px] text-mv-ink outline-none transition-colors placeholder:text-mv-placeholder hover:border-mv-green focus-visible:border-mv-green focus-visible:ring-[3px] focus-visible:ring-[rgba(84,191,150,.16)] ${CONTROL_TINT}`}
        />
      </div>

      <SelectControl
        label="Choose a play type"
        value={play}
        onChange={onPlay}
        className="min-w-[180px] max-[767px]:min-w-full"
      >
        <option value={ALL_PLAYS}>Select Play type</option>
        {PLAY_NAMES.map((name) => (
          <option key={name} value={name}>
            {name} ({OPERATORS_BY_PLAY[name].length})
          </option>
        ))}
      </SelectControl>

      <SelectControl
        label="Filter by status"
        value={status}
        onChange={(value) => onStatus(value as OperatorStatus | "")}
        className="min-w-[180px] max-[767px]:min-w-full"
      >
        <option value="">Select status</option>
        <option value="active">Active ({statusCounts.active})</option>
        <option value="inactive">Inactive ({statusCounts.inactive})</option>
      </SelectControl>

      <SelectControl
        label="Choose a county"
        value={county}
        onChange={onCounty}
        className="min-w-[180px] max-[767px]:min-w-full"
      >
        <option value="">Counties</option>
        {TEXAS_COUNTIES.map((name) => (
          <option key={name} value={name}>
            {name} County
          </option>
        ))}
      </SelectControl>
    </div>
  );
}

function SelectControl({
  label,
  value,
  onChange,
  className,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`relative ${className}`}>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${SELECT_CLASS} ${CONTROL_TINT} min-h-[44px]`}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-[13px] top-1/2 h-[7px] w-[11px] -translate-y-1/2 text-mv-muted"
        strokeWidth={1.8}
      />
    </div>
  );
}

"use client";

import type { LeaseAgg } from "@/lib/claim-search/types";

import { fmt } from "../_lib/working-set";
import {
  EmptyState,
  LeaseIcon,
  LeaseListSkeleton,
  LockedInline,
  refineInput,
} from "./ui";

/**
 * Left panel — every lease in the working set, aggregated. Ticking a lease
 * narrows the right panel to exactly that lease's owners (exact membership,
 * loaded from the county chunk); clicking a lease name opens its report
 * drawer.
 */
export function LeasePanel({
  searched,
  signedIn,
  busyLabel,
  leases,
  ownerCount,
  anyOwnerTicked,
  anyLeaseTicked,
  refL,
  onRefL,
  countyOptions,
  cty,
  onCty,
  selL,
  onToggleLease,
  onOpenReport,
  onClearTicks,
}: {
  searched: boolean;
  /** Signed-out visitors see the appraised total as locked. */
  signedIn: boolean;
  /** Set while an API call is in flight — overlays the list with a loader. */
  busyLabel: string | null;
  leases: LeaseAgg[];
  ownerCount: number;
  anyOwnerTicked: boolean;
  anyLeaseTicked: boolean;
  refL: string;
  onRefL: (v: string) => void;
  countyOptions: { county: string; count: number }[];
  cty: string;
  onCty: (v: string) => void;
  selL: Record<string, boolean>;
  onToggleLease: (key: string) => void;
  onOpenReport: (lease: LeaseAgg) => void;
  onClearTicks: () => void;
}) {
  const heading = anyOwnerTicked
    ? "Leases held by ticked owners"
    : searched
      ? "Leases in this result set"
      : "Leases";
  return (
    <div className="flex w-full flex-col rounded-mv border border-mv-line bg-mv-card px-[18px] py-[18px] shadow-mv">
      <div className="flex items-baseline justify-between gap-3">
        <h4 className="flex items-center gap-[7px] text-[14.5px] font-bold [&_svg]:flex-none [&_svg]:text-mv-green-deep">
          <LeaseIcon size={14} stroke={2.4} />
          <span>{heading}</span>
        </h4>
        {anyLeaseTicked && (
          <button
            type="button"
            onClick={onClearTicks}
            className="cursor-pointer pb-[6px] text-xs font-bold text-mv-green-deep hover:underline"
          >
            clear ticks
          </button>
        )}
      </div>
      <input
        className={`${refineInput} mb-2 mt-[6px]`}
        placeholder="Refine leases"
        aria-label="Refine leases"
        value={refL}
        onChange={(e) => onRefL(e.target.value)}
      />
      <div className="mb-[6px]">
        <select
          aria-label="Filter results to one county"
          value={cty}
          onChange={(e) => onCty(e.target.value)}
          className="h-[40px] w-full rounded-[10px] border border-mv-line bg-white px-[11px] text-[13px] text-mv-ink focus-visible:border-mv-green-deep focus-visible:shadow-[0_0_0_3px_var(--color-mv-tint)] focus-visible:outline-none"
        >
          <option value="*">All counties in results</option>
          {countyOptions.map(({ county, count }) => (
            <option key={county} value={county}>
              {county} ({count})
            </option>
          ))}
        </select>
      </div>
      <p className="mb-[6px] text-xs text-mv-muted">
        {busyLabel
          ? busyLabel
          : searched
            ? `${leases.length} lease${leases.length === 1 ? "" : "s"} · ${ownerCount} owner${ownerCount === 1 ? "" : "s"} on the right.`
            : "Waiting on your first search."}
      </p>
      <div className="relative flex min-h-[120px] flex-1 flex-col">
        <div className="max-h-[560px] flex-1 overflow-y-auto pr-[2px]">
        {busyLabel ? (
          <LeaseListSkeleton label={busyLabel} />
        ) : !searched ? (
          <EmptyState>Search above to see leases here.</EmptyState>
        ) : leases.length === 0 ? (
          <div className="px-4 py-[26px] text-center text-[13px] text-mv-muted">
            No leases in this set — clear a filter to widen it.
          </div>
        ) : (
          leases.map((l) => (
            <div
              key={l.key}
              className={`mt-2 flex items-start gap-[10px] rounded-[11px] border px-3 py-[10px] text-[12.5px] transition-[border-color,background-color,box-shadow] ${
                selL[l.key]
                  ? "border-mv-green bg-mv-tint"
                  : "border-mv-line bg-white hover:border-mv-mint-line hover:shadow-mv"
              }`}
            >
              <input
                type="checkbox"
                checked={!!selL[l.key]}
                onChange={() => onToggleLease(l.key)}
                aria-label={`Filter owners to ${l.n}`}
                className="mt-[2px] h-4 w-4 flex-none cursor-pointer accent-mv-green-deep"
              />
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => onOpenReport(l)}
                  className="cursor-pointer whitespace-normal break-words text-left font-semibold text-mv-green-deep underline decoration-[rgba(46,143,109,.35)] underline-offset-[2.5px] hover:text-mv-green-ink"
                >
                  {l.n}
                </button>
                <div className="mt-[2px] text-[11px] text-mv-muted">
                  {l.c} · {l.cnt} owner{l.cnt === 1 ? "" : "s"} ·{" "}
                  {signedIn ? (
                    fmt(l.val)
                  ) : (
                    <LockedInline label="Appraised value locked" />
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        </div>
      </div>
      <p className="mt-auto pt-[10px] text-[11px] text-mv-muted">
        <strong>Click a lease</strong> for its report · <strong>tick</strong> to keep
        only its owners.
      </p>
    </div>
  );
}

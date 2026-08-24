"use client";

import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Flag,
  Plus,
  Repeat,
} from "lucide-react";
import { Fragment } from "react";

import type { ChangeEvidence, ChangeRow } from "@/lib/operator-detail-data";

/**
 * One finding, as a card — the shape both "What changed" and the comparison read use.
 *
 * PROMOTED HERE SO THE TWO CANNOT DRIFT. This markup began inside the operator detail
 * page's What Changed panel; the comparison page was then asked for the same structure,
 * and the only way two sections stay identical is if there is one of them. Same
 * promotion the shared dropdown and `DeferredSection` had, for the same reason.
 *
 * PRESENTATION ONLY, AND DELIBERATELY SO. It takes a finished `ChangeRow` and draws it.
 * Where the row came from — measured from MongoDB, measured from the operator details
 * endpoint, or computed from a comparison — is the caller's business, and keeping that
 * out of here is what lets one card serve all three.
 *
 * NO FIGURE IS COMPUTED IN THIS FILE. `v` arrives already rendered because whoever
 * measured it formatted it; re-deriving or re-rounding here would create a second
 * definition of the same number.
 */

const CHANGE_ICONS = {
  up: ArrowUp,
  down: ArrowDown,
  add: Plus,
  flag: Flag,
  swap: Repeat,
} as const;

/**
 * The working behind one finding: why the measure matters, the figures it was built
 * from, an optional sparkline, and how it was measured.
 *
 * NOTHING IS FETCHED TO OPEN A ROW. The evidence ships with the row, so expanding is
 * instant and works offline.
 */
function Evidence({ evidence }: { evidence: ChangeEvidence }) {
  const peak = Math.max(1, ...evidence.series.map((point) => point.value));

  return (
    <div className="border-t border-mv-line-soft px-[18px] pb-4 pt-3">
      {evidence.why ? (
        <p className="m-0 text-[13px] leading-[1.55] text-mv-ink-soft">
          {evidence.why}
        </p>
      ) : null}

      {evidence.rows.length > 0 ? (
        <dl className="m-0 mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-[6px] text-[12.5px]">
          {evidence.rows.map((row) => (
            <Fragment key={row.k}>
              <dt className="text-mv-muted">{row.k}</dt>
              <dd className="m-0 font-semibold tabular-nums text-mv-ink">
                {row.v}
                {row.note ? (
                  <span className="ml-[6px] font-normal text-mv-muted">
                    {row.note}
                  </span>
                ) : null}
              </dd>
            </Fragment>
          ))}
        </dl>
      ) : null}

      {/* Bars rather than a chart library: this is a dozen values at 46px tall, and a
          dependency for that would cost more than it shows. */}
      {evidence.series.length > 1 ? (
        <div className="mt-[14px]">
          <div className="flex h-[46px] items-end gap-[3px]">
            {evidence.series.map((point) => (
              <span
                key={point.label}
                title={`${point.label}: ${point.value.toLocaleString("en-US")}`}
                className={`min-w-[6px] flex-1 rounded-t-[2px] ${
                  point.on ? "bg-mv-green-deep" : "bg-mv-line"
                }`}
                style={{
                  height: `${Math.max(3, Math.round((point.value / peak) * 46))}px`,
                }}
              />
            ))}
          </div>
          <div className="mt-1 flex gap-[3px] text-[10px] text-mv-placeholder">
            {evidence.series.map((point) => (
              <span
                key={point.label}
                className="min-w-[6px] flex-1 text-center"
              >
                {point.label.slice(0, 4)}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {evidence.method ? (
        <p className="m-0 mt-[14px] text-[12px] leading-[1.5] text-mv-muted">
          <span className="mr-[6px] font-bold uppercase tracking-[.05em] text-mv-placeholder">
            How this was measured
          </span>
          {evidence.method}
        </p>
      ) : null}
    </div>
  );
}

/**
 * One finding, expandable when the caller supplied its working.
 *
 * A REAL BUTTON, not a div with `role="button"`, so Enter, Space and focus handling
 * come from the platform rather than being hand-wired.
 *
 * ONE ROW OPEN AT A TIME, which is why `isOpen` is decided by the parent rather than
 * held here: six rows all open is a wall of text, and the point of the panel is that
 * six things are scannable at a glance.
 *
 * A ROW WITH NO EVIDENCE DOES NOT PRETEND TO EXPAND — no button, no chevron.
 */
export function ChangeItem({
  row,
  isOpen = false,
  onToggle,
}: {
  row: ChangeRow;
  isOpen?: boolean;
  onToggle?: () => void;
}) {
  const Icon = CHANGE_ICONS[row.kind];
  const tone =
    row.kind === "up"
      ? "bg-mv-tint text-mv-green-deep"
      : row.kind === "down"
        ? "bg-mv-line-soft text-mv-muted"
        : "bg-mv-sand-tint text-mv-sand";

  const bodyId = `wc-ev-${row.headline.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;

  const head = (
    <>
      <span
        aria-hidden="true"
        className={`grid h-[26px] w-[26px] shrink-0 place-items-center rounded-lg ${tone}`}
      >
        <Icon className="h-[15px] w-[15px]" strokeWidth={2.2} />
      </span>
      <span className="min-w-0 flex-1 text-[13.5px] leading-[1.55] text-mv-ink-soft">
        <b className="font-bold text-mv-ink">{row.headline}</b> {row.detail}
        <span className="mt-1 block text-[12px] text-mv-muted">
          {row.source}
        </span>
      </span>
    </>
  );

  if (!row.evidence || !onToggle) {
    return (
      <li className="flex items-start gap-3 rounded-[14px] border border-mv-line bg-white px-[18px] py-4 shadow-[0_1px_2px_rgba(24,24,27,.05)]">
        {head}
      </li>
    );
  }

  return (
    <li className="overflow-hidden rounded-[14px] border border-mv-line bg-white shadow-[0_1px_2px_rgba(24,24,27,.05)]">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={bodyId}
        className="flex w-full cursor-pointer items-start gap-3 border-0 bg-transparent px-[18px] py-4 text-left transition-colors hover:bg-mv-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-mv-green-deep"
      >
        {head}
        <ChevronDown
          aria-hidden="true"
          className={`mt-[5px] h-4 w-4 shrink-0 text-mv-muted transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          strokeWidth={2.2}
        />
      </button>

      {/* Mounted only while open: six panels of evidence in the DOM at once is a lot of
          nodes for something five of which nobody is reading. */}
      {isOpen ? (
        <div id={bodyId}>
          <Evidence evidence={row.evidence} />
        </div>
      ) : null}
    </li>
  );
}

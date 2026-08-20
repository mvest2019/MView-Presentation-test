"use client";

import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Flag,
  Plus,
  RefreshCw,
  Repeat,
  Sparkles,
} from "lucide-react";
import { Fragment, useCallback, useEffect, useState } from "react";

import type { ChangeEvidence, ChangeRow } from "@/lib/operator-detail-data";
import type { WhatChangedPanel } from "@/lib/operator-what-changed-api";

/**
 * "What changed" — six measured findings, phrased by Claude.
 *
 * IT FETCHES ON MOUNT, AND IT MOUNTS LATE. The parent wraps this in
 * `DeferredSection`, so nothing here runs until the section is approached: no request
 * on page load, nothing in the server render, no contribution to LCP or to the initial
 * JavaScript the page must evaluate. The wrapper reserves the section's height, so the
 * skeleton and the finished panel occupy the same space and the arrival shifts nothing.
 *
 * THE FIGURES ARE NOT THE MODEL'S. The service measures the changes from MongoDB,
 * ranks them, and sends the finished findings to Claude to rephrase. Direction and
 * attribution are carried from the measurement, and any output containing a number
 * that was not in the input is rejected. So `writer` is a note about prose, never
 * about accuracy — which is why the footer states it plainly instead of hiding it.
 *
 * SIX STATES, DRAWN SEPARATELY. Skeleton while it loads; the panel on success; a
 * sentence when the operator has no measurable window; an alert with a retry when the
 * service is unreachable or timed out; and, inside a successful panel, a quiet note
 * when the wording is the measured fallback rather than the model's. A fallback that
 * looks identical to a clean run is a fallback nobody notices is stuck.
 */

const CHANGE_ICONS = {
  up: ArrowUp,
  down: ArrowDown,
  add: Plus,
  flag: Flag,
  swap: Repeat,
} as const;

/** Rows the skeleton draws — the service's contract is always six. */
const SKELETON_ROWS = 6;

type Loaded =
  | { state: "ready"; panel: WhatChangedPanel }
  | { state: "empty"; detail: string }
  | { state: "error"; detail: string };

/**
 * The working behind one finding: why the measure matters, the figures it was built
 * from, an optional sparkline, and how it was measured.
 *
 * NOTHING IS FETCHED TO OPEN A ROW. The evidence ships with the panel, so expanding is
 * instant and works offline - and no number is computed here. `v` arrives already
 * rendered because the service computed it; formatting it again would make this a
 * second definition of the same figure.
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
 * One finding, expandable when the service sent its working.
 *
 * A REAL BUTTON, not a div with `role="button"`. The standalone panel uses the latter
 * and has to hand-wire Enter and Space; a `<button>` gets both, plus focus handling,
 * from the platform.
 *
 * ONE ROW OPEN AT A TIME, which is why `isOpen` is decided by the parent rather than
 * held here: six rows all open is a wall of text, and the point of the panel is that
 * six things are scannable at a glance.
 *
 * A ROW WITH NO EVIDENCE DOES NOT PRETEND TO EXPAND. The fixture rows carry none, so
 * they render exactly as they did before - no button, no chevron.
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

/** Shimmer rows that occupy the same height the finished panel will. */
function Skeleton() {
  return (
    <ul aria-hidden="true" className="m-0 grid list-none gap-[10px] p-0">
      {Array.from({ length: SKELETON_ROWS }, (_, row) => (
        <li
          key={row}
          className="flex items-start gap-3 rounded-[14px] border border-mv-line bg-white px-[18px] py-4"
        >
          <span className="h-[26px] w-[26px] shrink-0 animate-pulse rounded-lg bg-mv-line-soft" />
          <span className="min-w-0 flex-1">
            <span
              className="block h-[13px] animate-pulse rounded bg-mv-line-soft"
              style={{ width: `${[82, 68, 76, 58, 88, 64][row % 6]}%` }}
            />
            <span className="mt-2 block h-[11px] w-[38%] animate-pulse rounded bg-mv-line-soft" />
          </span>
        </li>
      ))}
    </ul>
  );
}

export function OperatorWhatChanged({
  operatorNumber,
}: {
  operatorNumber: string;
}) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  /**
   * Which row is expanded, by headline - one at a time.
   *
   * Held here rather than in each row so opening one closes the other five without the
   * rows having to know about each other. The headline is the key the list already
   * uses, so no id has to be invented.
   */
  const [openRow, setOpenRow] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    fetch(`/api/operators/${operatorNumber}/what-changed`, {
      signal: controller.signal,
    })
      .then((response) => response.json() as Promise<Loaded>)
      .then((body) => {
        if (active) setLoaded(body);
      })
      .catch(() => {
        // A cancelled fetch is not a failure — the cleanup superseded it.
        if (!active || controller.signal.aborted) return;
        setLoaded({
          state: "error",
          detail: "The analysis could not be loaded.",
        });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [operatorNumber, nonce]);

  const retry = useCallback(() => {
    setLoaded(null);
    setNonce((value) => value + 1);
  }, []);

  /* ---- loading ---- */
  if (loaded === null) {
    return (
      <>
        <p className="sr-only" role="status">
          Loading what changed
        </p>
        <Skeleton />
      </>
    );
  }

  /* ---- service unreachable, or it timed out ---- */
  if (loaded.state === "error") {
    return (
      <div
        role="alert"
        className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-mv-line bg-mv-bg px-[18px] py-4"
      >
        <p className="m-0 text-[13.5px] text-mv-ink-soft">{loaded.detail}</p>
        <button
          type="button"
          onClick={retry}
          className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-[10px] border border-mv-line bg-white px-4 py-2 text-[13px] font-semibold text-mv-slate transition-colors hover:border-mv-line-strong hover:bg-mv-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
        >
          <RefreshCw
            aria-hidden="true"
            className="h-[14px] w-[14px]"
            strokeWidth={2}
          />
          Try again
        </button>
      </div>
    );
  }

  /* ---- the operator has no window to measure ---- */
  if (loaded.state === "empty") {
    return (
      <p className="m-0 rounded-[14px] border border-mv-line bg-white px-[18px] py-4 text-[13.5px] text-mv-muted">
        No changes to report — this operator {loaded.detail}.
      </p>
    );
  }

  /* ---- success ---- */
  const { panel } = loaded;
  /* Which writers are a model. Listed rather than inverted against the fallbacks so a
     writer nobody taught this component about reads as "measured" — understating what
     wrote the panel is the safe way to be wrong about it. */
  const modelWrote =
    panel.writer === "gemini" ||
    panel.writer === "claude-api" ||
    panel.writer === "claude-cli";

  return (
    <>
      <ul className="m-0 grid list-none gap-[10px] p-0">
        {panel.rows.map((row) => (
          <ChangeItem
            key={row.headline}
            row={row}
            isOpen={openRow === row.headline}
            onToggle={() =>
              setOpenRow((current) =>
                current === row.headline ? null : row.headline,
              )
            }
          />
        ))}
      </ul>

      {/* Which wording arrived, stated rather than implied. The figures are the same
          either way — only the phrasing differs — so this says that outright instead
          of leaving a reader to wonder whether the numbers changed too. */}
      <p className="mt-[10px] flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-mv-muted">
        <span
          className={`inline-flex items-center gap-[5px] rounded-full px-[9px] py-[2px] font-semibold ${
            modelWrote
              ? "bg-mv-tint text-mv-green-deep"
              : "bg-mv-sand-tint text-mv-sand"
          }`}
        >
          {modelWrote ? (
            <Sparkles
              aria-hidden="true"
              className="h-[11px] w-[11px]"
              strokeWidth={2.2}
            />
          ) : null}
          {modelWrote ? "AI wording" : "Measured wording"}
        </span>
        <span>
          Figures measured from RRC records as of {panel.asOfLabel} · last{" "}
          {panel.activityDays} days of filings
          {modelWrote ? " · phrasing only is AI-written" : ""}
        </span>
      </p>
    </>
  );
}

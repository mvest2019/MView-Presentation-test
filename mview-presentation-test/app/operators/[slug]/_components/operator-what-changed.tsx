"use client";

import {
  ArrowDown,
  ArrowUp,
  Flag,
  Plus,
  RefreshCw,
  Repeat,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import type { ChangeRow } from "@/lib/operator-detail-data";
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

export function ChangeItem({ row }: { row: ChangeRow }) {
  const Icon = CHANGE_ICONS[row.kind];
  const tone =
    row.kind === "up"
      ? "bg-mv-tint text-mv-green-deep"
      : row.kind === "down"
        ? "bg-mv-line-soft text-mv-muted"
        : "bg-mv-sand-tint text-mv-sand";

  return (
    <li className="flex items-start gap-3 rounded-[14px] border border-mv-line bg-white px-[18px] py-4 shadow-[0_1px_2px_rgba(24,24,27,.05)]">
      <span
        aria-hidden="true"
        className={`grid h-[26px] w-[26px] shrink-0 place-items-center rounded-lg ${tone}`}
      >
        <Icon className="h-[15px] w-[15px]" strokeWidth={2.2} />
      </span>
      <span className="min-w-0 text-[13.5px] leading-[1.55] text-mv-ink-soft">
        <b className="font-bold text-mv-ink">{row.headline}</b> {row.detail}
        <span className="mt-1 block text-[12px] text-mv-muted">
          {row.source}
        </span>
      </span>
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
  const modelWrote =
    panel.writer === "claude-api" || panel.writer === "claude-cli";

  return (
    <>
      <ul className="m-0 grid list-none gap-[10px] p-0">
        {panel.rows.map((row) => (
          <ChangeItem key={row.headline} row={row} />
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

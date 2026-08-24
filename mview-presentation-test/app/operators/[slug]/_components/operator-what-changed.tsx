"use client";

import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { ChangeItem } from "@/app/_components/change-item";
import { DeferredSection } from "@/app/_components/deferred-section";
import type { WhatChangedPanel } from "@/lib/operator-what-changed-api";

/**
 * "What changed" — six measured findings, phrased by a model.
 *
 * IT FETCHES ON MOUNT, AND IT MOUNTS LATE. The parent wraps this in
 * `DeferredSection`, so nothing here runs until the section is approached: no request
 * on page load, nothing in the server render, no contribution to LCP or to the initial
 * JavaScript the page must evaluate. The wrapper reserves the section's height, so the
 * skeleton and the finished panel occupy the same space and the arrival shifts nothing.
 *
 * THE FIGURES ARE NOT THE MODEL'S. The changes are measured — from MongoDB via the
 * analysis service, or from the operator details endpoint where that service is out of
 * reach — and ranked before a model is asked anything; it is then sent finished
 * findings and told only to rephrase them. Direction and attribution are carried from
 * the measurement, and any output containing a number that was not in the input is
 * rejected. So `writer` is a note about prose, never about accuracy.
 *
 * THE CARD ITSELF LIVES IN `app/_components/change-item.tsx`, shared with the
 * comparison page's read so the two sections cannot drift apart.
 *
 * `writer` IS CARRIED BUT NO LONGER DRAWN (requested). The panel used to end with a
 * badge saying whether the wording was the model's or the measured fallback. Removing
 * it costs the one on-page signal that a run fell back, so a panel stuck on measured
 * wording is now invisible from the page — read `writer` from
 * `/api/operators/<no>/what-changed` to tell.
 *
 * FOUR STATES, DRAWN SEPARATELY. Skeleton while it loads; the panel on success; a
 * sentence when the operator has no measurable window; an alert with a retry when the
 * service is unreachable or timed out.
 */

/** Rows the skeleton draws — the contract is always six. */
const SKELETON_ROWS = 6;

type Loaded =
  | { state: "ready"; panel: WhatChangedPanel }
  | { state: "empty"; detail: string }
  | { state: "error"; detail: string };

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

/**
 * The panel body — everything that needs the response.
 *
 * SEPARATE FROM THE SHELL BELOW SO THE FETCH STAYS DEFERRED. The heading and its
 * Refresh button have to be on screen from the first paint to sit on one line; the
 * request must NOT be. Only this half is wrapped in `DeferredSection`, so the shell
 * renders immediately and the endpoint is still not called until the section is
 * approached. `nonce` is the shell's way of asking for another read.
 */
function WhatChangedPanel({
  operatorNumber,
  nonce,
  onBusyChange,
  onWriterChange,
}: {
  operatorNumber: string;
  nonce: number;
  onBusyChange: (busy: boolean) => void;
  onWriterChange: (writer: string | null) => void;
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
  /** Its own retry counter, for the error state's "Try again". */
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    fetch(`/api/operators/${operatorNumber}/what-changed`, {
      signal: controller.signal,
      /* Refresh has to reach the server to mean anything: the wording is written per
         request, so a reply served from the browser's cache would return the same
         sentences and the button would look broken. The measured figures behind them
         are still cached server-side, so this costs the model call and nothing else. */
      cache: "no-store",
    })
      .then((response) => response.json() as Promise<Loaded>)
      .then((body) => {
        if (!active) return;
        setLoaded(body);
        onBusyChange(false);
        /* Told upward so the shell can say why a refresh changed nothing. `measured`
           and `deterministic` mean no model phrased these rows. */
        onWriterChange(body.state === "ready" ? body.panel.writer : null);
      })
      .catch(() => {
        // A cancelled fetch is not a failure — the cleanup superseded it.
        if (!active || controller.signal.aborted) return;
        setLoaded({
          state: "error",
          detail: "The analysis could not be loaded.",
        });
        onBusyChange(false);
        onWriterChange(null);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [operatorNumber, nonce, attempt, onBusyChange, onWriterChange]);

  const retry = useCallback(() => {
    setLoaded(null);
    setAttempt((value) => value + 1);
  }, []);

  /**
   * Ask for the panel again, and get it phrased again.
   *
   * WHY THIS PRODUCES DIFFERENT WORDING. The measured findings are cached server-side
   * and will not move — nor should they, they are the filed record — but the model is
   * asked to rephrase them on every request, so what comes back reads differently while
   * saying the same thing. `AI_SUMMARY_CACHE_SECONDS` is what governs that; setting it
   * above zero makes this button return the cached phrasing until the window lapses.
   *
   * It costs one model call, only when pressed.
   */
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
  /* `panel.writer` is still reported by the service and still carried on the panel —
     it is simply no longer drawn. Whoever needs to know which wording arrived reads
     it from `/api/operators/<no>/what-changed`. */
  const { panel } = loaded;

  return (
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
  );
}

/**
 * The section: its heading, its Refresh button, and the deferred panel beneath.
 *
 * THE HEADING ARRIVES AS A PROP so the two sit on one line without this file owning a
 * copy of `SectionHead`. The page still renders its own heading; this only decides
 * where it goes, which is the left half of a flex row with the button on the right.
 *
 * THE SHELL IS NOT DEFERRED, THE PANEL IS. That split is the point: a button that only
 * appears once the reader has scrolled to the section cannot sit on the heading's line
 * from the first paint, and deferring the whole thing is what previously forced the
 * button below the heading. The endpoint is still untouched until the panel is
 * approached, so nothing here costs a request on load.
 */
export function OperatorWhatChanged({
  operatorNumber,
  heading,
}: {
  operatorNumber: string;
  /** The page's own `<SectionHead title="What changed" />`. */
  heading: React.ReactNode;
}) {
  const [nonce, setNonce] = useState(0);
  const [busy, setBusy] = useState(false);
  /** What phrased the rows on screen, once they arrive. */
  const [writer, setWriter] = useState<string | null>(null);

  const onBusyChange = useCallback((value: boolean) => setBusy(value), []);
  const onWriterChange = useCallback(
    (value: string | null) => setWriter(value),
    [],
  );

  /**
   * Ask for the panel again, and get it phrased again.
   *
   * The measured findings are cached server-side and will not move — they are the
   * filed record. What changes is the phrasing, because the model is asked to rewrite
   * on every request. See the note below for when it cannot.
   */
  const refresh = useCallback(() => {
    setBusy(true);
    setNonce((value) => value + 1);
  }, []);

  /*
   * WHY A REFRESH CAN LEAVE THE TEXT IDENTICAL, kept as a note to whoever reads this
   * next rather than shown on the page (the on-screen version was removed on request).
   * With no model configured the service returns the measured sentences and this app
   * has nothing to rephrase them with, so pressing Refresh re-reads the findings and
   * changes nothing. Measured with no key set: `writer: "measured"` on two consecutive
   * calls, identical wording both times. `writer` is still tracked because the button
   * stays disabled until the first response lands.
   */

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">{heading}</div>

        <div className="shrink-0">
          <button
            type="button"
            onClick={refresh}
            disabled={busy || writer === null}
            className="inline-flex items-center gap-2 rounded-[10px] border border-mv-line bg-white px-[13px] py-[7px] text-[12.5px] font-semibold text-mv-slate transition-colors enabled:cursor-pointer enabled:hover:border-mv-line-strong enabled:hover:bg-mv-hover disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
          >
            <RefreshCw
              aria-hidden="true"
              className={`h-[13px] w-[13px] ${busy ? "animate-spin" : ""}`}
              strokeWidth={2}
            />
            {busy ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* Only the body waits for the reader. */}
      <DeferredSection minHeight={520} label="What changed">
        <WhatChangedPanel
          operatorNumber={operatorNumber}
          nonce={nonce}
          onBusyChange={onBusyChange}
          onWriterChange={onWriterChange}
        />
      </DeferredSection>
    </>
  );
}

"use client";

import { Lock, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { ChangeItem } from "@/app/_components/change-item";
import { Band, Panel, Row } from "@/app/_components/cta-band";
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
  | { state: "error"; detail: string }
  /** No account. The endpoint answers this without doing any of the work. */
  | { state: "locked" };

/* ==========================================================================
   The sign-in gate

   THIS SECTION AND NOT THE REST OF THE PAGE. Everything else on an operator's
   profile is the filed public record - production, leases, counties, permits -
   and the page says so. "What changed" is the one thing here that is not simply
   the record: it is the record measured, ranked and written up, and it is by
   some distance the most expensive thing the site does. It is the natural place
   to ask for an account, and the only place on this page where asking is honest.

   NOTHING IS BLURRED THAT WAS EVER FETCHED. The endpoint returns `locked`
   without waking the analysis service, so there are no findings in the browser
   to hide - the rows below are shapes, not withheld sentences. A CSS blur over
   delivered text would be theatre, and this would be the wrong page to start.
   ========================================================================== */

/** The six card shapes, greyed and blurred, as the backdrop to the ask. */
function LockedBackdrop() {
  return (
    <ul
      aria-hidden="true"
      className="m-0 grid list-none gap-[10px] p-0 blur-[3px]"
    >
      {Array.from({ length: SKELETON_ROWS }, (_, row) => (
        <li
          key={row}
          className="flex items-start gap-3 rounded-[14px] border border-mv-line bg-white px-[18px] py-4"
        >
          {/* No `animate-pulse` here, unlike the skeleton it is shaped after: a
              pulsing locked panel reads as still loading, and this is finished. */}
          <span className="h-[26px] w-[26px] shrink-0 rounded-lg bg-mv-line-soft" />
          <span className="min-w-0 flex-1">
            <span
              className="block h-[13px] rounded bg-mv-line-soft"
              style={{ width: `${[82, 68, 76, 58, 88, 64][row % 6]}%` }}
            />
            <span className="mt-2 block h-[11px] w-[38%] rounded bg-mv-line-soft" />
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * What a signed-out reader sees in place of the findings.
 *
 * THE BACKDROP IS BEHIND AND THE ASK IS IN FRONT, opaque. A card floating on
 * blurred shapes reads as a locked section; the same words laid flat over them
 * read as a rendering fault. `pointer-events-none` on the backdrop so nothing
 * beneath the overlay is clickable, and the whole region is one `role="status"`
 * rather than six unlabelled list items a screen reader would walk through.
 *
 * IT KEEPS THE SECTION'S HEIGHT. `DeferredSection` reserved 520px for this and
 * the six shapes fill it, so a locked panel and a loaded one occupy the same
 * space and the page does not move under anyone.
 */
function LockedPanel() {
  return (
    <div role="status" className="relative">
      <div aria-hidden="true" className="pointer-events-none select-none">
        <LockedBackdrop />
      </div>

      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="max-w-[440px] rounded-[16px] border border-mv-line bg-white/95 px-6 py-[22px] text-center shadow-mv backdrop-blur-sm">
          <span
            aria-hidden="true"
            className="mx-auto mb-3 grid h-[38px] w-[38px] place-items-center rounded-full bg-mv-mint text-mv-green-deep"
          >
            <Lock className="h-4 w-4" strokeWidth={2.3} />
          </span>

          <p className="m-0 text-[15px] font-bold leading-snug text-mv-ink">
            What changed is part of a free account
          </p>
          <p className="m-0 mt-2 text-[13px] leading-relaxed text-mv-muted">
            Six ranked findings for this operator - what moved, by how much, and
            over which months - measured from the filed record and written up in
            plain English. Everything else on this page stays free to read.
          </p>

          <div className="mt-[18px] flex flex-wrap items-center justify-center gap-[10px]">
            <Link
              href="/register?from=operator-profile"
              className="inline-flex items-center gap-2 rounded-xl bg-mv-green-deep px-[18px] py-[11px] text-[13.5px] font-semibold text-white !no-underline shadow-mv transition-[filter] hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
            >
              Register for free
            </Link>
            <Link
              href="/login"
              className="text-[13px] font-semibold text-mv-green-deep hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
            >
              Sign in
            </Link>
          </div>

          <p className="m-0 mt-[10px] text-[11.5px] text-mv-muted">
            Free account &middot; no card required
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * The band under the locked panel.
 *
 * THE SAME `Band` THE MAP GUIDE AND THE OPERATOR DIRECTORY USE, so all three
 * asks on the site are one component rather than three that resemble each other.
 * Rendered only in the locked state and only inside `DeferredSection`, so it
 * costs a signed-in member nothing at all and a signed-out one nothing until
 * they have scrolled this far.
 */
function LockedCta() {
  return (
    <div className="mt-4">
      <Band
        tone="deep"
        icon={Lock}
        eyebrow="Free account"
        title="Follow what this operator does next"
        body="Everything above - production, leases, counties, permits and wells - is the public record and free to read, with or without an account. A free account adds the measured analysis of this operator, and lets you claim your owner record so activity on your own acreage follows you."
        primary={{
          href: "/register?from=operator-profile",
          label: "Register for free",
        }}
        secondary={{ href: "/login", label: "Sign in" }}
      >
        <Panel title="What a free account opens">
          <Row label="What changed" note="six ranked findings, refreshed" />
          <Row
            label="Lease and producing-county counts"
            note="across the directory"
          />
          <Row label="Your claimed owner record" note="and its lease activity" />
          <Row label="No card, no obligation" />
        </Panel>
      </Band>
    </div>
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
  onLockedChange,
}: {
  operatorNumber: string;
  nonce: number;
  onBusyChange: (busy: boolean) => void;
  onWriterChange: (writer: string | null) => void;
  /** Told upward so the shell can drop a Refresh button with nothing to refresh. */
  onLockedChange: (locked: boolean) => void;
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
        onLockedChange(body.state === "locked");
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
  }, [
    operatorNumber,
    nonce,
    attempt,
    onBusyChange,
    onWriterChange,
    onLockedChange,
  ]);

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

  /* ---- no account ----
     Ahead of the three below because it is not a failure: nothing was attempted,
     so there is nothing to retry and nothing to report about the service. */
  if (loaded.state === "locked") {
    return (
      <>
        <LockedPanel />
        <LockedCta />
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
  /** True once the panel reports the section is behind the sign-in gate. */
  const [locked, setLocked] = useState(false);

  const onBusyChange = useCallback((value: boolean) => setBusy(value), []);
  const onWriterChange = useCallback(
    (value: string | null) => setWriter(value),
    [],
  );
  const onLockedChange = useCallback((value: boolean) => setLocked(value), []);

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

        {/* DROPPED ENTIRELY WHEN LOCKED, not disabled. A greyed-out Refresh beside
            a panel asking for an account is a control for something the reader
            cannot do, and it would be the only disabled control on the page. */}
        <div className={locked ? "hidden" : "shrink-0"}>
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
          onLockedChange={onLockedChange}
        />
      </DeferredSection>
    </>
  );
}

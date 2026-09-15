"use client";

import { useState, type ReactNode } from "react";

/**
 * THE SMALL PIECES THIS PAGE REPEATS.
 *
 * Each of them exists because the source repeats the same markup two or more
 * times, and a copy that drifts is how a chip ends up saying one thing in the
 * plan card and another in the table.
 */

/**
 * `**bold**` inside a fixture string.
 *
 * WHY AT ALL. The plan summaries and feature lines carry emphasis mid-sentence
 * — "Up to **5 visible leases** — a lower tier than your Premium" — and the
 * alternative to marking it in the data is either splitting every line into
 * three fields or shipping HTML through `dangerouslySetInnerHTML`. A two-token
 * split is smaller than both and cannot inject anything: the delimiter is the
 * only syntax it knows.
 */
export function Emphasize({ text }: { text: string }) {
  const parts = text.split("**");
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? <strong key={i}>{part}</strong> : <span key={i}>{part}</span>,
      )}
    </>
  );
}

/**
 * THE EXPLAINER PILL AND ITS PANEL.
 *
 * Closed by default and opened by the reader, which is the source's own
 * arrangement — the panel is an answer to a question most readers never ask,
 * and a page that opens with its own footnote has buried the thing it is about.
 *
 * DISMISS IS NOT PERSISTED. The source remembers it per page in the browser;
 * that is a preference store this route does not have, and inventing one for a
 * single pill would be more machinery than the pill is worth. Closing it closes
 * it for the visit.
 *
 * ── IT WAS BRIEFLY DELETED, AND PUT BACK ──
 *
 * Reading the pill as clutter because no other page on this shell has one. It
 * was wanted; what was wanted was ROOM around it — see `.ppf-why` in
 * `billing.css`. Recorded because the observation that prompted the deletion is
 * still true and still worth acting on one day: this is a second copy of
 * `_components/portal-page-purpose.tsx`, which remembers its dismissal per
 * route and reads its sentence from `PAGE_PURPOSE`. `PortalShell` renders that
 * one, and these pages wear `Chrome`, so none of them can reach it. Rendering
 * `<PortalPagePurpose />` in `Chrome` would replace this component and light
 * the pill on the other six pages too — that is the real fix, and it is a
 * bigger change than a spacing note should carry.
 */

export function WhyThisPage({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="ppf-why"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        ⓘ Why this page?
      </button>
      {open ? (
        <div className="ppf">
          <span aria-hidden="true">ⓘ</span>
          <span>{children}</span>
          <button
            type="button"
            className="ppf-x"
            onClick={() => setOpen(false)}
            aria-label="Dismiss this explainer"
          >
            ✕
          </button>
        </div>
      ) : null}
    </>
  );
}

/**
 * ONE COLLAPSIBLE SECTION.
 *
 * `<details>` / `<summary>`, which is the source's own choice and the right
 * one: the open state belongs to the browser, it needs no React, and the
 * keyboard and screen-reader disclosure behavior comes for free. The "▾ show"
 * / "▴ hide" affordance is `summary::after` in `billing.css`, so it cannot fall
 * out of step with whether the section is actually open.
 */
export function Fold({
  title,
  id,
  open = false,
  children,
}: {
  title: string;
  id?: string;
  /** open on arrival — the plan comparison is, the three below it are not */
  open?: boolean;
  children: ReactNode;
}) {
  return (
    <details className="bill-fold" id={id} open={open}>
      <summary>{title}</summary>
      <div className="bf-body">{children}</div>
    </details>
  );
}

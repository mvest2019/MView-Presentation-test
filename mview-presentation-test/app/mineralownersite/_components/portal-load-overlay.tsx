"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * THE PORTAL'S LOAD OVERLAY — the one way a loader covers the dashboard.
 *
 * ── IT COVERS THE CONTENT AREA, NOT THE CHROME (requested) ──
 *
 * The first cut was a fixed, full-viewport navy sheet, and it read as a
 * different product: the sidebar and the value bar vanished behind it on every
 * entry. What loads is the ROUTE CONTENT — `.app-body`, the region right of
 * the sidebar and under the top bar — so that is what the loader covers now,
 * in the page's own background rather than a color of its own, with the chrome
 * staying put around it.
 *
 * ── HOW IT FINDS THAT REGION ──
 *
 * After mount it portals itself into `.app-body` (nudged to
 * `position: relative` when the sheet leaves it static) and covers it with
 * `inset: 0` — measured off the real layout, so every breakpoint and sidebar
 * state is right by construction. `.app-body` is thousands of pixels tall, so
 * the spinner sits in a sticky, viewport-high band rather than at the true
 * middle of the scroll run, where nobody would see it.
 *
 * Before hydration — and in the odd render where the shell is not on the page
 * — it falls back to a fixed sheet in the same quiet background. That is the
 * price of being IN THE SERVER HTML, which is the whole point: the unclaimed
 * state must never be the first paint, and a loader that mounts with React is
 * exactly one flash too late.
 *
 * THE CHROME OUTRANKS THE FALLBACK. The sheet sits at `z-index: 40`, below the
 * top bar's own 50 and the phone bottom bar's 120 — and the one piece of
 * chrome the reference sheet leaves at `z-index: auto`, the sidebar, is lifted
 * to 41 by the style tag below. So even in the fixed frames before hydration
 * the member sees the whole shell around a quiet loading pane (screenshotted
 * the other way: a blank white strip where the sidebar belonged), and the only
 * thing the sheet ever hides is route content.
 */

/** `body`'s own background — the loader is the page resting, not a new color. */
const PAGE_BG = "rgb(246, 247, 249)";

export function PortalLoadOverlay({
  fading = false,
  children,
}: {
  /** Fade the overlay out; the caller unmounts it when the fade lands. */
  fading?: boolean;
  /** Status lines under the spinner. Nothing = just the spinner. */
  children?: ReactNode;
}) {
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    /* A macrotask after mount, so the shell rendered beside this component has
       its DOM up — and so the state write is not synchronous in the effect.
       A `requestAnimationFrame` was the first cut and it was wrong in a way
       that matters: browsers suspend animation frames entirely for a hidden
       page, so a dashboard opened in a background tab would never re-home the
       overlay at all. A timeout fires regardless of visibility. */
    const timer = setTimeout(() => {
      const body = document.querySelector<HTMLElement>(".app-body");
      if (!body) return;
      if (getComputedStyle(body).position === "static") {
        body.style.position = "relative";
      }
      setHost(body);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const sheet: CSSProperties = {
    position: host ? "absolute" : "fixed",
    inset: 0,
    zIndex: 40,
    background: PAGE_BG,
    opacity: fading ? 0 : 1,
    transition: "opacity 320ms ease",
    pointerEvents: fading ? "none" : "auto",
  };

  const node = (
    <div role="status" aria-live="polite" data-mv-load-overlay style={sheet}>
      <style>
        {"@keyframes mvPortalSpin{to{transform:rotate(360deg)}}" +
          /* The sidebar above the fixed fallback — see the header note. */
          ".mv-ref-app .app-side{z-index:41}"}
      </style>
      <div
        style={{
          position: "sticky",
          top: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          height: "min(100%, 100vh)",
          padding: 24,
          textAlign: "center",
          color: "#22303c",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            border: "3px solid rgba(34, 48, 60, .14)",
            borderTopColor: "#1f8a5d",
            animation: "mvPortalSpin .8s linear infinite",
          }}
        />
        {children}
      </div>
    </div>
  );

  return host ? createPortal(node, host) : node;
}

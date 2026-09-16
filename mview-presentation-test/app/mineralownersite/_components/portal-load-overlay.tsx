"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
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
 * IT KEEPS LOOKING, AND IT INSISTS ON A VISIBLE HOST. The first cut checked
 * once, a tick after mount — and on a deployment where the shell arrives late
 * (the payload read fails server-side and `Portal` fetches it client-side, or
 * the shell's own `in-app` class has not landed and `.app-shell` is still
 * `display:none`) that one look missed, so the loader stayed a full-viewport
 * sheet with the spinner centred on the WINDOW instead of the content area —
 * screenshotted on the Vercel deployment. Worse, portalling into a container
 * that is still `display:none` would make the loader itself invisible: a blank
 * page. So the poll runs until it finds `.app-body` RENDERED — `offsetWidth`
 * says so — and only then re-homes; `onHosted` tells the caller the shell is
 * actually on screen, which is what the veil times its exit from.
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
 *
 * AND THE FALLBACK STARTS WHERE IT WILL END. Centring the fixed sheet on the
 * viewport put the spinner left of the content area's middle, and the re-home
 * then JUMPED it to the true centre — "it show one side and after some time
 * show middle", accurately. So the fallback leaves the sidebar's 236px alone
 * from the first server-rendered frame, by CSS, at the same `1024px`
 * breakpoint the reference sheet hides the sidebar under — the spinner starts
 * at the content middle and the re-home changes nothing a reader can see. The
 * one number this borrows from `dashboard-reference.css` is that 236px column;
 * the sheet is a frozen reference copy, and the poll corrects any drift a beat
 * later anyway.
 */

/** `body`'s own background — the loader is the page resting, not a new color. */
const PAGE_BG = "rgb(246, 247, 249)";

/** How often the overlay looks for a rendered `.app-body` to live in. */
const HOST_POLL_MS = 150;

export function PortalLoadOverlay({
  fading = false,
  onHosted,
  children,
}: {
  /** Fade the overlay out; the caller unmounts it when the fade lands. */
  fading?: boolean;
  /** Called once, when the overlay has re-homed into a VISIBLE `.app-body` —
   *  i.e. the shell is genuinely on screen behind the loader. */
  onHosted?: () => void;
  /** Status lines under the spinner. Nothing = just the spinner. */
  children?: ReactNode;
}) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const onHostedRef = useRef(onHosted);
  useEffect(() => {
    onHostedRef.current = onHosted;
  });

  useEffect(() => {
    /* Timers, never `requestAnimationFrame`: browsers suspend animation frames
       entirely for a hidden page, so a dashboard opened in a background tab
       would never re-home the overlay at all. */
    const look = () => {
      const body = document.querySelector<HTMLElement>(".app-body");
      /* RENDERED, not merely present — see the header. `offsetWidth` is 0 for
         as long as any ancestor keeps it `display:none`. */
      if (!body || body.offsetWidth === 0) return false;
      if (getComputedStyle(body).position === "static") {
        body.style.position = "relative";
      }
      setHost(body);
      onHostedRef.current?.();
      return true;
    };
    const timer = setInterval(() => {
      if (look()) clearInterval(timer);
    }, HOST_POLL_MS);
    return () => clearInterval(timer);
  }, []);

  const sheet: CSSProperties = {
    /* The fallback's `left` comes from the class below, NOT from `inset` —
       an inline `inset` would outrank the media query that keeps the sidebar's
       column clear. */
    ...(host
      ? { position: "absolute" as const, inset: 0 }
      : { position: "fixed" as const, top: 0, right: 0, bottom: 0 }),
    zIndex: 40,
    background: PAGE_BG,
    opacity: fading ? 0 : 1,
    transition: "opacity 320ms ease",
    pointerEvents: fading ? "none" : "auto",
  };

  const node = (
    <div
      role="status"
      aria-live="polite"
      data-mv-load-overlay
      className={host ? undefined : "mv-plo-fixed"}
      style={sheet}
    >
      <style>
        {"@keyframes mvPortalSpin{to{transform:rotate(360deg)}}" +
          /* The sidebar above the fixed fallback — see the header note. */
          ".mv-ref-app .app-side{z-index:41}" +
          /* The fallback starts where it will end — see the header note. The
             1024px line is the reference sheet's own sidebar breakpoint. */
          ".mv-plo-fixed{left:0}" +
          "@media (min-width:1025px){.mv-plo-fixed{left:236px}}"}
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

"use client";

import { reportRail } from "../../_lib/portal-briefing-data";
import { useReportJump } from "./report-jump";

/**
 * The report's stepper — v49 · OWNER-50.
 *
 * Ryan's note on this module: "a lot of words… nothing sexy or clear… shallow
 * enough that a user won't drown but deep enough they never reach the bottom".
 * The rail is what stops the second half of that from feeling like the first.
 * Five numbered pages plus the monthly and the archive, each with its minute
 * mark, so the reader always knows where they are and how much deeper it goes.
 *
 * IT SHARES ONE MECHANISM WITH EVERY OTHER WAY INTO THE DOCUMENT — the cover's
 * four "Page N →" links and the in-copy pointers all call the same `?jump=`
 * action. See `report-jump.tsx` for why that is URL state and not a scroll
 * call: a rail that scrolled on its own would work while the cover links sat
 * dead, and none of it would be shareable.
 *
 * A PAGE CLICK IN ESSENTIALS DEEPENS THE VIEW FIRST. Only the cover renders at
 * that density, so scrolling to page 3 would do nothing visible; the click
 * means "show me that", not "move me there". `useReportJump` owns that rule.
 *
 * NAVIGATION, NOT CONTENT — `wr-noprint`. A printed report has page numbers on
 * the paper; a stepper on it would be furniture.
 */
export function ReportRail() {
  const jumpTo = useReportJump();

  return (
    <div
      className="wr-rail wr-noprint"
      role="navigation"
      aria-label="Report pages"
    >
      {reportRail.map((stop) => (
        <button
          key={stop.target}
          type="button"
          onClick={() => jumpTo(stop.target)}
        >
          <span className="rl-n">{stop.mark}</span>
          <span className="rl-t">{stop.title}</span>
          <span className="rl-s">{stop.sub}</span>
        </button>
      ))}
    </div>
  );
}

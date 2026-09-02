"use client";

import { useState } from "react";

/**
 * The two browser-side buttons the report and the activity view need, and
 * nothing else.
 *
 * WHY THEY ARE THEIR OWN CLIENT COMPONENTS. Both routes are server components
 * top to bottom — that is the portal's whole rendering model, and the reason a
 * density change re-renders one `<div>` rather than a page of cards. These two
 * controls genuinely need the browser (one calls `window.print`, one holds a
 * clicked/not-clicked flag), so they are isolated here as the smallest possible
 * client leaves rather than making a page of static report copy interactive.
 */

/**
 * "Print / Save as PDF".
 *
 * IT OPENS THE BROWSER'S OWN PRINT PREVIEW, deliberately, and the label says so
 * — a button that silently produced a file would be a worse surprise than one
 * that shows the dialog. `portal.css`'s print block is what turns the five
 * `.wr-page` sections into five real pages and drops the chrome.
 */
export function PrintButton({
  className = "btn btn-primary btn-sm",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button type="button" className={className} onClick={() => window.print()}>
      {children}
    </button>
  );
}

/**
 * A prototype acknowledgement — the button becomes its own confirmation.
 *
 * THE "(prototype)" IN THE DONE LABEL IS LOAD-BEARING and comes straight from
 * the reference. "Email me this report" that silently does nothing is a lie;
 * one that says "Sent ✓" is a worse one. Saying "Sent — summary + link ✓
 * (prototype)" is honest about a control that is wired to nothing yet, on a
 * demo whose entire pitch is that it never invents data.
 *
 * It does not revert. The click is a one-way acknowledgement, so re-arming the
 * button would invite a reviewer to press it twice and wonder which press
 * counted.
 */
export function AckButton({
  label,
  done,
  className = "btn btn-ghost btn-sm",
  title,
  style,
}: {
  label: string;
  done: string;
  className?: string;
  title?: string;
  style?: React.CSSProperties;
}) {
  const [clicked, setClicked] = useState(false);

  return (
    <button
      type="button"
      className={className}
      title={title}
      style={style}
      onClick={() => setClicked(true)}
    >
      {clicked ? done : label}
    </button>
  );
}

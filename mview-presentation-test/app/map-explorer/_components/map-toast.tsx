"use client";

import { Check } from "lucide-react";
import { useEffect } from "react";

/*
 * A line that confirms something happened, then takes itself away.
 *
 * For work the map does elsewhere on screen: applying a filter reloads the
 * wells and moves the view, and when the matches are off where the reader was
 * looking, the only evidence is a map that has changed under them. This says
 * so in one line.
 *
 * Not an error channel. Failures belong beside the thing that failed, where
 * they can stay on screen and be read twice; this is for the ordinary case and
 * disappears on its own.
 */

/** How long it stays. Long enough to read twice, short enough not to nag. */
const LINGER_MS = 2600;

export function MapToast({
  message,
  onDone,
}: {
  message: string;
  /** Cleared by the toast itself once its time is up. */
  onDone: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onDone, LINGER_MS);
    return () => clearTimeout(timer);
    /* Keyed by the message where it is rendered, so a second confirmation
       restarts the clock rather than inheriting the first one's. */
  }, [message, onDone]);

  return (
    <div
      role="status"
      aria-live="polite"
      /* Top of the map from `lg` up, in the run of space left of the toolbar
         — the toolbar is held to the right there, so nothing is covered and
         the line is read where the eye already is. On a phone the toolbar is
         two rows across the whole width, so the only clear place is under it,
         centred. */
      className="pointer-events-none absolute left-1/2 top-[128px] z-40 flex max-w-[calc(100%-24px)] -translate-x-1/2 items-center gap-[9px] rounded-full border border-[#bfe3cc] bg-white px-[15px] py-[9px] shadow-mv-lg lg:left-[288px] lg:top-4 lg:translate-x-0"
    >
      <span
        aria-hidden="true"
        className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-mv-green-deep text-white"
      >
        <Check size={11} strokeWidth={3.5} />
      </span>
      <span className="text-[12.5px] font-semibold leading-none text-mv-ink">
        {message}
      </span>
    </div>
  );
}

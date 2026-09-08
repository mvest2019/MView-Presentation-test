"use client";

import { Sparkles, X } from "lucide-react";

/*
 * The line over the middle of the map while a tool is showing its sample.
 *
 * The card on the sample itself says what the sample is, but the card sits
 * over the drawing and reads as part of it. This is the sentence that names
 * the whole thing for what it is — a demonstration, yours to close — and it
 * says which gesture to make once it is gone.
 *
 * Over the map rather than tucked under the toolbar: against a map full of
 * bubbles and boundaries a line at the top edge is one more piece of chrome to
 * skip over, and this is the one thing that has to be read. A little above the
 * middle: dead centre it sat on top of the watch and tract cards, which open
 * from the bottom of the map.
 */

/** What to do, per tool, once the sample is out of the way. */
const GESTURE: Record<string, string> = {
  "draw-area": "press and drag a box anywhere on the map",
  "measure-distance": "drag between any two points",
  "whats-near-my-land": "click the point you want to watch",
  "measure-area": "click your own corners, then click the first again",
};

export function SampleBanner({
  tool,
  onDismiss,
}: {
  tool: string;
  onDismiss: () => void;
}) {
  const gesture = GESTURE[tool];
  if (!gesture) return null;

  return (
    <div className="pointer-events-none absolute left-1/2 top-[38%] z-30 w-max max-w-[calc(100%-24px)] -translate-x-1/2 -translate-y-1/2">
      <div className="pointer-events-auto flex items-center gap-[11px] rounded-full border border-[#cfe8da] bg-white/97 py-[9px] pl-[15px] pr-[8px] shadow-mv-lg">
        <span
          aria-hidden="true"
          className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full bg-mv-mint text-mv-green-deep"
        >
          <Sparkles size={14} strokeWidth={2.25} />
        </span>

        <p className="text-[13.5px] leading-snug text-mv-slate">
          <span className="font-bold text-mv-ink">This is a sample</span> — close
          it and try it yourself: {gesture}.
        </p>

        <button
          type="button"
          onClick={onDismiss}
          aria-label="Close the sample"
          title="Close the sample"
          className="grid h-[26px] w-[26px] shrink-0 cursor-pointer place-items-center rounded-full text-mv-muted hover:bg-mv-red-bg hover:text-mv-red"
        >
          <X size={14} strokeWidth={2.5} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

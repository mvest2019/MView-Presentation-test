"use client";

import { Info } from "lucide-react";

/*
 * The i beside a label, and what it says on hover.
 *
 * Shared by the tool cards, which are the two places on the map where a figure
 * is reported without room to say what it is: "Wells per section" and "Nearest
 * bore" are both arrived at rather than counted, and neither is guessable from
 * its own name.
 *
 * Held to the left or right edge of whatever it sits in rather than centred on
 * the mark: these cards are 336 and 380 wide, and there is no room for a card
 * centred on something in a right-hand column.
 *
 * Labels on these cards are uppercased and letter-spaced by their own class,
 * and both inherit, so the hint puts them back or it comes out shouting.
 */
export function Hint({
  text,
  side = "left",
}: {
  text: string;
  side?: "left" | "right";
}) {
  return (
    <span className="group/hint relative inline-flex shrink-0">
      <Info
        size={11}
        strokeWidth={2.5}
        aria-hidden="true"
        className="text-[#b6bcc4] group-hover/hint:text-mv-green-deep"
      />

      <span
        role="tooltip"
        className={`pointer-events-none absolute top-full z-50 mt-[7px] hidden w-[212px] rounded-lg bg-white px-[11px] py-[9px] text-[11px] font-medium normal-case leading-snug tracking-normal text-mv-slate shadow-mv-lg ring-1 ring-mv-line group-hover/hint:block group-focus-within/hint:block ${
          side === "right" ? "right-0" : "left-0"
        }`}
      >
        {text}
      </span>
    </span>
  );
}

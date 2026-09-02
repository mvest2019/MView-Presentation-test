import type { ReactNode } from "react";

/**
 * THE PORTAL'S NOTICE — `portal.css`'s `.notice` family as Tailwind.
 *
 * A tinted panel with a glyph, for the paragraph of context that is not a card
 * and not a chip. Four tones, and the tone is the meaning:
 *
 *   mint    helpful, no action needed — "every lease opens a full report"
 *   slate   a methodology note — the two-honest-numbers explanation
 *   gold    worth your attention
 *   amber   something is off
 *
 * THE GLYPH IS `aria-hidden`. Every one of these is a decorative dingbat (▤ ✚ ⚖)
 * whose meaning is already in the sentence beside it, and a screen reader
 * announcing "black rectangle" before "Every lease opens a full report" is
 * noise. `flex-none` so a long paragraph never squeezes it to nothing.
 */

export type NoticeTone = "mint" | "slate" | "gold" | "amber";

const TONES: Record<NoticeTone, string> = {
  mint: "bg-mv-mint text-mv-green-ink",
  slate: "bg-mv-portal-wash text-mv-slate",
  /* The design's only two literals not in the token set — a warm sand tint and
     its ink. `mv-sand-tint`/`mv-sand` are the nearest existing pair and match
     the intent (a warm attention wash), so they are reused rather than adding a
     ninth portal token for one notice. */
  gold: "bg-mv-sand-tint text-mv-sand",
  amber: "bg-mv-amber-bg text-mv-amber",
};

export function Notice({
  tone = "mint",
  glyph,
  className = "",
  children,
}: {
  tone?: NoticeTone;
  /** One character. Decorative — see the note above. */
  glyph: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`flex items-start gap-[10px] rounded-[10px] px-4 py-[13px] text-[13.5px] leading-[1.5] ${TONES[tone]} ${className}`.trim()}
      role="note"
    >
      <span aria-hidden="true" className="flex-none">
        {glyph}
      </span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

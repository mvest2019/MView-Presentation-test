import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../../../_components/ui/tooltip";

/**
 * THE `why?` GLOSS — v30's answer to the question every inbox provokes.
 *
 * ── WHAT IT IS FOR ──
 *
 * "Why am I getting this?" is the question that turns an alert into a
 * notification the reader wants to switch off. The onboarding-retention audit's
 * fix (v30 · P2) was to answer it on the alert itself, in one sentence, naming
 * the rule that fired: activity within a mile of a lease you own; a produced
 * month on a lease you own; a post in a group you belong to. Each answer also
 * says what CLASS the alert is, which is the thing the reader can actually tune
 * in Settings — so the gloss is the door to the preference, not just an apology
 * for the interruption.
 *
 * ── WHY A TOOLTIP AND NOT AN EXPANDER ──
 *
 * `portal-ui.md` puts a native `<details>` ahead of a JavaScript disclosure, and
 * that is right for the row's explainer — a panel with headings that should
 * print and survive in-page search. This is a different thing: one sentence,
 * attached to a word INSIDE a heading line, appearing beside the row's own
 * expander. A second `<details>` there gives the reader two triangles on one line
 * and no way to tell which opens the essay.
 *
 * So it uses the app's existing Radix tooltip, whose one non-standard feature is
 * exactly what this needs: it opens on TAP as well as hover. See the long note in
 * `app/_components/ui/tooltip.tsx` — a plain Radix tooltip is inert on a phone,
 * and half the portal's readers are on one.
 *
 * ── THE TRIGGER IS A REAL BUTTON ──
 *
 * The reference uses `<span tabindex="0" data-def="…">`, which is focusable but
 * announces nothing and does not respond to Enter. A `<button>` gets keyboard
 * activation, a role and the tooltip's text as its description for free.
 */
export function AlertWhy({ children }: { children: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label="Why you're seeing this alert"
          /* No font declarations: Tailwind's preflight already sets
             `font: inherit` on `button`, so the word matches the 11px line it
             sits in without restating the scale. */
          className="cursor-help border-0 border-b-[1.5px] border-dotted border-b-mv-green-deep bg-transparent p-0 text-inherit"
        >
          why?
        </button>
      </TooltipTrigger>
      <TooltipContent>{children}</TooltipContent>
    </Tooltip>
  );
}

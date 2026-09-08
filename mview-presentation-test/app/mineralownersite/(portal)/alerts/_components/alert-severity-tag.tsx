import type { AlertSeverity } from "../_lib/alert-types";

/**
 * "ACTION RECOMMENDED" / "IMPORTANT" — `v40css.css`'s `.al-sev`.
 *
 * ── COLOUR IS NEVER THE SIGNAL, THE WORDS ARE ──
 *
 * V40-AL-SEV, and the reference names the reviewer who asked for it: the tag
 * carries a tint AND the label, never a tint alone, so a colour-blind reader
 * sorts the inbox by reading it rather than by hoping. That is also why there is
 * no `severity: "info"` rendering here even though the stylesheet defines
 * `.s-info` and `.s-comm` — no row in the design wears them, and a third and
 * fourth tag colour that says nothing the sentence does not would dilute the two
 * that do.
 *
 * ── MOST ROWS HAVE NO TAG AT ALL ──
 *
 * Two of nine. A tag on every row is a page where nothing stands out, which is
 * the failure mode an inbox has: the reader stops reading the tags and the one
 * that mattered goes with them. Rendering `null` for the other seven is the
 * component's most important behaviour.
 */

const LABELS: Record<AlertSeverity, string> = {
  action: "Action recommended",
  important: "Important",
};

/* The six literals are the design's own; see the note beside them in
   `app/globals.css` for why they are not the nearby amber/red tokens. */
const TONES: Record<AlertSeverity, string> = {
  action:
    "border-mv-portal-sev-act-line bg-mv-portal-sev-act-bg text-mv-portal-sev-act-ink",
  important:
    "border-mv-portal-sev-imp-line bg-mv-portal-sev-imp-bg text-mv-portal-sev-imp-ink",
};

export function AlertSeverityTag({
  severity,
}: {
  severity?: AlertSeverity;
}) {
  if (!severity) return null;

  return (
    <span
      className={`mr-1.5 inline-block rounded-full border px-[9px] py-[2px] align-[1px] text-[9.5px] leading-normal font-extrabold tracking-[0.04em] uppercase ${TONES[severity]}`}
    >
      {LABELS[severity]}
    </span>
  );
}

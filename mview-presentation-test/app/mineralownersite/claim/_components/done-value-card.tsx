import { Badge } from "../../_components/ui/badge";
import { unlockPreview } from "../_lib/claim-plans";
import { money } from "../_lib/claim-totals";

/**
 * "YOUR ESTIMATED YEARLY VALUE" — the completion screen's last rail card.
 *
 * ── IT IS NOT `UnlockCard`, AND THAT IS DELIBERATE ──
 *
 * Same figures, different claim about them. Step 2's card is headed "What
 * you'll unlock" behind a padlock, because at that point the reader has
 * verified nothing and the number is a product illustration held away from
 * them. Here the record IS claimed, so the padlock and the "you'll unlock"
 * framing would be describing a gate that no longer exists — the heading is
 * simply what the figure is.
 *
 * Reusing one component with a `tone` prop was the alternative and it would
 * have coupled the two. They share a ground now, but not a shape: step 2's card
 * opens with a padlock and a "What you'll unlock" heading in sentence case,
 * this one opens on the figure under an uppercase eyebrow like the rail cards
 * beside it. Two small components that share a data source beat one component
 * with a mode switch.
 *
 * ── THE SAND GROUND IS THE ESTIMATE TONE ──
 *
 * It was white, and is now the same sand as step 2's card (requested). That is
 * not only for the pair to match: sand/amber is already what this portal uses to
 * mark a figure as MODELLED — it is the ground under the "Estimate — not an
 * appraisal" badge in `ui/badge.tsx`. A card whose entire content is a modelled
 * estimate wearing that tone is carrying meaning rather than decoration, and it
 * separates the one uncertain number in the rail from the settled facts on the
 * white cards above it.
 *
 * ── THE HONESTY LABEL SURVIVES THE MOVE ──
 *
 * The modelled range and "estimates, not an appraisal" come with the number
 * wherever it goes. This screen is the one a reader screenshots.
 */
export function DoneValueCard() {
  return (
    <section
      className="rounded-mv border border-mv-sand-line bg-mv-sand-tint p-[18px]"
      aria-label="Your estimated yearly value"
    >
      <h2 className="text-[10.5px] font-bold tracking-[.12em] text-mv-muted uppercase">
        Your estimated yearly value
      </h2>
      <p className="mt-[3px] text-[24px] font-extrabold tracking-[-.02em] text-mv-ink">
        {money(unlockPreview.yearlyValue)}
      </p>
      <p className="mt-[2px] text-[11px] leading-[1.45] text-mv-muted">
        Modeled range {money(unlockPreview.rangeLow)} –{" "}
        {money(unlockPreview.rangeHigh)} · estimates, not an appraisal.
      </p>

      <h3 className="mt-3 border-t border-mv-sand-line pt-3 text-[10.5px] font-bold tracking-[.12em] text-mv-muted uppercase">
        Sample details
      </h3>
      <ul className="mt-[7px] grid gap-[5px]">
        {unlockPreview.samples.map((sample) => (
          <li
            key={sample.name}
            className="flex items-center justify-between gap-2 text-[12px] text-mv-slate"
          >
            <span className="truncate">{sample.name}</span>
            <Badge
              tone={sample.producing ? "mint" : "slate"}
              size="xs"
              className="flex-none"
            >
              {sample.producing ? "producing" : "inactive"}
            </Badge>
          </li>
        ))}
      </ul>

      <h3 className="mt-3 border-t border-mv-sand-line pt-3 text-[10.5px] font-bold tracking-[.12em] text-mv-muted uppercase">
        What arrives weekly
      </h3>
      <ul className="mt-[7px] grid gap-[4px]">
        {unlockPreview.weekly.map((line) => (
          <li
            key={line}
            className="flex items-start gap-2 text-[11.5px] leading-[1.45] text-mv-muted"
          >
            <span aria-hidden="true" className="text-mv-green-deep">
              ✓
            </span>
            {line}
          </li>
        ))}
      </ul>
    </section>
  );
}

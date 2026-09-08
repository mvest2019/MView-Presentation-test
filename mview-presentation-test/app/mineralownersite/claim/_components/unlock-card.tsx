import { Check, Lock } from "lucide-react";

import { Badge } from "../../_components/ui/badge";
import { unlockPreview } from "../_lib/claim-plans";
import { money } from "../_lib/claim-totals";

/**
 * WHAT YOU'LL UNLOCK — step 2's rail card.
 *
 * ── IT SITS BESIDE THREE RECORDS WHOSE VALUES ARE WITHHELD, AND THAT IS THE
 *    WHOLE DESIGN PROBLEM ──
 *
 * A confident dollar figure in the rail, next to `$•,•••` in the main column, is
 * one glance away from being read as candidate 1's number. It is not — it is a
 * product illustration. So everything here is marked as a sample: the lease
 * names are invented ones that appear nowhere else in this flow, the figure
 * carries a modelled RANGE rather than standing alone, and the heading says
 * "you'll unlock" rather than naming a record. The padlock in the heading is the
 * same point in one glyph: this is the locked view, not this record's view.
 *
 * ── THE TYPOGRAPHY IS SENTENCE CASE, AND THE SECTIONS ARE RULED ──
 *
 * Three uppercase letter-spaced eyebrows stacked down one narrow card read as
 * three headings of equal weight, which is what made this the loudest thing in
 * a rail whose job is to be secondary. Sentence-case headings with a hairline
 * between each block give the same structure at a fraction of the volume, and
 * the money figure — the one thing here worth a glance — is left as the only
 * large element.
 *
 * The sand ground is unchanged (requested); only the contents were restyled.
 */
export function UnlockCard() {
  return (
    <section
      className="rounded-mv border border-mv-sand-line bg-mv-sand-tint p-[18px]"
      aria-label="What you'll unlock"
    >
      <h2 className="flex items-center gap-[8px] text-[15px] font-extrabold tracking-[-.01em] text-mv-ink">
        <Lock
          aria-hidden="true"
          className="h-[15px] w-[15px] flex-none text-mv-green-deep"
        />
        What you&rsquo;ll unlock
      </h2>

      <p className="mt-[10px] text-[12.5px] font-semibold text-mv-green-deep">
        Estimated yearly value
      </p>
      <p className="mt-[1px] text-[24px] font-extrabold tracking-[-.02em] text-mv-ink">
        {money(unlockPreview.yearlyValue)}
      </p>
      <p className="mt-[3px] text-[11.5px] leading-[1.45] text-mv-muted">
        Modeled range {money(unlockPreview.rangeLow)} –{" "}
        {money(unlockPreview.rangeHigh)} · estimates, not an appraisal.
      </p>

      <div className="mt-3 border-t border-mv-sand-line pt-3">
        <h3 className="text-[13px] font-bold text-mv-ink">Sample details</h3>
        <ul className="mt-[8px] grid gap-[6px]">
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
                {sample.producing ? "Producing" : "Inactive"}
              </Badge>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-3 border-t border-mv-sand-line pt-3">
        <h3 className="text-[13px] font-bold text-mv-ink">
          What arrives weekly
        </h3>
        <ul className="mt-[8px] grid gap-[5px]">
          {unlockPreview.weekly.map((line) => (
            <li
              key={line}
              className="flex items-start gap-2 text-[12px] leading-[1.45] text-mv-slate"
            >
              <Check
                aria-hidden="true"
                className="mt-[2px] h-[12px] w-[12px] flex-none text-mv-green-deep"
                strokeWidth={3}
              />
              {line}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

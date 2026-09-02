import { Badge } from "../../_components/ui/badge";
import { Card } from "../../_components/ui/card";
import { gates } from "../../_components/ui/portal-gating";
import { ViewTierLink } from "../../_components/ui/view-tier-link";
import { alertCounts } from "../_lib/alert-counts";
import { alertPhrases, numberWord } from "../_lib/alert-phrases";

/**
 * "YOUR ALERTS, IN ONE LINE" — the Essentials tier's front door.
 *
 * ── THE SENTENCE HAS TO AGREE WITH THE LIST BELOW IT, AND ONCE DID NOT ──
 *
 * v43 · OW-33 records the defect: this card said "Six things changed" while the
 * list under it held NINE and the filter row said 9. Three numbers, two of them
 * wrong, on the one card whose entire job is to save the reader from counting.
 *
 * So every figure in it is derived — `alertCounts` counts `alertRecords`, and
 * `alertPhrases` spells the result out. The sentence cannot disagree with the
 * list because it is generated from the list. This is the same fix as the watch
 * ledger's, applied to prose.
 *
 * ── "ONE ASKS SOMETHING OF YOU" IS THE WHOLE POINT OF THE CARD ──
 *
 * Nine changes with no ranking is nine things to worry about. Naming the one
 * that matters, and then saying plainly that the other eight are good news,
 * neighbours at work, or context, is what turns an inbox into a report.
 *
 * ── THE THREE AUDIT CHIPS (v41 · AUDIT #23) ──
 *
 * They surface the Lease Audit's price in Essentials too, because the one action
 * this page recommends costs money and the reader should not have to click
 * through to find out how much. All three point at the same built destination —
 * the marketing Lease Audit page — since the in-portal explainers they opened do
 * not exist here.
 */
export function AlertsEssentialsHero() {
  return (
    <Card accent className={`my-2.5 ${gates("essentialsOnly")}`}>
      <h3 className="mb-1.5 text-base font-bold">Your alerts, in one line</h3>

      <p className="mb-2 text-[15px] leading-[1.5]">
        {/* Capitalised because it opens the sentence — the only place the phrase
            is used that way, so it is done here rather than in the helper. */}
        {capitalise(numberWord(alertCounts.total))} things changed, and{" "}
        <strong>
          {alertPhrases.actionWord.toLowerCase()}{" "}
          {alertPhrases.actionVerb} something of you
        </strong>
        : <strong>Ledbetter produced gas in months we can see</strong> — your
        included Lease Audit checks if you were paid. The other{" "}
        {alertPhrases.restWord} are good news, neighbours at work, or context.
      </p>

      <div className="mb-2.5 flex flex-wrap gap-1.5">
        <Badge tone="mint">✓ Included with 12-month Premium</Badge>
        <Badge tone="slate">Prefer not to subscribe? $500 once</Badge>
        <Badge tone="slate">A plain-English report</Badge>
      </div>

      {/* The one step out of the tier. A link, not `setViewTier('detailed')` —
          see `ViewTierLink` for why, and why it is not a bare `?view=`. */}
      <ViewTierLink tier="detailed">See the details</ViewTierLink>
    </Card>
  );
}

function capitalise(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

import { gates } from "../../_components/ui/portal-gating";
import { UltraHero } from "../../_components/ui/ultra-hero";
import { ViewTierLink } from "../../_components/ui/view-tier-link";
import { formatDollars, spellOut } from "../_lib/lease-format";
import { mvestimateTotal, portfolioSummary } from "../_lib/lease-totals";

/**
 * THE ULTRA TIER — the whole page, in three sentences.
 *
 * `tier-u`, and `portal.css` hides every sibling of it in this tier, so this IS
 * My Leases for a reader who has chosen the calmest view. What survives the cut
 * is the design's answer to "what does someone need if they only read one
 * screen": how many leases, what they are worth, and whether anything needs them
 * today.
 *
 * THE LAST SENTENCE IS THE POINT OF THE TIER. "Nothing about your leases needs
 * you today" is the only line here that is not a figure, and it is why somebody
 * would pick this view — the portal doing the watching so they do not have to.
 *
 * THE ACTION IS A LINK, not the prototype's `setViewTier('simple')` call.
 * Density in this build is a URL parameter the portal state provider reads, so
 * `?view=simple` walks the reader up a tier — and unlike the original it is
 * shareable, bookmarkable and survives the back button.
 */
/** "seven" -> "Seven". Only ever used to open a sentence. */
function capitalise(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

export function UltraSummary() {
  return (
    <div className={gates("ultraOnly")}>
      <UltraHero
        kicker="My leases"
        headline={
          <>
            All <strong>{portfolioSummary.leaseCount} leases</strong> are watched
          </>
        }
        status={
          <>
            Together they&apos;re worth{" "}
            <strong className="tabular-nums">
              about {formatDollars(mvestimateTotal)}
            </strong>{" "}
            {/* SPELLED OUT, not "7" and "3" — see `spellOut`. This is the
                sentence the design writes as "Seven are earning money; three
                are quiet", and the calm tier is exactly where that register
                matters. Capitalised because it opens the sentence. */}
            to you over six years.{" "}
            {capitalise(spellOut(portfolioSummary.producingCount))} are earning
            money; {spellOut(portfolioSummary.inactiveCount)} are quiet, which is
            normal for them. Nothing about your leases needs you today.
          </>
        }
        /* THE ONE ACTION THE TIER OFFERS. See `ViewTierLink` for why moving a
           tier is a link here, and why it is not a bare `?view=simple`. */
        action={
          <ViewTierLink tier="simple" variant="primary" size="lg">
            See the plain-English list
          </ViewTierLink>
        }
        note="We check every lease against the public record daily and will tell you if anything changes."
      />
    </div>
  );
}

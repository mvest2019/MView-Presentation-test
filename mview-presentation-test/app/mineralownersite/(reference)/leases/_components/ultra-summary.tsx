"use client";

import { gates } from "../../../_components/ui/portal-gating";
import { UltraHero } from "../../../_components/ui/ultra-hero";
import { formatCompactDollars } from "../_lib/lease-format";
import { useLeasesData } from "./leases-data";
import { PortfolioValueBand } from "./portfolio-value-band";

/**
 * MY LEASES AT ULTRA — one headline, one status, and the five figures.
 *
 * ── IT REPLACES THE PAGE RATHER THAN TOPPING IT ──
 *
 * `portal.css` hides every direct child of `.mv-dash-routes` that is not
 * `.tier-u` once the reader is in Ultra, so this block IS the page there. That
 * also means the page root cannot carry `mv-dash-routes` without something
 * like this existing: with the gate and no `tier-u` child, Ultra renders blank.
 *
 * ── THE BAND IS RENDERED HERE AS WELL AS ON THE PAGE, DELIBERATELY ──
 *
 * The value band has to appear in all four tiers, so it cannot carry `tier-u`
 * (which would hide it in the other three) and the dash-route rule exempts
 * nothing but `.tier-u`. Rendering it inside this block is the way to have it
 * survive: the page's own copy is swept away in Ultra and this one takes its
 * place, so exactly one is ever visible. The alternative was a new exemption in
 * `portal.css`, which would make a stylesheet rule know about one module.
 *
 * ── NO BUTTON, AND THAT IS THE TIER WORKING ──
 *
 * Ultra's promise is one headline and one status. An action here would be the
 * page asking for something at the density a reader chose precisely because
 * they did not want to be asked — the density switch in the account menu is
 * how they go deeper.
 *
 * THE STATUS IS DERIVED. How many leases are earning and whether any have gone
 * quiet come from the records, so a month where one stops saying so is a month
 * where this sentence changes. A calm tier that reports calm through a real
 * change is not calm, it is wrong.
 *
 * ── THE THREE FIGURES IN THIS SENTENCE ARE THE RECORD'S, NOT A FIXTURE'S ──
 *
 * The count, the money and the earning tally read `leaseRecords` and
 * `portfolioSummary` until now, which is how Ultra came to say "All 10 leases"
 * and "$4.44M" over a band already showing the member's own 4 leases and $6K.
 * A tier whose whole promise is ONE headline cannot have that headline be the
 * one wrong thing on the page. They come from the same read every other block
 * on this page uses — see `leases-data.tsx`.
 *
 * THE COUNT COMES FROM `totals` AND THE TALLY FROM THE LEASES, which is not an
 * inconsistency: `totals.leaseCount` is the whole record, while "how many are
 * earning" can only be counted from leases actually in hand. They agree
 * whenever the record fits inside the page cap, and when it does not, the
 * headline is still right about the record and the tally is still right about
 * what it counted.
 */
export function UltraSummary() {
  const data = useLeasesData();
  const totals = data?.totals ?? null;
  const leases = data?.leases ?? null;

  const earning = leases?.filter((lease) => lease.mvestimate > 0).length ?? 0;
  const quiet = (leases?.length ?? 0) - earning;

  return (
    <div className={gates("ultraOnly")}>
      <UltraHero
        kicker="My leases"
        /* UNTIL THE RECORD ARRIVES the headline names no number rather than
           naming a wrong one — a count that corrects itself a second later is
           the one thing a reader takes away from this tier. */
        headline={
          totals ? (
            <>
              All{" "}
              <strong>
                {totals.leaseCount} lease{totals.leaseCount === 1 ? "" : "s"}
              </strong>{" "}
              are watched
            </>
          ) : (
            <>Your leases are watched</>
          )
        }
        status={
          totals && leases ? (
            <>
              Together they are worth{" "}
              <strong>{formatCompactDollars(totals.ownerValue)}</strong> to you
              over the projection.{" "}
              {quiet > 0
                ? `${earning} ${earning === 1 ? "is" : "are"} earning; the rest are quiet, which is normal for them.`
                : `All ${earning} are earning.`}{" "}
              Nothing needs you today.
            </>
          ) : null
        }
        note="We check every lease against the public record and will tell you if anything changes."
        /* THE BAND IS THE CARD'S FOOT, not a second block under it. `rounded-none`
           and no shadow because it is inside the card now: a drop shadow on a
           block that meets its parent's edges draws a line where there is no
           edge. */
        footer={<PortfolioValueBand className="rounded-none! shadow-none!" />}
      />
    </div>
  );
}

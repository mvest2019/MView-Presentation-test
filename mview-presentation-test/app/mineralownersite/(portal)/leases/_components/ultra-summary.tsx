import { gates } from "../../../_components/ui/portal-gating";
import { UltraHero } from "../../../_components/ui/ultra-hero";
import { formatCompactDollars } from "../_lib/lease-format";
import { leaseRecords } from "../_lib/lease-records";
import { portfolioSummary } from "../_lib/lease-totals";
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
 */
export function UltraSummary() {
  const earning = leaseRecords.filter((lease) => lease.mvestimate > 0).length;
  const quiet = leaseRecords.length - earning;

  return (
    <div className={gates("ultraOnly")}>
      <UltraHero
        kicker="My leases"
        headline={
          <>
            All{" "}
            <strong>
              {portfolioSummary.leaseCount} lease
              {portfolioSummary.leaseCount === 1 ? "" : "s"}
            </strong>{" "}
            are watched
          </>
        }
        status={
          <>
            Together they are worth{" "}
            <strong>{formatCompactDollars(portfolioSummary.mvestimate)}</strong>{" "}
            to you over the projection.{" "}
            {quiet > 0
              ? `${earning} are earning; the rest are quiet, which is normal for them.`
              : `All ${earning} are earning.`}{" "}
            Nothing needs you today.
          </>
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

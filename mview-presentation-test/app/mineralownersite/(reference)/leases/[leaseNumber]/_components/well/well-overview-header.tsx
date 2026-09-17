import { Badge } from "../../../../../_components/ui/badge";
import type { WellReport } from "../../_lib/well-report";

/**
 * THE WELL REPORT'S OWN MASTHEAD.
 *
 * ── THE TAB STRIP IS NOT A TITLE ──
 *
 * This report opened straight onto six figures. The strip above says "Well
 * report" and the page header above THAT names the lease, so a reader arriving
 * had the lease's identity and the tab's name and nothing telling them what the
 * screen in front of them was about — the first thing on it was a number.
 *
 * One line does that job, and the sub-line says what the rest of the page
 * holds, which is the question a reader has before they start scrolling a
 * report this long.
 *
 * THERE IS NO EXPORT BUTTON. The mock puts one at the right of this row and it
 * was built and then removed on request. The lease header above this page
 * already carries "Download report" and "CSV" for the same well, so a third
 * export control here was a second door onto one action.
 *
 * ── THE STATUS CHIP READS FROM THE LEASE, NOT FROM A STRING HERE ──
 *
 * "Active" means this hole is on a lease the state still shows as producing. It
 * is the lease's own status rendered in the wellbore's language, so it cannot
 * say Active about a lease that has stopped — which a literal "Active" typed
 * into this file would happily do forever.
 */
export function WellOverviewHeader({ report }: { report: WellReport }) {
  const active = report.lease.status === "Producing";

  return (
    <div className="mt-4">
      <div>
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="text-[22px] leading-tight font-bold">Well Overview</h2>
          <Badge tone={active ? "mint" : "slate"} size="sm">
            <span
              aria-hidden="true"
              className={`h-[6px] w-[6px] rounded-full ${
                active ? "bg-mv-green-deep" : "bg-mv-muted"
              }`}
            />
            {active ? "Active" : "Not producing"}
          </Badge>
        </div>
        <p className="mt-1 text-[12.5px] text-mv-muted">
          Detailed production and reservoir information for this well
        </p>
      </div>
    </div>
  );
}

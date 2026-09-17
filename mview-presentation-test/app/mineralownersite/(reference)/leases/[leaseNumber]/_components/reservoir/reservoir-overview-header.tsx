import { Badge } from "../../../../../_components/ui/badge";
import type { ReservoirReport } from "../../_lib/reservoir-report";

/**
 * THE RESERVOIR REPORT'S MASTHEAD — the well report's, for the rock.
 *
 * Same reasoning as `well/well-overview-header.tsx`: the tab strip above says
 * "Reservoir report" and the page header names the lease, so without this a
 * reader arriving had the lease's identity and the tab's name and nothing
 * saying what the screen in front of them was about — the first thing on it was
 * a number.
 *
 * THE CHIP READS FROM THE LEASE, not from a string typed here, so it cannot go
 * on saying Active about a lease the state has stopped showing as producing.
 */
export function ReservoirOverviewHeader({
  report,
}: {
  report: ReservoirReport;
}) {
  const active = report.lease.status === "Producing";

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <h2 className="text-[22px] leading-tight font-bold">
          Reservoir Overview
        </h2>
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
        Production and reservoir detail for {report.name}, across every well you
        hold in it
      </p>
    </div>
  );
}

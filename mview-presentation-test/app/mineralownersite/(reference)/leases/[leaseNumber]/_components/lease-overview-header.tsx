import { Badge } from "../../../../_components/ui/badge";
import type { LeaseRecord } from "../../_lib/lease-types";

/**
 * THE LEASE REPORT'S MASTHEAD — the third of the set.
 *
 * The well and reservoir reports each open with one of these, and this one
 * exists so the three tabs open the same way: a reader moving between them
 * should be told what the screen is without having to infer it from the tab
 * they happened to click.
 *
 * THE CHIP READS FROM THE LEASE, not from a string typed here, so it cannot go
 * on saying Active about a lease the state has stopped showing as producing.
 */
export function LeaseOverviewHeader({ lease }: { lease: LeaseRecord }) {
  const active = lease.status === "Producing";

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <h2 className="text-[22px] leading-tight font-bold">Lease Overview</h2>
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
        What this lease has filed, what it is worth, and what the model expects
        next
      </p>
    </div>
  );
}

import { Badge } from "../../../_components/ui/badge";
import { Card, CardHeader, StatRow } from "../../../_components/ui/card";
import { gates } from "../../../_components/ui/portal-gating";
import { formatLeaseTitle } from "../../_lib/lease-format";
import type { LeaseReportRecord } from "../_lib/lease-report-types";
import { WhatChangedCard } from "./what-changed-card";

/**
 * THE WELLS REPORT — the wellbores that do this unit's work.
 *
 * ── ON A ONE-WELL UNIT THIS TAB SAYS SO OUT LOUD ──
 *
 * Where a lease has a single wellbore, the lease-level event and the well-level
 * event are the same molecules, and the copy says exactly that rather than
 * repeating the lease tab's change list as if it were new information. That is
 * the whole reason the tab is worth having: on a unit with eleven wells it is
 * where a reader finds out which one changed, and on a unit with one it is where
 * they find out there is nothing else to look at.
 *
 * ── ZEROES ARE NEVER PRINTED AS ZEROES ──
 *
 * The RRC record carries `total_md`/`tvd` of 0 for older completions, which
 * means "not filed", not "zero feet deep". Those rows read "Not available
 * (upstream RRC gap — never a literal 0)". A depth of 0 on screen would be a
 * factual claim about a well that is thousands of feet deep.
 */
export function WellsPanel({ report }: { report: LeaseReportRecord }) {
  const { lease } = report;
  const single = report.wells.length === 1;

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-xl font-bold">
            {report.wells.map((w) => `Well ${w.name}`).join(" · ")}
          </h3>
          <p className="text-[13px] text-mv-muted">
            Wells report · {formatLeaseTitle(lease.name, lease.number)}
          </p>
        </div>
        <Badge tone={report.depth === "full" ? "mint" : "slate"} size="xs">
          {report.depth === "full"
            ? "Real well record"
            : "Record fields only — no captured history"}
        </Badge>
      </div>

      {report.wells.map((well) => (
        <div key={well.api}>
          {well.changes.length > 0 && (
            <WhatChangedCard
              level="well"
              rows={well.changes}
              eventCount={well.changes.filter((row) => row.tone === "event").length}
              eventDate={report.depth === "full" ? "Jul 02, 2026" : undefined}
            />
          )}

          <Card className={`mb-3.5 ${gates("essentialsOnly")}`}>
            <h4 className="mb-1.5 text-[15px] font-bold">
              {single
                ? "One well does this unit's work"
                : `${report.wells.length} wells do this unit's work`}
            </h4>
            <p className="text-[15px]">
              Well {well.name} is a real, {well.status.toLowerCase()}{" "}
              {lease.operator.split(" ")[0]} well.
              {single &&
                " It is this unit's only wellbore, so everything the lease posts flows through it."}
            </p>
          </Card>

          <div
            className={`grid gap-[18px] min-[900px]:grid-cols-2 ${gates("hideInEssentials")}`}
          >
            <Card>
              <CardHeader
                title={
                  <h4 className="text-[15px] font-bold">
                    Well {well.name} — record
                  </h4>
                }
                action={
                  <Badge tone="slate" size="xs">
                    API {well.api}
                  </Badge>
                }
              />
              {well.record.map((row) => (
                <StatRow key={row.label} label={row.label} value={row.value} />
              ))}
            </Card>

            <Card>
              <CardHeader
                title={
                  <h4 className="text-[15px] font-bold">
                    What flows through this well
                  </h4>
                }
              />
              {well.flow.map((row) => (
                <StatRow key={row.label} label={row.label} value={row.value} />
              ))}
              <p className="mt-2 text-[10px] text-mv-muted">
                24-hour test, depths and perforations connect to the RRC well
                record per lease in production. Where a field is blank upstream
                this page says so rather than printing a zero.
              </p>
            </Card>
          </div>
        </div>
      ))}
    </>
  );
}

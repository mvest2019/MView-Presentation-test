import Link from "next/link";

import { Badge } from "../../../_components/ui/badge";
import { ViewTierLink } from "../../../_components/ui/view-tier-link";
import { Card, CardHeader, StatRow } from "../../../_components/ui/card";
import { gates } from "../../../_components/ui/portal-gating";
import {
  formatCount,
  formatLeaseTitle,
  spellOut,
} from "../../_lib/lease-format";
import { leaseRecords } from "../../_lib/lease-records";
import type { LeaseReportRecord } from "../_lib/lease-report-types";
import { WhatChangedCard } from "./what-changed-card";
import { WellAllocationPanel } from "./well-allocation-panel";
import { WellSurveyPanel } from "./well-survey-panel";
import { smithWellSurvey } from "../_lib/well-survey-record";

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
  /* "the biggest across your four Smith units" — derived from the record. */
  const familyCount = leaseRecords.filter(
    (entry) => entry.name === lease.name,
  ).length;
  const familyShort = lease.name.split(" ")[0];
  /* The OTHER fully captured lease, whose well record is complete — the closing
     footnote points at it so a reader can see what a wired well looks like. */
  const otherLease = report.compareWith
    ? leaseRecords.find((entry) => entry.number === report.compareWith)
    : undefined;
  const otherCaptured =
    otherLease && report.depth === "full"
      ? { number: otherLease.number, name: otherLease.name, wellName: "1H" }
      : undefined;

  return (
    <>
      {/* The panel's own crumb, which ends at the WELL rather than at the tab —
          the report-level crumb above says "Wells report", this one says which
          wellbore you are reading. Both are in the design. */}
      <p className="mb-2 text-[13px] text-mv-muted">
        <Link href="/mineralownersite/leases" className="text-mv-green-deep">
          My Leases
        </Link>{" "}
        →{" "}
        <Link
          href={`/mineralownersite/leases/${lease.number}`}
          className="text-mv-green-deep"
        >
          {formatLeaseTitle(lease.name, lease.number)}
        </Link>{" "}
        → <strong className="text-mv-ink">Well {report.wells[0].name}</strong>
      </p>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2.5">
          {/*
            A REAL SELECT, even with one option.

            This lease has a single wellbore, so there is nothing to switch —
            but the control is the design's, and its presence is the fact: it
            tells a reader that a lease CAN have several wells and that this
            report is per-well. On an eleven-well unit it is the only way to
            move between them. Rendered from the record, so it grows on its own.
          */}
          <label htmlFor="well-select" className="text-[13px] font-bold">
            Well
          </label>
          <select
            id="well-select"
            defaultValue={report.wells[0].name}
            disabled={report.wells.length === 1}
            className="rounded-lg border border-mv-line bg-mv-card px-2.5 py-1.5 text-[13px] font-semibold text-mv-slate disabled:cursor-default"
          >
            {report.wells.map((well) => (
              <option key={well.api} value={well.name}>
                {well.name} — {well.status}
              </option>
            ))}
          </select>
          <Badge tone="slate" className={gates("hideInEssentials")}>
            Status filter: Producing ·{" "}
            <abbr
              title="A shut-in well can produce but is temporarily closed — for maintenance, prices, or pipeline room. Not plugged; it can come back."
              className="cursor-help border-b-[1.5px] border-dotted border-mv-green-deep no-underline"
            >
              Shut-In
            </abbr>{" "}
            Producer
          </Badge>
        </div>
        <Badge tone={report.depth === "full" ? "mint" : "slate"} size="sm">
          {report.depth === "full"
            ? "Real well record — Mineral View well records"
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

          <Card
            className={`mb-3.5 border-l-4 border-l-mv-green ${gates("essentialsOnly")}`}
          >
            <h3 className="mb-1.5 text-lg font-bold">
              {single
                ? "One well does this unit's work"
                : `${report.wells.length} wells do this unit's work`}
            </h3>
            <p className="mb-2.5 text-[15px]">
              Well <strong>{well.name}</strong> is a real,{" "}
              {well.status.toLowerCase()} {lease.operator.split(" ")[0]}{" "}
              {well.wellType ? `${well.wellType.toLowerCase()} ` : ""}well.
              {" "}Its recent posting —{" "}
              <strong>
                {formatCount(lease.production.gasMcf)} units of gas
              </strong>{" "}
              — is the biggest across your {spellOut(familyCount)} {familyShort}{" "}
              units.
            </p>
            <ViewTierLink tier="detailed">See the details</ViewTierLink>
          </Card>

          {/*
            THE TWO RECORD CARDS ARE HIDDEN IN ESSENTIALS — the design gates the
            whole two-card grid, not the cards individually: `grid g2 hide-s`.

            The Essentials reader has already been told what they need by the
            hero above ("One well does this unit's work", with the one posting
            that matters) and by the two cards before it. What is left here is an
            API number, a wellbore profile, a lat/long and two upstream gaps —
            reference material for someone who came to check a field, which is
            what Detailed is for. The card's own "See the details" button is the
            way through.
          */}
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
                <StatRow
                  key={row.label}
                  label={row.label}
                  /* The reservoir row is a door to the tab beside this one. */
                  value={
                    row.label === "Reservoir" ? (
                      <Link
                        href={`/mineralownersite/leases/${lease.number}?report=reservoir`}
                        className="font-semibold text-mv-green-deep"
                      >
                        {row.value} →
                      </Link>
                    ) : (
                      row.value
                    )
                  }
                />
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
              {/* PROSE, not label/value rows. Two figures in one sentence read
                  as a consequence — the volumes flow through this well, and this
                  is what is left for it to drain — where two stat rows read as
                  two unrelated measurements. */}
              {report.recovery && well.latestPosting ? (
                <p className="text-[13.5px]">
                  This unit&rsquo;s posted volumes flow through its{" "}
                  {single ? "single well" : `${spellOut(report.wells.length)} wells`}:
                  latest posting <strong>{well.latestPosting}</strong>. Reservoir
                  reserves it will drain:{" "}
                  <strong>
                    {formatCount(report.recovery.reservesGas)} mcf ·{" "}
                    {formatCount(report.recovery.reservesOil)} bbl
                  </strong>{" "}
                  over six years.
                </p>
              ) : (
                well.flow.map((row) => (
                  <StatRow key={row.label} label={row.label} value={row.value} />
                ))
              )}
              <p className="mt-2 text-[10px] text-mv-muted">
                24-hr test, depths, and perforations connect to the RRC well
                record per lease in production
                {otherCaptured ? (
                  <>
                    {" "}
                    — shown fully on{" "}
                    <Link
                      href={`/mineralownersite/leases/${otherCaptured.number}?report=wells`}
                      className="font-semibold text-mv-green-deep"
                    >
                      {otherCaptured.name.split(" ")[0]} Well{" "}
                      {otherCaptured.wellName}
                    </Link>
                    , which is captured live.
                  </>
                ) : (
                  "."
                )}
              </p>
            </Card>
          </div>

          {/*
            THE SURVEY AND ALLOCATION PANELS — both four-tier, both about how far
            their own figures can be trusted. They render only where the record
            establishes the facts they turn on: `surveyOnFile` decides whether
            there is a filed path to speak about at all, and `allocation` is the
            engine's per-well split document. See each panel for its tiers.
          */}
          {well.surveyOnFile === false && (
            <WellSurveyPanel well={well} survey={smithWellSurvey} />
          )}

          {report.allocation && (
            <WellAllocationPanel
              well={well}
              leaseNumber={lease.number}
              allocation={report.allocation}
              wellCount={report.wells.length}
            />
          )}

        </div>
      ))}
    </>
  );
}

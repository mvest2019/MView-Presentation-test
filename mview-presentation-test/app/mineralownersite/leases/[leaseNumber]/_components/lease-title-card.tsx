import Link from "next/link";

import { Badge } from "../../../_components/ui/badge";
import { Card } from "../../../_components/ui/card";
import { PagePurpose } from "../../../_components/ui/page-purpose";
import { gates, portalGate } from "../../../_components/ui/portal-gating";
import {
  formatDecimalInterest,
  formatDollars,
  formatLeaseTitle,
} from "../../_lib/lease-format";
import type { LeaseReportRecord } from "../_lib/lease-report-types";

/**
 * THE TITLE CARD — THE LEASE, AT 100%.
 *
 * ── ONE SUBJECT PER CARD ──
 *
 * This card is the LEASE. The green card below it is the OWNER. That split is
 * the design's own correction after both cards grew into each other: the whole-
 * unit figures are lease facts, so they sit here beside the county, operator and
 * field; the owner's share, their appraised interest and their forward ranges sit
 * on the green card and nowhere else. Nothing appears on both.
 *
 * The operator row carries the working-interest-party fact as a qualifier
 * ("— also the working-interest party of record") because it was being stated
 * twice, six inches apart, on the two cards. A fact stated twice is not emphasis.
 *
 * ── THE METADATA IS A REAL TABLE ──
 *
 * Fixed label column, aligned value column, a dashed rule between rows. It was a
 * free-flowing wall of prose in an earlier pass and the note against it was
 * "there's no order to it" — five facts in five `<div>`s do not line up, and
 * five facts in a `<table>` do. `<th scope="row">` because these ARE row
 * headers, which also gives a screen reader the pairing for free.
 *
 * ── "DERIVED" TRAVELS WITH THE NUMBER ──
 *
 * The whole-unit appraised value is our arithmetic — the owner's appraised
 * interest ÷ their decimal interest — and no appraisal roll publishes such a
 * figure. So the tag and its one-line qualifier sit on the same line as the
 * number, not in a footnote: a reader who sees the figure sees what it is. The
 * full ÷DI working stays behind the green card's disclosure, once.
 *
 * The whole-unit block is `hide-s`: Essentials gets the plain story, and gross
 * figures before anyone's decimal are a Detailed-and-up concern.
 */
export function LeaseTitleCard({ report }: { report: LeaseReportRecord }) {
  const { lease } = report;

  return (
    /* `ultraKeep`: at Ultra this card is one of three that survive — it is the
       only thing on the page naming which lease the summary is about. */
    <Card className={`mt-2.5 mb-3 ${portalGate.ultraKeep}`}>
      <div className="flex flex-wrap items-center gap-2.5">
        <h2 className="text-2xl font-bold">
          {formatLeaseTitle(lease.name, lease.number)}
        </h2>
        <Badge tone={lease.status === "producing" ? "mint" : "slate"}>
          ● {lease.status === "producing" ? "Producing" : "Inactive"} ·{" "}
          {report.wellsProducing} of {lease.wells} wells
        </Badge>
      </div>

      {/* THE DESIGN'S `.ppf-slot` — the row under the title holding the ownership
          chip and the "Why this page?" control. Both sat on the far right of the
          title row here, which pushed the chip away from the heading it
          qualifies and left the control with nowhere to open into. */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {/* Essentials only: on that tier this is the page's one statement of the
            decimal interest, because the green card's group heading — which
            carries it in the denser tiers — is not the same sentence. */}
        <Badge tone="slate" className={gates("essentialsOnly")}>
          Your ownership share: {formatDecimalInterest(lease.decimalInterest)}
        </Badge>
        <PagePurpose routeKey="app-lease-report">
          One lease&rsquo;s full story — value, production, reservoir, wells, and
          its owner group.
        </PagePurpose>
      </div>

      <div className="mt-2 grid gap-x-9 border-t border-mv-line pt-0.5 min-[860px]:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <table className="w-full border-collapse">
          <tbody>
            {[
              {
                label: "County · district",
                value: (
                  <>
                    {lease.county} Co. ·{" "}
                    <abbr
                      title="The Railroad Commission of Texas divides the state into numbered oil-and-gas districts; filings for this unit live under this district."
                      className="cursor-help border-b-[1.5px] border-dotted border-mv-green-deep no-underline"
                    >
                      RRC {report.district}
                    </abbr>
                  </>
                ),
              },
              {
                label: "Operator",
                value: (
                  <>
                    {lease.operator}{" "}
                    <span className="text-[11px] text-mv-muted">
                      — also the working-interest party of record
                    </span>
                    {report.operatorNote && (
                      <span
                        className={`text-[11px] text-mv-muted ${gates("hideInEssentials")}`}
                      >
                        {" "}
                        ({report.operatorNote})
                      </span>
                    )}
                  </>
                ),
              },
              { label: "First production", value: report.firstProduction },
              {
                label: "Acres",
                value:
                  lease.acres === null ? (
                    <>
                      Not reported{" "}
                      <span className="text-[11px] text-mv-muted">
                        — unit outline not yet digitized for {lease.county} Co.
                      </span>
                    </>
                  ) : (
                    `${lease.acres}`
                  ),
              },
              {
                label: "Field · play",
                value: (
                  <>
                    {lease.field} · {lease.play}
                  </>
                ),
                essentialsHidden: true,
              },
            ].map((row) => (
              <tr
                key={row.label}
                className={`[&+tr>*]:border-t [&+tr>*]:border-dashed [&+tr>*]:border-mv-line ${
                  row.essentialsHidden ? gates("hideInEssentials") : ""
                }`}
              >
                <th
                  scope="row"
                  className="w-[150px] py-1.5 pr-3 text-left align-top text-[10px] font-extrabold tracking-[0.06em] whitespace-nowrap text-mv-faint uppercase"
                >
                  {row.label}
                </th>
                <td className="py-1.5 text-[12.5px] text-mv-slate">
                  {row.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {report.depth === "full" && (
          <div className={gates("hideInEssentials")}>
            <div className="py-[7px] text-[9.5px] font-extrabold tracking-[0.08em] text-mv-faint uppercase">
              The whole lease — 100% · before anyone&rsquo;s decimal
            </div>
            <div className="flex items-baseline gap-3 border-t border-dashed border-mv-line py-[5.5px] text-[12.5px]">
              <span className="flex-1 font-semibold text-mv-slate">
                MVestimate — gross lease valuation
              </span>
              <span
                className={`font-extrabold whitespace-nowrap tabular-nums text-mv-ink ${portalGate.lockedValue}`}
              >
                {formatDollars(report.grossValuation)}
              </span>
            </div>
            <div className="flex items-baseline gap-3 border-t border-dashed border-mv-line py-[5.5px] text-[12.5px]">
              <span className="flex-1 font-semibold text-mv-slate">
                Appraised value — whole unit
                <em className="ml-1.5 text-[9px] font-extrabold tracking-[0.05em] whitespace-nowrap text-mv-sand uppercase not-italic">
                  derived
                </em>
              </span>
              <span className="font-extrabold whitespace-nowrap tabular-nums text-mv-ink">
                ≈ {formatDollars(report.wholeUnitAppraised)}
              </span>
            </div>
            <p className="mt-[7px] text-[10.5px] leading-[1.5] text-mv-muted">
              <strong>derived</strong> = our arithmetic — the owner-interest
              appraisal ÷ decimal interest — not a CAD figure; no appraisal roll
              publishes a whole-unit value. Math under &quot;How these figures
              are calculated&quot; below.
            </p>
          </div>
        )}
      </div>

      {report.depth === "generic" && (
        <p className="mt-2.5 text-[11px] text-mv-muted">
          This lease&rsquo;s month-by-month history and decline curve are not
          captured in this build.{" "}
          <Link
            href="/mineralownersite/leases/305892"
            className="font-semibold text-mv-green-deep"
          >
            Smith Gas Unit (305892)
          </Link>{" "}
          and{" "}
          <Link
            href="/mineralownersite/leases/74318"
            className="font-semibold text-mv-green-deep"
          >
            Ledbetter (74318)
          </Link>{" "}
          are, and they show what this page becomes.
        </p>
      )}
    </Card>
  );
}

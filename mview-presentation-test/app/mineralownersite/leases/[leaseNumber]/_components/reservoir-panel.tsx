import Link from "next/link";

import { Badge, EstimateBadge } from "../../../_components/ui/badge";
import { Card, CardHeader, StatRow } from "../../../_components/ui/card";
import { Notice } from "../../../_components/ui/notice";
import { gates } from "../../../_components/ui/portal-gating";
import { formatLeaseTitle } from "../../_lib/lease-format";
import type { LeaseReportRecord } from "../_lib/lease-report-types";
import { WhatChangedCard } from "./what-changed-card";

/**
 * THE RESERVOIR REPORT — the rock this unit drinks from.
 *
 * ── WHY A WHOLE TAB FOR A ROCK ──
 *
 * Because the answer to "will this keep paying?" is a property of the reservoir,
 * not of the lease. A twenty-year Wilcox gas tail and a two-year shale flush
 * produce the same dollar this month and completely different dollars in 2032,
 * and nothing on the lease tab distinguishes them.
 *
 * ── THE NARRATIVE IS LABELLED NARRATIVE ──
 *
 * The plain-English section is prose written by a person: what the rock is, how
 * it behaves, and what that means for the reader's income. It carries a
 * "Narrative — descriptive, not data" badge so it is never mistaken for a
 * computed figure, and the numbers it refers to live in the table below it.
 *
 * ── THE EXTENT MAP IS ABSENT, AND SAYS SO ──
 *
 * The design reserves a panel for "where your unit sits in the rock" and marks
 * it "outline not available yet": reservoir extent geometry has no source. An
 * empty bordered box with an honest label is kept rather than dropped, because
 * the absence is a fact about the data and a reader who wonders where the
 * reservoir map is deserves an answer.
 */
export function ReservoirPanel({ report }: { report: LeaseReportRecord }) {
  const { reservoir, lease } = report;

  return (
    <>
      <h3 className="mb-1 text-xl font-bold">
        {reservoir.name} — {reservoir.county} Co.
      </h3>
      <p className="mb-3 text-[13px] text-mv-muted">
        Reservoir report · the rock unit {lease.number} produces from · first
        production {report.firstProduction}
        {report.operatorNote ? ` · ${report.operatorNote}` : ""}
      </p>

      <Notice tone="mint" glyph="◎" className="mb-3.5">
        <strong>How Texas leases work:</strong> a lease produces from{" "}
        <strong>one reservoir</strong> and may have{" "}
        <strong>multiple wells</strong>. This tab is the reservoir report for unit{" "}
        {lease.number} — any sister units are separate leases with their own
        reservoirs.
      </Notice>

      <WhatChangedCard
        level="reservoir"
        rows={reservoir.changes}
        eventCount={reservoir.changes.filter((row) => row.tone === "event").length}
      />

      <Card className={`mb-4 ${gates("hideInEssentials")}`}>
        <CardHeader
          title={
            <h4 className="text-[15px] font-bold">
              Wells producing from this reservoir
            </h4>
          }
          action={
            <Badge tone="slate" size="xs">
              {reservoir.wellCount} well{reservoir.wellCount === 1 ? "" : "s"}
            </Badge>
          }
        />
        {report.wells.map((well) => (
          <div
            key={well.api}
            className="flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-mv-line py-2 first:border-t-0 text-[13px]"
          >
            <span>
              <strong>Well {well.name}</strong>{" "}
              <span className="text-mv-muted">API {well.api}</span>
              <span className="block text-[11px] text-mv-muted">
                {well.status} · {lease.operator}
              </span>
            </span>
            <Badge tone={well.status === "Producing" ? "mint" : "slate"} size="xs">
              {well.status}
            </Badge>
          </div>
        ))}
      </Card>

      {reservoir.narrative.length > 0 && (
        <Card className="mb-4 border-l-4 border-l-mv-green">
          <CardHeader
            title={
              <h4 className="text-[15px] font-bold">
                About this reservoir — in plain English
              </h4>
            }
            action={
              <Badge tone="slate" size="xs">
                Narrative — descriptive, not data
              </Badge>
            }
          />
          {/* The first paragraph always shows; the rest sit behind a disclosure
              so the Essentials reader gets one paragraph and the curious reader
              gets the history. */}
          <p className="mb-2 text-[13.5px]">{reservoir.narrative[0]}</p>
          {reservoir.narrative.length > 1 && (
            <details>
              <summary className="cursor-pointer list-none text-[11px] font-bold text-mv-green-deep [&::-webkit-details-marker]:hidden">
                Read more — the history of this rock, and why it matters to you →
              </summary>
              <div className="mt-1.5">
                {reservoir.narrative.slice(1).map((paragraph) => (
                  <p key={paragraph.slice(0, 30)} className="mb-2 text-[13.5px]">
                    {paragraph}
                  </p>
                ))}
              </div>
            </details>
          )}
          <p className="mt-2 text-[10px] text-mv-muted">
            A short orientation, not a geological report — the numbers live in the
            table on this tab.
            {lease.play.startsWith("Not classified") &&
              " The formal play classification for this field is not classified in the state's play table — a confirmed source gap, not a data error."}
          </p>
        </Card>
      )}

      <Card className="mb-4">
        <CardHeader
          title={
            <h4 className="text-[15px] font-bold">
              Reservoir extent — where your unit sits in the rock
            </h4>
          }
          action={
            <Badge tone="slate" size="xs">
              Outline not available yet
            </Badge>
          }
        />
        <p className="text-[13px] text-mv-muted">
          Reservoir outline geometry has no source in this build, so no boundary
          is drawn. The unit&rsquo;s own traced boundary and every wellbore around
          it are on the{" "}
          <Link
            href={`/mineralownersite/leases/${lease.number}`}
            className="font-semibold text-mv-green-deep"
          >
            Lease report&rsquo;s map
          </Link>
          , which is real geometry today.
        </p>
      </Card>

      <div className={`grid gap-[18px] min-[900px]:grid-cols-2 ${gates("hideInEssentials")}`}>
        <Card>
          <CardHeader
            title={<h4 className="text-[15px] font-bold">Reservoir — {reservoir.name}</h4>}
            action={
              report.depth === "full" ? (
                <Badge tone="mint" size="xs">
                  Real report data
                </Badge>
              ) : undefined
            }
          />
          <StatRow label="Field" value={lease.field} />
          <StatRow label="Play" value={lease.play} />
          <StatRow
            label="County / district"
            value={`${lease.county} · RRC ${report.district}`}
          />
          <StatRow label="First production" value={report.firstProduction} />
          <StatRow
            label="Producing lease"
            value={formatLeaseTitle(lease.name, lease.number)}
          />
          <StatRow
            label="Wells in this reservoir"
            value={report.wells.map((w) => `Well ${w.name}`).join(", ")}
          />
        </Card>

        <Card>
          <CardHeader
            title={
              <h4 className="text-[15px] font-bold">
                Reservoir totals — lease level
              </h4>
            }
          />
          {reservoir.totals.map((row) => (
            <StatRow key={row.label} label={row.label} value={row.value} />
          ))}
          <p className="mt-2 text-[10px] text-mv-muted">
            <EstimateBadge plural />
          </p>
        </Card>
      </div>
    </>
  );
}

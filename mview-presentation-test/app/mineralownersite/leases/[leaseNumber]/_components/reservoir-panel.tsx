import Link from "next/link";

import { Badge, EstimateBadge } from "../../../_components/ui/badge";
import { Card, CardHeader, StatRow } from "../../../_components/ui/card";
import { Notice } from "../../../_components/ui/notice";
import { gates, portalGate } from "../../../_components/ui/portal-gating";
import { ViewTierLink } from "../../../_components/ui/view-tier-link";
import {
  formatCount,
  formatDollars,
  formatLeaseTitle,
  spellOut,
} from "../../_lib/lease-format";
import { leaseRecords } from "../../_lib/lease-records";
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
  /* "its three sister units" — the leases sharing this one's name. Derived, so
     the sentence cannot outlive the record. */
  const siblingCount = leaseRecords.filter(
    (entry) => entry.name === lease.name && entry.number !== lease.number,
  ).length;

  return (
    <>
      <h3 className="mb-1 text-xl font-bold">
        {reservoir.name} — {reservoir.county} Co.
      </h3>
      <p className="mb-3 text-[13px] text-mv-muted">
        Reservoir report · the rock unit {lease.number} produces from · first
        production <strong>{report.firstProduction}</strong>
        {report.operatorNote && (
          <>
            {" "}
            · original operator{" "}
            <strong>{report.operatorNote.replace("originally ", "")}</strong>
          </>
        )}
      </p>

      <Notice tone="mint" glyph="◎" className="mb-3.5">
        <strong>How Texas leases work:</strong> a lease produces from{" "}
        <strong>one reservoir</strong> and may have{" "}
        <strong>multiple wells</strong>. This tab is the reservoir report for unit{" "}
        {lease.number} —{" "}
        {siblingCount > 0
          ? `its ${spellOut(siblingCount)} sister unit${siblingCount === 1 ? " is a separate lease with its own reservoir" : "s are separate leases with their own reservoirs"}`
          : "any sister units are separate leases with their own reservoirs"}
        .
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
                {[well.wellType, well.status,
                  well.latestPosting && `latest posting ${well.latestPosting}`,
                  lease.operator]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </span>
            <Badge tone={well.status === "Producing" ? "mint" : "slate"} size="xs">
              {well.status}
            </Badge>
          </div>
        ))}
      </Card>

      {/*
        THE ESSENTIALS CARD — the whole reservoir in four sentences.

        `tier-s`, so it replaces the record tables for a plain-English reader
        rather than sitting on top of them. Every figure in it is derived: the
        rock's short name, the reserves still expected, and the owner's own share
        — which carries `cl-lock`, because on this tier it is the one number the
        claimed state withholds.

        It was missing entirely, which left Essentials with a change card, a
        narrative and two record tables and no answer to "so how much is left?".
      */}
      {report.recovery && (
        <Card
          className={`mb-3.5 border-l-4 border-l-mv-green ${gates("essentialsOnly")}`}
        >
          <h3 className="mb-1.5 text-lg font-bold">
            The rock this unit drinks from
          </h3>
          <p className="mb-2.5 text-[15px]">
            This unit produces natural gas from a rock layer called the{" "}
            {reservoir.shortName}. Most of its gas has already been produced, but
            about{" "}
            <strong>
              {formatCount(report.recovery.reservesGas)} units of gas
            </strong>{" "}
            are still expected over the next six years — that&rsquo;s where your{" "}
            <strong
              className={`tabular-nums ${portalGate.lockedValue}`}
            >
              {formatDollars(lease.mvestimate)}
            </strong>{" "}
            comes from.
          </p>
          <ViewTierLink tier="detailed">See the details</ViewTierLink>
        </Card>
      )}

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
            <details className="group">
              {/* A bordered summary, not a bare link: the design gives this one
                  its own box because it is a section of the card rather than a
                  footnote on it. */}
              <summary className="cursor-pointer list-none rounded-[8px] border border-mv-line px-2.5 py-1.5 text-[11px] font-bold text-mv-green-deep hover:bg-mv-bg [&::-webkit-details-marker]:hidden">
                <span aria-hidden="true">ⓘ </span>Read more — the history of this
                rock, and why it matters to you →
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
            tables on this tab.
            {lease.play.startsWith("Not classified") && (
              <>
                {" "}
                The formal play classification for this field is{" "}
                <strong>not classified in the state&rsquo;s play table</strong> (a
                confirmed source gap, not a data error) — we say so rather than
                invent one.
              </>
            )}
          </p>
        </Card>
      )}

      {/*
        THE EXTENT PANEL — a real basemap with the unit pinned, and an honest
        badge saying the OUTLINE is what is missing.

        The reservoir boundary has no source, so none is drawn. What the design
        does draw is an Esri World Topo raster of the surrounding area with the
        unit marked, because "where in the county am I" is answerable today and
        is most of what a reader wants from this panel. An empty bordered box
        would have answered neither question.
      */}
      {/* `.dbhook` — the extent outline is not read from the database yet, and
          the design marks that on the surface rather than in a footnote. See
          `Card`'s `pendingData`; this card hand-rolls its shell because the map
          is full-bleed under a padded header. */}
      <div className="mb-4 overflow-hidden rounded-mv border-[1.5px] border-dashed border-mv-pending bg-[linear-gradient(180deg,var(--color-mv-pending-top),var(--color-mv-pending-bottom))] shadow-mv">
        <div className="p-[22px] pb-0">
          <CardHeader
            title={
              <h4 className="text-[15px] font-bold">
                Reservoir extent — where your unit sits in the rock
              </h4>
            }
            action={
              <Badge tone="blue" size="xs">
                Outline not available yet
              </Badge>
            }
          />
        </div>

        {reservoir.extentBbox && (
          <div className="relative mt-3 aspect-7/4 w-full overflow-hidden bg-mv-bg">
            {/* A plain `<img>`, not `next/image`: the URL is an Esri export with
                a bbox in it, so there is nothing for the optimiser to resize and
                a loader would only add a hop. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://services.arcgisonline.com/arcgis/rest/services/World_Topo_Map/MapServer/export?bbox=${reservoir.extentBbox.join(
                ",",
              )}&bboxSR=4326&size=700,400&format=png&f=image`}
              alt={`Esri topographic map of the ${reservoir.name} area, ${reservoir.county} County — reservoir outline pending`}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
            />
            {/* The unit's pin sits at the frame's centre because the bbox is
                built around it. */}
            <span
              aria-hidden="true"
              title={formatLeaseTitle(lease.name, lease.number)}
              className="absolute top-[46%] left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full border-2 border-white bg-mv-green-deep shadow-[0_0_0_3px_rgba(46,143,109,.35)]"
            />
            <span className="absolute top-[50.5%] left-1/2 -translate-x-1/2 rounded-[6px] bg-mv-card/85 px-2 py-0.5 text-[11px] font-bold whitespace-nowrap text-mv-ink">
              {formatLeaseTitle(lease.name, lease.number)} — your unit
            </span>
            <span className="absolute bottom-[6%] left-1/2 max-w-[92%] -translate-x-1/2 text-center text-[11px] text-mv-slate">
              The interactive well view loads on top — the wells around the unit
              draw here. Reservoir outline: not available yet.
            </span>
          </div>
        )}

        <div className="p-[22px] pt-3">
          <p className="text-[11px] text-mv-muted">
            Live all-wells view — every well around the{" "}
            {lease.name.split(" ")[0]} units streams by viewport. Reservoir
            boundary + member wells + nearby drilling render from the extent
            geometry.
          </p>
          <p className="mt-1.5 text-[11px] text-mv-muted">
            The unit&rsquo;s own traced boundary and every wellbore around it are
            on the{" "}
            <Link
              href={`/mineralownersite/leases/${lease.number}`}
              className="font-semibold text-mv-green-deep"
            >
              Lease report&rsquo;s map
            </Link>
            , which is real geometry today.
          </p>
        </div>
      </div>

      {/* ONLY THE TOTALS CARD IS `hide-s`. The design leaves the reservoir RECORD
          ungated — field, play, county, first production, which lease and which
          wells — and hides only the recovery figures beside it. Wrapping both in
          one gated grid hid the record from Essentials, which is the tier least
          likely to know what a reservoir is. */}
      <div className="grid gap-[18px] min-[900px]:grid-cols-2">
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
          {/* The operator who drilled it — a reservoir fact, and the row the
              record card was missing. */}
          {report.operatorNote && (
            <StatRow
              label="Original operator"
              value={report.operatorNote.replace("originally ", "")}
            />
          )}
          <StatRow
            label="Producing lease"
            value={
              <Link
                href={`/mineralownersite/leases/${lease.number}`}
                className="font-semibold text-mv-green-deep"
              >
                {formatLeaseTitle(lease.name, lease.number)} →
              </Link>
            }
          />
          {/* Each well links to the Wells tab, as the design has it: "Well 5L →". */}
          <StatRow
            label="Wells in this reservoir"
            value={
              <>
                {report.wells.map((well, index) => (
                  <span key={well.api}>
                    {index > 0 && ", "}
                    <Link
                      href={`/mineralownersite/leases/${lease.number}?report=wells`}
                      className="font-semibold text-mv-green-deep"
                    >
                      Well {well.name} →
                    </Link>
                  </span>
                ))}
              </>
            }
          />
        </Card>

        <Card className={gates("hideInEssentials")}>
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
            A {report.recovery && report.recovery.eurGas > report.recovery.eurOil * 50 ? "gas" : "oil"}-weighted
            reservoir — the {report.recovery && report.recovery.eurGas > report.recovery.eurOil * 50 ? "Nat Gas" : "WTI"}{" "}
            price matters more here than{" "}
            {report.recovery && report.recovery.eurGas > report.recovery.eurOil * 50 ? "WTI" : "Nat Gas"}.{" "}
            <EstimateBadge plural />
          </p>
        </Card>
      </div>
    </>
  );
}

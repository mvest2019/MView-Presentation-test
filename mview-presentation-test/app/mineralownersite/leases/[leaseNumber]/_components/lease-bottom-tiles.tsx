import Link from "next/link";

import { Badge, EstimateBadge } from "../../../_components/ui/badge";
import { PortalButtonLink } from "../../../_components/ui/button";
import { Card, CardHeader, StatRow } from "../../../_components/ui/card";
import { gates, portalGate } from "../../../_components/ui/portal-gating";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableScroll,
} from "../../../_components/ui/table";
import {
  formatCount,
  formatDecimalInterest,
  formatDollars,
  formatLeaseTitle,
} from "../../_lib/lease-format";
import { leaseRecords } from "../../_lib/lease-records";
import { leaseReportPath } from "../../_lib/lease-routes";
import type { LeaseReportRecord } from "../_lib/lease-report-types";

/**
 * THE TILES BELOW THE CHART — everything else this lease has to say.
 *
 * ── THEY FLOW, THEY ARE NOT A GRID ──
 *
 * An earlier pass laid these out as a 1.4fr/1fr two-column grid, which left a
 * tall empty gap under whichever column ran short ("I don't like having so much
 * dead space here"). CSS columns instead: one card after the next, balanced by
 * the browser, no gaps. `break-inside-avoid` keeps a card from being split
 * across a column boundary, which is the one thing multi-column layout will do
 * to you if you let it.
 *
 * ── WHAT IS HONEST ABOUT THIS SECTION ──
 *
 * Three of these tiles exist mainly to say a number is NOT available: spacing
 * and density cannot be computed because the RRC has no acreage for this unit,
 * and both operator ranks are unwired. They are kept, with the reason on each
 * row, because a missing panel reads as "we never thought of it" and a panel
 * that says "acreage is genuinely unreported upstream" reads as what it is.
 */
export function LeaseBottomTiles({ report }: { report: LeaseReportRecord }) {
  const { lease } = report;

  return (
    <div className="mb-4 gap-[18px] min-[900px]:columns-2">
      {report.depth === "full" && <ReservesTile report={report} />}
      {lease.name === "Smith Gas Unit" && <SisterUnitsTile report={report} />}
      <OwnerGroupTile report={report} />
      <AuditTile report={report} />
      <SpacingTile report={report} />
      <OperatorTile report={report} />
      <WorkbookTile />
      {report.depth === "full" && <FullPrecisionTile report={report} />}
      <ZeroValueTile />
      <CompareTile report={report} />
    </div>
  );
}

/** Every tile shares this shell so the flow layout cannot break one of them. */
function Tile({
  children,
  accent = false,
}: {
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="mb-[18px] break-inside-avoid">
      <Card className={accent ? "border-mv-green" : undefined}>{children}</Card>
    </div>
  );
}

function ReservesTile({ report }: { report: LeaseReportRecord }) {
  const rows = report.reservoir.totals.filter((row) =>
    row.label.startsWith("EUR") ||
    row.label.startsWith("Produced") ||
    row.label.startsWith("Reserves"),
  );

  return (
    <Tile>
      <CardHeader
        title={<h4 className="text-[15px] font-bold">A gas-heavy unit — the numbers</h4>}
        action={<Badge tone="slate" size="xs">Gas-weighted</Badge>}
      />
      {rows.map((row) => (
        <StatRow key={row.label} label={row.label} value={row.value} />
      ))}
      <p className="mt-2 text-[11px] text-mv-muted">
        EUR − produced = reserves. This unit&rsquo;s value is almost entirely
        gas — which is why the natural gas price matters more here than WTI.
      </p>
    </Tile>
  );
}

/**
 * SISTER UNITS — the other leases sharing this one's name and operator.
 *
 * DERIVED, not listed: any lease with the same name and a different number is a
 * sibling, so the table cannot fall out of step with the record. The prototype
 * hard-coded its three rows, which is fine until a fourth unit is claimed.
 */
function SisterUnitsTile({ report }: { report: LeaseReportRecord }) {
  const siblings = leaseRecords.filter(
    (entry) =>
      entry.name === report.lease.name && entry.number !== report.lease.number,
  );
  if (!siblings.length) return null;

  return (
    <Tile>
      <CardHeader
        title={
          <h4 className="text-[15px] font-bold">
            Sister units — the other {siblings.length}{" "}
            {report.lease.name.split(" ")[0]}s
          </h4>
        }
      />
      <p className="mb-2 text-[13px]">
        This unit&rsquo;s {formatCount(report.lease.production.gasMcf)} mcf +{" "}
        {report.lease.production.oilBbl} bbl posting was the largest of the{" "}
        {siblings.length + 1}; here is how its siblings posted in the same batch.
      </p>
      <TableScroll>
        <Table minWidth={460}>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Sister unit</TableHeaderCell>
              <TableHeaderCell numeric>Decimal interest</TableHeaderCell>
              <TableHeaderCell numeric>MVestimate</TableHeaderCell>
              <TableHeaderCell numeric>Gas (mcf)</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {siblings.map((sibling) => (
              <TableRow key={sibling.number} interactive>
                <TableCell>
                  <Link
                    href={leaseReportPath(sibling.number)}
                    className="font-bold text-mv-green-deep"
                  >
                    {formatLeaseTitle(sibling.name, sibling.number)}
                  </Link>
                  {sibling.mvestimate === 0 && (
                    <>
                      {" "}
                      <Badge tone="slate" size="xs">
                        Inactive
                      </Badge>
                    </>
                  )}
                </TableCell>
                <TableCell numeric>
                  {formatDecimalInterest(sibling.decimalInterest)}
                </TableCell>
                <TableCell numeric className={portalGate.lockedValue}>
                  {sibling.mvestimate > 0 ? (
                    formatDollars(sibling.mvestimate)
                  ) : (
                    <>
                      Model: ~$0
                      <span className="block text-[10px] font-normal text-mv-muted">
                        county appraised: {formatDollars(sibling.countyAppraised)}
                      </span>
                    </>
                  )}
                </TableCell>
                <TableCell numeric>
                  {formatCount(sibling.production.gasMcf)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableScroll>
      <p className="mt-2 text-[10px] text-mv-muted">
        All {siblings.length + 1} units operated by {report.lease.operator} in{" "}
        {report.lease.county} County. Inactive = little or no future income
        projected, not lost ownership — the county&rsquo;s appraised value is
        shown so an owned lease never reads a bare $0. <EstimateBadge plural />
      </p>
    </Tile>
  );
}

function OwnerGroupTile({ report }: { report: LeaseReportRecord }) {
  return (
    <Tile accent>
      <CardHeader
        title={
          <h4 className="text-[15px] font-bold">
            <span aria-hidden="true">◉ </span>This lease has an owner group
          </h4>
        }
        action={
          <Badge tone="mint" size="xs">
            Private · you&rsquo;re a member
          </Badge>
        }
      />
      <p className="mb-2 text-[13px]">
        <strong>{report.lease.name} — Owners</strong> (3 members). Compare{" "}
        {report.lease.operator.split(" ")[0]} statements across the family units,
        share documents, and split professional review costs.
      </p>
      <div className="flex flex-wrap gap-2">
        {/* Groups is a built module in the nav, so these are real links. */}
        <PortalButtonLink variant="primary" size="sm" href="/mineralownersite">
          Open this lease&rsquo;s group — soon
        </PortalButtonLink>
      </div>
      <p className="mt-2 text-[10px] text-mv-muted">
        Owners only — advisor reps labeled, operators never members.
      </p>
    </Tile>
  );
}

function AuditTile({ report }: { report: LeaseReportRecord }) {
  return (
    <Tile accent>
      <CardHeader
        title={
          <h4 className="text-[15px] font-bold">
            <span aria-hidden="true">✓ </span>Is{" "}
            {report.lease.operator.split(" ")[0]} paying this unit correctly?
          </h4>
        }
        action={
          <Badge tone="mint" size="xs">
            Included with Premium
          </Badge>
        }
      />
      <p className="mb-2 text-[13px]">
        A <strong>Mineral View Lease Audit</strong> checks — from your check stubs
        and the real production data on{" "}
        {formatLeaseTitle(report.lease.name, report.lease.number)}. We re-compute
        each month against your DI{" "}
        {formatDecimalInterest(report.lease.decimalInterest)} and flag anything
        off.
      </p>
      <details className="mb-2">
        <summary className="cursor-pointer list-none text-[11px] font-bold text-mv-green-deep [&::-webkit-details-marker]:hidden">
          <span aria-hidden="true">ⓘ </span>What the audit is — and what
          we&rsquo;d need from you
        </summary>
        <p className="mt-1.5 text-[13px]">
          <strong>What it is:</strong> we compare what each month&rsquo;s
          statements appear to support on this unit — public production × your
          stub price × your decimal, less severance — against what your stubs say
          was paid. <strong>What we need:</strong> your check stubs or statements
          for the months you want checked, and your division order if you have
          one.
        </p>
      </details>
      <p className="text-[10px] text-mv-muted">
        Statements are analyzed, not stored. Informational — not legal, tax, or
        investment advice.
      </p>
    </Tile>
  );
}

function SpacingTile({ report }: { report: LeaseReportRecord }) {
  return (
    <Tile>
      <CardHeader
        title={
          <h4 className="text-[15px] font-bold">
            Spacing &amp; density — room on this unit
          </h4>
        }
        action={
          <Badge tone="slate" size="xs">
            Ranking not available yet
          </Badge>
        }
      />
      <StatRow
        label="Acres per producing well"
        value={
          report.lease.acres === null
            ? "Can't compute — acreage not reported"
            : `${Math.round(report.lease.acres / Math.max(report.wellsProducing, 1))} ac`
        }
      />
      <StatRow
        label={`Rank vs ${report.lease.county} Co. peers`}
        value="Not available yet"
      />
      <StatRow label="EUR per acre (productivity rank)" value="Not available yet" />
      <p className="mt-2 text-[11px] text-mv-muted">
        <strong>Why you&rsquo;d care:</strong> the percentile answers &quot;is my
        rock better than my neighbors&rsquo;?&quot; — it ranks this unit&rsquo;s
        recovery per acre against every lease in the same county and play.
        {report.lease.acres === null &&
          " The unit's acreage is genuinely unreported at the RRC, which is a confirmed source gap and not a data error on our side."}
      </p>
    </Tile>
  );
}

function OperatorTile({ report }: { report: LeaseReportRecord }) {
  return (
    <Tile>
      <CardHeader
        title={
          <h4 className="text-[15px] font-bold">
            Your operator — is {report.lease.operator.split(" ")[0]} doing a good
            job?
          </h4>
        }
        action={
          <Badge tone="slate" size="xs">
            Informational — not a rating
          </Badge>
        }
      />
      <StatRow
        label="Current operator (cuts your royalty check)"
        value={report.lease.operator}
      />
      {report.operatorNote && (
        <StatRow
          label="Original operator"
          value={report.operatorNote.replace("originally ", "")}
        />
      )}
      <StatRow label="Payment signal (from your audit)" value="No audit run yet" />
      <StatRow
        label={`Rank vs ${report.lease.county} Co. operators`}
        value="Not available yet"
      />
      <p className="mt-2 text-[11px] text-mv-muted">
        A major often drills a unit and a small operator runs its long tail — the
        normal life cycle for twenty-year gas. The peer rank compares uptime and
        posting punctuality against operators on similar tails.
      </p>
    </Tile>
  );
}

function WorkbookTile() {
  return (
    <Tile>
      <CardHeader
        title={
          <h4 className="text-[15px] font-bold">
            <span aria-hidden="true">▣ </span>Your lease workbook
          </h4>
        }
        action={
          <Badge tone="slate" size="xs">
            Private to you
          </Badge>
        }
      />
      <p className="mb-2 text-[13px]">
        Division orders, check statements, photos, and notes for this unit —
        private to you, and it feeds your Dossier AI so answers cite{" "}
        <em>your</em> documents.
      </p>
      <div className="flex flex-wrap gap-2">
        <span
          aria-disabled="true"
          title="Document upload — not open yet"
          className="inline-flex cursor-default items-center gap-2 rounded-[10px] border border-mv-line bg-mv-bg px-3 py-1.5 text-[13px] font-semibold text-mv-muted opacity-70"
        >
          ⌲ Upload documents — soon
        </span>
      </div>
      <p className="mt-2 text-[10px] text-mv-muted">
        One workbook folder per member, never shared unless you share it.
      </p>
    </Tile>
  );
}

function FullPrecisionTile({ report }: { report: LeaseReportRecord }) {
  const { lease } = report;
  return (
    <div className={`mb-[18px] break-inside-avoid ${gates("professionalOnly")}`}>
      <Card>
        <CardHeader
          title={
            <h4 className="text-[15px] font-bold">Unit record — full precision</h4>
          }
          action={
            <Badge tone="blue" size="xs">
              Professional view
            </Badge>
          }
        />
        <StatRow label="Field" value={lease.field} />
        <StatRow label="First production" value={report.firstProduction} />
        <StatRow label="RRC district" value={report.district} />
        <StatRow
          label="Active / total wells"
          value={`${report.wellsProducing} / ${lease.wells}`}
        />
        <StatRow label="API" value={lease.api} />
        <StatRow
          label="Acres"
          value={
            lease.acres === null
              ? "Not reported (upstream RRC gap)"
              : `${lease.acres}`
          }
        />
        <StatRow
          label="Decimal interest"
          value={formatDecimalInterest(lease.decimalInterest)}
        />
        {report.reservoir.totals.map((row) => (
          <StatRow key={row.label} label={row.label} value={row.value} />
        ))}
      </Card>
    </div>
  );
}

function ZeroValueTile() {
  const zeros = leaseRecords.filter((lease) => lease.mvestimate === 0);
  return (
    <Tile>
      <CardHeader
        title={
          <h4 className="text-[15px] font-bold">
            Why do {zeros.length} leases show $0?
          </h4>
        }
      />
      <p className="text-[13px]">
        {zeros.map((lease, i) => (
          <span key={lease.number}>
            {i > 0 && (i === zeros.length - 1 ? " and " : ", ")}
            {lease.number}
          </span>
        ))}{" "}
        still post volumes, but the model projects negligible six-year earnings to
        your decimal at the current decline and price outlook. MVestimate is
        forward-looking — <strong>not a statement of past income</strong>, and not
        a statement that you no longer own them.
      </p>
    </Tile>
  );
}

function CompareTile({ report }: { report: LeaseReportRecord }) {
  /* The other fully captured lease — the only other report with a real curve to
     compare against, which is why this tile names it specifically. */
  const other = report.lease.number === "74318" ? "305892" : "74318";
  const lease = leaseRecords.find((entry) => entry.number === other)!;

  return (
    <Tile>
      <CardHeader
        title={
          <h4 className="text-[15px] font-bold">
            Compare with {lease.name.split(" ")[0]}
          </h4>
        }
      />
      <p className="mb-2 text-[13px]">
        {formatLeaseTitle(lease.name, lease.number)} is{" "}
        {lease.production.oilBbl > lease.production.gasMcf / 50
          ? "oil-weighted"
          : "gas-weighted"}{" "}
        and is the other lease on this record with a fully captured decline
        curve — the two are worth reading side by side.
      </p>
      <PortalButtonLink size="sm" href={leaseReportPath(other)}>
        Open the {lease.name.split(" ")[0]} report →
      </PortalButtonLink>
    </Tile>
  );
}

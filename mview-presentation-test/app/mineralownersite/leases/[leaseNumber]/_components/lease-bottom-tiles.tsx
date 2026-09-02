import Link from "next/link";

import { Badge, EstimateBadge } from "../../../_components/ui/badge";
import { PortalButtonLink } from "../../../_components/ui/button";
import { PrototypeButton } from "../../../_components/ui/prototype-button";
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
  spellOut,
} from "../../_lib/lease-format";
import { leaseRecords } from "../../_lib/lease-records";
import { leaseReportPath } from "../../_lib/lease-routes";
import type { LeaseReportRecord } from "../_lib/lease-report-types";
import { NewWellProbabilityTile } from "./new-well-probability-tile";

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
      <NewWellProbabilityTile report={report} />
      <SpacingTile report={report} />
      <OperatorTile report={report} />
      <WorkbookTile />
      {report.depth === "full" && <FullPrecisionTile report={report} />}
      <ZeroValueTile report={report} />
      <CompareTile report={report} />
    </div>
  );
}

/**
 * Every tile shares this shell so the flow layout cannot break one of them.
 *
 * `gate` IS PER TILE, and the design assigns it deliberately — six of the ten
 * tiles show on every tier, three are `hide-s` and one is Professional-only.
 * The three hidden from Essentials are the ones a plain-English reader has no
 * use for: an EUR table, a spacing percentile and an operator league position.
 * They were all ungated here, which put nine tiles on the tier meant to carry
 * the fewest.
 */
function Tile({
  children,
  accent = false,
  pendingData = false,
  gate,
  span = false,
}: {
  children: React.ReactNode;
  accent?: boolean;
  /** `.dbhook` — see `Card`. Three of these tiles are waiting on a feed. */
  pendingData?: boolean;
  gate?: string;
  /**
   * Break out of the column flow and take the full width.
   *
   * For the one tile holding a TABLE. Four columns of figures do not fit in a
   * 425px CSS column — measured at 469px, so the card grew its own horizontal
   * scrollbar, which beside nine other cards reads as broken rather than as
   * scrollable. Spanning is the fix that costs nothing; the alternatives were
   * dropping a column (a fact) or shrinking the type below the design's scale.
   */
  span?: boolean;
}) {
  return (
    <div
      className={`mb-[18px] break-inside-avoid ${span ? "[column-span:all]" : ""} ${gate ?? ""}`.trim()}
    >
      <Card
        pendingData={pendingData}
        className={accent ? "border-mv-green" : undefined}
      >
        {children}
      </Card>
    </div>
  );
}

function ReservesTile({ report }: { report: LeaseReportRecord }) {
  const r = report.recovery;
  if (!r) return null;
  const n = (v: number) => formatCount(v);

  return (
    <Tile gate={gates("hideInEssentials")}>
      <CardHeader
        title={
          <h4 className="text-[15px] font-bold">
            A gas-heavy unit — the numbers
          </h4>
        }
        action={
          <Badge tone="slate" size="xs">
            Gas-weighted
          </Badge>
        }
      />
      {/* TWO COLUMNS, oil then gas, because every row is one figure per stream
          and a single value column would force six rows into twelve. */}
      <Table minWidth={0}>
        <TableHead>
          <TableRow>
            <TableHeaderCell>
              <span className="sr-only">Measure</span>
            </TableHeaderCell>
            <TableHeaderCell numeric>Oil (bbl)</TableHeaderCell>
            <TableHeaderCell numeric>Gas (mcf)</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {[
            ["EUR — est. ultimate recovery", r.eurOil, r.eurGas],
            ["Produced to date", r.producedOil, r.producedGas],
            ["Reserves — next 6 years", r.reservesOil, r.reservesGas],
          ].map(([label, oil, gas]) => (
            <TableRow key={label as string}>
              <TableCell>{label as string}</TableCell>
              <TableCell numeric>{n(oil as number)}</TableCell>
              <TableCell numeric>{n(gas as number)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {/* THE SUBTRACTION IS SHOWN, not asserted. "EUR − produced = reserves" is
          a claim; the two worked lines are the proof, and a reader can check
          them against the table directly above. */}
      <p className="mt-2 text-[11px] text-mv-muted">
        <strong>EUR − produced = reserves:</strong> {n(r.eurOil)} −{" "}
        {n(r.producedOil)} = {n(r.reservesOil)} bbl · {n(r.eurGas)} −{" "}
        {n(r.producedGas)} = {n(r.reservesGas)} mcf. This unit&rsquo;s value is
        almost entirely gas — which is why the Nat Gas price matters more here
        than WTI.
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
    <Tile span>
      <CardHeader
        title={
          <h4 className="text-[15px] font-bold">
            {/* Spelled out — "the other three Smiths" — because this is a
                heading in a sentence, not a stat. */}
            Sister units — the other {spellOut(siblings.length)}{" "}
            {report.lease.name.split(" ")[0]}s
          </h4>
        }
      />
      <p className="mb-2 text-[13px]">
        This unit&rsquo;s{" "}
        <strong>
          {formatCount(report.lease.production.gasMcf)} mcf +{" "}
          {report.lease.production.oilBbl} bbl
        </strong>{" "}
        posting was the largest of the {spellOut(siblings.length + 1)}; here is
        how its siblings posted in the same {report.lease.operator.split(" ")[0]}{" "}
        batch.
      </p>
      {/* THE TABLE IS `hide-s`, THE TILE IS NOT. Essentials keeps the sentence
          above and the footnote below — the plain-English reader is told the
          siblings exist and how they compare, without five columns of decimals.
          Marking the whole tile would have removed the sentence too. */}
      <TableScroll className={gates("hideInEssentials")}>
        {/* 340, not 460: this table lives inside a CSS column about 430px
            wide, and a wider minimum gave the tile its own horizontal
            scrollbar. */}
        <Table minWidth={460}>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Sister unit</TableHeaderCell>
              <TableHeaderCell numeric>Decimal interest</TableHeaderCell>
              <TableHeaderCell numeric>MVestimate</TableHeaderCell>
              <TableHeaderCell numeric>Gas (mcf)</TableHeaderCell>
              <TableHeaderCell numeric>Oil (bbl)</TableHeaderCell>
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
                    {/* The short label, not the full title: four rows of
                        "Smith Gas Unit (267145)" pushed this table past the
                        width of the column it sits in and gave the tile its own
                        scrollbar. The unit number is what distinguishes the
                        sisters anyway — the tile's heading already says which
                        family they belong to. */}
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
                <TableCell numeric>
                  {formatCount(sibling.production.oilBbl)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableScroll>
      <p className="mt-2 text-[10px] text-mv-muted">
        All {spellOut(siblings.length + 1)} units operated by{" "}
        {report.lease.operator} in {report.lease.county} County. Inactive =
        little/no future income projected, not lost ownership — the
        county&rsquo;s appraised value is shown so an owned lease never reads
        bare $0. <EstimateBadge plural />
      </p>
    </Tile>
  );
}

function OwnerGroupTile({ report }: { report: LeaseReportRecord }) {
  /* "the four family units" — this lease plus its sisters, derived so the
     sentence cannot outlive the record. */
  const familyCount = leaseRecords.filter(
    (lease) => lease.name === report.lease.name,
  ).length;

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
        {report.lease.operator.split(" ")[0]} statements across the{" "}
        {spellOut(familyCount)} family units, share documents, and split
        professional review costs.
      </p>
      <div className="flex flex-wrap gap-2">
        <PrototypeButton
          variant="primary"
          acknowledgement="Group opens here ✓ (prototype)"
          title="This lease's private owner group"
        >
          Open this lease’s group
        </PrototypeButton>
        <PrototypeButton
          acknowledgement="Invite opens here ✓ (prototype)"
          title="Invite a co-owner to this lease"
        >
          Invite a co-owner
        </PrototypeButton>
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
      <p className={`mb-2 text-[13px] font-semibold ${gates("hideInEssentials")}`}>
        Free with a 1-year Premium subscription.
      </p>
      <div className="mb-2 flex flex-wrap gap-2">
        {/* The one built destination in this section. */}
        <PortalButtonLink variant="primary" size="sm" href="/lease-audit">
          Audit this unit
        </PortalButtonLink>
        <span className={gates("hideInEssentials")}>
          <PrototypeButton
            acknowledgement="Sample report opens here ✓ (prototype)"
            title="A worked sample audit report"
          >
            Sample report
          </PrototypeButton>
        </span>
      </div>
      <details className="mb-2">
        <summary className="cursor-pointer list-none text-[11px] font-bold text-mv-green-deep [&::-webkit-details-marker]:hidden">
          <span aria-hidden="true">ⓘ </span>What the audit is — and what
          we&rsquo;d need from you
        </summary>
        <p className="mt-1.5 text-[13px]">
          <strong>What it is:</strong> we compare what each month&rsquo;s
          statements appear to support on this unit — public production × your
          stub price × your decimal, less severance — and compare it to what your
          stubs say was paid.
        </p>
        <p className="mt-1.5 text-[13px]">
          <strong>What we need:</strong> ① your division order (proves your exact
          decimal) · ② your check stubs, as many months as you have · ③ your
          lease if handy (optional — it says which deductions are allowed;
          without it we flag every deduction for you to verify).
        </p>
        <p className="mt-1.5 text-[13px]">
          <strong>Why each:</strong> the decimal anchors the math, the stubs are
          the paid side of the comparison, and the lease turns &quot;worth
          verifying&quot; into &quot;allowed or not.&quot; Documents are
          analyzed, not stored.
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
    <Tile pendingData gate={gates("hideInEssentials")}>
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
            ? "Can't compute — acreage not reported (upstream RRC gap, confirmed)"
            : `${Math.round(report.lease.acres / Math.max(report.wellsProducing, 1))} ac`
        }
      />
      {/* The peer rank is scoped by COUNTY AND FORMATION — "Bee Co. / Wilcox" —
          because a recovery-per-acre percentile against a different rock is not
          a comparison. */}
      <StatRow
        label={`Rank vs ${report.lease.county} Co. / ${report.reservoir.shortName} peers`}
        value="Not available yet"
      />
      <StatRow label="EUR per acre (productivity rank)" value="Not available yet" />
      <p className="mt-2 text-[11px] text-mv-muted">
        <strong>Why you&rsquo;d care:</strong> the percentile answers &quot;is my
        rock better than my neighbors&rsquo;?&quot; — it ranks this unit&rsquo;s
        recovery per acre against every lease in the same county and play.
        {report.lease.acres === null &&
          " The unit's acreage is genuinely unreported at the source, so the spacing line stays honest rather than guessed."}
      </p>
    </Tile>
  );
}

function OperatorTile({ report }: { report: LeaseReportRecord }) {
  return (
    <Tile pendingData gate={gates("hideInEssentials")}>
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
          /* "(drilled it, 2003)" — the year comes off `firstProduction`, so the
             label cannot drift from the date shown in the title card. */
          label={`Original operator (drilled it, ${report.firstProduction.split(" ").pop()})`}
          value={report.operatorNote.replace("originally ", "")}
        />
      )}
      {/*
        "Pays close to expected" is the design's own value, restored on request.
        Worth knowing what it asserts: this is an AUDIT FINDING, and the audit
        tile two cards up is still offering to run the first audit on this
        record — so the product has not actually reached this verdict. It reads
        as a result and is a placeholder. When the audit service wires, this row
        should come from the audit, and until then it is the one figure on this
        tile that is not "not available yet".
      */}
      <StatRow
        label="Payment signal (from your audit)"
        value="Pays close to expected"
      />
      <StatRow
        label={`Rank vs ${report.lease.county} Co. / ${report.reservoir.shortName} operators`}
        value="Not available yet"
      />
      <p className="mt-2 text-[11px] text-mv-muted">
        A major drilled this unit; a small operator runs its long tail — the
        normal life cycle for 20-year gas. The peer rank compares{" "}
        {report.lease.operator.split(" ")[0]}&rsquo;s uptime and posting
        punctuality against operators on similar {report.reservoir.shortName}{" "}
        tails.
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
        {/* The two acknowledgements are the prototype's own strings. */}
        <PrototypeButton
          variant="mint"
          acknowledgement="Uploaded ✓ (prototype)"
          title="Upload documents to this lease's workbook"
        >
          ⌲ Upload documents
        </PrototypeButton>
        <PrototypeButton
          acknowledgement="Note saved ✓ (prototype)"
          title="Add a private note to this lease"
        >
          ✎ Add a note
        </PrototypeButton>
      </div>
      <p className="mt-2 text-[10px] text-mv-muted">
        Wires to your member Google Drive folder — one workbook folder per
        member, never shared unless you share it.
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
        {report.operatorNote && (
          <StatRow
            label="Original operator"
            value={report.operatorNote.replace("originally ", "")}
          />
        )}
        <StatRow label="RRC district" value={report.district} />
        {/* The wells row names the wellbore and its status, not just a ratio —
            "1 / 1" alone tells a professional nothing about which well. */}
        <StatRow
          label="Active / total wells"
          value={`${report.wellsProducing} / ${lease.wells} · ${report.wells
            .map((well) => `well ${well.name} (${well.status})`)
            .join(", ")}`}
        />
        <StatRow label="API" value={lease.api} />
        {report.wells[0]?.location && (
          <StatRow label="Location" value={report.wells[0].location} />
        )}
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
        {/* Produced-vs-EUR as a percentage of each stream, then what is left.
            Derived from `recovery` so these three rows, the gas-heavy table and
            its arithmetic footnote are the same six numbers. */}
        {report.recovery && (
          <>
            <StatRow
              label="Gas produced vs EUR"
              value={`${formatCount(report.recovery.producedGas)} / ${formatCount(
                report.recovery.eurGas,
              )} mcf (${(
                (report.recovery.producedGas / report.recovery.eurGas) *
                100
              ).toFixed(1)}%)`}
            />
            <StatRow
              label="Oil produced vs EUR"
              value={`${formatCount(report.recovery.producedOil)} / ${formatCount(
                report.recovery.eurOil,
              )} bbl (${(
                (report.recovery.producedOil / report.recovery.eurOil) *
                100
              ).toFixed(1)}%)`}
            />
            <StatRow
              label="Reserves · next 6 yr"
              value={`${formatCount(report.recovery.reservesGas)} mcf · ${formatCount(
                report.recovery.reservesOil,
              )} bbl`}
            />
          </>
        )}
      </Card>
    </div>
  );
}

/**
 * "WHY DO TWO SMITH UNITS SHOW $0?"
 *
 * SCOPED TO THIS LEASE'S SISTERS, not to the whole record. The design asks about
 * "two Smith units" while the record holds three zero-value leases — the third
 * is Averitt, a different lease with a different operator in a different county.
 * A reader on the Smith report is asking why the units NEXT TO THIS ONE read
 * zero; answering with an unrelated lease widens the question and loses it.
 *
 * Renders nothing where the lease has no zero-value sisters, which is most of
 * them.
 */
function ZeroValueTile({ report }: { report: LeaseReportRecord }) {
  const zeros = leaseRecords.filter(
    (lease) =>
      lease.mvestimate === 0 &&
      lease.name === report.lease.name &&
      lease.number !== report.lease.number,
  );
  if (!zeros.length) return null;

  const shortName = report.lease.name.split(" ")[0];

  return (
    <Tile>
      <CardHeader
        title={
          <h4 className="text-[15px] font-bold">
            Why do {spellOut(zeros.length)} {shortName} unit
            {zeros.length === 1 ? "" : "s"} show $0?
          </h4>
        }
      />
      <p className="mb-2 text-[13px]">
        Units{" "}
        {zeros.map((lease, i) => (
          <span key={lease.number}>
            {i > 0 && (i === zeros.length - 1 ? " and " : ", ")}
            {lease.number}
          </span>
        ))}{" "}
        still post volumes, but the model projects negligible six-year earnings to
        your decimal at the current decline and price outlook. MVestimate is
        forward-looking — <strong>not a statement of past income</strong>.
      </p>
      <PrototypeButton
        variant="mint"
        block
        acknowledgement="Assistant opens here ✓ (prototype)"
        title="Ask the Dossier assistant why these read $0"
      >
        Ask the assistant why
      </PrototypeButton>
    </Tile>
  );
}

/**
 * "COMPARE WITH …" — the other fully captured lease.
 *
 * The sentence is the design's own and lives on the record as `compareNote`: it
 * contrasts the two by weighting, EUR and decimal interest, and none of that is
 * derivable from the lease rows. Only the two captured leases have a
 * counterpart, so the tile renders nothing on the other eight.
 */
function CompareTile({ report }: { report: LeaseReportRecord }) {
  if (!report.compareWith || !report.compareNote) return null;
  const lease = leaseRecords.find(
    (entry) => entry.number === report.compareWith,
  );
  if (!lease) return null;

  return (
    <Tile>
      <CardHeader
        title={
          <h4 className="text-[15px] font-bold">
            Compare with {lease.name.split(" ")[0]}
          </h4>
        }
      />
      <p className="mb-2 text-[13px]">{report.compareNote}</p>
      {/* `btn-block` in the design, and a real destination here. */}
      <PortalButtonLink
        size="sm"
        className="w-full"
        href={leaseReportPath(lease.number)}
      >
        Open the {lease.name.split(" ")[0]} report
      </PortalButtonLink>
    </Tile>
  );
}

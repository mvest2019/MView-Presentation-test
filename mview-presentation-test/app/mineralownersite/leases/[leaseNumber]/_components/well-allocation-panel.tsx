import Link from "next/link";

import { Badge } from "../../../_components/ui/badge";
import { Card, CardHeader, StatRow } from "../../../_components/ui/card";
import { Notice } from "../../../_components/ui/notice";
import { portalGate } from "../../../_components/ui/portal-gating";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableScroll,
} from "../../../_components/ui/table";
import { leaseReportPath } from "../../_lib/lease-routes";
import type { WellReport } from "../_lib/lease-report-types";
import type { WellAllocationRecord } from "../_lib/well-allocation-record";

/**
 * "ALLOCATED DECLINE" — how the lease's forecast splits between wellbores.
 *
 * ── FOUR TIERS ──
 *
 *   Ultra         one well, so all of it is this well's
 *   Essentials    "This well's share" — nothing to divide, nothing estimated
 *   Detailed      + the share card, and what a split WOULD weigh
 *   Professional  + a real four-well lease, the method, and where it is weakest
 *
 * ── THE PROFESSIONAL TIER IS SOMEONE ELSE'S LEASE, ON PURPOSE ──
 *
 * A single-well lease cannot show why allocation matters. So Pro reads a real
 * four-well unit and the prose points at its last row: half the length of its
 * neighbours, 14.56% against a 25% equal split, 29,403 BOE instead of 51,400.
 * The panel then names the two places the method is weak. See
 * `well-allocation-record.ts` for why those admissions are in the data.
 */
export function WellAllocationPanel({
  well,
  leaseNumber,
  allocation,
  wellCount,
}: {
  well: WellReport;
  leaseNumber: string;
  allocation: WellAllocationRecord;
  wellCount: number;
}) {
  const single = wellCount === 1;
  const { example } = allocation;
  const leaseHref = leaseReportPath(leaseNumber);

  return (
    <div className="mt-4 rounded-mv border border-mv-line bg-mv-card p-[18px] shadow-mv">
      <CardHeader
        title={
          <h4 className="text-[15px] font-bold">
            <span className={portalGate.hideInEssentials}>
              Allocated decline — how the lease&rsquo;s forecast splits between
              wellbores
            </span>
            <span className={portalGate.essentialsOnly}>
              This well&rsquo;s share
            </span>
            <span className={portalGate.ultraOnly}>
              This well&rsquo;s share
            </span>
          </h4>
        }
        action={
          <Badge tone="mint" size="xs" className={portalGate.hideInUltra}>
            {single
              ? `${wellCount} well · nothing to allocate`
              : `${wellCount} wells · split shown`}
          </Badge>
        }
      />

      <div className={portalGate.ultraOnly}>
        <p className="mt-1.5 text-base">
          This unit has one well, so all of it is this well&rsquo;s:{" "}
          <strong>{allocation.share.gasStillToCome}</strong> still to come.
        </p>
      </div>

      <Card
        className={`mt-2 border-l-4 border-l-mv-green ${portalGate.essentialsOnly}`}
      >
        <h3 className="mb-1.5 text-lg font-bold">
          One well, so there is nothing to divide
        </h3>
        <p className="mb-2 text-[15px]">
          When a lease has several wells we have to work out how much of its
          production came from each one. This unit has a single well, so that
          question does not arise —{" "}
          <strong>
            Well {well.name}&rsquo;s volumes are the lease&rsquo;s volumes
          </strong>
          , exactly, with nothing estimated in between.
        </p>
        <p className="text-[11px] text-mv-muted">
          On a lease with more wells you would see each well&rsquo;s share here,
          and how confident we are in it.
        </p>
      </Card>

      <div className={portalGate.detailedOnly}>
        <Notice tone="mint" glyph="◎" className="mt-1.5 mb-2.5">
          <strong>
            Nothing here is modelled — and that is the strongest case there is.
          </strong>{" "}
          The engine ranks its evidence, and{" "}
          <em>&ldquo;sole well on a lease&rdquo;</em> sits second, above every
          weighting rule: one well means that well&rsquo;s posted volume is the
          lease&rsquo;s, measured rather than apportioned. The gross forecast on
          the{" "}
          <Link href={leaseHref} className="font-semibold text-mv-green-deep">
            Lease report
          </Link>{" "}
          is therefore this well&rsquo;s forecast too.
        </Notice>

        <div className="grid gap-3 min-[900px]:grid-cols-2">
          <Card>
            <CardHeader
              title={
                <h4 className="text-[15px] font-bold">
                  Well {well.name} — allocated share
                </h4>
              }
              action={
                <Badge tone="mint" size="xs">
                  Measured, not apportioned
                </Badge>
              }
            />
            <div className="mt-1">
              <StatRow
                label={<span className="text-[13px]">Share of lease volumes</span>}
                value={
                  <span className="text-[13px]">
                    {allocation.share.ofLeaseVolumes}
                  </span>
                }
              />
              <StatRow
                label={<span className="text-[13px]">Basis</span>}
                value={<span className="text-[13px]">{allocation.share.basis}</span>}
              />
              <StatRow
                label={<span className="text-[13px]">Gas still to come</span>}
                value={
                  <span className="text-[13px]">
                    {allocation.share.gasStillToCome}
                  </span>
                }
              />
              <StatRow
                label={<span className="text-[13px]">Wells sharing this lease</span>}
                value={
                  <span className="text-[13px]">
                    {allocation.share.wellsSharingLease}
                  </span>
                }
              />
            </div>
          </Card>

          <Card>
            <CardHeader
              title={
                <h4 className="text-[15px] font-bold">
                  What allocation would weigh
                </h4>
              }
              action={
                <Badge tone="slate" size="xs">
                  Damped power law
                </Badge>
              }
            />
            <p className="mt-2 text-[13px]">
              On a multi-well lease each wellbore&rsquo;s share comes from{" "}
              <strong>perforated length</strong>, <strong>proppant</strong> and
              its <strong>24-hour test rate</strong>, damped so no single
              attribute dominates. Shares must sum to the lease total exactly —
              that check is the guardrail, and it is what stops a well being paid
              twice.
            </p>
            <p className="mt-2 text-[11px] text-mv-muted">
              Raw proportional splitting was withdrawn: measured against real
              leases it over-paid the bigger well by roughly{" "}
              <strong>{allocation.rawSplitOverpay}</strong>.
            </p>
          </Card>
        </div>
      </div>

      <div className={portalGate.professionalOnly}>
        <Notice tone="mint" glyph="◎" className="mt-1.5 mb-2.5">
          <strong>Worked example — a real four-well lease.</strong> Smith is
          single-well, so the split is trivial. <strong>{example.lease}</strong>{" "}
          (RRC {example.rrc}, {example.field}, {example.county},{" "}
          {example.operator}) is read live from the engine and shows what this
          panel carries when there is something to divide. Lease gross:{" "}
          <strong>{example.eur}</strong> BOE EUR ·{" "}
          <strong>{example.produced}</strong> produced ·{" "}
          <strong>{example.remaining}</strong> remaining, curve re-solved{" "}
          {example.curveResolved}.
        </Notice>

        <TableScroll className="mb-2.5">
          <Table minWidth={640}>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Wellbore (API-14)</TableHeaderCell>
                <TableHeaderCell numeric>Perf length</TableHeaderCell>
                <TableHeaderCell numeric>24-hr test</TableHeaderCell>
                <TableHeaderCell numeric>Share</TableHeaderCell>
                <TableHeaderCell numeric>vs equal split</TableHeaderCell>
                <TableHeaderCell numeric>Its remaining</TableHeaderCell>
                <TableHeaderCell>Confidence</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {example.wells.map((row) => (
                <TableRow key={row.api}>
                  <TableCell numeric>{row.api}</TableCell>
                  <TableCell numeric>{row.perfLength}</TableCell>
                  <TableCell numeric>{row.test24}</TableCell>
                  <TableCell numeric>
                    <strong>{row.share}</strong>
                  </TableCell>
                  <TableCell numeric>{row.vsEqualSplit}</TableCell>
                  <TableCell numeric>{row.remaining}</TableCell>
                  <TableCell>
                    <Badge tone="mint" size="xs">
                      {row.confidence}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableScroll>

        <p className="mb-2.5 text-[13px]">
          <strong>Read the last row.</strong> That wellbore is barely half the
          length of the others and takes{" "}
          <strong>{example.lastRow.share}</strong> against a{" "}
          <strong>{example.lastRow.equalSplit}</strong> equal split — a{" "}
          <strong>{example.lastRow.difference}</strong> difference on the same
          lease. Split four ways it would have been credited with{" "}
          <strong>{example.lastRow.wouldHaveBeen}</strong> BOE instead of{" "}
          <strong>{example.lastRow.actual}</strong>. On a mineral owner&rsquo;s
          cheque that gap is the whole argument for allocating at all.
        </p>

        <div className="mb-2.5 grid gap-3 min-[900px]:grid-cols-2">
          <Card>
            <CardHeader
              title={
                <h4 className="text-[15px] font-bold">
                  How this split was arrived at
                </h4>
              }
              action={
                <Badge tone="slate" size="xs">
                  {example.method.version}
                </Badge>
              }
            />
            <div className="mt-1">
              <StatRow
                label={<span className="text-[13px]">Basis</span>}
                value={<span className="text-[13px]">{example.method.basis}</span>}
              />
              <StatRow
                label={<span className="text-[13px]">Confidence</span>}
                value={
                  <span className="text-[13px]">{example.method.confidence}</span>
                }
              />
              <StatRow
                label={<span className="text-[13px]">Mass-balance error</span>}
                value={
                  <span className="text-[13px]">
                    {example.method.massBalanceError}
                  </span>
                }
              />
              <StatRow
                label={<span className="text-[13px]">Months allocated</span>}
                value={
                  <span className="text-[13px]">
                    {example.method.monthsAllocated}{" "}
                    <span className="text-[11px] text-mv-muted">
                      {example.method.monthsNote}
                    </span>
                  </span>
                }
              />
              <StatRow
                label={<span className="text-[13px]">Shares sum to</span>}
                value={
                  <span className="text-[13px]">{example.method.sharesSumTo}</span>
                }
              />
            </div>
          </Card>

          <Card>
            <CardHeader
              title={
                <h4 className="text-[15px] font-bold">Where this is weakest</h4>
              }
              action={
                <Badge tone="estimate" size="xs">
                  Known limits
                </Badge>
              }
            />
            <p className="mt-2 text-[13px]">
              <strong>The lateral term is basin-specific, not physics.</strong>{" "}
              Its elasticity runs{" "}
              <strong>{example.weakest.elasticityRange}</strong> across five
              Eagle Ford counties and about{" "}
              <strong>{example.weakest.permianElasticity}</strong> in the
              Permian, where raw proportional splitting is already close to
              right. A single global rule would be wrong in one basin or the
              other — DEFTONES is Eagle Ford, and the damped weight is an Eagle
              Ford correction.
            </p>
            <p className="mt-2 text-[13px]">
              <strong>{example.weakest.noProfileShare}</strong> of Texas wells
              carry no wellbore profile at all, so for most of the state we
              cannot tell a vertical from a horizontal. Where length is unknown
              the basis falls back and the confidence drops — read the confidence
              column before leaning on a share.
            </p>
          </Card>
        </div>

        <Notice tone="slate" glyph="⚠" className="mb-2.5 border-l-4 border-l-mv-line">
          <strong>Allocation does not follow an accepted model.</strong> If an
          engineer overrides Arps on the{" "}
          <Link href={leaseHref} className="font-semibold text-mv-green-deep">
            Lease report
          </Link>
          , the lease curve changes and <em>this split does not</em> — it depends
          on the multi-cycle deconvolution the single-curve alternatives cannot
          produce. The two numbers can disagree, and the tool says so rather than
          quietly transferring one to the other.
        </Notice>
      </div>

      <p
        className={`px-0.5 pt-2 text-[10px] leading-[1.5] text-mv-muted ${portalGate.hideInUltra}`}
      >
        Source:{" "}
        <code className="rounded-[4px] bg-mv-bg px-[3px] font-mono text-[9.5px]">
          decline-curve records.Well_allocation
        </code>
        , read pre-computed at build time.{" "}
        <strong>Split last computed {allocation.splitComputed}</strong>, against
        a lease curve re-solved <strong>{allocation.curveResolved}</strong> — a
        split is only as current as the forecast under it, so both dates are
        stated. Volumes are{" "}
        <strong>BOE at the pipeline&rsquo;s oil + gas ÷ 15</strong>, which is
        internally consistent but{" "}
        <strong>not comparable to a 6:1 industry benchmark</strong> — a figure
        moved between the two without converting is wrong by a margin that is
        large on gas-weighted leases and invisible on oil-weighted ones. They are{" "}
        <strong>gross to the wellbore</strong> — whole-well, never your share;
        your decimal interest is applied on the{" "}
        <Link href={leaseHref} className="font-semibold text-mv-green-deep">
          Lease report
        </Link>
        , where the gross lease forecast also lives.{" "}
        <strong>Not reserves in the SEC sense.</strong>
      </p>
    </div>
  );
}

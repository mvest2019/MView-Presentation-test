import Link from "next/link";

import { Badge } from "../../_components/ui/badge";
import { PortalButtonLink } from "../../_components/ui/button";
import { TierCopy } from "../../_components/ui/tier-copy";
import { gates } from "../../_components/ui/portal-gating";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableScroll,
} from "../../_components/ui/table";
import { formatDollars } from "../_lib/lease-format";
import { sampleLeases, sampleRecord } from "../_lib/sample-leases";

/**
 * WHAT AN UNCLAIMED VISITOR SEES — four leases belonging to nobody real.
 *
 * `nc-only nc-swap` TOGETHER REPLACE THE PAGE. `portal.css` §9 hides every
 * sibling of an `.nc-swap` panel while the record is unclaimed, so this is the
 * whole route in that state. The alternative is an empty table above a claim
 * prompt, which shows a visitor nothing and asks them to imagine the rest.
 *
 * ── THE ONE PLACE THIS MODULE USES `portal.css` CLASSES FOR LOOK, NOT STATE ──
 *
 * `smp-badge` / `smp-tag` / `smp-wrap` / `smp-chip` / `smp-cta` are the portal's
 * SAMPLE CHROME: amber, dashed, with a "SAMPLE" flag pinned to the panel's top
 * corner. They stay as CSS classes, and it is a deliberate exception to this
 * module being Tailwind:
 *
 *   · The dashboard's own unclaimed state renders the same family
 *     (`_components/dashboard/unclaimed-dashboard.tsx`), and the ONE thing this
 *     chrome must never do is look slightly different from one route to the next
 *     — its entire job is being unmistakably not-real data. Two definitions of
 *     it is precisely the drift that would break that.
 *   · Its five-colour amber palette exists nowhere else in either design, so
 *     converting it means five new tokens for a state most readers never reach.
 *
 * Convert it when the dashboard's copy is converted, together, or not at all.
 */
export function UnclaimedSample() {
  return (
    <div className={gates("unclaimedOnly", "unclaimedSwap")}>
      <h2 className="mb-1 text-2xl font-bold">My Leases</h2>
      <p className="mb-3 text-[13px] text-mv-muted">
        Leases follow your claimed owner record automatically — here&apos;s what
        the page becomes.
      </p>

      <div className="smp-badge">
        <span className="smp-tag">SAMPLE PREVIEW</span>
        <p>
          <strong>
            This is what your lease list looks like once you claim your record.
          </strong>{" "}
          The leases below belong to{" "}
          <strong>J. T. Callahan, a fictional sample owner</strong> — not to you
          or any real person. <strong>Free, no-obligation account.</strong>
        </p>
      </div>

      <div className="smp-wrap">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-bold">
            {sampleLeases.length} leases on sample record {sampleRecord.id}{" "}
            <span className="smp-chip">FICTIONAL</span>
          </h3>
          <span className="text-[10px] text-mv-muted">
            operator · county · status · your share, per lease
          </span>
        </div>

        <TableScroll>
          <Table minWidth={640}>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Lease</TableHeaderCell>
                <TableHeaderCell>Operator</TableHeaderCell>
                <TableHeaderCell>County</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell numeric>Est. 6-yr share</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sampleLeases.map((lease) => (
                <TableRow key={lease.name}>
                  <TableCell>
                    <strong>{lease.name}</strong>
                  </TableCell>
                  <TableCell>{lease.operator}</TableCell>
                  <TableCell>{lease.county}</TableCell>
                  <TableCell>
                    <Badge
                      tone={lease.status === "Producing" ? "mint" : "slate"}
                      size="xs"
                    >
                      {lease.status}
                    </Badge>
                  </TableCell>
                  <TableCell numeric>
                    {formatDollars(lease.estimate)}
                    {lease.estimate === 0 && (
                      <span className="ml-1 text-[10px] text-mv-muted">
                        (county value shown)
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableScroll>

        <p className="mt-2 text-[10px] text-mv-muted">
          Every lease arrives with produced volumes, your decimal interest, and a
          plain-English report — sample values shown;{" "}
          <Badge tone="estimate" size="xs">
            estimates, not appraisals
          </Badge>
          .
        </p>
      </div>

      {/* The second-chance CTA wears the SAME green as the pinned claim box at
          the top of the page, so a claim never appears in two colours at once. */}
      <div className="smp-cta cr-foot">
        <span className="cr-foot-txt">
          <strong>These four leases belong to a made-up owner.</strong> Claim your
          record and this list becomes your leases, your decimal interests and
          your own six-year figures — in green, because it&apos;s yours.
        </span>
        <PortalButtonLink variant="primary" href="/claim">
          {/* Per-tier label — see `TierCopy`. */}
          <TierCopy copyKey="claim.cta" />
        </PortalButtonLink>
        <Link href="/operators" className="text-[13px]">
          or browse public operator data →
        </Link>
      </div>
    </div>
  );
}

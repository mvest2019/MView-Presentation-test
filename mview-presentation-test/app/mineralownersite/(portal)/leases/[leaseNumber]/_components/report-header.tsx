"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Badge } from "../../../../_components/ui/badge";
import { PrototypeButton } from "../../../../_components/ui/prototype-button";
import { formatDecimalInterest } from "../../_lib/lease-format";
import { leaseRecords } from "../../_lib/lease-records";
import { leaseNeighbours, leaseReportPath } from "../../_lib/lease-routes";
import type { LeaseRecord } from "../../_lib/lease-types";

/**
 * THE REPORT'S MASTHEAD — where you are, which lease, and how to reach the next.
 *
 * ── THREE WAYS TO MOVE, BECAUSE THEY ANSWER DIFFERENT QUESTIONS ──
 *
 * The breadcrumb goes back up. The arrows step through the record in its own
 * order, for a reader working through all ten. The select jumps to a lease by
 * name, for a reader who came here holding one statement. A page with only the
 * arrows makes the tenth lease nine clicks away.
 *
 * ── THE ARROWS WRAP ──
 *
 * Past the last lease is the first. A disabled arrow at either end is a control
 * that exists to be unusable, and the record is a ring rather than a queue —
 * nobody is working through it in one sitting.
 *
 * The title is centred between them because it is the page's subject, and the
 * sub-line carries the four facts that identify the lease anywhere else: county,
 * district, lease number, operator.
 */
export function LeaseReportHeader({ lease }: { lease: LeaseRecord }) {
  const router = useRouter();
  const { previous, next } = leaseNeighbours(lease.slug);
  const position = leaseRecords.findIndex((entry) => entry.slug === lease.slug) + 1;

  return (
    <div>
      <nav
        aria-label="Breadcrumb"
        className="mb-3 flex flex-wrap items-center gap-1.5 text-[12px]"
      >
        <Link
          href="/mineralownersite/leases"
          className="font-semibold text-mv-green-deep"
        >
          My Leases
        </Link>
        <span aria-hidden="true" className="text-mv-muted">
          ›
        </span>
        <span className="font-semibold text-mv-green-deep">{lease.name}</span>
        <span aria-hidden="true" className="text-mv-muted">
          ›
        </span>
        <span className="font-bold">Lease report</span>
      </nav>

      <div className="flex items-start gap-3">
        <ArrowLink
          href={leaseReportPath(previous.slug)}
          label={`Previous lease — ${previous.name}`}
          glyph="‹"
        />

        <div className="min-w-0 flex-1 text-center">
          <h1 className="text-[26px] leading-tight font-bold">{lease.name}</h1>
          <p className="mt-1 text-[12.5px] text-mv-muted">
            {lease.county} County · RRC district 02
            {lease.number ? ` · lease no. ${lease.number}` : ""} ·{" "}
            {lease.operator}
          </p>
        </div>

        <ArrowLink
          href={leaseReportPath(next.slug)}
          label={`Next lease — ${next.name}`}
          glyph="›"
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <span className="text-[11px] font-bold tracking-[0.08em] text-mv-muted uppercase">
          Lease {position} of {leaseRecords.length}
        </span>

        <label className="min-w-0">
          <span className="sr-only">Jump to a lease</span>
          <select
            value={lease.slug}
            onChange={(event) => router.push(leaseReportPath(event.target.value))}
            className="max-w-[320px] cursor-pointer truncate rounded-[9px] border border-mv-line bg-mv-card px-[10px] py-1.5 text-[12.5px] font-medium text-mv-ink outline-none transition-colors hover:border-mv-green focus-visible:border-mv-green"
          >
            {leaseRecords.map((entry) => (
              <option key={entry.slug} value={entry.slug}>
                {entry.number ? `${entry.name} · Lease ${entry.number}` : entry.name}{" "}
                — {entry.county}
              </option>
            ))}
          </select>
        </label>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Badge tone="mint" size="sm">
            DI {formatDecimalInterest(lease.decimalInterest)}
          </Badge>
          <Badge tone="mint" size="sm">
            {lease.status}
          </Badge>
          <PrototypeButton
            acknowledgement="Prepared ✓ (prototype)"
            title="Produces this report as a PDF. Not connected yet."
          >
            Download report
          </PrototypeButton>
          <PrototypeButton
            acknowledgement="Exported ✓ (prototype)"
            title="Exports this lease's figures as a spreadsheet. Not connected yet."
          >
            CSV
          </PrototypeButton>
        </div>
      </div>
    </div>
  );
}

/** A circular step control. A real link, so it opens in a new tab like one. */
function ArrowLink({
  href,
  label,
  glyph,
}: {
  href: string;
  label: string;
  glyph: string;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-mv-line bg-mv-card text-[18px] text-mv-slate no-underline shadow-mv transition-colors hover:border-mv-green hover:text-mv-green-deep"
    >
      <span aria-hidden="true">{glyph}</span>
    </Link>
  );
}

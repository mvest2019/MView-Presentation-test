import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Home,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

import { LeasePicker } from "./lease-picker";
import { gates } from "../../../../_components/ui/portal-gating";
import { PrototypeButton } from "../../../../_components/ui/prototype-button";
import { formatDecimalInterest } from "../../_lib/lease-format";
import { leaseRecords } from "../../_lib/lease-records";
import { leaseNeighbours, leaseReportPath } from "../../_lib/lease-routes";
import type { LeaseRecord } from "../../_lib/lease-types";

/**
 * THE REPORT'S MASTHEAD — where you are, which lease, and how to reach the next.
 *
 * ── TWO WAYS TO MOVE ──
 *
 * The breadcrumb goes back up; the select jumps to any lease by name, which is
 * how a reader holding one statement gets to it. There were also previous/next
 * arrows either side of a centred title, and they are gone on request: the
 * select reaches all ten in one interaction, so nothing became unreachable —
 * what is lost is stepping through the record in order, which nobody was doing
 * in one sitting.
 *
 * The title is left-aligned now, with the lease's own glyph beside it and the
 * four facts that identify it anywhere else underneath: county, district, lease
 * number, operator. The actions sit opposite it, where a reader looks for them.
 *
 * ── AND THIS IS A SERVER COMPONENT AGAIN ──
 *
 * It carried `"use client"` only for the `useRouter` the old `<select>` needed.
 * The picker owns that now and is the one client boundary here, so the
 * masthead's markup — a heading, a breadcrumb and two chips — stops being
 * shipped as JavaScript.
 */
export function LeaseReportHeader({ lease }: { lease: LeaseRecord }) {
  const { previous, next } = leaseNeighbours(lease.slug);
  const position =
    leaseRecords.findIndex((entry) => entry.slug === lease.slug) + 1;

  return (
    <div>
      <nav
        aria-label="Breadcrumb"
        className="mb-3 flex flex-wrap items-center gap-1.5 text-[12px]"
      >
        <Home
          aria-hidden="true"
          className="h-[13px] w-[13px] flex-none text-mv-muted"
        />
        <span aria-hidden="true" className="text-mv-muted">
          ›
        </span>
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

      {/* A STEP EITHER SIDE OF THE TITLE, for a reader working through the
          record rather than jumping to one lease by name — the picker below
          does that. Both are real links, so middle-click opens a lease in a tab
          and the status bar names where it goes.

          THEY WRAP. Past the last lease is the first. A disabled arrow at
          either end is a control that exists to be unusable, and ten leases is
          a ring rather than a queue. */}
      <div className="flex items-start gap-3">
        <StepLink
          href={leaseReportPath(previous.slug)}
          label={`Previous lease — ${previous.name}`}
        >
          <ChevronLeft aria-hidden="true" className="h-[18px] w-[18px]" />
        </StepLink>

        <div className="min-w-0 flex-1">
          <div className="min-w-0">
            <h1 className="text-[26px] leading-tight font-bold">
              {lease.name}
            </h1>
            <p className="mt-1 text-[12.5px] text-mv-muted">
              {lease.county} County · RRC district 02
              {lease.number ? ` · lease no. ${lease.number}` : ""} ·{" "}
              {lease.operator}
            </p>
          </div>
        </div>

        <StepLink
          href={leaseReportPath(next.slug)}
          label={`Next lease — ${next.name}`}
        >
          <ChevronRight aria-hidden="true" className="h-[18px] w-[18px]" />
        </StepLink>
      </div>

      {/* A RULE UNDER THE TITLE. Above it is what this page is — the lease and
          the four facts that name it; below it is what you can do from here —
          step to another lease, read the interest, take an export. Without the
          line the picker row reads as a third line of the heading.

          `mv-line-strong`, NOT THE USUAL `mv-line`. Both rules in this header
          separate whole blocks, and every card on the page already draws its
          own border in the lighter grey — at the same weight these read as one
          more card edge rather than as the page's own divisions. */}
      <hr className="mt-4 border-t border-mv-line-strong" />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="text-[11px] font-bold tracking-[0.08em] text-mv-muted uppercase">
          Lease {position} of {leaseRecords.length}
        </span>

        <LeasePicker slug={lease.slug} />

        {/* GONE AT ULTRA — `hide-u`. The calm density keeps three things on
            this page: which lease, what it is worth, and one reading of it.
            This group is none of them. The decimal interest and the status are
            both restated in the band immediately below, and a report download
            and a CSV export are the densest controls in the module — the two
            things a reader at Ultra has most plainly said they are not here
            for. The header itself is exempt from the Ultra collapse
            (`mv-u-keep` on the page), so without this the group would be the
            only dense furniture to survive it. */}
        <div
          className={`ml-auto flex flex-wrap items-center gap-2 ${gates("hideInUltra")}`}
        >
          {/* THE WHOLE GROUP SITS ON THE PICKER'S ROW, not beside the title.
              The title and its four identifying facts are what the page is
              ABOUT; the interest, the status and the two exports are things you
              read off it or do with it. One line for the subject, one line for
              everything you can do with it.

              ONE STATUS CHIP. "Active lease" is `lease.status` read plainly;
              a second chip carrying the raw value sat beside it for a while and
              is gone again. The band below still states it in full — "Lease
              status: Producing · 1 of 1 well producing" — which is where the
              count qualifies it. */}
          <HeaderChip>
            <TrendingUp aria-hidden="true" className="h-3.5 w-3.5" />
            DI {formatDecimalInterest(lease.decimalInterest)}
          </HeaderChip>
          <HeaderChip>
            <span
              aria-hidden="true"
              className="h-[6px] w-[6px] rounded-full bg-mv-green-deep"
            />
            {lease.status === "Producing" ? "Active lease" : lease.status}
          </HeaderChip>
          <PrototypeButton
            icon={<Download aria-hidden="true" className="h-4 w-4" />}
            acknowledgement="Prepared ✓ (prototype)"
            title="Produces this report as a PDF. Not connected yet."
          >
            Download report
          </PrototypeButton>
          <PrototypeButton
            icon={<FileSpreadsheet aria-hidden="true" className="h-4 w-4" />}
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

/** One step through the record. A real link, so it behaves like one. */
function StepLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className="mt-1.5 flex h-10 w-10 flex-none items-center justify-center rounded-full border border-mv-line bg-mv-card text-mv-slate no-underline shadow-mv transition-colors hover:border-mv-green hover:text-mv-green-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
    >
      {children}
    </Link>
  );
}

/**
 * A FACT CHIP ON THE ACTION ROW — bordered, and the height of the buttons.
 *
 * These are `Badge`s no longer, and the reason is the company they keep. The
 * row is two facts and two controls; the shared badge is a borderless filled
 * pill 21px tall, which beside a 30px bordered button reads as a different
 * KIND of object rather than as the same row. A border and a matched height
 * make the four read as one strip — the fill and the green ink still say which
 * two are facts and which two you can press.
 *
 * Local rather than a new `Badge` tone, because nothing else in the portal
 * needs a chip sized against a button.
 */
function HeaderChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-[30px] items-center gap-1.5 rounded-full border border-mv-green/35 bg-mv-mint px-3 text-[11.5px] leading-none font-semibold text-mv-green-ink">
      {children}
    </span>
  );
}

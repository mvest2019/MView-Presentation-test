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
import { leaseReportTab, type LeaseReportTab } from "./report-tab-list";
import type { LeaseStep } from "../_lib/lease-report";
import { gates } from "../../../../_components/ui/portal-gating";
import { PrototypeButton } from "../../../../_components/ui/prototype-button";
import { formatDecimalInterest } from "../../_lib/lease-format";
import { routeSlugFor } from "../../_lib/sample-leases";
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
export function LeaseReportHeader({
  lease,
  tab,
  neighbours,
}: {
  lease: LeaseRecord;
  /** Which of the three reports is open — see `LEASE_REPORT_TABS`. */
  tab: LeaseReportTab;
  /**
   * The lease either side of this one, when the record came from the service.
   *
   * `leaseNeighbours` answers only for the ten fixture leases, and it answers
   * for a served lease too — wrongly and silently, with whatever sits either
   * side of index -1. So the served pair is passed in, and the fixture's own is
   * used only when there is none. See `LeaseReport.neighbours`.
   */
  neighbours?: { previous: LeaseStep; next: LeaseStep };
}) {
  const current = leaseReportTab(tab);

  const fixture = leaseNeighbours(lease.slug);
  const steps = neighbours ?? {
    previous: {
      href: leaseReportPath(routeSlugFor(fixture.previous)),
      name: fixture.previous.name,
      number: fixture.previous.number,
    },
    next: {
      href: leaseReportPath(routeSlugFor(fixture.next)),
      name: fixture.next.name,
      number: fixture.next.number,
    },
  };

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
        {/* THE REPORT YOU ARE ON, not always the lease one. A breadcrumb
            whose last crumb names a page you are not reading is worse than no
            crumb: it is the one element on screen whose entire job is to say
            where you are. */}
        <span className="font-bold">{current.label}</span>
      </nav>

      {/* ── THE TITLE STARTS WHERE THE PAGE STARTS ──

          The two steppers used to flank it, one either side. Once they carried
          a lease name they were about 160px wide, and the left one pushed the
          title 175px in from the margin — so the one word identifying the page
          was the only thing on it not aligned with the breadcrumb above, the
          picker below and every card under that. A heading indented past its
          own page reads as an accident.

          THE PAIR SITS TOGETHER ON THE RIGHT, which is also the better place
          for them on their own terms: previous and next are one control in two
          halves, and splitting them across a heading asks the reader to find
          the second one. For a reader working through the record rather than
          jumping to a lease by name — the picker below does that. Both are real
          links, so middle-click opens a lease in a tab and the status bar names
          where it goes.

          THEY WRAP. Past the last lease is the first. A disabled arrow at
          either end is a control that exists to be unusable, and ten leases is
          a ring rather than a queue. */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 flex-1 items-center gap-3.5">
          {/* THE PAGE'S OWN MARK. Every other block on this report opens with a
              glyph — the five facts under the band, the three report tabs, each
              figure in the band — and the title was the one thing that began
              with nothing. It is the ACTIVE TAB's own glyph — a document on
              the lease report, layers on the reservoir, a droplet on the well —
              so the mark beside the title always names the report under it.

              MINT-FILLED, not the outlined square the facts strip uses: those
              five are peers of each other and read as a set, while this one is
              the page identifying itself. It is `aria-hidden` — the heading
              beside it already says what the page is. */}
          <span
            aria-hidden="true"
            className="flex h-[46px] w-[46px] flex-none items-center justify-center rounded-xl border border-mv-green/35 bg-mv-mint text-mv-green-deep"
          >
            <current.Icon className="h-[22px] w-[22px]" />
          </span>

          <div className="min-w-0">
            <h1 className="text-[26px] leading-tight font-bold">
              {lease.name}
            </h1>
            {/* THE DISTRICT IS READ OFF THE LEASE, NOT TYPED HERE. It was
                the literal "02", which was true of all ten fixture leases and
                is a plain falsehood on a record that spans districts — this
                page printed "RRC district 02" over lease `08_46924`. The id
                carries it; a lease without one keeps the fixture's 02, which
                is what those ten are. */}
            <p className="mt-1 text-[12.5px] text-mv-muted">
              {lease.county} County · RRC district{" "}
              {lease.id?.split("_")[0] ?? "02"}
              {lease.number ? ` · lease no. ${lease.number}` : ""} ·{" "}
              {lease.operator}
            </p>
          </div>
        </div>

        <div className="flex flex-none items-center gap-2">
          <StepLink
            href={steps.previous.href}
            direction="previous"
            name={steps.previous.name}
            number={steps.previous.number}
          />
          <StepLink
            href={steps.next.href}
            direction="next"
            name={steps.next.name}
            number={steps.next.number}
          />
        </div>
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
        {/* THE COUNTER AND THE DROPDOWN ARE ONE COMPONENT, because they are one
            answer: how many leases there are and which of them this is. They
            were two reads here — a fixture lookup for the count, the picker's
            own list for the dropdown — and when the lease being read was not in
            the fixture the count printed "Lease 0 of 10" beside a dropdown
            naming somebody else's lease. `LeasePicker` renders both from the
            list it fetches, so they cannot disagree again. */}
        <LeasePicker lease={lease} />

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
/**
 * STEP TO THE LEASE EITHER SIDE — and SAY WHICH ONE.
 *
 * ── A BARE ARROW IS AN UNANSWERED QUESTION ──
 *
 * These were two chevrons in circles. On a page whose whole subject is one
 * named lease out of ten, an arrow that does not say where it goes asks the
 * reader to press it to find out — and pressing it is a full page navigation
 * away from the figures they were reading. The name is the difference between
 * a control you can aim and one you have to try.
 *
 * ── THE NAME IS DROPPED BEFORE THE CONTROL IS ──
 *
 * Under `lg` the label is hidden and the chevron keeps its own 40px target, so
 * the pair survives at any width as the circles they used to be. `aria-label`
 * carries the full sentence either way, so nothing is lost to a screen reader
 * when the text goes.
 *
 * ── THE LEASE NUMBER IS UNDER THE NAME, AND IT IS NOT DECORATION ──
 *
 * Six of the ten leases on this record are called MCCABE ETAL GU. Standing on
 * COOK-KAISER GU, both neighbours read "MCCABE ETAL GU" — two controls with
 * the same words going to different pages. The number is the only thing that
 * tells them apart, so it is printed rather than left to the URL.
 *
 * It is NULLABLE: a filing without one is real on this record (KAISER GAS
 * UNIT), and the line is dropped rather than printing "Lease null".
 *
 * ── AND THE NAME IS TRUNCATED, NOT WRAPPED ──
 *
 * `max-w-[15ch]` with `truncate`: these sit either side of the page title and
 * a wrapping name on one of them would shift the title off centre and change
 * the header's height depending on which lease you happened to be on.
 */
function StepLink({
  href,
  direction,
  name,
  number,
}: {
  href: string;
  direction: "previous" | "next";
  name: string;
  /** Null where the filing carries no lease number — see the note above. */
  number: string | null;
}) {
  const isNext = direction === "next";
  const label = `${isNext ? "Next" : "Previous"} lease — ${name}${
    number ? `, lease ${number}` : ""
  }`;
  const chevron = isNext ? (
    <ChevronRight aria-hidden="true" className="h-[18px] w-[18px] flex-none" />
  ) : (
    <ChevronLeft aria-hidden="true" className="h-[18px] w-[18px] flex-none" />
  );

  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className={`flex h-[46px] flex-none items-center gap-2 rounded-md border border-mv-line bg-mv-card px-3 text-mv-slate no-underline shadow-mv transition-colors hover:border-mv-green hover:text-mv-green-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep ${
        isNext ? "flex-row-reverse" : ""
      }`.trim()}
    >
      {chevron}
      {/* THE NAME ALONE. A "PREVIOUS" / "NEXT" kicker sat over it for a while
          and said nothing the chevron beside it was not already saying — two
          labels for one direction, on a control 40px tall. The name is the
          part that was missing; the word was not. It is still in the
          `aria-label`, where a chevron cannot be read. */}
      <span className="hidden min-w-0 lg:block">
        <span className="block max-w-[15ch] truncate text-[12px] leading-none font-semibold text-mv-ink">
          {name}
        </span>
        {number && (
          <span className="mt-[3px] block text-[10px] leading-none text-mv-muted tabular-nums">
            Lease {number}
          </span>
        )}
      </span>
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

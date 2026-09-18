import {
  CalendarDays,
  Coins,
  Info,
  MapPin,
  TrendingUp,
  Users,
} from "lucide-react";

import { HowItIsBuilt } from "./how-it-is-built";
import type { ReactNode } from "react";

import {
  formatAcres,
  formatCompactDollars,
  formatDollars,
} from "../../_lib/lease-format";
import type { LeaseReport } from "../_lib/lease-report";

/**
 * THE DARK BAND — what this lease is worth, and what it is about to pay.
 *
 * ── THREE VALUATIONS, BECAUSE THEY ANSWER THREE DIFFERENT QUESTIONS ──
 *
 * "Your share" is what a reader owns. "Gross lease valuation" is the whole
 * lease before anyone's decimal, which is the number a neighbour or a buyer
 * quotes and the one most often mistaken for the first. "County appraised" is
 * the public roll against the same interest. Printing only the first invites a
 * reader to compare it with a gross figure they heard somewhere; printing all
 * three makes the comparison the page's rather than theirs.
 *
 * ── THE CLAIMED-STATE BLUR IS OFF THIS BAND, AND IT LEAKED ANYWAY ──
 *
 * Three figures here used to carry `cl-lock`, which blurs them for a reader who
 * has claimed their record but not started a trial: your share, next month,
 * next quarter. It is off, and the reason is worth keeping: THE BLUR NEVER
 * WITHHELD THE NUMBER.
 *
 * Under the blurred share sits its own range — "Range $229,575 – $382,625" —
 * unblurred, which brackets the hidden figure to within a few per cent. Beside
 * it the gross lease valuation is sharp, and the reader's decimal interest is
 * printed twice on the same screen; the two multiplied are the same number
 * again. A gate that hides a figure while three things around it reconstruct it
 * is not a gate, it is a smudge — and it costs the reader the one number the
 * page is about.
 *
 * `data-mv-portfolio-figure` STAYS ON EVERY FIGURE. That is the LAPSED gate,
 * which is a different rule for a different state and is not affected.
 *
 * ── THE SECOND ROW IS THE ONLY PART ANYBODY ACTS ON ──
 *
 * Next month and next quarter, as RANGES. The volumes are the model's and the
 * prices are a deck it holds fixed, so a single figure would claim a precision
 * that does not exist — this operator's deducts are not in the public record at
 * all. The sentence beside them says exactly that rather than leaving the band
 * to be read as a forecast of a cheque.
 */
export function ReportBand({ report }: { report: LeaseReport }) {
  const { lease } = report;

  return (
    <div
      /* See `data-mv-card`: this band draws a gradient and a shadow rather than
         a border, so the unclaimed state outlines it instead of dashing an edge
         it does not have. */
      data-mv-band=""
      className="@container mt-4 rounded-mv p-[18px] text-white shadow-mv-lg bg-[linear-gradient(160deg,var(--color-mv-ink),var(--color-mv-portal-band-end))]"
    >
      {/* A RULE BETWEEN THE THREE, not just air. They are three different
          valuations of the same lease — your share, the whole lease, the county
          roll — and a reader has to keep them apart or the band reads as one
          figure quoted three ways. `divide-x` draws on each child's trailing
          edge, so the padding either side of it is set on the children. */}
      <div className="grid items-start gap-y-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-0 lg:divide-x lg:divide-white/10 [&>*]:lg:px-6 [&>*:first-child]:lg:pl-0 [&>*:last-child]:lg:pr-0">
        <Figure
          icon={<Coins />}
          accent
          label="Your share — MVestimate value"
          value={formatDollars(report.yourValue)}
          caption={`Range ${formatDollars(report.yourValueLow)} – ${formatDollars(report.yourValueHigh)}`}
          emphasis
        />
        <Figure
          icon={<TrendingUp />}
          label="Gross lease valuation"
          value={formatCompactDollars(report.grossValuation)}
          caption={`The whole ${formatAcres(lease.acres)}-acre lease, before anyone's decimal`}
        />
        <Figure
          icon={<Users />}
          label="County appraised — your interest"
          value={formatDollars(report.countyYourInterest)}
          caption={
            report.countyAgreementPercent >= 50 &&
            report.countyAgreementPercent <= 200
              ? "The model and the county broadly agree on this interest."
              : `The county roll is ${report.countyAgreementPercent.toFixed(0)}% of the model's figure — worth opening.`
          }
        />
      </div>

      {/* ── WHAT IT IS ABOUT TO PAY ──

             THE ROW MEASURES THE BAND, NOT THE TIER AND NOT THE VIEWPORT.

             It keyed on `view-detailed` / `view-pro` for a while and that was
             wrong in a way worth recording, because it looked right in every
             test taken at a wide window. A tier sets a MAX width — 1360px at
             Detailed — and the band only reaches it when the window is wide
             enough to allow it. In a 1009px window Detailed draws at 957px, the
             four-column rule still fired, and the caveat got 135px: FOURTEEN
             lines, in a grid row that stretches every cell to the tallest. The
             density said "you have room" and the band did not.

             A viewport media query would be the same mistake one level out —
             the sidebar, the page's own cap and the tier all sit between the
             window and this element. `@container` asks the only question that
             actually decides it: how wide is this band right now.

             800px buys a third cell for the caveat; 1120px buys a fourth for
             the control. Below both, the two figures take a row and the caveat
             and the control share the one under it — which is the arrangement
             Ultra gets, because at 796px of content a third column leaves the
             sentence 188px and SEVEN lines. Tried at 760 and measured; the
             stack is shorter than the squeeze.

             Both numbers are the band's CONTENT box, which is its own 18px of
             padding narrower than the box you see.

             THE CONTROL IS ITS OWN CELL AT THE WIDEST STEP, and that is what
             makes the single line possible: sharing the caveat's cell left the
             sentence about twenty characters wide, which is where the six-line
             version came from. */}
      <div className="mt-4 grid items-center gap-x-6 gap-y-4 border-t border-white/10 pt-4 sm:grid-cols-2 @min-[800px]:grid-cols-[auto_auto_1fr] @min-[800px]:gap-x-0 @min-[1120px]:grid-cols-[auto_auto_1fr_auto] @min-[800px]:[&>*]:px-6 @min-[800px]:[&>*:first-child]:pl-0 @min-[800px]:[&>*:last-child]:pr-0 @min-[800px]:[&>*:nth-child(-n+2)]:border-r [&>*:nth-child(-n+2)]:border-white/10">
        <Figure
          icon={<CalendarDays />}
          small
          label={`Next month · ${report.nextMonthLabel} · your share`}
          value={`${formatDollars(report.nextMonthLow)} – ${formatDollars(report.nextMonthHigh)}`}
          emphasis
        />
        <Figure
          icon={<CalendarDays />}
          small
          label="Next quarter"
          value={`${formatDollars(report.nextQuarterLow)} – ${formatDollars(report.nextQuarterHigh)}`}
          emphasis
        />

        <p className="flex gap-2.5 text-[12px] leading-[1.55] text-mv-portal-band-sub">
          <span
            aria-hidden="true"
            className="mt-[1px] flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full border border-white/20"
          >
            <Info className="h-[11px] w-[11px]" />
          </span>
          <span>
            Ranges, not numbers: prices are held at the model&apos;s deck and
            this operator&apos;s deducts are not in the public record.
          </span>
        </p>

        {/* A PILL, NOT AN UNDERLINED PHRASE INSIDE THE SENTENCE — a reader
            looking for "where does this number come from" should find a
            control rather than have to notice a link in the middle of a
            caveat. It opens the valuation's explainer; see the component. */}
        <div className="flex justify-start self-center @min-[800px]:col-span-3 @min-[800px]:justify-end @min-[800px]:px-0 @min-[1120px]:col-span-1 @min-[1120px]:px-6 @min-[1120px]:pr-0">
          <HowItIsBuilt report={report} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3.5">
        <p className="flex items-center gap-2 text-[12.5px]">
          <span
            aria-hidden="true"
            className="inline-block h-2 w-2 rounded-full bg-mv-green"
          />
          <strong>Lease status: {lease.status}</strong>
          <span className="text-mv-portal-band-sub">
            · {lease.wells} of {lease.wells} well
            {lease.wells === 1 ? "" : "s"} producing
          </span>
        </p>
        {/* The band repeats on all three reports — lease, reservoir and well —
            so a reader moving between them never loses the money. */}
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-[10px] font-bold tracking-[0.08em] text-mv-portal-band-sub uppercase">
          <MapPin aria-hidden="true" className="h-3 w-3" />
          Pinned across lease → reservoir → wells
        </span>
      </div>
    </div>
  );
}

function Figure({
  icon,
  label,
  value,
  caption,
  accent = false,
  emphasis = false,
  small = false,
}: {
  icon?: ReactNode;
  label: string;
  value: string;
  caption?: string;
  /** The green left rule that marks the lead figure. */
  accent?: boolean;
  emphasis?: boolean;
  small?: boolean;
}) {
  return (
    <div
      className={`flex gap-3 ${
        accent ? "border-l-[3px] border-l-mv-green pl-4" : ""
      }`.trim()}
    >
      {icon && (
        <span
          aria-hidden="true"
          className={`mt-[1px] flex flex-none items-center justify-center rounded-full bg-white/[0.07] text-mv-green ring-1 ring-white/15 ${
            small
              ? "h-8 w-8 [&_svg]:h-4 [&_svg]:w-4"
              : "h-9 w-9 [&_svg]:h-[18px] [&_svg]:w-[18px]"
          }`}
        >
          {icon}
        </span>
      )}

      <div className="min-w-0">
        {/* THE ⓘ SITS WITH THE LABEL, not at the end of the column. It marks
            that the figure is qualified and the caption underneath is the
            qualification; `inline-flex` with a gap keeps it against the last
            word rather than floating to the far right of the cell, which is
            what made it read as a control the first time round. */}
        <p className="inline-flex items-center gap-1.5 text-[10.5px] font-bold tracking-[0.09em] text-mv-on-head-soft uppercase">
          {label}
          {caption && (
            <Info aria-hidden="true" className="h-[11px] w-[11px] flex-none" />
          )}
        </p>
        {/*
          `data-mv-portfolio-figure` IS THE LAPSED GATE AND IT STAYS. What went
          is `cl-lock`, the CLAIMED one — see the note at the top of the file.
        */}
        <p
          data-mv-portfolio-figure=""
          className={`mt-0.5 font-bold tabular-nums ${small ? "text-[19px]" : "text-[25px]"} ${
            emphasis ? "text-mv-green" : ""
          }`.trim()}
        >
          {value}
        </p>
        {caption && (
          <p className="mt-1 max-w-[34ch] text-[12px] leading-[1.5] text-mv-portal-band-sub">
            {caption}
          </p>
        )}
      </div>
    </div>
  );
}

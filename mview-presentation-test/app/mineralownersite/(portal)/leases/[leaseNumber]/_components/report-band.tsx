import {
  ArrowRight,
  ExternalLink,
  CalendarDays,
  Coins,
  Info,
  MapPin,
  TrendingUp,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";

import { formatAcres, formatCompactDollars, formatDollars } from "../../_lib/lease-format";
import { portalGate } from "../../../../_components/ui/portal-gating";
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
    <div className="mt-4 rounded-mv p-[22px] text-white shadow-mv-lg bg-[linear-gradient(160deg,var(--color-mv-ink),var(--color-mv-portal-band-end))]">
      {/* A RULE BETWEEN THE THREE, not just air. They are three different
          valuations of the same lease — your share, the whole lease, the county
          roll — and a reader has to keep them apart or the band reads as one
          figure quoted three ways. `divide-x` draws on each child's trailing
          edge, so the padding either side of it is set on the children. */}
      <div className="grid gap-y-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-0 lg:divide-x lg:divide-white/10 [&>*]:lg:px-6 [&>*:first-child]:lg:pl-0 [&>*:last-child]:lg:pr-0">
        <Figure
          icon={<Coins />}
          accent
          label="Your share — MVestimate value"
          value={formatDollars(report.yourValue)}
          caption={`Range ${formatDollars(report.yourValueLow)} – ${formatDollars(report.yourValueHigh)}`}
          emphasis
          locked
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

      <div className="mt-5 grid gap-y-4 border-t border-white/10 pt-5 lg:grid-cols-[auto_auto_1fr] lg:gap-x-0 lg:divide-x lg:divide-white/10 [&>*]:lg:px-6 [&>*:first-child]:lg:pl-0 [&>*:last-child]:lg:pr-0">
        <Figure
          icon={<CalendarDays />}
          small
          label={`Next month · ${report.nextMonthLabel} · your share`}
          value={`${formatDollars(report.nextMonthLow)} – ${formatDollars(report.nextMonthHigh)}`}
          emphasis
          locked
        />
        <Figure
          icon={<CalendarDays />}
          small
          label="Next quarter"
          value={`${formatDollars(report.nextQuarterLow)} – ${formatDollars(report.nextQuarterHigh)}`}
          emphasis
          locked
        />
        <div className="flex flex-wrap items-center justify-between gap-3 self-center">
          <p className="flex max-w-[52ch] gap-2.5 text-[11.5px] leading-[1.5] text-mv-portal-band-sub">
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

          {/* A PILL, NOT AN UNDERLINED PHRASE INSIDE THE SENTENCE. It jumps to
              the twelve-month card that shows the workings, and a reader looking
              for "where does this number come from" should find a control rather
              than have to notice a link in the middle of a caveat. */}
          <a
            href="#twelve-months"
            className="inline-flex flex-none items-center gap-2 rounded-full border border-white/25 px-3.5 py-1.5 text-[11.5px] font-semibold text-white no-underline transition-colors hover:bg-white/10"
          >
            <ExternalLink aria-hidden="true" className="h-[13px] w-[13px]" />
            How it is built
            <ArrowRight aria-hidden="true" className="h-[13px] w-[13px]" />
          </a>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
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
  locked = false,
}: {
  icon?: ReactNode;
  label: string;
  value: string;
  caption?: string;
  /** The green left rule that marks the lead figure. */
  accent?: boolean;
  emphasis?: boolean;
  small?: boolean;
  locked?: boolean;
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
            small ? "h-8 w-8 [&_svg]:h-4 [&_svg]:w-4" : "h-9 w-9 [&_svg]:h-[18px] [&_svg]:w-[18px]"
          }`}
        >
          {icon}
        </span>
      )}

      <div className="min-w-0">
      <p className="flex items-center gap-1.5 text-[10.5px] font-bold tracking-[0.09em] text-mv-on-head-soft uppercase">
        {label}
        {caption && (
          /* THE GLYPH MARKS THAT THIS FIGURE IS QUALIFIED, and the caption
             directly under it is the qualification. It carries no tooltip of
             its own: a second copy of the sentence already on screen would be
             a control that repeats rather than adds. */
          <Info aria-hidden="true" className="h-[11px] w-[11px] flex-none" />
        )}
      </p>
      <p
        data-mv-portfolio-figure=""
        className={`mt-1 font-bold tabular-nums ${small ? "text-[19px]" : "text-[27px]"} ${
          emphasis ? "text-mv-green" : ""
        } ${locked ? portalGate.lockedValue : ""}`.trim()}
      >
        {value}
      </p>
      {caption && (
        <p className="mt-1.5 max-w-[34ch] text-[12px] leading-[1.5] text-mv-portal-band-sub">
          {caption}
        </p>
      )}
      </div>
    </div>
  );
}

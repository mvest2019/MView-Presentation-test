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
      <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
        <Figure
          accent
          label="Your share — MVestimate value"
          value={formatDollars(report.yourValue)}
          caption={`range ${formatDollars(report.yourValueLow)} – ${formatDollars(report.yourValueHigh)}`}
          emphasis
          locked
        />
        <Figure
          label="Gross lease valuation"
          value={formatCompactDollars(report.grossValuation)}
          caption={`the whole ${formatAcres(lease.acres)}-acre lease, before anyone's decimal`}
        />
        <Figure
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

      <div className="mt-5 grid gap-x-6 gap-y-4 border-t border-white/10 pt-5 lg:grid-cols-[auto_auto_1fr]">
        <Figure
          small
          label={`Next month · ${report.nextMonthLabel} · your share`}
          value={`${formatDollars(report.nextMonthLow)} – ${formatDollars(report.nextMonthHigh)}`}
          emphasis
          locked
        />
        <Figure
          small
          label="Next quarter"
          value={`${formatDollars(report.nextQuarterLow)} – ${formatDollars(report.nextQuarterHigh)}`}
          emphasis
          locked
        />
        <p className="self-center text-[11.5px] leading-[1.5] text-mv-portal-band-sub">
          Ranges, not numbers: prices are held at the model&apos;s deck and this
          operator&apos;s deducts are not in the public record.{" "}
          <a
            href="#twelve-months"
            className="font-semibold text-white underline"
          >
            How it is built →
          </a>
        </p>
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
        <span className="rounded-full border border-white/15 px-3 py-1 text-[10px] font-bold tracking-[0.08em] text-mv-portal-band-sub uppercase">
          Pinned across lease → reservoir → wells
        </span>
      </div>
    </div>
  );
}

function Figure({
  label,
  value,
  caption,
  accent = false,
  emphasis = false,
  small = false,
  locked = false,
}: {
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
    <div className={accent ? "border-l-[3px] border-l-mv-green pl-4" : ""}>
      <p className="text-[10.5px] font-bold tracking-[0.09em] text-mv-on-head-soft uppercase">
        {label}
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
        <p className="mt-1 max-w-[34ch] text-[11px] leading-[1.45] text-mv-portal-band-sub">
          {caption}
        </p>
      )}
    </div>
  );
}

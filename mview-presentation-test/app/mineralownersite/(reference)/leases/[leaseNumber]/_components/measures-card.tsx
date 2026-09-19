import {
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Clock,
  CircleDollarSign,
  Droplet,
  Flag,
  Flame,
  PieChart,
  Info,
  Layers,
  List,
  Ruler,
  Scale,
  Star,
} from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "../../../../_components/ui/badge";
import { Card } from "../../../../_components/ui/card";
import {
  formatCompactDollars,
  formatCount,
  formatDollars,
} from "../../_lib/lease-format";
import type { LeaseReport } from "../_lib/lease-report";

/**
 * "HOW IT MEASURES UP" — against the rest of the record, and against itself.
 *
 * ── TWO COMPARISONS, AND THEY ARE DIFFERENT QUESTIONS ──
 *
 * The left half asks how much of the reader's record rides on this one lease:
 * a rank is meaningless without the share behind it, so every rank here is
 * printed with the percentage that produced it. The right half asks how this
 * lease compares with itself — dollars per acre, realised prices, how far
 * through the gas it is — which is the only comparison available for a lease
 * that has no peer on the record.
 *
 * ── EACH BLOCK IS ITS OWN PANEL ──
 *
 * Five of them, and they answer five separate questions. Run together they read
 * as one long column and a reader loses which heading the bars under their eye
 * belong to; a border round each keeps the question attached to its answer.
 *
 * ── THE LAST BLOCK ON THE LEFT IS THE MODEL BEING MARKED ──
 *
 * Two bars, what the model wanted and what the state posted, for the last filed
 * month. It is the most useful thing on the page for deciding how much weight
 * to put on every projection above it, and the sentence under it settles the
 * argument the same way every time: the filing is the fact.
 */
export function MeasuresCard({ report }: { report: LeaseReport }) {
  const { lease } = report;
  const topThree = report.recordBars.slice(0, 3);
  const topThreeShare =
    report.recordTotal > 0
      ? (topThree.reduce((total, bar) => total + bar.value, 0) /
          report.recordTotal) *
        100
      : 0;

  return (
    <Card padded={false} className="mt-4 px-[22px] py-[18px]">
      {/* THE HEADING CARRIES BOTH CAVEATS, so neither half has to repeat them:
          "against your record, and against itself" names the two columns, and
          "derived, not read" applies to every figure under it. */}
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-[10px] bg-mv-portal-wash text-mv-slate"
          >
            <BarChart3 className="h-[17px] w-[17px]" />
          </span>
          <div>
            <h3 className="text-[16px] leading-tight font-bold">
              How it measures up
            </h3>
            <p className="mt-0.5 text-[12px] text-mv-muted">
              Where it sits among your {report.total} leases
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <Badge tone="quiet" size="xs">
            <Scale aria-hidden="true" className="h-3 w-3" />
            Against your record, and against itself
          </Badge>
          <span className="text-[10.5px] text-mv-muted">Derived, not read</span>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <Rank
              icon={<Star />}
              rank={report.rankByValue}
              label="by value"
              share={report.shareOfRecordValue}
              suffix="of your record"
            />
            <Rank
              icon={<CalendarDays />}
              rank={report.rankLastMonth}
              label="last month"
              share={report.shareOfRecordLastMonth}
              suffix="of it"
            />
            <Rank
              icon={<ArrowUpRight />}
              rank={report.rankGasEver}
              label="gas ever"
              share={report.shareOfRecordGasEver}
              suffix="of all of it"
            />
          </div>

          <Panel>
            <PanelHeading
              icon={<List />}
              text="How much of your record rides on it"
              aside={formatCompactDollars(report.recordBars[0]?.value ?? 0)}
              asideStrong
            />

            <ul className="mt-3 space-y-1.5">
              {report.recordBars.map((bar) => {
                const width =
                  report.recordBars[0].value > 0
                    ? (bar.value / report.recordBars[0].value) * 100
                    : 0;
                const self = bar.slug === lease.slug;
                return (
                  <li
                    key={bar.slug}
                    className="flex items-center gap-2.5 text-[11.5px]"
                  >
                    <span
                      className={`w-[56px] flex-none tabular-nums ${
                        self ? "font-bold" : "text-mv-muted"
                      }`}
                    >
                      {bar.label}
                    </span>
                    {/* `mv-muted` AND NOT `mv-line-strong` FOR THE REST.
                        The fill was #d5dae0 on a #e8ecf3 track — nineteen
                        points apart across all three channels, a contrast
                        ratio of about 1.15 to 1. The widths were right the
                        whole time and no reader could see them: every bar but
                        this lease's read as an empty track. A bar you cannot
                        measure by eye is not a bar chart.

                        The lease being read stays `mv-ink`, so it is still the
                        one that carries. The others are now legible against
                        the track without competing with it. */}
                    <span className="h-2.5 min-w-0 flex-1 rounded-full bg-mv-portal-wash">
                      <span
                        className={`block h-full rounded-full ${
                          self ? "bg-mv-ink" : "bg-mv-muted"
                        }`}
                        style={{ width: `${width}%` }}
                      />
                    </span>
                    <span
                      className={`w-[62px] flex-none text-right tabular-nums ${
                        self ? "font-bold" : "text-mv-muted"
                      }`}
                    >
                      {formatCompactDollars(bar.value)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Panel>

          <Note>
            This lease is {report.shareOfRecordValue.toFixed(1)}% of the{" "}
            {formatCompactDollars(report.recordTotal)} the record projects to
            you. The largest three carry {topThreeShare.toFixed(1)}% of it
            between them, so the other {report.total - 3} together are{" "}
            {(100 - topThreeShare).toFixed(1)}%.
          </Note>

          {/* NO EXPECTATION ON FILE IS NOT A MISS OF ZERO. The model does not
              always hold a figure for the month a lease last filed, and two
              empty bars under "+0.0% against what the model wanted" would read
              as the lease having come in exactly on model — a claim, where the
              truth is that there is nothing to compare. The service says why in
              a sentence of its own and that sentence is what goes here. See
              `LeaseReport.modelNote`. */}
          <Panel>
            <PanelHeading
              icon={<Flag />}
              text="Filed against what the model expected"
            />
            {report.modelNote ? (
              <p className="mt-3 text-[12.5px] leading-[1.55] text-mv-slate">
                {report.modelNote}
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                <CompareBar
                  label="The model wanted"
                  value={report.modelWanted}
                  peak={Math.max(report.modelWanted, report.statePosted)}
                  tone="pale"
                />
                <CompareBar
                  label="The state posted"
                  value={report.statePosted}
                  peak={Math.max(report.modelWanted, report.statePosted)}
                  tone="dark"
                />
              </div>
            )}
          </Panel>

          {!report.modelNote && (
            <Note>
              {report.lastPosting} · MCF at your interest, and the filing is{" "}
              {report.modelMissPercent >= 0 ? "+" : ""}
              {report.modelMissPercent.toFixed(1)}% against what the model
              wanted. The filing is the fact.
            </Note>
          )}
        </section>

        <section>
          <Panel>
            <PanelHeading icon={<Scale />} text="The ratios that compare it" />

            <dl className="mt-3 grid gap-2 sm:grid-cols-3">
              <Ratio
                icon={<Ruler />}
                label="Value per acre"
                value={formatDollars(report.valuePerAcre)}
                sub="your share"
              />
              <Ratio
                icon={<Flame />}
                label="Realised gas"
                value={`$${report.realisedGas.toFixed(2)}`}
                sub="per MCF"
              />
              <Ratio
                icon={<Droplet />}
                label="Realised oil"
                value={`$${report.realisedOil.toFixed(2)}`}
                sub="per BBL"
              />
              <Ratio
                icon={<CalendarDays />}
                label="Half made by"
                value={report.halfMadeBy}
                sub={`${report.halfMadeInMonths} months out`}
              />
              <Ratio
                icon={<Layers />}
                label="Acres per well"
                value={formatCount(Math.round(report.acresPerWell))}
                sub={`${lease.wells} on ${report.lease.acres} ac`}
              />
              <Ratio
                icon={<Clock />}
                label="State is behind"
                value={`${report.stateBehindMonths} mo`}
                sub="measured"
              />
            </dl>

            {/* A RULE BETWEEN THE THREE BLOCKS OF THIS PANEL. Six ratio cards,
                then a bar, then another bar — three different kinds of thing
                under one heading, separated by nothing but margin. At that
                spacing the second heading read as a caption on the cards above
                it rather than as the start of something new. The rule is what
                says the panel has parts. */}
            <hr className="mt-5 border-t border-mv-line" />

            <div className="mt-4">
              {/* A CLOSED SHAPE, NOT A GAUGE. The gauge glyph is an open arc
                  with a needle, and at 15px beside small-caps type it reads as
                  a circle with a piece cut out of it rather than as a dial. A
                  pie says the same thing — a proportion of a whole — without
                  looking broken. */}
              <PanelHeading
                icon={<PieChart />}
                text="How far through the gas it is"
                aside="posted against still expected"
                small
              />
            </div>
            <SplitBar
              left={{
                label: `Produced ${report.gasProducedPercent.toFixed(1)}%`,
                percent: report.gasProducedPercent,
                className: "bg-mv-ink text-white",
              }}
              right={{
                label: `Ahead ${(100 - report.gasProducedPercent).toFixed(1)}%`,
                /* HATCHED, NOT FLAT. The left half is filed and the right half
                   is a model; a solid block either side would make them look
                   like two measurements of the same kind. */
                className:
                  "text-mv-slate bg-mv-portal-wash bg-[repeating-linear-gradient(135deg,transparent_0_5px,var(--color-mv-line)_5px_6px)]",
              }}
            />
            <Note tight>
              {report.gasProducedPercent.toFixed(1)}% of the gas this lease is
              expected to make has already been posted by the state over{" "}
              {report.postedMonths} months. The remainder is the model&apos;s,
              not a filing — and it is the part a sale would be pricing.
            </Note>

            <hr className="mt-5 border-t border-mv-line" />

            <div className="mt-4">
              <PanelHeading
                icon={<CircleDollarSign />}
                text="Where the projected money comes from"
                aside="across the whole projection"
                small
              />
            </div>
            <SplitBar
              left={{
                label: `Gas ${report.projectedGasPercent.toFixed(1)}%`,
                percent: report.projectedGasPercent,
                className: "bg-mv-green-deep text-white",
              }}
              right={{
                label: `Oil ${report.projectedOilPercent.toFixed(1)}%`,
                className: "bg-mv-oil text-white",
              }}
            />
            <Note tight>
              Oil is {report.projectedOilPercent.toFixed(1)}% of the money and{" "}
              {report.oilYield.toFixed(0)} BBL per thousand MCF of the stream —
              which is why both prices matter to you, not just the bigger
              number.
            </Note>
            <Note tight>
              Every figure here is two figures from this page divided by each
              other, so none of them can disagree with it. The two realised
              prices are the model&apos;s own cash for each product over that
              product&apos;s own volume — neither is the price your operator
              actually received: that is on a statement and is not public.
            </Note>
          </Panel>
        </section>
      </div>
    </Card>
  );
}

/** One bordered block. See the note at the top for why each question gets one. */
function Panel({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-mv border border-mv-line px-4 py-3.5">
      {children}
    </div>
  );
}

/** A heading with its glyph, and an optional right-hand aside. */
function PanelHeading({
  icon,
  text,
  aside,
  asideStrong = false,
  small = false,
}: {
  icon: ReactNode;
  text: string;
  aside?: string;
  asideStrong?: boolean;
  small?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h4
        className={`flex items-center gap-2 font-bold ${
          small
            ? "text-[10.5px] tracking-[0.08em] text-mv-slate uppercase"
            : "text-[13px]"
        }`}
      >
        <span
          aria-hidden="true"
          className="flex-none text-mv-green-deep [&_svg]:h-[15px] [&_svg]:w-[15px]"
        >
          {icon}
        </span>
        {text}
      </h4>
      {aside && (
        <span
          className={
            asideStrong
              ? "text-[12.5px] font-bold tabular-nums"
              : "text-[11px] text-mv-muted"
          }
        >
          {aside}
        </span>
      )}
    </div>
  );
}

/** The asides under a block — marked as commentary, not as findings. */
function Note({
  children,
  tight = false,
}: {
  children: ReactNode;
  tight?: boolean;
}) {
  return (
    <p
      className={`flex gap-2 text-[11.5px] leading-[1.55] text-mv-muted ${
        tight ? "mt-2" : "px-1"
      }`}
    >
      <Info
        aria-hidden="true"
        className="mt-[3px] h-[13px] w-[13px] flex-none"
      />
      <span>{children}</span>
    </p>
  );
}

function Rank({
  icon,
  rank,
  label,
  share,
  suffix,
}: {
  icon: ReactNode;
  rank: number;
  label: string;
  share: number;
  suffix: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-mv border border-mv-line px-3.5 py-3">
      <span
        aria-hidden="true"
        className="mt-[3px] flex-none text-mv-muted [&_svg]:h-[15px] [&_svg]:w-[15px]"
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[20px] leading-tight font-bold">#{rank}</p>
        <p className="text-[10px] font-bold tracking-[0.08em] text-mv-muted uppercase">
          {label}
        </p>
        <p className="mt-0.5 text-[11.5px] text-mv-slate">
          {share.toFixed(1)}% {suffix}
        </p>
      </div>
    </div>
  );
}

function CompareBar({
  label,
  value,
  peak,
  tone,
}: {
  label: string;
  value: number;
  peak: number;
  tone: "pale" | "dark";
}) {
  return (
    <div className="flex items-center gap-2.5 text-[11.5px]">
      <span className="w-[110px] flex-none text-mv-muted">{label}</span>
      {/* The same contrast fix as the ranking bars above: `pale` was all but
          invisible against the track, so "the model wanted" — usually the
          LONGER of the two — looked like the empty one. */}
      <span className="h-2.5 min-w-0 flex-1 rounded-full bg-mv-portal-wash">
        <span
          className={`block h-full rounded-full ${
            tone === "dark" ? "bg-mv-ink" : "bg-mv-muted"
          }`}
          style={{ width: `${peak > 0 ? (value / peak) * 100 : 0}%` }}
        />
      </span>
      {/* A FIGURE THAT IS NOT ZERO DOES NOT PRINT AS ZERO. `Math.round` turned
          a real filing of a fraction of an MCF into "0" while the bar beside it
          still drew a pixel and the sentence underneath still said the miss was
          -99.9% rather than -100%. Three parts of one row disagreeing about
          whether anything was filed at all.

          A small interest is the ordinary case for this, not an edge one: at
          0.2983% of a lease, a month the state posted in the hundreds of MCF is
          well under one MCF to the reader. */}
      <span className="w-[56px] flex-none text-right font-bold tabular-nums">
        {value > 0 && Math.round(value) === 0
          ? "<1"
          : formatCount(Math.round(value))}
      </span>
    </div>
  );
}

/** Two labelled halves of one bar — the proportion and both figures at once. */
function SplitBar({
  left,
  right,
}: {
  left: { label: string; percent: number; className: string };
  right: { label: string; className: string };
}) {
  return (
    <div className="mt-2 flex overflow-hidden rounded-[8px] text-[11.5px] font-bold">
      <span
        className={`px-3 py-1.5 text-center whitespace-nowrap ${left.className}`}
        style={{ width: `${left.percent}%` }}
      >
        {left.label}
      </span>
      <span
        className={`flex-1 px-3 py-1.5 text-center whitespace-nowrap ${right.className}`}
      >
        {right.label}
      </span>
    </div>
  );
}

function Ratio({
  icon,
  label,
  value,
  sub,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-md border border-mv-line px-3 py-2.5">
      <dt className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.08em] text-mv-muted uppercase">
        <span
          aria-hidden="true"
          className="flex-none [&_svg]:h-[13px] [&_svg]:w-[13px]"
        >
          {icon}
        </span>
        {label}
      </dt>
      <dd className="mt-1 text-[15px] font-bold tabular-nums">{value}</dd>
      <dd className="text-[11px] text-mv-muted">{sub}</dd>
    </div>
  );
}

import { Badge } from "../../../../_components/ui/badge";
import { Card, CardHeader } from "../../../../_components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableScroll,
} from "../../../../_components/ui/table";
import { formatCount, formatDollars } from "../../_lib/lease-format";
import { DECK_SHOCK, type LeaseReport } from "../_lib/lease-report";

/**
 * "TWELVE MONTHS BEHIND, TWELVE AHEAD" — filed on the left, projected on the
 * right.
 *
 * ── THE SPLIT IS THE ARGUMENT ──
 *
 * Everything on the left has been filed with the state and can be checked.
 * Everything on the right is a model at a fixed price deck. Putting them side
 * by side at the same scale is the clearest way to say that the projection is
 * an extension of the record rather than a separate claim — and the column
 * headings say which is which rather than relying on the reader noticing.
 *
 * ── EVERY FORWARD FIGURE IS A RANGE ──
 *
 * The volumes are the model's and the prices are a deck, so a single number
 * would be a precision nobody has: the operator's deducts are not public and the
 * differential moves. The sensitivity row below the table makes the same point
 * from the other end — it moves ONLY the price, so its spread is how much of the
 * projection is a market assumption rather than a production one.
 */
export function TwelveMonthsCard({ report }: { report: LeaseReport }) {
  return (
    <Card padded={false} id="twelve-months" className="mt-4 scroll-mt-28 px-[22px] py-[18px]">
      <CardHeader
        title={
          <h3 className="text-[15px] font-bold">
            Twelve months behind, twelve ahead
          </h3>
        }
        action={
          <Badge tone="slate" size="xs">
            filed on the left, projected on the right
          </Badge>
        }
      />

      <div className="mt-4 grid gap-7 lg:grid-cols-2">
        <section>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-[13.5px] font-bold">The last twelve filed months</h4>
            <Badge tone="mint" size="xs">
              {report.trailingFrom} → {report.trailingTo}
            </Badge>
          </div>

          <RangeBar
            label="Gas · MCF a day"
            tone="gas"
            low={report.gasPerDayLow}
            high={report.gasPerDayHigh}
            average={report.gasPerDayAvg}
          />
          <RangeBar
            label="Oil · BBL a day"
            tone="oil"
            low={report.oilPerDayLow}
            high={report.oilPerDayHigh}
            average={report.oilPerDayAvg}
          />

          <dl className="mt-4 grid grid-cols-2 gap-x-5">
            <Fact label="Strongest month" value={report.strongestMonth} sub={`${report.gasPerDayHigh.toFixed(1)} MCF/d`} />
            <Fact label="Thinnest month" value={report.thinnestMonth} sub={`${report.gasPerDayLow.toFixed(1)} MCF/d`} />
            <Fact label="Best month for you" value={report.bestMonthForYou} sub={formatDollars(report.bestMonthShare)} />
            <Fact label="Thinnest month for you" value={report.thinnestMonthForYou} sub={formatDollars(report.thinnestMonthShare)} />
            <Fact label="Decline" value={`${report.declinePerMonth.toFixed(1)}% a month`} sub="compounded" />
            <Fact label="Oil yield" value={`${report.oilYield.toFixed(0)} BBL`} sub="per thousand MCF" />
            <Fact label="Gas, twelve months" value={`${formatCount(Math.round(report.trailingGas))} MCF`} sub="your share" />
            <Fact label="Oil, twelve months" value={`${formatCount(Math.round(report.trailingOil))} BBL`} sub="your share" />
            <Fact label="Your share, twelve months" value={formatDollars(report.trailingShare)} sub="at the model's own price deck" />
          </dl>

          <Seasonality report={report} />
        </section>

        <section>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-[13.5px] font-bold">The next 12 months</h4>
            <Badge tone="estimate" size="xs">
              ranges, not numbers
            </Badge>
          </div>

          <TableScroll className="mt-2">
            <Table minWidth={420}>
              <TableHead>
                <TableRow className="bg-mv-portal-wash">
                  <TableHeaderCell>Month</TableHeaderCell>
                  <TableHeaderCell numeric>Gas</TableHeaderCell>
                  <TableHeaderCell numeric>Oil</TableHeaderCell>
                  <TableHeaderCell numeric>Your share</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {report.forward.map((cell) => (
                  <TableRow key={cell.label}>
                    <TableCell className="whitespace-nowrap">{cell.label}</TableCell>
                    <TableCell numeric>{formatCount(Math.round(cell.gas))}</TableCell>
                    <TableCell numeric>{formatCount(Math.round(cell.oil))}</TableCell>
                    <TableCell numeric className="whitespace-nowrap">
                      {formatDollars(cell.shareLow)} – {formatDollars(cell.shareHigh)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableScroll>

          <h4 className="mt-5 text-[13.5px] font-bold">
            If the price deck is wrong by a fifth
          </h4>
          <div className="mt-2 grid grid-cols-3 overflow-hidden rounded-[10px] border border-mv-line text-center">
            <Deck label={`Deck −${DECK_SHOCK * 100}%`} value={formatDollars(report.forwardLowDeck)} />
            <Deck label="At the deck" value={formatDollars(report.forwardTotal)} highlight />
            <Deck label={`Deck +${DECK_SHOCK * 100}%`} value={formatDollars(report.forwardHighDeck)} />
          </div>

          <p className="mt-3 text-[12px] leading-[1.6] text-mv-slate">
            The volumes are the model&apos;s; the prices are a deck it holds
            fixed. This row moves only the price, so it says how much of the
            projection is a market assumption rather than a production one — it
            is not the model&apos;s own uncertainty band, which is about the
            volume and is in the table above.
          </p>
          <p className="mt-2 text-[12px] leading-[1.6] text-mv-slate">
            The model puts the next {report.forward.length} months at{" "}
            <strong>{formatDollars(report.forwardTotal)}</strong> to you in total,
            on volumes it projects and a price deck it holds fixed. Neither the
            price your operator gets nor their deducts are in the public record,
            which is why every row is a range.
          </p>
        </section>
      </div>
    </Card>
  );
}

const BAR = {
  gas: { fill: "bg-mv-green-deep/25", mark: "bg-mv-green-deep" },
  oil: { fill: "bg-mv-sand/25", mark: "bg-mv-sand" },
} as const;

/**
 * A range with the average marked on it. The track is the twelve-month span and
 * the tick is where the average sits inside it — a reader can see at a glance
 * whether a lease is steady or swinging, which two numbers side by side do not
 * show.
 */
function RangeBar({
  label,
  tone,
  low,
  high,
  average,
}: {
  label: string;
  tone: keyof typeof BAR;
  low: number;
  high: number;
  average: number;
}) {
  const position = high > low ? ((average - low) / (high - low)) * 100 : 50;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <span className="w-[120px] flex-none text-[10.5px] font-bold tracking-[0.06em] text-mv-muted uppercase">
        {label}
      </span>
      <span className={`relative h-2.5 min-w-[120px] flex-1 rounded-full ${BAR[tone].fill}`}>
        <span
          aria-hidden="true"
          className={`absolute top-[-3px] h-[16px] w-[3px] rounded-full ${BAR[tone].mark}`}
          style={{ left: `${position}%` }}
        />
      </span>
      <span className="text-right text-[12.5px] tabular-nums">
        <strong>
          {low.toFixed(1)} – {high.toFixed(1)}
        </strong>
        <span className="block text-[11px] text-mv-muted">
          avg {average.toFixed(1)}
        </span>
      </span>
    </div>
  );
}

function Fact({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="border-b border-mv-portal-hairline py-2.5">
      <dt className="text-[10px] font-bold tracking-[0.08em] text-mv-muted uppercase">
        {label}
      </dt>
      <dd className="mt-0.5 text-[14px] font-bold">{value}</dd>
      <dd className="text-[11px] text-mv-muted">{sub}</dd>
    </div>
  );
}

function Deck({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`px-3 py-3 ${highlight ? "bg-mv-portal-wash/60" : ""} not-last:border-r not-last:border-mv-line`}
    >
      <p className="text-[10px] font-bold tracking-[0.08em] text-mv-muted uppercase">
        {label}
      </p>
      <p className="mt-1 text-[16px] font-bold tabular-nums">{value}</p>
    </div>
  );
}

/**
 * WHICH MONTHS OF THE YEAR PAY — each calendar month against the average day.
 *
 * Not a seasonality FORECAST: it is what this lease's own filed history did,
 * and the caption says how many years that is. Bars run both ways from a
 * centre line because the interesting fact is the sign, not the size.
 */
function Seasonality({ report }: { report: LeaseReport }) {
  const scale = 15;
  const strongest = [...report.seasonality].sort((a, b) => b.percent - a.percent)[0];
  const thinnest = [...report.seasonality].sort((a, b) => a.percent - b.percent)[0];

  return (
    <div className="mt-4 border-t border-mv-line pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h5 className="text-[10.5px] font-bold tracking-[0.08em] text-mv-muted uppercase">
          Which months of the year pay
        </h5>
        <span className="text-[11px] text-mv-muted">
          filed years · scale ±{scale}%
        </span>
      </div>

      <div className="mt-3 flex h-[70px] items-center gap-1">
        {report.seasonality.map((entry, position) => {
          const height = Math.min(Math.abs(entry.percent) / scale, 1) * 30;
          const up = entry.percent >= 0;
          return (
            <div key={position} className="flex flex-1 flex-col items-center justify-center">
              <span className="flex h-[30px] w-full items-end justify-center">
                {up && (
                  <span
                    className="w-2/3 rounded-t-[2px] bg-mv-ink"
                    style={{ height: `${height}px` }}
                  />
                )}
              </span>
              <span aria-hidden="true" className="h-px w-full bg-mv-line" />
              <span className="flex h-[30px] w-full items-start justify-center">
                {!up && (
                  <span
                    className="w-2/3 rounded-b-[2px] bg-mv-line-strong"
                    style={{ height: `${height}px` }}
                  />
                )}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex gap-1 text-center text-[10px] text-mv-muted">
        {report.seasonality.map((entry, position) => (
          <span key={position} className="flex-1">
            <span className="block font-bold text-mv-ink">{entry.month}</span>
            {entry.percent >= 0 ? "+" : ""}
            {entry.percent.toFixed(0)}%
          </span>
        ))}
      </div>

      <p className="mt-2 text-[11.5px] leading-[1.55] text-mv-muted">
        The strongest calendar month runs at {strongest.percent >= 0 ? "+" : ""}
        {strongest.percent.toFixed(0)}% of the average day and the thinnest at{" "}
        {thinnest.percent.toFixed(0)}% — worth knowing before you read a quiet
        month as a problem.
      </p>
    </div>
  );
}

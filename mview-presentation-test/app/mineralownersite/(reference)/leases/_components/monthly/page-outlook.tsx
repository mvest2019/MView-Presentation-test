import { KpiTile } from "../../../../_components/ui/kpi-tile";
import { formatCompactDollars, formatDollars } from "../../_lib/lease-format";
import { threeYearOutlook } from "../../_lib/report-outlook";
import {
  ReportFootnote,
  ReportList,
  ReportPageCard,
} from "./report-page";

/**
 * PAGE 6 · THREE-YEAR OUTLOOK — where the model has this by the end of the curve.
 *
 * ── FOUR TILES, AND THE THIRD ONE IS THE ANSWER ──
 *
 * Gas a day and oil a day are the evidence; the monthly cheque is what the
 * reader is actually asking about, which is why it carries the accent rule. The
 * fourth is the one most likely to change somebody's mind: on this record the
 * volume is gas and the MONEY is mostly oil, so the price a reader has been
 * watching is probably the wrong one.
 *
 * ── "AT THE MODEL'S PRICE DECK" IS DOING REAL WORK IN THAT CAPTION ──
 *
 * The fall shown here is VOLUME. Price is held flat across all three years
 * precisely so nothing on this page is a bet on the market — if the cheque
 * shrinks by half, this page is saying it is because the wells declined, not
 * because gas got cheaper. Without that qualifier the number reads as a
 * forecast of prices, which it is not and could not be.
 */
export function PageOutlook() {
  const outlook = threeYearOutlook;

  return (
    <ReportPageCard
      number={6}
      id="three-year-outlook"
      title="Three-year outlook"
      chip={`${outlook.fromMonth} → ${outlook.toMonth}`}
      lead={`Where the model has you by ${outlook.toMonth}, and which product takes you there.`}
    >
      <div className="mt-4 grid gap-[18px] sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          label="Your gas a day"
          value={`${outlook.gasPerDayStart.toFixed(0)} → ${outlook.gasPerDayEnd.toFixed(1)}`}
          basis={`MCF a day · ${signed(outlook.gasChangePercent)} over three years`}
        />
        <KpiTile
          label="Your oil a day"
          value={`${outlook.oilPerDayStart.toFixed(0)} → ${outlook.oilPerDayEnd.toFixed(1)}`}
          basis={`BBL a day · ${signed(outlook.oilChangePercent)}`}
        />
        <KpiTile
          accent
          locked
          label="Your share a month"
          value={`${formatCompactDollars(outlook.shareStart)} → ${formatCompactDollars(outlook.shareEnd)}`}
          basis={`${signed(outlook.shareChangePercent)} at the model's price deck`}
        />
        <KpiTile
          label="Which product pays"
          value={`${outlook.oilRevenuePercent.toFixed(1)}% oil`}
          basis={`${outlook.gasRevenuePercent.toFixed(1)}% gas, across the three years`}
        />
      </div>

      <ReportList
        items={[
          <>
            Your gas begins the projection at{" "}
            {outlook.gasPerDayStart.toFixed(0)} MCF a day and ends it at{" "}
            {outlook.gasPerDayEnd.toFixed(1)} — a fall of{" "}
            {Math.abs(outlook.gasChangePercent).toFixed(1)}% over three years.
          </>,
          <>
            Your oil runs from {outlook.oilPerDayStart.toFixed(0)} to{" "}
            {outlook.oilPerDayEnd.toFixed(1)} BBL a day, down{" "}
            {Math.abs(outlook.oilChangePercent).toFixed(1)}%. Both products move
            the same way.
          </>,
          <>
            Your share runs from {formatDollars(outlook.shareStart)} a month to{" "}
            {formatDollars(outlook.shareEnd)}, down{" "}
            {Math.abs(outlook.shareChangePercent).toFixed(1)}%. Price is held at
            the model&apos;s deck throughout, so this is the volume decline
            showing through, not a forecast of the market.
          </>,
          <>
            Across the three years oil carries{" "}
            {outlook.oilRevenuePercent.toFixed(1)}% of your money and gas{" "}
            {outlook.gasRevenuePercent.toFixed(1)}% — a split that rarely matches
            the split of the volume, and the reason both prices matter to you.
          </>,
        ]}
      />

      <ReportFootnote>
        A projection, not a promise. It is the decline the filed months imply
        carried forward at a fixed price deck; a new well, a workover or a
        shut-in would move it, and none of those is knowable in advance.
      </ReportFootnote>
    </ReportPageCard>
  );
}

function signed(percent: number): string {
  return `${percent >= 0 ? "+" : ""}${percent.toFixed(1)}%`;
}

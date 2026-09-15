import { Card } from "../../../../_components/ui/card";
import { gates } from "../../../../_components/ui/portal-gating";
import { formatDollars } from "../../_lib/lease-format";
import type { LeaseReport } from "../_lib/lease-report";

/**
 * THE LEASE REPORT AT ULTRA — one sentence in place of the body.
 *
 * ── IT IS THE ONLY THING THE PAGE ADDS AT THAT DENSITY ──
 *
 * The header and the value band above it are exempted from the collapse, so
 * Ultra already has the identity and the money. What it does not have is the
 * one thing the eight cards below were collectively saying: whether this lease
 * is behaving, and roughly what the next cheque looks like. That is this card.
 *
 * ── EVERY FIGURE IN IT IS ALREADY ON THE PAGE ──
 *
 * Nothing here is computed for Ultra. The range is the same next-month band the
 * value band prints, the comparison is the same trailing-twelve figure the
 * twelve-month panel is built on. A calm tier that quoted numbers the other
 * tiers could not reproduce would be a fourth version of the truth.
 */
export function UltraNote({ report }: { report: LeaseReport }) {
  /* The last filed month against its own twelve-month average — the same two
     figures the twelve-month panel prints, divided here rather than carried as
     a third number nobody else reads. */
  const average = report.trailingShare / 12;
  const gap =
    average > 0 ? ((report.lastMonthShare - average) / average) * 100 : 0;

  return (
    <Card className={`mt-4 text-center ${gates("ultraOnly")}`}>
      <p className="mx-auto max-w-[62ch] text-[15px] leading-[1.6]">
        Next month this lease should pay you between{" "}
        <strong>{formatDollars(report.nextMonthLow)}</strong> and{" "}
        <strong>{formatDollars(report.nextMonthHigh)}</strong>.{" "}
        {Math.abs(gap) <= 10
          ? "It is running in line with its own last twelve months, so nothing here needs you."
          : gap < 0
            ? `It is running ${Math.abs(gap).toFixed(0)}% below its own last twelve months — ordinary decline unless it steepens.`
            : `It is running ${gap.toFixed(0)}% above its own last twelve months, which on a decline curve is usually a late filing catching up.`}
      </p>
      <p className="mx-auto mt-3 max-w-[62ch] text-[12.5px] leading-[1.55] text-mv-muted">
        A range rather than a number: the volumes are the model&apos;s and the
        price is a deck it holds fixed. Nothing is removed at this density — the
        charts, the twelve-month panel and the full record are all there at
        Detailed and Professional.
      </p>
    </Card>
  );
}

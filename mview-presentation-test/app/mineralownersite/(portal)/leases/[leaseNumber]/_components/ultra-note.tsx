import { ArrowLeft, Activity } from "lucide-react";
import Link from "next/link";

import { Card } from "../../../../_components/ui/card";
import { gates } from "../../../../_components/ui/portal-gating";
import type { LeaseReport } from "../_lib/lease-report";

/**
 * THE LEASE REPORT AT ULTRA — the whole page, after the header and the band.
 *
 * ── AT THIS DENSITY THIS CARD IS NOT A NOTE, IT IS THE PAGE ──
 *
 * Ultra keeps three blocks: which lease, what it is worth, and this. That is
 * why it was rebuilt. As a centred paragraph it read as a footnote to a page
 * that was not there — the calm tier looked like the detailed one with its
 * content deleted, rather than like a page designed to be short.
 *
 *   · IT LEADS WITH A VERDICT. "This lease is producing" is the answer to the
 *     question somebody opening a lease at this density is asking. The prose
 *     under it is the evidence, not the headline.
 *
 *   · THE RANGE IS GONE FROM HERE. It used to print next month's band in bold,
 *     which is the same figure the value band states directly above — on a
 *     three-block page, quoting it twice is a third of the page spent saying
 *     one thing. The sentence points at it instead.
 *
 *   · AND IT ENDS WITH A WAY ONWARD. The shell's back row is browser history
 *     — "← Back to My Leases" — which is a different affordance from a named
 *     destination at the foot of the last block. At Ultra there is nothing
 *     below this card, so without it the page ends in nothing.
 *
 * ── THE COPY IS FOUR FACTS AND NO READING OF THEM ──
 *
 * Which lease, its number, when it first filed, and where its value is. An
 * earlier draft also carried a judgement — "running in line with its own last
 * twelve months, so nothing here needs you" — computed from the last filed
 * month against its own trailing twelve, plus a note saying nothing is removed
 * at this density. Both were cut to the wording above at the owner's request.
 *
 * WHAT THAT COSTS, recorded so it is a decision rather than a drift: Ultra now
 * states figures and never says whether they are behaving. The lease report is
 * the one page where that judgement had nowhere else to live at this density —
 * every card that carries it is hidden here. The calculation is three lines
 * (`trailingShare / 12` against `lastMonthShare`) if it is ever wanted back.
 *
 * ── EVERY FIGURE IN IT IS ALREADY ON THE PAGE ──
 *
 * Nothing here is computed for Ultra. A calm tier that quoted numbers the other
 * tiers could not reproduce would be a fourth version of the truth.
 */
export function UltraNote({ report }: { report: LeaseReport }) {
  const { lease } = report;

  return (
    <Card padded={false} className={`mt-4 ${gates("ultraOnly")}`}>
      <div className="flex flex-col gap-6 px-[22px] py-[20px] sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3.5">
            <span
              aria-hidden="true"
              className="mt-0.5 flex h-11 w-11 flex-none items-center justify-center rounded-[14px] bg-mv-mint text-mv-green-deep"
            >
              <Activity className="h-[21px] w-[21px]" />
            </span>

            <div className="min-w-0">
              <h2 className="text-[20px] leading-tight font-bold">
                This lease is {lease.status.toLowerCase()}
              </h2>

              <p className="mt-2 max-w-[56ch] text-[14px] leading-[1.6] text-mv-slate">
                <strong className="font-semibold text-mv-ink">
                  {lease.name}
                </strong>
                {lease.number ? ` · Lease ${lease.number}` : ""} has filed since{" "}
                {report.firstPosting}. Your share of what is left is the number
                above.
              </p>
            </div>
          </div>

          <Link
            href="/mineralownersite/leases"
            className="mt-5 ml-[58px] inline-flex items-center gap-2 rounded-full border border-mv-line bg-mv-card px-4 py-2 text-[12.5px] font-semibold text-mv-ink no-underline transition-colors hover:border-mv-green hover:bg-mv-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
          >
            <ArrowLeft aria-hidden="true" className="h-[13px] w-[13px]" />
            My Leases
          </Link>
        </div>

        {/*
          THE ILLUSTRATION, AND WHY IT IS NOT A CHART.
          It carries no figures and is `aria-hidden`, because a picture that
          looked like data at the one density where the real charts are hidden
          would be the worst possible place to put a shape somebody might read.
          It is a mark that says "producing" and nothing more, and it is the
          first thing dropped on a narrow screen.
        */}
        <div
          aria-hidden="true"
          className="hidden flex-none items-center justify-center rounded-[18px] bg-mv-mint/55 px-8 py-6 lg:flex"
        >
          <svg
            viewBox="0 0 120 84"
            className="h-[84px] w-[120px] text-mv-green"
            fill="none"
          >
            <rect
              x="4"
              y="52"
              width="18"
              height="28"
              rx="4"
              fill="currentColor"
              opacity="0.28"
            />
            <rect
              x="28"
              y="40"
              width="18"
              height="40"
              rx="4"
              fill="currentColor"
              opacity="0.4"
            />
            <rect
              x="52"
              y="46"
              width="18"
              height="34"
              rx="4"
              fill="currentColor"
              opacity="0.32"
            />
            <rect
              x="76"
              y="24"
              width="18"
              height="56"
              rx="4"
              fill="currentColor"
              opacity="0.55"
            />
            <path
              d="M10 36 L38 22 L62 30 L104 6"
              stroke="currentColor"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M92 6 L106 6 L106 20"
              stroke="currentColor"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </Card>
  );
}

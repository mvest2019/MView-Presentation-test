import {
  Building2,
  Compass,
  FileText,
  Maximize2,
  Percent,
} from "lucide-react";
import type { ReactNode } from "react";

import { Card } from "../../../../_components/ui/card";
import { formatAcres, formatDecimalInterest } from "../../_lib/lease-format";
import type { LeaseReport } from "../_lib/lease-report";

/**
 * THE FIVE FACTS THAT IDENTIFY THE LEASE, on one strip under the money.
 *
 * These are the fields a reader needs in front of them while reading anything
 * else on the page — operator, county, acres, lease number and their own
 * interest — so they sit above every chart rather than in a table at the
 * bottom, where a reader would have to scroll away from the figure they are
 * trying to check.
 *
 * STATUS AND WELL COUNT ARE NOT AMONG THEM. The band directly above already
 * says "Lease status: Producing · 1 of 1 well producing" in one line, and the
 * masthead above that carries the status twice more as chips. Both were removed
 * from here rather than from the band: the band states them together, where the
 * count qualifies the status, and split apart they each said less.
 *
 * IT SCROLLS SIDEWAYS RATHER THAN WRAPPING, so the seven stay in one reading
 * order at every width. Wrapped into three rows they stop being a strip and
 * start being a form.
 */
export function LeaseFactsStrip({ report }: { report: LeaseReport }) {
  const { lease } = report;

  const facts: { icon: ReactNode; label: string; value: ReactNode }[] = [
    {
      icon: <Building2 />,
      label: "Operator",
      value: lease.operator,
    },
    {
      icon: <Compass />,
      label: "County · District",
      value: `${lease.county} · 02`,
    },
    {
      icon: <Maximize2 />,
      label: "Acres",
      value: formatAcres(lease.acres),
    },
    {
      icon: <FileText />,
      label: "Lease number",
      value: lease.number ?? "not filed",
    },
    {
      icon: <Percent />,
      label: "Your interest",
      value: formatDecimalInterest(lease.decimalInterest),
    },
  ];

  return (
    <>
      <Card padded={false} className="mt-4 overflow-x-auto">
        <dl className="flex min-w-[900px] divide-x divide-mv-line">
          {facts.map((fact) => (
            <div
              key={fact.label}
              className="flex min-w-0 flex-1 items-center gap-3 px-[18px] py-4"
            >
              {/* THE GLYPH IS OUTLINED, NOT FILLED. Seven tinted blocks in a row
                  under the money band read as a second band of their own; an
                  outlined square is a marker beside a fact rather than a badge
                  competing with it. */}
              <span
                aria-hidden="true"
                className="flex h-8 w-8 flex-none items-center justify-center rounded-[9px] border border-mv-line text-mv-slate [&_svg]:h-[15px] [&_svg]:w-[15px]"
              >
                {fact.icon}
              </span>
              <div className="min-w-0">
                <dt className="text-[10.5px] font-bold tracking-[0.08em] text-mv-muted uppercase">
                  {fact.label}
                </dt>
                <dd className="mt-1 text-[14px] leading-[1.35] font-bold">
                  {fact.value}
                </dd>
              </div>
            </div>
          ))}
        </dl>
      </Card>

    </>
  );
}

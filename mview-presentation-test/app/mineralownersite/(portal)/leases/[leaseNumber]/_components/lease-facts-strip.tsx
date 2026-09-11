import { Card } from "../../../../_components/ui/card";
import { formatAcres, formatDecimalInterest } from "../../_lib/lease-format";
import type { LeaseReport } from "../_lib/lease-report";

/**
 * THE SEVEN FACTS THAT IDENTIFY THE LEASE, on one strip under the money.
 *
 * These are the fields a reader needs in front of them while reading anything
 * else on the page — status, wells, acres, county, operator, lease number and
 * their own interest — so they sit above every chart rather than in a table at
 * the bottom, where a reader would have to scroll away from the figure they are
 * trying to check.
 *
 * IT SCROLLS SIDEWAYS RATHER THAN WRAPPING, so the seven stay in one reading
 * order at every width. Wrapped into three rows they stop being a strip and
 * start being a form.
 */
export function LeaseFactsStrip({ report }: { report: LeaseReport }) {
  const { lease } = report;

  const facts = [
    {
      label: "Lease status",
      value: (
        <span className="flex items-center gap-1.5 font-bold text-mv-green-deep">
          <span
            aria-hidden="true"
            className="inline-block h-2 w-2 rounded-full bg-mv-green"
          />
          {lease.status}
        </span>
      ),
    },
    {
      label: "Wells on this lease",
      value: `${lease.wells} total · ${lease.wells} producing`,
    },
    { label: "Acres", value: formatAcres(lease.acres) },
    { label: "County · District", value: `${lease.county} · 02` },
    { label: "Operator", value: lease.operator },
    { label: "Lease number", value: lease.number ?? "not filed" },
    {
      label: "Your interest",
      value: formatDecimalInterest(lease.decimalInterest),
    },
  ];

  return (
    <>
      <Card padded={false} className="mt-4 overflow-x-auto">
        <dl className="flex min-w-[900px] divide-x divide-mv-line">
          {facts.map((fact) => (
            <div key={fact.label} className="min-w-0 flex-1 px-[18px] py-4">
              <dt className="text-[10.5px] font-bold tracking-[0.08em] text-mv-muted uppercase">
                {fact.label}
              </dt>
              <dd className="mt-1.5 text-[14px] leading-[1.35] font-bold">
                {fact.value}
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      <p className="mt-3 text-[12px] tracking-[0.04em] text-mv-muted uppercase">
        {lease.reservoir} · first posting{" "}
        <strong className="text-mv-ink normal-case">
          {report.firstPosting}
        </strong>{" "}
        · newest posting{" "}
        <strong className="text-mv-ink normal-case">{report.lastPosting}</strong>
      </p>
    </>
  );
}

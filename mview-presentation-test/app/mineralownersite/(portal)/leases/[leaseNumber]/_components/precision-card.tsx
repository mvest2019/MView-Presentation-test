import { Card } from "../../../../_components/ui/card";
import {
  formatAcres,
  formatCount,
  formatDecimalInterest,
  formatDollars,
} from "../../_lib/lease-format";
import type { LeaseReport } from "../_lib/lease-report";

/**
 * "LEASE RECORD — FULL PRECISION" — the fields as the sources hold them.
 *
 * ── EVERY OTHER FIGURE ON THE PAGE IS ROUNDED; THESE ARE NOT ──
 *
 * $1.62M reads better in a tile and is the wrong thing to quote in a letter to
 * an operator. This table is where a reader goes to copy something exactly:
 * full volumes, the decimal interest at all its places, the roll value to the
 * dollar. It sits at the bottom because it is a reference rather than a
 * reading.
 *
 * It is also the page's provenance in miniature — name, number, county,
 * operator and acreage come off the filings; the interest and the appraised
 * value off the county roll; the volumes are sums of the filed months.
 */
export function PrecisionCard({ report }: { report: LeaseReport }) {
  const { lease } = report;

  const fields = [
    { label: "Lease name", value: lease.name, sub: null },
    {
      label: "Lease number",
      value: lease.number ?? "not filed",
      sub: "RRC district 02",
    },
    { label: "County", value: lease.county, sub: `${lease.reservoir}` },
    {
      label: "Operator today",
      value: lease.operator,
      sub: `since ${report.firstPosting}`,
    },
    {
      label: "Acres",
      value: `${formatAcres(lease.acres)} ac`,
      sub: `${lease.wells} well${lease.wells === 1 ? "" : "s"}`,
    },
    {
      label: "Your decimal interest",
      value: formatDecimalInterest(lease.decimalInterest),
      sub: "of the whole lease",
    },
    {
      label: "Gas filed",
      value: `${formatCount(Math.round(report.gasFiled))} MCF`,
      sub: `over ${report.postedMonths} posted months`,
    },
    {
      label: "Oil filed",
      value: `${formatCount(Math.round(report.oilFiled))} BBL`,
      sub: "your share",
    },
    {
      label: "First posting",
      value: report.firstPosting,
      sub: `newest ${report.lastPosting}`,
    },
    {
      label: "County appraised",
      value: formatDollars(report.countyYourInterest),
      sub: "your interest, on the roll",
    },
  ];

  return (
    <Card padded={false} className="mt-4 px-[22px] py-[18px]">
      <h3 className="text-[15px] font-bold">Lease record — full precision</h3>

      <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
        {fields.map((field) => (
          <div key={field.label}>
            <dt className="text-[10px] font-bold tracking-[0.08em] text-mv-muted uppercase">
              {field.label}
            </dt>
            <dd className="mt-1 text-[14px] leading-[1.35] font-bold">
              {field.value}
            </dd>
            {field.sub && (
              <dd className="text-[11px] text-mv-muted">{field.sub}</dd>
            )}
          </div>
        ))}
      </dl>
    </Card>
  );
}

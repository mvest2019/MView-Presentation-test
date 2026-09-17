import {
  CalendarDays,
  Droplet,
  FileText,
  Flame,
  Landmark,
  Layers,
  MapPin,
  Percent,
  Tag,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";

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

  const fields: {
    icon: ReactNode;
    label: string;
    value: string;
    sub: string | null;
  }[] = [
    { icon: <Tag />, label: "Lease name", value: lease.name, sub: null },
    {
      icon: <FileText />,
      label: "Lease number",
      value: lease.number ?? "not filed",
      sub: "RRC district 02",
    },
    {
      icon: <MapPin />,
      label: "County",
      value: lease.county,
      sub: `${lease.reservoir}`,
    },
    {
      icon: <Users />,
      label: "Operator today",
      value: lease.operator,
      sub: `since ${report.firstPosting}`,
    },
    {
      icon: <Layers />,
      label: "Acres",
      value: `${formatAcres(lease.acres)} ac`,
      sub: `${lease.wells} well${lease.wells === 1 ? "" : "s"}`,
    },
    {
      icon: <Percent />,
      label: "Your decimal interest",
      value: formatDecimalInterest(lease.decimalInterest),
      sub: "of the whole lease",
    },
    {
      icon: <Flame />,
      label: "Gas filed",
      value: `${formatCount(Math.round(report.gasFiled))} MCF`,
      sub: `over ${report.postedMonths} posted months`,
    },
    {
      icon: <Droplet />,
      label: "Oil filed",
      value: `${formatCount(Math.round(report.oilFiled))} BBL`,
      sub: "your share",
    },
    {
      icon: <CalendarDays />,
      label: "First posting",
      value: report.firstPosting,
      sub: `newest ${report.lastPosting}`,
    },
    {
      icon: <Landmark />,
      label: "County appraised",
      value: formatDollars(report.countyYourInterest),
      sub: "your interest, on the roll",
    },
  ];

  return (
    <Card padded={false} className="mt-4 px-[22px] py-[18px]">
      <h3 className="flex items-center gap-2.5 text-[15px] font-bold">
        <span
          aria-hidden="true"
          className="flex h-7 w-7 flex-none items-center justify-center rounded-[8px] bg-mv-portal-wash text-mv-slate"
        >
          <FileText className="h-[15px] w-[15px]" />
        </span>
        Lease record — full precision
      </h3>

      {/* ONE CARD PER FIELD, matching the well and reservoir records.
          Bare label-over-value blocks on a grid read as a table and invite the
          eye to run down a column comparing them — but these are ten unrelated
          properties of one lease, not ten values of one thing. A border says
          "this is one fact" and stops that.

          A FIELD WITH NO SUB-LINE STILL GETS ITS ROW. `justify-between` on a
          full-height card pins the value to the top and leaves the space where
          the caption would be, so the ten cards keep one height per row rather
          than stepping up and down as captions come and go. */}
      <dl className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {fields.map((field) => (
          <div
            key={field.label}
            className="flex items-start gap-2.5 rounded-md border border-mv-line px-3 py-2.5"
          >
            {/* The glyph names the KIND of fact, so a reader scanning for the
                operator or the acreage has a shape to aim at before reading a
                word. Muted, in its own tinted square, so ten of them down the
                card read as furniture rather than ten pieces of colour. */}
            <span
              aria-hidden="true"
              className="mt-[1px] flex h-7 w-7 flex-none items-center justify-center rounded-[7px] bg-mv-portal-wash text-mv-slate [&_svg]:h-[14px] [&_svg]:w-[14px]"
            >
              {field.icon}
            </span>
            <div className="min-w-0">
              <dt className="text-[10px] font-bold tracking-[0.08em] text-mv-muted uppercase">
                {field.label}
              </dt>
              <dd className="mt-0.5 text-[14px] leading-[1.35] font-bold">
                {field.value}
              </dd>
              {field.sub && (
                <dd className="text-[11px] text-mv-muted">{field.sub}</dd>
              )}
            </div>
          </div>
        ))}
      </dl>
    </Card>
  );
}

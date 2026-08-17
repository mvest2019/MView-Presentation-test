"use client";

import { BarChart3, Crosshair, Download, Droplet, Flame, Gauge, Lock } from "lucide-react";
import { useState } from "react";

import {
  WELL_ACTIVITY,
  WELL_BORE,
  WELL_GAS_SERIES,
  WELL_HEADLINE,
  WELL_LEASE,
  WELL_LOCATION,
  WELL_MONTHS,
  WELL_OIL_SERIES,
  WELL_STREAM_MIX,
  WELL_TOTALS,
  WELL_UPDATED,
} from "./well-insights-data";

/*
 * The summary for one well, shown in place of the statewide one when a well is
 * picked on the map.
 *
 * Only the header is real: the lease, API number, operator, status, type and
 * county come from the click. Everything below is static — there is no
 * well-detail endpoint yet, and `well-insights-data.ts` is the one place to
 * replace when there is.
 */

const OIL = "#12a13f";
const GAS = "#e2231a";

export type SelectedWell = {
  api: string;
  lease: string;
  well: string;
  operator: string;
  status: string;
  wtype: string;
  county: string;
};

const HEADLINE_ICONS = [Gauge, Droplet, Flame, BarChart3];

export function WellInsightsPanel({ well }: { well: SelectedWell }) {
  const [range, setRange] = useState<"1Y" | "2Y" | "5Y">("2Y");
  const [series, setSeries] = useState<"Oil" | "Gas" | "BOE">("BOE");

  const title = well.well ? `${well.lease} #${well.well}` : well.lease;

  return (
    <div className="h-full overflow-y-auto bg-mv-bg p-4">
      {/* ---------------- header ---------------- */}
      <div className="relative overflow-hidden rounded-xl border border-mv-line bg-white p-4 lg:p-5">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-[38%] bg-gradient-to-l from-[#eaf7f0] to-transparent" />

        <div className="relative flex flex-wrap items-start gap-3 lg:gap-4">
          <div className="min-w-0 flex-1 basis-full lg:basis-0">
            <div className="text-[11px] font-semibold text-mv-muted">
              Texas <span className="text-mv-line">›</span>{" "}
              <span className="uppercase tracking-[.04em]">{title}</span>
            </div>
            <h2 className="mt-[3px] text-[19px] font-bold leading-tight text-mv-ink lg:text-[22px]">
              {title}
            </h2>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Chip>{well.api}</Chip>
              <Chip dot={OIL}>{well.wtype || "Oil"}</Chip>
              <Chip dot="#b45309" tone="amber">
                {well.status || "Producing"}
              </Chip>
            </div>

            <p className="mt-3 text-[11.5px] text-mv-muted lg:text-[12px]">
              {well.operator} · {titleCase(well.county)} County · RRC District 08
            </p>
          </div>

          <div className="flex w-full flex-col gap-[10px] lg:w-auto lg:items-end lg:gap-3">
            <div className="w-full text-left lg:text-right">
              <div className="text-[9.5px] font-extrabold uppercase tracking-[.1em] text-mv-muted">
                Last 18 months
              </div>
              <Spark values={WELL_OIL_SERIES.slice(-18)} stroke={OIL} />
            </div>

            <div className="flex items-center gap-2 [&>button]:flex-1 lg:[&>button]:flex-none">
              <button
                type="button"
                className="inline-flex cursor-pointer items-center justify-center gap-[6px] rounded-lg border border-mv-line bg-white px-[11px] py-[7px] text-[12px] font-semibold text-mv-slate hover:border-mv-green-deep hover:text-mv-green-deep lg:px-[13px] lg:text-[12.5px]"
              >
                <Crosshair size={13} aria-hidden="true" />
                Centre
              </button>
              <button
                type="button"
                className="inline-flex cursor-pointer items-center justify-center gap-[6px] rounded-lg bg-mv-green-deep px-[11px] py-[7px] text-[12px] font-semibold text-white hover:brightness-105 lg:gap-2 lg:px-[13px] lg:text-[12.5px]"
              >
                <Download size={13} aria-hidden="true" />
                Report
                <span className="inline-flex items-center gap-[2px] rounded bg-mv-amber-bg px-[5px] py-[2px] text-[9px] font-extrabold uppercase tracking-[.06em] text-mv-amber">
                  <Lock size={8} strokeWidth={3} aria-hidden="true" />
                  Pro
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- headline cards ---------------- */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {WELL_HEADLINE.map((card, index) => {
          const Icon = HEADLINE_ICONS[index];
          return (
            <div
              key={card.label}
              className="flex flex-col rounded-xl border border-mv-line bg-white p-3 sm:px-4 sm:py-[13px]"
            >
              <div className="flex items-center gap-2">
                <span className="grid h-[22px] w-[22px] place-items-center rounded-md bg-[#e6f6ee] text-mv-green-deep">
                  <Icon size={12} />
                </span>
                <span className="text-[9.5px] font-extrabold uppercase tracking-[.09em] text-mv-muted">
                  {card.label}
                </span>
              </div>

              <div className="mt-[9px] flex flex-wrap items-baseline gap-x-[5px]">
                <span className="text-[20px] font-bold leading-none text-mv-ink sm:text-[24px]">
                  {card.value}
                </span>
                {card.unit && (
                  <span className="text-[12px] text-mv-muted">{card.unit}</span>
                )}
              </div>
              <div className="mt-[4px] text-[11.5px] text-mv-muted">
                {card.note}
              </div>

              <Spark
                values={index === 2 ? WELL_GAS_SERIES : WELL_OIL_SERIES}
                stroke={index === 2 || index === 3 ? GAS : OIL}
                className="mt-[6px]"
              />

              <div className="mt-auto flex flex-wrap items-baseline justify-between gap-x-2 border-t border-mv-line pt-[7px] text-[11px] [margin-top:10px] sm:text-[11.5px]">
                <span className="text-mv-muted">{card.foot}</span>
                <span
                  className={`font-semibold ${card.down ? "text-mv-red" : "text-mv-green-deep"}`}
                >
                  {card.delta}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ---------------- production history ---------------- */}
      <div className="mt-4 rounded-xl border border-mv-line bg-white">
        <div className="flex flex-wrap items-center gap-3 px-5 pt-4">
          <h3 className="flex-1 text-[15px] font-bold leading-none text-mv-ink">
            Production history
          </h3>
          <Segmented
            options={["Oil", "Gas", "BOE"] as const}
            value={series}
            onChange={setSeries}
          />
          <Segmented
            options={["1Y", "2Y", "5Y"] as const}
            value={range}
            onChange={setRange}
          />
        </div>

        <div className="flex flex-wrap items-center gap-4 px-5 pt-3 text-[11.5px] text-mv-slate">
          <Key colour={OIL}>Oil (bbl)</Key>
          <Key colour={GAS}>Gas (Mcf)</Key>
          <span className="inline-flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-0 w-5 border-t-2 border-dashed border-mv-muted"
            />
            3-month rolling average
          </span>
        </div>

        <ProductionChart />

        <div className="flex flex-wrap items-center gap-3 border-t border-mv-line px-5 py-3">
          <span className="rounded bg-[#e6f6ee] px-2 py-[3px] text-[11.5px] font-semibold text-mv-green-deep">
            From Feb &apos;24 to Jan &apos;26
          </span>
          <span className="text-[11.5px] text-mv-slate">
            Oil volumes decreased by{" "}
            <span className="font-semibold text-mv-red">-26.9%</span>
          </span>
          <span className="text-[11.5px] text-mv-slate">
            Gas volumes decreased by{" "}
            <span className="font-semibold text-mv-red">-22.6%</span>
          </span>
        </div>
      </div>

      {/* ---------------- mix · wellbore · location ---------------- */}
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card title="Stream mix">
          <div className="mt-4 flex items-center gap-5">
            <Donut share={WELL_STREAM_MIX.oilShare} />
            <div className="min-w-0 flex-1">
              {WELL_STREAM_MIX.rows.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center gap-2 py-[5px] text-[12.5px]"
                >
                  <span
                    aria-hidden="true"
                    className="h-[8px] w-[8px] shrink-0 rounded-[2px]"
                    style={{ background: row.colour }}
                  />
                  <span className="flex-1 truncate text-mv-slate">
                    {row.label}
                  </span>
                  <span className="font-bold text-mv-ink">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between border-t border-mv-line pt-3 text-[11.5px]">
            <span className="text-mv-muted">Peak · latest</span>
            <span className="font-semibold text-mv-ink">
              {WELL_STREAM_MIX.peak}
            </span>
          </div>
        </Card>

        <Card title="Wellbore" badge={WELL_BORE.kind}>
          <Wellbore />
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] font-semibold text-mv-ink">
            <span>{WELL_BORE.tvd}</span>
            <span className="text-mv-line">·</span>
            <span>{WELL_BORE.td}</span>
            <span className="text-mv-line">·</span>
            <span>{WELL_BORE.lateral}</span>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {WELL_BORE.dates.map((date) => (
              <div
                key={date.label}
                className="rounded-lg bg-[#f6f7f9] px-2 py-[7px] text-center"
              >
                <div className="text-[8.5px] font-extrabold uppercase tracking-[.06em] text-mv-muted">
                  {date.label}
                </div>
                <div className="mt-[3px] text-[11.5px] font-semibold text-mv-ink">
                  {date.value}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Location">
          <div className="mt-3 flex gap-4">
            <TexasMark />
            <dl className="min-w-0 flex-1">
              {WELL_LOCATION.map((row) => (
                <div
                  key={row.label}
                  className="flex items-baseline justify-between gap-3 py-[5px] text-[12px]"
                >
                  <dt className="text-mv-muted">{row.label}</dt>
                  <dd className="truncate font-semibold text-mv-ink">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="mt-4 border-t border-mv-line pt-3">
            <div className="text-[9.5px] font-extrabold uppercase tracking-[.09em] text-mv-muted">
              Lease &amp; operator
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full bg-mv-green-deep text-[9px] font-bold text-white">
                SA
              </span>
              <div className="min-w-0">
                <div className="truncate text-[12.5px] font-bold text-mv-ink">
                  {WELL_LEASE.operator}
                </div>
                <div className="truncate text-[11px] text-mv-muted">
                  {WELL_LEASE.operatorMeta}
                </div>
              </div>
            </div>

            <dl className="mt-2">
              {WELL_LEASE.rows.map((row) => (
                <div
                  key={row.label}
                  className="flex items-baseline justify-between gap-3 py-[5px] text-[12px]"
                >
                  <dt className="text-mv-muted">{row.label}</dt>
                  <dd className="truncate font-semibold text-mv-ink">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </Card>
      </div>

      {/* ---------------- recent activity ---------------- */}
      <div className="mt-4 rounded-xl border border-mv-line bg-white p-5">
        <div className="flex items-center gap-3">
          <h3 className="flex-1 text-[15px] font-bold leading-none text-mv-ink">
            Recent activity
          </h3>
          <button
            type="button"
            className="cursor-pointer text-[12px] font-semibold text-mv-green-deep hover:underline"
          >
            View all
          </button>
        </div>

        <div className="mt-3 grid gap-3 xl:grid-cols-3">
          {WELL_ACTIVITY.map((item) => (
            <div
              key={item.title}
              className="rounded-xl bg-[#f6f7f9] px-4 py-[13px]"
            >
              <div className="text-[9.5px] font-extrabold uppercase tracking-[.08em] text-mv-muted">
                {item.date}
              </div>
              <div className="mt-[5px] text-[12.5px] font-bold text-mv-ink">
                {item.title}
              </div>
              <p className="mt-[4px] text-[11.5px] leading-snug text-mv-muted">
                {item.detail}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ---------------- totals ---------------- */}
      <div className="mt-4 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-mv-line bg-mv-line xl:grid-cols-6">
        {WELL_TOTALS.map((total) => (
          <div
            key={total.label}
            className="flex flex-wrap items-baseline gap-x-2 bg-white px-4 py-[11px] xl:block xl:px-5 xl:py-4"
          >
            <div className="flex-1 text-[11.5px] text-mv-slate">
              <span className="font-bold text-mv-ink">{total.label}</span>{" "}
              <span className="text-mv-muted">{total.qualifier}</span>
            </div>
            <div className="text-[15px] font-bold leading-none tabular-nums text-mv-ink xl:mt-[6px] xl:text-[17px]">
              {total.value}
            </div>
            <div className="text-[11px] text-mv-muted xl:mt-[4px]">
              {total.unit}
            </div>
          </div>
        ))}

        <div className="flex items-baseline justify-between gap-2 bg-white px-4 py-[11px] xl:block xl:px-5 xl:py-4">
          <span className="text-[9.5px] font-extrabold uppercase tracking-[.09em] text-mv-muted">
            Last updated
          </span>
          <span className="text-[12.5px] font-bold text-mv-ink xl:mt-[6px] xl:block">
            {WELL_UPDATED}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ pieces */

function Chip({
  children,
  dot,
  tone,
}: {
  children: React.ReactNode;
  dot?: string;
  tone?: "amber";
}) {
  return (
    <span
      className={`inline-flex items-center gap-[6px] rounded-full border px-[9px] py-[4px] text-[11.5px] font-semibold lg:px-[11px] lg:py-[5px] lg:text-[12px] ${
        tone === "amber"
          ? "border-mv-amber-bg bg-mv-amber-bg text-mv-amber"
          : "border-mv-line bg-white text-mv-slate"
      }`}
    >
      {dot && (
        <span
          aria-hidden="true"
          className="h-[6px] w-[6px] rounded-full"
          style={{ background: dot }}
        />
      )}
      {children}
    </span>
  );
}

function Card({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-mv-line bg-white p-5">
      <div className="flex items-center gap-2">
        <h3 className="flex-1 text-[15px] font-bold leading-none text-mv-ink">
          {title}
        </h3>
        {badge && (
          <span className="rounded bg-[#e6f6ee] px-2 py-[3px] text-[9.5px] font-extrabold uppercase tracking-[.06em] text-mv-green-deep">
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function Key({ colour, children }: { colour: string; children: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden="true"
        className="h-[8px] w-[8px] rounded-[2px]"
        style={{ background: colour }}
      />
      {children}
    </span>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-mv-line bg-white p-1">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={option === value}
          onClick={() => onChange(option)}
          className={`cursor-pointer rounded-md px-[10px] py-[4px] text-[11.5px] font-semibold ${
            option === value
              ? "bg-mv-green-deep text-white"
              : "text-mv-slate hover:text-mv-green-deep"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ charts */

const W = 1000;
const H = 260;

function path(values: number[], max: number): string {
  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * W;
      const y = H - (value / max) * H;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

/** A trailing mean, which is what "3-month rolling average" means here. */
function rolling(values: number[], window = 3): number[] {
  return values.map((_, index) => {
    const slice = values.slice(Math.max(0, index - window + 1), index + 1);
    return slice.reduce((total, value) => total + value, 0) / slice.length;
  });
}

function ProductionChart() {
  const max = 2000;
  const ticks = [0, 400, 800, 1000, 2000];

  return (
    <div className="px-5 pt-3">
      <div className="flex gap-2">
        <div className="flex w-[34px] shrink-0 flex-col-reverse justify-between py-[2px] text-right text-[10.5px] text-mv-muted">
          {ticks.map((tick) => (
            <span key={tick}>{tick >= 1000 ? `${tick / 1000}k` : tick}</span>
          ))}
        </div>

        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="h-[240px] w-full"
          role="img"
          aria-label="Monthly oil and gas production for this well"
        >
          {ticks.map((tick) => {
            const y = H - (tick / max) * H;
            return (
              <line
                key={tick}
                x1="0"
                x2={W}
                y1={y}
                y2={y}
                stroke="#e5e7eb"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            );
          })}

          <path
            d={`${path(WELL_OIL_SERIES, max)} L${W} ${H} L0 ${H} Z`}
            fill="#12a13f14"
          />
          <path
            d={path(WELL_GAS_SERIES, max)}
            fill="none"
            stroke={GAS}
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={path(WELL_OIL_SERIES, max)}
            fill="none"
            stroke={OIL}
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={path(rolling(WELL_OIL_SERIES), max)}
            fill="none"
            stroke="#9ca3af"
            strokeWidth="2"
            strokeDasharray="7 6"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>

      <div className="ml-[42px] mt-1 flex justify-between text-[10.5px] text-mv-muted">
        {WELL_MONTHS.map((month) => (
          <span key={month}>{month}</span>
        ))}
      </div>
    </div>
  );
}

function Spark({
  values,
  stroke,
  className = "",
}: {
  values: number[];
  stroke: string;
  className?: string;
}) {
  const max = Math.max(...values);
  return (
    <svg
      viewBox={`0 0 ${W} 60`}
      preserveAspectRatio="none"
      className={`h-[28px] w-full ${className}`}
      aria-hidden="true"
    >
      <path
        d={values
          .map((value, index) => {
            const x = (index / (values.length - 1)) * W;
            const y = 60 - (value / max) * 52;
            return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
          })
          .join(" ")}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/** The oil share, as a ring. One arc over a track — no library needed. */
function Donut({ share }: { share: number }) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;

  return (
    <svg viewBox="0 0 64 64" className="h-[64px] w-[64px] shrink-0" role="img" aria-label={`${share}% oil`}>
      <circle cx="32" cy="32" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="9" />
      <circle
        cx="32"
        cy="32"
        r={radius}
        fill="none"
        stroke={OIL}
        strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray={`${(share / 100) * circumference} ${circumference}`}
        transform="rotate(-90 32 32)"
      />
      <text
        x="32"
        y="31"
        textAnchor="middle"
        className="fill-mv-ink text-[13px] font-bold"
      >
        {share}%
      </text>
      <text
        x="32"
        y="41"
        textAnchor="middle"
        className="fill-mv-muted text-[7px] font-bold uppercase tracking-[.1em]"
      >
        Oil
      </text>
    </svg>
  );
}

/** The wellbore in section: down, then out along the lateral. */
function Wellbore() {
  return (
    <div className="mt-4 overflow-hidden rounded-lg bg-[#f3efe4]">
      <svg viewBox="0 0 300 120" className="h-[120px] w-full" role="img" aria-label="Horizontal wellbore">
        <rect x="0" y="0" width="300" height="34" fill="#efe9db" />
        <rect x="0" y="34" width="300" height="46" fill="#e6dfcd" />
        <rect x="0" y="80" width="300" height="40" fill="#dff0e4" />

        <text x="8" y="12" className="fill-mv-muted text-[6px] font-bold uppercase tracking-[.1em]">
          {WELL_BORE.surface}
        </text>
        <text x="8" y="48" className="fill-mv-muted text-[6px] font-bold uppercase tracking-[.1em]">
          Horizontal
        </text>
        <text x="232" y="76" className="fill-mv-muted text-[6px] font-bold uppercase tracking-[.1em]">
          {WELL_BORE.formation}
        </text>

        <rect x="26" y="6" width="10" height="10" fill="#1f2937" />
        <path
          d="M31 16 L31 74 Q31 92 52 92 L280 92"
          fill="none"
          stroke="#1f2937"
          strokeWidth="3"
          strokeLinecap="round"
        />
        {Array.from({ length: 16 }, (_, index) => (
          <line
            key={index}
            x1={70 + index * 13}
            y1="92"
            x2={70 + index * 13}
            y2="102"
            stroke={OIL}
            strokeWidth="1.5"
          />
        ))}
      </svg>
    </div>
  );
}

/** A rough Texas outline, as the mock's location thumbnail. */
function TexasMark() {
  return (
    <div className="grid h-[64px] w-[64px] shrink-0 place-items-center rounded-lg bg-[#f6f7f9]">
      <svg viewBox="0 0 40 40" className="h-[34px] w-[34px]" aria-hidden="true">
        <path
          d="M6 8 L18 8 L19 5 L26 6 L27 12 L33 13 L31 22 L26 26 L24 34 L18 31 L12 32 L10 24 L6 20 Z"
          fill="#dfeee5"
          stroke="#8fbfa6"
          strokeWidth="1"
        />
        <circle cx="20" cy="18" r="2.6" fill={OIL} />
      </svg>
    </div>
  );
}

/** `TOM GREEN` reads better as `Tom Green` beside the operator's own casing. */
function titleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/(^|\s|-)([a-z])/g, (_, lead: string, letter: string) => lead + letter.toUpperCase());
}

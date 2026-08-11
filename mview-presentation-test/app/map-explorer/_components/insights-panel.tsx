"use client";

import {
  BarChart3,
  Building2,
  ChevronDown,
  Download,
  Gauge,
  Search,
  Zap,
} from "lucide-react";
import { useState } from "react";

import {
  HEADLINE_CARDS,
  INSIGHTS_HEADER,
  PRODUCTION_FOOTER,
  PRODUCTION_GAS,
  PRODUCTION_MONTHS,
  PRODUCTION_OIL,
  PRODUCTION_ROLLING,
  TOP_COUNTIES,
  TOP_OPERATORS,
  TOTALS,
  TOTALS_REPORTED_THROUGH,
  WELLS_DRILLED,
  WELL_MIX,
} from "./insights-data";

/*
 * The Insights panel — the right half of the split view.
 *
 * Every figure is static (see `insights-data.ts`). The charts are hand-drawn
 * SVG rather than a charting library: four small charts do not justify pulling
 * in a dependency, and inline paths keep the palette on the same tokens as the
 * rest of the page.
 *
 * The series/range switches above the production chart change the chart's
 * framing only — there is one dataset behind them.
 */

const OIL = "#2e8f6d";
const GAS = "#d1584f";

export function InsightsPanel() {
  const [series, setSeries] = useState<"Oil" | "Gas" | "BOE">("BOE");
  const [range, setRange] = useState<"1Y" | "2Y" | "5Y">("2Y");
  const [grain, setGrain] = useState("Monthly");
  /*
   * Stacked under the map, the four headline cards are the whole summary most
   * people want; the chart, the three-up cards and the totals are another few
   * screens of scrolling past them. They stay behind a toggle until asked for,
   * and are simply always there once the panel has a column of its own.
   */
  const [showAll, setShowAll] = useState(false);

  const summaryToggle = (
    <button
      type="button"
      onClick={() => setShowAll((current) => !current)}
      aria-expanded={showAll}
      className="mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-mv-line bg-white px-4 py-[13px] text-[14px] font-bold text-mv-green-deep hover:border-mv-green-deep xl:hidden"
    >
      {showAll ? "Less summary" : "Show full summary"}
      <ChevronDown
        size={16}
        aria-hidden="true"
        className={`transition-transform ${showAll ? "rotate-180" : ""}`}
      />
    </button>
  );

  return (
    <div className="h-full overflow-y-auto bg-mv-bg p-4">
      {/* ---------------- header ---------------- */}
      <div className="relative overflow-hidden rounded-xl border border-mv-line bg-white p-4 lg:p-5">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-[42%] bg-gradient-to-l from-[#eaf7f0] to-transparent" />

        <div className="relative flex flex-wrap items-start gap-3 lg:gap-4">
          <div className="min-w-0 flex-1 basis-full lg:basis-0">
            <div className="text-[11px] font-semibold text-mv-muted">
              {INSIGHTS_HEADER.region}
            </div>
            <h2 className="mt-[3px] text-[19px] font-bold leading-tight text-mv-ink lg:text-[22px] lg:leading-none">
              {INSIGHTS_HEADER.title}
            </h2>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {INSIGHTS_HEADER.chips.map((chip, index) => (
                <span
                  key={chip}
                  className="inline-flex items-center gap-[6px] rounded-full border border-mv-line bg-white px-[9px] py-[4px] text-[11.5px] font-semibold text-mv-slate lg:px-[11px] lg:py-[5px] lg:text-[12px]"
                >
                  {index > 0 && (
                    <span
                      aria-hidden="true"
                      className="h-[6px] w-[6px] rounded-full"
                      style={{ background: index === 1 ? OIL : "#1b2430" }}
                    />
                  )}
                  {chip}
                </span>
              ))}
            </div>

            <p className="mt-[10px] text-[11.5px] text-mv-muted lg:mt-3 lg:text-[12px]">
              {INSIGHTS_HEADER.meta}
            </p>
          </div>

          <div className="flex w-full flex-col gap-[10px] lg:w-auto lg:items-end lg:gap-3">
            <div className="w-full text-left lg:text-right">
              <div className="text-[9.5px] font-extrabold uppercase tracking-[.1em] text-mv-muted">
                {INSIGHTS_HEADER.trendLabel}
              </div>
              <Sparkline
                values={PRODUCTION_GAS}
                width={186}
                height={38}
                stroke={OIL}
              />
            </div>

            <div className="flex items-center gap-2 [&>button]:flex-1 lg:[&>button]:flex-none">
              <button
                type="button"
                className="inline-flex cursor-pointer items-center justify-center gap-[6px] rounded-lg border border-mv-line bg-white px-[11px] py-[7px] text-[12px] font-semibold text-mv-slate hover:border-mv-green-deep hover:text-mv-green-deep lg:px-[13px] lg:text-[12.5px]"
              >
                <Search size={13} aria-hidden="true" />
                Reset view
              </button>
              <button
                type="button"
                className="inline-flex cursor-pointer items-center justify-center gap-[6px] rounded-lg bg-mv-green-deep px-[11px] py-[7px] text-[12px] font-semibold text-white hover:brightness-105 lg:gap-2 lg:px-[13px] lg:text-[12.5px]"
              >
                <Download size={13} aria-hidden="true" />
                Export area
                <span className="inline-flex items-center gap-[2px] rounded bg-mv-amber-bg px-[5px] py-[2px] text-[9px] font-extrabold uppercase tracking-[.06em] text-mv-amber">
                  <Zap size={8} fill="currentColor" strokeWidth={0} aria-hidden="true" />
                  Pro
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- headline cards ---------------- */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {HEADLINE_CARDS.map((card, index) => (
          <div
            key={card.label}
            className="flex flex-col rounded-xl border border-mv-line bg-white p-3 sm:p-4"
          >
            <div className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="grid h-[22px] w-[22px] place-items-center rounded-md bg-[#e6f6ee] text-mv-green-deep"
              >
                {index === 0 ? (
                  <Gauge size={12} />
                ) : index === 1 ? (
                  <BarChart3 size={12} />
                ) : index === 2 ? (
                  <Building2 size={12} />
                ) : (
                  <BarChart3 size={12} />
                )}
              </span>
              <span className="text-[9.5px] font-extrabold uppercase tracking-[.09em] text-mv-muted">
                {card.label}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap items-baseline gap-x-[5px]">
              <span className="text-[20px] font-bold leading-none text-mv-ink sm:text-[24px]">
                {card.value}
              </span>
              {card.unit && (
                <span className="text-[12px] text-mv-muted">{card.unit}</span>
              )}
            </div>
            <div className="mt-[6px] text-[11.5px] text-mv-muted">
              {card.note}
            </div>

            {"sparkline" in card && card.sparkline && (
              <Sparkline
                values={PRODUCTION_GAS}
                width={200}
                height={34}
                stroke={OIL}
                className="mt-2"
              />
            )}

            <div className="mt-auto flex flex-wrap items-baseline justify-between gap-x-2 border-t border-mv-line pt-[10px] text-[11px] [margin-top:14px] sm:text-[11.5px]">
              <span className="text-mv-muted">{card.footLabel}</span>
              <span className="font-semibold text-mv-ink">{card.footValue}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Collapsed, it sits under the cards as the way in; expanded, it moves
          to the foot of what it opened, so closing does not mean scrolling
          back up past everything first. Only below xl, where the cards are
          two-up and the rest is off-screen. */}
      {!showAll && summaryToggle}

      <div className={showAll ? "contents" : "hidden xl:contents"}>
        {/* ---------------- aggregate production ---------------- */}
        <div className="mt-4 rounded-xl border border-mv-line bg-white">
          <div className="flex flex-wrap items-center gap-3 px-5 pt-4">
            <h3 className="flex-1 text-[15px] font-bold leading-none text-mv-ink">
              Aggregate production
            </h3>
            <Segmented
              options={["Oil", "Gas", "BOE"]}
              value={series}
              onChange={(next) => setSeries(next as typeof series)}
            />
            <Segmented
              options={["1Y", "2Y", "5Y"]}
              value={range}
              onChange={(next) => setRange(next as typeof range)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-4 px-5 pt-3 text-[11.5px] text-mv-slate">
            <LegendKey color={OIL} label="Oil (bbl)" />
            <LegendKey color={GAS} label="Gas (Mcf)" />
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
              {PRODUCTION_FOOTER.wells}
            </span>
            <span className="text-[11.5px] text-mv-slate">
              {PRODUCTION_FOOTER.oil}
            </span>
            <span className="text-[11.5px] text-mv-slate">
              {PRODUCTION_FOOTER.gas}
            </span>

            <label className="ml-auto inline-flex cursor-pointer items-center gap-2 rounded-lg border border-mv-line px-[11px] py-[6px] text-[12px] font-semibold text-mv-slate">
              <span className="sr-only">Time grain</span>
              <select
                value={grain}
                onChange={(event) => setGrain(event.target.value)}
                className="cursor-pointer appearance-none bg-transparent pr-1 outline-none"
              >
                <option>Monthly</option>
                <option>Quarterly</option>
                <option>Yearly</option>
              </select>
              <ChevronDown size={13} aria-hidden="true" />
            </label>
          </div>
        </div>

        {/* ---------------- three-up ---------------- */}
        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          {/* well mix */}
          <div className="rounded-xl border border-mv-line bg-white p-5">
            <h3 className="text-[15px] font-bold leading-none text-mv-ink">
              Well mix
            </h3>

            <div className="mt-4 flex items-center gap-5">
              <Donut share={WELL_MIX.oilShare} />
              <div className="min-w-0 flex-1">
                {WELL_MIX.legend.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center gap-2 py-[5px] text-[12.5px]"
                  >
                    <span
                      aria-hidden="true"
                      className="h-[8px] w-[8px] shrink-0 rounded-[2px]"
                      style={{ background: row.color }}
                    />
                    <span className="flex-1 truncate text-mv-slate">
                      {row.label}
                    </span>
                    <span className="font-bold text-mv-ink">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 text-[9.5px] font-extrabold uppercase tracking-[.09em] text-mv-muted">
              Status
            </div>
            <div className="mt-2">
              {WELL_MIX.status.map((row) => (
                <BarRow key={row.label} {...row} color="#7aa7d9" />
              ))}
            </div>
          </div>

          {/* top operators */}
          <div className="flex flex-col rounded-xl border border-mv-line bg-white p-5">
            <div className="flex items-center gap-2">
              <h3 className="flex-1 text-[15px] font-bold leading-none text-mv-ink">
                Top operators
              </h3>
              <Badge>By wells</Badge>
            </div>

            <div className="mt-4">
              {TOP_OPERATORS.rows.map((row) => (
                <BarRow key={row.label} {...row} color={OIL} />
              ))}
            </div>

            <div className="mt-auto border-t border-mv-line pt-3 text-[12px] text-mv-slate [margin-top:16px]">
              {TOP_OPERATORS.footer.label}{" "}
              <span className="font-bold text-mv-ink">
                {TOP_OPERATORS.footer.value}
              </span>{" "}
              <span className="text-mv-muted">{TOP_OPERATORS.footer.unit}</span>
            </div>
          </div>

          {/* wells drilled */}
          <div className="rounded-xl border border-mv-line bg-white p-5">
            <div className="flex items-center gap-2">
              <h3 className="flex-1 text-[15px] font-bold leading-none text-mv-ink">
                Wells drilled
              </h3>
              <Badge>5-yr</Badge>
            </div>

            <DrilledChart />

            <div className="mt-4 text-[9.5px] font-extrabold uppercase tracking-[.09em] text-mv-muted">
              Counties
            </div>
            <div className="mt-2">
              {TOP_COUNTIES.map((row) => (
                <BarRow key={row.label} {...row} color={OIL} />
              ))}
            </div>
          </div>
        </div>

        {/* ---------------- totals ----------------
            `gap-px` over a line-coloured background is the divider: each cell
            keeps its own white fill and the 1px seams between them read as rules,
            without a border that would double up at the card's edge. */}
        <div className="mt-4 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-mv-line bg-mv-line xl:grid-cols-5">
          {TOTALS.map((total) => (
            <div
              key={total.label}
              /* One figure per row until there is room for five abreast: these
                 run to twelve digits, and a column narrow enough to fit five of
                 them on a phone would not fit one. `xl:block` puts the cells
                 back to label-over-value. */
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

          <div className="flex items-baseline justify-between gap-2 bg-white px-4 py-[11px] xl:col-span-5 xl:px-5">
            <span className="text-[9.5px] font-extrabold uppercase tracking-[.09em] text-mv-muted">
              Reported through
            </span>
            <span className="text-[12.5px] font-bold text-mv-ink">
              {TOTALS_REPORTED_THROUGH}
            </span>
          </div>
        </div>
      </div>

      {showAll && summaryToggle}
    </div>
  );
}

/* ------------------------------------------------------------------ charts */

/** Maps a series onto a path in a fixed viewBox. */
function pathFor(
  values: number[],
  max: number,
  width: number,
  height: number,
): string {
  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - (value / max) * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

const CHART_W = 1000;
const CHART_H = 260;
const CHART_MAX = 2e9;

function ProductionChart() {
  const gas = pathFor(PRODUCTION_GAS, CHART_MAX, CHART_W, CHART_H);
  const oil = pathFor(PRODUCTION_OIL, CHART_MAX, CHART_W, CHART_H);
  const rolling = pathFor(PRODUCTION_ROLLING, CHART_MAX, CHART_W, CHART_H);
  const ticks = [0, 0.4e9, 0.8e9, 1.2e9, 1.6e9, 2e9];

  const dots = (values: number[], color: string) =>
    values.map((value, index) => (
      <circle
        key={index}
        cx={(index / (values.length - 1)) * CHART_W}
        cy={CHART_H - (value / CHART_MAX) * CHART_H}
        r="3.5"
        fill="#fff"
        stroke={color}
        strokeWidth="2"
      />
    ));

  return (
    <div className="px-5 pt-3">
      <div className="flex gap-2">
        <div className="flex w-[46px] shrink-0 flex-col-reverse justify-between py-[2px] text-right text-[10.5px] text-mv-muted">
          {ticks.map((tick) => (
            <span key={tick}>{formatAxis(tick)}</span>
          ))}
        </div>

        <svg
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          preserveAspectRatio="none"
          className="h-[260px] w-full"
          role="img"
          aria-label="Aggregate oil and gas production, Jun 2024 to Apr 2026"
        >
          {ticks.map((tick) => {
            const y = CHART_H - (tick / CHART_MAX) * CHART_H;
            return (
              <line
                key={tick}
                x1="0"
                x2={CHART_W}
                y1={y}
                y2={y}
                stroke="#e5e7eb"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            );
          })}

          <path d={`${gas} L${CHART_W} ${CHART_H} L0 ${CHART_H} Z`} fill="#fdecea" />
          <path d={`${oil} L${CHART_W} ${CHART_H} L0 ${CHART_H} Z`} fill="#e9f5ef" />

          <path
            d={rolling}
            fill="none"
            stroke="#6b7280"
            strokeWidth="2"
            strokeDasharray="7 5"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={gas}
            fill="none"
            stroke={GAS}
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={oil}
            fill="none"
            stroke={OIL}
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />

          <g vectorEffect="non-scaling-stroke">{dots(PRODUCTION_GAS, GAS)}</g>
          <g vectorEffect="non-scaling-stroke">{dots(PRODUCTION_OIL, OIL)}</g>
        </svg>
      </div>

      <div className="ml-[54px] flex justify-between pb-3 pt-2 text-[10.5px] text-mv-muted">
        {PRODUCTION_MONTHS.filter((_, index) => index % 2 === 0).map((month) => (
          <span key={month}>{month}</span>
        ))}
      </div>
    </div>
  );
}

function DrilledChart() {
  const width = 300;
  const height = 96;
  const max = Math.max(...WELLS_DRILLED);
  const path = pathFor(WELLS_DRILLED, max, width, height);
  const ticks = [0, 50000, 100000, 150000, 200000, 250000];

  return (
    <div className="mt-3 flex gap-2">
      <div className="flex w-[34px] shrink-0 flex-col-reverse justify-between text-right text-[9.5px] text-mv-muted">
        {ticks.map((tick) => (
          <span key={tick}>{tick ? `${tick / 1000}k` : "0"}</span>
        ))}
      </div>

      <div className="min-w-0 flex-1">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="h-[96px] w-full"
          role="img"
          aria-label="Wells drilled per five-year period since 1935"
        >
          <path
            d={path}
            fill="none"
            stroke={OIL}
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
          {WELLS_DRILLED.map((value, index) => (
            <circle
              key={index}
              cx={(index / (WELLS_DRILLED.length - 1)) * width}
              cy={height - (value / max) * height}
              r="2.5"
              fill="#fff"
              stroke={OIL}
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>

        <div className="flex justify-between pt-1 text-[9.5px] text-mv-muted">
          {["'60", "'80", "'00", "'20"].map((year) => (
            <span key={year}>{year}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Sparkline({
  values,
  width,
  height,
  stroke,
  className = "",
}: {
  values: number[];
  width: number;
  height: number;
  stroke: string;
  className?: string;
}) {
  const max = Math.max(...values);
  const path = pathFor(values, max, width, height);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={`h-[${height}px] w-full ${className}`}
      style={{ height }}
      aria-hidden="true"
    >
      <path d={`${path} L${width} ${height} L0 ${height} Z`} fill="#e9f5ef" />
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function Donut({ share }: { share: number }) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const filled = (share / 100) * circumference;

  return (
    <div className="relative shrink-0">
      <svg width="88" height="88" viewBox="0 0 88 88" aria-hidden="true">
        <circle cx="44" cy="44" r={radius} fill="none" stroke="#f0f1f4" strokeWidth="14" />
        <circle
          cx="44"
          cy="44"
          r={radius}
          fill="none"
          stroke={OIL}
          strokeWidth="14"
          strokeDasharray={`${filled} ${circumference - filled}`}
          strokeDashoffset={circumference / 4}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="text-[17px] font-bold leading-none text-mv-ink">
            {share}%
          </div>
          <div className="mt-[2px] text-[8px] font-extrabold uppercase tracking-[.1em] text-mv-muted">
            Oil
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- bits */

function BarRow({
  label,
  value,
  share,
  color,
}: {
  label: string;
  value: string;
  share: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 py-[5px] text-[12.5px]">
      <span className="w-[104px] shrink-0 truncate text-mv-slate">{label}</span>
      <span className="h-[7px] flex-1 overflow-hidden rounded-full bg-[#f0f1f4]">
        <span
          className="block h-full rounded-full"
          style={{ width: `${share}%`, background: color }}
        />
      </span>
      <span className="w-[42px] shrink-0 text-right font-bold text-mv-ink">
        {value}
      </span>
    </div>
  );
}

function Segmented({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-mv-line p-[3px]">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={option === value}
          onClick={() => onChange(option)}
          className={`cursor-pointer rounded-full px-[11px] py-[3px] text-[11.5px] font-semibold ${
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

function LegendKey({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden="true"
        className="h-[8px] w-[8px] rounded-[2px]"
        style={{ background: color }}
      />
      {label}
    </span>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-[#eef1ee] px-[7px] py-[3px] text-[9px] font-extrabold uppercase tracking-[.08em] text-mv-slate">
      {children}
    </span>
  );
}

function formatAxis(value: number): string {
  if (value === 0) return "0";
  if (value >= 1e9) return `${value / 1e9}B`;
  return `${value / 1e6}M`;
}

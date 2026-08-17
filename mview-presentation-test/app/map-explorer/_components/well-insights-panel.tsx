"use client";

import {
  Building2,
  Database,
  Droplet,
  FileText,
  Flame,
  Info,
  Layers,
  MapPin,
  Ruler,
  ScrollText,
  TrendingUp,
  Wind,
} from "lucide-react";

import { ProductionChart } from "./production-chart";

import {
  COHORT_EUR,
  DECLINE_ROWS,
  DEPTH_GEOMETRY,
  INSIGHT_SUMMARY,
  LEASE_INFORMATION,
  OPERATOR_INFO,
  RESERVE_INTEGRITY,
  WELLBORE,
  WELL_ACTIVITY,
  WELL_HEADER,
  WELL_INFORMATION,
  WELL_LOCATION,
  WELL_METRICS,
} from "./well-insights-data";

/*
 * The summary for one well.
 *
 * The top strip takes what the map already knows about the clicked well — its
 * API number, county and status. Everything below is static: production
 * history, reserves, decline and filings are not in the map API yet, and
 * `well-insights-data.ts` is the single place to replace when they are.
 */

const OIL = "#12a13f";

export type SelectedWell = {
  api: string;
  lease: string;
  well: string;
  operator: string;
  status: string;
  wtype: string;
  county: string;
};

export function WellInsightsPanel({ well }: { well: SelectedWell }) {
  return (
    <div className="mv-thin-scroll h-full overflow-y-auto bg-mv-bg p-3 lg:p-4">
      {/* ---------------- identity strip ----------------
          A pale mint band rather than a white card: enough to read as the
          header the rest of the page hangs off, without going dark on a light
          layout. */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-4 rounded-xl border border-[#cfe8da] bg-gradient-to-r from-[#eaf7ef] via-[#f2fbf5] to-[#e6f5ec] px-4 py-[14px]">
        <span className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-full border border-[#bfe0cd] bg-white">
          <Flame size={19} strokeWidth={1.75} className="text-mv-green-deep" aria-hidden="true" />
        </span>

        <HeaderFact label="Well Number" value={well.well || WELL_HEADER.wellNumber} />
        <HeaderFact label="API Number" value={well.api} mono />
        <HeaderFact label="County" value={titleCase(well.county)} />
        <HeaderFact
          label="Well Status"
          value={well.status || WELL_HEADER.status}
          tone="green"
        />

        <div className="ml-auto flex items-center gap-[10px] rounded-lg border border-[#cfe8da] bg-white px-[14px] py-[8px]">
          <TrendingUp size={18} strokeWidth={1.75} className="text-mv-green-deep" aria-hidden="true" />
          <span>
            <span className="block text-[10.5px] leading-tight text-mv-muted">
              Performance
            </span>
            <span className="block text-[14px] font-bold leading-tight text-mv-green-deep">
              {WELL_HEADER.performance}
            </span>
          </span>
        </div>
      </div>

      {/* ---------------- the six figures ----------------
          One card, ruled into six, rather than six cards: they are one row of
          readings about one well, and separate cards said they were separate
          things. `gap-px` over a line-coloured ground is the rule — each cell
          keeps its white fill and the 1px seams read as dividers, including
          where the grid wraps. */}
      <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-mv-line bg-mv-line md:grid-cols-3 xl:grid-cols-6">
        {WELL_METRICS.map((metric, index) => {
          const look = METRIC_LOOK[index % METRIC_LOOK.length];
          const Icon = look.icon;

          return (
            <div
              key={metric.label}
              className="flex items-center gap-[10px] bg-white px-[14px] py-[12px]"
            >
              {/* The icon on its own, no tinted disc behind it: six discs in a
                  row read as six buttons. */}
              <Icon
                size={22}
                strokeWidth={1.75}
                aria-hidden="true"
                className="shrink-0"
                style={{ color: look.colour }}
              />

              <span className="min-w-0">
                <span className="block truncate text-[11px] leading-tight text-mv-slate">
                  {metric.label}
                </span>
                <span className="mt-[5px] block text-[20px] font-bold leading-none tabular-nums text-mv-ink">
                  {metric.value}
                </span>
                <span className="mt-[5px] block text-[10px] font-semibold uppercase tracking-[.08em] text-mv-muted">
                  {metric.unit}
                </span>
              </span>
            </div>
          );
        })}
      </div>

      {/* ---------------- well · lease · operator ---------------- */}
      <div className="mt-3 grid gap-3 xl:grid-cols-3">
        <Card icon={Info} title="Well Information">
          <Rows rows={WELL_INFORMATION} />
        </Card>

        <Card icon={ScrollText} title="Lease Information">
          <Rows rows={LEASE_INFORMATION} />
        </Card>

        <Card icon={Layers} title="Wellbore" badge={WELLBORE.kind}>
          <Wellbore />
        </Card>
      </div>

      {/* ---------------- activity · location · wellbore ---------------- */}
      <div className="mt-3 grid gap-3 xl:grid-cols-3">
        <Card icon={FileText} title="Latest Well Activity and Production">
          {/* One column: at half the card's width the dates were truncating to
              "12-03…" and "0…", which is worse than a taller card. */}
          <Rows rows={WELL_ACTIVITY} />
        </Card>

        <Card icon={MapPin} title="Location">
          {/* The mark and the coordinates side by side: a county outline with
              the well on it says "where" faster than four numbers do. */}
          <div className="mt-3 flex items-start gap-4">
            <CountyMark />
            <Rows rows={WELL_LOCATION} className="mt-0 min-w-0 flex-1" />
          </div>
        </Card>

        <div className="flex flex-col gap-3">
          <Card icon={Building2} title="Operator Info">
            <div className="mt-[10px] flex items-baseline justify-between gap-3 text-[12px]">
              <span className="shrink-0 text-mv-muted">{OPERATOR_INFO.label}</span>
              <span className="text-right font-semibold text-mv-ink">
                {well.operator || OPERATOR_INFO.value}
              </span>
            </div>
          </Card>

          <Card icon={Ruler} title="Depth & Geometry">
            {/* One column, like the cards beside it: two columns cut every
                depth down to "11,4…". */}
            <Rows rows={DEPTH_GEOMETRY} />
          </Card>
        </div>
      </div>

      {/* ---------------- production ---------------- */}
      <div className="mt-3">
        <ProductionChart />
      </div>

      {/* ---------------- diagnostics · integrity · cohort ----------------
          Two across, then the cohort table on its own row: at a third of the
          width its five bars had no room to differ, and the difference between
          them is the whole point of that card. */}
      <div className="mt-3 grid gap-3 xl:grid-cols-2">
        <Card
          step={5}
          title="Decline Diagnostics"
          aside="What the rate curve anchors reveal"
        >
          <dl className="mt-2">
            {DECLINE_ROWS.map((row) => (
              <div
                key={row.label}
                className="flex items-baseline justify-between gap-3 border-b border-mv-line py-[6px] text-[12px] last:border-0"
              >
                <dt className="text-mv-slate">{row.label}</dt>
                <dd className="flex items-baseline gap-[5px] whitespace-nowrap">
                  <span
                    className={`font-bold tabular-nums ${
                      row.tone === "down"
                        ? "text-mv-red"
                        : row.tone === "up"
                          ? "text-mv-green-deep"
                          : "text-mv-ink"
                    }`}
                  >
                    {row.value}
                  </span>
                  {row.unit && (
                    <span className="text-[10.5px] text-mv-muted">{row.unit}</span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card step={4} title="Reserve Integrity" aside="Stated Depletion vs Well Age">
          <div className="mt-4 flex h-[168px] items-end gap-3">
            {RESERVE_INTEGRITY.bars.map((bar, index) => (
              <div key={bar.label} className="flex flex-1 flex-col items-center">
                <span className="mb-[6px] text-[11px] font-bold tabular-nums text-mv-ink">
                  {bar.value}%
                </span>
                <div
                  className="w-full rounded-t-md"
                  style={{
                    // Scaled from 40%, so the differences between 83 and 97
                    // are visible rather than five near-identical columns.
                    height: `${((bar.value - 40) / 60) * 120}px`,
                    background: BAR_COLOURS[index % BAR_COLOURS.length],
                  }}
                />
                <span className="mt-[6px] text-[9.5px] text-mv-muted">
                  {bar.label}
                </span>
                <span className="text-[9px] text-mv-muted/70">{bar.count}</span>
              </div>
            ))}
          </div>

          <Note tone="red">{RESERVE_INTEGRITY.note}</Note>
        </Card>

        <Card step={0} title="Cohort EUR — the tell" className="xl:col-span-2">
          <div className="mt-[6px] text-[10.5px] text-mv-muted">
            median booked EUR by age
          </div>

          {/*
            One colour, not five. These are the same measure at five ages, so
            colouring them differently would suggest five kinds of thing — the
            point is the shape of the sequence, which the bar lengths already
            carry.
          */}
          <div className="mt-3">
            {COHORT_EUR.bars.map((bar) => (
              <div
                key={bar.label}
                className="flex items-center gap-3 py-[7px]"
              >
                <span className="w-[58px] shrink-0 text-[11px] text-mv-slate">
                  {bar.label}
                </span>
                <span className="h-[7px] min-w-0 flex-1 overflow-hidden rounded-full bg-[#eef0f2]">
                  <span
                    className="block h-full rounded-full bg-mv-green-deep"
                    style={{ width: `${(bar.value / 400_000) * 100}%` }}
                  />
                </span>
                <span className="w-[52px] shrink-0 text-right text-[11px] font-bold tabular-nums text-mv-ink">
                  {bar.display}
                </span>
              </div>
            ))}
          </div>

          {COHORT_EUR.notes.map((note, index) => (
            <Note key={note} tone={index === 0 ? "red" : "blue"}>
              {note}
            </Note>
          ))}
        </Card>
      </div>

      {/* ---------------- the written read ---------------- */}
      <div className="mt-3 rounded-xl border border-mv-line bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Heading
            step={1}
            title="Insight Summary"
            aside="What the completion record says once it is read against the rest of the collection"
          />

          {/* Labelled as written, not measured: the read below is generated
              from the figures, and saying so is the difference between a
              summary and a claim. */}
          <span className="ml-auto shrink-0 rounded-full bg-mv-mint px-[10px] py-[4px] text-[10px] font-extrabold uppercase tracking-[.08em] text-mv-green-deep">
            Well Summary AI
          </span>
        </div>

        <div className="mt-3">
          <div className="text-[10px] font-extrabold uppercase tracking-[.09em] text-mv-muted">
            Headline Read{" "}
            <span className="font-semibold normal-case tracking-normal text-mv-muted/70">
              auto-generated · every figure traceable to a field or an aggregate
            </span>
          </div>
          <p className="mt-2 text-[12px] leading-[1.6] text-mv-slate">
            {INSIGHT_SUMMARY.headline}
          </p>
        </div>

        {/* One per row, not three across: these are findings to be read in
            order, and a three-column grid made six equal boxes whose heights
            were set by whichever text ran longest. */}
        <div className="mt-4 flex flex-col gap-[10px]">
          {INSIGHT_SUMMARY.cards.map((card) => (
            <div
              key={card.title}
              className={`rounded-xl border p-[14px] ${TONES[card.tone].card}`}
            >
              <div className="flex items-start gap-2">
                <span
                  aria-hidden="true"
                  className={`mt-[3px] h-[8px] w-[8px] shrink-0 rounded-full ${TONES[card.tone].dot}`}
                />
                <div className="min-w-0">
                  <div className="text-[12px] font-bold leading-tight text-mv-ink">
                    {card.title}
                  </div>
                  <p className="mt-[5px] text-[11.5px] leading-[1.55] text-mv-slate">
                    {card.body}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ pieces */

const BAR_COLOURS = ["#e2231a", "#f0a500", "#2fa360", "#2f8f6d", "#2e7d5f"];

/*
 * The six tiles, in order. Oil is green and gas is warm throughout; the two
 * gas tiles differ because one is reported and one is a forecast, and the
 * reserves take the same green as the oil they belong to.
 */
const METRIC_LOOK = [
  { icon: Droplet, colour: "#12a13f" },
  { icon: Flame, colour: "#e08a1e" },
  { icon: Droplet, colour: "#12a13f" },
  { icon: Flame, colour: "#e2231a" },
  { icon: Database, colour: "#12a13f" },
  { icon: Wind, colour: "#12a13f" },
] as const;

const TONES = {
  green: { card: "border-[#bfe3cc] bg-[#f2faf5]", dot: "bg-mv-green-deep" },
  red: { card: "border-[#f6c9c6] bg-[#fdf3f2]", dot: "bg-mv-red" },
  blue: { card: "border-[#c7d7f2] bg-[#f3f7fd]", dot: "bg-mv-blue" },
};

function HeaderFact({
  label,
  value,
  mono,
  tone,
}: {
  label: string;
  value: string;
  mono?: boolean;
  tone?: "green";
}) {
  return (
    <div className="min-w-0 border-l border-[#cfe8da] pl-4 first-of-type:border-0 first-of-type:pl-0">
      <div className="text-[10.5px] leading-tight text-mv-muted">{label}</div>
      <div
        className={`mt-[3px] truncate text-[16px] font-bold leading-tight ${
          tone === "green" ? "text-mv-green-deep" : "text-mv-ink"
        } ${mono ? "font-mono text-[15px]" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}

function Heading({
  step,
  icon: Icon,
  title,
  aside,
  badge,
}: {
  step?: number;
  icon?: typeof Info;
  title: string;
  aside?: string;
  badge?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {step ? (
        <span className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded bg-mv-green-deep text-[10px] font-bold text-white">
          {step}
        </span>
      ) : Icon ? (
        <Icon size={14} className="shrink-0 text-mv-green-deep" aria-hidden="true" />
      ) : null}

      <h3 className="text-[12.5px] font-bold leading-none text-mv-ink">{title}</h3>

      {aside && (
        <span className="hidden truncate text-[10.5px] text-mv-muted lg:block">
          {aside}
        </span>
      )}

      {badge && (
        <span className="ml-auto shrink-0 rounded bg-[#e6f6ee] px-2 py-[3px] text-[9px] font-extrabold uppercase tracking-[.06em] text-mv-green-deep">
          {badge}
        </span>
      )}
    </div>
  );
}

function Card({
  step,
  icon,
  title,
  aside,
  badge,
  className = "",
  children,
}: {
  step?: number;
  icon?: typeof Info;
  title: string;
  aside?: string;
  badge?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-xl border border-mv-line bg-white p-4 ${className}`}>
      <Heading step={step} icon={icon} title={title} aside={aside} badge={badge} />
      {children}
    </div>
  );
}

/** Label left, value right — in one column or two. */
function Rows({
  rows,
  columns = 1,
  className = "",
}: {
  rows: { label: string; value: string }[];
  columns?: 1 | 2;
  className?: string;
}) {
  return (
    <dl
      className={`mt-[10px] ${
        columns === 2 ? "grid grid-cols-1 gap-x-6 sm:grid-cols-2" : ""
      } ${className}`}
    >
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-baseline justify-between gap-3 py-[5px] text-[12px]"
        >
          <dt className="shrink-0 text-mv-muted">{row.label}</dt>
          <dd className="truncate text-right font-semibold text-mv-ink">
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Note({
  tone,
  children,
}: {
  tone: "red" | "blue";
  children: React.ReactNode;
}) {
  return (
    <div
      className={`mt-3 flex items-start gap-2 rounded-lg border p-[10px] ${
        tone === "red" ? TONES.red.card : TONES.blue.card
      }`}
    >
      <span
        aria-hidden="true"
        className={`mt-[3px] h-[8px] w-[8px] shrink-0 rounded-full ${
          tone === "red" ? TONES.red.dot : TONES.blue.dot
        }`}
      />
      <p className="text-[11px] leading-[1.55] text-mv-slate">{children}</p>
    </div>
  );
}

/** A county outline with the well marked on it — the shape, not a map. */
function CountyMark() {
  return (
    <div className="grid h-[74px] w-[74px] shrink-0 place-items-center rounded-xl bg-[#f4f7f5]">
      <svg viewBox="0 0 44 44" className="h-[42px] w-[42px]" aria-hidden="true">
        <path
          d="M7 9 L20 7 L33 10 L36 20 L31 31 L20 36 L10 32 L6 20 Z"
          fill="#e4efe8"
          stroke="#8fbfa6"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <circle cx="21" cy="20" r="4.4" fill={OIL} opacity="0.22" />
        <circle cx="21" cy="20" r="2.2" fill={OIL} />
      </svg>
    </div>
  );
}

/** The wellbore in section: down, then out along the lateral. */
function Wellbore() {
  return (
    <>
      {/*
        Three bands, not one flat panel: the section is a picture of ground,
        and the colour change is what says the bore has left the near-surface
        and entered the producing formation.
      */}
      <div className="mt-3 overflow-hidden rounded-lg">
        <svg
          viewBox="0 0 300 120"
          className="h-[120px] w-full"
          role="img"
          aria-label="Horizontal wellbore in section"
        >
          <rect x="0" y="0" width="300" height="34" fill="#f3efe4" />
          <rect x="0" y="34" width="300" height="46" fill="#eae4d3" />
          <rect x="0" y="80" width="300" height="40" fill="#dff0e4" />

          <text
            x="10"
            y="14"
            className="text-[6px] font-bold uppercase tracking-[.12em]"
            fill="#8a8a5f"
          >
            {WELLBORE.surface}
          </text>
          <text
            x="10"
            y="50"
            className="text-[6px] font-bold uppercase tracking-[.12em]"
            fill="#2e8f6d"
          >
            Horizontal
          </text>
          <text
            x="232"
            y="76"
            className="text-[6px] font-bold uppercase tracking-[.12em]"
            fill="#2e8f6d"
          >
            {WELLBORE.formation}
          </text>

          {/* Down from the wellhead, then out along the lateral. */}
          <path
            d="M30 8 L30 74 Q30 92 52 92 L286 92"
            fill="none"
            stroke="#111827"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Perforations, hanging off the lateral into the formation. */}
          {Array.from({ length: 17 }, (_, index) => (
            <line
              key={index}
              x1={70 + index * 13}
              y1="92"
              x2={70 + index * 13}
              y2="104"
              stroke={OIL}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          ))}
        </svg>
      </div>

    </>
  );
}

/** `TOM GREEN` reads better as `Tom Green` beside the operator's own casing. */
function titleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(
      /(^|\s|-)([a-z])/g,
      (_, lead: string, letter: string) => lead + letter.toUpperCase(),
    );
}

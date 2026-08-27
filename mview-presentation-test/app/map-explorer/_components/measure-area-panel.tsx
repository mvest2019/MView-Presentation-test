"use client";

import { LandPlot, X } from "lucide-react";

import { Hint } from "./hint";
import { useDraggableCard } from "./use-draggable-card";

/*
 * The card that opens when the Measure area tool is armed.
 *
 * Two states in one card. While the tract is being drawn every figure is an em
 * dash — a placeholder, not a zero: nothing has been measured, which is a
 * different thing from having measured nothing. Once the ring is closed the
 * same slots carry the result.
 *
 * Acreage leads, on its own tinted panel. It is the number a mineral owner
 * came for; the rest are how it was arrived at, and as six equal figures in a
 * flat grid nothing said which was which.
 */

export type AreaMeasurement = {
  acres: number;
  squareMiles: number;
  perimeterMiles: number;
  wellsInside: number;
  /*
   * Null, always, for now: the wells feed excludes permits outright — its own
   * note says "dry holes, permits, canceled locations, service wells and wells
   * with no symbol are excluded". The card leaves the figure out rather than
   * printing a zero it cannot stand behind; the field stays so that a permits
   * layer has somewhere to land.
   */
  permitsInside: number | null;
  wellsPerSection: number;
};

type MeasureAreaPanelProps = {
  className?: string;
  /** Null while the tract is still being drawn. */
  result: AreaMeasurement | null;
  /** True while this is the tract the tool drew for you, not one you drew. */
  sample?: boolean;
  onClose: () => void;
};

/** `31,300,000 → "31.3M"` — the mock abbreviates acreage, nothing else. */
function compact(value: number): string {
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e5) return `${Math.round(value / 1e3)}k`;
  if (value >= 1e3) return Math.round(value).toLocaleString("en-US");
  return measure(value);
}

/*
 * A figure with enough decimals to say something.
 *
 * Rounding to whole units turned every small tract into "0 square miles, 0 mi
 * perimeter" — which reads as a broken tool rather than as a tract smaller
 * than the units it is being reported in.
 */
function measure(value: number): string {
  if (value >= 100) return Math.round(value).toLocaleString("en-US");
  if (value >= 10) return value.toFixed(1);
  return value.toFixed(2);
}

/*
 * The four supporting figures, under the acreage.
 *
 * `hint` is what the i beside each label says, and each says how its figure is
 * arrived at rather than what a typical one looks like. An example number in a
 * tooltip sits inches from the real one and is read as though it were about
 * it; the method is the part a reader cannot work out for themselves.
 */
const STATS: {
  label: string;
  green?: boolean;
  hint: string;
  read: (r: AreaMeasurement) => string;
}[] = [
  {
    label: "Square miles",
    hint: "The measured area again, converted to square miles. A section is one square mile, which is the unit leases are described in.",
    read: (r) => measure(r.squareMiles),
  },
  {
    label: "Perimeter",
    hint: "The distance from each corner you clicked to the next, added up around the shape and closed back to the first. Measured along the curve of the earth, not as flat lines on the screen.",
    read: (r) => `${measure(r.perimeterMiles)} mi`,
  },
  {
    label: "Wells inside",
    green: true,
    hint: "Each well the map is holding is tested against the shape and counted if any part of its bore falls inside — so a horizontal well counts on the strength of its path, not its surface hole. Where the map is showing count bubbles rather than wells, the bubbles inside are totalled instead.",
    read: (r) => r.wellsInside.toLocaleString("en-US"),
  },
  {
    /* "Wells per section" no longer fits the cell now the i is beside it, and
       a truncated "WELLS PER SECT..." is worse than the shorter name. */
    label: "Wells / section",
    hint: "The wells inside divided by the area in square miles — that is, how many of them there would be to a section at this density.",
    read: (r) => r.wellsPerSection.toFixed(1),
  },
];

/*
 * Which outer corner each cell of the ruled grid rounds.
 *
 * Two columns, four figures: the first two cells hold the top corners and the
 * last two the bottom. The seams between them stay square.
 */
const CORNERS = [
  "rounded-tl-xl",
  "rounded-tr-xl",
  "rounded-bl-xl",
  "rounded-br-xl",
];

export function MeasureAreaPanel({
  className = "",
  result,
  sample,
  onClose,
}: MeasureAreaPanelProps) {
  const { cardRef, handleProps, style } = useDraggableCard();

  return (
    <div
      ref={cardRef}
      style={style}
      /* No `overflow-hidden`: the hint cards hang past the card's edge, and
          everything inside that needed clipping -- the ruled grid, the drag
          handle -- clips itself. */
      className={`pointer-events-auto z-30 w-[336px] rounded-xl border border-mv-line bg-white shadow-mv-lg ${className}`}
    >
      <div {...handleProps}>
        <span
          aria-hidden="true"
          className="h-[3px] w-9 rounded-full bg-[#c7cbd1]"
        />
      </div>

      <div className="px-4 pb-4 pt-1">
        {/* ---------------- header ---------------- */}
        <div className="flex items-start gap-[10px]">
          <span
            aria-hidden="true"
            className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-lg bg-mv-mint text-mv-green-deep"
          >
            <LandPlot size={16} strokeWidth={2} />
          </span>

          <span className="min-w-0 flex-1">
            <h2 className="flex items-center gap-[7px] text-[14.5px] font-bold leading-none text-mv-ink">
              {result ? "Measured area" : "Measuring an area"}
              {sample && (
                <span className="rounded bg-mv-mint px-[6px] py-[3px] text-[9px] font-extrabold uppercase leading-none tracking-[.08em] text-mv-green-deep">
                  Sample
                </span>
              )}
            </h2>
            <p className="mt-[5px] text-[11.5px] leading-snug text-mv-slate">
              {result
                ? "Click the tool again to measure another area."
                : "Click each corner. Click the first point again to finish."}
            </p>
          </span>

          <button
            type="button"
            onClick={onClose}
            aria-label={sample ? "Dismiss the sample" : "Close"}
            className="-mr-1 grid h-6 w-6 shrink-0 cursor-pointer place-items-center rounded-lg text-mv-muted hover:bg-mv-red-bg hover:text-mv-red"
          >
            <X size={15} aria-hidden="true" />
          </button>
        </div>

        {/* ---------------- the headline figure ---------------- */}
        <div className="mt-3 flex items-end justify-between gap-3 rounded-xl border border-[#cfe8da] bg-gradient-to-r from-[#eaf7ef] to-[#f4fbf7] px-[14px] py-[11px]">
          <span>
            <span className="flex items-center gap-[5px] text-[9.5px] font-extrabold uppercase leading-none tracking-[.09em] text-mv-muted">
              Acres
              <Hint text="The area enclosed by the shape you drew, worked out on the globe rather than on the flat screen and converted to acres. An acre is 43,560 square feet." />
            </span>
            <span className="mt-[7px] block text-[26px] font-bold leading-none tabular-nums text-mv-green-deep">
              {result ? compact(result.acres) : "—"}
            </span>
          </span>

          {result && (
            <span className="text-right text-[11px] leading-snug text-mv-slate">
              {result.squareMiles >= 530
                ? `≈ ${Math.round(result.squareMiles / 1060).toLocaleString("en-US")} Texas counties`
                : `≈ ${measure(result.squareMiles)} sections`}
            </span>
          )}
        </div>

        {/* ---------------- and how it was arrived at ----------------
            One card ruled into four rather than four loose figures: they are
            readings about one tract, and `gap-px` over a line-coloured ground
            makes the seams the dividers.

            No `overflow-hidden`, which is what used to hold the white cells
            inside the rounded border: it also sliced the hints opening from
            the bottom row down to a single line. Each corner cell rounds its
            own outer corner instead, which comes to the same shape and lets
            the hints out. */}
        <div className="mt-[10px] grid grid-cols-2 gap-px rounded-xl border border-mv-line bg-mv-line">
          {STATS.map(({ label, green, hint, read }, index) => (
            <div
              key={label}
              className={`bg-white px-[13px] py-[10px] ${CORNERS[index] ?? ""}`}
            >
              <div className="flex items-center gap-[5px] text-[9.5px] font-extrabold uppercase leading-none tracking-[.08em] text-mv-muted">
                <span className="truncate">{label}</span>
                {/* Right-hand column opens leftwards, or the card would be
                    wider than the panel it sits in. */}
                <Hint text={hint} side={index % 2 === 1 ? "right" : "left"} />
              </div>
              <div
                className={`mt-[7px] text-[16px] font-bold leading-none tabular-nums ${
                  green ? "text-mv-green-deep" : "text-mv-ink"
                }`}
              >
                {result ? read(result) : "—"}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-[10px] text-[11px] leading-snug text-mv-muted">
          Wells count when their bore crosses the tract, even if the surface
          hole sits outside it.
        </p>
      </div>
    </div>
  );
}

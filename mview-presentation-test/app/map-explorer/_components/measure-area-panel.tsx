"use client";

import { X } from "lucide-react";

import { useDraggableCard } from "./use-draggable-card";

/*
 * The card that opens when the Measure area tool is armed.
 *
 * Two states in one card. While the tract is being drawn every figure is an em
 * dash — a placeholder, not a zero: nothing has been measured, which is a
 * different thing from having measured nothing. Once the ring is closed the
 * same six slots carry the result.
 */

export type AreaMeasurement = {
  acres: number;
  squareMiles: number;
  perimeterMiles: number;
  wellsInside: number;
  permitsInside: number;
  wellsPerSection: number;
};

type MeasureAreaPanelProps = {
  className?: string;
  /** Null while the tract is still being drawn. */
  result: AreaMeasurement | null;
  onClose: () => void;
};

/** `31,300,000 → "31.3M"` — the mock abbreviates acreage, nothing else. */
function compact(value: number): string {
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e5) return `${Math.round(value / 1e3)}k`;
  return Math.round(value).toLocaleString("en-US");
}

const STATS: {
  label: string;
  tone: "ink" | "green" | "amber";
  read: (r: AreaMeasurement) => string;
}[] = [
  { label: "Acres", tone: "green", read: (r) => compact(r.acres) },
  {
    label: "Square miles",
    tone: "ink",
    read: (r) => Math.round(r.squareMiles).toLocaleString("en-US"),
  },
  {
    label: "Perimeter",
    tone: "ink",
    read: (r) => `${Math.round(r.perimeterMiles).toLocaleString("en-US")} mi`,
  },
  {
    label: "Wells inside",
    tone: "green",
    read: (r) => r.wellsInside.toLocaleString("en-US"),
  },
  {
    label: "Permits inside",
    tone: "amber",
    read: (r) => r.permitsInside.toLocaleString("en-US"),
  },
  {
    label: "Wells per section",
    tone: "ink",
    read: (r) => r.wellsPerSection.toFixed(1),
  },
];

export function MeasureAreaPanel({
  className = "",
  result,
  onClose,
}: MeasureAreaPanelProps) {
  const { cardRef, handleProps, style } = useDraggableCard();

  return (
    <div
      ref={cardRef}
      style={style}
      className={`pointer-events-auto z-30 w-[344px] overflow-hidden rounded-xl border border-mv-line bg-white shadow-mv-lg ${className}`}
    >
      <div {...handleProps}>
        <span
          aria-hidden="true"
          className="h-[3px] w-9 rounded-full bg-[#c7cbd1]"
        />
      </div>

      <div className="px-[18px] pb-[18px] pt-1">
        <div className="flex items-start gap-2">
          <h2 className="flex-1 text-[15px] font-bold leading-snug text-mv-ink">
            {result ? "Measured area" : "Measuring an area"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 grid h-6 w-6 shrink-0 cursor-pointer place-items-center rounded text-mv-muted hover:bg-[#f2f8f5] hover:text-mv-green-deep"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <p className="mt-[6px] text-[12.5px] leading-snug text-mv-slate">
          {result
            ? "Click the tool again to measure another area."
            : "Click each corner of the tract. Click the first point again to finish."}
        </p>
        <p className="mt-[6px] text-[12px] leading-snug text-mv-muted">
          Wells count when their bore crosses the tract, even if the surface
          hole sits outside it.
        </p>

        <div className="mt-4 grid grid-cols-3 gap-x-3 gap-y-4">
          {STATS.map(({ label, tone, read }) => (
            <div key={label}>
              <div className="text-[9.5px] font-extrabold uppercase leading-none tracking-[.08em] text-mv-muted">
                {label}
              </div>
              <div
                className={`mt-[8px] text-[17px] font-bold leading-none ${
                  tone === "amber"
                    ? "text-mv-amber"
                    : tone === "green"
                      ? "text-mv-green-deep"
                      : "text-mv-ink"
                }`}
              >
                {result ? read(result) : "—"}
              </div>
            </div>
          ))}
        </div>

        {result && (
          <p className="mt-4 border-t border-mv-line pt-3 text-[11.5px] text-mv-muted">
            About {Math.max(1, Math.round(result.squareMiles / 1060))} Texas
            counties&rsquo; worth of land
          </p>
        )}
      </div>
    </div>
  );
}

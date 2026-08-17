"use client";

import { ChevronDown } from "lucide-react";

/*
 * The production range pill: oil and gas, each with a minimum and a maximum.
 *
 * One control rather than four, because the four are read together — "wells
 * making between this much and that much" is a single thought, and four pills
 * across the filter row would say otherwise.
 */

export type ProductionRange = {
  oilMin: string;
  oilMax: string;
  gasMin: string;
  gasMax: string;
};

export const EMPTY_PRODUCTION: ProductionRange = {
  oilMin: "",
  oilMax: "",
  gasMin: "",
  gasMax: "",
};

/** How many of the four bounds are set — the badge on the pill. */
export function productionCount(range: ProductionRange): number {
  return Object.values(range).filter((bound) => bound.trim() !== "").length;
}

type ProductionFilterProps = {
  range: ProductionRange;
  open: boolean;
  disabled?: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (next: ProductionRange) => void;
};

export function ProductionFilter({
  range,
  open,
  disabled,
  onOpenChange,
  onChange,
}: ProductionFilterProps) {
  const count = productionCount(range);

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => onOpenChange(!open)}
        className={`inline-flex items-center gap-[6px] rounded-full border px-[14px] py-[6px] text-[12.5px] font-semibold enabled:cursor-pointer disabled:cursor-wait disabled:opacity-60 ${
          count
            ? "border-mv-green-deep text-mv-green-deep"
            : "border-mv-line text-mv-slate enabled:hover:border-mv-green-deep enabled:hover:text-mv-green-deep"
        }`}
      >
        Production
        {count > 0 && (
          <span className="rounded-full bg-mv-green-deep px-[6px] text-[10px] font-bold text-white">
            {count}
          </span>
        )}
        <ChevronDown size={13} aria-hidden="true" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-[268px] rounded-xl border border-mv-line bg-white p-3 shadow-mv-lg">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-[10.5px] font-extrabold uppercase tracking-[.1em] text-mv-ink">
              Production range
            </span>
            <button
              type="button"
              onClick={() => onChange(EMPTY_PRODUCTION)}
              className="cursor-pointer text-[11.5px] font-bold text-mv-green-deep hover:underline"
            >
              Reset
            </button>
          </div>

          <Pair
            label="Oil (bbl)"
            min={range.oilMin}
            max={range.oilMax}
            onMin={(oilMin) => onChange({ ...range, oilMin })}
            onMax={(oilMax) => onChange({ ...range, oilMax })}
          />
          <Pair
            label="Gas (mcf)"
            min={range.gasMin}
            max={range.gasMax}
            onMin={(gasMin) => onChange({ ...range, gasMin })}
            onMax={(gasMax) => onChange({ ...range, gasMax })}
          />

          <p className="mt-1 text-[11px] leading-snug text-mv-muted">
            Leave a box empty for no bound on that end.
          </p>
        </div>
      )}
    </div>
  );
}

/** One stream: its label, then min and max side by side. */
function Pair({
  label,
  min,
  max,
  onMin,
  onMax,
}: {
  label: string;
  min: string;
  max: string;
  onMin: (value: string) => void;
  onMax: (value: string) => void;
}) {
  return (
    <div className="mb-3">
      <div className="mb-[6px] text-[11.5px] font-semibold text-mv-slate">
        {label}
      </div>
      <div className="flex items-center gap-2">
        <Bound label={`${label} minimum`} value={min} onChange={onMin} placeholder="Min" />
        <span aria-hidden="true" className="text-[12px] text-mv-muted">
          –
        </span>
        <Bound label={`${label} maximum`} value={max} onChange={onMax} placeholder="Max" />
      </div>
    </div>
  );
}

function Bound({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="min-w-0 flex-1">
      <span className="sr-only">{label}</span>
      <input
        type="number"
        min={0}
        inputMode="numeric"
        value={value}
        // Digits only: the endpoint takes whole volumes, and a stray letter
        // would be sent as a query parameter it rejects outright.
        onChange={(event) => onChange(event.target.value.replace(/[^\d]/g, ""))}
        placeholder={placeholder}
        className="w-full rounded-lg border border-mv-line px-[10px] py-[6px] text-[12.5px] tabular-nums text-mv-ink outline-none placeholder:text-mv-muted focus:border-mv-green-deep"
      />
    </label>
  );
}

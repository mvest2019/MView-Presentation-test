"use client";

import { ChevronDown } from "lucide-react";

import { usePanelPlacement } from "./panel-placement";

/** How wide this filter's panel is, for keeping it on the page. */
const PANEL_WIDTH = 268;

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

/** The two streams, each as its pair of bounds. */
const PAIRS = [
  { min: "oilMin", max: "oilMax" },
  { min: "gasMin", max: "gasMax" },
] as const;

const set = (bound: string) => bound.trim() !== "";

/**
 * Complete pairs — the badge on the pill.
 *
 * A range needs both ends. One bound on its own is half a thought, and
 * counting it made the pill claim a filter that could not be applied.
 */
export function productionCount(range: ProductionRange): number {
  return PAIRS.filter((pair) => set(range[pair.min]) && set(range[pair.max]))
    .length;
}

/**
 * What is wrong with the range, if anything — the message under the boxes and
 * the reason Apply is held back.
 *
 * Two ways to get it wrong: half a pair, or a maximum below its minimum. Both
 * would go out as a query the endpoint answers with nothing, which reads as
 * "no such wells" rather than "that is not a range".
 */
export function productionProblem(range: ProductionRange): string | null {
  if (PAIRS.some((pair) => set(range[pair.min]) !== set(range[pair.max]))) {
    return "Enter both a minimum and a maximum for each range you set.";
  }

  const inverted = PAIRS.some(
    (pair) =>
      set(range[pair.min]) &&
      set(range[pair.max]) &&
      Number(range[pair.min]) > Number(range[pair.max]),
  );

  return inverted ? "The maximum has to be at least the minimum." : null;
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
  /* Slid back where the pill is too near the right edge for it — this one
     sits last in the row, so on a phone it is the one that hangs off. */
  const { shift, place } = usePanelPlacement(PANEL_WIDTH);

  const count = productionCount(range);
  const problem = productionProblem(range);
  const badPair = (min: string, max: string) =>
    (min.trim() !== "") !== (max.trim() !== "") ||
    (min.trim() !== "" && max.trim() !== "" && Number(min) > Number(max));

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => onOpenChange(!open)}
        className={`inline-flex items-center gap-[6px] rounded-lg border px-[13px] py-[6px] text-[12.5px] font-semibold enabled:cursor-pointer disabled:cursor-wait disabled:opacity-60 ${
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
        <div
          ref={place}
          style={{ marginLeft: shift }}
          className="absolute left-0 top-full z-50 mt-2 w-[268px] rounded-xl border border-mv-line bg-white p-3 shadow-mv-lg"
        >
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
            /* The unit in capitals, as the column heading and every figure
               on the page write it: BBL, MCF. */
            label="Oil (BBL)"
            invalid={badPair(range.oilMin, range.oilMax)}
            min={range.oilMin}
            max={range.oilMax}
            onMin={(oilMin) => onChange({ ...range, oilMin })}
            onMax={(oilMax) => onChange({ ...range, oilMax })}
          />
          <Pair
            label="Gas (MCF)"
            invalid={badPair(range.gasMin, range.gasMax)}
            min={range.gasMin}
            max={range.gasMax}
            onMin={(gasMin) => onChange({ ...range, gasMin })}
            onMax={(gasMax) => onChange({ ...range, gasMax })}
          />

          <p
            className={`mt-1 text-[11px] leading-snug ${
              problem ? "text-mv-red" : "text-mv-muted"
            }`}
          >
            {problem ?? "Set a minimum and a maximum on either stream."}
          </p>
        </div>
      )}
    </div>
  );
}

/** One stream: its label, then min and max side by side. */
function Pair({
  label,
  invalid,
  min,
  max,
  onMin,
  onMax,
}: {
  label: string;
  invalid?: boolean;
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
        <Bound
          label={`${label} minimum`}
          invalid={invalid}
          value={min}
          onChange={onMin}
          placeholder="Min"
        />
        <span aria-hidden="true" className="text-[12px] text-mv-muted">
          –
        </span>
        <Bound
          label={`${label} maximum`}
          invalid={invalid}
          value={max}
          onChange={onMax}
          placeholder="Max"
        />
      </div>
    </div>
  );
}

function Bound({
  label,
  invalid,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  invalid?: boolean;
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
        aria-invalid={invalid}
        className={`w-full rounded-lg border px-[10px] py-[6px] text-[12.5px] tabular-nums text-mv-ink outline-none placeholder:text-mv-muted ${
          invalid
            ? "border-mv-red focus:border-mv-red"
            : "border-mv-line focus:border-mv-green-deep"
        }`}
      />
    </label>
  );
}

"use client";

/*
 * View modes: Ultra → Essentials → Detailed → Pro, simplest to fullest.
 *
 * The map's main control. Each mode is a floor, not a set: the map shows
 * everything its own mode and every mode below it carries, so a reader moves
 * from the bare minimum to the whole thing along one row of four.
 *
 * The order is the owner portal's — `VIEW_TIERS` in
 * `app/mineralownersite/_lib/portal-state.ts`, where Ultra is likewise the
 * simplest ("one headline, one status, one button") and Professional the
 * fullest. Declared again here rather than imported: that module is the
 * portal's own state, tied to its provider and its stylesheet, and the map
 * needs four labels and a ranking.
 *
 * "Pro" is the short form of Professional. It is a view mode here, never a
 * plan name.
 */

export const DENSITIES = ["ultra", "simple", "detailed", "pro"] as const;

export type Density = (typeof DENSITIES)[number];

/** Essentials is the product default: the basics, and nothing a reader has to
    dismiss before they can read them. */
export const DEFAULT_DENSITY: Density = "simple";

export const DENSITY_LABEL: Record<Density, string> = {
  ultra: "Ultra",
  simple: "Essentials",
  detailed: "Detailed",
  pro: "Pro",
};

const DENSITY_HINT: Record<Density, string> = {
  ultra: "Ultra — the map, the wells, and the least about each one",
  simple: "Essentials — the basic map information",
  detailed: "Detailed — operational detail as well",
  pro: "Pro — everything, including the analysis",
};

/* How the four rank, so a section can name the least density it belongs to
   rather than listing the ones it appears in. */
const DENSITY_RANK: Record<Density, number> = {
  ultra: 0,
  simple: 1,
  detailed: 2,
  pro: 3,
};

/** Whether `current` is detailed enough to show something that starts at `from`. */
export function showsAt(current: Density, from: Density): boolean {
  return DENSITY_RANK[current] >= DENSITY_RANK[from];
}

/** Reads a stored or shared value back, falling back to the default. */
export function toDensity(value: string | null | undefined): Density {
  return DENSITIES.includes(value as Density)
    ? (value as Density)
    : DEFAULT_DENSITY;
}

/**
 * A real tablist, like the view switch beside it: `role="tab"` with
 * `aria-selected`, because the chosen one is marked by a background swap and
 * that is all a screen reader would otherwise have to go on.
 */
export function DensitySwitch({
  value,
  onChange,
}: {
  value: Density;
  onChange: (density: Density) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="How much detail to show"
      className="flex w-full shrink-0 items-center gap-1 rounded-xl border border-mv-line bg-white/97 p-1 shadow-mv-lg backdrop-blur-[6px] lg:w-auto lg:rounded-lg lg:border-0 lg:bg-[#f1f2f4] lg:p-[3px] lg:shadow-none"
    >
      {DENSITIES.map((density) => {
        const selected = density === value;
        return (
          <button
            key={density}
            type="button"
            role="tab"
            aria-selected={selected}
            title={DENSITY_HINT[density]}
            onClick={() => onChange(density)}
            className={`inline-flex flex-1 shrink-0 cursor-pointer items-center justify-center rounded-lg px-[10px] py-[7px] text-[13px] font-semibold leading-tight transition-colors lg:flex-none lg:py-[5px] lg:text-[12.5px] ${
              selected
                ? "bg-white text-mv-green-deep shadow-mv"
                : "text-mv-slate hover:bg-white/70 hover:text-mv-green-deep"
            }`}
          >
            {DENSITY_LABEL[density]}
          </button>
        );
      })}
    </div>
  );
}

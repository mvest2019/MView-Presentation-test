"use client";

import { type WellCluster } from "./cluster-graphics";
import { edgeClamped } from "./tooltip-edge";

/*
 * The card that appears over a well-count bubble on hover.
 *
 * Purely presentational and non-interactive — `pointer-events-none` matters
 * here: the card sits directly over the bubble it describes, and if it took
 * the pointer it would steal the hover from the very thing being hovered and
 * flicker.
 *
 * The three well kinds keep the Railroad Commission's own colours — green oil,
 * red gas, amber for both — the same convention the map's legend symbols use,
 * so a colour means the same thing wherever it appears.
 */

const MIX_COLOURS = {
  oil: "#12a13f",
  gas: "#e2231a",
  oilGas: "#b45309",
} as const;

type ClusterTooltipProps = {
  cluster: WellCluster;
  /**
   * Whether clicking still opens the area. Only on the first cluster level —
   * past that the click has nowhere useful left to take you, so the card does
   * not offer it.
   */
  canOpen: boolean;
  /** Screen position of the bubble's top edge, in view-container pixels. */
  at: { x: number; y: number };
  /** The bubble's diameter, so the card can sit under it when it has to. */
  bubble: number;
};

/*
 * Roughly how tall the card is. Only used to decide which side of the bubble
 * it goes on, so an estimate is enough — and it must not be measured, because
 * measuring means rendering it in the wrong place first and moving it.
 */
const CARD_HEIGHT = 176;

/** The card's own width, for holding it inside the map near the edges. */
const CARD_WIDTH = 228;


export function ClusterTooltip({
  cluster,
  canOpen,
  at,
  bubble,
}: ClusterTooltipProps) {
  /*
   * Above the bubble by default; below it when the top of the map is too close
   * for the card to fit. Near the top the card was running off the map and
   * under the toolbar, which clipped it.
   */
  const below = at.y < CARD_HEIGHT;
  const { left, tail } = edgeClamped(at.x, CARD_WIDTH);
  const mix = [
    { key: "oil", label: "Oil", value: cluster.oil, share: cluster.oilShare },
    { key: "gas", label: "Gas", value: cluster.gas, share: cluster.gasShare },
    {
      key: "oilGas",
      label: "Oil / gas",
      value: cluster.oilGas,
      share: cluster.oilGasShare,
    },
  ] as const;

  return (
    <div
      role="tooltip"
      className={`pointer-events-none absolute z-30 w-[228px] -translate-x-1/2 ${
        below ? "" : "-translate-y-full"
      }`}
      style={{ left, top: below ? at.y + bubble + 12 : at.y - 12 }}
    >
      <div className="overflow-hidden rounded-xl border border-mv-line bg-white shadow-mv-lg">
        {/* The headline: what it is, and the one number people came for. */}
        <div className="bg-[#f4faf6] px-[14px] pb-[11px] pt-[10px]">
          <div className="truncate text-[10px] font-extrabold uppercase leading-none tracking-[.09em] text-mv-muted">
            {cluster.name}
          </div>
          <div className="mt-[7px] flex items-baseline gap-[5px]">
            <span className="text-[21px] font-bold leading-none text-mv-ink">
              {cluster.count.toLocaleString("en-US")}
            </span>
            <span className="text-[11.5px] leading-none text-mv-muted">
              wells
            </span>
          </div>

          {/*
            One bar, three segments — the mix at a glance, before the numbers
            that spell it out.

            Drawn as a gradient with hard stops rather than three flex children:
            a flex item's percentage still negotiates with its siblings, and the
            segments came out visibly off the shares they were meant to show. A
            gradient stop is exactly where it is told to be.

            The stops are cumulative over the shares as reported, and the last
            is pinned to 100% — the API rounds each share to a whole number, so
            they do not always sum to exactly 100.
          */}
          <div
            className="mt-[9px] h-[6px] overflow-hidden rounded-full bg-mv-line"
            role="img"
            aria-label={`${cluster.oilShare}% oil, ${cluster.gasShare}% gas, ${cluster.oilGasShare}% oil and gas`}
            style={{ backgroundImage: mixGradient(mix) }}
          />
        </div>

        <dl className="px-[14px] py-[9px] text-[11.5px] leading-none">
          {mix.map(({ key, label, value, share }) => (
            <div
              key={key}
              className="flex items-center gap-2 py-[4px]"
            >
              <span
                aria-hidden="true"
                className="h-[7px] w-[7px] shrink-0 rounded-full"
                style={{ background: MIX_COLOURS[key] }}
              />
              <dt className="flex-1 text-mv-slate">{label}</dt>
              <dd className="flex items-baseline gap-[6px]">
                <span className="font-semibold tabular-nums text-mv-ink">
                  {value.toLocaleString("en-US")}
                </span>
                <span className="w-[30px] text-right tabular-nums text-mv-muted">
                  {share}%
                </span>
              </dd>
            </div>
          ))}
        </dl>

        {canOpen && (
          <div className="border-t border-mv-line px-[14px] py-[8px] text-[11px] font-semibold leading-none text-mv-green-deep">
            Click to open this area
          </div>
        )}
      </div>

      {/* The tail, pointing back at the bubble — under the card, or over it
          when the card has flipped. A rotated square rather than a border
          triangle, so it can carry the card's own border. */}
      <span
        aria-hidden="true"
        style={{ left: tail }}
        className={`absolute h-[9px] w-[9px] -translate-x-1/2 rotate-45 border-mv-line ${
          below
            ? "top-0 -translate-y-[5px] border-l border-t bg-[#f4faf6]"
            : "top-full -translate-y-[5px] border-b border-r bg-white"
        }`}
      />
    </div>
  );
}

/**
 * `linear-gradient(to right, colour 0% 70%, colour 70% 95%, …)` — one stop
 * pair per segment, walking the running total.
 */
function mixGradient(
  mix: readonly { key: keyof typeof MIX_COLOURS; share: number }[],
): string {
  let from = 0;
  const stops = mix
    .filter(({ share }) => share > 0)
    .map(({ key, share }, index, shown) => {
      const to = index === shown.length - 1 ? 100 : from + share;
      const stop = `${MIX_COLOURS[key]} ${from}% ${to}%`;
      from = to;
      return stop;
    });

  return `linear-gradient(to right, ${stops.join(", ")})`;
}

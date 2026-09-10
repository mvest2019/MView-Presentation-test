"use client";

import { useState } from "react";

import {
  ChevronRight,
  CirclePlay,
  ZoomIn,
  Crosshair,
  LandPlot,
  Ruler,
  SquareDashed,
  type LucideIcon,
} from "lucide-react";

import type { Entitlements } from "@/lib/entitlements";

import { useEntitlements } from "./entitlements-context";

/*
 * The Tools panel that opens off the TOOLS edge tab.
 *
 * Standalone and presentational, the same shape as the basemap gallery: it
 * renders the panel and nothing else — no open/close state, no outside-click
 * handling, no map wiring — so it can be dropped in without disturbing what is
 * already there.
 *
 *     const [open, setOpen] = useState(false);
 *
 *     {open && (
 *       <ToolsPanel
 *         onSelect={(id) => startTool(id)}
 *         onCollapse={() => setOpen(false)}
 *         className="absolute right-0 top-4"
 *       />
 *     )}
 *
 * It carries rounded corners on its left side only, because in the mock it sits
 * flush against the right edge of the map where the TOOLS tab was.
 */

export type MapTool = {
  id: string;
  label: string;
  icon: LucideIcon;
  /**
   * Whether the tool needs the map to be drawing individual wells.
   *
   * True for all four as they stand. It is a flag rather than an assumption
   * because it has not always been true: "What's near my land?" was briefly
   * answered by naming a lease in a search box, which needed no zoom at all.
   * It reads the map again now — the click is traced to a lease through the
   * nearest loaded well — so it waits for the wells with the rest.
   */
  needsWells?: boolean;
  /**
   * WHICH ENTITLEMENT CARRIES THIS TOOL, read off the tier table rather than a
   * floor written here. Section 3.9, one row per tool:
   *
   *   Measure distance      every tier
   *   Measure area          Essential
   *   Draw an area          Detailed
   *   What is near my land  Detailed at 1 mile, Pro at 1 / 3 / 5
   */
  needs: (e: Entitlements) => boolean;
};

export const MAP_TOOLS: MapTool[] = [
  {
    id: "draw-area",
    label: "Draw an area",
    icon: SquareDashed,
    needsWells: true,
    /* Detailed, and it was Pro. Section 3.9 gives Detailed both the well count
       in a box and the CSV of what is in it; what Pro adds in this panel is the
       nearby radii and the nearby CSV, not the drawing. */
    needs: (e) => e.tools.drawArea,
  },
  {
    id: "measure-distance",
    label: "Measure distance",
    icon: Ruler,
    needsWells: true,
    needs: (e) => e.tools.measureDistance,
  },
  {
    id: "whats-near-my-land",
    label: "What's near my land?",
    icon: Crosshair,
    /* The click is traced to a lease through the nearest well on the map, so
       there has to be one — see the lookup in `map-explorer-view.tsx`. */
    needsWells: true,
    needs: (e) => e.tools.nearbyRadii.length > 0,
  },
  {
    id: "measure-area",
    label: "Measure area",
    icon: LandPlot,
    needsWells: true,
    /* Essential, and it was Pro. Geodesic acreage of a shape you drew is the
       first thing an owner asks of a map of their own land — section 3.9. */
    needs: (e) => e.tools.measureArea,
  },
];

type ToolsPanelProps = {
  /** The tool currently armed, if any — its button reads as pressed. */
  activeId?: string;
  /**
   * Whether the map is drawing individual wells rather than count bubbles.
   *
   * Every tool here measures wells: the area's count and its CSV, the tract's
   * wells-inside, the watch circle's tally. Over bubbles there are no wells to
   * read, so the tools would answer nothing — the panel says so rather than
   * arming a tool that cannot work.
   */
  wellsVisible?: boolean;
  onSelect?: (id: string) => void;
  /**
   * Play a tool's worked example again.
   *
   * The example runs by itself the first time a tool is armed and not after,
   * which is right for someone who has learnt the gesture and wrong for
   * someone who wants reminding. This is that reminder, on demand: it shows
   * the example and arms nothing.
   */
  onShowSample?: (id: string) => void;
  /** The chevron in the header — collapses the panel back to the tab. */
  onCollapse?: () => void;
  /** Positioning; the panel places itself nowhere on its own. */
  className?: string;
  tools?: MapTool[];
};

export function ToolsPanel({
  activeId,
  wellsVisible = true,
  onSelect,
  onShowSample,
  onCollapse,
  className = "",
  tools = MAP_TOOLS,
}: ToolsPanelProps) {
  /* Which of the four this tier carries. The rest are filtered out below. */
  const ent = useEntitlements();

  /* Raised by a click made while the map is still on bubbles. */
  const [asked, setAsked] = useState(false);

  return (
    <div
      className={`w-[164px] rounded-l-xl border border-r-0 border-mv-line bg-white p-[10px] md:w-[178px] lg:w-[196px] lg:p-3 shadow-mv-lg ${className}`}
    >
      <div className="mb-2 flex items-center justify-between gap-2 lg:mb-[10px]">
        <h2 className="text-[14px] lg:text-[15px] font-semibold leading-none text-mv-ink">
          Tools
        </h2>
        <button
          type="button"
          onClick={onCollapse}
          aria-label="Collapse tools"
          className="-mr-1 grid h-6 w-6 cursor-pointer place-items-center rounded text-mv-muted hover:bg-[#f2f8f5] hover:text-mv-green-deep focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-mv-green-deep"
        >
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>

      <div className="flex flex-col gap-2 lg:gap-[10px]">
        {tools
          .filter(({ needs }) => needs(ent))
          .map(({ id, label, icon: Icon, needsWells }) => {
          /*
           * ONLY THE TOOLS THIS MODE CARRIES REACH THIS MAP — see the filter
           * above. A tool the tier does not include is not rendered at all,
           * which is a departure from §3.9 and §11.1: those ask for a greyed
           * row with a tier chip, and for the sample window to stay reachable
           * on it. Rejected in review — at 196px the chip and the label
           * collided, and a four-row panel where two rows were adverts read as
           * a paywall rather than a toolbox.
           *
           * `gated` is the OTHER reason a tool will not arm, and it survives:
           * the map is on bubbles and the tool reads wells. That is a
           * moment's problem, fixed by zooming, so the row stays and says so.
           */
          const gated = Boolean(needsWells) && !wellsVisible;

          return (
            /* A row rather than a single button: the example needs a control of
             its own, and a button inside a button is not markup a browser
             will accept. The row keeps the border and the hover it always
             had; the parts inside it carry the clicks. */
            <div
              key={id}
              className={`flex w-full items-center gap-2 rounded-[10px] border px-[10px] py-[7px] lg:gap-[10px] lg:px-3 lg:py-[10px] transition-colors ${
                id === activeId
                  ? "border-mv-green-deep bg-mv-mint"
                  : "border-mv-line bg-white hover:border-mv-green-deep hover:bg-[#f2f8f5]"
              }`}
            >
              <button
                type="button"
                aria-pressed={id === activeId}
                aria-disabled={gated}
                title={
                  gated
                    ? "Zoom in until the wells appear — this tool reads well data"
                    : undefined
                }
                onClick={() => {
                  // Over bubbles the click asks for the wells instead of arming.
                  if (gated) {
                    setAsked(true);
                    return;
                  }
                  setAsked(false);
                  onSelect?.(id);
                }}
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left lg:gap-[10px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
              >
                <Icon
                  size={16}
                  strokeWidth={1.75}
                  className="shrink-0 text-mv-slate"
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 text-[12px] lg:text-[13px] font-semibold leading-[1.25] text-mv-ink">
                  {label}
                </span>
              </button>

              {onShowSample && (
                <button
                  type="button"
                  onClick={() => onShowSample(id)}
                  aria-label={`Show an example of ${label}`}
                  title="Show an example"
                  className="grid h-[22px] w-[22px] shrink-0 cursor-pointer place-items-center rounded-md text-mv-muted hover:bg-white hover:text-mv-green-deep focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-mv-green-deep"
                >
                  <CirclePlay size={15} strokeWidth={1.75} aria-hidden="true" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Why nothing happened, in the panel that was clicked rather than in a
          toast somewhere else on the map. It stands quietly until a click asks
          for a tool, and then says so in amber. */}
      {!wellsVisible && (
        <p
          role={asked ? "alert" : undefined}
          className={`mt-2 flex items-start gap-[7px] rounded-[10px] border px-[9px] py-[8px] text-[11px] leading-snug lg:mt-[10px] ${
            asked
              ? "border-mv-amber bg-mv-amber-bg text-mv-amber"
              : "border-mv-line bg-[#fafbfa] text-mv-muted"
          }`}
        >
          <ZoomIn
            size={13}
            strokeWidth={2}
            className="mt-[1px] shrink-0"
            aria-hidden="true"
          />
          <span>
            These tools read individual wells. Zoom in until the wells appear in
            place of the count bubbles.
          </span>
        </p>
      )}
    </div>
  );
}

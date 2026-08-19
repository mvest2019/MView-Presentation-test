"use client";

import { useState } from "react";

import {
  ChevronRight,
  ZoomIn,
  Crosshair,
  LandPlot,
  Lock,
  Ruler,
  SquareDashed,
  type LucideIcon,
} from "lucide-react";

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
  /** Renders the amber PRO badge and marks the button as gated. */
  pro?: boolean;
};

export const MAP_TOOLS: MapTool[] = [
  { id: "draw-area", label: "Draw an area", icon: SquareDashed, pro: true },
  { id: "measure-distance", label: "Measure distance", icon: Ruler },
  { id: "whats-near-my-land", label: "What's near my land?", icon: Crosshair },
  { id: "measure-area", label: "Measure area", icon: LandPlot },
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
  onCollapse,
  className = "",
  tools = MAP_TOOLS,
}: ToolsPanelProps) {
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
        {tools.map(({ id, label, icon: Icon, pro }) => (
          <button
            key={id}
            type="button"
            aria-pressed={id === activeId}
            aria-disabled={!wellsVisible}
            title={
              wellsVisible
                ? undefined
                : "Zoom in until the wells appear — this tool reads well data"
            }
            onClick={() => {
              // Over bubbles the click asks for the wells instead of arming.
              if (!wellsVisible) {
                setAsked(true);
                return;
              }
              setAsked(false);
              onSelect?.(id);
            }}
            className={`flex w-full cursor-pointer items-center gap-2 rounded-[10px] border px-[10px] py-[7px] text-left lg:gap-[10px] lg:px-3 lg:py-[10px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep ${
              id === activeId
                ? "border-mv-green-deep bg-mv-mint"
                : "border-mv-line bg-white hover:border-mv-green-deep hover:bg-[#f2f8f5]"
            }`}
          >
            <Icon
              size={16}
              strokeWidth={1.75}
              className="shrink-0 text-mv-slate"
              aria-hidden="true"
            />
            <span className="flex-1 text-[12px] lg:text-[13px] font-semibold leading-[1.25] text-mv-ink">
              {label}
            </span>
            {pro && <ProBadge />}
          </button>
        ))}
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
          <ZoomIn size={13} strokeWidth={2} className="mt-[1px] shrink-0" aria-hidden="true" />
          <span>
            These tools read individual wells. Zoom in until the wells appear
            in place of the count bubbles.
          </span>
        </p>
      )}
    </div>
  );
}

/**
 * The gate marker on Draw an area. A lock rather than the toolbar's bolt —
 * in the mock this badge reads as "locked", not "upgrade for speed".
 */
function ProBadge() {
  return (
    <span className="inline-flex shrink-0 items-center gap-[3px] rounded bg-mv-amber-bg px-[5px] py-[2px] text-[8px] lg:text-[9px] font-extrabold uppercase leading-none tracking-[.06em] text-mv-amber">
      <Lock size={8} strokeWidth={3} aria-hidden="true" />
      Pro
    </span>
  );
}

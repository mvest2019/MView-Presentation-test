"use client";

import { ChevronDown, Layers } from "lucide-react";
import { useState } from "react";

/*
 * The well-symbol legend.
 *
 * Symbols are inline SVG rather than an image sprite: they are eleven small
 * geometric marks, they have to stay crisp at any zoom, and drawing them keeps
 * the colours in one place instead of baked into a bitmap.
 *
 * The three colours are the Railroad Commission's own convention — blue for a
 * hole with no production, green for oil, red for gas — not the app palette,
 * because a legend that recolours the industry's symbols stops being a legend.
 */

const BLUE = "#2f4fd8";
const GREEN = "#12a13f";
const RED = "#e2231a";

type SymbolKind =
  | "permitted"
  | "dry-hole"
  | "oil"
  | "gas"
  | "oil-gas"
  | "plugged-oil"
  | "plugged-gas"
  | "canceled"
  | "plugged-oil-gas"
  | "injection"
  | "core-test";

const LEGEND_ITEMS: { kind: SymbolKind; label: string }[] = [
  { kind: "permitted", label: "Permitted Location" },
  { kind: "dry-hole", label: "Dry Hole" },
  { kind: "oil", label: "Oil" },
  { kind: "gas", label: "Gas" },
  { kind: "oil-gas", label: "Oil / Gas" },
  { kind: "plugged-oil", label: "Plugged Oil" },
  { kind: "plugged-gas", label: "Plugged Gas" },
  { kind: "canceled", label: "Canceled / Abandoned Location" },
  { kind: "plugged-oil-gas", label: "Plugged Oil / Gas" },
  { kind: "injection", label: "Injection / Disposal" },
  { kind: "core-test", label: "Core Test" },
];

type LegendsPanelProps = {
  /** Positioning; the panel places itself nowhere on its own. */
  className?: string;
  defaultOpen?: boolean;
};

export function LegendsPanel({
  className = "",
  defaultOpen = true,
}: LegendsPanelProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={`w-[204px] overflow-hidden rounded-xl border border-mv-line bg-white shadow-mv ${className}`}
    >
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center gap-2 bg-mv-green-deep px-3 py-[9px] text-left text-white hover:brightness-105"
      >
        <Layers size={15} aria-hidden="true" />
        <span className="flex-1 text-[14px] font-bold leading-none">
          Legends
        </span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={`transition-transform ${open ? "" : "-rotate-90"}`}
        />
      </button>

      {open && (
        <ul className="max-h-[292px] overflow-y-auto py-1">
          {LEGEND_ITEMS.map(({ kind, label }) => (
            <li
              key={kind}
              className="flex items-start gap-[10px] px-3 py-[5px]"
            >
              <WellSymbol kind={kind} />
              <span className="text-[12.5px] leading-[1.35] text-mv-ink">
                {label}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Eight spokes from the centre — the RRC's "producing both" starburst. */
function Starburst({ color }: { color: string }) {
  return (
    <g stroke={color} strokeWidth="1.6" strokeLinecap="round">
      {Array.from({ length: 8 }, (_, index) => {
        const angle = (index * Math.PI) / 4;
        return (
          <line
            key={index}
            x1={9 + Math.cos(angle) * 2.5}
            y1={9 + Math.sin(angle) * 2.5}
            x2={9 + Math.cos(angle) * 8}
            y2={9 + Math.sin(angle) * 8}
          />
        );
      })}
    </g>
  );
}

function WellSymbol({ kind }: { kind: SymbolKind }) {
  return (
    <svg
      viewBox="0 0 18 18"
      className="mt-[1px] h-[18px] w-[18px] shrink-0"
      aria-hidden="true"
    >
      {kind === "permitted" && (
        <circle cx="9" cy="9" r="5" fill="none" stroke={BLUE} strokeWidth="1.6" />
      )}

      {kind === "dry-hole" && (
        <>
          <circle cx="9" cy="9" r="5" fill="none" stroke={BLUE} strokeWidth="1.6" />
          <g stroke={BLUE} strokeWidth="1.6" strokeLinecap="round">
            <line x1="5.5" y1="5.5" x2="12.5" y2="12.5" />
            <line x1="12.5" y1="5.5" x2="5.5" y2="12.5" />
          </g>
        </>
      )}

      {kind === "oil" && <circle cx="9" cy="9" r="5" fill={GREEN} />}

      {kind === "gas" && <circle cx="9" cy="9" r="5" fill={RED} />}

      {kind === "oil-gas" && (
        <>
          <Starburst color={RED} />
          <circle cx="9" cy="9" r="2.6" fill={RED} />
        </>
      )}

      {kind === "plugged-oil" && (
        <>
          <Starburst color={RED} />
          <circle cx="9" cy="9" r="3.4" fill={GREEN} />
        </>
      )}

      {kind === "plugged-gas" && (
        <>
          <Starburst color={RED} />
          <circle cx="9" cy="9" r="3.4" fill="none" stroke={RED} strokeWidth="1.6" />
        </>
      )}

      {kind === "canceled" && (
        <>
          <circle cx="9" cy="9" r="5" fill="none" stroke={BLUE} strokeWidth="1.6" />
          <line
            x1="5.2"
            y1="12.8"
            x2="12.8"
            y2="5.2"
            stroke={BLUE}
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </>
      )}

      {kind === "plugged-oil-gas" && (
        <>
          <Starburst color={RED} />
          <circle cx="9" cy="9" r="3.4" fill={GREEN} />
          <circle cx="9" cy="9" r="1.4" fill={RED} />
        </>
      )}

      {kind === "injection" && (
        <>
          <circle cx="9" cy="9" r="5" fill="none" stroke={BLUE} strokeWidth="1.6" />
          <line
            x1="9"
            y1="3.4"
            x2="9"
            y2="14.6"
            stroke={BLUE}
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </>
      )}

      {kind === "core-test" && (
        <rect
          x="4.5"
          y="4.5"
          width="9"
          height="9"
          fill="none"
          stroke={BLUE}
          strokeWidth="1.6"
        />
      )}
    </svg>
  );
}

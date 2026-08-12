"use client";

import { ChevronDown, Layers } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

import { getLegendListMap, type MapLegend } from "@/lib/map-api";

/*
 * The well-symbol legend, served by the map API.
 *
 * The symbols were inline SVG while there was no endpoint for them; they are
 * now the same PNGs the map itself draws, which is the point — a legend that
 * redraws its symbols is a legend that can disagree with the map.
 *
 * Ninety of them, so the list scrolls inside the panel rather than running off
 * the bottom of the screen.
 */

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

  const [legends, setLegends] = useState<MapLegend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getLegendListMap()
      .then((list) => {
        if (cancelled) return;
        setLegends(list);
        setError(null);
      })
      .catch((failure: unknown) => {
        if (cancelled) return;
        setError(
          failure instanceof Error
            ? failure.message
            : "Could not load the legend.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      className={`w-[168px] overflow-hidden md:w-[186px] lg:w-[204px] rounded-xl border border-mv-line bg-white shadow-mv ${className}`}
    >
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center gap-2 bg-mv-green-deep px-3 py-[9px] text-left text-white hover:brightness-105"
      >
        <Layers size={15} aria-hidden="true" />
        <span className="flex-1 text-[13px] lg:text-[14px] font-bold leading-none">
          Legends
        </span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={`transition-transform ${open ? "" : "-rotate-90"}`}
        />
      </button>

      {open &&
        (loading || error ? (
          <p className="px-3 py-[10px] text-[11.5px] leading-snug text-mv-muted">
            {loading ? "Loading legend…" : error}
          </p>
        ) : (
          <ul className="mv-thin-scroll max-h-[292px] overflow-y-auto py-1">
            {legends.map(({ id, description, iconUrl }) => (
              <li key={id} className="flex items-start gap-[10px] px-3 py-[5px]">
                <Image
                  src={iconUrl}
                  alt=""
                  width={18}
                  height={18}
                  aria-hidden="true"
                  className="mt-[1px] h-[18px] w-[18px] shrink-0 object-contain"
                  // Cloudinary already serves these at icon size; re-encoding
                  // ninety of them through the optimiser buys nothing.
                  unoptimized
                />
                <span className="text-[11.5px] lg:text-[12.5px] leading-[1.35] text-mv-ink">
                  {description}
                </span>
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}

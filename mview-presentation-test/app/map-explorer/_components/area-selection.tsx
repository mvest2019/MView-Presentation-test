"use client";

/*
 * The bar that rides above a drawn area: how many wells fall inside it, and the
 * two things you can do with them.
 *
 * Purely presentational. The rectangle itself is not here — it is an Esri
 * graphic on the map, so it stays pinned to the ground when you pan or zoom.
 * This only has to be told where the top of that rectangle currently is.
 */

type AreaSelectionBarProps = {
  /** Wells inside the area. */
  count: number;
  /** Screen position of the area's top edge, in view-container pixels. */
  at: { x: number; y: number };
  onExport: () => void;
  onClear: () => void;
};

export function AreaSelectionBar({
  count,
  at,
  onExport,
  onClear,
}: AreaSelectionBarProps) {
  return (
    <div
      className="pointer-events-auto absolute z-30 flex -translate-x-1/2 -translate-y-full items-center gap-[14px] whitespace-nowrap rounded-lg bg-[#1b2430]/95 px-[13px] py-[7px] text-[12.5px] leading-none text-white shadow-mv-lg"
      style={{ left: at.x, top: at.y - 10 }}
    >
      <span>
        <span className="font-bold text-mv-green">
          {count.toLocaleString("en-US")}
        </span>{" "}
        wells in area
      </span>

      <button
        type="button"
        onClick={onExport}
        className="cursor-pointer font-semibold hover:text-mv-green"
      >
        Export CSV
      </button>

      <button
        type="button"
        onClick={onClear}
        className="cursor-pointer font-semibold hover:text-mv-green"
      >
        Clear
      </button>
    </div>
  );
}

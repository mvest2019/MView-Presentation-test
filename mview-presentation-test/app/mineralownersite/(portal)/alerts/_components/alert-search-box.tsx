"use client";

/**
 * THE ALERT SEARCH BOX — v36 · #9.
 *
 * "Find an alert by lease, operator, county, or any word in it." Nine alerts do
 * not need searching; twelve months of them do, and the design's retention
 * period is twelve months. The box is built for the inbox this becomes, not the
 * one it is today.
 *
 * `type="search"` rather than `type="text"`: the browser supplies a clear button
 * and, on iOS, a keyboard with a search key. Both are free and neither needs to
 * be drawn.
 *
 * NO DEBOUNCE. Filtering nine (eventually a few hundred) objects with a
 * `String.includes` is not work worth deferring, and a debounce on a list this
 * size only makes typing feel laggy.
 *
 * The geometry is `portal.css`'s `.field input`, read off the stylesheet — 10px
 * radius, 1px line, the portal's own focus ring.
 */
export function AlertSearchBox({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="mt-2.5 max-w-[420px]">
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label="Search alerts"
        placeholder="Search alerts — lease, operator, county, or any word…"
        className="w-full rounded-[10px] border border-mv-line bg-mv-card px-3 py-2 text-[13px] text-mv-ink placeholder:text-mv-placeholder focus-visible:border-mv-green focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-mv-green-deep"
      />
    </div>
  );
}

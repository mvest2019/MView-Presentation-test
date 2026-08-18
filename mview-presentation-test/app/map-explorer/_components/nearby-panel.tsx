"use client";

import { Check, Download, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useDraggableCard } from "./use-draggable-card";

/*
 * "What's near my land?" — the prompt you get while the tool is armed, and the
 * card that opens once you have picked a spot.
 *
 * Presentational. The circle and its centre dot are Esri graphics on the map;
 * this only needs telling where the bottom of that circle is on screen.
 */

export const NEARBY_RADII = [1, 2, 5, 10] as const;

export type NearbyStats = {
  permits: number;
  wells: number;
  /** Miles to the closest bore, or null when nothing is in range. */
  nearestBoreMiles: number | null;
  /** Who holds what is inside, biggest share first. */
  operators: { name: string; count: number }[];
  /** Year of the newest well or permit inside, or null when empty. */
  newestYear: number | null;
};

/** Stage one: armed, waiting for a click on the map. */
export function NearbyPrompt() {
  return (
    /* `bottom-6` puts it on the same baseline as the scale card and the legend
       stack, rather than floating above them. */
    <div className="pointer-events-none absolute bottom-6 left-1/2 z-30 w-[302px] -translate-x-1/2 rounded-xl border border-mv-line bg-white px-5 py-[14px] text-center shadow-mv-lg">
      <p className="text-[11.5px] lg:text-[13px] font-bold leading-snug text-mv-ink">
        Click the spot on the map you want to watch — usually your own land.
      </p>
      <p className="mt-[6px] text-[10.5px] lg:text-[12px] leading-none text-mv-muted">
        Esc to cancel
      </p>
    </div>
  );
}

type NearbyPanelProps = {
  /** Positioning; the card sits where it is put, not where the circle is. */
  className?: string;
  coordinates: { longitude: number; latitude: number };
  /** Undefined while the lookup is in flight, null when it found nothing. */
  county?: string | null;
  radiusMiles: number;
  stats: NearbyStats;
  /** True while this is the circle the tool drew for you, not one you placed. */
  sample?: boolean;
  onRadiusChange: (miles: number) => void;
  onDownload: () => void;
  onClose: () => void;
};

export function NearbyPanel({
  className = "",
  coordinates,
  county,
  radiusMiles,
  stats,
  sample,
  onRadiusChange,
  onDownload,
  onClose,
}: NearbyPanelProps) {
  const [emailOpen, setEmailOpen] = useState(false);
  const { cardRef, handleProps, style } = useDraggableCard();

  const hasPermits = stats.permits > 0;
  const hasWells = stats.wells > 0;

  return (
    /* Fixed to wherever it is placed rather than chasing the circle: the card
       is ~500px tall with the email settings open, so anchoring it to a point
       near the top of the map pushed it off the bottom, and one near the
       bottom pushed it off the top. `max-h` keeps it inside the map either
       way, scrolling within itself if the viewport is short. */
    <div
      ref={cardRef}
      className={`mv-thin-scroll pointer-events-auto z-30 flex max-h-[calc(100%-48px)] w-[min(344px,calc(100vw-24px))] flex-col overflow-y-auto rounded-xl border border-mv-line bg-white shadow-mv-lg ${className}`}
      style={style}
    >
      {/* The grab handle. Wide hit area, thin bar — the bar alone would be a
          3px target. */}
      <div {...handleProps}>
        <span
          aria-hidden="true"
          className="h-[3px] w-9 rounded-full bg-[#c7cbd1]"
        />
      </div>

      <div className="px-[18px] pb-[18px] pt-1">
        <div className="flex items-start gap-2">
          <h2 className="flex-1 text-[13.5px] lg:text-[15px] font-bold leading-snug text-mv-ink">
            Within {radiusMiles} {radiusMiles === 1 ? "mile" : "miles"} of this
            point
            {sample && (
              <span className="ml-[7px] inline-block rounded bg-mv-mint px-[6px] py-[3px] align-[2px] text-[9px] font-extrabold uppercase leading-none tracking-[.08em] text-mv-green-deep">
                Sample
              </span>
            )}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={sample ? "Dismiss the sample" : "Close"}
            className="-mr-1 grid h-6 w-6 shrink-0 cursor-pointer place-items-center rounded text-mv-muted hover:bg-[#f2f8f5] hover:text-mv-green-deep"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <p className="mt-[6px] text-[11px] lg:text-[12.5px] leading-snug text-mv-muted">
          Counts wells whose <strong className="font-bold text-mv-slate">bore</strong>{" "}
          reaches inside — not just nearby surface holes.
        </p>

        <p className="mt-[6px] text-[10.5px] lg:text-[12px] leading-none text-mv-muted">
          {coordinates.latitude.toFixed(4)}, {coordinates.longitude.toFixed(4)}
          {county ? ` · ${county}` : ""}
        </p>

        {/* ---------------- radius ---------------- */}
        <div className="mt-3 grid grid-cols-4 gap-2">
          {NEARBY_RADII.map((miles) => (
            <button
              key={miles}
              type="button"
              aria-pressed={miles === radiusMiles}
              onClick={() => onRadiusChange(miles)}
              className={`cursor-pointer rounded-lg border py-[7px] text-[11px] lg:text-[12.5px] font-semibold transition-colors ${
                miles === radiusMiles
                  ? "border-mv-green-deep bg-mv-green-deep text-white"
                  : "border-mv-line bg-white text-mv-slate hover:border-mv-green-deep hover:text-mv-green-deep"
              }`}
            >
              {miles} mi
            </button>
          ))}
        </div>

        {/* ---------------- stats ---------------- */}
        <div className="mt-[14px] grid grid-cols-3 gap-2">
          <Stat
            label="New permits"
            value={stats.permits.toLocaleString("en-US")}
            tone={hasPermits ? "amber" : "muted-amber"}
          />
          <Stat label="Wells" value={stats.wells.toLocaleString("en-US")} />
          <Stat
            label="Nearest bore"
            value={
              stats.nearestBoreMiles === null
                ? "—"
                : `${stats.nearestBoreMiles.toFixed(1)} mi`
            }
          />
        </div>

        <div className="mt-3 border-t border-mv-line pt-3">
          <p className="text-[11px] lg:text-[12.5px] leading-snug text-mv-muted">
            {hasPermits
              ? `${stats.permits.toLocaleString("en-US")} permit${stats.permits === 1 ? "" : "s"} inside this area.`
              : "No permits inside this area right now."}
          </p>

          {hasWells && (
            <>
              <p className="mt-[10px] text-[11px] lg:text-[12.5px] leading-snug text-mv-slate">
                Operators here:{" "}
                <strong className="font-bold text-mv-ink">
                  {stats.operators[0]?.name ?? "Unknown"}
                </strong>{" "}
                ({stats.operators.length})
              </p>
              {stats.newestYear !== null && (
                <p className="mt-[3px] text-[11px] lg:text-[12.5px] leading-snug text-mv-slate">
                  Newest well or permit here: {stats.newestYear}
                </p>
              )}
            </>
          )}
        </div>

        <button
          type="button"
          onClick={hasWells ? onDownload : undefined}
          disabled={!hasWells}
          className={`mt-3 flex w-full items-center justify-center gap-2 rounded-lg py-[10px] text-[11.5px] lg:text-[13px] font-semibold ${
            hasWells
              ? "cursor-pointer bg-mv-green-deep text-white hover:brightness-105"
              : "cursor-not-allowed bg-[#f1f2f4] text-mv-muted"
          }`}
        >
          <Download size={14} aria-hidden="true" />
          {hasWells
            ? `Download these ${stats.wells.toLocaleString("en-US")} well${stats.wells === 1 ? "" : "s"}`
            : "Nothing here to download"}
        </button>

        <button
          type="button"
          onClick={() => setEmailOpen((open) => !open)}
          aria-expanded={emailOpen}
          className="mt-2 w-full cursor-pointer rounded-lg border border-mv-line py-[10px] text-[11.5px] lg:text-[13px] font-bold text-mv-green-deep hover:bg-[#f2f8f5]"
        >
          {emailOpen ? "Hide email settings" : "Email me when this changes"}
        </button>

        {emailOpen && <EmailSettings onSaved={() => setEmailOpen(false)} />}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "ink",
}: {
  label: string;
  value: string;
  tone?: "ink" | "amber" | "muted-amber";
}) {
  return (
    <div>
      <div className="text-[8px] lg:text-[9.5px] font-extrabold uppercase leading-none tracking-[.08em] text-mv-muted">
        {label}
      </div>
      <div
        className={`mt-[6px] text-[15.5px] lg:text-[17px] font-bold leading-none ${
          tone === "ink" ? "text-mv-ink" : "text-mv-amber"
        } ${tone === "muted-amber" ? "opacity-70" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}

/**
 * Stage three. Nothing is sent anywhere — see the note the panel prints under
 * the form, which is the mock's own wording and still true here.
 */
function EmailSettings({ onSaved }: { onSaved: () => void }) {
  const [onPermit, setOnPermit] = useState(true);
  const [onProducing, setOnProducing] = useState(false);
  const [email, setEmail] = useState("");
  const [saved, setSaved] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );

  /**
   * Confirm, then fold the section away. The pause is the point — collapsing
   * on the same tick would swallow the only acknowledgement the user gets,
   * leaving them unsure whether the click registered.
   */
  function save() {
    setSaved(true);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(onSaved, 800);
  }

  return (
    <div className="mt-3 border-t border-mv-line pt-3">
      <Toggle checked={onPermit} onChange={setOnPermit}>
        Someone gets a permit to drill inside this circle
      </Toggle>
      <Toggle checked={onProducing} onChange={setOnProducing}>
        A new well starts producing inside this circle
      </Toggle>

      <div className="mt-3 flex items-center gap-2">
        <label htmlFor="watch-email" className="sr-only">
          Email address
        </label>
        <input
          id="watch-email"
          type="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setSaved(false);
          }}
          placeholder="you@example.com"
          className="min-w-0 flex-1 rounded-lg border border-mv-line px-3 py-[8px] text-[11px] lg:text-[12.5px] leading-tight text-mv-ink outline-none focus:border-mv-green-deep placeholder:text-mv-muted"
        />
        <button
          type="button"
          onClick={save}
          className="shrink-0 cursor-pointer rounded-lg bg-mv-green-deep px-[14px] py-[9px] text-[11px] lg:text-[12.5px] font-semibold leading-tight text-white hover:brightness-105"
        >
          {saved ? "Saved" : "Save watch"}
        </button>
      </div>

      <p className="mt-[10px] text-[10px] lg:text-[11.5px] leading-snug text-mv-muted">
        Email delivery isn&apos;t connected yet. Saving keeps this watch in the
        page link, so you can share it or come back to it.
      </p>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="mb-2 flex cursor-pointer items-start gap-2 last:mb-0">
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span
        aria-hidden="true"
        className={`mt-[1px] grid h-[15px] w-[15px] shrink-0 place-items-center rounded-[4px] border ${
          checked
            ? "border-mv-green-deep bg-mv-green-deep text-white"
            : "border-[#c7cbd1] bg-white"
        }`}
      >
        {checked && <Check size={11} strokeWidth={3.5} />}
      </span>
      <span className="text-[11px] lg:text-[12.5px] leading-snug text-mv-ink">{children}</span>
    </label>
  );
}

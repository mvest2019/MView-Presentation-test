"use client";

import { Check, Download, MapPin, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { type MapLeaseNearby } from "@/lib/map-api";

import { useDraggableCard } from "./use-draggable-card";

/*
 * "What's near my land?" — the prompt you get while the tool is armed, and the
 * card that opens once you have picked a spot.
 *
 * Presentational. The circle and its centre dot are Esri graphics on the map;
 * this only needs telling where the bottom of that circle is on screen.
 *
 * Every figure on it comes from `/map/leases/{key}/nearby`, which answers for a
 * lease rather than a point — so the click is first traced to the lease it
 * landed on (see `map-explorer-view.tsx`) and this card reports whatever that
 * came back with, including the times it could not be traced at all.
 */

/** The radii the service holds rings for. Anything else is a 400. */
export const NEARBY_RADII = [1, 3, 5] as const;

/** The lease a click was traced to. */
export type NearbyLease = { key: string; name: string };

/** What the service said about it — or why there is nothing to say. */
export type NearbyAnswer =
  | { kind: "looking" }
  | { kind: "ready"; data: MapLeaseNearby }
  | { kind: "no-ring" }
  | { kind: "problem"; message: string };

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
  radiusMiles: number;
  /** The lease the click was traced to, or null while it is being traced. */
  lease: NearbyLease | null;
  answer: NearbyAnswer;
  onRadiusChange: (miles: number) => void;
  onDownload: () => void;
  onClose: () => void;
};

export function NearbyPanel({
  className = "",
  coordinates,
  radiusMiles,
  lease,
  answer,
  onRadiusChange,
  onDownload,
  onClose,
}: NearbyPanelProps) {
  const [emailOpen, setEmailOpen] = useState(false);
  const { cardRef, handleProps, style } = useDraggableCard();

  const data = answer.kind === "ready" ? answer.data : null;
  const stats = data?.stats;
  const filings = data?.events ?? [];
  const hasPermits = (stats?.newPermits ?? 0) > 0;

  return (
    /* Fixed to wherever it is placed rather than chasing the circle: the card
       is ~500px tall with the email settings open, so anchoring it to a point
       near the top of the map pushed it off the bottom, and one near the
       bottom pushed it off the top. `max-h` keeps it inside the map either
       way, scrolling within itself if the viewport is short. */
    <div
      ref={cardRef}
      /* 380 rather than 344: the filings list has to fit a lease name, a
         distance and a bearing on one line, and at the old width the names were
         truncating to "GOLDSMITH, C. A., E…". Still narrow enough to leave the
         map readable beside it. */
      className={`mv-thin-scroll pointer-events-auto z-30 flex max-h-[calc(100%-48px)] w-[min(380px,calc(100vw-24px))] flex-col overflow-y-auto rounded-xl border border-mv-line bg-white shadow-mv-lg ${className}`}
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
            Within {radiusMiles} {radiusMiles === 1 ? "mile" : "miles"} of{" "}
            {lease ? lease.name : "this point"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 grid h-6 w-6 shrink-0 cursor-pointer place-items-center rounded text-mv-muted hover:bg-[#f2f8f5] hover:text-mv-green-deep"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <p className="mt-[6px] flex items-center gap-[5px] text-[10.5px] lg:text-[12px] leading-none text-mv-muted">
          {lease ? (
            <>
              <MapPin size={12} strokeWidth={2} aria-hidden="true" />
              Lease {lease.key}
              {data ? ` · ${titleCase(data.lease.county)} County` : ""}
            </>
          ) : (
            <>
              {coordinates.latitude.toFixed(4)},{" "}
              {coordinates.longitude.toFixed(4)}
            </>
          )}
        </p>

        {/* ---------------- radius ---------------- */}
        <div className="mt-3 grid grid-cols-3 gap-2">
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

        {/* ---------------- what the service said ---------------- */}
        {answer.kind === "looking" && (
          <p className="mt-[14px] flex items-center gap-[9px] text-[11px] lg:text-[12.5px] leading-snug text-mv-slate">
            <span
              aria-hidden="true"
              className="h-[14px] w-[14px] shrink-0 animate-spin rounded-full border-2 border-mv-line border-t-mv-green-deep"
            />
            {lease
              ? "Reading the Commission’s records for this lease…"
              : "Working out which lease that point is on…"}
          </p>
        )}

        {answer.kind === "no-ring" && (
          <p className="mt-[14px] rounded-lg border border-mv-line bg-[#fafbfa] px-3 py-[11px] text-[11px] lg:text-[12.5px] leading-snug text-mv-slate">
            The service holds no {radiusMiles}-mile ring for this lease. Try
            another distance.
          </p>
        )}

        {answer.kind === "problem" && (
          <p
            role="alert"
            className="mt-[14px] rounded-lg border border-mv-line bg-[#fafbfa] px-3 py-[11px] text-[11px] lg:text-[12.5px] leading-snug text-mv-slate"
          >
            {answer.message}
          </p>
        )}

        {stats && data && (
          <>
            <div className="mt-[14px] grid grid-cols-3 gap-2">
              <Stat
                label="New permits"
                value={stats.newPermits.toLocaleString("en-US")}
                tone={hasPermits ? "amber" : "muted-amber"}
              />
              <Stat
                label="Wells"
                value={stats.nearbyWells.toLocaleString("en-US")}
              />
              <Stat
                label="Nearest bore"
                value={
                  stats.closestWellMiles === null
                    ? "—"
                    : `${stats.closestWellMiles.toFixed(1)} mi`
                }
              />
            </div>

            <div className="mt-3 border-t border-mv-line pt-3">
              <p className="text-[11px] lg:text-[12.5px] leading-snug text-mv-muted">
                {hasPermits
                  ? `${stats.newPermits.toLocaleString("en-US")} new permit${stats.newPermits === 1 ? "" : "s"} in the last ${data.meta.windowMonths} months.`
                  : `No new permits in the last ${data.meta.windowMonths} months.`}
              </p>
            </div>

            {/* ---------------- what actually happened ----------------
              The counts above say how much; these say what. Each row is one
              filing as the service returned it — what it was, whose lease, how
              far off and in which direction, and the date it carries. */}
            {filings.length > 0 && (
              <div className="mt-3 border-t border-mv-line pt-3">
                <h3 className="text-[9px] lg:text-[9.5px] font-extrabold uppercase leading-none tracking-[.08em] text-mv-muted">
                  Recent filings
                </h3>

                {/* Three rows, then it scrolls within itself.
                    A three-mile ring can return a dozen filings, and letting
                    them all stack pushed Download and the email settings off
                    the bottom of the card — the list is the part worth
                    scrolling, not the whole card. */}
                {/* Black bar, as under the permit table: here it is the only
                    thing saying there are more filings below the third. The
                    pale one the dropdowns use was invisible against white. */}
                <ol className="mv-thin-scroll mv-scroll-dark mt-[8px] max-h-[180px] overflow-y-auto pr-1">
                  {filings.map((filing) => (
                    <li
                      key={`${filing.api}-${filing.date}-${filing.type}`}
                      className="border-b border-mv-line py-[8px] last:border-0"
                    >
                      {/* The name takes the whole first line; the badge
                          moved down beside the operator. Sharing the line with
                          it left "GOLDSMITH, C. A., ETAL 3H" truncating to
                          "GOLDSMITH, C. A., E…", and the lease is the one thing
                          on the row nobody can guess from the rest. */}
                      <div className="flex items-baseline gap-2">
                        <span className="min-w-0 flex-1 truncate text-[11px] lg:text-[12px] font-bold text-mv-ink">
                          {filing.leaseName} {filing.well}
                        </span>
                        <span className="shrink-0 text-[10px] lg:text-[10.5px] tabular-nums text-mv-slate">
                          {filing.distanceMiles === null
                            ? "—"
                            : `${filing.distanceMiles.toFixed(1)} mi`}
                          {filing.bearing ? ` ${filing.bearing}` : ""}
                        </span>
                      </div>
                      <div className="mt-[5px] flex items-baseline gap-2 text-[10px] lg:text-[10.5px] text-mv-muted">
                        <span
                          className={`shrink-0 rounded px-[5px] py-[3px] text-[8.5px] font-extrabold uppercase leading-none tracking-[.06em] ${
                            /permit/i.test(filing.type)
                              ? "bg-mv-amber-bg text-mv-amber"
                              : "bg-mv-mint text-mv-green-deep"
                          }`}
                        >
                          {filing.type}
                        </span>
                        <span className="min-w-0 flex-1 truncate">
                          {filing.operator}
                        </span>
                        <span className="shrink-0 tabular-nums">
                          {filing.date ?? "—"}
                        </span>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </>
        )}

        {/* The filings themselves, since those are what the service returns
            row by row — the well count is a total, not a list. */}
        <button
          type="button"
          onClick={filings.length > 0 ? onDownload : undefined}
          disabled={filings.length === 0}
          className={`mt-3 flex w-full items-center justify-center gap-2 rounded-lg py-[10px] text-[11.5px] lg:text-[13px] font-semibold ${
            filings.length > 0
              ? "cursor-pointer bg-mv-green-deep text-white hover:brightness-105"
              : "cursor-not-allowed bg-[#f1f2f4] text-mv-muted"
          }`}
        >
          <Download size={14} aria-hidden="true" />
          {filings.length > 0
            ? `Download these ${filings.length} filing${filings.length === 1 ? "" : "s"}`
            : "Nothing new to download"}
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

/** `UPTON` -> `Upton`, beside the operator names' own casing. */
function titleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(
      /(^|\s|-)([a-z])/g,
      (_, lead: string, letter: string) => lead + letter.toUpperCase(),
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

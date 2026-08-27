"use client";

import {
  CalendarDays,
  Check,
  CircleCheckBig,
  Crosshair,
  Download,
  FileText,
  Flame,
  Mail,
  MapPin,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { saveLeaseWatch, type MapLeaseNearby } from "@/lib/map-api";

import { Hint } from "./hint";
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
  /*
   * Whether what is on screen answers the distance now chosen.
   *
   * The response carries its own `radiusMiles`, so a card still holding the
   * one-mile answer while the five-mile button is pressed is, by that fact
   * alone, waiting for a new one. Nothing has to be passed in to say so.
   */
  const stale = data !== null && data.radiusMiles !== radiusMiles;

  const hasPermits = (stats?.newPermits ?? 0) > 0;
  const hasCompletions = (stats?.newCompletions ?? 0) > 0;

  return (
    /* Fixed to wherever it is placed rather than chasing the circle: the card
       is ~500px tall with the email settings open, so anchoring it to a point
       near the top of the map pushed it off the bottom, and one near the
       bottom pushed it off the top. `max-h` keeps it inside the map either
       way, scrolling within itself if the viewport is short. */
    <div
      ref={cardRef}
      /* 420 rather than 380: each figure now carries a disc and each filing an
         icon and a date column, and at the old width "New completions" was
         cut to "New completio…" — the label being the only part of a figure
         that says which figure it is. Still narrow enough to leave the map
         readable beside it. */
      /* The ceiling is measured from the viewport, not from the parent: a
         percentage max-height needs a parent with a height of its own, and
         where it does not have one the rule is dropped and the card grows past
         the bottom of the map with the email settings open. */
      className={`mv-thin-scroll pointer-events-auto z-30 flex max-h-[calc(100dvh-136px)] w-[min(420px,calc(100vw-24px))] flex-col overflow-y-auto rounded-xl border border-mv-line bg-white shadow-mv-lg ${className}`}
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

        {/* ---------------- radius ----------------
            The chosen one carries a notch pointing at the block below it: the
            figures are the answer to which button is pressed, and nothing else
            on the card said so. */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          {NEARBY_RADII.map((miles) => (
            <button
              key={miles}
              type="button"
              aria-pressed={miles === radiusMiles}
              onClick={() => onRadiusChange(miles)}
              className={`relative cursor-pointer rounded-lg border py-[9px] text-[11px] lg:text-[12.5px] font-semibold transition-colors ${
                miles === radiusMiles
                  ? "border-mv-green-deep bg-mv-green-deep text-white"
                  : "border-mv-line bg-white text-mv-slate hover:border-mv-green-deep hover:text-mv-green-deep"
              }`}
            >
              {miles} mi
              {miles === radiusMiles && (
                <span
                  aria-hidden="true"
                  className="absolute -bottom-[4px] left-1/2 h-[8px] w-[8px] -translate-x-1/2 rotate-45 bg-mv-green-deep"
                />
              )}
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
          <div className="relative">
            {/* The ring's own figures, and the wait for the next ring. The
                blur is the summary panel's: every number here belongs to a
                distance, and showing the old ones under a new distance is
                worse than showing none. */}
            <div
              aria-busy={stale}
              className={
                stale ? "pointer-events-none select-none blur-[2px]" : ""
              }
            >
              {/* Four readings about one circle, in one bordered block with
                  its own seams — two rows of two, because in a row of four at
                  this card's width every label truncates.

                  Each carries a marked disc and a line saying what it is
                  counted over. Two of the four are counted over a window and
                  two are not, and nothing in a bare label and a number said
                  which was which. */}
              {/* No `overflow-hidden`, which is what used to keep four
                  square cells inside a rounded border: it also sliced the
                  hint opening from the bottom row. Each corner cell rounds
                  its own corner instead — the same shape, and the hints get
                  out. */}
              <div className="mt-[14px] grid grid-cols-2 rounded-xl border border-mv-line">
                <Stat
                  icon={FileText}
                  disc="bg-mv-mint text-mv-green-deep"
                  label="New permits"
                  caption={`Last ${data.meta.windowMonths} months`}
                  edges="rounded-tl-xl border-b border-r border-mv-line"
                  hint={`Permits the Commission recorded inside this circle, counted over the last ${data.meta.windowMonths} months. A permit is leave to drill, so this counts intentions rather than wells.`}
                  value={stats.newPermits.toLocaleString("en-US")}
                  tone={hasPermits ? "amber" : "muted-amber"}
                />
                <Stat
                  icon={CircleCheckBig}
                  disc="bg-mv-mint text-mv-green-deep"
                  label="New completions"
                  caption={`Last ${data.meta.windowMonths} months`}
                  edges="rounded-tr-xl border-b border-mv-line"
                  side="right"
                  hint={`Completions the Commission recorded inside this circle, counted over the same ${data.meta.windowMonths} months. A completion is a well finished and brought online, so this counts wells that exist.`}
                  value={stats.newCompletions.toLocaleString("en-US")}
                  tone={hasCompletions ? "green" : "ink"}
                />
                <Stat
                  icon={Flame}
                  disc="bg-mv-blue-bg text-mv-blue"
                  label="Wells"
                  caption="Within radius"
                  edges="rounded-bl-xl border-r border-mv-line"
                  hint="Every well the Commission holds within the radius of this point, counted whatever its age — not only the ones in the window above."
                  value={stats.nearbyWells.toLocaleString("en-US")}
                />
                <Stat
                  icon={Crosshair}
                  disc="bg-[#efeafc] text-mv-art-violet-deep"
                  label="Nearest bore"
                  caption="Distance"
                  edges="rounded-br-xl"
                  side="right"
                  hint="The distance to the nearest bore in range: every well inside the circle is measured from this lease and the smallest of those distances is reported. Under a tenth of a mile it is given in feet."
                  value={bore(stats.closestWellMiles)}
                />
              </div>

              {/* Nothing filed, said out loud.
                  Two zeroes and a gap where the filings usually are reads as a
                  card that failed to finish loading. It is an answer — quite
                  often the answer a mineral owner wants — so it is written
                  down, with the next distance to try where there is a wider
                  one to try. */}
              {filings.length === 0 && !emailOpen && (
                <div className="mt-3 rounded-lg border border-mv-line bg-[#fafbfa] px-3 py-[11px] text-center">
                  <p className="text-[11.5px] lg:text-[12.5px] font-bold leading-none text-mv-ink">
                    Nothing filed in this circle
                  </p>
                  <p className="mx-auto mt-[6px] max-w-[42ch] text-[11px] lg:text-[12px] leading-snug text-mv-slate">
                    No permits or completions were recorded within{" "}
                    {radiusMiles} {radiusMiles === 1 ? "mile" : "miles"} of this
                    lease in the last {data.meta.windowMonths} months.
                    {radiusMiles < 5 ? " Try a wider distance." : ""}
                  </p>
                </div>
              )}

              {/* ---------------- what actually happened ----------------
                The counts above say how much; these say what. Each row is one
                filing as the service returned it — what it was, whose lease, how
                far off and in which direction, and the date it carries.

                It stands down while the watch settings are open. The card is
                only so tall, and a reader setting up a watch is done reading
                the filings — the settings take the room rather than opening
                below a list that has to be scrolled past to reach them. */}
              {filings.length > 0 && !emailOpen && (
                <div className="mt-3 border-t border-mv-line pt-3">
                  {/* The count on the right rather than "View all": this list
                      is already every filing the service returned, so there is
                      nowhere for such a link to go. */}
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="text-[9px] lg:text-[9.5px] font-extrabold uppercase leading-none tracking-[.08em] text-mv-muted">
                      Recent filings
                    </h3>
                    <span className="text-[10px] lg:text-[10.5px] tabular-nums leading-none text-mv-muted">
                      {filings.length} in all
                    </span>
                  </div>

                  {/* Three rows, then it scrolls within itself.
                      A three-mile ring can return a dozen filings, and letting
                      them all stack pushed Download and the email settings off
                      the bottom of the card — the list is the part worth
                      scrolling, not the whole card. */}
                  {/* Black bar, as under the permit table: here it is the only
                      thing saying there are more filings below the third. The
                      pale one the dropdowns use was invisible against white. */}
                  <ol className="mv-thin-scroll mv-scroll-dark mt-[8px] flex max-h-[228px] flex-col gap-2 overflow-y-auto pr-1">
                    {filings.map((filing) => {
                      const isPermit = /permit/i.test(filing.type);

                      return (
                        <li
                          key={`${filing.api}-${filing.date}-${filing.type}`}
                          className="flex items-start gap-[10px] rounded-lg border border-mv-line bg-white px-[10px] py-[9px]"
                        >
                          <span
                            aria-hidden="true"
                            className={`mt-[1px] grid h-[26px] w-[26px] shrink-0 place-items-center rounded-lg ${
                              isPermit
                                ? "bg-mv-amber-bg text-mv-amber"
                                : "bg-mv-mint text-mv-green-deep"
                            }`}
                          >
                            <FileText size={13} strokeWidth={2} />
                          </span>

                          {/* The name takes the whole first line; the badge
                              sits under it beside the operator. Sharing the
                              line left "GOLDSMITH, C. A., ETAL 3H" truncating
                              to "GOLDSMITH, C. A., E…", and the lease is the
                              one thing on the row nobody can guess from the
                              rest. */}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[11px] lg:text-[12px] font-bold text-mv-ink">
                              {filing.leaseName} {filing.well}
                            </span>
                            <span className="mt-[5px] flex items-baseline gap-2 text-[10px] lg:text-[10.5px] text-mv-muted">
                              <span
                                className={`shrink-0 rounded px-[5px] py-[3px] text-[8.5px] font-extrabold uppercase leading-none tracking-[.06em] ${
                                  isPermit
                                    ? "bg-mv-amber-bg text-mv-amber"
                                    : "bg-mv-mint text-mv-green-deep"
                                }`}
                              >
                                {filing.type}
                              </span>
                              <span className="min-w-0 flex-1 truncate">
                                {filing.operator}
                              </span>
                            </span>
                          </span>

                          {/* When it was filed, and how far off it is — the
                              two things about a filing that are not on the
                              rest of the row. */}
                          <span className="shrink-0 text-right">
                            <span className="flex items-center justify-end gap-[4px] text-[10px] lg:text-[10.5px] tabular-nums text-mv-slate">
                              <CalendarDays
                                size={11}
                                strokeWidth={2}
                                aria-hidden="true"
                                className="text-mv-muted"
                              />
                              {filing.date ?? "—"}
                            </span>
                            <span className="mt-[5px] block text-[10px] lg:text-[10.5px] tabular-nums text-mv-muted">
                              {filing.distanceMiles === null
                                ? "—"
                                : `${filing.distanceMiles.toFixed(1)} mi`}
                              {filing.bearing ? ` ${filing.bearing}` : ""}
                            </span>
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              )}
            </div>

            {stale && (
              <div className="absolute inset-0 grid place-items-center">
                <span className="flex items-center gap-[9px] rounded-lg border border-mv-line bg-white px-[13px] py-[9px] text-[11px] lg:text-[12.5px] font-semibold leading-none text-mv-slate shadow-mv">
                  <span
                    aria-hidden="true"
                    className="h-[14px] w-[14px] shrink-0 animate-spin rounded-full border-2 border-mv-line border-t-mv-green-deep"
                  />
                  Reading the {radiusMiles}-mile ring…
                </span>
              </div>
            )}
          </div>
        )}

        {/* The filings themselves, since those are what the service returns
            row by row — the well count is a total, not a list. Down with the
            list while the settings are open: it is that list's button. */}
        {!emailOpen && (
          <button
            type="button"
            /* The filings under it are the previous ring's until the new
               one lands, and a download of those under a distance nobody
               asked for is the wrong file. */
            onClick={filings.length > 0 && !stale ? onDownload : undefined}
            disabled={filings.length === 0 || stale}
            className={`mt-3 flex w-full items-center justify-center gap-2 rounded-lg py-[10px] text-[11.5px] lg:text-[13px] font-semibold ${
              filings.length > 0 && !stale
                ? "cursor-pointer bg-mv-green-deep text-white hover:brightness-105"
                : "cursor-not-allowed bg-[#f1f2f4] text-mv-muted"
            }`}
          >
            <Download size={14} aria-hidden="true" />
            {filings.length > 0
              ? `Download these ${filings.length} filing${filings.length === 1 ? "" : "s"}`
              : "Nothing new to download"}
          </button>
        )}

        <button
          type="button"
          onClick={() => setEmailOpen((open) => !open)}
          aria-expanded={emailOpen}
          className="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-mv-line py-[10px] text-[11.5px] lg:text-[13px] font-bold text-mv-green-deep hover:bg-[#f2f8f5]"
        >
          <Mail size={14} aria-hidden="true" />
          {emailOpen ? "Hide email settings" : "Email me when this changes"}
        </button>

        {emailOpen && (
          <EmailSettings
            /* The lease is what is watched, so a click that never traced to
               one has nothing to save. */
            lease={lease?.key ?? null}
            radiusMiles={radiusMiles}
            onSaved={() => setEmailOpen(false)}
          />
        )}
      </div>
    </div>
  );
}

/*
 * The distance to the closest bore, in a unit that says something.
 *
 * A mile to one decimal made every close well "0.0 mi", which reads as a
 * broken figure rather than as a well nearer than the unit can express — and
 * on a lease with wells on it, that is the common case. Under a tenth of a
 * mile it is reported in feet, where the difference between 90 and 400 is the
 * difference between the well being on you and being next door.
 */
function bore(miles: number | null): string {
  if (miles === null) return "—";
  /* Zero is not a distance. The ring is measured from the lease, so a bore at
     nought miles is one that crosses the lease itself — which is worth saying
     in words rather than reporting as "0 ft". */
  if (miles <= 0) return "On the lease";
  if (miles < 0.1)
    return `${Math.round(miles * 5280).toLocaleString("en-US")} ft`;
  return `${miles.toFixed(1)} mi`;
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
  icon: Icon,
  disc,
  label,
  value,
  caption,
  hint,
  edges,
  side,
  tone = "ink",
}: {
  icon: LucideIcon;
  /** The disc's own fill and mark, which say which kind of figure this is. */
  disc: string;
  label: string;
  value: string;
  /** What the figure is counted over — a window, the radius, or nothing. */
  caption: string;
  /** What the i beside the label says. */
  hint: string;
  /** The seams this cell draws, which are the block's dividers. */
  edges: string;
  /** Which way its hint opens; right for the right-hand column. */
  side?: "left" | "right";
  tone?: "ink" | "amber" | "muted-amber" | "green";
}) {
  return (
    <div className={`flex items-start gap-[10px] bg-white p-3 ${edges}`}>
      <span
        aria-hidden="true"
        className={`mt-[1px] grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full ${disc}`}
      >
        <Icon size={15} strokeWidth={2} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-[5px] text-[8px] lg:text-[9.5px] font-extrabold uppercase leading-none tracking-[.08em] text-mv-muted">
          <span className="truncate">{label}</span>
          <Hint text={hint} side={side} />
        </div>
        {/* The qualifier beside the figure rather than under it: "0" and
            "last 3 months" are one reading, and on its own line the caption
            read as a third fact about the cell. */}
        <div className="mt-[6px] flex items-baseline gap-[6px]">
          <span
            className={`shrink-0 text-[15.5px] lg:text-[17px] font-bold leading-none tabular-nums ${
              tone === "ink"
                ? "text-mv-ink"
                : tone === "green"
                  ? "text-mv-green-deep"
                  : "text-mv-amber"
            } ${tone === "muted-amber" ? "opacity-70" : ""}`}
          >
            {value}
          </span>
          <span className="min-w-0 truncate text-[9.5px] lg:text-[10.5px] leading-none text-mv-muted">
            ({caption})
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Stage three: the watch itself, sent to `POST /api/v1/watches`.
 *
 * The lease key and the distance come from the card above — they are what is
 * being watched — and the two switches and the address are what this form is
 * for.
 */
function EmailSettings({
  lease,
  radiusMiles,
  onSaved,
}: {
  /** The lease's key, or null while the click has not been traced to one. */
  lease: string | null;
  radiusMiles: number;
  onSaved: () => void;
}) {
  /* Neither ticked to begin with. A watch is a standing instruction to write
     to somebody, and the one it sends should be the one they chose rather than
     the one that was already chosen for them. Until one is ticked the note
     under the form says so and Save stays shut. */
  const [onPermit, setOnPermit] = useState(false);
  const [onProducing, setOnProducing] = useState(false);
  const [email, setEmail] = useState("");
  /*
   * Where the request has got to. Four states rather than a pair of flags:
   * "sending" and "sent" have to look different, and a refusal has to say
   * what it was.
   */
  const [state, setState] = useState<
    { kind: "idle" } | { kind: "saving" } | { kind: "saved" } | { kind: "problem"; message: string }
  >({ kind: "idle" });
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  /*
   * Opened, and shown.
   *
   * These settings unfold at the foot of a card that is often already as tall
   * as the map allows, so pressing the button put them below the fold and
   * looked like it had done nothing. `nearest` scrolls by as little as it
   * takes — the card if the card can scroll, and no further.
   */
  useEffect(() => {
    boxRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );

  /* Nothing to send without these, and each is worth saying rather than a
     button that simply does not respond. */
  const address = email.trim();
  const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address);
  const watchesSomething = onPermit || onProducing;
  const ready = lease !== null && looksLikeEmail && watchesSomething;

  /**
   * Send it, then confirm, then fold the section away. The pause before
   * closing is the point — collapsing on the same tick would swallow the only
   * acknowledgement the reader gets, leaving them unsure it registered.
   */
  function save() {
    if (!ready || state.kind === "saving") return;

    setState({ kind: "saving" });

    saveLeaseWatch({
      lease: lease,
      radius: radiusMiles,
      notifyNewPermit: onPermit,
      notifyNewCompletion: onProducing,
      email: address,
    })
      .then(() => {
        setState({ kind: "saved" });
        if (closeTimer.current) clearTimeout(closeTimer.current);
        closeTimer.current = setTimeout(onSaved, 1200);
      })
      .catch((failure: unknown) => {
        setState({
          kind: "problem",
          message:
            failure instanceof Error
              ? failure.message
              : "Could not save this watch.",
        });
      });
  }

  return (
    <div ref={boxRef} className="mt-3 border-t border-mv-line pt-3">
      {/* Named for the two figures in the block above rather than described
          in other words: the watch fires on what those count, and a reader
          who has just read them should not have to work out that "someone
          gets a permit to drill" is the first of them. */}
      <Toggle checked={onPermit} onChange={setOnPermit}>
        New permit activity inside this circle
      </Toggle>
      <Toggle checked={onProducing} onChange={setOnProducing}>
        New well completion inside this circle
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
            /* Editing the address makes the last answer stale, whichever it
               was. */
            setState({ kind: "idle" });
          }}
          placeholder="you@example.com"
          className="min-w-0 flex-1 rounded-lg border border-mv-line px-3 py-[8px] text-[11px] lg:text-[12.5px] leading-tight text-mv-ink outline-none focus:border-mv-green-deep placeholder:text-mv-muted"
        />
        <button
          type="button"
          onClick={save}
          disabled={!ready || state.kind === "saving"}
          className="flex shrink-0 items-center gap-[7px] rounded-lg bg-mv-green-deep px-[14px] py-[9px] text-[11px] lg:text-[12.5px] font-semibold leading-tight text-white enabled:cursor-pointer enabled:hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {state.kind === "saving" && (
            <span
              aria-hidden="true"
              className="h-[12px] w-[12px] shrink-0 animate-spin rounded-full border-2 border-white/40 border-t-white"
            />
          )}
          {state.kind === "saving"
            ? "Saving…"
            : state.kind === "saved"
              ? "Saved"
              : "Save watch"}
        </button>
      </div>

      {state.kind === "problem" && (
        <p
          role="alert"
          className="mt-[8px] rounded-lg border border-[#f6c9c6] bg-mv-red-bg px-3 py-[8px] text-[10.5px] lg:text-[11.5px] leading-snug text-mv-red"
        >
          {state.message}
        </p>
      )}

      <p className="mt-[10px] text-[10px] lg:text-[11.5px] leading-snug text-mv-muted">
        {lease === null
          ? "This point has not been traced to a lease, so there is nothing to watch yet."
          : !watchesSomething
            ? "Choose at least one thing to watch for."
            : `The watch is kept against lease ${lease} at ${radiusMiles} ${
                radiusMiles === 1 ? "mile" : "miles"
              }. One email when something is filed inside it.`}
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

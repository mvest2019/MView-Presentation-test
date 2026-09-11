"use client";

import { useState } from "react";

import type { ScoredOwner } from "@/lib/claim-search/types";

import { fmt, propCount, type WorkingRow } from "../_lib/working-set";
import {
  btnMint,
  btnPrimary,
  ClearableInput,
  EmptyState,
  InlineSpinner,
  OwnerRowsSkeleton,
  PersonIcon,
  LockedValue,
  refineInput,
  tableHead,
} from "./ui";

/**
 * Right panel — the owner records table. Ticking a row (checkbox or the row
 * itself) opens the "Is this you?" popup for that record; ticking again
 * unticks directly. The Claim button starts the single-record claim flow.
 */
export function OwnerTable({
  searched,
  signedIn,
  busyLabel,
  pendingOwnerKey,
  claiming,
  W,
  universeCount,
  corr,
  selO,
  nameQ,
  anyLeaseTicked,
  selLeaseCount,
  refine,
  onRefine,
  onTickOwner,
  onClaim,
  onClearTicks,
  onClaimSelected,
  onViewLeaseDetails,
}: {
  searched: boolean;
  /** Signed-out visitors get the address and value gated behind sign-up. */
  signedIn: boolean;
  /** Set while an API call is in flight — overlays the table with a loader. */
  busyLabel: string | null;
  /** The owner whose same-name lookup is running — its row shows a spinner. */
  pendingOwnerKey: string | null;
  /** True while a claim is being filed — the Claim buttons say so. */
  claiming: boolean;
  W: WorkingRow[];
  universeCount: number;
  corr: Record<string, string>;
  selO: Record<string, boolean>;
  nameQ: string;
  anyLeaseTicked: boolean;
  selLeaseCount: number;
  refine: string;
  onRefine: (v: string) => void;
  onTickOwner: (key: string) => void;
  onClaim: (o: ScoredOwner) => void;
  onClearTicks: () => void;
  onClaimSelected: () => void;
  onViewLeaseDetails: () => void;
}) {
  /**
   * PHONES SHOW A PAGE AT A TIME (2026-08-25). Uncapped, 56 result cards made
   * an 11,800px page — an unreadable scroll. Twenty fills a couple of screens
   * and "Show more" adds twenty at a time. The desktop table is unaffected:
   * it has its own scroll box.
   */
  const MOBILE_PAGE = 20;
  const [mobileLimit, setMobileLimit] = useState(MOBILE_PAGE);
  const mobileRows = W.slice(0, mobileLimit);
  const mobileHidden = W.length - mobileRows.length;

  /**
   * DESKTOP PAGES TOO (2026-09-11). A county like Midland answers with the
   * full 500-row cap, and 500 rows in a 560px scroll box is a scrollbar a few
   * pixels tall inside a page that also scrolls — there was no way to tell
   * where in the results you were or to reach a row near the end. Fifty is
   * about two screens of table.
   */
  const PAGE = 50;
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(W.length / PAGE));
  // Clamped rather than reset in an effect: the working set changes on every
  // filter keystroke, and an effect would render one frame of an empty page
  // each time before correcting itself.
  const safePage = Math.min(page, pageCount - 1);
  const from = safePage * PAGE;
  const rows = W.slice(from, from + PAGE);

  const anyOwnerTicked = Object.keys(selO).some((k) => selO[k]);
  const selCount = Object.keys(selO).filter((k) => selO[k]).length;
  return (
    <div className="flex w-full flex-col rounded-mv border border-mv-line bg-mv-card px-[18px] py-[18px] shadow-mv">
      <div className="flex items-baseline justify-between gap-3">
        <h4 className="flex items-center gap-[7px] text-[14.5px] font-bold [&_svg]:flex-none [&_svg]:text-mv-green-deep">
          <PersonIcon size={14} stroke={2.4} />
          <span>Owner records</span>
        </h4>
        {anyOwnerTicked && (
          <button
            type="button"
            onClick={onClearTicks}
            className="cursor-pointer pb-[6px] text-xs font-bold text-mv-green-deep hover:underline"
          >
            clear owner ticks
          </button>
        )}
      </div>
      <div className="mb-2 mt-[6px]">
        <ClearableInput
          className={refineInput}
          label="owner refine"
          placeholder="Refine owners — name, street, city, ZIP, or county"
          aria-label="Refine owner results"
          value={refine}
          onChange={onRefine}
        />
      </div>
      <p className="mb-[6px] text-xs text-mv-muted">
        {busyLabel
          ? busyLabel
          : searched &&
            `showing ${W.length} of ${universeCount} owner${universeCount === 1 ? "" : "s"}` +
              (anyLeaseTicked
                ? nameQ
                  ? ` — owners of the ticked lease still matching “${nameQ}”`
                  : ` — every owner of the ticked lease${selLeaseCount === 1 ? "" : "s"}`
                : "")}
      </p>
      <div className="relative mt-[2px] flex min-h-[120px] flex-1 flex-col">
        {/* PHONES GET CARDS, NOT A GRID (2026-08-25): six columns at 640px
            minimum meant sideways scrolling to reach Appraised and Claim on a
            375px screen. The table is unchanged above 768px. */}
        <div className="max-h-[560px] flex-1 overflow-auto rounded-xl border border-mv-line max-[767px]:hidden">
          <table className="w-full min-w-[640px] border-collapse text-[12.5px]">
          <thead>
            {/* EVERY COLUMN IS NAMED (2026-09-11). The first and last headers
                were empty strings, so the two columns the page is actually
                for — the tick that selects a record and the button that
                claims it — were the only ones with nothing above them. */}
            <tr>
              {[
                ["Select", "w-[54px]"],
                ["Owner", ""],
                ["Mailing address", ""],
                ["Props", "!text-right"],
                ["Appraised", "!text-right"],
                ["Claim", "w-[90px]"],
              ].map(([h, extra]) => (
                <th key={h} className={`${tableHead} ${extra}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {busyLabel ? (
              <OwnerRowsSkeleton label={busyLabel} />
            ) : !searched || W.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  {searched ? (
                    <div className="px-4 py-[26px] text-center text-[13px] text-mv-muted">
                      No owner matches these filters. Clear a filter or loosen the
                      name.
                    </div>
                  ) : (
                    <EmptyState>
                      Type a name, a lease word, or pick a county — then Search.
                    </EmptyState>
                  )}
                </td>
              </tr>
            ) : (
              rows.map((w) => {
                const r = w.o.r;
                const shown = corr[w.key] ?? ((r[4] as string) || "");
                const on = !!selO[w.key];
                return (
                  <tr
                    key={w.key}
                    onClick={() => onTickOwner(w.key)}
                    className={`group cursor-pointer align-top transition-colors ${on ? "bg-mv-tint" : "odd:bg-white even:bg-mv-row-hover hover:bg-mv-hover"}`}
                  >
                    <td className="border-b border-mv-line-soft px-[15px] py-[12px]">
                      {pendingOwnerKey === w.key ? (
                        <InlineSpinner />
                      ) : (
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => onTickOwner(w.key)}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Select ${r[0]}`}
                          className="h-[15px] w-[15px] cursor-pointer accent-mv-green-deep"
                        />
                      )}
                    </td>
                    <td className="border-b border-mv-line-soft px-[15px] py-[12px]">
                      <div className="font-extrabold text-mv-ink">{r[0]}</div>
                      <div className="text-[11px] text-mv-muted">
                        {w.o.county} County
                      </div>
                    </td>
                    <td
                      className="max-w-[230px] border-b border-mv-line-soft px-[15px] py-[12px] font-light text-mv-slate"
                      title={shown}
                    >
                      {!signedIn ? (
                        <LockedValue what="mailing address" width="w-[120px]" />
                      ) : shown ? (
                        <>
                          ✉ {shown}
                          {corr[w.key] && (
                            <span className="ml-[6px] rounded-md border border-mv-line bg-mv-hover px-[7px] py-[1.5px] align-middle text-[10px] font-semibold text-mv-slate">
                              updated
                            </span>
                          )}
                        </>
                      ) : (
                        /* "N/A", not an em dash: the roll genuinely holds no
                           mailing address for this record, and a dash read as
                           the page having failed to load one. */
                        <span className="text-[11px] text-mv-muted">N/A</span>
                      )}
                    </td>
                    <td className="border-b border-mv-line-soft px-[15px] py-[12px] text-right tabular-nums">
                      {/* Counted off the record's own lease list — see
                          `propCount`; the served figure disagreed with the
                          lease panel beside it. */}
                      {propCount(w.o)}
                    </td>
                    <td className="whitespace-nowrap border-b border-mv-line-soft px-[15px] py-[12px] text-right font-bold tabular-nums text-mv-green-deep">
                      {signedIn ? (
                        fmt(r[2])
                      ) : (
                        <span className="inline-flex justify-end">
                          <LockedValue what="appraised value" width="w-[62px]" />
                        </span>
                      )}
                    </td>
                    <td className="border-b border-mv-line-soft px-[15px] py-[12px]">
                      {/* CLAIMING IS VISIBLY IN PROGRESS (2026-09-11). The
                          call takes four or five seconds and the page used to
                          sit dead still for all of them before redirecting,
                          so nobody could tell the button had registered — or
                          whether to press it again. */}
                      <button
                        type="button"
                        disabled={claiming}
                        onClick={(e) => {
                          e.stopPropagation();
                          onClaim(w.o);
                        }}
                        className="inline-flex cursor-pointer items-center gap-[6px] whitespace-nowrap rounded-lg border-[1.5px] border-mv-line bg-white px-[13px] py-[6px] text-[11.5px] font-bold text-mv-green-deep transition-colors hover:border-mv-green-deep hover:bg-mv-green-deep hover:text-white disabled:cursor-wait disabled:opacity-60 disabled:hover:border-mv-line disabled:hover:bg-white disabled:hover:text-mv-green-deep"
                      >
                        {claiming && <InlineSpinner />}
                        {claiming ? "Filing…" : "Claim"}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          </table>
        </div>

        {/* The pager sits OUTSIDE the scroll box, so it stays put while the
            rows scroll under it. Hidden with one page of results — a pager
            for a single page is furniture. */}
        {!busyLabel && searched && W.length > PAGE && (
          <div className="mt-2 flex flex-wrap items-center gap-2 max-[767px]:hidden">
            <span className="text-[11.5px] text-mv-muted">
              Showing <b className="text-mv-slate">{from + 1}</b>–
              <b className="text-mv-slate">{Math.min(from + PAGE, W.length)}</b>{" "}
              of {W.length}
            </span>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage(safePage - 1)}
                disabled={safePage === 0}
                className="min-h-[32px] cursor-pointer rounded-lg border border-mv-line bg-white px-3 text-[12.5px] font-semibold text-mv-green-deep transition-colors hover:bg-mv-hover disabled:cursor-default disabled:text-mv-muted disabled:hover:bg-white"
              >
                ← Prev
              </button>
              <span className="text-[12px] tabular-nums text-mv-slate">
                {safePage + 1} / {pageCount}
              </span>
              <button
                type="button"
                onClick={() => setPage(safePage + 1)}
                disabled={safePage >= pageCount - 1}
                className="min-h-[32px] cursor-pointer rounded-lg border border-mv-line bg-white px-3 text-[12.5px] font-semibold text-mv-green-deep transition-colors hover:bg-mv-hover disabled:cursor-default disabled:text-mv-muted disabled:hover:bg-white"
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* ---- the same working set as stacked cards, phones only ---- */}
        <div className="hidden flex-1 max-[767px]:block">
          {busyLabel ? (
            <div role="status" className="space-y-2">
              <span className="sr-only">{busyLabel}</span>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="rounded-xl border border-mv-line bg-white p-3"
                >
                  <span className="block h-[13px] w-3/5 animate-pulse rounded bg-mv-line-soft" />
                  <span className="mt-[9px] block h-[10px] w-2/5 animate-pulse rounded bg-mv-line-soft" />
                  <span className="mt-[14px] block h-[11px] w-4/5 animate-pulse rounded bg-mv-line-soft" />
                </div>
              ))}
            </div>
          ) : !searched || W.length === 0 ? (
            <div className="rounded-xl border border-mv-line bg-white">
              {searched ? (
                <div className="px-4 py-[26px] text-center text-[13px] text-mv-muted">
                  No owner matches these filters. Clear a filter or loosen the
                  name.
                </div>
              ) : (
                <EmptyState>
                  Type a name, a lease word, or pick a county.
                </EmptyState>
              )}
            </div>
          ) : (
            /* The claim bar is `sticky bottom-3` and floats over whatever is
               under it; without this the last card sat beneath it and could
               not be read or tapped. The padding only exists while the bar
               does. */
            <ul className={`space-y-2 ${selCount > 0 ? "pb-[92px]" : ""}`}>
              {mobileRows.map((w) => {
                const r = w.o.r;
                const shown = corr[w.key] ?? ((r[4] as string) || "");
                const on = !!selO[w.key];
                return (
                  <li
                    key={w.key}
                    onClick={() => onTickOwner(w.key)}
                    className={`cursor-pointer rounded-xl border p-3 transition-colors ${
                      on
                        ? "border-mv-green bg-mv-tint"
                        : "border-mv-line bg-white"
                    }`}
                  >
                    <div className="flex items-start gap-[10px]">
                      {pendingOwnerKey === w.key ? (
                        <span className="mt-[3px]">
                          <InlineSpinner />
                        </span>
                      ) : (
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => onTickOwner(w.key)}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Select ${r[0]}`}
                          className="mt-[3px] h-[17px] w-[17px] flex-none cursor-pointer accent-mv-green-deep"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-[14px] font-bold leading-[1.3] text-mv-ink">
                          {r[0]}
                        </div>
                        <div className="mt-[1px] text-[11.5px] text-mv-muted">
                          {w.o.county} County · {propCount(w.o)} propert
                          {propCount(w.o) === 1 ? "y" : "ies"}
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={claiming}
                        onClick={(e) => {
                          e.stopPropagation();
                          onClaim(w.o);
                        }}
                        className="inline-flex min-h-[34px] flex-none cursor-pointer items-center gap-[6px] whitespace-nowrap rounded-lg border border-mv-line-strong bg-white px-3 text-[12px] font-bold text-mv-green-deep hover:border-mv-ink hover:bg-mv-ink hover:text-white disabled:cursor-wait disabled:opacity-60"
                      >
                        {claiming && <InlineSpinner />}
                        {claiming ? "Filing…" : "Claim"}
                      </button>
                    </div>
                    {/* Label the two gated fields explicitly: without the
                        table's header row a bare value has no name. */}
                    <dl className="mt-[10px] space-y-[6px] border-t border-mv-line-soft pt-[10px] text-[12px]">
                      <div className="flex items-start justify-between gap-3">
                        <dt className="flex-none text-mv-muted">Mailing</dt>
                        <dd className="min-w-0 text-right text-mv-slate">
                          {!signedIn ? (
                            <LockedValue
                              what="mailing address"
                              width="w-[110px]"
                            />
                          ) : shown ? (
                            shown
                          ) : (
                            "N/A"
                          )}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <dt className="flex-none text-mv-muted">Appraised</dt>
                        <dd className="font-bold tabular-nums text-mv-green-deep">
                          {signedIn ? (
                            fmt(r[2])
                          ) : (
                            <LockedValue
                              what="appraised value"
                              width="w-[62px]"
                            />
                          )}
                        </dd>
                      </div>
                    </dl>
                  </li>
                );
              })}
              {mobileHidden > 0 && (
                <li>
                  <button
                    type="button"
                    onClick={() => setMobileLimit((n) => n + MOBILE_PAGE)}
                    className="min-h-[44px] w-full cursor-pointer rounded-xl border border-mv-line-strong bg-white text-[13px] font-semibold text-mv-green-deep"
                  >
                    Show {Math.min(mobileHidden, MOBILE_PAGE)} more ·{" "}
                    {mobileHidden} left
                  </button>
                </li>
              )}
            </ul>
          )}
        </div>
      </div>
      {selCount > 0 && (
        /* STICKY (2026-08-25): the bar lives under a table that is often
           taller than the viewport, so ticking rows near its top left the
           claim action out of sight. `sticky bottom-3` pins it to the bottom
           of the screen while the panel is in view — it floats over the last
           table rows (hence the shadow and solid ground) and settles into its
           natural slot once the visitor scrolls past the panel. */
        <div className="sticky bottom-3 z-10 mt-[10px] flex flex-wrap items-center gap-[10px] rounded-[11px] border border-mv-line border-l-4 border-l-mv-green-deep bg-white px-3 py-2 shadow-mv-lg">
          <span className="text-[12.5px] font-semibold text-mv-slate">
            {selCount} record{selCount === 1 ? "" : "s"} ticked
            {selCount > 1 && " — claim them together as one owner"}
          </span>
          {/* The ticked records' leases in the portal's table shape — a look
              BEFORE claiming. It leads and the claim anchors the FAR RIGHT
              (2026-08-25): reading order ends on the bar's one primary
              action, in the site-wide CTA position. */}
          <button
            type="button"
            onClick={onViewLeaseDetails}
            className={`${btnMint} ml-auto max-[560px]:ml-0 max-[560px]:w-full`}
          >
            View Lease Details
          </button>
          <button
            type="button"
            disabled={claiming}
            onClick={onClaimSelected}
            className={`${btnPrimary} max-[560px]:w-full disabled:cursor-wait disabled:opacity-70`}
          >
            {claiming && <InlineSpinner />}
            {claiming
              ? "Filing your claim…"
              : selCount === 1
                ? "Claim This Record →"
                : `Claim ${selCount} Records Together →`}
          </button>
        </div>
      )}
      <p className="mt-auto pt-[10px] text-[11px] text-mv-muted">
        Tick owners to see just their leases · tick several records that are all
        you, then claim them together. Addresses may be outdated — they never
        block a claim.
      </p>
    </div>
  );
}

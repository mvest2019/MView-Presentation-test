"use client";

import type { ScoredOwner } from "@/lib/claim-search/types";

import { fmt, type WorkingRow } from "../_lib/working-set";
import {
  btnMint,
  btnPrimary,
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
      <input
        className={`${refineInput} mb-2 mt-[6px]`}
        placeholder="Refine owners — name, street, city, ZIP, or county"
        aria-label="Refine owner results"
        value={refine}
        onChange={(e) => onRefine(e.target.value)}
      />
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
        <div className="max-h-[560px] flex-1 overflow-auto rounded-xl border border-mv-line">
          <table className="w-full min-w-[640px] border-collapse text-[12.5px]">
          <thead>
            <tr>
              {["", "Owner", "Mailing address", "Props", "Appraised", ""].map(
                (h, i) => (
                  <th
                    key={i}
                    className={`${tableHead} ${
                      i === 3 || i === 4 ? "!text-right" : ""
                    } ${i === 0 ? "w-[38px]" : ""}`}
                  >
                    {h}
                  </th>
                ),
              )}
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
              W.map((w) => {
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
                        <span className="text-[11px] text-mv-muted">—</span>
                      )}
                    </td>
                    <td className="border-b border-mv-line-soft px-[15px] py-[12px] text-right tabular-nums">
                      {r[1]}
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
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onClaim(w.o);
                        }}
                        className="cursor-pointer whitespace-nowrap rounded-lg border-[1.5px] border-mv-line bg-white px-[13px] py-[6px] text-[11.5px] font-bold text-mv-green-deep transition-colors hover:border-mv-green-deep hover:bg-mv-green-deep hover:text-white"
                      >
                        Claim
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          </table>
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
            className={`${btnMint} ml-auto`}
          >
            View Lease Details
          </button>
          <button
            type="button"
            onClick={onClaimSelected}
            className={btnPrimary}
          >
            {selCount === 1
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

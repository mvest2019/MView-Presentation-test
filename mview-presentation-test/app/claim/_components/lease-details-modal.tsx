"use client";

import { fmt } from "../_lib/working-set";
import { btnGhost, LockedValue, tableHead } from "./ui";

/** One lease of one ticked record — the modal's row grain. */
export interface LeaseDetailRow {
  lease: string;
  /** Parsed from a trailing "(12345)" in the lease name; "—" when absent. */
  leaseNo: string;
  owner: string;
  county: string;
  /** THIS lease's county-appraised value (the API's per-lease figure). */
  value: number;
  /** The API's flag: true = working interest, false = royalty interest. */
  workingInterest: boolean;
}

/**
 * "Lease details" for the ticked records — the PORTAL's lease-table shape
 * (Ryan, 2026-08-25, with a reference screenshot): dark header band, lease
 * name over its "#number", interest type as a pill, value right-aligned and
 * bold. OWNER NAME LEADS — the portal's table spans one owner, this one spans
 * every ticked record, so the owner is the column that groups the rows.
 *
 * Current operator is not served by the owners API yet, so it shows "—" with
 * the footnote saying where it arrives. Interest type is real
 * (`workingInterest`); the value column is the county-appraised figure, which
 * is the only per-lease number the API returns.
 */
export function LeaseDetailsModal({
  rows,
  signedIn,
  onClose,
}: {
  rows: LeaseDetailRow[];
  /** Signed-out visitors see the value column gated behind sign-up. */
  signedIn: boolean;
  onClose: () => void;
}) {
  const td = "border-b border-mv-line-soft px-[15px] py-[13px] align-middle";
  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-mv-ink/50 p-5 backdrop-blur-[2px] max-[560px]:p-0"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Lease details for your ticked records"
        className="flex max-h-[min(84vh,720px)] w-[min(1040px,100%)] flex-col overflow-hidden rounded-mv bg-mv-card shadow-mv-lg max-[560px]:h-full max-[560px]:max-h-none max-[560px]:rounded-none"
      >
        <div className="flex items-start justify-between gap-3 border-b border-mv-line px-[22px] pb-3 pt-[18px]">
          <div>
            <h3 className="mb-[3px] text-[17px] font-bold">Lease details</h3>
            <p className="text-[12.5px] font-light text-mv-muted">
              Every lease on the record{rows.length === 1 ? "" : "s"} you ticked
              — {rows.length} lease{rows.length === 1 ? "" : "s"} in all.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="h-8 w-8 flex-none cursor-pointer rounded-lg border border-mv-line text-[17px] leading-none text-mv-slate hover:bg-mv-bg"
          >
            ×
          </button>
        </div>

        <div className="overflow-auto px-[22px] py-[16px]">
          {/* The rounded frame is the table's own, as in the portal: the head
              band fills the top corners and rows sit flush inside it. */}
          {/* Phones get the same rows as cards — an 860px six-column grid is
              unusable at 375px. */}
          <div className="overflow-hidden rounded-xl border border-mv-line max-[767px]:hidden">
            <table className="w-full min-w-[860px] border-collapse text-[13px]">
              <thead>
                <tr>
                  <th className={tableHead}>Owner Name</th>
                  <th className={tableHead}>Lease Name</th>
                  <th className={tableHead}>County</th>
                  <th className={tableHead}>Current Operator</th>
                  <th className={tableHead}>Interest Type</th>
                  <th className={`${tableHead} !text-right`}>
                    Appraised Value
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="bg-white last:[&>td]:border-b-0">
                    <td className={`${td} font-semibold text-mv-ink`}>
                      {r.owner}
                    </td>
                    <td className={td}>
                      <div className="font-bold text-mv-ink">{r.lease}</div>
                      <div className="mt-[2px] text-[11.5px] text-mv-sublabel">
                        {r.leaseNo === "—" ? "—" : `#${r.leaseNo}`}
                      </div>
                    </td>
                    <td className={`${td} text-mv-slate`}>{r.county}</td>
                    <td className={`${td} text-mv-muted`}>—</td>
                    <td className={td}>
                      <span className="inline-flex whitespace-nowrap rounded-full bg-mv-tint px-[11px] py-[4px] text-[11.5px] font-semibold text-mv-green-ink">
                        {r.workingInterest
                          ? "Working Interest"
                          : "Royalty Interest"}
                      </span>
                    </td>
                    <td
                      className={`${td} whitespace-nowrap text-right font-bold tabular-nums text-mv-ink`}
                    >
                      {signedIn ? (
                        fmt(r.value)
                      ) : (
                        <span className="inline-flex justify-end">
                          <LockedValue what="appraised value" width="w-[62px]" />
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="hidden space-y-2 max-[767px]:block">
            {rows.map((r, i) => (
              <li
                key={i}
                className="rounded-xl border border-mv-line bg-white p-3"
              >
                <div className="text-[13.5px] font-bold text-mv-ink">
                  {r.lease}
                </div>
                <div className="mt-[1px] text-[11.5px] text-mv-sublabel">
                  {r.leaseNo === "—" ? "No lease number" : `#${r.leaseNo}`} ·{" "}
                  {r.county}
                </div>
                <div className="mt-[8px] text-[12.5px] font-semibold text-mv-slate">
                  {r.owner}
                </div>
                <div className="mt-[10px] flex flex-wrap items-center justify-between gap-2 border-t border-mv-line-soft pt-[10px]">
                  <span className="inline-flex whitespace-nowrap rounded-full bg-mv-tint px-[11px] py-[4px] text-[11.5px] font-semibold text-mv-green-ink">
                    {r.workingInterest ? "Working Interest" : "Royalty Interest"}
                  </span>
                  <span className="font-bold tabular-nums text-mv-ink">
                    {signedIn ? (
                      fmt(r.value)
                    ) : (
                      <LockedValue what="appraised value" width="w-[62px]" />
                    )}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-[12px] text-[11px] text-mv-muted">
            Current operator and the decimal interest value arrive with the full
            Lease Report in your account. Interest type and the appraised value
            come from the county roll.
          </p>
        </div>

        {/* Footer reads like a dialog's: the count on the left, ONE clearly
            drawn dismiss on the right. The bare ghost button at the left edge
            read as stray text (Ryan, 2026-08-25). */}
        <div className="flex flex-wrap items-center gap-3 border-t border-mv-line bg-mv-bg px-[22px] py-[14px]">
          <span className="text-[12px] text-mv-muted">
            {rows.length} lease{rows.length === 1 ? "" : "s"} listed
          </span>
          <button
            type="button"
            className={`${btnGhost} ml-auto min-w-[110px] !border-mv-line-strong`}
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

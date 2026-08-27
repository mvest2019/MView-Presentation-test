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
      className="fixed inset-0 z-[120] flex items-center justify-center bg-mv-ink/50 p-5 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Lease details for your ticked records"
        className="flex max-h-[min(84vh,720px)] w-[min(1040px,100%)] flex-col overflow-hidden rounded-mv bg-mv-card shadow-mv-lg"
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
          <div className="overflow-hidden rounded-xl border border-mv-line">
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
          <p className="mt-[12px] text-[11px] text-mv-muted">
            Current operator and the decimal interest value arrive with the full
            Lease Report in your account. Interest type and the appraised value
            come from the county roll.
          </p>
        </div>

        <div className="border-t border-mv-line px-[22px] py-[13px]">
          <button type="button" className={btnGhost} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

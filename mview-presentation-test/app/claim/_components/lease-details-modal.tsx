"use client";

import { fmt } from "../_lib/working-set";
import { btnGhost } from "./ui";

/** One lease of one ticked record — the modal's row grain. */
export interface LeaseDetailRow {
  lease: string;
  /** Parsed from a trailing "(12345)" in the lease name; "—" when absent. */
  leaseNo: string;
  owner: string;
  county: string;
  /** THIS lease's county-appraised value — the MVestimate column's stand-in. */
  value: number;
}

/**
 * "Lease details" for the ticked records — the portal's lease-table look
 * (teal header row, green money column), one row per lease per record.
 *
 * Current operator and play type are not served by the owners API yet; they
 * show as "—" / "Unknown" with the footnote saying where they arrive.
 * MVestimate shows the lease's own county-appraised value (the API's
 * `leaseValues`) as its stand-in until per-lease estimates ship.
 */
export function LeaseDetailsModal({
  rows,
  onClose,
}: {
  rows: LeaseDetailRow[];
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-[rgba(20,30,26,.5)] p-5 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Lease details for your ticked records"
        className="flex max-h-[min(84vh,720px)] w-[min(980px,100%)] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_24px_70px_rgba(15,25,20,.35)]"
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
        <div className="overflow-auto px-[22px] py-[14px]">
          <table className="w-full min-w-[760px] border-collapse text-[12.5px]">
            <thead>
              <tr>
                {[
                  "Lease Name",
                  "Lease No.",
                  "Owner Name",
                  "County",
                  "Current Operator",
                  "Play Type",
                  "MVestimate",
                ].map((h, i) => (
                  <th
                    key={h}
                    className={`sticky top-0 whitespace-nowrap bg-mv-green px-3 py-[10px] text-[12px] font-bold text-white first:rounded-l-lg last:rounded-r-lg ${
                      i === 6 ? "text-right" : "text-left"
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="odd:bg-white even:bg-[#fafcfb]">
                  <td className="border-b border-[#eef2f0] px-3 py-[10px] font-bold text-mv-ink">
                    {r.lease}
                  </td>
                  <td className="border-b border-[#eef2f0] px-3 py-[10px] tabular-nums">
                    {r.leaseNo}
                  </td>
                  <td className="border-b border-[#eef2f0] px-3 py-[10px]">
                    {r.owner}
                  </td>
                  <td className="border-b border-[#eef2f0] px-3 py-[10px]">
                    {r.county}
                  </td>
                  <td className="border-b border-[#eef2f0] px-3 py-[10px] text-mv-muted">
                    —
                  </td>
                  <td className="border-b border-[#eef2f0] px-3 py-[10px]">
                    Unknown
                  </td>
                  <td className="whitespace-nowrap border-b border-[#eef2f0] px-3 py-[10px] text-right font-bold tabular-nums text-mv-green-deep">
                    {fmt(r.value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-[10px] text-[11px] text-mv-muted">
            Current operator and play type arrive with the full Lease Report
            in your account. MVestimate here shows the lease&rsquo;s
            county-appraised value.
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

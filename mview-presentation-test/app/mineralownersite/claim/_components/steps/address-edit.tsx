"use client";

import { Check, Pencil, X } from "lucide-react";
import { useState } from "react";

import { postAddressCorrection } from "../../_api/claim-api";

/**
 * "EDIT" ON ONE ADDRESS ROW → `POST /owners/address-correction`.
 *
 * ── IT REPORTS A CORRECTION, IT DOES NOT REWRITE THE ROLL ──
 *
 * The endpoint files a correction request against the county's record. It does
 * not change the address this claim is filed at, and it cannot: the claim
 * matches on the address the roll currently holds, so silently swapping in the
 * typed one would ask the backend for a doorstep it has never heard of and the
 * owner would come back `OWNER_ADDRESS_NOT_FOUND`. The acknowledgement says
 * "reported", never "updated", for exactly that reason.
 *
 * ── IT LIVES INSIDE A `<label>`, WHICH IS THE WHOLE DIFFICULTY ──
 *
 * The row is a label wrapping a checkbox so that clicking anywhere on it ticks
 * the address. Every click inside — the Edit button, the text field, Save —
 * would therefore toggle that tick as well. So the editor stops the click
 * before the label sees it. Without this, correcting a typo silently unticks
 * the address you were correcting.
 *
 * ── AN INLINE FIELD, NOT `window.prompt` ──
 *
 * The first version of this was a prompt box. A prompt cannot show the row it
 * belongs to, cannot be styled, is blocked outright by some browsers, and on a
 * phone covers the address it is asking about. The field sits where the address
 * is and opens pre-filled with it, so the correction is made against something
 * the reader can still see.
 */
export function AddressEdit({
  owner,
  county,
  address,
  memberId,
}: {
  owner: string;
  county: string;
  address: string;
  memberId: number | null;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(address);
  const [sent, setSent] = useState(false);

  /* One handler, used on every interactive part: the label above must not see
     any of these clicks. */
  const keepFromLabel = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  if (sent) {
    return (
      <span className="flex items-center gap-[5px] text-[11.5px] font-semibold text-mv-green-deep">
        <Check aria-hidden="true" className="h-[13px] w-[13px]" />
        Correction reported
      </span>
    );
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={(event) => {
          keepFromLabel(event);
          setDraft(address);
          setEditing(true);
        }}
        title="Tell us the mailing address on this record is wrong"
        className="flex cursor-pointer items-center gap-[5px] text-[11.5px] font-semibold text-mv-green-deep hover:underline hover:underline-offset-2"
      >
        <Pencil aria-hidden="true" className="h-[12px] w-[12px]" />
        Edit address
      </button>
    );
  }

  const changed = draft.trim() !== "" && draft.trim() !== address.trim();

  return (
    <span
      onClick={keepFromLabel}
      className="flex w-full flex-wrap items-center gap-[6px]"
    >
      <input
        type="text"
        value={draft}
        autoFocus
        aria-label={`Corrected mailing address for ${owner}`}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setEditing(false);
          if (e.key === "Enter" && changed) {
            postAddressCorrection(
              { owner, county, oldAddress: address, newAddress: draft.trim() },
              memberId,
            );
            setSent(true);
          }
        }}
        className="min-w-[220px] flex-1 rounded-[7px] border border-mv-line bg-mv-card px-[9px] py-[6px] text-[12px] text-mv-ink outline-none focus-visible:border-mv-green focus-visible:ring-[3px] focus-visible:ring-[rgba(84,191,150,.16)]"
      />

      <button
        type="button"
        disabled={!changed}
        onClick={(event) => {
          keepFromLabel(event);
          postAddressCorrection(
            { owner, county, oldAddress: address, newAddress: draft.trim() },
            memberId,
          );
          setSent(true);
        }}
        className={`flex items-center gap-[5px] rounded-[7px] px-[10px] py-[6px] text-[11.5px] font-semibold ${
          changed
            ? "cursor-pointer bg-mv-green-deep text-white"
            : "cursor-not-allowed bg-mv-portal-wash text-mv-muted"
        }`}
        title={changed ? undefined : "Change the address first"}
      >
        <Check aria-hidden="true" className="h-[12px] w-[12px]" />
        Report
      </button>

      <button
        type="button"
        onClick={(event) => {
          keepFromLabel(event);
          setEditing(false);
        }}
        className="flex cursor-pointer items-center gap-[4px] rounded-[7px] px-[8px] py-[6px] text-[11.5px] font-semibold text-mv-muted hover:text-mv-ink"
      >
        <X aria-hidden="true" className="h-[12px] w-[12px]" />
        Cancel
      </button>
    </span>
  );
}

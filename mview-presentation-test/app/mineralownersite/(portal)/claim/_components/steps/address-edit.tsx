"use client";

import { Check, Pencil, X } from "lucide-react";
import { useState } from "react";

import { PortalButton } from "../../../../_components/ui/button";
import { postAddressCorrection } from "../../_api/claim-api";

/**
 * REPORTING A WRONG MAILING ADDRESS — split into a trigger and a panel.
 *
 * ── WHY TWO COMPONENTS AND NOT ONE ──
 *
 * They belong in different places. The trigger sits INSIDE the row, on the same
 * line as the value, so the row stays two lines tall; the panel opens BELOW the
 * row, where it can have the full width. As one self-contained component the
 * trigger dragged the panel's position with it, and the only way to give the
 * panel room was to put both under the row — which cost every row a third line
 * and left a band of empty space above it.
 *
 * ── IT REPORTS A CORRECTION, IT DOES NOT REWRITE THE ROLL ──
 *
 * The endpoint files a correction request against the county's record. It does
 * not change the address this claim is filed at, and it cannot: the claim
 * matches on the address the roll currently holds, so silently swapping in the
 * typed one would ask the backend for a doorstep it has never heard of and the
 * owner would come back `OWNER_ADDRESS_NOT_FOUND`. The panel says so in as many
 * words, and the acknowledgement says "reported", never "updated".
 *
 * ── BOTH LIVE UNDER A `<label>`, WHICH IS THE WHOLE DIFFICULTY ──
 *
 * The row is a label wrapping a checkbox so clicking anywhere ticks the
 * address. Every click inside — the trigger, the text field, Report — would
 * therefore toggle that tick too. Both components stop the click before the
 * label sees it; without that, correcting a typo silently unticks the address
 * you were correcting.
 */

/** Stops a click reaching the `<label>` that wraps the row. */
const keepFromLabel = (event: React.MouseEvent) => {
  event.preventDefault();
  event.stopPropagation();
};

export function AddressEditButton({
  reported,
  onOpen,
}: {
  reported: boolean;
  onOpen: () => void;
}) {
  /*
   * IT LOOKS LIKE A BUTTON AT REST, NOT ONLY ON HOVER.
   *
   * It was borderless with a transparent edge that only appeared under the
   * pointer, so on a card of three addresses the three triggers read as three
   * grey labels — and a reader who does not happen to sweep the mouse across
   * them never learns the address can be corrected at all. A resting border and
   * a card background make it a control; the hover then only has to say "this
   * one", which it does in the brand green.
   *
   * The two states are built to the same measurements so the row does not
   * reflow when one becomes the other.
   */
  const shell =
    "flex flex-none items-center gap-[6px] rounded-lg border px-[11px] py-[6px] text-[11.5px] font-semibold";

  if (reported) {
    return (
      <span
        className={`${shell} border-mv-mint-edge bg-mv-mint text-mv-green-deep`}
      >
        <Check aria-hidden="true" className="h-[13px] w-[13px]" />
        Reported
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={(event) => {
        keepFromLabel(event);
        onOpen();
      }}
      title="Tell us the mailing address on this record is wrong"
      className={`${shell} cursor-pointer border-mv-line bg-mv-card text-mv-slate transition-colors hover:border-mv-green-deep hover:bg-mv-mint/50 hover:text-mv-green-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep`}
    >
      <Pencil aria-hidden="true" className="h-[12px] w-[12px]" />
      Edit
    </button>
  );
}

export function AddressEditPanel({
  owner,
  county,
  address,
  memberId,
  onReported,
  onCancel,
}: {
  owner: string;
  county: string;
  address: string;
  memberId: number | null;
  onReported: () => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(address);
  const changed = draft.trim() !== "" && draft.trim() !== address.trim();

  const report = () => {
    postAddressCorrection(
      { owner, county, oldAddress: address, newAddress: draft.trim() },
      memberId,
    );
    onReported();
  };

  return (
    <div
      onClick={keepFromLabel}
      className="grid w-full gap-[8px] rounded-[9px] border border-mv-line bg-mv-card p-[10px]"
    >
      <p className="text-[11px] font-bold tracking-[.04em] text-mv-muted uppercase">
        Correct this mailing address
      </p>

      <div className="flex flex-wrap items-center gap-[6px]">
        <input
          type="text"
          value={draft}
          autoFocus
          aria-label={`Corrected mailing address for ${owner}`}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onCancel();
            if (e.key === "Enter" && changed) report();
          }}
          className="min-w-[200px] flex-1 rounded-[7px] border border-mv-line bg-mv-card px-[10px] py-[7px] text-[12.5px] text-mv-ink outline-none focus-visible:border-mv-green focus-visible:ring-[3px] focus-visible:ring-[rgba(84,191,150,.16)]"
        />

        {/* The portal's own buttons — these were hand-rolled, and the bespoke
            `hover:bg-mv-green-ink` turned the primary almost black on hover. */}
        <PortalButton
          variant="primary"
          size="sm"
          disabled={!changed}
          onClick={(event) => {
            keepFromLabel(event);
            report();
          }}
          title={changed ? undefined : "Change the address first"}
        >
          <Check aria-hidden="true" className="h-[13px] w-[13px]" />
          Report
        </PortalButton>

        <PortalButton
          variant="ghost"
          size="sm"
          onClick={(event) => {
            keepFromLabel(event);
            onCancel();
          }}
        >
          <X aria-hidden="true" className="h-[13px] w-[13px]" />
          Cancel
        </PortalButton>
      </div>

      <p className="text-[11px] leading-[1.5] text-mv-muted">
        This reports the correction to the county record. The claim still uses
        the address the roll holds today.
      </p>
    </div>
  );
}

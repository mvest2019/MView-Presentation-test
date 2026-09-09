"use client";

import {
  Check,
  ChevronRight,
  CircleAlert,
  FileText,
  LayoutGrid,
  Mail,
  MapPin,
  MapPinOff,
  RotateCcw,
  UserPlus,
} from "lucide-react";
import { useState } from "react";

import type { ClaimAddressOutcome, ClaimResult } from "../../_api/claim-api";
import { PortalButtonLink } from "../../../_components/ui/button";
import { PrototypeButton } from "../../../_components/ui/prototype-button";

/**
 * THE CELEBRATION MARKS around the tick — eight short strokes radiating out.
 *
 * DRAWN, NOT ANIMATED. A burst that plays once is a burst most readers miss,
 * because this screen is often arrived at with the eye already on the buttons;
 * as static marks it still reads as a flourish and survives a screenshot, a
 * back-navigation and `prefers-reduced-motion` without special-casing any of
 * them.
 *
 * TWO TONES, MOSTLY GREEN. The stray warm mark is what stops it reading as a
 * loading spinner's tick marks — a spinner's are evenly weighted and evenly
 * spaced, and these are deliberately neither.
 *
 * It overflows the 64px circle on purpose and is `pointer-events-none`, so it
 * cannot intercept a click meant for anything near it.
 */
function SuccessBurst() {
  /* angle in degrees, distance from centre, length, colour */
  const marks: [number, number, number, string][] = [
    [-72, 42, 9, "var(--color-mv-green)"],
    [-38, 46, 7, "var(--color-mv-art-orange)"],
    [-12, 44, 10, "var(--color-mv-green)"],
    [26, 46, 7, "var(--color-mv-green)"],
    [58, 42, 9, "var(--color-mv-art-orange)"],
    [128, 44, 8, "var(--color-mv-green)"],
    [166, 46, 10, "var(--color-mv-green)"],
    [212, 43, 7, "var(--color-mv-green)"],
  ];

  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
    >
      {marks.map(([angle, distance, length, colour]) => (
        <span
          key={angle}
          className="absolute rounded-full"
          style={{
            width: `${length}px`,
            height: "2.5px",
            background: colour,
            opacity: 0.75,
            transform: `rotate(${angle}deg) translateX(${distance}px)`,
          }}
        />
      ))}
    </span>
  );
}

/** One owner row, flattened out of the two halves of the response. */
interface OwnerRow {
  name: string;
  filed: boolean;
  /** The owner's addresses as the endpoint reported them. */
  addresses: ClaimAddressOutcome[];
  /** "1 lease" / "13 already yours" — the count that is actually true here. */
  countNote: string;
  /** Only on a refusal: the backend's own sentence. */
  error?: string;
}

/**
 * STEP 5 — WHAT THE CLAIM DID, IN TWO CARDS.
 *
 * ── THE HEADLINE COUNTS WHAT WAS FILED, NOT WHAT WAS SENT ──
 *
 * `claimed_leases_count` summed from `successful_owners`. A name already on the
 * account contributes leases to step 4's table and none to this total, so
 * counting the previous screen's rows would overstate the claim.
 *
 * AND IT DOES NOT SAY "SUCCESSFULLY" WHEN NOTHING WAS FILED. A claim where
 * every name was already claimed comes back 201 with zero leases, and
 * "Successfully claimed 0 leases" is the worst sentence this screen could show.
 *
 * ── ONE ROW PER OWNER, EXPANDABLE TO ITS ADDRESSES ──
 *
 * The row carries the verdict at a glance — name, address, status, lease count.
 * The per-address detail the endpoint returns sits behind the chevron rather
 * than in the row, because an owner claimed at one address is the common case
 * and does not need a second line to say so.
 */
export function StepSuccess({
  result,
  onStartOver,
}: {
  result: ClaimResult | null;
  /** Reset the whole flow and return to step 1 for a different record. */
  onStartOver: () => void;
}) {
  const filed = result?.successful_owners ?? [];
  const refused = result?.failed_owners ?? [];

  const claimed = filed.reduce(
    (sum, owner) => sum + owner.claimed_leases_count,
    0,
  );
  const nothingFiled = claimed === 0;

  const rows: OwnerRow[] = [
    ...filed.map((owner) => ({
      name: owner.ownername,
      filed: true,
      addresses: owner.addresses ?? [],
      countNote: `${owner.claimed_leases_count} lease${owner.claimed_leases_count === 1 ? "" : "s"}`,
    })),
    ...refused.map((owner) => ({
      name: owner.ownername,
      filed: false,
      addresses: owner.addresses ?? [],
      countNote:
        owner.failed_lease_count > 0
          ? `${owner.failed_lease_count} already yours`
          : "—",
      error: owner.error,
    })),
  ];

  return (
    <div className="grid gap-[18px]">
      {/* CARD ONE — the outcome and the ways on. */}
      <section className="grid justify-items-center gap-[18px] rounded-mv border border-mv-line bg-mv-card px-6 py-[34px] text-center">
        {/* THE BURST IS PART OF THE MESSAGE, not decoration for its own sake.
            A filing that went through is the one moment in this flow worth
            marking, and the marks are what separate "the request completed"
            from "this worked". They are drawn ONLY on a success — a
            celebration around a warning icon would be the wrong sentence
            entirely — and carry `aria-hidden`, since a screen reader gets the
            same news from the heading underneath. */}
        <span className="relative flex h-[64px] w-[64px] items-center justify-center">
          {!nothingFiled && <SuccessBurst />}

          <span
            className={`relative z-[1] flex h-[64px] w-[64px] items-center justify-center rounded-full ${
              nothingFiled
                ? "bg-mv-sand-tint text-mv-sand"
                : "bg-mv-mint text-mv-green-deep"
            }`}
          >
            {nothingFiled ? (
              <CircleAlert aria-hidden="true" className="h-[30px] w-[30px]" />
            ) : (
              <Check
                aria-hidden="true"
                className="h-[30px] w-[30px]"
                strokeWidth={3}
              />
            )}
          </span>
        </span>

        <div className="grid gap-[8px]">
          <h2 className="text-[clamp(20px,2.8vw,26px)] font-bold leading-[1.2] tracking-[-.015em] text-mv-slate">
            {nothingFiled
              ? "Nothing new was claimed"
              : `Successfully claimed ${claimed} lease${claimed === 1 ? "" : "s"}`}
          </h2>
          <p className="mx-auto max-w-[52ch] text-[13.5px] leading-[1.6] text-mv-muted">
            {nothingFiled
              ? "Every name in this claim was already on an account. Nothing changed, and nothing was lost."
              : "Your record is now verified and ready. You can view your lease information, production history and estimate details below."}
          </p>
        </div>

        {/* THREE WAYS ON, IN THE ORDER THEY ARE WANTED. The dashboard is where
            the record now is, so it is the filled button; inviting co-owners is
            the next thing most owners do; claiming another record is the
            uncommon one and reads as a link rather than competing. */}
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
          <PortalButtonLink
            variant="primary"
            size="md"
            href="/mineralownersite"
          >
            <LayoutGrid aria-hidden="true" className="h-[15px] w-[15px]" />
            Go to dashboard →
          </PortalButtonLink>

          {/* NO INVITE ROUTE EXISTS YET — the portal's own "Invite Co-Owners"
              nav item is a `soon` entry with no page behind it. This
              acknowledges in place rather than linking to a 404, and becomes a
              real link the moment that route lands. */}
          <PrototypeButton
            acknowledgement="Invites sent ✓ (prototype)"
            size="md"
            icon={<UserPlus aria-hidden="true" className="h-[15px] w-[15px]" />}
            title="Opens the co-owner invite flow"
          >
            Invite my co-owners
          </PrototypeButton>

          <button
            type="button"
            onClick={onStartOver}
            className="flex cursor-pointer items-center gap-[7px] px-2 text-[13px] font-semibold text-mv-green-deep hover:underline hover:underline-offset-2"
          >
            <RotateCcw aria-hidden="true" className="h-[15px] w-[15px]" />
            Claim another record
          </button>
        </div>
      </section>

      {/* CARD TWO — the receipt, name by name. */}
      {rows.length > 0 && (
        <section className="overflow-hidden rounded-mv border border-mv-line bg-mv-card">
          <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-mv-line px-4 py-[13px]">
            <h3 className="flex items-center gap-[9px] text-[14px] font-bold text-mv-ink">
              <FileText
                aria-hidden="true"
                className="h-[16px] w-[16px] text-mv-muted"
              />
              Claimed Leases ({claimed})
            </h3>
            <p className="text-[11.5px] text-mv-muted">
              {claimed} lease{claimed === 1 ? "" : "s"} claimed
            </p>
          </header>

          <ul className="divide-y divide-mv-line">
            {rows.map((row) => (
              <OwnerRowItem key={row.name} row={row} />
            ))}
          </ul>

          {result?.claimedAt && (
            <p className="flex items-center justify-center gap-[7px] border-t border-mv-line px-4 py-[11px] text-[11.5px] text-mv-muted">
              <Mail aria-hidden="true" className="h-[13px] w-[13px]" />
              Filed {new Date(result.claimedAt).toLocaleString("en-US")} — a
              confirmation email is on its way.
            </p>
          )}
        </section>
      )}
    </div>
  );
}

/**
 * One owner in the receipt.
 *
 * THE CHEVRON IS REAL. It opens the per-address detail the endpoint returns —
 * each address with its own status and lease counts — which is the answer to
 * the question step 3 asked and is worth having, but not worth a second line
 * on every row when most owners have one address.
 */
function OwnerRowItem({ row }: { row: OwnerRow }) {
  const [open, setOpen] = useState(false);
  const first = row.addresses[0];
  const extra = Math.max(0, row.addresses.length - 1);

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center gap-3 px-4 py-[13px] text-left transition-colors hover:bg-mv-hover"
      >
        <span
          className={`flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full ${
            row.filed
              ? "bg-mv-green-deep text-white"
              : "bg-mv-portal-wash text-mv-muted"
          }`}
        >
          {row.filed ? (
            <MapPin aria-hidden="true" className="h-[16px] w-[16px]" />
          ) : (
            <MapPinOff aria-hidden="true" className="h-[16px] w-[16px]" />
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-bold tracking-[.01em] text-mv-ink uppercase">
            {row.name}
          </span>
          <span className="mt-[3px] flex items-center gap-[5px] text-[12px] text-mv-muted">
            <MapPin
              aria-hidden="true"
              className="h-[12px] w-[12px] flex-none"
            />
            <span className="min-w-0 truncate">
              {first?.address ?? "No address sent"}
              {extra > 0 && ` +${extra} more`}
            </span>
          </span>
        </span>

        <StatusPill filed={row.filed} />

        <span className="flex-none text-[11.5px] text-mv-muted tabular-nums">
          {row.countNote}
        </span>

        <ChevronRight
          aria-hidden="true"
          className={`h-[16px] w-[16px] flex-none text-mv-muted transition-transform ${open ? "rotate-90" : ""}`}
        />
      </button>

      {open && (
        <div className="border-t border-mv-line bg-mv-portal-wash/40 px-4 py-[10px]">
          {row.error && (
            <p className="mb-[8px] text-[11.5px] leading-[1.5] text-mv-sand">
              {row.error}
            </p>
          )}
          {row.addresses.length === 0 ? (
            <p className="text-[11.5px] text-mv-muted">
              No addresses were sent for this name.
            </p>
          ) : (
            <ul className="grid gap-[6px]">
              {row.addresses.map((entry) => (
                <li
                  key={entry.address}
                  className="flex flex-wrap items-center gap-x-3 gap-y-[3px] text-[11.5px]"
                >
                  <span className="min-w-0 flex-1 text-mv-slate">
                    {entry.address}
                  </span>
                  <span className="text-mv-muted">
                    {statusWord(entry.status)}
                  </span>
                  <span className="text-mv-muted tabular-nums">
                    {leaseNote(entry)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}

/** Green for filed, red for refused — the mock's two states. */
function StatusPill({ filed }: { filed: boolean }) {
  return (
    <span
      className={`flex flex-none items-center gap-[5px] rounded-full px-[10px] py-[4px] text-[11.5px] font-semibold ${
        filed ? "bg-mv-mint text-mv-green-deep" : "bg-mv-red-bg text-mv-red"
      }`}
    >
      {filed ? (
        <Check
          aria-hidden="true"
          className="h-[12px] w-[12px]"
          strokeWidth={3}
        />
      ) : (
        <CircleAlert aria-hidden="true" className="h-[12px] w-[12px]" />
      )}
      {filed ? "Claimed" : "Already claimed"}
    </span>
  );
}

/**
 * The backend's `status` in the reader's words. An unrecognised value is
 * printed rather than swallowed — a status we have not seen is still a verdict.
 */
function statusWord(status: string): string {
  if (status === "claimed") return "Claimed";
  if (status === "already_claimed") return "Already claimed";
  if (status === "not_found") return "No record at this address";
  return status.replace(/_/g, " ");
}

/** "1 lease" / "13 already yours" / "—" — whichever number is the real one. */
function leaseNote(entry: ClaimAddressOutcome): string {
  if (entry.claimed_leases_count > 0) {
    return `${entry.claimed_leases_count} lease${entry.claimed_leases_count === 1 ? "" : "s"}`;
  }
  if (entry.already_claimed_leases_count > 0) {
    return `${entry.already_claimed_leases_count} already yours`;
  }
  return "—";
}

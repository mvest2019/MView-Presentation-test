"use client";

import {
  Check,
  CircleAlert,
  CircleCheck,
  Layers,
  FileText,
  House,
  LayoutGrid,
  MapPin,
  RotateCcw,
  UserPlus,
  Users,
} from "lucide-react";

import { PortalButtonLink } from "../../../../_components/ui/button";
import { PrototypeButton } from "../../../../_components/ui/prototype-button";
import type { ClaimAddressOutcome, ClaimResult } from "../../_api/claim-api";
import type { OwnerRecord } from "../../_lib/claim-types";

/** One owner row, flattened out of the two halves of the response. */
interface OwnerRow {
  name: string;
  filed: boolean;
  /** "Claimed" / "Already claimed" / "Not claimed" — from the error code. */
  statusLabel: string;
  /** The owner's addresses as the endpoint reported them. */
  addresses: ClaimAddressOutcome[];
  /** "1 lease" / "13 already yours" — the count that is actually true here. */
  countNote: string;
  /** Only on a refusal: the backend's own sentence. */
  error?: string;
  /** RRC lease number off the claim set, when this name resolves to one. */
  leaseNumber: string | null;
  /**
   * The lease count this row is about, straight off the claim response:
   * how many were filed for a successful name, how many were already on the
   * account for one refused as already claimed.
   */
  leaseCount: number;
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
 * The hero's whole palette follows that same flag — mint on a success, sand
 * when nothing landed — because on plain white the two outcomes looked
 * identical and the icon was carrying the message alone.
 *
 * ── ONE TILE PER OWNER, EVERYTHING ON IT ──
 *
 * The row carries the whole verdict: name, every address the endpoint
 * reported, the lease number, the status and the count
 * — read down the row and it is all there. Nothing is behind a disclosure and
 * nothing is behind a chevron: the rows carried one for a while and it is gone
 * again, so there is no control on a row that could be hiding anything.
 */
export function StepSuccess({
  result,
  records = [],
  onStartOver,
}: {
  result: ClaimResult | null;
  /**
   * The claim set the reader confirmed, for the one field the claim response
   * does not carry — the RRC lease number. Optional: the receipt is complete
   * without it and simply prints an em dash.
   */
  records?: OwnerRecord[];
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

  /*
   * THE LEASE NUMBER COMES OFF THE CLAIM SET, because `/owners/claim` does not
   * return one — it answers in counts and statuses, never in lease identity.
   * Matched on the owner name, which is the unit both sides work in.
   *
   * FIRST NUMBER ONLY, and that is honest rather than lazy: a name holding
   * nine leases has nine numbers, the row has space for one, and the count
   * beside it already says there are more. Leading zeros are significant on an
   * RRC number, so this stays a string and is never parsed.
   */
  const leaseNumberFor = (name: string): string | null => {
    const owner = records.find(
      (record) => record.name.toUpperCase() === name.toUpperCase(),
    );
    return owner?.leases.find((one) => one.number)?.number ?? null;
  };

  const rows: OwnerRow[] = [
    ...filed.map((owner) => ({
      name: owner.ownername,
      filed: true,
      statusLabel: "Claimed",
      addresses: owner.addresses ?? [],
      countNote: `${owner.claimed_leases_count} lease${owner.claimed_leases_count === 1 ? "" : "s"}`,
      leaseNumber: leaseNumberFor(owner.ownername),
      leaseCount: owner.claimed_leases_count,
    })),
    ...refused.map((owner) => ({
      name: owner.ownername,
      filed: false,
      /*
       * THE PILL READS THE ERROR CODE, IT DOES NOT ASSUME.
       *
       * It used to print "Already claimed" for every refusal. Only one code
       * means that: a name refused as OWNER_ADDRESS_NOT_FOUND has NOT been
       * claimed by anybody, and telling its owner it had would send them
       * looking for a claim that does not exist.
       */
      statusLabel:
        owner.error_code === "OWNER_ALREADY_CLAIMED"
          ? "Already claimed"
          : "Not claimed",
      addresses: owner.addresses ?? [],
      countNote:
        owner.failed_lease_count > 0
          ? `${owner.failed_lease_count} already yours`
          : "—",
      error: owner.error,
      leaseNumber: leaseNumberFor(owner.ownername),
      leaseCount: owner.failed_lease_count,
    })),
  ];

  return (
    <div className="grid gap-[18px]">
      {/*
        CARD ONE — the outcome and the ways on.

        NO ILLUSTRATION (removed on request). A drawn certificate sat to the
        left of the words; the text now runs the full width of the band, which
        is also why the paragraph keeps its `max-w-[54ch]` — without the
        illustration holding the column in, a line of body copy would otherwise
        stretch the whole width of the card and become hard to read.

        RANGED LEFT, NOT CENTRED. Centred, the heading and its three buttons ran
        down the middle of a very wide card and the eye had to travel the full
        height to collect them.
      */}
      <section
        className={`relative overflow-hidden rounded-mv border px-[26px] py-[26px] ${
          nothingFiled
            ? "border-mv-sand-line bg-linear-to-r from-mv-sand-tint to-mv-card"
            : "border-mv-mint-line bg-linear-to-r from-mv-mint via-mv-mint/70 to-mv-mint/25"
        }`}
      >
        {/* The wash in the corner, which is what stops a wide flat band of one
            colour reading as an empty state. Purely decorative. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-[40%] -right-[8%] h-[180%] w-[46%] rounded-full bg-white/45 blur-[42px]"
        />

        <div className="relative">
          {/* THE TEXT AND THE POPPER ARE ONE ROW; THE BUTTONS ARE NOT.

              The buttons run about 575px, and a flex row containing all three
              would be as wide as them — which pushes the popper out level with
              the end of the button row rather than the end of the sentence. */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-4">
            <div>
              {/* The chip sits in its own block so it keeps its own line above
                  the heading rather than flowing beside it. */}
              <div>
                <span
                  className={`inline-flex items-center gap-[6px] rounded-full px-[11px] py-[5px] text-[12px] font-semibold ${
                    nothingFiled
                      ? "bg-mv-card text-mv-sand"
                      : "bg-mv-card text-mv-green-deep"
                  }`}
                >
                  {nothingFiled ? (
                    <CircleAlert
                      aria-hidden="true"
                      className="h-[14px] w-[14px]"
                    />
                  ) : (
                    <CircleCheck
                      aria-hidden="true"
                      className="h-[14px] w-[14px]"
                    />
                  )}
                  {nothingFiled ? "Nothing filed" : "All set!"}
                </span>
              </div>

              <h2 className="mt-[10px] text-[clamp(21px,2.9vw,28px)] leading-[1.18] font-bold tracking-[-.02em] text-mv-ink">
                {nothingFiled
                  ? "Nothing new was claimed"
                  : `Successfully claimed ${claimed} lease${claimed === 1 ? "" : "s"}`}
              </h2>

              <p className="mt-[8px] max-w-[52ch] text-[13.5px] leading-[1.6] text-mv-slate">
                {nothingFiled
                  ? "Every name in this claim was already on an account. Nothing changed, and nothing was lost."
                  : "Your record is now verified and ready. You can view your lease information, production history and estimate details below."}
              </p>
            </div>

            {/*
            THE PARTY POPPER — beside the words, CLEAR OF THEM.

            ── WHY IT IS NOT TUCKED IN AGAINST THE HEADING ──

            It was anchored to the end of the heading for a turn, which put it
            exactly where it had been asked for and straight ON TOP of the
            paragraph. The geometry does not allow both: the paragraph's lines
            run PAST the end of the heading — "…You can view your lease" is
            longer than "Successfully claimed 1 lease" — so anything sitting at
            the heading's end and taller than one line of it covers the copy
            underneath.

            So it sits after the whole text block, which is the leftmost
            position that touches nothing. The paragraph's measure is trimmed to
            52ch, still two lines, to close as much of that gap as the wrapping
            allows.

            AN EMOJI, NOT A DRAWN SVG. A hand-drawn certificate was here before
            and was taken out; this is the glyph itself, so it renders as the
            reader's own platform draws it and cannot drift from what was asked
            for. The font stack keeps a colour emoji face in front of the
            portal's text face, which on some systems would otherwise hand back
            a flat monochrome fallback.

            ONLY ON A SUCCESS. A celebration over "Nothing new was claimed"
            would be the wrong sentence entirely — the same reason the band's
            own palette turns sand in that case.

            IT SHOWS AT EVERY WIDTH. This carried a `min-[820px]` guard for a
            while, which meant it silently vanished from a merely narrowed
            browser window. In the flow it simply wraps under the text when the
            column is too narrow to hold both, so no guard is needed.

            `aria-hidden` because the heading beside it already says the news,
            and a screen reader announcing "party popper" adds nothing.
          */}
            {!nothingFiled && (
              <span
                aria-hidden="true"
                className="pointer-events-none flex-none text-[96px] leading-none select-none"
                style={{
                  fontFamily:
                    '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif',
                }}
              >
                🎉
              </span>
            )}
          </div>

          {/* THREE WAYS ON, IN THE ORDER THEY ARE WANTED. The dashboard is
              where the record now is, so it is the filled button; inviting
              co-owners is the next thing most owners do; claiming another
              record is the uncommon one. All three are buttons — the third
              was a bare text link and lost its footing against a green
              field. */}
          <div className="mt-[18px] flex flex-wrap items-center gap-x-3 gap-y-2">
            <PortalButtonLink
              variant="primary"
              size="md"
              href="/mineralownersite"
            >
              <LayoutGrid aria-hidden="true" className="h-[15px] w-[15px]" />
              Go to dashboard →
            </PortalButtonLink>

            {/* NO INVITE ROUTE EXISTS YET — the portal's own "Invite
                  Co-Owners" nav item is a `soon` entry with no page behind it.
                  This acknowledges in place rather than linking to a 404, and
                  becomes a real link the moment that route lands. */}
            <PrototypeButton
              acknowledgement="Invites sent ✓ (prototype)"
              size="md"
              icon={
                <UserPlus aria-hidden="true" className="h-[15px] w-[15px]" />
              }
              title="Opens the co-owner invite flow"
            >
              Invite my co-owners
            </PrototypeButton>

            <button
              type="button"
              onClick={onStartOver}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-mv-line bg-mv-card px-[18px] py-[10px] text-sm leading-[1.2] font-semibold text-mv-slate transition-colors hover:border-mv-line-strong hover:bg-mv-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
            >
              <RotateCcw aria-hidden="true" className="h-[15px] w-[15px]" />
              Claim another record
            </button>
          </div>
        </div>
      </section>

      {/* CARD TWO — the receipt, name by name. */}
      {rows.length > 0 && (
        <section className="rounded-mv border border-mv-line bg-mv-card">
          <header className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-mv-line px-4 py-[14px]">
            <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[10px] bg-mv-green-deep text-white">
              <FileText aria-hidden="true" className="h-[17px] w-[17px]" />
            </span>

            <div className="min-w-0 flex-1">
              <h3 className="text-[15px] leading-[1.3] font-bold text-mv-ink">
                Claimed Leases ({claimed})
              </h3>
              <p className="mt-[2px] text-[12px] text-mv-muted">
                Here are the {claimed} lease{claimed === 1 ? "" : "s"} now
                linked to your owner record.
              </p>
            </div>

            <span className="flex flex-none items-center gap-[6px] rounded-full border border-mv-mint-line bg-mv-mint px-[11px] py-[5px] text-[11.5px] font-semibold text-mv-green-ink">
              <CircleCheck aria-hidden="true" className="h-[13px] w-[13px]" />
              {claimed} lease{claimed === 1 ? "" : "s"} claimed
            </span>
          </header>

          <ul className="grid gap-[10px] p-[12px]">
            {rows.map((row) => (
              <OwnerRowItem key={row.name} row={row} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/**
 * ONE OWNER IN THE RECEIPT.
 *
 * A PLAIN TILE, NOT A LINK. It carried a chevron through to the lease list for
 * a while; both are gone (requested). The band above still offers the
 * dashboard, which is the route to those leases.
 *
 * NOTHING HIDES IN HERE. Every address the endpoint reported is printed, and a
 * refusal prints the backend's own sentence underneath; a row that silently
 * dropped an address would be worse than the disclosure this replaced.
 */
function OwnerRowItem({ row }: { row: OwnerRow }) {
  const body = (
    <>
      <span
        /*
           THE AVATAR TAKES THE SAME COLOUR AS THE VERDICT. It was neutral grey
           on a refused row, which read as "nothing happened here" — but
           something did, and the pill at the other end of the row is already
           red about it. The two ends of the row now agree, and a card of eight
           names can be scanned down the left edge alone.

           TINT AND INK, NOT A SOLID FILL (requested). The claimed circle was
           `mv-green-deep` behind a white glyph — the darkest thing on a screen
           whose whole palette is a pale wash, so it landed as a heavy dot
           rather than as a marker. Both states now use the construction their
           own status pill uses: a pale ground with the saturated colour on the
           glyph.
        */
        className={`flex h-[44px] w-[44px] flex-none items-center justify-center rounded-full ${
          row.filed
            ? "bg-mv-mint text-mv-green-deep"
            : "bg-mv-red-bg text-mv-red"
        }`}
      >
        {row.filed ? (
          <House aria-hidden="true" className="h-[21px] w-[21px]" />
        ) : (
          <Users aria-hidden="true" className="h-[21px] w-[21px]" />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-[14px] leading-[1.35] font-bold tracking-[.01em] text-mv-ink uppercase">
          {row.name}
        </span>

        {row.addresses.length === 0 ? (
          <span className="mt-[3px] block text-[12.5px] text-mv-muted">
            No address sent for this name
          </span>
        ) : (
          row.addresses.map((entry) => (
            /*
             * ONE LINE PER ADDRESS, TRUNCATED (requested).
             *
             * Both addresses are still printed — nothing is dropped — but each
             * gets a single line and an ellipsis rather than wrapping. A name
             * with two long roll addresses was running to five lines and making
             * its tile twice the height of its neighbours, so the card could no
             * longer be read down. The start of an address is the part that
             * identifies it, and the full text is on the `title` for anyone who
             * needs the tail.
             */
            <span
              key={entry.address}
              /* A PLAIN `group`, NOT A NAMED ONE. `group/address` with
                 `group-hover/address:` was written first and Tailwind emitted
                 no rule for it at all — the class was on the element and the
                 stylesheet had nothing to match it, so the tooltip never
                 appeared. Verified by walking `document.styleSheets`: no
                 selector mentioning it exists. Nothing else in this subtree
                 uses `group`, so the unnamed one is unambiguous here. */
              className="group relative mt-[3px] flex min-w-0 items-center gap-[6px] text-[12.5px] leading-[1.45] text-mv-muted"
            >
              <MapPin
                aria-hidden="true"
                className="h-[13px] w-[13px] flex-none"
              />
              <span className="min-w-0 truncate">
                {entry.address}
                {/* Per-address verdicts only when there is more than one to
                    tell apart — on a single address the pill already said
                    it. */}
                {row.addresses.length > 1 && (
                  <span className="text-[11.5px]">
                    {" · "}
                    {statusWord(entry.status)} · {leaseNote(entry)}
                  </span>
                )}
              </span>

              {/*
                THE FULL ADDRESS ON HOVER — a drawn tooltip, not `title`.

                `title` was here and is not good enough for the job. It waits
                about a second before it appears, it cannot be styled, and the
                walkthrough's stage is `inert` — which takes the subtree out of
                hit-testing, so the browser never fires the hover that would
                show one at all. A reader watching the sample would find the
                truncated line had no way to be read in full.

                BELOW THE LINE, NOT ABOVE IT. The tile sits inside a scrolling
                panel; a tooltip above the first row's address would be clipped
                by the top of that panel, and the first row is the one most
                likely to be hovered.

                `w-max` with a cap, so a short address gets a short tooltip and
                a long one wraps rather than running off the card. It is
                `pointer-events-none` so it cannot swallow the hover that is
                keeping it open.
              */}
              <span
                role="tooltip"
                className="pointer-events-none absolute top-full left-0 z-20 mt-[4px] hidden w-max max-w-[380px] rounded-[8px] bg-mv-deep px-[10px] py-[7px] text-[11.5px] leading-[1.45] font-medium text-mv-on-deep shadow-mv-lg group-hover:block"
              >
                {entry.address}
                {row.addresses.length > 1 && (
                  <span className="mt-[2px] block text-[10.5px] text-mv-on-deep-soft">
                    {statusWord(entry.status)} · {leaseNote(entry)}
                  </span>
                )}
              </span>
            </span>
          ))
        )}

        {/* WHY A NAME WAS REFUSED, in the backend's own words. "Not claimed"
            alone does not tell anybody what to do about it. */}
        {row.error && (
          <span className="mt-[4px] block text-[12px] leading-[1.5] text-mv-sand italic">
            {row.error}
          </span>
        )}
      </span>

      {/* THE TWO FACTS, EACH FENCED IN ITS OWN COLUMN, so a two-line address
          cannot push them around and they line up down the whole card. Hidden
          below 900px, where the name and the verdict are what matter and there
          is no room for four columns of anything. */}
      <span className="hidden flex-none self-stretch min-[900px]:flex">
        <Fact
          icon={<FileText aria-hidden="true" className="h-[13px] w-[13px]" />}
          label="Lease #"
          value={row.leaseNumber ?? "—"}
        />
        {/*
          THIS SLOT WAS "PRODUCTION", AND PRODUCTION IS NOT SERVED. No owners
          endpoint carries volumes — the record has `leases`, `leaseValues`,
          `leaseNumbers`, `interestValues` and `operators`, and nothing else —
          so the column printed an em dash on every row.

          It now shows the count the claim response DOES carry, and it is
          relabelled to match: putting a lease count under the word "Production"
          would read as a BOE figure and be false. The label follows the row,
          because the two cases are different numbers — `claimed_leases_count`
          for a name that was filed, `failed_lease_count` for one refused
          because those leases were already on the account.
        */}
        <Fact
          icon={<Layers aria-hidden="true" className="h-[13px] w-[13px]" />}
          label={row.filed ? "Leases claimed" : "Already yours"}
          value={String(row.leaseCount)}
        />
      </span>

      {/*
        THE VERDICT AND THE COUNT SIT IN FIXED CELLS, WHICH IS WHAT ALIGNS THE
        COLUMNS TO THEIR LEFT.

        The name block is `flex-1`, so it absorbs whatever slack the row has —
        which means every column after it starts wherever the ones AFTER it
        happen to end. A "Claimed" pill is about 78px and an "Already claimed"
        one about 122px, so a card mixing the two had its Lease # column
        starting at a different x on every row. The pill still sizes to its own
        words; it is the CELL around it that is fixed, so the difference is
        absorbed here instead of shunting four columns sideways.

        `whitespace-nowrap` on the count for the same reason vertically: "13
        already yours" wrapped to two lines in the old 92px and made that one
        row taller than its neighbours.
      */}
      <span className="flex w-[132px] flex-none justify-start">
        <StatusPill filed={row.filed} label={row.statusLabel} />
      </span>

      <span className="hidden w-[104px] flex-none text-[12px] whitespace-nowrap text-mv-muted tabular-nums min-[720px]:block">
        {row.countNote}
      </span>
    </>
  );

  /*
   * A PLAIN TILE. The chevron is gone (requested), and the link went with it
   * rather than staying on as an invisible one: a whole row that navigates with
   * nothing on it to say so is a trap, not a shortcut. The dashboard button in
   * the band above is the way through to the leases.
   */
  return (
    /* `min-w-0` ON THE TILE ITSELF, which is the link in the chain that was
       missing. A grid item's default `min-width: auto` refuses to shrink below
       its content, so a long address pushed the whole row wider than the card
       and put a horizontal scrollbar under it — the truncation inside could
       never fire, because there was always more width to take. */
    <li className="flex min-w-0 items-center gap-4 rounded-[12px] border border-mv-line bg-mv-card px-4 py-[14px] shadow-[0_1px_2px_rgba(13,14,23,.04)]">
      {body}
    </li>
  );
}

/**
 * A LABELLED FIGURE IN ITS OWN FENCED COLUMN — icon, caption, value.
 *
 * The rule on the left is the fence, and it is on the column rather than
 * between the columns so the two read as a matched pair however wide the name
 * beside them runs. `self-stretch` on the group makes it a full-height rule
 * rather than one the height of two lines of text.
 */
function Fact({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <span className="flex w-[152px] flex-col justify-center border-l border-mv-line px-4">
      <span className="flex items-center gap-[5px] text-[11px] whitespace-nowrap text-mv-muted">
        {icon}
        {label}
      </span>
      <span className="mt-[3px] block text-[13px] font-semibold text-mv-ink tabular-nums">
        {value}
      </span>
    </span>
  );
}

/** Green for filed, red for refused — the label comes from the error code. */
function StatusPill({ filed, label }: { filed: boolean; label: string }) {
  return (
    <span
      className={`flex flex-none items-center gap-[6px] rounded-full px-[12px] py-[6px] text-[12px] font-semibold ${
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
      {label}
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

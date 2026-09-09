"use client";

import {
  Check,
  Circle,
  CircleCheck,
  House,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Badge } from "../../../../_components/ui/badge";
import { PortalButton } from "../../../../_components/ui/button";
import { addressKey, money, recordKey } from "../../_lib/claim-format";
import type { ClaimSet, OwnerRecord } from "../../_lib/claim-types";
import type { Async } from "../claim-wizard";
import { FlowError, FlowLoading } from "../flow-state";
import { GuideNote } from "../guide-note";
import { StepIntro } from "../step-intro";
import { AddressEditButton, AddressEditPanel } from "./address-edit";
import { ClaimCheckbox } from "./claim-checkbox";

/** One record the endpoint returned, and how it should be badged. */
interface AddressRow {
  record: OwnerRecord;
  /** The endpoint put this at the address that was searched — `selected`. */
  matches: boolean;
  /** Not `selected`, but the same doorstep as one that is. */
  sameDoorstep: boolean;
  /**
   * For a `sameDoorstep` row, the county whose roll holds the twin. It is the
   * OTHER roll by definition — this row's own county is printed beside it — so
   * the chip reads "Live Oak roll" on a Bee County row and names the second
   * source that agrees, which is the whole reason the row is not a stranger.
   */
  twinCounty: string | null;
}

/**
 * STEP 3 — address-verify. NOTHING IS WRITTEN HERE.
 *
 * The claim used to be posted by this step's Confirm, which asked the reader to
 * file before seeing the lease set it would take. The write now happens on step
 * 4, under the list of leases it covers; this step only settles which owner
 * names the claim will name.
 *
 * ── GROUPED BY OWNER NAME, ADDRESSES UNDERNEATH ──
 *
 * The roll spells one person several ways — "RAYMOND SMITH" and "SMITH RAYMOND
 * E" are the same human — and each spelling carries its own set of addresses.
 * A flat list of cards buried that: the reader saw five boxes and no way to see
 * that they were two names with three and two addresses.
 *
 * The name is the unit the CLAIM works in — `/owners/claim` takes owner names,
 * and each name brings every lease it holds statewide — so the name is the
 * heading and the addresses are what gets ticked beneath it. Each group counts
 * its own selection, because "0 of 3 addresses selected" is the question this
 * step is actually asking.
 *
 * ── THE ENDPOINT DOES THE DISCRIMINATING, NOT A FLAG WE SET ──
 *
 * `/same-name` answers, per record picked on step 2, with the record at that
 * exact address (`selected`) and with the same name at OTHER addresses
 * (`records[]`). The badges name that split and nothing more.
 *
 * They used to promise a mechanism instead — "verifies instantly" against "we
 * post a code before it joins" — which this system does not have. There is no
 * code-posting step among the six owners endpoints, and `/owners/claim`
 * resolves every address in one call: `claimed`, `already_claimed` or
 * `not_found`, with no pending state for a code to later clear.
 *
 * ── TWO GATES ──
 *
 * At least one address, and the good-faith attestation. Being signed in is
 * required to FILE, which is step 4 — this step warns about it but does not
 * block on it, because a step that writes nothing has no business demanding an
 * account.
 */
export function StepProve({
  claimSet,
  memberId,
  confirmed,
  onToggleRecord,
  attested,
  onAttest,
  onConfirm,
  onBack,
}: {
  claimSet: Async<ClaimSet>;
  memberId: number | null;
  /** Ticked record keys — county|name|address, never the address alone. */
  confirmed: string[];
  onToggleRecord: (key: string, checked: boolean) => void;
  attested: boolean;
  onAttest: (value: boolean) => void;
  onConfirm: () => void;
  onBack: () => void;
}) {
  const records = claimSet.data?.records ?? [];
  const others = claimSet.data?.others ?? [];

  /* Which row has its correction panel open, and which have been reported.
     Held here rather than per-row so only one panel is open at a time — two
     open editors on one screen is two half-finished corrections. */
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [reported, setReported] = useState<string[]>([]);

  /*
   * ONE ROW PER RECORD THE ENDPOINT RETURNED — `selected` plus every entry in
   * `records[]` — grouped under the owner name they share.
   *
   * NOTHING IS FOLDED AWAY. These rows were briefly merged when two county
   * rolls spelled one doorstep differently, which showed one row where the API
   * had sent two. Hiding a record the endpoint returned is the wrong trade:
   * the reader cannot tick what they cannot see, and the row count no longer
   * matched the answer it came from.
   *
   * `sameDoorstep` is what the merge was really for. Bee's
   * "8800 S HARLEM AVE TRLR 1111, BRIDGEVIEW, IL 60455" and Live Oak's
   * "…60455 1995" normalise identically, and badging the second "different
   * address, we post a code" told the reader their own address belonged to
   * somebody else. Both rows stay; only the badge changes.
   */
  const groups = new Map<string, AddressRow[]>();
  for (const [record, matches] of [
    ...records.map((r) => [r, true] as const),
    ...others.map((r) => [r, false] as const),
  ]) {
    groups.set(record.name, [
      ...(groups.get(record.name) ?? []),
      { record, matches, sameDoorstep: false, twinCounty: null },
    ]);
  }

  /* A row shares a doorstep with a VERIFIED one under the same name — and the
     verified row's COUNTY is kept, not just the fact of the match, because that
     is what the "…roll" chip names. */
  for (const [name, rows] of groups) {
    const verified = new Map(
      rows
        .filter((r) => r.matches)
        .map((r) => [addressKey(r.record.address), r.record.county] as const),
    );
    groups.set(
      name,
      rows.map((row) => {
        const twin = row.matches
          ? undefined
          : verified.get(addressKey(row.record.address));

        return {
          ...row,
          sameDoorstep: twin !== undefined,
          twinCounty: twin ?? null,
        };
      }),
    );
  }

  /*
   * WHY IT IS DISABLED, IN THE BUTTON'S OWN WORDS — and there are two gates
   * now, not three.
   *
   * The gates are named one at a time, in the order the reader can act on
   * them, and the unmet one is both the tooltip and the line beside the
   * button. A single fixed message read as a lie the moment one of the two was
   * satisfied and the button stayed grey.
   *
   * Being signed out no longer blocks this button. This step files nothing —
   * it settles which addresses are yours and moves on — and a step that writes
   * nothing has no business demanding an account. The sign-in requirement
   * belongs to step 4, which is where the claim is actually posted, so that is
   * where it stops the reader. The note below still warns early.
   */
  const blocked =
    confirmed.length === 0
      ? "Tick at least one address above."
      : !attested
        ? "Tick the good-faith statement above."
        : null;

  const canConfirm = blocked === null;

  return (
    <div className="grid gap-[18px]">
      <StepIntro
        step={3}
        icon={ShieldCheck}
        eyebrow="Step 3 of 5 · Prove it's yours"
        onBack={onBack}
        backLabel="Back to the records"
        title="Address-verify the owner record before you file the claim"
      />

      {claimSet.loading && (
        <FlowLoading label="Checking these names against every county roll…" />
      )}

      {claimSet.error && (
        <FlowError message={claimSet.error} onRetry={onBack} />
      )}

      {/*
        ONE CARD PER OWNER NAME, WITH ITS OWN HEADED BAND.

        The groups used to be bands inside a single bordered list, separated by
        a hairline. That read as one long table with subheadings — the reader
        could not tell where one name's addresses ended and the next began, and
        the verified state of a name had nowhere to live.

        Each name is now its own card: a header that says what the reader is
        being asked to do and whether they have done it, and the addresses as
        separate tiles beneath. `divide-y` is gone with it, because a tile that
        can be ticked should be bounded on all four sides — that is what makes
        the tick look like it belongs to something.
      */}
      {groups.size > 0 && (
        <div className="grid gap-[14px]">
          {[...groups.entries()].map(([name, rows]) => {
            const picked = rows.filter((r) =>
              confirmed.includes(recordKey(r.record)),
            ).length;

            return (
              <section
                key={name}
                className="overflow-hidden rounded-mv border border-mv-line bg-mv-card"
              >
                <header className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-mv-line bg-linear-to-r from-mv-portal-wash/55 to-mv-card px-4 py-[14px]">
                  <span className="flex h-[36px] w-[36px] flex-none items-center justify-center rounded-full bg-mv-deep text-mv-on-deep">
                    <House aria-hidden="true" className="h-[17px] w-[17px]" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <h3 className="text-[15px] leading-[1.3] font-bold text-mv-ink">
                      {name}
                    </h3>
                    {/* THE COUNT IS THE SUBTITLE WHEN THERE IS ONE TO GIVE.
                        A single address has nothing to choose between, so it
                        gets the instruction; several get the tally, which is
                        the question this step is actually asking. */}
                    <p className="mt-[3px] text-[12px] leading-[1.45] text-mv-muted">
                      {rows.length === 1
                        ? "Verify the address associated with the owner record."
                        : `Verify which of these ${rows.length} addresses are yours — ${picked} selected.`}
                    </p>
                  </div>

                  {/*
                    THE PILL REPORTS, IT DOES NOT DECORATE.

                    "Address verified" is only true once the reader has ticked
                    something under this name — printing it on an untouched
                    group would tell them a step is done that they have not
                    taken, and the button below would still be grey with no
                    visible reason why.
                  */}
                  {picked > 0 ? (
                    <span className="flex flex-none items-center gap-[6px] rounded-full border border-mv-mint-line bg-mv-mint px-[11px] py-[5px] text-[11.5px] font-semibold text-mv-green-ink">
                      <CircleCheck
                        aria-hidden="true"
                        className="h-[13px] w-[13px]"
                      />
                      Address verified
                    </span>
                  ) : (
                    <span className="flex flex-none items-center gap-[6px] rounded-full border border-mv-line bg-mv-card px-[11px] py-[5px] text-[11.5px] font-semibold text-mv-muted">
                      <Circle
                        aria-hidden="true"
                        className="h-[13px] w-[13px]"
                      />
                      Not verified yet
                    </span>
                  )}
                </header>

                <div className="grid gap-[10px] p-[12px]">
                  {rows.map(({ record, matches, sameDoorstep, twinCounty }) => {
                    const key = recordKey(record);
                    const ticked = confirmed.includes(key);

                    /* WHAT THIS ROW IS, IN THE ENDPOINT'S TERMS. `null` for a
                       plain other-address row, which then leads with its own
                       county instead. */
                    const lead = matches
                      ? "Address you searched"
                      : sameDoorstep
                        ? "Same address"
                        : null;

                    return (
                      <div
                        key={key}
                        className={`rounded-mv border transition-colors ${
                          ticked
                            ? "border-mv-mint-edge bg-mv-mint/35"
                            : "border-mv-line bg-mv-card"
                        }`}
                      >
                        <label
                          className={`flex cursor-pointer items-center gap-3 rounded-mv px-[14px] py-[12px] ${
                            ticked ? "" : "hover:bg-mv-hover"
                          }`}
                        >
                          {/*
                            THE BOX IS DRAWN, NOT ACCENTED.

                            `accent-color` gives the platform's own checkbox,
                            which is a different shape and a different green on
                            every OS — and at 15px it was the one part of a
                            ticked row you could not see from a foot away. The
                            input stays as the control and the accessible
                            state; the square beside it is what the reader
                            actually looks at.
                          */}
                          <input
                            type="checkbox"
                            checked={ticked}
                            onChange={(e) =>
                              onToggleRecord(key, e.target.checked)
                            }
                            className="peer sr-only"
                          />
                          <span
                            aria-hidden="true"
                            className={`flex h-[20px] w-[20px] flex-none items-center justify-center rounded-[6px] border transition-colors peer-focus-visible:ring-[3px] peer-focus-visible:ring-[rgba(84,191,150,.28)] ${
                              ticked
                                ? "border-mv-green-deep bg-mv-green-deep"
                                : "border-mv-line-strong bg-mv-card"
                            }`}
                          >
                            {ticked && (
                              <Check
                                strokeWidth={3}
                                className="h-[13px] w-[13px] text-white"
                              />
                            )}
                          </span>

                          {/* THE ADDRESS AND WHERE IT CAME FROM — the column
                              that answers "is this me". */}
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] leading-[1.4] font-bold text-mv-green-deep">
                              {record.address || "No address on file"}
                            </p>

                            {/* THE SOURCE LINE NAMES ROLLS, IT DOES NOT
                                PROMISE A MECHANISM. These once read "verifies
                                instantly" and "we post a code before it
                                joins"; neither is something this system does.
                                Every part of the line now comes off the record
                                itself. */}
                            <p className="mt-[6px] flex flex-wrap items-center gap-x-[7px] gap-y-1 text-[11.5px] text-mv-muted">
                              <span className="flex items-center gap-[4px]">
                                <MapPin
                                  aria-hidden="true"
                                  className="h-[12px] w-[12px] flex-none"
                                />
                                {lead ?? `${record.county} County`}
                              </span>

                              {twinCounty && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <Badge tone="slate" size="xs">
                                    {twinCounty} roll
                                  </Badge>
                                </>
                              )}

                              {lead && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span>{record.county} County</span>
                                </>
                              )}

                              <span aria-hidden="true">·</span>
                              <span>RRC + {record.county} CAD</span>
                            </p>
                          </div>

                          {/* THE NUMBERS, RIGHT-ALIGNED IN THEIR OWN COLUMN,
                              so four rows under one name compare down the page
                              instead of starting at a different x each time.

                              Masked on step 2, shown from here on: that list
                              is every name matching a search, and printing a
                              figure against a stranger's record is the one
                              thing this flow promised not to do. Picking the
                              record is the confirmation it waited for. */}
                          <div className="flex-none text-right">
                            <p className="text-[13px] font-bold text-mv-ink tabular-nums">
                              {money(record.appraisedValue)}
                            </p>
                            <p className="mt-[3px] text-[11.5px] text-mv-muted">
                              {record.leaseCount} lease
                              {record.leaseCount === 1 ? "" : "s"}
                              {record.operatorCount > 0 &&
                                ` · ${record.operatorCount} operator${record.operatorCount === 1 ? "" : "s"}`}
                            </p>
                          </div>

                          {/* THE TRIGGER IS IN THE ROW, ON ONE LINE WITH
                              everything else — under the row it cost each
                              record a third line and a band of empty space
                              above it. */}
                          <AddressEditButton
                            reported={reported.includes(key)}
                            onOpen={() => setEditingKey(key)}
                          />
                        </label>

                        {/* The panel opens BELOW, inside the same tile, where
                            it has the full width the field needs. */}
                        {editingKey === key && (
                          <div className="px-[14px] pb-[13px]">
                            <AddressEditPanel
                              owner={record.name}
                              county={record.county}
                              address={record.address}
                              memberId={memberId}
                              onReported={() => {
                                setReported((keys) => [...keys, key]);
                                setEditingKey(null);
                              }}
                              onCancel={() => setEditingKey(null)}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {!claimSet.loading && !claimSet.error && (
        <ClaimCheckbox checked={attested} onChange={onAttest}>
          <b className="font-semibold text-mv-ink">
            I have a good-faith basis and authority to claim this record
          </b>{" "}
          — for myself, a family member or entity I represent, or an estate I
          administer. Claiming never changes legal ownership.
        </ClaimCheckbox>
      )}

      <GuideNote title="What happens next">
        These addresses settle WHICH owner names the claim covers. Nothing is
        filed here — the next step shows every lease those names hold statewide,
        and the button under that list is what commits. Zero public-record
        mutation; reversible via Settings — unclaim.
      </GuideNote>

      {/* A HEADS-UP, NOT A BARRIER. Step 4 is where signing in actually stops
          the reader, but finding that out one screen earlier is worth the
          line — nobody wants to pick addresses and then be sent to a login. */}
      {memberId === null && (
        <p className="rounded-mv border border-mv-sand-line bg-mv-sand-tint px-4 py-3 text-[12px] leading-[1.55] text-mv-sand">
          <b className="font-bold">A claim needs an account to belong to.</b>{" "}
          <Link
            href="/login?next=/mineralownersite/claim"
            className="font-semibold underline underline-offset-2"
          >
            Sign in
          </Link>{" "}
          before the last step files it — nothing you have entered is lost.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-mv-line pt-[18px]">
        <PortalButton
          variant="primary"
          onClick={onConfirm}
          disabled={!canConfirm}
          className={canConfirm ? undefined : "cursor-not-allowed opacity-50"}
          title={blocked ?? undefined}
        >
          {/* The count lives in each group's "N of M addresses selected", so
              the button is free to say where it goes instead of repeating it. */}
          Review leases →
        </PortalButton>
      </div>
    </div>
  );
}

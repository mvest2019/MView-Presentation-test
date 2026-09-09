"use client";

import { ShieldCheck } from "lucide-react";
import Link from "next/link";

import { Badge } from "../../../_components/ui/badge";
import { PortalButton } from "../../../_components/ui/button";
import { addressKey, money, recordKey } from "../../_lib/claim-format";
import type { ClaimSet, OwnerRecord } from "../../_lib/claim-types";
import type { Async } from "../claim-wizard";
import { FlowError, FlowLoading } from "../flow-state";
import { GuideNote } from "../guide-note";
import { StepIntro } from "../step-intro";
import { AddressEdit } from "./address-edit";
import { ClaimCheckbox } from "./claim-checkbox";

/** One record the endpoint returned, and how it should be badged. */
interface AddressRow {
  record: OwnerRecord;
  /** The endpoint put this at the address that was searched — `selected`. */
  matches: boolean;
  /** Not `selected`, but the same doorstep as one that is. */
  sameDoorstep: boolean;
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
 * exact address and with the same name at OTHER addresses. That split IS the
 * address verification: the first verifies instantly, the rest need a posted
 * code before they attach.
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
      { record, matches, sameDoorstep: false },
    ]);
  }

  /* A row shares a doorstep with a VERIFIED one under the same name. */
  for (const [name, rows] of groups) {
    const verified = new Set(
      rows.filter((r) => r.matches).map((r) => addressKey(r.record.address)),
    );
    groups.set(
      name,
      rows.map((row) => ({
        ...row,
        sameDoorstep:
          !row.matches && verified.has(addressKey(row.record.address)),
      })),
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

      {groups.size > 0 && (
        <div className="divide-y divide-mv-line overflow-hidden rounded-mv border border-mv-line">
          {[...groups.entries()].map(([name, rows]) => {
            const picked = rows.filter((r) =>
              confirmed.includes(recordKey(r.record)),
            ).length;

            return (
              <section key={name}>
                <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 bg-mv-portal-wash/60 px-4 py-[10px]">
                  <h3 className="text-[12.5px] font-extrabold tracking-[.04em] text-mv-ink uppercase">
                    {name}
                  </h3>
                  <p className="text-[11.5px] text-mv-muted">
                    {picked} of {rows.length} address
                    {rows.length === 1 ? "" : "es"} selected
                  </p>
                </header>

                <div className="divide-y divide-mv-line border-t border-mv-line">
                  {rows.map(({ record, matches, sameDoorstep }) => {
                    const key = recordKey(record);
                    return (
                      <label
                        key={key}
                        className="flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors hover:bg-mv-hover"
                      >
                        <input
                          type="checkbox"
                          checked={confirmed.includes(key)}
                          onChange={(e) =>
                            onToggleRecord(key, e.target.checked)
                          }
                          className="mt-[2px] h-[15px] w-[15px] flex-none cursor-pointer accent-mv-green-deep outline-none focus-visible:ring-[3px] focus-visible:ring-[rgba(84,191,150,.28)]"
                        />

                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-bold text-mv-ink">
                            {record.address || "No address on file"}
                          </p>

                          {/* THREE BADGES, NOT TWO. The third is the reason
                                these rows are no longer merged: a row that is
                                the SAME doorstep as a verified one, written
                                differently by another county's roll, is not a
                                "different address" and must not be told it
                                needs a posted code. */}
                          <p className="mt-[5px]">
                            {matches ? (
                              <Badge tone="mint" size="xs">
                                Matches your address · verifies instantly
                              </Badge>
                            ) : sameDoorstep ? (
                              <Badge tone="mint" size="xs">
                                Same address on the {record.county} roll ·
                                verifies instantly
                              </Badge>
                            ) : (
                              <Badge tone="estimate" size="xs">
                                Different address · we post a code before it
                                joins
                              </Badge>
                            )}
                          </p>

                          <p className="mt-[6px] flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-mv-muted">
                            {/* THE APPRAISED VALUE IS SHOWN HERE, AND ONLY
                                HERE ONWARDS. Step 2 masks it — "$•,•••, shown
                                once confirmed" — because that list is every
                                name matching a search, and printing a figure
                                against records belonging to strangers is the
                                one thing this flow promised not to do. By this
                                step the reader has picked the record, which is
                                the confirmation that promise was waiting on. */}
                            <span className="font-semibold text-mv-ink">
                              {money(record.appraisedValue)}
                            </span>
                            <span>
                              {record.leaseCount} lease
                              {record.leaseCount === 1 ? "" : "s"}
                            </span>
                            <span>
                              {record.county} County
                              {record.operatorCount > 0 &&
                                ` · ${record.operatorCount} operator${record.operatorCount === 1 ? "" : "s"}`}
                            </span>
                            {/* The sources step 1 already names. */}
                            <span>RRC + {record.county} CAD</span>
                          </p>

                          {/* WRONG ADDRESS ON THE ROLL? Report it here, against
                              the row it belongs to, rather than from one button
                              at the foot of the step that could only ever mean
                              the first record. */}
                          <span className="mt-[8px] flex">
                            <AddressEdit
                              owner={record.name}
                              county={record.county}
                              address={record.address}
                              memberId={memberId}
                            />
                          </span>
                        </div>
                      </label>
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
          {`Continue with ${confirmed.length} address${confirmed.length === 1 ? "" : "es"} →`}
        </PortalButton>

        {/* The same reason as the tooltip, said where a touch reader can read
            it — there is no hover on a phone. */}
        {blocked && (
          <p className="text-[12px] font-semibold text-mv-sand">{blocked}</p>
        )}
      </div>
    </div>
  );
}

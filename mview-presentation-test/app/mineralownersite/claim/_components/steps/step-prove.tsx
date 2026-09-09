"use client";

import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Badge } from "../../../_components/ui/badge";
import { PortalButton } from "../../../_components/ui/button";
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
                    const ticked = confirmed.includes(key);

                    return (
                      <div key={key}>
                        {/*
                          A TICKED ROW LOOKS TICKED FROM ACROSS THE PAGE.
                          Selection used to live entirely in a 15px checkbox, so
                          a group of four rows gave no sense of what was taken
                          without reading each box. The mint wash and the green
                          edge say it at a glance; the checkbox stays as the
                          control and the accessible state.
                        */}
                        <label
                          className={`flex cursor-pointer items-center gap-3 border-l-[3px] px-4 py-[12px] transition-colors ${
                            ticked
                              ? "border-mv-green-deep bg-mv-mint/30"
                              : "border-transparent hover:bg-mv-hover"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={ticked}
                            onChange={(e) =>
                              onToggleRecord(key, e.target.checked)
                            }
                            className="h-[15px] w-[15px] flex-none cursor-pointer accent-mv-green-deep outline-none focus-visible:ring-[3px] focus-visible:ring-[rgba(84,191,150,.28)]"
                          />

                          {/* THE ADDRESS AND WHAT IT IS — the column that
                              answers "is this me". */}
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] leading-[1.4] font-bold text-mv-ink">
                              {record.address || "No address on file"}
                            </p>

                            {/* WHERE THE ROW CAME FROM, NOT A PROMISE ABOUT IT.
                                These said "verifies instantly" and "we post a
                                code before it joins" — neither is something
                                this system does. They now name which part of
                                the `/same-name` answer the row is. */}
                            <p className="mt-[6px] flex flex-wrap items-center gap-2">
                              {matches ? (
                                <Badge tone="mint" size="xs">
                                  Address you searched
                                </Badge>
                              ) : sameDoorstep ? (
                                <Badge tone="mint" size="xs">
                                  Same address · {record.county} roll
                                </Badge>
                              ) : (
                                <Badge tone="slate" size="xs">
                                  Other address on file
                                </Badge>
                              )}
                              <span className="text-[11.5px] text-mv-muted">
                                {record.county} County · RRC + {record.county}{" "}
                                CAD
                              </span>
                            </p>
                          </div>

                          {/* THE NUMBERS, RIGHT-ALIGNED IN THEIR OWN COLUMN.
                              They were the tail of a wrapping meta line, so the
                              value started at a different x on every row and
                              the group could not be read down. Ranged right on
                              a fixed column, four rows compare at a glance —
                              which is the actual question a list of addresses
                              under one name is asking. */}
                          <div className="flex-none text-right">
                            {/* Masked on step 2, shown from here on: that list
                                is every name matching a search, and printing a
                                figure against a stranger's record is the one
                                thing this flow promised not to do. Picking the
                                record is the confirmation it waited for. */}
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
                              EVERYTHING ELSE. It used to sit under the row,
                              which cost each record a third line and left a
                              band of empty space above it — a list of four
                              addresses ran to nearly four hundred pixels for
                              eight lines of text. */}
                          <AddressEditButton
                            reported={reported.includes(key)}
                            onOpen={() => setEditingKey(key)}
                          />
                        </label>

                        {/* The panel opens BELOW, where it has the full width
                            the field needs. */}
                        {editingKey === key && (
                          <div
                            className={`border-l-[3px] px-4 pb-[13px] ${
                              ticked
                                ? "border-mv-green-deep bg-mv-mint/30"
                                : "border-transparent"
                            }`}
                          >
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
          {`Continue with ${confirmed.length} address${confirmed.length === 1 ? "" : "es"} →`}
        </PortalButton>
      </div>
    </div>
  );
}

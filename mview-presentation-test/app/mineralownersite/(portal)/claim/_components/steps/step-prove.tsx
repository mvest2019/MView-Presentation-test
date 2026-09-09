"use client";

import { LoaderCircle, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Badge } from "../../../../_components/ui/badge";
import { PortalButton } from "../../../../_components/ui/button";
import { postAddressCorrection } from "../../_api/claim-api";
import { addressKey, recordKey } from "../../_lib/claim-format";
import type { ClaimSet, OwnerRecord } from "../../_lib/claim-types";
import type { Async } from "../claim-wizard";
import { FlowError, FlowLoading } from "../flow-state";
import { GuideNote } from "../guide-note";
import { StepIntro } from "../step-intro";
import { ClaimCheckbox } from "./claim-checkbox";

/**
 * ONE ADDRESS under an owner name — which may be several county records that
 * all name the same doorstep. See `addressKey`.
 */
interface AddressRow {
  /** The record the tick is keyed on: the verifying one where there is one. */
  record: OwnerRecord;
  matches: boolean;
  /** Every county whose roll carries this name at this address. */
  counties: string[];
  /** Summed across those counties — they hold different leases. */
  leaseCount: number;
  /** Distinct operators across them, not a sum of per-county counts. */
  operatorCount: number;
}

/**
 * Fold a name's county records into one row per real address.
 *
 * THE VERIFYING RECORD WINS THE ROW. When one spelling matched the address
 * that was searched and another did not, the address IS verified — badging the
 * merged row "different address, we post a code" would be false.
 *
 * Nothing is dropped by merging: a claim is filed on the owner NAME and the
 * backend takes every lease that name holds statewide, so the folded-away
 * county's leases come along either way. The row states them so the count on
 * screen still adds up.
 */
function foldAddresses(rows: AddressRow[]): AddressRow[] {
  const byAddress = new Map<string, AddressRow>();

  for (const row of rows) {
    const key = addressKey(row.record.address);
    const seen = byAddress.get(key);

    if (!seen) {
      byAddress.set(key, row);
      continue;
    }

    const operators = new Set(
      [...seen.record.leases, ...row.record.leases]
        .map((l) => l.operator)
        .filter((o): o is string => o !== null && o !== ""),
    );

    byAddress.set(key, {
      /* The verifying spelling is the one the reader ticks and reads. */
      record: seen.matches ? seen.record : row.record,
      matches: seen.matches || row.matches,
      counties: [...new Set([...seen.counties, ...row.counties])],
      leaseCount: seen.leaseCount + row.leaseCount,
      operatorCount: operators.size,
    });
  }

  return [...byAddress.values()];
}

/**
 * STEP 3 — address-verify, then the claim is written.
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
 * ── THREE GATES, AND ALL OF THEM ARE REAL ──
 *
 * At least one address, the good-faith attestation, AND a member id — the
 * endpoint rejects an anonymous claim with a 400, so a signed-out reader is
 * told to sign in rather than being allowed to press a button that cannot work.
 */
export function StepProve({
  claimSet,
  memberId,
  confirmed,
  onToggleRecord,
  attested,
  onAttest,
  claiming,
  claimError,
  onConfirm,
  onBack,
  alreadyClaimed,
}: {
  claimSet: Async<ClaimSet>;
  memberId: number | null;
  /** Ticked record keys — county|name|address, never the address alone. */
  confirmed: string[];
  onToggleRecord: (key: string, checked: boolean) => void;
  attested: boolean;
  onAttest: (value: boolean) => void;
  claiming: boolean;
  claimError: string | null;
  onConfirm: () => void;
  onBack: () => void;
  /** The claim is already filed and step 4 sent the reader back to review it. */
  alreadyClaimed: boolean;
}) {
  const records = claimSet.data?.records ?? [];
  const others = claimSet.data?.others ?? [];
  const primary = records[0] ?? null;

  /* Grouped by owner name, verified addresses first within each group, then
     folded so one doorstep is one row however many counties spell it. */
  const collected = new Map<string, AddressRow[]>();
  const add = (record: OwnerRecord, matches: boolean) =>
    collected.set(record.name, [
      ...(collected.get(record.name) ?? []),
      {
        record,
        matches,
        counties: [record.county],
        leaseCount: record.leaseCount,
        operatorCount: record.operatorCount,
      },
    ]);

  for (const record of records) add(record, true);
  for (const record of others) add(record, false);

  const groups = new Map(
    [...collected.entries()].map(([name, rows]) => [name, foldAddresses(rows)]),
  );

  /*
   * WHY IT IS DISABLED, IN THE BUTTON'S OWN WORDS.
   *
   * This used to be one boolean with one fixed tooltip — "tick an address and
   * the good-faith statement" — which read as a lie the moment BOTH were
   * ticked and the button stayed grey. The third gate, being signed out, was
   * stated only in a note further up the page that a reader aiming at the
   * button never looks at.
   *
   * So the gates are named one at a time, in the order the reader can act on
   * them, and the unmet one is the tooltip.
   */
  const blocked = alreadyClaimed
    ? /* Nothing left to gate — the write is done. */ null
    : confirmed.length === 0
      ? "Tick at least one address above."
      : !attested
        ? "Tick the good-faith statement above."
        : memberId === null
          ? "Sign in first — a claim has to belong to an account."
          : null;

  const canConfirm = blocked === null && !claiming;

  return (
    <div className="grid gap-[18px]">
      <StepIntro
        step={3}
        icon={ShieldCheck}
        eyebrow="Step 3 of 5 · Prove it's yours"
        title="Address-verify the owner record before the claim is written"
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
                  {rows.map(
                    ({
                      record,
                      matches,
                      counties,
                      leaseCount,
                      operatorCount,
                    }) => {
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

                            <p className="mt-[5px]">
                              {matches ? (
                                <Badge tone="mint" size="xs">
                                  Matches your address · verifies instantly
                                </Badge>
                              ) : (
                                <Badge tone="estimate" size="xs">
                                  Different address · we post a code before it
                                  joins
                                </Badge>
                              )}
                            </p>

                            <p className="mt-[6px] flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-mv-muted">
                              <span>
                                {leaseCount} lease{leaseCount === 1 ? "" : "s"}
                              </span>
                              <span>
                                {counties.join(" & ")}{" "}
                                {counties.length === 1 ? "County" : "counties"}
                                {operatorCount > 0 &&
                                  ` · ${operatorCount} operator${operatorCount === 1 ? "" : "s"}`}
                              </span>
                              {/* The sources step 1 already names — one CAD per
                                county that carries this address. */}
                              <span>RRC + {counties.join(", ")} CAD</span>
                            </p>
                          </div>
                        </label>
                      );
                    },
                  )}
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

      <GuideNote title="What confirming does">
        Confirm claims every lease these owner names hold, statewide — not only
        the ones in the county you searched. The records join your account in
        one transaction. Zero public-record mutation; reversible via Settings —
        unclaim.
      </GuideNote>

      {memberId === null && (
        <p className="rounded-mv border border-mv-sand-line bg-mv-sand-tint px-4 py-3 text-[12px] leading-[1.55] text-mv-sand">
          <b className="font-bold">A claim needs an account to belong to.</b>{" "}
          <Link
            href="/login?next=/mineralownersite/claim"
            className="font-semibold underline underline-offset-2"
          >
            Sign in
          </Link>{" "}
          and this step will file it — nothing you have entered is lost.
        </p>
      )}

      {/* WHY THIS SCREEN LOOKS DIFFERENT ON THE WAY BACK. Without it, a reader
          who steps back from their leases finds a confirm screen and reasonably
          assumes nothing has been filed yet. */}
      {alreadyClaimed && (
        <p className="rounded-mv border border-mv-mint-line bg-mv-mint px-4 py-3 text-[12px] leading-[1.55] text-mv-green-ink">
          <b className="font-bold">This claim is already filed.</b> You are
          looking at what was claimed — nothing here will be sent again. Unclaim
          any of it later from Settings.
        </p>
      )}

      {claimError && <FlowError message={claimError} onRetry={onConfirm} />}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-mv-line pt-[18px]">
        <PortalButton
          variant="primary"
          onClick={onConfirm}
          disabled={!canConfirm}
          className={canConfirm ? undefined : "cursor-not-allowed opacity-50"}
          title={blocked ?? undefined}
        >
          {claiming && (
            <LoaderCircle
              aria-hidden="true"
              className="h-[15px] w-[15px] animate-spin"
            />
          )}
          {claiming
            ? "Filing your claim…"
            : alreadyClaimed
              ? /* A claim is not filed twice, so the label stops promising to
                   file one. It moves the reader on instead. */
                "Back to your leases →"
              : `Confirm ${confirmed.length} address${confirmed.length === 1 ? "" : "es"} & continue →`}
        </PortalButton>

        {/* The same reason as the tooltip, said where a touch reader can read
            it — there is no hover on a phone. */}
        {blocked && !claiming && (
          <p className="text-[12px] font-semibold text-mv-sand">{blocked}</p>
        )}

        <AddressCorrection
          owner={primary?.name ?? ""}
          county={primary?.county ?? ""}
          oldAddress={primary?.address ?? ""}
          memberId={memberId}
        />

        <button
          type="button"
          onClick={onBack}
          className="ml-auto cursor-pointer text-[12px] font-semibold text-mv-green-deep underline underline-offset-2"
        >
          ← Back to the records
        </button>
      </div>
    </div>
  );
}

/**
 * "SOMETHING LOOKS WRONG" → `POST /owners/address-correction`.
 *
 * IT ASKS FOR THE NEW ADDRESS BEFORE IT SENDS. The endpoint requires
 * `newAddress`, so a button that fired on click could only ever post an empty
 * correction. Cancel sends nothing.
 *
 * The POST is fire-and-forget by contract — it returns no state the flow acts
 * on — so the control acknowledges in place instead of waiting on a response.
 */
function AddressCorrection({
  owner,
  county,
  oldAddress,
  memberId,
}: {
  owner: string;
  county: string;
  oldAddress: string;
  memberId: number | null;
}) {
  const [sent, setSent] = useState(false);

  return (
    <PortalButton
      variant="ghost"
      size="sm"
      disabled={sent || !owner}
      title="Tell us the mailing address on this record is out of date"
      onClick={() => {
        const newAddress = window.prompt(
          "What is the correct mailing address for this record?",
          oldAddress,
        );
        if (!newAddress || newAddress.trim() === oldAddress.trim()) return;
        postAddressCorrection(
          { owner, county, oldAddress, newAddress: newAddress.trim() },
          memberId,
        );
        setSent(true);
      }}
    >
      {sent ? "Correction sent ✓" : "Something looks wrong"}
    </PortalButton>
  );
}

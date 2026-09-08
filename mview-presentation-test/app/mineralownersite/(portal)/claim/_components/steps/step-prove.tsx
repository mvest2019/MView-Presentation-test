"use client";

import { Building2, Check, LoaderCircle, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Badge } from "../../../../_components/ui/badge";
import { PortalButton } from "../../../../_components/ui/button";
import { postAddressCorrection } from "../../_api/claim-api";
import { mailCity } from "../../_lib/claim-format";
import type { OwnerRecord, SameNameResult } from "../../_lib/claim-types";
import type { Async } from "../claim-wizard";
import { FlowError, FlowLoading } from "../flow-state";
import { GuideNote } from "../guide-note";
import { StepIntro } from "../step-intro";
import { ClaimCheckbox } from "./claim-checkbox";

/**
 * STEP 3 — address-verify, then the claim is written.
 *
 * ── THE ENDPOINT DOES THE DISCRIMINATING, NOT A FLAG WE SET ──
 *
 * `GET /owners/same-name` answers with `selected` — the record at the address
 * that was picked — and `records`, the same name at OTHER addresses. That split
 * IS the address verification: the first is the reader's record, the rest need
 * a mailed code before they can attach. Nothing here decides which is which.
 *
 * ── THE ONE STEP THAT COMMITS, AND EVERY AFFORDANCE SAYS SO ──
 *
 * Confirm posts `/owners/claim`. The caption bar above reads "This is the step
 * that commits", the guide box says what the call writes, and the button counts
 * what it is about to send. Steps 1 and 2 promised nothing was committed; this
 * is where that stops being true.
 *
 * ── THREE GATES, AND ALL OF THEM ARE REAL ──
 *
 * At least one record, the good-faith attestation, AND a member id — the
 * endpoint rejects an anonymous claim with a 400, so a signed-out reader is
 * told to sign in rather than being allowed to press a button that cannot work.
 */
export function StepProve({
  sameName,
  picked,
  memberId,
  confirmed,
  onToggleRecord,
  attested,
  onAttest,
  claiming,
  claimError,
  onConfirm,
  onBack,
}: {
  sameName: Async<SameNameResult>;
  /** The step-2 pick, so the address on file can be shown while same-name loads. */
  picked: OwnerRecord | null;
  memberId: number | null;
  confirmed: string[];
  onToggleRecord: (address: string, checked: boolean) => void;
  attested: boolean;
  onAttest: (value: boolean) => void;
  claiming: boolean;
  claimError: string | null;
  onConfirm: () => void;
  onBack: () => void;
}) {
  const selected = sameName.data?.selected ?? null;
  const others = sameName.data?.others ?? [];
  const onFile = selected?.address ?? picked?.address ?? "";

  const canConfirm =
    confirmed.length > 0 && attested && memberId !== null && !claiming;

  return (
    <div className="grid gap-[18px]">
      <StepIntro
        step={3}
        icon={ShieldCheck}
        eyebrow="Step 3 of 5 · Prove it's yours"
        title="Address-verify the owner record before the claim is written"
      />

      {sameName.loading && (
        <FlowLoading label="Checking this name against every county roll…" />
      )}

      {sameName.error && <FlowError message={sameName.error} onRetry={onBack} />}

      {selected && (
        <RecordCard
          record={selected}
          matches
          checked={confirmed.includes(selected.address)}
          onToggle={(v) => onToggleRecord(selected.address, v)}
        />
      )}

      {others.map((record) => (
        <RecordCard
          key={`${record.county}|${record.address}`}
          record={record}
          matches={false}
          checked={confirmed.includes(record.address)}
          onToggle={(v) => onToggleRecord(record.address, v)}
        />
      ))}

      {!sameName.loading && !sameName.error && (
        <ClaimCheckbox checked={attested} onChange={onAttest}>
          <b className="font-semibold text-mv-ink">
            I have a good-faith basis and authority to claim this record
          </b>{" "}
          — for myself, a family member or entity I represent, or an estate I
          administer. Claiming never changes legal ownership.
        </ClaimCheckbox>
      )}

      <GuideNote title="What confirming does">
        Confirm claims every lease this owner name holds, statewide — not only
        the ones in the county you searched. The record joins your account in
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

      {claimError && <FlowError message={claimError} onRetry={onConfirm} />}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-mv-line pt-[18px]">
        <PortalButton
          variant="primary"
          onClick={onConfirm}
          disabled={!canConfirm}
          className={canConfirm ? undefined : "cursor-not-allowed opacity-50"}
          title={
            canConfirm
              ? undefined
              : "Tick the record that is yours and the good-faith statement above"
          }
        >
          {claiming && (
            <LoaderCircle
              aria-hidden="true"
              className="h-[15px] w-[15px] animate-spin"
            />
          )}
          {claiming
            ? "Filing your claim…"
            : `Confirm ${confirmed.length} record${confirmed.length === 1 ? "" : "s"} & continue →`}
        </PortalButton>

        <AddressCorrection
          owner={selected?.name ?? picked?.name ?? ""}
          county={selected?.county ?? picked?.county ?? ""}
          oldAddress={onFile}
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

/** One candidate record, with the tick that decides whether it is claimed. */
function RecordCard({
  record,
  matches,
  checked,
  onToggle,
}: {
  record: OwnerRecord;
  matches: boolean;
  checked: boolean;
  onToggle: (checked: boolean) => void;
}) {
  const operators = [...new Set(record.leases.map((l) => l.operator).filter(Boolean))];

  return (
    <article
      className={`relative overflow-hidden rounded-mv border p-4 ${
        matches ? "border-mv-green bg-mv-mint/40" : "border-mv-line bg-mv-card"
      }`}
    >
      {matches && (
        <span
          aria-hidden="true"
          className="absolute top-0 right-0 flex h-[26px] w-[30px] items-center justify-center rounded-bl-[10px] bg-mv-green-deep text-white"
        >
          <Check className="h-[14px] w-[14px]" strokeWidth={3} />
        </span>
      )}

      <div className="flex items-start gap-[10px]">
        <span className="mt-[1px] flex h-[22px] w-[22px] flex-none items-center justify-center rounded-md bg-mv-portal-wash text-mv-muted">
          <Building2 aria-hidden="true" className="h-[13px] w-[13px]" />
        </span>

        <div className="min-w-0 flex-1 pr-6">
          <div className="flex flex-wrap items-center gap-x-[10px] gap-y-1">
            <h3 className="text-[12.5px] font-bold text-mv-ink">
              {record.name} · {record.county}
            </h3>
            {matches ? (
              <Badge tone="mint" size="xs">
                Matches your mailing address
              </Badge>
            ) : (
              <Badge tone="slate" size="xs">
                Different address
              </Badge>
            )}
          </div>

          <p className="mt-[6px] text-[12px] text-mv-slate">
            {matches ? (
              <>
                <b className="font-semibold">{record.address}</b> ·{" "}
                {record.leaseCount} lease{record.leaseCount === 1 ? "" : "s"} ·{" "}
                {record.county} county
              </>
            ) : (
              <>
                {mailCity(record.address) ?? record.address} · mail for this record goes elsewhere.
                Likely a different {record.name}.
              </>
            )}
          </p>

          {matches && operators.length > 0 && (
            <p className="mt-[6px] text-[11.5px] text-mv-placeholder">
              {operators.join(" · ")}
            </p>
          )}

          <div className="mt-[10px]">
            <ClaimCheckbox checked={checked} onChange={onToggle}>
              {matches ? (
                <b className="font-semibold text-mv-ink">
                  This is me — claim this record
                </b>
              ) : (
                <>
                  <b className="font-semibold text-mv-ink">This is also mine</b>{" "}
                  (moved or family address? — we&rsquo;ll verify with a mailed
                  code before it joins your account)
                </>
              )}
            </ClaimCheckbox>
          </div>
        </div>
      </div>
    </article>
  );
}

/**
 * "SOMETHING LOOKS WRONG" → `POST /owners/address-correction`.
 *
 * IT ASKS FOR THE NEW ADDRESS BEFORE IT SENDS. The endpoint requires
 * `newAddress`, so a button that fired on click could only ever post an empty
 * correction. One `prompt` is the whole interaction the design has room for
 * here, and it is honest: cancel sends nothing.
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

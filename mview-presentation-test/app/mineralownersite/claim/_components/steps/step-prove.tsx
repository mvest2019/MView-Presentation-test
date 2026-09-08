"use client";

import { Building2, Check, ShieldCheck } from "lucide-react";

import { Badge } from "../../../_components/ui/badge";
import { PortalButton } from "../../../_components/ui/button";
import { PrototypeButton } from "../../../_components/ui/prototype-button";
import { claimCandidates, claimLeases } from "../../_lib/claim-records";
import { GuideNote } from "../guide-note";
import { StepIntro } from "../step-intro";
import { ClaimCheckbox } from "./claim-checkbox";

/** The four operators on the matching record, in the order the roll lists them. */
const operatorsOnRecord = [
  ...new Set(claimLeases.map((lease) => lease.operator).filter(Boolean)),
].join(" · ");

/**
 * STEP 3 — address-verify, then the claim is written.
 *
 * ── THE ONE STEP THAT COMMITS, AND EVERY AFFORDANCE SAYS SO ──
 *
 * The caption bar reads "This is the step that commits", the guide box lists
 * exactly what the claim event records, and the button counts what it is about
 * to attach. Steps 1 and 2 promised nothing was committed; this is where that
 * stops being true, and a flow that lets someone discover the change after the
 * fact has broken a promise it made twice.
 *
 * ── EACH RECORD IS ATTESTED SEPARATELY ──
 *
 * The design's rule, and the safety property behind it: no record is
 * auto-merged, and an off-address record needs a mailed code before it attaches.
 * So the two non-matching candidates are checkable, but their label says what
 * checking them STARTS — a posted code — rather than implying they join now.
 *
 * ── BOTH GATES ARE REAL ──
 *
 * At least one record, AND the good-faith attestation. Confirm stays disabled
 * until both hold: an attestation nobody had to tick is not an attestation.
 */
export function StepProve({
  selectedIds,
  onToggleRecord,
  attested,
  onAttest,
  onConfirm,
  onBack,
}: {
  selectedIds: string[];
  onToggleRecord: (id: string, checked: boolean) => void;
  attested: boolean;
  onAttest: (value: boolean) => void;
  onConfirm: () => void;
  onBack: () => void;
}) {
  const canConfirm = selectedIds.length > 0 && attested;

  return (
    <div className="grid gap-[18px]">
      {/* NO BODY PARAGRAPH ON THIS STEP (requested). The heading states the job.
          Nothing it said is lost: the address on file is printed on the matching
          record's own card below, the mailed-code rule is on each off-address
          record's checkbox, and what the claim event writes is in the guide box
          at the foot of the step. */}
      <StepIntro
        step={3}
        icon={ShieldCheck}
        eyebrow="Step 3 of 5 · Prove it's yours"
        title="Address-verify the owner record before the claim is written"
      />

      <div className="grid gap-3">
        {claimCandidates.map((candidate) => {
          const checked = selectedIds.includes(candidate.id);
          const matches = candidate.matchesMailing;

          return (
            <article
              key={candidate.id}
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
                      Record {candidate.id}
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
                        <b className="font-semibold">{candidate.fullAddress}</b> ·{" "}
                        {candidate.leaseCount} leases · {candidate.county} county
                      </>
                    ) : (
                      <>
                        {candidate.maskedAddress} · mail for this record goes
                        elsewhere. Likely a different {candidate.name}.
                      </>
                    )}
                  </p>

                  {matches && (
                    <p className="mt-[6px] text-[11.5px] text-mv-placeholder">
                      {operatorsOnRecord}
                    </p>
                  )}

                  <div className="mt-[10px]">
                    <ClaimCheckbox
                      checked={checked}
                      onChange={(value) => onToggleRecord(candidate.id, value)}
                    >
                      {matches ? (
                        <b className="font-semibold text-mv-ink">
                          This is me — claim this record
                        </b>
                      ) : (
                        <>
                          <b className="font-semibold text-mv-ink">
                            This is also mine
                          </b>{" "}
                          (moved or family address? — we&rsquo;ll verify with a
                          mailed code before it joins your account)
                        </>
                      )}
                    </ClaimCheckbox>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <ClaimCheckbox checked={attested} onChange={onAttest}>
        <b className="font-semibold text-mv-ink">
          I have a good-faith basis and authority to claim this record
        </b>{" "}
        — for myself, a family member or entity I represent, or an estate I
        administer. Claiming never changes legal ownership.
      </ClaimCheckbox>

      <GuideNote title="What confirming does">
        Confirm writes a claim event (record ID, masked address, basis,
        attestation version/hash, timestamp, IP, user-agent) and joins the
        record&rsquo;s lease set to the account. Zero public-record mutation;
        reversible via Settings — unclaim.
      </GuideNote>

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
          Confirm {selectedIds.length} record
          {selectedIds.length === 1 ? "" : "s"} &amp; continue →
        </PortalButton>

        <PrototypeButton
          acknowledgement="Flagged for review ✓ (prototype)"
          title="Tell us the address or the lease set looks wrong before you commit"
        >
          Something looks wrong
        </PrototypeButton>

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

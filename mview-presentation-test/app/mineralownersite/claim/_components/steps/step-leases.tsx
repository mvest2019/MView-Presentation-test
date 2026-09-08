"use client";

import { FileText, ListTree, MessageSquareWarning } from "lucide-react";

import { Badge } from "../../../_components/ui/badge";
import { PortalButton } from "../../../_components/ui/button";
import { PrototypeButton } from "../../../_components/ui/prototype-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableScroll,
} from "../../../_components/ui/table";
import { claimLeases } from "../../_lib/claim-records";
import { claimTotals, decimalInterest, money } from "../../_lib/claim-totals";
import { GuideNote } from "../guide-note";
import { StepIntro } from "../step-intro";
import { LeaseStatStrip } from "./lease-stat-strip";

/**
 * STEP 4 — the lease set that came with the record.
 *
 * ── NOTHING TO FILL IN, AND THE RAIL SAYS SO ──
 *
 * This is the only step of the five that asks for no input. It exists because
 * the claim just happened and the owner has not yet seen what it attached: the
 * moment to check "is this actually my lease set" is before the visibility
 * choice on step 5, not after. So it is a read-through with one continue
 * button, and the only other control reports a lease that should not be here.
 *
 * ── "INACTIVE" IS EXPLAINED, BECAUSE $0 READS AS "WORTHLESS" ──
 *
 * Three of the ten are inactive and the guide box is where the flow says what
 * that means: no recent volumes and a $0 modelled forward value, with ownership
 * unaffected. Without it, an owner reads three zero rows as three leases they
 * have lost. The rail's amber card makes the same point in one line.
 */
export function StepLeases({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="grid gap-[18px]">
      <StepIntro
        step={4}
        icon={ListTree}
        eyebrow="Step 4 of 5 · See your leases"
        title={
          <>
            RAYMOND SMITH · {claimTotals.count} joined leases
            <span className="block text-[15px] font-bold text-mv-slate">
              {claimTotals.producing} producing / {claimTotals.inactive} inactive
              · {claimTotals.countyList}
            </span>
          </>
        }
      >
        Full joined lease set for this record: {claimTotals.count} leases,{" "}
        {claimTotals.producing} producing / {claimTotals.inactive} inactive,{" "}
        {claimTotals.operators} operators, decimal interests as filed. Set
        membership is plan-independent — plan governs visibility only.
      </StepIntro>

      <TableScroll>
        <Table minWidth={640}>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Lease (no.)</TableHeaderCell>
              <TableHeaderCell>Operator</TableHeaderCell>
              <TableHeaderCell>County</TableHeaderCell>
              <TableHeaderCell numeric>Value</TableHeaderCell>
              <TableHeaderCell numeric>Decimal</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {claimLeases.map((lease) => (
              <TableRow key={lease.number}>
                <TableCell>
                  <span className="flex items-start gap-[6px] font-semibold text-mv-green-deep">
                    <FileText
                      aria-hidden="true"
                      className="mt-[2px] h-[13px] w-[13px] flex-none text-mv-muted"
                    />
                    <span>
                      {lease.name} ({lease.number})
                    </span>
                  </span>
                </TableCell>
                <TableCell className="text-mv-slate">
                  {lease.operator ?? (
                    <span aria-label="No operator on file">—</span>
                  )}
                </TableCell>
                <TableCell className="text-mv-slate">{lease.county}</TableCell>
                <TableCell numeric>
                  <span className="flex items-center justify-end gap-[6px]">
                    <span className="font-semibold text-mv-ink">
                      {money(lease.value)}
                    </span>
                    <Badge tone={lease.producing ? "mint" : "slate"} size="xs">
                      {lease.producing ? "Producing" : "Inactive"}
                    </Badge>
                  </span>
                </TableCell>
                <TableCell numeric className="text-mv-slate">
                  {decimalInterest(lease.decimal)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableScroll>

      <LeaseStatStrip />

      <GuideNote title='What "inactive" means'>
        Inactive = no recent PR-monthly volumes and a ~$0 modeled forward
        owner-share PV; ownership is unaffected. Where the model returns ~$0 we
        substitute the county appraisal district value, labelled as such, rather
        than displaying a zero.
      </GuideNote>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-mv-line pt-[18px]">
        <PortalButton variant="primary" onClick={onContinue}>
          Continue → step 5, choose what you see
        </PortalButton>
        <p className="flex items-start gap-[6px] text-[11.5px] leading-[1.5] text-mv-muted">
          <MessageSquareWarning
            aria-hidden="true"
            className="mt-[1px] h-[13px] w-[13px] flex-none"
          />
          <span>
            A lease here that shouldn&rsquo;t be, or one missing?
            <br />
            <PrototypeButton
              acknowledgement="Data issue reported ✓ (prototype)"
              size="sm"
              title="Opens a data-issue report against this record"
            >
              Report a data issue
            </PrototypeButton>{" "}
            — your claim stays active.
          </span>
        </p>
      </div>
    </div>
  );
}

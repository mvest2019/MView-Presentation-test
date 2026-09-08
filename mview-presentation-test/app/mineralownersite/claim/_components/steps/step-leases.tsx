"use client";

import { FileText, ListTree } from "lucide-react";

import { Badge } from "../../../_components/ui/badge";
import { PortalButton } from "../../../_components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableScroll,
} from "../../../_components/ui/table";
import { decimalInterest, money } from "../../_lib/claim-format";
import type {
  FlowLease,
  OwnerLeaseSet,
  OwnerRecord,
} from "../../_lib/claim-types";
import { FlowEmpty } from "../flow-state";
import { GuideNote } from "../guide-note";
import { StepIntro } from "../step-intro";
import { LeaseStatStrip } from "./lease-stat-strip";

/**
 * STEP 4 — the lease set the claim actually took.
 *
 * ── IT READS `allLeases`, NOT THE PICKED RECORD ──
 *
 * A county view under-reports. The backend's own example is a name showing 19
 * leases in Archer that holds 22 across two counties, and `/owners/claim` takes
 * all 22. Printing the record's own 19 here would tell an owner they claimed
 * three fewer leases than they did.
 *
 * ── THE THIN ROWS ARE THE ENDPOINT'S SHAPE, NOT A BUG ──
 *
 * `allLeases` carries lease names and values per county and nothing else.
 * Number, operator and interest exist only on the picked record, so leases in
 * that county are enriched and the rest print an em dash. An em dash is the
 * honest cell here — a zero would read as "no interest", which is a different
 * and false claim.
 *
 * ── NOTHING TO FILL IN ──
 *
 * The only step of the five that asks for no input. It exists because the claim
 * has just been written and the owner has not yet seen what it attached: the
 * moment to check "is this my lease set" is before the visibility choice, not
 * after.
 */
export function StepLeases({
  record,
  leases,
  all,
  onContinue,
}: {
  record: OwnerRecord | null;
  leases: FlowLease[];
  all: OwnerLeaseSet | null;
  onContinue: () => void;
}) {
  const counties = all?.countyList || record?.county || "";

  return (
    <div className="grid gap-[18px]">
      <StepIntro
        step={4}
        icon={ListTree}
        eyebrow="Step 4 of 5 · See your leases"
        title={
          <>
            {record?.name ?? "Your record"} · {leases.length} joined lease
            {leases.length === 1 ? "" : "s"}
            {counties && (
              <span className="block text-[15px] font-bold text-mv-slate">
                {all && all.countyCount > 1
                  ? `${all.countyCount} counties · ${counties}`
                  : counties}
              </span>
            )}
          </>
        }
      >
        Every lease this owner name holds, statewide — not only the county you
        searched. Set membership is plan-independent; your plan governs
        visibility only.
      </StepIntro>

      {leases.length === 0 ? (
        <FlowEmpty
          message="No leases came back for this record."
          hint="The claim is filed against the owner name; leases may appear once the roll is re-indexed."
        />
      ) : (
        <>
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
                {leases.map((lease) => (
                  <TableRow key={`${lease.county}|${lease.name}`}>
                    <TableCell>
                      <span className="flex items-start gap-[6px] font-semibold text-mv-green-deep">
                        <FileText
                          aria-hidden="true"
                          className="mt-[2px] h-[13px] w-[13px] flex-none text-mv-muted"
                        />
                        <span>
                          {lease.name}
                          {lease.number ? ` (${lease.number})` : ""}
                        </span>
                      </span>
                    </TableCell>
                    <TableCell className="text-mv-slate">
                      {lease.operator ?? "—"}
                    </TableCell>
                    <TableCell className="text-mv-slate">
                      {lease.county}
                    </TableCell>
                    <TableCell numeric>
                      <span className="flex items-center justify-end gap-[6px]">
                        <span className="font-semibold text-mv-ink">
                          {money(lease.value)}
                        </span>
                        <Badge
                          tone={lease.producing ? "mint" : "slate"}
                          size="xs"
                        >
                          {lease.producing ? "Valued" : "No value"}
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

          <LeaseStatStrip leases={leases} />
        </>
      )}

      <GuideNote title="Why some rows are thinner">
        Lease number, operator and decimal interest are served for the record
        you verified. Leases this name holds in other counties come back with a
        name and an appraised value only, so those columns show an em dash
        rather than a guess.
      </GuideNote>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-mv-line pt-[18px]">
        <PortalButton variant="primary" onClick={onContinue}>
          Continue → step 5, choose what you see
        </PortalButton>
      </div>
    </div>
  );
}

"use client";

import { FileText, ListTree, LoaderCircle } from "lucide-react";
import Link from "next/link";

import { Badge } from "../../../../_components/ui/badge";
import { PortalButton } from "../../../../_components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableScroll,
} from "../../../../_components/ui/table";
import { decimalInterest } from "../../_lib/claim-format";
import type { FlowLease, OwnerRecord } from "../../_lib/claim-types";
import { FlowEmpty, FlowError } from "../flow-state";
import { GuideNote } from "../guide-note";
import { StepIntro } from "../step-intro";
import { LeaseStatStrip } from "./lease-stat-strip";

/**
 * STEP 4 — the lease set the claim will take, AND THE STEP THAT FILES IT.
 *
 * ── THE WRITE LIVES HERE, NOT ON STEP 3 ──
 *
 * `POST /owners/claim` used to fire on step 3's Confirm, which meant the reader
 * committed before ever seeing what the claim covered — this screen arrived
 * afterwards and could only be a receipt for a decision already made. Now the
 * leases are on the table first and the button beneath them is the commit, so
 * "see your leases" is something the reader acts on rather than reads.
 *
 * Going back from here is therefore free: nothing has been filed yet.
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
 * ── NOTHING TO FILL IN, ONE THING TO DECIDE ──
 *
 * No field to complete: the reader's whole job here is to read the table and
 * agree that this lease set is theirs. That is the last moment the answer can
 * still be changed, which is exactly why the write waits for it.
 */
export function StepLeases({
  records,
  leases,
  ownerCount,
  memberId,
  claiming,
  claimError,
  alreadyClaimed,
  onContinue,
  onBack,
}: {
  records: OwnerRecord[];
  leases: FlowLease[];
  /** Owner names the claim will name — the unit `/owners/claim` takes. */
  ownerCount: number;
  memberId: number | null;
  claiming: boolean;
  claimError: string | null;
  /** Filed already; the button moves on instead of posting a second time. */
  alreadyClaimed: boolean;
  onContinue: () => void;
  onBack: () => void;
}) {
  /*
   * THE GATES ON THE WRITE, NAMED ONE AT A TIME.
   *
   * Already filed is not a blocker — the button moves the reader on instead of
   * posting a second claim the backend would answer with OWNER_ALREADY_CLAIMED.
   */
  const blocked = alreadyClaimed
    ? null
    : ownerCount === 0
      ? "Go back and tick at least one address."
      : memberId === null
        ? "Sign in first — a claim has to belong to an account."
        : null;

  const canFile = blocked === null && !claiming;

  /* One name if they took one record, a count if they took several — the
     heading has to describe the whole claim, not just its first row. The
     county list and the "every lease statewide" paragraph that used to sit
     under it are gone: the table below names a county on every row, so both
     were describing what the reader is already looking at. */
  const who =
    records.length === 1 ? records[0].name : `${records.length} owner records`;

  return (
    <div className="grid gap-[18px]">
      <StepIntro
        step={4}
        icon={ListTree}
        eyebrow="Step 4 of 5 · See your leases"
        onBack={onBack}
        backLabel="Back to the addresses"
        title={`${who} · ${leases.length} joined lease${leases.length === 1 ? "" : "s"}`}
      />

      {leases.length === 0 ? (
        <FlowEmpty
          message="No leases came back for this record."
          hint="The claim is filed against the owner name; leases may appear once the roll is re-indexed."
        />
      ) : (
        <>
          {/*
            THE TABLE SCROLLS ITSELF INSTEAD OF THE PAGE.

            A claim of six owner records is 20 leases and a claim of a dozen is
            far more, so the table grew without limit and pushed the thing it
            exists to justify — the button that files the claim — off the bottom
            of a screen nobody had reason to keep scrolling. Capped, the whole
            step fits: table, totals, and the commit.

            THE HEADER STICKS, which is the half that makes the cap usable. Six
            columns of bare numbers twelve rows down mean nothing without their
            names. `bg-mv-card` on the cells is not decoration — `thead` has no
            background of its own, so the body rows would otherwise scroll
            straight through the header text.

            `overscroll-contain` stops a flick inside the table carrying on into
            the page once it bottoms out.
          */}
          <TableScroll className="max-h-[440px] overflow-y-auto overscroll-contain [&_thead_th]:sticky [&_thead_th]:top-0 [&_thead_th]:z-10 [&_thead_th]:bg-mv-card">
            <Table minWidth={760}>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Lease (no.)</TableHeaderCell>
                  <TableHeaderCell>Operator</TableHeaderCell>
                  <TableHeaderCell>County</TableHeaderCell>
                  <TableHeaderCell>Play</TableHeaderCell>
                  <TableHeaderCell numeric>Decimal interest</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
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
                    {/* PLAY IS NOT SERVED. No owners endpoint carries a play,
                        formation or basin — the record has `leases`,
                        `leaseValues`, `leaseNumbers`, `interestValues` and
                        `operators`, and nothing else. The column is here as
                        asked and prints an em dash, the same as the other
                        columns the roll cannot answer; a guessed play would be
                        indistinguishable from a filed one. */}
                    <TableCell className="text-mv-slate">—</TableCell>
                    <TableCell numeric className="text-mv-slate">
                      {decimalInterest(lease.decimal)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        tone={lease.producing ? "mint" : "slate"}
                        size="xs"
                      >
                        {lease.producing ? "Valued" : "No value"}
                      </Badge>
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

      {/* SIGNING IN IS ENFORCED HERE, because this is the step that posts.
          `/owners/claim` rejects an anonymous claim with a 400, so a signed-out
          reader is told rather than handed a button that cannot work. */}
      {memberId === null && !alreadyClaimed && (
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

      {claimError && <FlowError message={claimError} onRetry={onContinue} />}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-mv-line pt-[18px]">
        <PortalButton
          variant="primary"
          onClick={onContinue}
          disabled={!canFile}
          className={canFile ? undefined : "cursor-not-allowed opacity-50"}
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
              ? /* Already filed — this only moves to the receipt. */
                "View your claim →"
              : /* NO ARROW, AND NO STEP NUMBER. Every other button in the flow
                   advances a screen; this one WRITES the claim, and an arrow
                   would file it under the same gesture as "next". The count
                   stays because it is what the reader is committing to. */
                `Claim ${leases.length} lease${leases.length === 1 ? "" : "s"}`}
        </PortalButton>
      </div>
    </div>
  );
}

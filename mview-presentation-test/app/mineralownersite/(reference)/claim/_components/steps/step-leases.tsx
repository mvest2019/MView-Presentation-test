"use client";

import {
  ArrowRight,
  CircleCheck,
  FileText,
  ListTree,
  LoaderCircle,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "../../../../_components/ui/badge";
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

/** The six columns, and how each one orders. */
type SortKey = "lease" | "operator" | "county" | "decimal" | "status";

interface Sort {
  key: SortKey;
  dir: "asc" | "desc";
}

/**
 * ORDERING THE ROWS.
 *
 * ── EMPTY CELLS SINK, WHICHEVER WAY THE COLUMN IS POINTED ──
 *
 * Operator and decimal interest are `null` on every lease outside the record's
 * own county — the endpoint does not serve them — so a naive comparator puts a
 * block of em dashes at the top of the table the first time anybody sorts by
 * either. Sorting is for finding a row, and no reader is looking for the rows
 * that have nothing in them. Missing values go last in both directions.
 *
 * ── THERE IS NO `play` KEY, BECAUSE THERE IS NO PLAY COLUMN ──
 *
 * It was here as drawn and printed an em dash on every row: no owners endpoint
 * carries a play, formation or basin — the record has `leases`, `leaseValues`,
 * `leaseNumbers`, `interestValues` and `operators`, and nothing else. A column
 * that can only ever be empty is width spent on nothing, so it is gone
 * (requested) and the five that can be answered have the room.
 */
function compare(a: FlowLease, b: FlowLease, key: SortKey): number {
  if (key === "lease") return a.name.localeCompare(b.name);
  if (key === "county") return a.county.localeCompare(b.county);
  if (key === "status") return Number(a.producing) - Number(b.producing);
  if (key === "operator") {
    if (a.operator === b.operator) return 0;
    if (!a.operator) return 1;
    if (!b.operator) return -1;
    return a.operator.localeCompare(b.operator);
  }

  if (a.decimal === b.decimal) return 0;
  if (a.decimal === null) return 1;
  if (b.decimal === null) return -1;
  return a.decimal - b.decimal;
}

/**
 * A COLUMN HEADING THAT SORTS.
 *
 * ── NO GLYPH (requested) ──
 *
 * It carried two facing chevrons at rest and a single arrow when active. Both
 * are gone, so the state is carried by WEIGHT AND COLOUR instead: the column
 * being sorted is near-black, the others are slate. That is a weaker signal
 * than an arrow and it is the trade that was asked for — five glyphs across a
 * header band is a lot of furniture for a table of six rows.
 *
 * `aria-sort` is unaffected and still names the column and its direction, so a
 * screen reader is told exactly what the arrow used to say.
 *
 * The button fills the cell rather than sitting inside it, so the whole heading
 * is the target and the cursor change covers the width of the column.
 */
function SortHeader({
  label,
  column,
  sort,
  onSort,
  numeric = false,
}: {
  label: string;
  column: SortKey;
  sort: Sort;
  onSort: (key: SortKey) => void;
  numeric?: boolean;
}) {
  const active = sort.key === column;

  return (
    <TableHeaderCell
      numeric={numeric}
      aria-sort={
        active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"
      }
      className="!p-0"
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        title={`Sort by ${label.toLowerCase()}`}
        className={`flex w-full cursor-pointer items-center gap-[5px] border-0 bg-transparent px-[14px] py-[9px] text-[11px] font-bold tracking-[0.06em] uppercase transition-colors hover:text-mv-green-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-mv-green-deep ${
          numeric ? "justify-end" : "justify-start"
        } ${active ? "text-mv-green-ink" : "text-mv-slate"}`}
      >
        {label}
      </button>
    </TableHeaderCell>
  );
}

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
  /* THE TABLE OPENS IN THE ORDER THE ENDPOINT GAVE, which groups a name's
     leases together; sorting is something the reader asks for. Lease-ascending
     is the first thing they get, because the name is the column they read. */
  const [sort, setSort] = useState<Sort>({ key: "lease", dir: "asc" });

  const sorted = useMemo(() => {
    const direction = sort.dir === "asc" ? 1 : -1;
    /* A COPY. `leases` is the wizard's state, and `Array.prototype.sort`
       mutates — sorting the prop in place would reorder what step 5 counts. */
    return [...leases].sort((a, b) => compare(a, b, sort.key) * direction);
  }, [leases, sort]);

  function sortBy(key: SortKey) {
    setSort((current) =>
      current.key === key
        ? { key, dir: current.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );
  }

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
          {/* THE TALLY FRAMES THE TABLE. It answers "how big is this claim",
              which is a question the reader has before the first row rather
              than after the last — and under a capped, self-scrolling table it
              was easy to never reach at all. */}
          <LeaseStatStrip leases={leases} />

          {/*
            THE TABLE SCROLLS ITSELF INSTEAD OF THE PAGE.

            A claim of six owner records is 20 leases and a claim of a dozen is
            far more, so the table grew without limit and pushed the thing it
            exists to justify — the button that files the claim — off the bottom
            of a screen nobody had reason to keep scrolling. Capped, the whole
            step fits: table, totals, and the commit.

            THE HEADER STICKS, which is the half that makes the cap usable. Six
            columns of bare numbers twelve rows down mean nothing without their
            names, and the header is now also the sort control — scrolled away,
            re-ordering the table would mean scrolling back up first.
            THE TINT NEEDS `!`, AND THAT IS NOT A SHORTCUT. `portal.css` styles
            `.mv-portal th` with `background: #fafbfc` and `padding: 10px 14px`
            from a bare element selector, and it is UNLAYERED — so it beats a
            Tailwind utility whatever the specificity. Without the bang the
            header kept the portal's own near-white and the cell kept 10px of
            padding on top of the sort button's own, which is where the extra
            height came from. The background is load-bearing besides: `thead`
            has none of its own, so body rows would scroll straight through the
            header text.

            `overscroll-contain` stops a flick inside the table carrying on into
            the page once it bottoms out.

            `!rounded-lg` OVERRIDES `TableScroll`'s OWN `rounded-mv` (requested:
            8px, not 12). The bang is doing real work — both are single classes,
            so which one wins is decided by Tailwind's output order rather than
            by which is written later in the attribute, and without it the
            result would be luck.

            THE SCROLLBAR IS STYLED TWICE, ON PURPOSE. `scrollbar-width` and
            `scrollbar-color` are the standard properties and are what Firefox
            reads; the `::-webkit-scrollbar` rules are what older WebKit builds
            read, and a browser that understands both simply takes the standard
            pair. Writing only one leaves the OS default — a 17px grey slab —
            in half the browsers this portal is opened in.

            `thin` rather than a width in the standard property because that is
            all it accepts; the 6px is for the WebKit side.
          */}
          <TableScroll className="!rounded-lg max-h-[440px] overflow-y-auto overscroll-contain [scrollbar-color:var(--color-mv-ink)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-[6px] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-mv-ink [&::-webkit-scrollbar-track]:bg-transparent [&_thead_th]:sticky [&_thead_th]:top-0 [&_thead_th]:z-10 [&_thead_th]:!bg-mv-line-strong">
            <Table minWidth={680}>
              <TableHead>
                <TableRow>
                  <SortHeader
                    label="Lease (no.)"
                    column="lease"
                    sort={sort}
                    onSort={sortBy}
                  />
                  <SortHeader
                    label="Operator"
                    column="operator"
                    sort={sort}
                    onSort={sortBy}
                  />
                  <SortHeader
                    label="County"
                    column="county"
                    sort={sort}
                    onSort={sortBy}
                  />
                  <SortHeader
                    label="Decimal interest"
                    column="decimal"
                    sort={sort}
                    onSort={sortBy}
                    numeric
                  />
                  <SortHeader
                    label="Status"
                    column="status"
                    sort={sort}
                    onSort={sortBy}
                  />
                </TableRow>
              </TableHead>
              <TableBody>
                {sorted.map((lease) => (
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
        </>
      )}

      <GuideNote title="Why some rows are thinner">
        Lease number, operator and decimal interest are served for the record
        you verified. Leases this name holds in other counties come back with a
        name and an appraised value only, so those columns show an em dash
        rather than a guess.
      </GuideNote>

      {/*
        THE SIGN-IN BANNER IS GONE, AND THE GATE IS NOT.

        A sand-tinted paragraph sat here whenever `memberId` was null, saying a
        claim needs an account. Step 3 already says exactly that, one screen
        earlier and before the reader has spent any time on this table — so the
        second copy told them something they had just been told, and pushed the
        button it was about further down the page.

        The button still refuses to file without a member id (see `blocked`
        above) and still says why in its own tooltip. What was removed is the
        duplicate announcement, not the rule.
      */}

      {claimError && <FlowError message={claimError} onRetry={onContinue} />}

      {/*
        THE FOOTER IS A TALLY AND A COMMIT, RANGED APART.

        What the reader is agreeing to is a number, and it now sits on the left
        as a number with its own caption rather than being carried only by the
        button's label. The button keeps the count too — it is the last thing
        read before the claim is filed, and "Claim" alone would leave the reader
        to look back up the page for how many.
      */}
      <div
        data-claim="step-actions"
        className="flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-mv-line pt-[18px]"
      >
        <div>
          <p className="text-[11px] font-semibold text-mv-muted">
            Total records
          </p>
          <p className="mt-[2px] text-[15px] font-bold text-mv-ink">
            {leases.length} joined lease{leases.length === 1 ? "" : "s"}
          </p>
        </div>

        <button
          type="button"
          onClick={onContinue}
          disabled={!canFile}
          title={blocked ?? undefined}
          className={`ml-auto inline-flex items-center gap-[9px] rounded-full bg-mv-green-deep px-[22px] py-[12px] text-[14px] font-semibold text-white shadow-[0_6px_16px_rgba(46,143,109,.28)] transition-[filter,opacity] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep ${
            canFile
              ? "cursor-pointer hover:brightness-110"
              : "cursor-not-allowed opacity-50"
          }`}
        >
          {claiming ? (
            <LoaderCircle
              aria-hidden="true"
              className="h-[17px] w-[17px] animate-spin"
            />
          ) : (
            <CircleCheck aria-hidden="true" className="h-[17px] w-[17px]" />
          )}

          {claiming
            ? "Filing your claim…"
            : alreadyClaimed
              ? /* Already filed — this only moves to the receipt. */
                "View your claim"
              : `Claim ${leases.length} lease${leases.length === 1 ? "" : "s"}`}

          <ArrowRight aria-hidden="true" className="h-[16px] w-[16px]" />
        </button>
      </div>
    </div>
  );
}

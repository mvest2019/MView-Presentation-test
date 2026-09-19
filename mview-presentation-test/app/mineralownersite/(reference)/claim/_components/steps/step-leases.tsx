"use client";

import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ChevronsUpDown,
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
import {
  decimalInterest,
  leaseDedupeKey,
  leaseTotals,
  money,
  recordKey,
} from "../../_lib/claim-format";
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
 * ── EVERY COLUMN SHOWS ITS GLYPH (requested) ──
 *
 * This has been round the houses, so the shape is written down. It began with
 * a chevron pair on all five headings; those came out, because five glyphs in
 * one header band is a lot of furniture; weight and colour alone then turned
 * out too quiet to read as sortable at all; the arrow came back on the ACTIVE
 * column with the other four revealed on hover. That last one still failed the
 * only test that matters — a reader not already moving the pointer across the
 * header cannot see which columns sort, and three of the five looked inert.
 *
 * So all five are drawn, all the time:
 *
 *   sorted column   a solid arrow, up or down, in the active colour
 *   the other four  a dimmed up-down chevron, brightening on hover and focus
 *
 * The contrast between the two is what carries the state now — shape and
 * weight rather than presence — and it survives a reader who never hovers.
 *
 * THE SLOT WAS ALWAYS RENDERED, dimmed rather than removed, so none of these
 * rounds has ever made a heading shuffle sideways as the pointer crosses it.
 *
 * `aria-sort` was never affected by any of it and still names the column and
 * its direction, so a screen reader has been told throughout exactly what the
 * arrow says.
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
        className={`group flex w-full cursor-pointer items-center gap-[5px] border-0 bg-transparent px-[14px] py-[9px] text-[11px] font-bold tracking-[0.06em] uppercase transition-colors hover:text-mv-green-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-mv-green-deep ${
          numeric ? "justify-end" : "justify-start"
        } ${active ? "text-mv-green-ink" : "text-mv-slate"}`}
      >
        {label}
        {/* The arrow points the way the rows run: up for A–Z and smallest
            first, down for the reverse — the direction `compare` is applied in,
            not a suggestion of what clicking will do next. */}
        {active ? (
          sort.dir === "asc" ? (
            <ArrowUp
              aria-hidden="true"
              className="h-[12px] w-[12px] flex-none"
              strokeWidth={2.6}
            />
          ) : (
            <ArrowDown
              aria-hidden="true"
              className="h-[12px] w-[12px] flex-none"
              strokeWidth={2.6}
            />
          )
        ) : (
          <ChevronsUpDown
            aria-hidden="true"
            className="h-[12px] w-[12px] flex-none opacity-45 transition-opacity group-hover:opacity-80 group-focus-visible:opacity-80"
          />
        )}
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
 * ── IT READS THE TICKED RECORDS, NOT `allLeases` ──
 *
 * It read `allLeases` until this list and the claim payload were found to
 * disagree. `allLeases` is the union over EVERY address the endpoint returned
 * for a name, so a reader who ticked one of two addresses on step 3 got a table
 * covering both — measured on `Brown Ellen Cochran`: 12 leases at the Martin
 * address they ticked, 7 at the Karnes one they did not, and a heading reading
 * "19 joined leases" over a request that named Martin alone.
 *
 * The wizard now builds this from the ticked records themselves. What the
 * reader approves here is what the POST asks for, which is the one guarantee
 * this screen owes them: it is the step that commits.
 *
 * ── AND THE ROWS COME THROUGH WHOLE ──
 *
 * A second thing that fixed. `allLeases` carries a lease name and value per
 * county and nothing else, so number, operator and interest could only be
 * filled in for the verified record's own county and every other county
 * printed em dashes. Each record carries that detail for its own leases, so
 * taking them from the records fills the columns. A dash now means the roll
 * left the field blank — still an em dash and not a zero, which would read as
 * "no interest" and be a different and false claim.
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
  /* ONE SORT, EVERY TABLE. The tables below are one list split by owner, not
     five unrelated ones, and a reader who asks for "by operator" means the
     question of the whole claim — per-table sort state would let two tables
     disagree and leave the reader working out which is which. Lease-ascending
     to open, because the name is the column they read. */
  const [sort, setSort] = useState<Sort>({ key: "lease", dir: "asc" });

  /*
   * THE ROWS, DEALT OUT ONE OWNER RECORD AT A TIME.
   *
   * ── EVERY LEASE LANDS IN EXACTLY ONE TABLE, AND THAT IS THE WHOLE TRICK ──
   *
   * `leases` is the wizard's union of the ticked records' leases, DEDUPLICATED:
   * one lease reached through two ticked addresses in the same county is in it
   * once. So the tables cannot simply print `record.leases` each — that lease
   * would appear under both records, the tables would sum to more than the
   * count in the heading, and the button underneath would offer to file a
   * different number again.
   *
   * Walking the records in order and skipping a row already taken by an earlier
   * one makes the tables a PARTITION of that union: same rows, same total, each
   * printed once. `seen` is what carries that between records.
   *
   * It reproduces the union exactly because it repeats the wizard's own rule —
   * same key, same order, first record wins — which is why the key is imported
   * rather than written again here. See `leaseDedupeKey`.
   *
   * ── A SKIPPED ROW IS COUNTED, NOT SWALLOWED ──
   *
   * `shared` is how many of this record's leases went to a record above it. A
   * reader who knows the address holds twelve and counts nine is looking at a
   * bug unless the screen accounts for the other three, so the section says so
   * in a line under its table.
   */
  const groups = useMemo(() => {
    const direction = sort.dir === "asc" ? 1 : -1;
    const seen = new Set<string>();

    return records.map((record) => {
      const own: FlowLease[] = [];
      let shared = 0;

      for (const lease of record.leases) {
        const key = leaseDedupeKey(lease);
        if (seen.has(key)) {
          shared += 1;
          continue;
        }
        seen.add(key);
        own.push(lease);
      }

      return {
        record,
        shared,
        totals: leaseTotals(own),
        /* `own` was built here, so sorting it in place cannot reorder
           `record.leases` underneath the wizard — which is what step 5
           counts. */
        leases: own.sort((a, b) => compare(a, b, sort.key) * direction),
      };
    });
  }, [records, sort]);

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
            ONE CARD PER OWNER RECORD, EACH SCROLLING ITS OWN LIST (requested).

            ── THE FAULT THE SPLIT FIXES ──

            Six records and 118 rows arrived as a single list with nothing in it
            naming an owner. County repeats across records and one operator
            works for several, so no column told the reader which record a row
            came from, and the one question this screen exists to ask — is this
            set mine? — could only be answered by going back a step and holding
            the addresses in your head.

            ── AND WHY THE SCROLL IS PER CARD, NOT ONE BOX ROUND THE STACK ──

            It was one capped box holding every card, which kept the commit
            button close but cut the wrong thing: the box's edge fell wherever
            560px happened to land, so a card was routinely sliced through the
            middle of its own rows with its header scrolled off above. The
            reader saw the bottom half of one owner's leases and the top of the
            next, which is the same confusion the split was meant to end.

            A card that scrolls ITSELF cannot be cut: its name and its tally sit
            outside the scrolling area and stay put, the rows move underneath
            them, and every boundary on screen is a real boundary between two
            owners rather than an artefact of where the window stopped.

            THE COST IS PAGE LENGTH, and it is bounded in the way that matters.
            The stack now grows with the number of RECORDS, not the number of
            leases — a card is at most `max-h` tall whether it holds eight rows
            or eighty — so the commit button below moves by a predictable amount
            per owner instead of being pushed down by a long roll.

            ── `max-h`, NOT `h` ──

            The ceiling is fixed; the card still hugs a short list. A record
            holding one lease in a box sized for seven is six rows of white
            space under a single line, and a stack of those reads as a rendering
            fault rather than as a tidy grid.

            ── THE STICKY HEADER COMES BACK WITH THE SPLIT ──

            It could not work under the old arrangement: each table sat in its
            own `overflow-x` box, so a sticky `thead` pinned itself to THAT box
            rather than to the outer scroller, and a box with no height limit
            never scrolls. Capping the same box is exactly what gives the header
            something to stick to, so the column names now hold while the rows
            run under them.

            The scrollbar is `TableScroll`'s own — a thin rounded thumb in the
            portal's hairline grey over its page grey, darkening on hover. It is
            deliberately not overridden here: it is the same bar every other
            scrolling table in the portal draws.
          */}
          <div className="grid gap-[12px]">
            {groups.map(({ record, leases: own, shared, totals }, index) => (
              <section
                key={recordKey(record)}
                aria-label={`Leases held by ${record.name}`}
                className="overflow-hidden rounded-mv border border-mv-line bg-mv-card"
              >
                {/* OUTSIDE THE SCROLLING AREA, which is the whole point of it:
                    whose leases these are cannot scroll away from the leases.
                    It wraps rather than truncating now that it is not sticky —
                    a static header is free to take a second line on a narrow
                    column, and an address is worth more than the line it
                    costs. */}
                <header className="flex flex-wrap items-center gap-x-[10px] gap-y-[2px] border-b border-mv-line bg-mv-card px-[14px] py-[10px]">
                  {/* The number ties the card to its row on step 3, which is
                      the screen these addresses were ticked on. */}
                  <span className="flex h-[21px] w-[21px] flex-none items-center justify-center rounded-full bg-mv-mint text-[11px] font-bold text-mv-green-deep tabular-nums">
                    {index + 1}
                  </span>

                  <span className="text-[13.5px] font-bold text-mv-ink">
                    {record.name}
                  </span>

                  <span className="min-w-0 flex-1 truncate text-[11.5px] text-mv-muted">
                    {record.address || "No address on file"} · {record.county}{" "}
                    County
                  </span>

                  <span className="flex flex-none items-baseline gap-[5px] text-[11.5px] font-semibold text-mv-muted tabular-nums">
                    <span className="text-[13px] font-extrabold text-mv-ink">
                      {own.length}
                    </span>
                    lease{own.length === 1 ? "" : "s"}
                    <span aria-hidden="true" className="text-mv-line-strong">
                      ·
                    </span>
                    <span className="font-bold text-mv-ink">
                      {money(totals.value)}
                    </span>
                  </span>
                </header>

                {own.length === 0 ? (
                  /* A RECORD CAN HONESTLY HAVE NO TABLE, and the two ways that
                     happens read differently: the roll holds nothing for it, or
                     everything it holds is already printed under a record
                     above. Saying which is the difference between an answer and
                     a blank space. */
                  <p className="px-[14px] py-[13px] text-[12px] text-mv-slate">
                    {record.leases.length === 0
                      ? "The roll carries no leases for this record."
                      : "Every lease at this address is also held at an address above, and is listed there."}
                  </p>
                ) : (
                  <TableScroll
                    bare
                    className="max-h-[320px] overflow-y-auto overscroll-contain [&_table]:table-fixed [&_thead_th]:sticky [&_thead_th]:top-0 [&_thead_th]:z-10"
                  >
                    <Table minWidth={780}>
                      {/* THE WIDTHS ARE SET BY THE WIDEST HEADING, not by the
                          cells. `numeric` stops a header wrapping, so under
                          `table-fixed` a column narrower than its own title
                          spills the title out of the cell instead of growing
                          — "Decimal interest" is the one that decides, and it
                          is why `minWidth` is 780 rather than the 680 an
                          auto-layout table needed. Narrower than that and the
                          card scrolls sideways, as this table always has.

                          FIXED WIDTHS ALSO KEEP THE CARDS IN STEP. Six separate
                          tables size their columns independently, so one long
                          operator name in one card would shift that card's
                          columns out of line with the other five. */}
                      <colgroup>
                        <col className="w-[31%]" />
                        <col className="w-[22%]" />
                        <col className="w-[12%]" />
                        <col className="w-[22%]" />
                        <col className="w-[13%]" />
                      </colgroup>
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
                        {own.map((lease) => (
                          /* KEYED ON THE WHOLE ROW, not `county|name`. That
                             pair is the flow's idea of a LEASE, and a roll
                             files two different ones under it — "(1 of 2)" and
                             "(2 of 2)" in one county — which as a React key is
                             a duplicate. */
                          <TableRow key={leaseDedupeKey(lease)}>
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
                )}

                {own.length > 0 && shared > 0 && (
                  <p className="border-t border-mv-line bg-mv-bg px-[14px] py-[7px] text-[11px] text-mv-muted">
                    {shared} further lease{shared === 1 ? "" : "s"} at this
                    address {shared === 1 ? "is" : "are"} held at an address
                    above too, and {shared === 1 ? "is" : "are"} listed there.
                  </p>
                )}
              </section>
            ))}
          </div>
        </>
      )}

      {/* THE OLD NOTE APOLOGISED FOR A WHOLE COLUMN OF EM DASHES — the table
          was built from `allLeases`, which carries a name and a value per
          county and nothing else, so only the verified record's own county
          could be filled in. It is built from the ticked records' own leases
          now, and those carry number, operator and interest per row, so the
          dashes are down to whatever the roll genuinely left blank. */}
      <GuideNote title="What this list covers">
        Every lease held at the addresses you ticked on the previous step — go
        back and tick another address to bring its leases in. A dash in a cell
        means the roll carries no lease number, operator or decimal interest for
        that row, which is left as a dash rather than a guess.
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

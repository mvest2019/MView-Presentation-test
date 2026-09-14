"use client";

import { useMemo } from "react";

import { Badge } from "../../../_components/ui/badge";
import { SearchField } from "../../../_components/ui/form-controls";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "../../../_components/ui/table";
import type { CoOwner, InviteLease, OwnerKind } from "../_lib/invite-types";
import { StepCard } from "./step-card";

/** What each kind of party is called, when the page has to say it out loud. */
const KIND_LABEL: Record<OwnerKind, string> = {
  person: "Individual",
  company: "Company",
  trust: "Trust or estate",
  operator: "Working interest",
};

/**
 * STEP 2 · WHO TO WRITE TO.
 *
 * ── A FIXED-HEIGHT CARD THAT SCROLLS INSIDE ITSELF ──
 *
 * The list used to show ten rows with the rest behind a "show all" button, and
 * pressing it grew the card to every owner on the roll and the page to several
 * screens — so reaching step 3 meant scrolling past a phone book. One card of
 * fixed height with its own scroller puts every owner within reach and leaves
 * the email where it was. The count underneath is then a fact rather than a
 * button: "24 owners · scroll the list".
 *
 * ── WHAT IS TICKED RISES TO THE TOP ──
 *
 * A row that disappears under a filter while its tick survives is a letter the
 * reader can neither see nor take back. Nothing is ever hidden from the
 * selection here: the chosen are simply sorted first, so a tick made forty rows
 * down is still findable after the search box is typed in. This is the one
 * piece of ordering that overrides "largest share first", and it is worth the
 * inconsistency.
 *
 * ── PEOPLE ONLY, UNTIL ASKED ──
 *
 * Companies, trusts and the operator are real rows on the roll and are not
 * hidden — a reader who knows the operator is on it and cannot find it assumes
 * the list is broken. They are behind one link because the page's question is
 * "who do you actually know", and an LLC in Midland is never the answer.
 *
 * ── THE KIND IS SAID ONLY WHEN IT IS NOT A PERSON ──
 *
 * Twenty rows each carrying an "Individual" chip is twenty chips saying
 * nothing. The tag appears on the rows where it changes what the reader should
 * do, and the operator's is toned as a warning because inviting it is almost
 * certainly a mistake.
 */
export function PeopleStep({
  lease,
  picked,
  onToggle,
  onClear,
  query,
  onQuery,
  showAll,
  onShowAll,
}: {
  lease: InviteLease;
  picked: Set<string>;
  onToggle: (ownerNumber: string, on: boolean) => void;
  onClear: () => void;
  query: string;
  onQuery: (next: string) => void;
  showAll: boolean;
  onShowAll: (next: boolean) => void;
}) {
  const others = lease.owners.filter((owner) => owner.kind !== "person").length;

  const matching = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return lease.owners.filter((owner) => {
      if (!showAll && owner.kind !== "person") return false;
      if (!needle) return true;
      return (
        owner.name.toLowerCase().includes(needle) ||
        (owner.city ?? "").toLowerCase().includes(needle) ||
        owner.ownerNumber.includes(needle)
      );
    });
  }, [lease, query, showAll]);

  const shown = useMemo(
    () => [
      ...matching.filter((owner) => picked.has(owner.ownerNumber)),
      ...matching.filter((owner) => !picked.has(owner.ownerNumber)),
    ],
    [matching, picked],
  );

  return (
    <StepCard
      n={2}
      title="Choose who to invite"
      action={
        <Badge tone={picked.size ? "mint" : "slate"} size="xs">
          {picked.size} chosen
        </Badge>
      }
    >
      {/* ONE CONTROL, NOT FOUR. A reader looking for their own cousin needs a
          search box; the filter and the reset are quiet links, not buttons
          competing with it. */}
      <div className="flex flex-wrap items-center gap-2">
        <SearchField
          label="Search the owners of record"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Search a name or a town"
        />
        {picked.size ? (
          <QuietButton onClick={onClear}>Clear {picked.size}</QuietButton>
        ) : null}
      </div>

      <div className="mt-[10px] max-h-[320px] overflow-y-auto overscroll-contain rounded-mv border border-mv-line">
        <Table minWidth={420}>
          <TableHead>
            <TableRow>
              {/* The header cell is empty on screen and never to a screen
                  reader: a column of checkboxes with an unnamed header is a
                  column nobody can be told the purpose of. */}
              <TableHeaderCell className="w-[38px] bg-mv-portal-wash">
                <span className="sr-only">Chosen</span>
              </TableHeaderCell>
              <TableHeaderCell className="bg-mv-portal-wash">
                Owner of record
              </TableHeaderCell>
              <TableHeaderCell numeric className="bg-mv-portal-wash">
                Share
              </TableHeaderCell>
              <TableHeaderCell className="hidden bg-mv-portal-wash min-[560px]:table-cell">
                Town
              </TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {shown.map((owner) => (
              <OwnerRow
                key={owner.ownerNumber}
                owner={owner}
                on={picked.has(owner.ownerNumber)}
                onToggle={onToggle}
              />
            ))}
            {shown.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-[12.5px] text-mv-muted">
                  Nothing matches that.
                  {!showAll && others
                    ? " Some owners of record are companies or trusts — show them below."
                    : ""}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-mv-muted">
        {/* EVERY OWNER IS IN THAT CARD, and the card is a fixed height — so
            this is a fact rather than a button that grows the page to several
            screens. "· scroll the list" is unconditional, as the reference has
            it: a threshold on it would leave the one instruction the card needs
            appearing and disappearing as the reader types in the search box. */}
        <span>
          {matching.length} {matching.length === 1 ? "owner" : "owners"}
          {query.trim() ? " matching" : ""} · scroll the list
        </span>
        {others ? (
          <QuietButton onClick={() => onShowAll(!showAll)}>
            {showAll
              ? "Show people only"
              : `Also show ${others} ${
                  others === 1
                    ? "company or trust"
                    : "companies, trusts and the operator"
                }`}
          </QuietButton>
        ) : null}
        <span className="ml-auto">Largest share first</span>
      </div>

      {showAll && lease.owners.some((owner) => owner.kind === "operator") ? (
        <p className="m-0 mt-[10px] border-l-[3px] border-l-mv-line-strong pl-[10px] text-[12px] leading-[1.55] text-mv-muted">
          The roll includes the working-interest party — the operator, who pays
          to drill rather than owning the minerals. Inviting them into a private
          owners’ group is almost certainly not what you want, and they never
          count towards a free month.
        </p>
      ) : null}
    </StepCard>
  );
}

function OwnerRow({
  owner,
  on,
  onToggle,
}: {
  owner: CoOwner;
  on: boolean;
  onToggle: (ownerNumber: string, on: boolean) => void;
}) {
  const where = owner.city
    ? `${owner.city}${owner.state ? `, ${owner.state}` : ""}`
    : null;

  return (
    <TableRow className={on ? "bg-mv-portal-row-tint" : undefined}>
      <TableCell className="pr-0">
        <input
          type="checkbox"
          checked={on}
          /* NAMED WITH THE PERSON, not "row 12". A checkbox column is
             unreadable to a screen reader without it, and "Invite MCCABE
             CORLISS K" is also the confirmation a sighted reader gets from the
             row they are on. */
          aria-label={`Invite ${owner.name}`}
          onChange={(event) => onToggle(owner.ownerNumber, event.target.checked)}
          className="mt-[3px] h-4 w-4 cursor-pointer accent-mv-green-deep"
        />
      </TableCell>
      <TableCell>
        <strong className="text-[13px] font-semibold">{owner.name}</strong>
        {owner.kind !== "person" ? (
          <span
            className={`ml-[6px] rounded-md px-[6px] py-px align-middle text-[10px] font-semibold whitespace-nowrap ${
              owner.kind === "operator"
                ? "bg-mv-amber-bg text-mv-amber"
                : "bg-mv-portal-wash text-mv-slate"
            }`}
          >
            {KIND_LABEL[owner.kind]}
          </span>
        ) : null}
        {/* THE TOWN, FOR A NARROW SCREEN ONLY. Below 560px the fourth column
            does not fit, and one fewer column is the right answer rather than a
            sideways scrollbar inside a card that already scrolls down. Exactly
            one of these two is ever visible. */}
        <span className="mt-px block text-[11.5px] text-mv-muted min-[560px]:hidden">
          {where ?? "no address on the roll"}
        </span>
      </TableCell>
      <TableCell numeric className="text-[12.5px]">
        {owner.interestPct != null ? `${owner.interestPct.toFixed(1)}%` : "—"}
      </TableCell>
      <TableCell className="hidden text-[12.5px] min-[560px]:table-cell">
        {where ?? (
          <span className="text-[11.5px] text-mv-muted">
            no address on the roll
          </span>
        )}
      </TableCell>
    </TableRow>
  );
}

/**
 * A LINK-WEIGHT BUTTON. Real `<button>` semantics — these change the page, they
 * do not navigate — with the weight of a link, because none of them is the
 * action of this card. The one action is a tick in the list above.
 */
function QuietButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer border-0 bg-transparent p-0 text-[12px] font-semibold text-mv-green-deep underline underline-offset-2 hover:text-mv-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
    >
      {children}
    </button>
  );
}

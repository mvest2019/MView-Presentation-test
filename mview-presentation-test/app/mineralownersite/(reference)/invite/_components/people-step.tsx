"use client";

import { useMemo } from "react";

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
 *
 * ── WHAT THE RE-SKIN CHANGED ──
 *
 * The `(portal)` `Table` kit and `SearchField` became the reference's
 * `.rep-mini .iv-tbl` inside `.iv-list`, with `.iv-find` over it. Three things
 * the old build did with utilities the sheet now does properly: the header row
 * STICKS while the list scrolls (a scrolled list whose columns are off screen
 * is four columns of unlabeled data), the column widths are deliberate rather
 * than an even `table-layout: fixed` split that left "OWNER OF RECORD" in 92px,
 * and the fourth column swaps for a line under the name below a 560px
 * container instead of both being present and one hidden by a breakpoint
 * keyed to the viewport.
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
        <span
          className={`chip ${picked.size ? "chip-mint" : "chip-slate"}`}
          style={{ fontSize: 10 }}
        >
          {picked.size} chosen
        </span>
      }
    >
      {/* ONE CONTROL, NOT FOUR. A reader looking for their own cousin needs a
          search box; the filter and the reset are quiet links, not buttons
          competing with it. */}
      <div className="iv-find">
        <input
          type="search"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Search a name or a town"
          aria-label="Search the owners of record"
        />
        {picked.size ? (
          <button type="button" className="iv-link" onClick={onClear}>
            Clear {picked.size}
          </button>
        ) : null}
      </div>

      <div className="iv-list">
        <table className="rep-mini iv-tbl">
          <thead>
            <tr>
              {/* The header cell is empty on screen and never to a screen
                  reader: a column of checkboxes with an unnamed header is a
                  column nobody can be told the purpose of. */}
              <th className="iv-cb">
                <span className="iv-sr">Chosen</span>
              </th>
              <th>Owner of record</th>
              <th className="right">Share</th>
              <th>Town</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((owner) => (
              <OwnerRow
                key={owner.ownerNumber}
                owner={owner}
                on={picked.has(owner.ownerNumber)}
                onToggle={onToggle}
              />
            ))}
            {shown.length === 0 ? (
              <tr>
                <td colSpan={4} className="tiny muted" style={{ padding: "14px 10px" }}>
                  Nothing matches that.
                  {!showAll && others
                    ? " Some owners of record are companies or trusts — show them below."
                    : ""}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="iv-more">
        {/* EVERY OWNER IS IN THAT CARD, and the card is a fixed height — so
            this is a fact rather than a button that grows the page to several
            screens. "· scroll the list" is unconditional, as the reference has
            it: a threshold on it would leave the one instruction the card needs
            appearing and disappearing as the reader types in the search box. */}
        <span className="iv-count">
          {matching.length} {matching.length === 1 ? "owner" : "owners"}
          {query.trim() ? " matching" : ""} · scroll the list
        </span>
        {others ? (
          <button
            type="button"
            className="iv-link"
            onClick={() => onShowAll(!showAll)}
          >
            {showAll
              ? "Show people only"
              : `Also show ${others} ${
                  others === 1
                    ? "company or trust"
                    : "companies, trusts and the operator"
                }`}
          </button>
        ) : null}
        <span className="tiny muted" style={{ marginLeft: "auto" }}>
          Largest share first
        </span>
      </div>

      {showAll && lease.owners.some((owner) => owner.kind === "operator") ? (
        <p className="pf2-note">
          The roll includes the working-interest party — the operator, who pays
          to drill rather than owning the minerals. Inviting them into a private
          owners&rsquo; group is almost certainly not what you want, and they
          never count towards a free month.
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
    <tr className={on ? "on" : undefined}>
      <td className="iv-cb">
        <input
          type="checkbox"
          checked={on}
          /* NAMED WITH THE PERSON, not "row 12". A checkbox column is
             unreadable to a screen reader without it, and "Invite MCCABE
             CORLISS K" is also the confirmation a sighted reader gets from the
             row they are on. */
          aria-label={`Invite ${owner.name}`}
          onChange={(event) => onToggle(owner.ownerNumber, event.target.checked)}
        />
      </td>
      <td>
        <strong>{owner.name}</strong>
        {owner.kind !== "person" ? (
          <i className={`iv-tag${owner.kind === "operator" ? " warn" : ""}`}>
            {KIND_LABEL[owner.kind]}
          </i>
        ) : null}
        {/* THE TOWN, FOR A NARROW SCREEN ONLY. Below a 560px container the
            fourth column does not fit, and one fewer column is the right answer
            rather than a sideways scrollbar inside a card that already scrolls
            down. CSS shows exactly one of these two at any width. */}
        <i className="iv-where">{where ?? "no address on the roll"}</i>
      </td>
      <td className="right num">
        {owner.interestPct != null ? `${owner.interestPct.toFixed(1)}%` : "—"}
      </td>
      <td>
        {where ? <span>{where}</span> : <span className="tiny muted">no address on the roll</span>}
      </td>
    </tr>
  );
}

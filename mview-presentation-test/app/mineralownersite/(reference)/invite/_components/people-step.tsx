"use client";

import { useMemo } from "react";

import type { LeaseRoster, RollCoOwner } from "../_api/invite-api";
import type { OwnerKind } from "../_lib/invite-types";
import { StepCard } from "./step-card";

/** What each kind of party is called, when the page has to say it out loud. */
const KIND_LABEL: Record<OwnerKind, string> = {
  person: "Individual",
  company: "Company",
  trust: "Trust or estate",
  operator: "Working interest",
};

/**
 * STEP 2 · WHO TO WRITE TO — the appraisal roll, read live per lease.
 *
 * ── EVERY ROW IS ADDRESSED BY `ownerKey`, NEVER BY POSITION ──
 *
 * The list arrives sorted by share, so an index names a different person the
 * moment the roll changes, and some owners carry no owner number at all. The
 * key is the row's identity for the tick, the POST and the DELETE alike.
 *
 * ── A TICK IS A WRITE NOW, so a row in flight holds still ──
 *
 * The service records the invite and mints the code before the box shows as
 * ticked. While that round trip is out, the row's checkbox is disabled — a
 * second click during it would race the first, and the honest state of that
 * box is "being decided".
 *
 * ── WHAT IS TICKED RISES TO THE TOP ──
 *
 * A row that disappears under a filter while its tick survives is a letter the
 * reader can neither see nor take back. The chosen sort first, always.
 *
 * ── PEOPLE ONLY, UNTIL ASKED; THE OPERATOR IS SET APART ──
 *
 * Companies, trusts and the operator are real rows and are not hidden — they
 * are behind one link because the page's question is "who do you actually
 * know". The operator's tag is toned as a warning: a working-interest party
 *pays to drill and is not a fellow mineral owner.
 *
 * ── A NULL SHARE SAYS "NOT FILED", NEVER 0% ──
 *
 * The roll filing no interest is a fact about the roll, and rendering it as a
 * zero would rank a real owner as worthless.
 *
 * ── THE COUNTS COME FROM THE SERVICE ──
 *
 * `counts` always describes the WHOLE lease even when a filter narrows the
 * list, and `note` is the contract's own ready-to-render sentence about what
 * was read and what was left out. Both are printed rather than re-derived.
 */
export function PeopleStep({
  roster,
  rosterError,
  picked,
  busy,
  onToggle,
  onClear,
  query,
  onQuery,
  showAll,
  onShowAll,
}: {
  /** Null while the roll is being read. */
  roster: LeaseRoster | null;
  rosterError: string | null;
  picked: Set<string>;
  /** Owner keys whose POST/DELETE is still in flight. */
  busy: Set<string>;
  onToggle: (ownerKey: string, on: boolean) => void;
  onClear: () => void;
  query: string;
  onQuery: (next: string) => void;
  showAll: boolean;
  onShowAll: (next: boolean) => void;
}) {
  const owners = useMemo(() => roster?.owners ?? [], [roster]);
  const others = owners.filter((owner) => owner.kind !== "person").length;

  const matching = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return owners.filter((owner) => {
      if (!showAll && owner.kind !== "person") return false;
      if (!needle) return true;
      return (
        owner.name.toLowerCase().includes(needle) ||
        (owner.city ?? "").toLowerCase().includes(needle) ||
        (owner.ownerNumber ?? "").includes(needle)
      );
    });
  }, [owners, query, showAll]);

  const shown = useMemo(
    () => [
      ...matching.filter((owner) => picked.has(owner.ownerKey)),
      ...matching.filter((owner) => !picked.has(owner.ownerKey)),
    ],
    [matching, picked],
  );

  return (
    <StepCard
      n={2}
      title="Select Co-Owners to Invite"
      action={
        <span
          className={`chip ${picked.size ? "chip-mint" : "chip-slate"}`}
          style={{ fontSize: 10 }}
        >
          {picked.size} selected
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
          placeholder="Search by name or town"
          aria-label="Search the owners of record"
        />
        {picked.size ? (
          <button type="button" className="iv-link" onClick={onClear}>
            Clear selection
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
            {roster === null ? (
              <tr>
                <td
                  colSpan={4}
                  className="tiny muted"
                  style={{ padding: "14px 10px" }}
                >
                  {rosterError ?? "Reading the appraisal roll…"}
                </td>
              </tr>
            ) : (
              <>
                {shown.map((owner) => (
                  <OwnerRow
                    key={owner.ownerKey}
                    owner={owner}
                    on={picked.has(owner.ownerKey)}
                    pending={busy.has(owner.ownerKey)}
                    onToggle={onToggle}
                  />
                ))}
                {shown.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="tiny muted"
                      style={{ padding: "14px 10px" }}
                    >
                      Nothing matches that.
                      {!showAll && others
                        ? " Some owners of record are companies or trusts — show them below."
                        : ""}
                    </td>
                  </tr>
                ) : null}
              </>
            )}
          </tbody>
        </table>
      </div>

      <div className="iv-more">
        {/* EVERY LOADED OWNER IS IN THAT CARD, and the card is a fixed height —
            so this is a fact rather than a button that grows the page. */}
        <span className="iv-count">
          {matching.length}{" "}
          {showAll
            ? matching.length === 1
              ? "owner"
              : "owners"
            : matching.length === 1
              ? "individual owner"
              : "individual owners"}
          {query.trim() ? " matching" : ""} · scroll to view
        </span>
        {others ? (
          <button
            type="button"
            className="iv-link"
            onClick={() => onShowAll(!showAll)}
          >
            {showAll
              ? "Show individual owners only"
              : `Also show ${others} ${
                  others === 1
                    ? "company or trust"
                    : "companies, trusts, and the operator"
                }`}
          </button>
        ) : null}
        <span className="tiny muted" style={{ marginLeft: "auto" }}>
          Largest ownership share first
        </span>
      </div>

      {/* THE SERVICE'S OWN SENTENCE about the roll read — how many rows, which
          year, what was collapsed or left out. It already accounts for the
          whole lease, so nothing here re-counts it. */}
      {roster?.note ? <p className="pf2-note">{roster.note}</p> : null}
      {roster?.truncated ? (
        <p className="tiny muted" style={{ margin: "4px 0 0" }}>
          This lease has more owners of record than one page of the roll —
          showing the first {owners.length} of {roster.counts.owners}, largest
          share first.
        </p>
      ) : null}

      {showAll && owners.some((owner) => owner.kind === "operator") ? (
        <p className="pf2-note">
          The roll includes the working-interest party — the operator, who pays
          to drill rather than owning the minerals. Inviting them into a private
          owners&rsquo; group is almost certainly not what you want, and they
          never count towards a complimentary month.
        </p>
      ) : null}
    </StepCard>
  );
}

function OwnerRow({
  owner,
  on,
  pending,
  onToggle,
}: {
  owner: RollCoOwner;
  on: boolean;
  pending: boolean;
  onToggle: (ownerKey: string, on: boolean) => void;
}) {
  const where = owner.city
    ? `${owner.city}${owner.state ? `, ${owner.state}` : ""}`
    : null;
  const share =
    owner.sharePct != null
      ? `${owner.sharePct.toFixed(owner.sharePct < 1 ? 3 : 1)}%`
      : null;

  return (
    <tr className={on ? "on" : undefined}>
      <td className="iv-cb">
        <input
          type="checkbox"
          checked={on}
          disabled={pending}
          /* NAMED WITH THE PERSON, not "row 12". A checkbox column is
             unreadable to a screen reader without it. */
          aria-label={`Invite ${owner.name}`}
          onChange={(event) => onToggle(owner.ownerKey, event.target.checked)}
        />
      </td>
      <td>
        <strong>{owner.name}</strong>
        {owner.kind !== "person" ? (
          <i className={`iv-tag${owner.kind === "operator" ? " warn" : ""}`}>
            {KIND_LABEL[owner.kind]}
          </i>
        ) : null}
        {/* THE TOWN, FOR A NARROW SCREEN ONLY. CSS shows exactly one of these
            two at any width. */}
        <i className="iv-where">{where ?? "no address on the roll"}</i>
      </td>
      <td className="right num">
        {/* "not filed", NEVER 0% — the roll filed no interest for this row. */}
        {share ?? <span className="tiny muted">not filed</span>}
      </td>
      <td>
        {where ? (
          <span>{where}</span>
        ) : (
          <span className="tiny muted">no address on the roll</span>
        )}
      </td>
    </tr>
  );
}

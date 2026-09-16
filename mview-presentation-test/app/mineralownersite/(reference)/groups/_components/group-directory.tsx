"use client";

import { useState } from "react";

import type { GroupsAccess } from "../_lib/groups-access";
import type { Group } from "../_lib/groups-types";
import { GlobeIcon, PlusIcon, ShieldIcon, SpriteIcon } from "./group-icons";

/** What each filter asks of a group. Kept beside the labels it belongs to. */
export type DirectoryFilter = "all" | "public" | "private" | "admin";

const KIND_LABEL: Record<Group["kind"], string> = {
  county: "County",
  operator: "Operator",
  play: "Play type",
  lease: "Lease",
  owned: "Yours",
};

/**
 * EVERY GROUP THE READER CAN REACH, AND WHAT EACH ONE IS.
 *
 * ── THE FOUR THINGS A ROW HAS TO SAY, AND IT SAYS ALL FOUR ──
 *
 * A reader looking at this list is asking four questions at once, and a
 * directory that answers three of them is the one that gets misread:
 *
 *   IS IT PUBLIC OR PRIVATE     the leading icon — a globe or a padlock — and
 *                               the section it is filed under. Two signals for
 *                               the one distinction that matters most, because
 *                               posting into the wrong one is the mistake this
 *                               page exists to prevent.
 *   AM I IN IT                  "Joined" on a public group, or its absence.
 *                               Private groups are never marked: being able to
 *                               see one at all is being in it.
 *   DO I RUN IT                 the Admin badge, which appears on exactly the
 *                               groups whose panel carries the admin tools.
 *   WHERE DID IT COME FROM      "From a claimed lease", which is the one piece
 *                               of provenance a reader cannot work out for
 *                               themselves — and the reason they are in a
 *                               private group they did not create and do not
 *                               run.
 *
 * ── IT SCROLLS INSIDE ITSELF ──
 *
 * One group per claimed lease means a portfolio of ten leases has sixteen rows
 * here before anybody creates anything. Stacked above the feed on a phone, that
 * is a screen and a half of list before the first post. The card is a fixed
 * height with its own scroller — the pattern the Invite page's owner list
 * already uses — so the feed stays reachable at every width.
 */
export function GroupDirectory({
  groups,
  selectedId,
  onSelect,
  query,
  onQuery,
  filter,
  onFilter,
  access,
  showFilters,
  showAdminFilter,
  onCreate,
}: {
  groups: Group[];
  selectedId: string;
  onSelect: (id: string) => void;
  query: string;
  onQuery: (q: string) => void;
  filter: DirectoryFilter;
  onFilter: (f: DirectoryFilter) => void;
  access: GroupsAccess;
  /** False when every group in the list is public and a filter row says nothing. */
  showFilters: boolean;
  /** The Detailed and Professional densities get the fourth filter. */
  showAdminFilter: boolean;
  onCreate: (name: string) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  const needle = query.trim().toLowerCase();
  const matches = groups.filter((group) => {
    if (filter === "public" && group.visibility !== "public") return false;
    if (filter === "private" && group.visibility !== "private") return false;
    if (filter === "admin" && group.role !== "admin") return false;
    if (!needle) return true;
    return (
      group.name.toLowerCase().includes(needle) ||
      group.subtitle.toLowerCase().includes(needle) ||
      KIND_LABEL[group.kind].toLowerCase().includes(needle)
    );
  });

  const publics = matches.filter((g) => g.visibility === "public");
  const privates = matches.filter((g) => g.visibility === "private");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = name.trim();
    if (!value) return;
    onCreate(value);
    setName("");
    setCreating(false);
  };

  const filters: { key: DirectoryFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "public", label: "Public" },
    { key: "private", label: "Private" },
    ...(showAdminFilter
      ? [{ key: "admin" as DirectoryFilter, label: "You admin" }]
      : []),
  ];

  return (
    <aside className="gr-dir" aria-label="Your groups">
      <div className="gr-dirhead">
        <h2 className="gr-h">Your groups</h2>
        {access.createGroup ? (
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => setCreating((v) => !v)}
            aria-expanded={creating}
          >
            <PlusIcon />
            New private group
          </button>
        ) : null}
      </div>

      {creating ? (
        <form className="gr-newform" onSubmit={submit}>
          <label className="gr-k" htmlFor="gr-newname">
            Name your group
          </label>
          <input
            id="gr-newname"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="The Platis cousins"
          />
          <p className="tiny muted">
            A private group you create is yours: you are its admin, nobody can
            see it until you invite them, and you can delete it at any time.
          </p>
          <span className="gr-confirmbtns">
            <button type="submit" className="btn btn-sm btn-primary" disabled={!name.trim()}>
              Create group
            </button>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => {
                setCreating(false);
                setName("");
              }}
            >
              Cancel
            </button>
          </span>
        </form>
      ) : null}

      <div className="gr-find">
        <input
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search your groups"
          aria-label="Search your groups"
        />
      </div>

      {showFilters ? (
      <div className="gr-filters" role="group" aria-label="Filter groups">
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            className={"gr-filter" + (filter === f.key ? " on" : "")}
            aria-pressed={filter === f.key}
            onClick={() => onFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>
      ) : null}

      <div className="gr-dirlist">
        {matches.length === 0 ? (
          <p className="tiny muted gr-empty">Nothing matches that.</p>
        ) : null}

        {publics.length ? (
          <>
            <p className="gr-dirsec">
              Public groups <span className="num">{publics.length}</span>
            </p>
            {publics.map((group) => (
              <GroupRow
                key={group.id}
                group={group}
                on={group.id === selectedId}
                onSelect={onSelect}
              />
            ))}
          </>
        ) : null}

        {privates.length ? (
          <>
            <p className="gr-dirsec">
              Private groups <span className="num">{privates.length}</span>
            </p>
            {privates.map((group) => (
              <GroupRow
                key={group.id}
                group={group}
                on={group.id === selectedId}
                onSelect={onSelect}
              />
            ))}
          </>
        ) : null}
      </div>
    </aside>
  );
}

function GroupRow({
  group,
  on,
  onSelect,
}: {
  group: Group;
  on: boolean;
  onSelect: (id: string) => void;
}) {
  const isPublic = group.visibility === "public";
  return (
    <button
      type="button"
      className={"gr-row" + (on ? " on" : "")}
      onClick={() => onSelect(group.id)}
      aria-current={on ? "true" : undefined}
    >
      <span className={"gr-rowicon" + (isPublic ? "" : " private")} aria-hidden="true">
        {isPublic ? (
          <GlobeIcon />
        ) : group.role === "admin" ? (
          <ShieldIcon />
        ) : (
          <SpriteIcon id="mvi-lock" />
        )}
      </span>
      <span className="gr-rowbody">
        <span className="gr-rowname">{group.name}</span>
        <span className="gr-rowmeta tiny muted">
          {KIND_LABEL[group.kind]} · {group.memberCount}{" "}
          {group.memberCount === 1 ? "member" : "members"} · {group.posts.length}{" "}
          {group.posts.length === 1 ? "post" : "posts"}
        </span>
        <span className="gr-rowtags">
          {group.role === "admin" ? (
            <span className="chip chip-mint gr-chip">Admin</span>
          ) : null}
          {group.origin === "lease-claim" ? (
            <span className="chip chip-slate gr-chip">From a claimed lease</span>
          ) : null}
          {isPublic && group.role === "member" ? (
            <span className="chip chip-slate gr-chip">Joined</span>
          ) : null}
        </span>
      </span>
    </button>
  );
}

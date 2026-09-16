"use client";

import Link from "next/link";

import type { GroupsAccess } from "../_lib/groups-access";
import type { Group } from "../_lib/groups-types";
import { GroupAdmin } from "./group-admin";
import { GroupFeed } from "./group-feed";
import { CheckIcon, GlobeIcon, ShieldIcon, SpriteIcon } from "./group-icons";

/**
 * THE GROUP THE READER IS LOOKING AT.
 *
 * ── THE HEADER IS THE PERMISSION MODEL, WRITTEN OUT ──
 *
 * Everything a reader needs in order not to be surprised by this page is in the
 * first four lines of it: what kind of room this is, how they got in, what they
 * may do here, and who to ask if they want something they cannot do. The badges
 * are the short form and the sentence under them is the long form, because a
 * badge alone teaches nobody the rule — "From a claimed lease" means nothing
 * until the page says once that claiming a lease puts you in its group and does
 * not hand you the group.
 *
 * ── WHAT CHANGES BETWEEN THE TWO KINDS OF GROUP ──
 *
 *   PUBLIC    a Join control, no member list, no admin. Nobody runs a county.
 *             The member list is deliberately absent rather than empty: a
 *             public room does not publish a roster of everyone who walked in.
 *   PRIVATE   a member list, an admin named on it, and — for the one group in
 *             the list the reader created — the admin tools.
 *
 * ── AND WHAT NEVER CHANGES ──
 *
 * The feed. Posting, liking, commenting, replying and sharing are the same
 * surface in both, which is why `GroupFeed` takes a `Group` and not a flag.
 */
export function GroupPanel({
  group,
  access,
  youInitials,
  dense,
  showIds,
  invites,
  onToggleJoin,
  onInvite,
  onRemoveMember,
  onDeleteGroup,
  onPost,
  onLike,
  onComment,
  onReply,
  onShare,
  onDeletePost,
}: {
  group: Group;
  access: GroupsAccess;
  youInitials: string;
  /** Detailed and Professional print the member list and the provenance line. */
  dense: boolean;
  showIds: boolean;
  invites: string[];
  onToggleJoin: () => void;
  onInvite: (email: string) => void;
  onRemoveMember: (memberId: string) => void;
  onDeleteGroup: () => void;
  onPost: (body: string) => void;
  onLike: (postId: string) => void;
  onComment: (postId: string, body: string) => void;
  onReply: (postId: string, commentId: string, body: string) => void;
  onShare: (postId: string) => void;
  onDeletePost: (postId: string) => void;
}) {
  const isPublic = group.visibility === "public";
  const joined = group.role !== "visitor";

  return (
    <div className="gr-main">
      <header className="chartbox gr-head">
        <div className="gr-headtop">
          <span className={"gr-headicon" + (isPublic ? "" : " private")} aria-hidden="true">
            {isPublic ? (
              <GlobeIcon />
            ) : group.role === "admin" ? (
              <ShieldIcon />
            ) : (
              <SpriteIcon id="mvi-lock" />
            )}
          </span>
          <div className="gr-headtext">
            <p className="gr-kicker">
              {isPublic ? "Public group" : "Private group"} · {group.subtitle}
            </p>
            <h2 className="gr-title">{group.name}</h2>
            <p className="gr-badges">
              {group.role === "admin" ? (
                <span className="chip chip-mint gr-chip">You are the admin</span>
              ) : null}
              {group.origin === "lease-claim" ? (
                <span className="chip chip-slate gr-chip">From a claimed lease</span>
              ) : null}
              {isPublic ? (
                <span className="chip chip-slate gr-chip">
                  {joined ? "You are a member" : "You have not joined"}
                </span>
              ) : null}
              <span className="chip chip-slate gr-chip num">
                {group.memberCount} {group.memberCount === 1 ? "member" : "members"}
              </span>
            </p>
          </div>

          {isPublic ? (
            <button
              type="button"
              className={"btn btn-sm " + (joined ? "btn-ghost" : "btn-primary")}
              onClick={onToggleJoin}
              disabled={!access.write}
              title={
                access.write
                  ? undefined
                  : "Joining a group needs a claimed mineral owner record."
              }
              aria-pressed={joined}
            >
              {joined ? (
                <>
                  <CheckIcon />
                  Joined
                </>
              ) : (
                "Join group"
              )}
            </button>
          ) : null}
        </div>

        <p className="small muted gr-about">{group.about}</p>

        {/* WHO RUNS IT, AND THE RULE BEHIND IT. Only on a private group the
            reader did not create — which is exactly the case where "why can I
            not delete this post" has an answer they have not been told. */}
        {!isPublic && group.role !== "admin" && group.adminName ? (
          <p className="tiny muted gr-admins">
            <ShieldIcon />
            <span>
              <strong>{group.adminName}</strong> runs this group.
              {group.origin === "lease-claim"
                ? " Claiming a share of this lease put you in it as a member — the admin is the owner who opened it, so invitations, removals and deletions are theirs."
                : " Invitations, removals and deletions are theirs."}
            </span>
          </p>
        ) : null}

        {group.leaseSlug && dense ? (
          <p className="tiny gr-leaselink">
            <SpriteIcon id="mvi-leases" />
            <Link href={`/mineralownersite/leases/${group.leaseSlug}`}>
              Open the lease report for {group.leaseLabel}
            </Link>
          </p>
        ) : null}
      </header>

      {group.role === "admin" ? (
        <GroupAdmin
          group={group}
          access={access}
          invites={invites}
          onInvite={onInvite}
          onRemove={onRemoveMember}
          onDeleteGroup={onDeleteGroup}
        />
      ) : null}

      {/* THE MEMBER LIST, READ-ONLY. A private group the reader is a member of
          still shows who else is in the room — that is the point of a private
          room — but with no control beside any name, because none of them is
          theirs to use. */}
      {!isPublic && group.role !== "admin" && dense ? (
        <section className="chartbox gr-members" aria-label={`Who is in ${group.name}`}>
          <h3 className="gr-k">Who is in ({group.memberCount})</h3>
          <ul className="gr-memberlist">
            {group.members.map((member) => (
              <li key={member.id}>
                <span className="gr-av gr-av-sm" aria-hidden="true">
                  {member.initials}
                </span>
                <span className="gr-membername">
                  <span className="small">{member.name}</span>
                  {member.note ? <span className="tiny muted">{member.note}</span> : null}
                </span>
                {member.role === "admin" ? (
                  <span className="chip chip-mint gr-chip">Admin</span>
                ) : null}
                {showIds && !member.you ? (
                  <span className="tiny muted gr-id num">{member.id}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <GroupFeed
        group={group}
        access={access}
        youInitials={youInitials}
        showIds={showIds}
        onPost={onPost}
        onLike={onLike}
        onComment={onComment}
        onReply={onReply}
        onShare={onShare}
        onDeletePost={onDeletePost}
      />
    </div>
  );
}

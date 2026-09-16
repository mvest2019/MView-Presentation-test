"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";

import { usePortalViewState } from "../../../_components/reference/view-state";
import { gates } from "../../../_components/ui/portal-gating";
import { groupsAccess } from "../_lib/groups-access";
import { groupsModel } from "../_lib/groups-data";
import type { Group, Post, PostComment } from "../_lib/groups-types";
import { GroupDirectory, type DirectoryFilter } from "./group-directory";
import { GroupPanel } from "./group-panel";
import { GroupsHeader, GroupsStats } from "./groups-header";
import { GroupsUltra } from "./groups-ultra";

/**
 * THE GROUPS PAGE'S BODY, handed to the reference shell through `Portal`'s
 * `children`.
 *
 * ── THE TWO AXES ARE ASKED FOR, NOT ASSUMED ──
 *
 * `usePortalViewState()` is the context `Portal` wraps every child in, holding
 * the reader's DENSITY (Ultra · Essentials · Detailed · Professional) and the
 * account's FUNNEL STATE (not claimed · claimed free · trial · lapsed · paid).
 * Both belong to the shell and both are set in the chrome, so this page reads
 * them rather than keeping a second copy — the mistake the Map made once and
 * had to undo, where the same two settings were offered twice on one screen and
 * disagreed with each other.
 *
 * AND THE DENSITY GATE IS REACT, NOT CSS — the reason `bits.tsx` gives: the
 * reference's rule is `section > :not(.tier-u)`, which depends on the element
 * being a DIRECT child of the route section, and a page that arrives through
 * `children` is never inside one. A gate class here would silently match
 * nothing, which is the worst way for a gate to fail.
 *
 *   ULTRA         one group at a time — see `GroupsUltra`.
 *   ESSENTIALS    the strip, the directory and the group, in plain language:
 *                 no member lists, no id columns, three filters not four.
 *   DETAILED      the above plus who is in each private group, the provenance
 *                 line and the lease link, and the "you admin" filter.
 *   PROFESSIONAL  Detailed plus the identifiers — owner numbers beside the
 *                 member names, the post id under each post — which is what
 *                 that density means everywhere else in this portal.
 *
 * ── THE FUNNEL DECIDES WHAT EXISTS, NOT WHAT IS GREYED OUT ──
 *
 * With nothing claimed there is no private half at all: those groups are
 * removed from the array the whole page is drawn from, so there is no filter
 * that reveals them, no count that includes them and no row to click. A lapsed
 * account is the opposite case — every group stays, and only writing stops. The
 * policy is one table in `groups-access.ts`; this file asks it and never tests
 * `funnel` directly.
 *
 * ── NOTHING HERE IS SAVED ──
 *
 * There is no groups service behind this portal. Every interaction below — a
 * like, a comment, a reply, a new post, an invitation, a removal, a new group,
 * a deleted one — changes this component's state and nothing else, and is gone
 * on reload. That is the honest scope of a UI pass, and the page says so once
 * in its footnote rather than disabling controls that are the whole point of
 * the design being reviewed.
 */
export function GroupsView({ initialGroupId }: { initialGroupId: string | null }) {
  const view = usePortalViewState();
  /* NULL IS A REAL ANSWER and means this is rendering outside the reference
     shell. There is nowhere to ask, so it takes the ordinary claimed reader's
     view — a missing provider should not lock anyone out of a page. */
  const tier = view?.tier ?? "detailed";
  const access = groupsAccess(view?.funnel ?? "claimed");

  const [groups, setGroups] = useState<Group[]>(() => groupsModel.groups);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<DirectoryFilter>("all");
  const [invites, setInvites] = useState<Record<string, string[]>>({});
  const [picked, setPicked] = useState<string | null>(initialGroupId);
  /* New ids come off a counter rather than a clock: `Date.now()` in a key is a
     value that differs between the server's render and the browser's. */
  const made = useRef(0);

  /*
   * WHAT THERE IS TO SEE, and with nothing claimed it is two changes rather
   * than one.
   *
   * The private half is REMOVED — not disabled, not greyed: those groups do not
   * exist for an unclaimed visitor, so no filter reveals them and no count
   * includes them. And the public groups become `visitor`, because membership
   * of one was a consequence of claiming a record: a "Joined" badge on an
   * account with nothing claimed would be the page claiming something about the
   * reader that is not true.
   */
  const visible = useMemo(
    () =>
      access.privateGroups
        ? groups
        : groups
            .filter((group) => group.visibility === "public")
            .map((group) => ({ ...group, role: "visitor" as const })),
    [groups, access.privateGroups],
  );

  /*
   * THE SELECTION IS CLAMPED IN RENDER, not reset from an effect.
   *
   * The list changes under it — the funnel switch removes the private half, an
   * admin deletes a group, a search narrows nothing but the view — and a
   * selection left pointing at a group that is no longer there would render an
   * empty panel. Falling back to the first visible group costs nothing, needs
   * no effect, and cannot flash the wrong group first. Same reasoning as
   * `usePaged` in `bits.tsx`.
   */
  const selected =
    visible.find((group) => group.id === picked) ?? visible[0] ?? null;

  const dense = tier === "detailed" || tier === "pro";
  const showIds = tier === "pro";

  /* ------------------------------------------------------------- writes */

  const editGroup = (groupId: string, fn: (group: Group) => Group) =>
    setGroups((previous) =>
      previous.map((group) => (group.id === groupId ? fn(group) : group)),
    );

  const editPost = (groupId: string, postId: string, fn: (post: Post) => Post) =>
    editGroup(groupId, (group) => ({
      ...group,
      posts: group.posts.map((post) => (post.id === postId ? fn(post) : post)),
    }));

  const you = groupsModel.you;

  const addPost = (groupId: string, body: string) => {
    made.current += 1;
    const post: Post = {
      id: `${groupId}-new-${made.current}`,
      author: you.name,
      initials: you.initials,
      authorRole:
        groups.find((g) => g.id === groupId)?.role === "admin" ? "admin" : "member",
      you: true,
      postedLabel: "Just now",
      body,
      likes: 0,
      likedByYou: false,
      shares: 0,
      comments: [],
    };
    editGroup(groupId, (group) => ({ ...group, posts: [post, ...group.posts] }));
  };

  const addComment = (groupId: string, postId: string, body: string) => {
    made.current += 1;
    const comment: PostComment = {
      id: `${postId}-new-${made.current}`,
      author: you.name,
      initials: you.initials,
      you: true,
      postedLabel: "Just now",
      body,
      replies: [],
    };
    editPost(groupId, postId, (post) => ({
      ...post,
      comments: [...post.comments, comment],
    }));
  };

  const addReply = (
    groupId: string,
    postId: string,
    commentId: string,
    body: string,
  ) => {
    made.current += 1;
    editPost(groupId, postId, (post) => ({
      ...post,
      comments: post.comments.map((comment) =>
        comment.id === commentId
          ? {
              ...comment,
              replies: [
                ...comment.replies,
                {
                  id: `${commentId}-new-${made.current}`,
                  author: you.name,
                  initials: you.initials,
                  you: true,
                  postedLabel: "Just now",
                  body,
                },
              ],
            }
          : comment,
      ),
    }));
  };

  const toggleLike = (groupId: string, postId: string) =>
    editPost(groupId, postId, (post) => ({
      ...post,
      likedByYou: !post.likedByYou,
      likes: post.likes + (post.likedByYou ? -1 : 1),
    }));

  const share = (groupId: string, postId: string) =>
    editPost(groupId, postId, (post) => ({ ...post, shares: post.shares + 1 }));

  const deletePost = (groupId: string, postId: string) =>
    editGroup(groupId, (group) => ({
      ...group,
      posts: group.posts.filter((post) => post.id !== postId),
    }));

  const toggleJoin = (groupId: string) =>
    editGroup(groupId, (group) => ({
      ...group,
      role: group.role === "visitor" ? "member" : "visitor",
      /* The reader is one of the members while they are in it, and is not while
         they are not. A count that ignored the reader's own membership would
         disagree with the badge beside it. */
      memberCount: group.memberCount + (group.role === "visitor" ? 1 : -1),
    }));

  const invite = (groupId: string, email: string) =>
    setInvites((previous) => ({
      ...previous,
      [groupId]: [...(previous[groupId] ?? []), email],
    }));

  const removeMember = (groupId: string, memberId: string) =>
    editGroup(groupId, (group) => ({
      ...group,
      members: group.members.filter((member) => member.id !== memberId),
      memberCount: Math.max(0, group.memberCount - 1),
    }));

  const deleteGroup = (groupId: string) => {
    setGroups((previous) => previous.filter((group) => group.id !== groupId));
    setPicked(null);
  };

  const createGroup = (name: string) => {
    made.current += 1;
    const id = `owned-new-${made.current}`;
    const group: Group = {
      id,
      name,
      visibility: "private",
      kind: "owned",
      origin: "created",
      subtitle: "You created this group",
      about:
        "A private group you made. Nobody can see it until you invite them, and you can delete it at any time.",
      role: "admin",
      memberCount: 1,
      members: [
        {
          id: "you",
          name: you.name,
          initials: you.initials,
          role: "admin",
          note: "You",
          you: true,
        },
      ],
      adminName: you.name,
      leaseSlug: null,
      leaseLabel: null,
      posts: [],
    };
    setGroups((previous) => [...previous, group]);
    setPicked(id);
  };

  /* -------------------------------------------------------------- render */

  /* `gr` IS THE CONTAINER EVERY BREAKPOINT ON THIS PAGE MEASURES — the Invite
     page's reasoning, which holds here for the same reason: the shell spends
     most of a 1024px viewport on its sidebar, so a page 664px wide would
     otherwise lay itself out as though it had the whole window. See
     `groups.css`. */
  const root = `gr ${gates("pageRoot")}`;

  if (tier === "ultra") {
    return (
      <div className={root}>
        <GroupsUltra
          groups={visible}
          access={access}
          youInitials={you.initials}
          onPost={addPost}
          onLike={toggleLike}
          onComment={addComment}
          onReply={addReply}
          onShare={share}
          onDeletePost={deletePost}
        />
      </div>
    );
  }

  return (
    <div className={root}>
      <GroupsHeader />

      {access.note ? (
        <div className={`notice ${access.tone} gr-notice`}>
          <span aria-hidden="true">ⓘ</span>
          <span>
            {access.note}
            {access.action ? (
              <>
                {" "}
                <Link href={access.action.href}>{access.action.label}</Link>.
              </>
            ) : null}
          </span>
        </div>
      ) : null}

      <GroupsStats groups={visible} access={access} />

      <div className="gr-body">
        <GroupDirectory
          groups={visible}
          selectedId={selected?.id ?? ""}
          onSelect={setPicked}
          query={query}
          onQuery={setQuery}
          filter={filter}
          onFilter={setFilter}
          access={access}
          /* NO FILTER ROW WHEN THERE IS NOTHING TO FILTER. With nothing
             claimed every group in the list is public, so All · Public ·
             Private · You admin is four controls of which two do nothing and
             one always matches everything. */
          showFilters={access.privateGroups}
          showAdminFilter={dense}
          onCreate={createGroup}
        />

        {selected ? (
          <GroupPanel
            key={selected.id}
            group={selected}
            access={access}
            youInitials={you.initials}
            dense={dense}
            showIds={showIds}
            invites={invites[selected.id] ?? []}
            onToggleJoin={() => toggleJoin(selected.id)}
            onInvite={(email) => invite(selected.id, email)}
            onRemoveMember={(memberId) => removeMember(selected.id, memberId)}
            onDeleteGroup={() => deleteGroup(selected.id)}
            onPost={(body) => addPost(selected.id, body)}
            onLike={(postId) => toggleLike(selected.id, postId)}
            onComment={(postId, body) => addComment(selected.id, postId, body)}
            onReply={(postId, commentId, body) =>
              addReply(selected.id, postId, commentId, body)
            }
            onShare={(postId) => share(selected.id, postId)}
            onDeletePost={(postId) => deletePost(selected.id, postId)}
          />
        ) : (
          <div className="gr-main">
            <div className="chartbox gr-nothing">
              <p className="small">
                <strong>You are not in any group yet.</strong>
              </p>
              <p className="small muted">
                {access.createGroup
                  ? "Start a private group above, or claim a lease and one opens for it."
                  : "Public groups open to every mineral owner on Mineral View."}
              </p>
            </div>
          </div>
        )}
      </div>

      <p className="tiny muted gr-foot">
        Groups is a design under review. The groups and the people in them are
        read from this record&rsquo;s own leases and appraisal roll; the
        conversation in them is sample content, and nothing posted, liked or
        invited here is saved.
      </p>
    </div>
  );
}

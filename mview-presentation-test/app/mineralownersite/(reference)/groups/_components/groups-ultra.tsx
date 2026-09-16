"use client";

import { useState } from "react";

import type { GroupsAccess } from "../_lib/groups-access";
import type { Group } from "../_lib/groups-types";
import { GroupFeed } from "./group-feed";
import { GlobeIcon, ShieldIcon, SpriteIcon } from "./group-icons";

/**
 * ULTRA — one thing at a time.
 *
 * ── WHAT ULTRA IS FOR, AND WHY THIS IS NOT JUST THE PAGE WITH LESS ON IT ──
 *
 * The portal's Ultra density is "one headline, one status, one action". On the
 * Dashboard that is a figure; here the equivalent is not a number but a ROOM:
 * the reader's groups, listed plainly, and then one of them open with nothing
 * else on screen. A directory, four filters, a member list and a search box are
 * the furniture Ultra exists to remove.
 *
 * ── AND IT IS NOT A DEAD END, WHICH IS THE PART THAT USUALLY GOES WRONG ──
 *
 * The easy Ultra is a card with a headline and a button that cannot do anything
 * because the surface it would open is hidden at this density. So the button
 * here opens the group IN PLACE, the feed is the real feed with the real
 * controls, and a back link returns to the list. Everything a reader can do at
 * Detailed they can still do — they simply do it one screen at a time.
 *
 * THE ADMIN TOOLS ARE THE ONE THING GENUINELY ABSENT. Inviting, removing and
 * deleting are not "one action" in any reading of the word, and an admin who
 * wants them raises the density in the avatar menu — which is what that control
 * is for. The card says so rather than leaving them to wonder where it went.
 */
export function GroupsUltra({
  groups,
  access,
  youInitials,
  onPost,
  onLike,
  onComment,
  onReply,
  onShare,
  onDeletePost,
}: {
  groups: Group[];
  access: GroupsAccess;
  youInitials: string;
  onPost: (groupId: string, body: string) => void;
  onLike: (groupId: string, postId: string) => void;
  onComment: (groupId: string, postId: string, body: string) => void;
  onReply: (groupId: string, postId: string, commentId: string, body: string) => void;
  onShare: (groupId: string, postId: string) => void;
  onDeletePost: (groupId: string, postId: string) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  const mine = groups.filter((group) => group.role !== "visitor");
  const shown = mine.length ? mine : groups;
  const open = openId ? (groups.find((g) => g.id === openId) ?? null) : null;

  if (open) {
    return (
      <div className="gr-ultra">
        <button type="button" className="gr-link gr-back" onClick={() => setOpenId(null)}>
          ← All your groups
        </button>
        <header className="chartbox gr-head">
          <div className="gr-headtop">
            <span
              className={"gr-headicon" + (open.visibility === "public" ? "" : " private")}
              aria-hidden="true"
            >
              {open.visibility === "public" ? <GlobeIcon /> : <SpriteIcon id="mvi-lock" />}
            </span>
            <div className="gr-headtext">
              <p className="gr-kicker">
                {open.visibility === "public" ? "Public group" : "Private group"}
              </p>
              <h2 className="gr-title">{open.name}</h2>
            </div>
          </div>
          {open.role === "admin" ? (
            <p className="tiny muted gr-admins">
              <ShieldIcon />
              <span>
                You run this group. Switch the view to Detailed in the account
                menu to invite people, remove them or delete the group.
              </span>
            </p>
          ) : null}
        </header>

        <GroupFeed
          group={open}
          access={access}
          youInitials={youInitials}
          showIds={false}
          onPost={(body) => onPost(open.id, body)}
          onLike={(postId) => onLike(open.id, postId)}
          onComment={(postId, body) => onComment(open.id, postId, body)}
          onReply={(postId, commentId, body) => onReply(open.id, postId, commentId, body)}
          onShare={(postId) => onShare(open.id, postId)}
          onDeletePost={(postId) => onDeletePost(open.id, postId)}
        />
      </div>
    );
  }

  const posts = shown.reduce((total, group) => total + group.posts.length, 0);

  return (
    <div className="gr-ultra">
      <div className="chartbox gr-hero">
        <p className="gr-kicker">Community</p>
        <h1 className="gr-heroline num">
          {shown.length} {shown.length === 1 ? "group" : "groups"}
        </h1>
        <p className="small muted">
          {posts} {posts === 1 ? "post" : "posts"} in them. Open one to read it.
        </p>
      </div>

      <ul className="gr-ultralist">
        {shown.map((group) => (
          <li key={group.id}>
            <button type="button" className="gr-row" onClick={() => setOpenId(group.id)}>
              <span
                className={
                  "gr-rowicon" + (group.visibility === "public" ? "" : " private")
                }
                aria-hidden="true"
              >
                {group.visibility === "public" ? (
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
                  {group.visibility === "public" ? "Public" : "Private"} ·{" "}
                  {group.posts.length} {group.posts.length === 1 ? "post" : "posts"}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

"use client";

import { useState } from "react";

import type { GroupsAccess } from "../_lib/groups-access";
import type { Group } from "../_lib/groups-types";
import { PostCard } from "./post-card";

/**
 * THE COMPOSER AND THE FEED — the part of the page that is the same on both
 * kinds of group, which is the reason `Group` is one type. See `groups-types`.
 *
 * ── THE ONE SENTENCE THAT IS NOT THE SAME ON BOTH ──
 *
 * Under the composer, the page says who will be able to read what is about to
 * be written, and it says it in the group's own terms: a public group is "anyone
 * on Mineral View", a private one is "the N people in this group". That line is
 * the whole difference between the two kinds of room, and it belongs where the
 * decision is made rather than in a legend further up — a reader typing into a
 * box is not looking at a badge three hundred pixels away.
 *
 * ── AND IT IS A BUTTON, NOT AN ENTER KEY ──
 *
 * The composer is a `textarea` and submits on the button only. A post is a
 * paragraph, often several, and a form that sends on Enter turns the second
 * line of a thought into a second post.
 */
export function GroupFeed({
  group,
  access,
  youInitials,
  showIds,
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
  showIds: boolean;
  onPost: (body: string) => void;
  onLike: (postId: string) => void;
  onComment: (postId: string, body: string) => void;
  onReply: (postId: string, commentId: string, body: string) => void;
  onShare: (postId: string) => void;
  onDeletePost: (postId: string) => void;
}) {
  const [draft, setDraft] = useState("");

  const audience =
    group.visibility === "public"
      ? "Anyone on Mineral View can read this and reply to it."
      : `Only the ${group.memberCount} ${
          group.memberCount === 1 ? "person" : "people"
        } in this group can read this.`;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    onPost(body);
    setDraft("");
  };

  return (
    <section className="gr-feed" aria-label={`Posts in ${group.name}`}>
      {access.write ? (
        <form className="chartbox gr-composer" onSubmit={submit}>
          <div className="gr-composerrow">
            <span className="gr-av" aria-hidden="true">
              {youInitials}
            </span>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={draft ? 4 : 2}
              placeholder={
                group.visibility === "public"
                  ? `Ask the owners in ${group.name} something`
                  : `Write to the group about ${group.name}`
              }
              aria-label={`Write a post in ${group.name}`}
            />
          </div>
          <div className="gr-composerfoot">
            <span className="tiny muted">{audience}</span>
            <button type="submit" className="btn btn-sm btn-primary" disabled={!draft.trim()}>
              Post
            </button>
          </div>
        </form>
      ) : null}

      {group.posts.length === 0 ? (
        <div className="chartbox gr-nothing">
          <p className="small">
            <strong>Nothing has been posted here yet.</strong>
          </p>
          <p className="small muted">
            {access.write
              ? "Start it off — a question about a statement or a well is usually what gets a group talking."
              : audience}
          </p>
        </div>
      ) : (
        <div className="gr-posts">
          {group.posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              access={access}
              canModerate={group.role === "admin"}
              youInitials={youInitials}
              showIds={showIds}
              onLike={() => onLike(post.id)}
              onComment={(body) => onComment(post.id, body)}
              onReply={(commentId, body) => onReply(post.id, commentId, body)}
              onShare={() => onShare(post.id)}
              onDelete={() => onDeletePost(post.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

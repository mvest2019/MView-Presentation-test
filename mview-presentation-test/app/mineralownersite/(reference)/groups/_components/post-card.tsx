"use client";

import { useState } from "react";

import type { GroupsAccess } from "../_lib/groups-access";
import { blockedReason } from "../_lib/groups-access";
import type { Post } from "../_lib/groups-types";
import {
  HeartIcon,
  ReplyIcon,
  ShareIcon,
  SpriteIcon,
  TrashIcon,
} from "./group-icons";

/**
 * ONE POST, AND EVERYTHING THAT CAN BE DONE TO IT.
 *
 * ── THE FOUR ACTIONS, AND WHY THREE OF THEM ARE GATED AND ONE IS NOT ──
 *
 * Like, comment and reply all WRITE something under the reader's name, so all
 * three ask `access.write`. Share does not: it copies a link to the clipboard,
 * which writes nothing, reveals nothing that is not already on the reader's
 * screen, and would be baffling to find disabled — a reader would conclude the
 * link was broken rather than that their plan had lapsed. See `groups-access`.
 *
 * ── A DISABLED CONTROL ALWAYS SAYS WHY ──
 *
 * `blockedReason` puts the same sentence on `title` and on the button's
 * accessible description, so the answer to "why can I not press this" is on the
 * control itself. A notice at the top of the page is not an answer: by the time
 * a reader is four posts down, it is off screen.
 *
 * ── WHO MAY DELETE A POST, AND WHY IT IS TWO PERMISSIONS ──
 *
 * `canModerate` is the ADMIN's power over other people's posts in a group they
 * run. `post.you` is the AUTHOR's power over their own words, which nobody has
 * to be an admin to have. They are ORed here, but they are passed separately
 * and labelled separately, because merging them into one boolean upstream is
 * how an admin control ends up quietly appearing on a page where the reader is
 * only the author — or, worse, the other way round.
 *
 * ── DELETING ASKS FIRST, IN PLACE ──
 *
 * Deleting is the one irreversible thing on this page, so it takes two presses
 * and the second one is labelled with what it does. The confirmation is inline
 * rather than a modal: a dialog over a feed hides the post being deleted, which
 * is the one thing the reader needs to look at before answering.
 */
export function PostCard({
  post,
  access,
  canModerate,
  youInitials,
  onLike,
  onComment,
  onReply,
  onShare,
  onDelete,
  showIds,
}: {
  post: Post;
  access: GroupsAccess;
  /** True when the reader is the admin of the group this post is in. */
  canModerate: boolean;
  youInitials: string;
  onLike: () => void;
  onComment: (body: string) => void;
  onReply: (commentId: string, body: string) => void;
  onShare: () => void;
  onDelete: () => void;
  /** Professional density prints the post's own id. */
  showIds?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [shared, setShared] = useState(false);

  const commentCount = post.comments.reduce(
    (total, comment) => total + 1 + comment.replies.length,
    0,
  );
  const why = blockedReason(access, "Joining in");

  const share = async () => {
    /* THE URL IS BUILT AT CLICK TIME, NOT IN RENDER. `window` does not exist on
       the server, and a value read during render would differ between the
       server's HTML and the browser's first paint — a hydration mismatch for a
       string nobody sees until they press the button. */
    const url = `${window.location.origin}${window.location.pathname}?g=${encodeURIComponent(
      post.id.split("-p")[0],
    )}#${post.id}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* A browser that refuses the clipboard (an insecure origin, a permission
         the reader declined) still gets the count and the confirmation, because
         the alternative is a control that looks broken. */
    }
    setShared(true);
    onShare();
    window.setTimeout(() => setShared(false), 2200);
  };

  const submitComment = (e: React.FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    onComment(body);
    setDraft("");
  };

  const submitReply = (e: React.FormEvent, commentId: string) => {
    e.preventDefault();
    const body = replyDraft.trim();
    if (!body) return;
    onReply(commentId, body);
    setReplyDraft("");
    setReplyTo(null);
  };

  return (
    <article className="gr-post" id={post.id}>
      <div className="gr-posthead">
        <span className="gr-av" aria-hidden="true">
          {post.initials}
        </span>
        <div className="gr-postwho">
          <div className="gr-postname">
            <strong>{post.author}</strong>
            {post.authorRole === "admin" ? (
              <span className="chip chip-mint gr-chip">Admin</span>
            ) : null}
            {post.you ? <span className="chip chip-slate gr-chip">You</span> : null}
          </div>
          <div className="tiny muted">
            {post.postedLabel}
            {showIds ? <span className="gr-id"> · {post.id}</span> : null}
          </div>
        </div>
        {canModerate || post.you ? (
          <button
            type="button"
            className="gr-iconbtn"
            onClick={() => setConfirming((v) => !v)}
            aria-expanded={confirming}
            title={post.you ? "Delete your post" : "Delete this post (admin)"}
          >
            <TrashIcon />
            <span className="gr-sr">
              {post.you ? "Delete your post" : "Delete this post as admin"}
            </span>
          </button>
        ) : null}
      </div>

      {confirming ? (
        <div className="gr-confirm" role="group" aria-label="Confirm deletion">
          <span className="small">
            Delete this post?{" "}
            <span className="muted">
              {post.you
                ? "It is yours, so it goes for everyone."
                : "You are the admin of this group, so it goes for everyone."}
            </span>
          </span>
          <span className="gr-confirmbtns">
            <button type="button" className="btn btn-sm gr-danger" onClick={onDelete}>
              Delete
            </button>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => setConfirming(false)}
            >
              Keep it
            </button>
          </span>
        </div>
      ) : null}

      <p className="gr-postbody">{post.body}</p>

      <div className="gr-acts">
        <button
          type="button"
          className={"gr-act" + (post.likedByYou ? " on" : "")}
          onClick={onLike}
          disabled={!access.write}
          title={access.write ? undefined : why}
          aria-pressed={post.likedByYou}
        >
          <HeartIcon filled={post.likedByYou} />
          <span>{post.likedByYou ? "Liked" : "Like"}</span>
          <span className="gr-count num">{post.likes}</span>
        </button>

        <button
          type="button"
          className={"gr-act" + (open ? " on" : "")}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <SpriteIcon id="mvi-chat" />
          <span>Comment</span>
          <span className="gr-count num">{commentCount}</span>
        </button>

        <button type="button" className="gr-act" onClick={share}>
          <ShareIcon />
          <span>{shared ? "Link copied" : "Share"}</span>
          <span className="gr-count num">{post.shares}</span>
        </button>
      </div>

      {open ? (
        <div className="gr-thread">
          {post.comments.length === 0 ? (
            <p className="tiny muted gr-empty">
              No comments yet.{" "}
              {access.write ? "Be the first to say something." : null}
            </p>
          ) : null}

          {post.comments.map((comment) => (
            <div className="gr-comment" key={comment.id}>
              <span className="gr-av gr-av-sm" aria-hidden="true">
                {comment.initials}
              </span>
              <div className="gr-commentbody">
                <div className="gr-postname">
                  <strong className="small">{comment.author}</strong>
                  {comment.you ? (
                    <span className="chip chip-slate gr-chip">You</span>
                  ) : null}
                  <span className="tiny muted">{comment.postedLabel}</span>
                </div>
                <p className="small">{comment.body}</p>

                {comment.replies.map((reply) => (
                  <div className="gr-reply" key={reply.id}>
                    <span className="gr-av gr-av-sm" aria-hidden="true">
                      {reply.initials}
                    </span>
                    <div>
                      <div className="gr-postname">
                        <strong className="small">{reply.author}</strong>
                        {reply.you ? (
                          <span className="chip chip-slate gr-chip">You</span>
                        ) : null}
                        <span className="tiny muted">{reply.postedLabel}</span>
                      </div>
                      <p className="small">{reply.body}</p>
                    </div>
                  </div>
                ))}

                {replyTo === comment.id ? (
                  <form
                    className="gr-replyform"
                    onSubmit={(e) => submitReply(e, comment.id)}
                  >
                    <input
                      autoFocus
                      value={replyDraft}
                      onChange={(e) => setReplyDraft(e.target.value)}
                      placeholder={`Reply to ${comment.author}`}
                      aria-label={`Reply to ${comment.author}`}
                    />
                    <button type="submit" className="btn btn-sm btn-primary">
                      Reply
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      onClick={() => {
                        setReplyTo(null);
                        setReplyDraft("");
                      }}
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    className="gr-link"
                    onClick={() => {
                      setReplyTo(comment.id);
                      setReplyDraft("");
                    }}
                    disabled={!access.write}
                    title={access.write ? undefined : why}
                  >
                    <ReplyIcon />
                    Reply
                  </button>
                )}
              </div>
            </div>
          ))}

          {access.write ? (
            <form className="gr-commentform" onSubmit={submitComment}>
              <span className="gr-av gr-av-sm" aria-hidden="true">
                {youInitials}
              </span>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Write a comment"
                aria-label="Write a comment"
              />
              <button type="submit" className="btn btn-sm btn-primary" disabled={!draft.trim()}>
                Comment
              </button>
            </form>
          ) : (
            <p className="tiny muted gr-empty">{why}</p>
          )}
        </div>
      ) : null}
    </article>
  );
}

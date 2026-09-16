/**
 * THE SHAPES THE GROUPS PAGE PRINTS.
 *
 * ── THE TWO KINDS OF GROUP, AND WHY THEY ARE ONE TYPE ──
 *
 * A public group is a place on the map: a county, an operator, a play. Anyone
 * may read it, anyone may post in it, and nobody owns it. A private group is a
 * room: it has an admin, a member list, and a door that only the admin opens.
 *
 * They are modelled as ONE `Group` with a `visibility` discriminator rather
 * than as two types, because everything the page does with a group below its
 * header — the feed, the composer, liking, commenting, replying, sharing — is
 * the same work on both. Splitting them would duplicate the whole post surface
 * for one boolean. What differs is authority, and authority is `role` plus
 * `origin`, which are the two fields every admin control reads.
 *
 * ── `role` IS ABOUT THIS READER, `origin` IS ABOUT THE GROUP ──
 *
 * They are kept apart because the product rule the page exists to make legible
 * needs both, and conflating them is exactly the mistake it has to avoid:
 *
 *   origin `created`      the reader made this group, so they are its admin and
 *                         may invite, remove, delete posts and delete it.
 *   origin `lease-claim`  the group came into being when a lease was claimed.
 *                         The reader is IN it because they claimed a share of
 *                         that lease — which is NOT the same as running it, so
 *                         `role` here is normally `member` and the admin is
 *                         somebody else, named on the panel.
 *   origin `public`       nobody is an admin. `role` is `member` once joined
 *                         and `visitor` before that.
 *
 * A page that showed the Delete Group button wherever `visibility === private`
 * would offer every co-owner on a claimed lease a control that is not theirs.
 * That is why `role` is carried per group and never derived from the kind.
 */

/** Which of the three public categories a public group is, or how a private one began. */
export type GroupKind = "county" | "operator" | "play" | "lease" | "owned";

export type GroupVisibility = "public" | "private";

/** How this reader came to be looking at the group. See the header. */
export type GroupOrigin = "public" | "created" | "lease-claim";

/**
 * What this reader may do in this group.
 *
 * `visitor` IS A REAL STATE and not an absence: a public group the reader has
 * not joined is fully readable, which is what makes the directory browsable.
 * It is the state the Join control exists for.
 */
export type GroupRole = "admin" | "member" | "visitor";

/** One person in a group's member list. */
export interface GroupMember {
  /** The appraisal roll's owner number where there is one — the identity. */
  id: string;
  /** As filed, which for an individual is LAST FIRST MIDDLE. */
  name: string;
  /** Two letters for the avatar disc, worked out once in `groups-data`. */
  initials: string;
  role: "admin" | "member";
  /** The town on the roll, "Working interest", or null when there is nothing to add. */
  note: string | null;
  /** True for the one row that is the reader — never offered a Remove control. */
  you: boolean;
}

/** A reply to a comment. One level deep, deliberately — see `PostComment`. */
export interface PostReply {
  id: string;
  author: string;
  initials: string;
  you: boolean;
  /** "2 days ago" — a fixed label, never a clock. See `groups-data`. */
  postedLabel: string;
  body: string;
}

/**
 * A comment on a post, with its replies.
 *
 * ONE LEVEL OF REPLY AND NO MORE. A thread that nests without limit is a thread
 * that cannot be laid out on a phone: every level costs an indent, and the
 * fourth one leaves a column two words wide. Comment → reply is the shape the
 * requirement asks for and the shape the page can draw at 360px.
 */
export interface PostComment {
  id: string;
  author: string;
  initials: string;
  you: boolean;
  postedLabel: string;
  body: string;
  replies: PostReply[];
}

/** One post in a group's feed. */
export interface Post {
  id: string;
  author: string;
  initials: string;
  /** Whether the author runs this group — the badge beside their name. */
  authorRole: "admin" | "member";
  /** True for the reader's own posts, which they may always delete. */
  you: boolean;
  postedLabel: string;
  body: string;
  likes: number;
  /** Whether the reader's own like is one of them. */
  likedByYou: boolean;
  shares: number;
  comments: PostComment[];
}

export interface Group {
  /** Stable, URL-safe, and the key for every piece of state the view holds. */
  id: string;
  name: string;
  visibility: GroupVisibility;
  kind: GroupKind;
  origin: GroupOrigin;
  /** The one line under the name: what this group is, in four or five words. */
  subtitle: string;
  /** A sentence explaining who is in here and what it is for. */
  about: string;
  /** This reader's standing. See the header — never derived from `visibility`. */
  role: GroupRole;
  memberCount: number;
  /**
   * The member list, for private groups only.
   *
   * EMPTY ON A PUBLIC GROUP, AND THAT IS NOT MISSING DATA. A county group has
   * every owner in the county in it; naming them would be publishing a roster
   * nobody joined a public room to be listed in. `memberCount` is what a public
   * group says about its size.
   */
  members: GroupMember[];
  /** Who runs a private group. Null on public groups, which have no admin. */
  adminName: string | null;
  /** The lease report this group came from, for a `lease-claim` group. */
  leaseSlug: string | null;
  /** `MCCABE ETAL GU · Lease 290271` — printed on lease groups only. */
  leaseLabel: string | null;
  posts: Post[];
}

/** The whole page's data, as one server-built model. */
export interface GroupsModel {
  groups: Group[];
  /** The reader's own display name and initials, for their avatar and posts. */
  you: { name: string; initials: string };
}

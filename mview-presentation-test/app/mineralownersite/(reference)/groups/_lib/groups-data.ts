import { leaseOwnerRecord, leaseRecords } from "@/app/mineralownersite/(portal)/leases/_lib/lease-records";
import { formatLeaseTitle } from "@/app/mineralownersite/(portal)/leases/_lib/lease-format";

import { inviteLeases } from "../../invite/_lib/invite-records";
import type { CoOwner } from "../../invite/_lib/invite-types";
import type {
  Group,
  GroupMember,
  GroupsModel,
  Post,
  PostComment,
} from "./groups-types";

/**
 * THE GROUPS THIS OWNER IS IN, ASSEMBLED.
 *
 * ── WHAT IS REAL HERE AND WHAT IS NOT. READ THIS FIRST. ──
 *
 * WHICH GROUPS EXIST IS DERIVED, not invented. The public groups are the
 * counties, the operators and the plays on this owner's own leases, read off
 * `leaseRecords` — the same fixture My Leases and Invite Co-Owners print. The
 * private lease groups are one per lease, which is the rule the product states:
 * claiming a lease creates a private group for it. WHO IS IN a lease group is
 * that lease's own roll of owners, read off `inviteLeases`. So a county that
 * appears here is a county this owner holds acreage in, and a name in a member
 * list is a name the Invite page would also offer.
 *
 * THE CONVERSATION IS A FIXTURE. There is no groups service behind this portal
 * — no posts to read, no likes to count, no membership to look up — so every
 * post, comment, reply, like count and share count below is written here to
 * give the page something to lay out. It is deliberately written as OWNERS
 * TALKING TO EACH OTHER and never as a filing, a volume or a figure, so that
 * nothing on this page can be mistaken for something the state or an operator
 * actually reported. The page carries a chip saying so.
 *
 * WIRING THIS TO A REAL SERVICE means replacing this module and nothing else:
 * every component reads `Group`, `Post` and `GroupMember` from
 * `groups-types.ts`, never this file's internals.
 *
 * ── EVERYTHING HERE IS DETERMINISTIC, AND THAT IS NOT A STYLE CHOICE ──
 *
 * No `Math.random`, no `Date.now`, no `new Date()`. This model is built once at
 * module scope and rendered on the server for the first paint and again on the
 * client when React hydrates; a value that differs between those two renders is
 * a hydration mismatch, and the two obvious ways to fill a fixture — a random
 * like count and a "3 days ago" worked out from the clock — are exactly that.
 * So counts come from a string hash of the id, and every timestamp is a FIXED
 * LABEL rather than a computed interval.
 */

/* ============================================================ small helpers */

/**
 * A stable 32-bit hash of a string — FNV-1a.
 *
 * Used for every count and every template choice, so "how many likes has this
 * post" is a pure function of the post's id. Same answer on the server, same
 * answer in the browser, same answer tomorrow.
 */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** The nth item of a list, chosen by a seed and never out of range. */
function pick<T>(items: readonly T[], seed: number): T {
  return items[seed % items.length];
}

/**
 * Two letters for an avatar disc.
 *
 * THE ROLL FILES A PERSON AS LAST FIRST MIDDLE, so the first letters of the
 * first two words are the family initial and the given initial, in that order —
 * which is what a reader scanning a member list is looking for. A one-word name
 * (a company, or a row filed with a single token) takes its first two letters
 * rather than being left with one, because a disc with a single letter in it
 * reads as a broken avatar.
 */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "??";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/** Title Case for a county or a field name the roll shouts in capitals. */
function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

/* =========================================================== the reader */

const YOU_NAME = leaseOwnerRecord.name;
const YOU_INITIALS = initialsOf(YOU_NAME);

/* ====================================================== the people pool */

/**
 * Everyone on this owner's leases, once each, keyed by owner number.
 *
 * THE OPERATOR IS NOT IN IT. `inviteLeases` carries the working-interest party
 * because it is on the appraisal roll, and the Invite page is right to show it
 * — a reader who knows it is on the roll and cannot find it assumes the list is
 * broken. A GROUP is a different thing: it is the mineral owners' room, and the
 * company that pays to drill is not one of them. Companies and trusts DO stay,
 * because a family trust holding a share is a co-owner however it is filed.
 */
const PEOPLE: Map<string, CoOwner> = new Map();
for (const lease of inviteLeases) {
  for (const owner of lease.owners) {
    if (owner.kind === "operator") continue;
    if (!PEOPLE.has(owner.ownerNumber)) PEOPLE.set(owner.ownerNumber, owner);
  }
}

/** The individuals only — the ones a post can plausibly be attributed to. */
const VOICES: CoOwner[] = [...PEOPLE.values()].filter(
  (owner) => owner.kind === "person",
);

function memberOf(owner: CoOwner, role: "admin" | "member"): GroupMember {
  return {
    id: owner.ownerNumber,
    name: owner.name,
    initials: initialsOf(owner.name),
    role,
    note: owner.city ? `${owner.city}, ${owner.state ?? "TX"}` : null,
    you: false,
  };
}

function youMember(role: "admin" | "member"): GroupMember {
  return {
    id: "you",
    name: YOU_NAME,
    initials: YOU_INITIALS,
    role,
    note: "You",
    you: true,
  };
}

/* ============================================================ the posts */

/**
 * WHAT A POST IN EACH KIND OF GROUP SOUNDS LIKE.
 *
 * `{subject}` is the group's own subject — the county, the operator, the play
 * or the lease — substituted in so a post cannot name a place this owner has
 * nothing in. Every line is one owner talking to other owners: a question, an
 * experience, an offer of help. NONE of them states a volume, a value, a date
 * of record or anything else that belongs to a filing, because a fixture
 * sentence that looks like data is the one kind of placeholder that can mislead
 * somebody reading over a shoulder.
 */
const TEMPLATES: Record<string, readonly string[]> = {
  county: [
    "Anyone else in {subject} still waiting on a statement this month? Mine normally turns up in the last week and there is nothing yet.",
    "A landman knocked on my aunt's door in {subject} last week asking about acreage. Before anyone rings back — has anybody here had the same call, and what was said?",
    "New to this. I inherited a share in {subject} and I am still learning to read a royalty statement. What did you look at first?",
    "I will post the county appraisal notice dates here every spring so nobody in {subject} files theirs unopened again.",
  ],
  operator: [
    "Has anyone had a division order back from {subject} in under a month? Mine has been with them since the spring.",
    "{subject} changed the remittance address on my last statement. Worth checking yours matches before the next run.",
    "Their owner relations line is answering again. Took three tries, but I got a person rather than a mailbox.",
    "If you write to {subject}, put your owner number on every page. Mine came back the first time because it was only on the covering letter.",
  ],
  play: [
    "For anyone on the {subject} — how many months of decline did you see before yours flattened out?",
    "I have been reading up on how {subject} wells are completed. If someone has a plain-English explainer they trust, post it here and I will read it properly.",
    "Useful thing a neighbour told me: on the {subject} the first year looks alarming and then it settles. Mine did exactly that.",
  ],
  lease: [
    "Putting this here so it is in one place rather than in six email chains: anything to do with {subject} goes in this group from now on.",
    "Does anyone have a copy of the original lease agreement for {subject}? Mine went with my father's papers and I would like to read the royalty clause again.",
    "Reminder for everyone on {subject} — if your address has changed, tell the operator in writing. A returned cheque takes months to reissue.",
    "Thank you to whoever chased the missing statement. It arrived this week.",
  ],
  owned: [
    "Made this so we stop forwarding the same statements round the family. Everything to do with our acreage goes here.",
    "I have added the three of you who wrote back. If anyone else should be in here, send me their email and I will send them an invitation.",
    "Worth a read before the next family meeting: the appraisal notice and the royalty statement are two different documents and they never agree. That is normal.",
  ],
};

/** The labels a feed uses, newest first. Fixed strings — see the header. */
const WHEN = ["2 hours ago", "Yesterday", "4 days ago", "Last week", "3 weeks ago"];

const COMMENTS: readonly string[] = [
  "Same here, and mine is usually the first to arrive. I will ring them on Monday and say what I am told.",
  "Thank you for putting this up — I had assumed it was only me.",
  "Mine came through on Tuesday, so they are at least working through them.",
  "Noted. I will check my paperwork this weekend and say if I find anything different.",
];

const REPLIES: readonly string[] = [
  "Rang them this morning — they say the run is a fortnight behind across the whole field.",
  "That matches what I was told last year. Thank you for checking.",
];

/**
 * A group's feed.
 *
 * THE FIRST POST IS ALWAYS THE ONE WITH THE CONVERSATION ON IT, and the counts
 * fall away down the list. That is not decoration: the page has to show a post
 * with comments, a post with a reply under a comment, and a post with neither,
 * and a feed where every post looked the same would let a layout bug in any one
 * of those three hide.
 *
 * ── THE LINE AND THE VOICE ARE DEALT, NOT DRAWN ──
 *
 * Both start at an offset taken from the GROUP's hash and then step by one per
 * post, rather than each post hashing its own id and picking independently.
 * Independent picks collide: with four templates, two of the three posts in a
 * group came out word for word identical often enough to reach a screenshot,
 * and the same happened to the author names. Stepping deals from the pack
 * instead — no line and no voice repeats inside one feed, while the group still
 * gets its own starting point, so no two groups open with the same sentence.
 */
function postsFor(
  groupId: string,
  kind: keyof typeof TEMPLATES,
  subject: string,
  adminName: string | null,
  authors: CoOwner[],
  yourPost: boolean,
): Post[] {
  const seed = hash(groupId);
  const lines = TEMPLATES[kind];
  const count = Math.min(lines.length, 2 + (seed % 2));
  const firstLine = seed % lines.length;
  const firstVoice = authors.length ? seed % authors.length : 0;

  return Array.from({ length: count }, (_, i) => {
    const id = `${groupId}-p${i}`;
    const s = hash(id);
    /* THE READER'S OWN POST IS PINNED TO THE TOP OF A GROUP THEY RUN, which is
       where an admin's "why this group exists" post belongs — and it gives the
       page a post whose Delete control is the author's own rather than an
       admin's, which are two different permissions wearing one label. */
    const mine = yourPost && i === 0;
    const author =
      mine || authors.length === 0 ? null : authors[(firstVoice + i) % authors.length];
    const name = mine ? YOU_NAME : (author?.name ?? adminName ?? YOU_NAME);

    return {
      id,
      author: name,
      initials: initialsOf(name),
      authorRole: mine || name === adminName ? "admin" : "member",
      you: mine,
      postedLabel: WHEN[i % WHEN.length],
      body: lines[(firstLine + i) % lines.length].replace(/\{subject\}/g, subject),
      likes: 1 + (s % 14),
      likedByYou: s % 3 === 0,
      shares: s % 4,
      comments: commentsFor(id, i, authors, firstVoice),
    };
  });
}

/**
 * The comments under one post — and the people in them are never the person who
 * wrote it, for the same reason the posts do not repeat: the voices are dealt
 * from the same pack, starting one past the post's own author.
 */
function commentsFor(
  postId: string,
  index: number,
  authors: CoOwner[],
  firstVoice: number,
): PostComment[] {
  if (index > 1 || authors.length === 0) return [];
  const many = index === 0 ? 2 : 1;
  return Array.from({ length: many }, (_, c) => {
    const id = `${postId}-c${c}`;
    const s = hash(id);
    const author = authors[(firstVoice + index + 1 + c) % authors.length];
    const replier = authors[(firstVoice + index + 3) % authors.length];
    return {
      id,
      author: author.name,
      initials: initialsOf(author.name),
      you: false,
      postedLabel: WHEN[(c + 1) % WHEN.length],
      body: pick(COMMENTS, s + c),
      replies:
        /* THREE VOICES OR NO REPLY. On a lease with only two individuals on the
           roll, any third pick is one of the two already speaking — and a reply
           from the person being replied to reads as a bug rather than as a
           small lease. */
        index === 0 && c === 0 && authors.length >= 3
          ? [
              {
                id: `${id}-r0`,
                author: replier.name,
                initials: initialsOf(replier.name),
                you: false,
                postedLabel: "Yesterday",
                body: pick(REPLIES, s),
              },
            ]
          : [],
    };
  });
}

/* =========================================================== the groups */

/** Unique values in first-seen order — the order the leases fixture is in. */
function uniq(values: (string | null)[]): string[] {
  const out: string[] = [];
  for (const v of values) if (v && !out.includes(v)) out.push(v);
  return out;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * THE PUBLIC HALF — three categories, and they are the three the product names:
 * County, Operators, Play Types.
 *
 * WHICH ONES THE READER HAS JOINED is decided by SHARE OF THE PORTFOLIO rather
 * than at random: the county they hold acreage in, the operator that runs most
 * of their leases and the play most of it sits on are the three rooms they were
 * put in when the record was claimed. The rest are there to be found and
 * joined, which is what makes the directory a directory rather than a list of
 * things already done.
 */
function publicGroups(): Group[] {
  const counties = uniq(leaseRecords.map((l) => l.county));
  const operators = uniq(leaseRecords.map((l) => l.operator));
  const plays = uniq(leaseRecords.map((l) => l.reservoir));

  const leasesIn = (match: (l: (typeof leaseRecords)[number]) => boolean) =>
    leaseRecords.filter(match);

  /** How many owners this portal knows of inside a public group's scope. */
  const ownersIn = (slugs: string[]): number => {
    const ids = new Set<string>();
    for (const lease of inviteLeases) {
      if (!slugs.includes(lease.leaseId)) continue;
      for (const owner of lease.owners) {
        if (owner.kind !== "operator") ids.add(owner.ownerNumber);
      }
    }
    return ids.size;
  };

  const groups: Group[] = [];

  counties.forEach((county, i) => {
    const mine = leasesIn((l) => l.county === county);
    const id = `county-${slugify(county)}`;
    const name = `${titleCase(county)} County`;
    groups.push({
      id,
      name,
      visibility: "public",
      kind: "county",
      origin: "public",
      subtitle: "County",
      about: `Everyone with a mineral or royalty interest in ${name}. Anyone may read it and anyone may post — it is the room for what is happening locally: landmen calling, statements running late, who has heard what.`,
      role: i === 0 ? "member" : "visitor",
      memberCount: ownersIn(mine.map((l) => l.slug)) + (i === 0 ? 1 : 0),
      members: [],
      adminName: null,
      leaseSlug: null,
      leaseLabel: null,
      posts: postsFor(id, "county", name, null, VOICES, false),
    });
  });

  /* THE OPERATORS, MOST LEASES FIRST — the one running most of this owner's
     acreage is the one they most need to hear about, so it leads and it is the
     one they are in. */
  const byOperator = [...operators].sort(
    (a, b) =>
      leasesIn((l) => l.operator === b).length -
      leasesIn((l) => l.operator === a).length,
  );
  byOperator.forEach((operator, i) => {
    const mine = leasesIn((l) => l.operator === operator);
    const id = `operator-${slugify(operator)}`;
    groups.push({
      id,
      name: operator,
      visibility: "public",
      kind: "operator",
      origin: "public",
      subtitle: "Operator",
      about: `Owners whose leases are run by ${operator}. Division orders, remittance addresses, who answers the phone and when — the practical business of dealing with one operator.`,
      role: i === 0 ? "member" : "visitor",
      memberCount: ownersIn(mine.map((l) => l.slug)) + (i === 0 ? 1 : 0),
      members: [],
      adminName: null,
      leaseSlug: null,
      leaseLabel: null,
      posts: postsFor(id, "operator", operator, null, VOICES, false),
    });
  });

  const byPlay = [...plays].sort(
    (a, b) =>
      leasesIn((l) => l.reservoir === b).length -
      leasesIn((l) => l.reservoir === a).length,
  );
  byPlay.forEach((play, i) => {
    const mine = leasesIn((l) => l.reservoir === play);
    const id = `play-${slugify(play)}`;
    const name = titleCase(play);
    groups.push({
      id,
      name,
      visibility: "public",
      kind: "play",
      origin: "public",
      subtitle: "Play type",
      about: `Owners whose wells produce from the ${name}. How these wells behave over their life, what a normal decline looks like, and what the completions mean in plain English.`,
      role: i === 0 ? "member" : "visitor",
      memberCount: ownersIn(mine.map((l) => l.slug)) + (i === 0 ? 1 : 0),
      members: [],
      adminName: null,
      leaseSlug: null,
      leaseLabel: null,
      posts: postsFor(id, "play", name, null, VOICES, false),
    });
  });

  return groups;
}

/**
 * THE PRIVATE HALF.
 *
 * ── ONE GROUP PER CLAIMED LEASE, AND THE READER DOES NOT RUN THEM ──
 *
 * Claiming a lease creates a private group for it — that is the product rule,
 * so there is one group here for every lease on the record. The reader is in
 * each of them because they own a share, and they are a MEMBER of each of them,
 * not an admin: access through a claim is not ownership of the room. The admin
 * is the owner who opened it, which this fixture takes to be the largest
 * individual interest on the lease. That is a stand-in for "whoever claimed it
 * first", which is the fact a real service would know and this one cannot.
 *
 * ── AND ONE THE READER MADE, WHICH IS WHERE THE ADMIN CONTROLS LIVE ──
 *
 * The page has to show both sides of the same surface: a private group where
 * every admin control is present, and a private group where none of them is. So
 * the record carries one group the reader created — the family group — and the
 * two sit next to each other in the same list, told apart by their badges and
 * by what the panel offers.
 */
function privateGroups(): Group[] {
  const groups: Group[] = [];

  /* ---- the reader's own group, which they admin */
  const family = leaseOwnerRecord.name.split(" ")[0];
  /* THE PEOPLE IN IT ARE THE PEOPLE WHO POST IN IT, which is the whole point of
     a private group and was worth one variable to get right: the voices are
     picked from this list rather than from the whole roll, so a name in the
     feed is always a name in the member list above it. */
  const familyVoices: CoOwner[] = [
    ...VOICES.filter((owner) => owner.name.startsWith(family.toUpperCase())).slice(0, 4),
    ...VOICES.filter((owner) => owner.name.startsWith("KAISER")).slice(0, 2),
  ];
  const familyMembers: GroupMember[] = [
    youMember("admin"),
    ...familyVoices.map((owner) => memberOf(owner, "member")),
  ];
  const familyName = `${titleCase(family)} family minerals`;
  groups.push({
    id: "owned-family",
    name: familyName,
    visibility: "private",
    kind: "owned",
    origin: "created",
    subtitle: "You created this group",
    about:
      "A private group you made. Only the people you invite can see it or post in it, and you decide who stays in it.",
    role: "admin",
    memberCount: familyMembers.length,
    members: familyMembers,
    adminName: YOU_NAME,
    leaseSlug: null,
    leaseLabel: null,
    posts: postsFor("owned-family", "owned", familyName, YOU_NAME, familyVoices, true),
  });

  /* ---- one per claimed lease */
  for (const lease of inviteLeases) {
    const record = leaseRecords.find((l) => l.slug === lease.leaseId);
    const people = lease.owners.filter((owner) => owner.kind === "person");
    const others = lease.owners.filter(
      (owner) => owner.kind !== "person" && owner.kind !== "operator",
    );
    /* The largest individual share runs it — see the header on why. */
    const admin = people[0] ?? null;
    const members: GroupMember[] = [
      ...(admin ? [memberOf(admin, "admin")] : []),
      youMember("member"),
      ...people.slice(1).map((owner) => memberOf(owner, "member")),
      ...others.map((owner) => memberOf(owner, "member")),
    ];
    const id = `lease-${lease.leaseId}`;
    const label = formatLeaseTitle(lease.leaseName, lease.leaseNumber);

    groups.push({
      id,
      name: label,
      visibility: "private",
      kind: "lease",
      origin: "lease-claim",
      subtitle: "From a lease you claimed",
      about: `The private group for ${label}. It opened when the lease was claimed, and everyone on the appraisal roll for it belongs in here — ${titleCase(lease.county)} County, operated by ${record?.operator ?? "the operator"}.`,
      role: "member",
      memberCount: members.length,
      members,
      adminName: admin?.name ?? null,
      leaseSlug: lease.leaseId,
      leaseLabel: label,
      posts: postsFor(id, "lease", label, admin?.name ?? null, people, false),
    });
  }

  return groups;
}

/**
 * The model, built once.
 *
 * MODULE SCOPE ON PURPOSE. It is the same answer every time — see the header on
 * determinism — so building it per request would be work repeated to produce a
 * value that cannot change. The view copies it into state on mount, and every
 * interaction from then on is the reader's rather than this module's.
 */
export const groupsModel: GroupsModel = {
  groups: [...publicGroups(), ...privateGroups()],
  you: { name: YOU_NAME, initials: YOU_INITIALS },
};

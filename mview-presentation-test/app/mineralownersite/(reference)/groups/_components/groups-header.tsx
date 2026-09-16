"use client";

import Link from "next/link";

import type { GroupsAccess } from "../_lib/groups-access";
import type { Group } from "../_lib/groups-types";

/**
 * THE PAGE HEAD.
 *
 * THE STRAPLINE IS THE PREMISE, the way the Invite page's is: a reader arriving
 * here does not yet know that there are two kinds of group, that one of them
 * appeared because they claimed a lease, or that the other is open to anybody.
 * Two sentences, and the badges on every row below them then mean something.
 *
 * THE SIZE IS THE GROUP'S, NOT THE `h1` RULE'S. `.mv-ref-app h1` is 44px — a
 * marketing headline. Alerts, Activities and Invite all draw their page title
 * at 24px, and matching the pages either side of this one matters more than
 * inheriting a rule written for the public site. See `groups.css`.
 */
export function GroupsHeader() {
  return (
    <div className="gr-top">
      <div className="section-label">Community</div>
      <h1 className="gr-pagetitle">Groups</h1>
      <p className="small muted">
        Two kinds of room. <strong>Public groups</strong> — your county, your
        operators, your play types — are open to every mineral owner on Mineral
        View. <strong>Private groups</strong> are closed: one opens for each
        lease you claim, and you can start your own and invite whoever you like.
      </p>
    </div>
  );
}

/**
 * THE STRIP — four counts, each answering one of the questions the requirement
 * says a reader must be able to answer at a glance.
 *
 * NOT DECORATION, AND NOT A DASHBOARD. Each tile is the ANSWER to a question the
 * directory below can only answer by being read row by row: how many rooms am I
 * in, how many do I run, how many came from claiming a lease, how many could I
 * still join. They are derived from the same array the list is drawn from, so
 * they cannot drift from it.
 *
 * IT ADAPTS RATHER THAN LOCKS. With nothing claimed there are no private
 * groups to count, so the two private tiles are replaced by one that says what
 * claiming opens — a tile reading "0" beside a padlock tells a visitor they
 * have failed at something rather than that there is something to do.
 */
export function GroupsStats({
  groups,
  access,
}: {
  groups: Group[];
  access: GroupsAccess;
}) {
  const joined = groups.filter((g) => g.role !== "visitor").length;
  const admin = groups.filter((g) => g.role === "admin").length;
  const fromLease = groups.filter((g) => g.origin === "lease-claim").length;
  const toJoin = groups.filter((g) => g.role === "visitor").length;
  const posts = groups.reduce((total, g) => total + g.posts.length, 0);

  /* NOTHING CLAIMED IS A DIFFERENT SET OF QUESTIONS, not the same set answered
     with zeroes. A visitor is not in any group and runs none, so the tiles ask
     what there is to read and what claiming would open. */
  if (!access.privateGroups) {
    return (
      <div className="grid g4 gr-stats">
        <div className="kpi">
          <div className="k-label">Public groups</div>
          <div className="k-val num">{groups.length}</div>
          <div className="k-sub">Open to read without claiming anything</div>
        </div>
        <div className="kpi">
          <div className="k-label">Posts to read</div>
          <div className="k-val num">{posts}</div>
          <div className="k-sub">Written by other mineral owners</div>
        </div>
        <div className="kpi gr-locked">
          <div className="k-label">Private groups</div>
          <div className="k-val">Locked</div>
          <div className="k-sub">
            <Link href="/mineralownersite/claim">Claim your record</Link> and each
            lease opens one
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid g4 gr-stats">
      <div className="kpi">
        <div className="k-label">Groups you are in</div>
        <div className="k-val num">{joined}</div>
        <div className="k-sub">Public and private together</div>
      </div>

      <div className="kpi">
        <div className="k-label">Private groups you run</div>
        <div className="k-val num">{admin}</div>
        <div className="k-sub">You invite, remove and moderate in these</div>
      </div>

      <div className="kpi">
        <div className="k-label">From claimed leases</div>
        <div className="k-val num">{fromLease}</div>
        <div className="k-sub">You are a member — somebody else is admin</div>
      </div>

      <div className="kpi">
        <div className="k-label">{toJoin ? "Public groups to join" : "Posts to read"}</div>
        <div className="k-val num">{toJoin || posts}</div>
        <div className="k-sub">
          {toJoin
            ? "Open to anyone — join and post"
            : "Across every group you are in"}
        </div>
      </div>
    </div>
  );
}

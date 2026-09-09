import type { Metadata } from "next";
import Link from "next/link";

import Portal from "../../../_components/reference/Portal";
import {
  getOwnerPayload,
  type OwnerSelection,
} from "../../../_lib/reference/owner-data";
import type { Payload } from "../../../_lib/reference/payload";
import "./soon.css";

/**
 * The portal sections that are not built yet.
 *
 * PORTED FROM the reference's `src/app/soon/[slug]/page.tsx`, and it exists for
 * its reason: "They are real routes rather than dead links, because a
 * navigation item that does nothing when clicked reads as a bug."
 *
 * ADAPTED — WHICH SECTIONS APPEAR. My Leases, Map, Settings, the Weekly Report
 * and now Production & Forecast ARE in this app, so their sidebar rows point at
 * the real pages and never reach here; keeping a "coming soon" page for one of
 * them would print a false statement about a page sitting one click away.
 * Production & Forecast had an entry here until that page was ported, and it
 * was removed then rather than left to contradict the sidebar. The three that
 * genuinely do not exist here — Lease Audit, Groups, Invite Co-Owners — keep
 * the reference's own description of what the module is, and the two account
 * rows keep theirs. The back buttons point at this app's paths.
 *
 * ADAPTED — IT SAYS "COMING SOON", AND IT LOOKS LIKE THE PRODUCT. Two fixes to
 * one page, and they are the same fix:
 *
 *   · THE WORDING. The eyebrow read "Not in this build" and two of the five
 *     sections had "Not in this build." as their whole second line. That is a
 *     sentence about a BUILD, which is the release engineer's frame, not the
 *     owner's — and the sidebar row that sends them here is tagged `soon`, so
 *     the page contradicted the label they clicked. Every section now leads
 *     with `Coming soon` and follows with something true about when or why,
 *     because a status with no substance behind it is just an apology.
 *
 *   · THE STYLING. This page renders no `Portal`, and every rule in
 *     `dashboard-reference.css` is scoped under `.mv-ref-app` — the single root
 *     element `Portal` renders. So `card`, `card-pad`, `btn` and `mv-soon`
 *     matched nothing here and the page arrived as unstyled document flow:
 *     a black serif-less heading against a white window, the three buttons a
 *     row of bare blue links. The root element below carries `mv-ref-app`
 *     itself, which is all the scope those rules ever wanted; `soon.css` adds
 *     the medallion, the pill and the centring the reference has no equivalent
 *     for.
 *
 * ADAPTED — IT KEEPS THE SHELL, which is the third thing that was wrong with
 * it and the one that made it feel like a different website. The sidebar and
 * the top bar vanished on arrival, because this page rendered its card and
 * nothing else: no `Portal`, so no owner picker, no pinned value line, no
 * sidebar to see the row you just clicked, and no way back except the three
 * buttons on the card. A page reached FROM the sidebar should keep the sidebar
 * — the module is unfinished, the portal is not.
 *
 * It renders `Portal` with the card as `children`, exactly as the Map does,
 * and passes `route={null}`: none of these five sections is a `Route`, and
 * `null` is the shell saying so — no sidebar row lights, nothing is marked
 * `aria-current`, and the top bar prints no page name to be wrong. See that
 * prop's note in `Portal`.
 *
 * `shellClass` FOR THE SAME REASON THE MAP PASSES ONE: the card is centred in
 * the body rather than parked at the top of it, and `.app-body` is an ANCESTOR
 * of `children`, so this page has nothing of its own to hang the class on. Two
 * rules, in `soon.css`.
 *
 * `force-dynamic`, AND THAT IS THE PRICE OF THE CHROME. The card is static and
 * always was; the shell around it is not — the owner picker, the sidebar foot
 * and the pinned value line all come off one owner payload, and the owner comes
 * off the query string, so there is nothing correct to cache at the page level.
 * The same read the Map does, for the same reason: without it the shell mounts
 * empty and fetches the owner from the client, which puts a several-second
 * loader over a page that is only there to say "not yet".
 */
export const dynamic = "force-dynamic";

type Section = {
  title: string;
  /** the sidebar icon for this row — see `_components/reference/Sprite.tsx` */
  icon: string;
  what: string;
  when: string;
};

const SECTIONS: Record<string, Section> = {
  "lease-audit": {
    title: "Lease Audit",
    icon: "mvi-audit",
    what:
      "A line-by-line comparison of the volumes filed with the state against the volumes on " +
      "your own royalty statements.",
    when:
      "This is the one thing the public record cannot answer on its own: it shows what came " +
      "out of the ground, never what reached you. It needs your statements, so it arrives with " +
      "statement upload.",
  },
  groups: {
    title: "Groups",
    icon: "mvi-groups",
    what: "A private space per lease for the other owners in it.",
    when:
      "Being built. Your leases and the owners on them are already on the roll, which is what " +
      "this needs to open.",
  },
  "invite-co-owners": {
    title: "Invite Co-Owners",
    icon: "mvi-invite",
    what: "Invitations to the other owners on your leases.",
    when: "Being built, alongside Groups — an invitation needs somewhere to invite people to.",
  },
  "my-profile": {
    title: "My Profile",
    icon: "mvi-user",
    what: "Your details and how you are identified on the roll.",
    when:
      "Part of it is live already: how this record was matched is in your profile menu, at the " +
      "top right. The rest is coming.",
  },
  "billing-and-plan": {
    title: "Billing & Plan",
    icon: "mvi-billing",
    what: "Your plan and payment details.",
    when: "Coming soon. Nothing here is billed while it is on its way.",
  },
};

/**
 * ANY OTHER SLUG. Nothing in this app links to one — the sidebar builds its
 * hrefs from the same five labels — so reaching this means a typed or a stale
 * URL, and it answers the only question that has: not here, here is what is.
 * Its title is not "Coming soon" because the eyebrow above it already says so,
 * and a heading that repeats the line above it tells the reader nothing twice.
 */
const FALLBACK: Section = {
  title: "This section",
  icon: "mvi-lock",
  what: "This part of the wider portal has not opened yet.",
  when: "The Dashboard, the Weekly Report, Production & Forecast, Alerts and the Map are live now.",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const s = SECTIONS[slug] ?? FALLBACK;
  /* "This section — coming soon" is not a tab label; the fallback names itself */
  return {
    title: s === FALLBACK ? "Coming soon" : `${s.title} — coming soon`,
    description: s.what,
  };
}

export default async function Soon({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const s = SECTIONS[slug] ?? FALLBACK;
  const sel = ownerFrom(await searchParams);
  const initial: Payload | null = await load(sel);
  /* the three buttons keep the owner too — see `keep` */
  const q = keep(sel);

  return (
    <Portal route={null} initial={initial} shellClass="mv-ref-soonshell">
      <div className="card card-pad mv-soon mv-soon-card">
        {/* the sprite is in the document already — the group's layout renders it
            once, so `<use>` resolves without this page shipping any SVG */}
        <div className="mv-soon-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <use href={`#${s.icon}`} />
          </svg>
        </div>
        <p className="mv-soon-eyebrow">Coming soon</p>
        <h1>{s.title}</h1>
        <p className="small mv-soon-what">{s.what}</p>
        <p className="small mv-soon-note">{s.when}</p>
        <p className="mv-soon-actions">
          <Link className="btn btn-mint" href={`/mineralownersite${q}`}>
            ← Back to the Dashboard
          </Link>
          <Link className="btn btn-ghost" href={`/mineralownersite/briefing${q}`}>
            Weekly Report
          </Link>
          <Link className="btn btn-ghost" href={`/mineralownersite/alerts${q}`}>
            Alerts
          </Link>
        </p>
      </div>
    </Portal>
  );
}

/**
 * THE FOUR OWNER PARAMETERS — the same read the Dashboard and the Map do.
 *
 * They are here for the chrome, not for the card: the picker, the sidebar foot
 * and the pinned value line all come off one owner, and the card is the same
 * five sentences whoever is loaded. The sidebar's coming-soon rows carry the
 * query string across the click so this read has something to find — see
 * `goSoon` in `Chrome`.
 */
function ownerFrom(
  q: Record<string, string | string[] | undefined>,
): OwnerSelection {
  const one = (k: string): string | undefined => {
    const v = q[k];
    return Array.isArray(v) ? v[0] : v;
  };
  return {
    owner: one("owner") ?? null,
    num: one("num") ?? null,
    dist: one("dist") ?? null,
    year: one("year") ? Number(one("year")) : null,
  };
}

/**
 * `null` on a failure rather than a thrown page, which is the Map's reasoning
 * and holds more strongly here: the card does not depend on the payload at all,
 * so a failed owner read costs the chrome its figures and costs this page
 * nothing.
 */
async function load(sel: OwnerSelection): Promise<Payload | null> {
  try {
    return await getOwnerPayload(sel);
  } catch {
    return null;
  }
}

/**
 * The owner, back out as a query string for the three buttons.
 *
 * WHY NOT JUST FORWARD THE URL WE WERE GIVEN. Because these are links printed
 * into the page: everything in that query string would be re-emitted as an
 * href, and a query string is reader input. Rebuilding it from the four keys
 * that mean something is the same work with none of that — anything else in the
 * URL is dropped rather than propagated, and each value goes through
 * `URLSearchParams`, which encodes it.
 *
 * Empty when there is no owner to keep, so a cold entry links at the plain
 * paths instead of a bare `?`.
 */
function keep(sel: OwnerSelection): string {
  if (!sel.owner) return "";
  const q = new URLSearchParams({ owner: sel.owner });
  if (sel.num) q.set("num", String(sel.num));
  if (sel.dist) q.set("dist", sel.dist);
  if (sel.year) q.set("year", String(sel.year));
  return `?${q.toString()}`;
}

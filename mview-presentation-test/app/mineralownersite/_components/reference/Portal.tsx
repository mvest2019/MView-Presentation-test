'use client';
/* eslint-disable react-hooks/set-state-in-effect --
 * THE EFFECTS BELOW ARE THE REFERENCE'S, AND EACH ONE SYNCHRONISES WITH AN
 * EXTERNAL SYSTEM, which is what an effect is for. This rule fires on the
 * `setState` that carries the outside world's answer back into React, and the
 * alternatives are worse than the warning:
 *
 *   · reading `localStorage` on mount — the reference's own note says why it is
 *     an effect and not initial state: "so the server and the first client
 *     render agree". Moving it into `useState` reintroduces the hydration
 *     mismatch it was written to avoid.
 *   · the retry when the server sent no payload — a fetch, reported through
 *     state, which is the documented pattern for exactly that.
 *   · the loader's step ticker and the search box's 450ms debounce — a timer is
 *     an external system, and its callback is where the `setState` belongs.
 *
 * Rewriting them would make these files forks of the reference rather than
 * copies, and this port's whole value is that they are copies. The rule stays
 * on everywhere else in the app.
 */
/**
 * The portal shell: one client component that owns every piece of state the
 * surfaces share, and the chrome around them.
 *
 * PORTED FROM `src/components/Portal.tsx` in the reference build. The state
 * machine below — the five funnel states, the four densities, the forced
 * density while unclaimed, the sample transform, the trial stamp, the drawer,
 * the owner load, the body/root classes — is the reference's, comments
 * included. FIVE ADAPTATIONS, each marked `ADAPTED` where it appears:
 *
 *   1  THE ROUTE TABLE. The reference serves `/`, `/alerts`, `/activities` and
 *      `/weekly`. Here the Dashboard is `/mineralownersite` and the Weekly
 *      Report is `/mineralownersite/briefing`, which is where this app's
 *      sidebar has always pointed.
 *
 *   2  THE MAP IS A FIFTH ROUTE. The reference has four surfaces; this app
 *      also has the map, so `Route` carries it and the sidebar row points at
 *      `/mineralownersite/map`. It is not one of `OWNED` — it renders itself
 *      through `children`, per adaptation 3 — but it is in the table, so Back
 *      onto it resolves to the right row.
 *
 *   3  A PAGE CAN BRING ITS OWN VIEW. `children`, plus `shellClass` for the
 *      layout that view needs. The Map is the one caller: it is a route of its
 *      own under this same group, so it gets this shell's sidebar, top bar,
 *      owner picker and pinned value line without this file growing a third
 *      surface. See the props.
 *
 *   4  THE GATE CLASSES GO ON THE ROOT ELEMENT, not on `<body>`. The reference
 *      writes `in-app`, `view-*`, `no-claim`/`mv-sample` and `state-*` to the
 *      document body, which is fine in an app that is nothing but this portal.
 *      Here the same document also carries the marketing site, so the classes
 *      go on this component's own wrapper and the ported stylesheet is scoped
 *      to it. Without that, `state-claimed .cl-lock` would blur figures on
 *      pages that have nothing to do with this one.
 *
 *   5  THE FUNNEL STATE OPENS ON THE RECORD. The reference starts at `'paid'`
 *      because it is a prototype demonstrating five states. Here a real member
 *      signs in, so an EMPTY `owner.claimed_owners` opens on `'unclaimed'`
 *      instead of showing a paid dashboard to somebody with nothing claimed.
 *      The other four states are still the menu's, because nothing any source
 *      returns distinguishes them.
 */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import type { Payload } from '../../_lib/reference/payload';
import type { Drawer as DrawerCopy } from '../../_lib/reference/payload';
import { sampleize } from '../../_lib/reference/sample';
import { type Tier } from './bits';
import Chrome from './Chrome';
import Dashboard from './Dashboard';
import WeeklyView from './WeeklyView';
import AlertsView from './AlertsView';
import ActivitiesView from './ActivitiesView';
import DrawerPanel from './DrawerPanel';
import type { SpotQuote } from './Chrome';
import Loader, { type Step } from './Loader';
import ProductionView from './ProductionView';
import { PortalViewStateProvider } from './view-state';
import { usePortalPrefs, writePortalPref } from './prefs-context';
import {
  PORTAL_FUNNEL_COOKIE,
  PORTAL_TIER_COOKIE,
} from '../../_lib/reference/portal-prefs';

export type Route = 'dashboard' | 'alerts' | 'activities' | 'leases'
  | 'production' | 'weekly' | 'map';

/** the five funnel states, in funnel order — the prototype's own sequence */
/** the brief's interval, and the only thing on this page that repeats */
const SPOT_POLL_MS = 10_000;

/* ------------------------------------------- long name lists in a drawer */
/**
 * PAST THREE NAMES, A LIST IS A COUNT.
 *
 * WHAT THIS FIXES. The service composes each explainer's prose itself, and for
 * a portfolio of any size it spells the whole county list into the middle of a
 * sentence: "284 wells have been completed and reported in ANDREWS, BORDEN,
 * BURLESON, CROCKETT, CULBERSON, DAWSON, FREESTONE, GLASSCOCK, GRAYSON,
 * GRIMES, HOWARD, IRION, JONES, LEE, LEON, LIBERTY, LOVING, MARTIN, MIDLAND,
 * PECOS, REEVES, UPTON, WINKLER in the last 24 months." Twenty-three names is
 * not a fact a reader takes in; the number is. Measured on the live record,
 * that exact list is inlined in four places across the drawers — `completions`
 * and `status` in their opening line, and the `alert:completions` and
 * `alert:permits-filed` panels in their titles.
 *
 * IT MATCHES THE PAYLOAD'S OWN LIST, VERBATIM, AND NOTHING ELSE. `totals`
 * carries `counties` and `operator_names`, which are the same arrays the
 * service builds that sentence from, so the whole joined string is searched
 * for as one literal and swapped for its count.
 *
 * A PATTERN WOULD HAVE BEEN WRONG, and this is not a theoretical objection.
 * The obvious alternative — collapse any run of comma-separated capitalised
 * words — rewrites things that are not name lists at all: `alert:permits-filed`
 * has the evidence row "JETTA OPERATING COMPANY, INC., New Drill", where the
 * commas are inside ONE operator's name and the run is three "items" long.
 * Matching the known list exactly cannot misfire on prose it was not meant to
 * touch, and cannot collapse a list of two counties that happens to sit beside
 * two other capitalised words.
 *
 * THE CONSEQUENCE, STATED: where the service composes a DIFFERENT selection —
 * a subset, another order, another separator — nothing matches and the text is
 * left exactly as it came. That is the intended trade. Leaving a sentence
 * untouched is a much smaller fault than rewriting one this did not understand.
 *
 * AT THE DRAWER, NOT AT THE PAYLOAD, so this reaches every right-side panel —
 * the eleven flat ones, the twelve `pf_*`, and each `lease:*`, `well:*` and
 * `alert:*` — and reaches nothing else. The Dashboard page has its own, older
 * answer to the same problem in `NameList`, which collapses the greeting line's
 * counties at five and its operators at three and gives the reader a control to
 * expand them; that is untouched, and so are the alert cards on the Alerts page
 * whose titles these drawers borrow.
 */
const MAX_DRAWER_NAMES = 3;

function collapseList(text: string, names: string[], many: string): string {
  if (names.length <= MAX_DRAWER_NAMES) return text;
  const joined = names.join(', ');
  if (!joined || !text.includes(joined)) return text;
  return text.split(joined).join(`${names.length} ${many}`);
}

/**
 * One panel with its county and operator lists reduced to counts.
 *
 * Returns the SAME object when nothing matched, so a panel the service wrote
 * without a list in it keeps its identity across renders — `DrawerPanel` keys
 * its scroll reset on `copy.title`, and there is no reason to hand it a new
 * object to compare.
 */
function collapseNames(
  d: DrawerCopy | null, counties: string[], operators: string[],
): DrawerCopy | null {
  if (!d) return null;
  if (counties.length <= MAX_DRAWER_NAMES && operators.length <= MAX_DRAWER_NAMES) return d;
  const fix = (t: string) =>
    collapseList(collapseList(t, counties, 'counties'), operators, 'operators');

  let touched = false;
  const one = (t: string) => { const v = fix(t); if (v !== t) touched = true; return v; };

  const next: DrawerCopy = {
    ...d,
    title: one(d.title),
    sub: one(d.sub),
    what: one(d.what),
    means: one(d.means),
    next: one(d.next),
    evidence: d.evidence.map(one),
    chips: d.chips.map(one),
    /* THE STATS BAND TOO, AND IT WAS THE ONE PLACE THIS FIRST MISSED.
       `AlertStat` looked like a label and a figure — nothing a list would fit
       in — so it was left out. It is where the list is most visible: the
       completions and permits panels put the whole thing in `sub` under the
       count ("Wells completed / 284 / in ANDREWS, BORDEN, ..."), and the
       `completions` panel has a third tile whose `value` IS the bare list.
       So all three text fields go through, and `tone` is carried across
       untouched by the spread. */
    ...(d.stats
      ? { stats: d.stats.map((st) => ({
        ...st,
        label: one(st.label),
        value: one(st.value),
        ...(st.sub === undefined ? {} : { sub: one(st.sub) }),
      })) }
      : {}),
  };
  return touched ? next : d;
}

export const FUNNEL = [
  { key: 'unclaimed', label: 'Not claimed',
    note: 'Nothing is claimed yet, so every figure is a sample.' },
  { key: 'claimed', label: 'Claimed · free',
    note: 'Claimed, on the free tier — the value estimate is the paid feature.' },
  { key: 'trial', label: 'On trial',
    note: 'Everything unlocked for seven days.' },
  { key: 'lapsed', label: 'Lapsed',
    note: 'Subscription ended — portfolio totals are held back.' },
  { key: 'paid', label: 'Paid',
    note: 'The full product.' },
] as const;
export type FunnelKey = typeof FUNNEL[number]['key'];

export const PERSONAS: { key: Tier; label: string; note: string }[] = [
  { key: 'ultra', label: 'Ultra', note: 'One headline, one status, one action.' },
  { key: 'simple', label: 'Essentials', note: 'Plain language, the three things that matter.' },
  { key: 'detailed', label: 'Detailed', note: 'The numbers, plus the context behind them.' },
  { key: 'pro', label: 'Pro', note: 'Full tables and maximum density.' },
];

/* ADAPTED 1 · the two routes this work owns, at this app's own paths, plus the
   two it hands to the pages that already exist. */
export const ROUTE_PATH: Record<Route, string> = {
  dashboard: '/mineralownersite',
  weekly: '/mineralownersite/briefing',
  production: '/mineralownersite/production',
  alerts: '/mineralownersite/alerts',
  activities: '/mineralownersite/activities',
  leases: '/mineralownersite/leases',
  map: '/mineralownersite/map',
};
/**
 * WHICH ROUTES THIS SHELL RENDERS ITSELF — the reference's five, all of them.
 *
 * They switch without a request, which is the reference's own arrangement and
 * its own reason: a route change must not discard a snapshot that took seconds
 * to build, and the five surfaces read ONE payload, so the bell badge, the
 * alert list, the activity feed, Production & Forecast and the dashboard's
 * rollup cannot disagree. Each still has a real server page, which is what
 * makes a cold entry or a shared link work.
 *
 * The Map is absent deliberately: it is 51 files and an ArcGIS runtime, and it
 * borrows this shell through `children` instead — see adaptation 3. My Leases
 * is absent too: that page is this app's own, outside this work, so
 * `go('leases')` navigates to it rather than rendering it here.
 */
const OWNED: Route[] = ['dashboard', 'weekly', 'alerts', 'activities', 'production'];

export const ROUTE_TITLE: Record<Route, string> = {
  dashboard: 'Dashboard', alerts: 'Alerts', activities: 'Activities',
  leases: 'My Leases', production: 'Production & Forecast',
  weekly: 'Weekly Report', map: 'Map',
};

export interface OwnerRef {
  ownername: string; ownernumber: string | number | null;
  districtcode: string | null; year: number | null;
}

/** where the reader's own read-state lives — see `markRead` in `Portal` */
const READ_KEY = 'mv.alertsRead';

function persistRead(ids: Set<string>): void {
  try { localStorage.setItem(READ_KEY, JSON.stringify([...ids])); } catch { /* private mode */ }
}

/* the loader names its step, because the first read of a new owner is seconds
   long and a bare spinner for four seconds reads as a hang */
const STEPS: Step[] = [
  { at: 0, text: 'Finding the appraisal-roll rows for this name' },
  { at: 1200, text: 'Reading production, value and reserves for each lease' },
  { at: 3200, text: 'Matching permits and completions around the acreage' },
  { at: 5200, text: 'Building the alerts and the activity feed' },
  { at: 8000, text: 'Still working — a first read scans the whole roll year' },
];

export default function Portal({ route: initialRoute, initial, children, shellClass }:
{
  /**
   * WHICH SIDEBAR ROW IS THE CURRENT ONE — or `null` for a page that is not one
   * of them.
   *
   * ADAPTED 5 · `null` EXISTS FOR THE COMING-SOON PAGES. `/soon/[slug]` is a
   * real page behind five sidebar rows, and none of those five IS a `Route`:
   * `Route` is the set of places `go` can navigate to, and adding a member for
   * a page nothing navigates to would hand every `go(r)` call site a
   * destination with no path. So the page passes `null`, which says exactly
   * what is true — the shell is here, and nothing in it is current. Every
   * `route ===` test in this file and in `Chrome` then simply misses, which is
   * the behaviour those tests already have for any row that is not the one
   * being rendered: no `.on` class in the sidebar, no `aria-current`, no lit
   * tab in the phone bottom bar. The top bar prints no page name at all (see
   * `Chrome`), so there is nothing there to be wrong either.
   */
  route: Route | null;
  initial: Payload | null;
  /**
   * ADAPTED 3 · A PAGE'S OWN VIEW, rendered inside this shell instead of one of
   * the two this file holds. The Map passes it — the map is 51 files and an
   * ArcGIS runtime, so it stays a route of its own that renders itself and
   * borrows the chrome, rather than becoming a third branch of `view` that the
   * Dashboard and the Weekly Report would drag around with them. The
   * coming-soon pages pass it too, with `route={null}`: a card is not worth a
   * branch here either, and a page reached from the sidebar should keep the
   * sidebar.
   *
   * The owner payload is still loaded and still handed to `Chrome`, which is
   * the whole point: the sidebar, the top bar, the owner picker and the pinned
   * value line are the same ones `/mineralownersite` renders, from the same
   * snapshot. Nothing about them is re-implemented for the map.
   */
  children?: React.ReactNode;
  /**
   * Extra class for the root element, for a page whose body fills the viewport
   * rather than scrolling in the 1180px column. The Map passes
   * `mv-ref-mapshell` and owns the three rules that name it — see
   * `(reference)/map/map-shell.css`. It goes here because the element it has to
   * reach, `.app-shell`, is an ANCESTOR of `children`, so the page cannot put
   * the class on anything of its own.
   */
  shellClass?: string;
}) {
  const [route, setRoute] = useState<Route | null>(initialRoute);
  const [live, setLive] = useState<Payload | null>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /* THE ERROR'S CODE, KEPT BESIDE ITS SENTENCE. `/api/portfolio` already
     returns one per §4; without it every failure had to be rendered the same
     way, and `DASHBOARD_NO_CLAIM` — a signed-in member who has simply not
     claimed a record yet — read as "That did not load" and was offered a
     reload that answers the same way every time. */
  const [errorCode, setErrorCode] = useState<string | null>(null);
  /* THE REQUEST'S OWN ANSWER FIRST — see `prefs-context.tsx`. `pref.tier` is
     the density cookie, which the server read and rendered with, so opening on
     it is what makes the server's tree and this one agree. `null` means the
     request carried nothing, and then `'detailed'` is the same default the
     server used. */
  const pref = usePortalPrefs();
  const [tier, setTier] = useState<Tier>(pref.tier ?? 'detailed');
  /* ADAPTED 5 · THE FUNNEL STATE OPENS ON WHAT THE RECORD SAYS, not on a
     constant. It used to start at `'paid'` for everybody, so a visitor with
     nothing claimed was shown a paid dashboard, and the one thing this state
     is supposed to change — whether the figures are real or a sample — was
     decided by a literal.

     `owner.claimed_owners` is the only claim signal any of these sources
     carries: `/api/v1/dashboard` returns the member's claimed roll owners, and
     an empty list means nothing is claimed. That much is real, so that much is
     read.

     THE OTHER FOUR STATES STILL COME FROM THE MENU, and that is not an
     omission. Nothing in the login response or in `/dashboard` distinguishes
     paid from trial from lapsed — there is no subscription, entitlement or
     plan field in either — so seeding those from anything here would be
     inventing an entitlement. The demo menu and its `localStorage` memory are
     left exactly as they were, and they still override this. */
  const [funnel, setFunnel] = useState<FunnelKey>(
    /* THE COOKIE OUTRANKS THE RECORD HERE, because the menu always did. This
       state is the demo switch, `pickFunnel` persists it, and a reader who
       chose "Lapsed" last visit must not be put back on `paid` by a claim
       signal they have already overridden. With no cookie the record decides,
       exactly as before.

       `?.length === 0` and not `!length`: the capture has no such field, and
       "this source does not say" must keep the old default rather than
       declaring the record unclaimed. Only an explicitly EMPTY list flips it. */
    pref.funnel
      ?? (initial?.owner.claimed_owners?.length === 0 ? 'unclaimed' : 'paid'),
  );
  /* a string is a key into `data.drawers`; an object is a panel built by a
     view from one specific record — the Activities timeline builds one per
     event so the detail matches the card that was clicked (defects #12-#14,
     #17) */
  const [drawer, setDrawer] = useState<string | DrawerCopy | null>(null);
  const [loadingName, setLoadingName] = useState<string | null>(null);
  const [trialStarted, setTrialStarted] = useState<string | null>(null);
  /* WHICH ALERTS THIS READER HAS OPENED — see `markRead` below for why it
     lives up here rather than inside `AlertsView`. */
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  /**
   * HAS `mv.alertsRead` BEEN READ YET? — the flash this closes.
   *
   * The set lives in `localStorage`, so the server renders every unread FIGURE
   * — the header's "Mark all 6 read", the Unread pill, the sidebar rail badge
   * and the bell — from `alerts.items[].unread` alone, which is the server's
   * opinion and knows nothing about what this browser has already opened. A
   * reader who marked everything read, reloaded, and watched "6" sit there for
   * the length of a hydration before correcting itself to "4" was not seeing a
   * stale cache: they were seeing the only answer the server has, held on
   * screen until the browser's answer arrived.
   *
   * `false` on the server AND on the first client render, so there is no
   * hydration mismatch; flipped in a LAYOUT effect, so the true count paints in
   * the same frame hydration commits rather than one frame later. Every
   * consumer renders the count only once it is true — a figure briefly absent
   * is honest, a figure briefly wrong is not.
   */
  const [readReady, setReadReady] = useState(false);
  /**
   * HAS THE READER'S OWN DENSITY AND STATE BEEN READ YET? — the flash this
   * closes, and it is the same argument as `readReady` one field up.
   *
   * `tier` opens at `'detailed'` and `funnel` at whatever the claim signal
   * says, because the server has to render SOMETHING and it cannot see
   * `localStorage`. The reader's actual choice arrives a moment later, in the
   * layout effect below. Between those two moments the browser paints a whole
   * page at the wrong density: the reported shape was "after refresh the page
   * shows pro mode for some time and then shows ultra or essentials".
   *
   * That is not a slow render, it is the server's guess held on screen for the
   * length of a hydration — and unlike a wrong FIGURE, a wrong DENSITY moves
   * every heading on the page when it corrects, so the reader loses their
   * place. QA asked for a loader or a skeleton, which is the honest answer:
   * the shell says it is still deciding rather than deciding wrongly.
   *
   * `false` on the server AND on the first client render, so hydration matches
   * exactly; flipped in the same LAYOUT effect that reads the preference, so
   * the real page paints in the frame hydration commits rather than one frame
   * later. See `SHELL_SKELETON` at the foot of this file for what shows
   * meanwhile.
   */
  const [prefsReady, setPrefsReady] = useState(
    /* THE SKELETON IS FOR READERS THE REQUEST COULD NOT DESCRIBE. A cookie
       means the server has already rendered this reader's own density, so
       there is nothing to wait for and nothing that can flash — showing them
       blocks would be a regression dressed as a fix. Only a reader with no
       cookie, whose `localStorage` may still hold a choice from before the
       cookie existed, has a wrong density on screen worth covering. */
    pref.tier != null,
  );
  const seq = useRef(0);
  const router = useRouter();

  /* ---------------------------------------------------- the derived flags */
  const sample = funnel === 'unclaimed';
  /* ONE UI FOR EVERY ACCOUNT STATE (defect #6). Unclaimed used to override
     the density to `pro` as a shop window, so the sample page carried card
     paragraphs and tables that vanished the moment the record was claimed —
     QA read that as two different UIs for the same page. The density now
     follows the reader's own choice in every state; what marks the sample is
     the labeling (claim rail, sample badges, amber borders), not a different
     layout. Declared here rather than beside the render because the class
     effect below reads it. */
  const effTier: Tier = tier;

  /* ------------------------------------------------------ persisted choice */
  /* Density and funnel state are the reader's own preference, not data, so they
     live in the browser. Read in an effect rather than in the initial state so
     the server and the first client render agree. */
  /* A LAYOUT EFFECT, not a passive one, and only for this reason: it runs
     before the browser paints the hydrated tree, so the alert counts go
     straight from absent to correct instead of painting the server's number
     for a frame first. See `readReady`. The work is four synchronous
     `localStorage` reads, which is not enough to be worth a frame of jank. */
  useLayoutEffect(() => {
    try {
      /* AND THE MIGRATION, which is the only reason this still reads `tier`
         and `funnel` at all. A reader who chose a density before the cookie
         existed has it in `localStorage` and nowhere the server can see, so
         their first visit renders the default, corrects here, and WRITES THE
         COOKIE — after which every later request is served at the right
         density with no skeleton and no correction. A reader who already had
         the cookie takes the same path and changes nothing: the value read is
         the value already on screen, and `setTier` with an equal value is a
         no-op. */
      const t = localStorage.getItem('mv.tier') as Tier | null;
      if (t && PERSONAS.some((p) => p.key === t)) {
        setTier(t);
        writePortalPref(PORTAL_TIER_COOKIE, t);
      }
      const f = localStorage.getItem('mv.funnel') as FunnelKey | null;
      if (f && FUNNEL.some((s) => s.key === f)) {
        setFunnel(f);
        writePortalPref(PORTAL_FUNNEL_COOKIE, f);
      }
      setTrialStarted(localStorage.getItem('mv.trialStart'));
      const r = JSON.parse(localStorage.getItem(READ_KEY) ?? '[]') as unknown;
      if (Array.isArray(r)) setReadIds(new Set(r.filter((x): x is string => typeof x === 'string')));
    } catch { /* private mode — nothing read yet is the correct default */ }
    /* OUTSIDE THE `try`. A browser that throws on `localStorage` still has a
       read-state — the empty one — and holding `readReady` at false there would
       hide the count for the whole visit rather than for a frame. And a browser
       that throws still has a DENSITY — the default one — so `prefsReady` has
       to flip for the same reason: a private window must get the page, not the
       skeleton, for the rest of the visit. */
    setReadReady(true);
    setPrefsReady(true);
  }, []);

  /**
   * MARKING AN ALERT READ, IN ONE PLACE.
   *
   * This used to live inside `AlertsView` as its own `useState`, which is where
   * the reference put it — and there it was invisible to the sidebar. Pressing
   * "Mark all 6 read" emptied the page's own Unread chip while the rail and the
   * bell went on saying 6, because `Chrome` counts `alerts.items[].unread`
   * straight off the payload. Two counts of the same thing, disagreeing on
   * screen, which is the exact defect the payload's own comment says the single
   * snapshot exists to prevent.
   *
   * So the set is owned by the shell, which already owns everything the page
   * and the chrome share, and both now read one value.
   *
   * IT PERSISTS, because a read state that forgets on reload is not a read
   * state. `unread` is the SERVER'S opinion and the contract is explicit that
   * "read state is client-side", so the browser is the right home for it —
   * alongside `mv.tier` and `mv.funnel`, which are stored the same way and for
   * the same reason. When the API grows somewhere to record this, this function
   * is the one place that changes.
   *
   * PRUNED WHENEVER THE ALERTS CHANGE, by the effect below rather than here:
   * two of the contract's ten ids carry a period or a lease
   * (`filed-<YYYYMM>`, `handover-<lease_id>`), so an id stops existing when the
   * month rolls. Unpruned, the key would grow for ever and could resurrect a
   * stale id if the server ever reused one.
   */
  const markRead = useCallback((ids: string[]) => {
    if (!ids.length) return;
    setReadIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.add(id);
      if (next.size === prev.size) return prev;
      persistRead(next);
      return next;
    });
  }, []);
  /* BOTH STORES, ALWAYS TOGETHER — see `prefs-context.tsx`. `localStorage`
     stays the reader's record of the choice; the cookie is the copy the SERVER
     can read, and it is what lets the next request render this density
     directly instead of guessing and correcting. Writing one without the other
     is what would put the flash back. */
  const pickTier = useCallback((t: Tier) => {
    setTier(t);
    try { localStorage.setItem('mv.tier', t); } catch { /* ignore */ }
    writePortalPref(PORTAL_TIER_COOKIE, t);
  }, []);
  const pickFunnel = useCallback((f: FunnelKey) => {
    setFunnel(f);
    writePortalPref(PORTAL_FUNNEL_COOKIE, f);
    try {
      localStorage.setItem('mv.funnel', f);
      /* Stamp the trial the first time it starts, so "4 days left" counts down
         instead of being frozen. The redesign hardcoded day 3 to keep the
         mockup on the moment the ask lands best; a shipped build that always
         says the same day is the hardcoded-date problem in another costume. */
      if (f === 'trial' && !localStorage.getItem('mv.trialStart')) {
        const now = new Date().toISOString();
        localStorage.setItem('mv.trialStart', now);
        setTrialStarted(now);
      }
      if (f === 'claimed' || f === 'unclaimed') {
        localStorage.removeItem('mv.trialStart');
        setTrialStarted(null);
      }
    } catch { /* private mode - the defaults are correct */ }
  }, []);

  /* ------------------------------------------------------- the root classes */
  /* ADAPTED 4 · the reference writes these to <body>; they go on this
     component's wrapper instead, and `dashboard-reference.css` is scoped to it.
     The class NAMES are the reference's, so every gate it ships still fires:
     `.hide-u`, `.hide-s`, `.tier-u`, `.nc-keep`, `.cl-lock`. */
  const rootClass = useMemo(() => {
    const want = ['mv-ref-app', 'in-app'];
    /* the class follows the EFFECTIVE tier, or the prototype's own density
       gates would still be running at Essentials width while React rendered
       the Pro tree */
    if (effTier !== 'detailed') want.push('view-' + effTier);
    /* ULTRA DOES NOT ALSO CARRY `view-simple`, and that is the reference's
       rule, not an omission. This app's older `_lib/portal-state.ts` documents
       a v1 clause where "'ultra' ALSO carries `view-simple`, so Ultra can only
       ever go further than Essentials"; the v2.0 reference dropped it and
       writes one density class. Adding it back fires every `.hide-s` rule at
       Ultra, and the visible cost was the pinned bar losing its value range —
       the reference shows "$3.71M-$5.29M" there at Ultra and this build hid
       it. Caught by the whole-shell text diff, in 4 of 40 combinations. */
    if (funnel === 'unclaimed') want.push('no-claim', 'mv-sample');
    else want.push('state-' + funnel);
    /* A page that needs the shell laid out differently, appended last so it can
       win on specificity without any `!important`. See the prop's own note. */
    if (shellClass) want.push(shellClass);
    return want.join(' ');
  }, [effTier, funnel, shellClass]);

  /* --------------------------------------------------------------- the URL */
  useEffect(() => {
    const onPop = () => {
      const p = window.location.pathname.replace(/\/+$/, '') || '/';
      /* Resolved through the table rather than a weekly/dashboard ternary: with
         the ternary, going Back from the Weekly Report onto the Map set the
         route to `dashboard`, so the sidebar lit the wrong row and the top bar
         read "Dashboard" over the map. */
      /* AND AN UNKNOWN PATH FALLS BACK TO THE ROUTE THIS PAGE DECLARED, not to
         `dashboard`. `/soon/[slug]` is not in the table — it is not a `Route`
         — so the old fallback lit the Dashboard row on a coming-soon page the
         moment anything popped the history. Restoring `initialRoute` is right
         for every entry point: it is `dashboard` for the page that fell back
         to `dashboard` before, and `null` here. */
      const hit = (Object.keys(ROUTE_PATH) as Route[]).find((r) => ROUTE_PATH[r] === p);
      setRoute(hit ?? initialRoute);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [initialRoute]);

  /**
   * `params` CARRIES A DESTINATION'S OWN STATE IN THE QUERY STRING.
   *
   * Added for the Dashboard's alert category chips: "2 Money" used to call a
   * bare `go('alerts')` and land on the unfiltered list with "All" active, so
   * the count the reader clicked and the count they arrived at disagreed. A
   * chip now passes `{ cat: 'money' }` and `AlertsView` reads it on mount.
   *
   * IT MERGES RATHER THAN REPLACES. The owner is in the query string too, and
   * the note below is explicit that every route change has to keep it — so the
   * extra keys are written on top of `window.location.search` instead of
   * standing in for it. A key whose value is null is DELETED, which is what
   * lets a later navigation clear a filter it does not want.
   */
  const go = useCallback((r: Route, params?: Record<string, string | null>) => {
    const query = (() => {
      const q = new URLSearchParams(window.location.search);
      for (const [k, v] of Object.entries(params ?? {})) {
        if (v == null) q.delete(k);
        else q.set(k, v);
      }
      const str = q.toString();
      return str ? '?' + str : '';
    })();
    /* THE FOUR ROUTES THIS SHELL OWNS SWITCH WITHOUT A REQUEST — the
       reference's own arrangement, for the reference's own reason: "a route
       change must not discard a snapshot that took seconds to build". The Map
       is not one of them and is a real navigation. */
    /* AND A PAGE THAT BROUGHT ITS OWN VIEW OWNS NONE OF THEM. `children` wins
       over `view` for as long as this shell is mounted, so switching `route` on
       the Map would have pushed `/mineralownersite` into the address bar and
       left the map on screen under a sidebar row saying Dashboard. From here
       every row is a real navigation. */
    /* AND IT CARRIES THE QUERY STRING, which the branch below has always done
       and this one did not: the owner is in the query, so leaving the Map or a
       coming-soon page by any sidebar row silently reset the shell to the
       default owner. One `go`, one rule — the destination keeps whoever you
       were looking at. */
    if (children || !OWNED.includes(r)) {
      setDrawer(null);
      router.push(ROUTE_PATH[r] + query);
      return;
    }
    setRoute(r);
    setDrawer(null);
    window.history.pushState({ r }, '', ROUTE_PATH[r] + query);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [router, children]);

  /* ----------------------------------------------------------- owner loads */
  const load = useCallback(async (o: OwnerRef) => {
    const my = ++seq.current;
    setBusy(true);
    setError(null);
    setErrorCode(null);
    setLoadingName(o.ownername);
    try {
      const q = new URLSearchParams({ owner: o.ownername });
      if (o.ownernumber != null) q.set('num', String(o.ownernumber));
      if (o.districtcode) q.set('dist', o.districtcode);
      if (o.year) q.set('year', String(o.year));
      const res = await fetch('/api/portfolio?' + q.toString(), { cache: 'no-store' });
      const data = await res.json();
      if (my !== seq.current) return;          // a later pick already won
      if (!res.ok) {
        setErrorCode(typeof data?.code === 'string' ? data.code : null);
        setError(data?.detail ? `${data.error ?? 'Could not load'} — ${data.detail}`
          : (data?.error ?? `Request failed (${res.status})`));
        return;
      }
      setLive(data as Payload);
      setDrawer(null);
      const url = new URL(window.location.href);
      url.searchParams.set('owner', o.ownername);
      if (o.ownernumber != null) url.searchParams.set('num', String(o.ownernumber));
      else url.searchParams.delete('num');
      if (o.districtcode) url.searchParams.set('dist', o.districtcode);
      else url.searchParams.delete('dist');
      window.history.replaceState(null, '', url.pathname + url.search);
    } catch (e) {
      if (my === seq.current) {
        setErrorCode(null);
        setError(e instanceof Error ? e.message : String(e));
      }
    } finally {
      if (my === seq.current) { setBusy(false); setLoadingName(null); }
    }
  }, []);

  /**
   * RE-READ THIS MEMBER'S PAYLOAD, AND RESOLVE WHEN IT IS IN STATE.
   *
   * WHY NOT `router.refresh()`. That was the first answer here and it is the
   * wrong tool for a caller that has to KNOW when the data landed. `refresh()`
   * returns void: wrapped in `startTransition`, `isPending` tracks React's own
   * render, not the round trip behind it, so on a large record it settled
   * seconds before the new payload arrived. Anything keyed on it — a loader,
   * a disabled control — came down over the PREVIOUS owner's figures and sat
   * there until the refresh finally delivered. Measured on a 100+ lease
   * record: ten to eleven seconds of the old owner's dashboard after the
   * loading state had already ended.
   *
   * An awaited fetch has no such gap. It resolves exactly once `setLive` has
   * been called, so a caller can hold its loading state across the whole wait
   * and drop it in the same tick the data becomes renderable — React batches
   * that `setLive` with whatever the caller sets next, so the new payload and
   * the end of the wait reach the screen in ONE render rather than two.
   *
   * NO PARAMETERS, DELIBERATELY. `/api/portfolio` resolves a signed-in member
   * through `currentMemberTarget()` and answers with whichever record is
   * ACTIVE, so after the active record has been changed this reads the new one
   * by asking for nothing. `load()` beside it is the owner-PICKER's path and
   * writes `?owner=` into the address bar; this must not, because the member's
   * active record is not a URL-selected owner.
   */
  const reloadActiveOwner = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/portfolio', { cache: 'no-store' });
      if (!res.ok) return false;
      const data = (await res.json()) as Payload;
      setLive(data);
      /* the open drawer belongs to the record that is going away */
      setDrawer(null);
      return true;
    } catch {
      return false;
    }
  }, []);

  /* If the server could not build the first payload, retry from the client
     instead of showing a dead page. */
  useEffect(() => {
    if (initial || busy || error) return;
    const p = new URLSearchParams(window.location.search);
    load({
      ownername: p.get('owner') ?? '',
      ownernumber: p.get('num'),
      districtcode: p.get('dist'),
      year: p.get('year') ? Number(p.get('year')) : null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------------------------------------------------------- the sample view */
  /**
  /**
   * ONE SAMPLE RECORD, THE SAME ONE FOR EVERY READER.
   *
   * Not claimed means the reader has not proved these interests are theirs, so
   * the payload is rewritten as a sample of itself — same shape, same code
   * path, real dates, illustrative figures.
   *
   * WHAT CHANGED: WHICH PAYLOAD IS REWRITTEN. `sampleize` renames and scales,
   * but it MAPS OVER the payload it is given — and it was given `live`, the
   * READER'S OWN snapshot. Nothing of theirs was published, since the transform
   * substitutes every name and number, but the preview was then a different
   * record for every visitor: ten leases for one reader, 1,555 for another,
   * every figure their own multiplied by a thousand. The page says "this is
   * what your record looks like once you claim it", which is a promise about
   * the PRODUCT; it cannot be made out of the record of somebody who has not
   * claimed one. Defect sheet rows 51 and 54.
   *
   * So the preview is drawn from the committed capture — ten leases, one
   * county, a full timeline, every drawer key — served by
   * `/api/portfolio/sample`. See that route for why it is a fetch and not an
   * import: the capture is 2 MB and this is a client component, so importing it
   * would put all of it in the bundle every reader downloads, claimed or not.
   *
   * IT DOES NOT FALL BACK TO `live`, AND THAT IS THE POINT OF THE FIX. A failed
   * read leaves the preview empty rather than quietly serving the per-reader
   * version again — "the same record for every user, independent of member_id,
   * user, session or API data" is the requirement, and a fallback that is
   * per-reader on the unhappy path does not meet it. The shell already has an
   * honest place to say nothing loaded.
   *
   * ASKED ONCE, IN A REF, AND THE DEPENDENCY LIST IS JUST `sample`. Guarding on
   * the busy flag and listing it as a dependency deadlocked: setting it re-ran
   * the effect, the re-run's cleanup invalidated the request still in flight,
   * and the `finally` that clears the flag was inside that invalidated closure —
   * so the flag stayed true and the loader never came down. A ref is the right
   * shape for "has this been asked for yet": it is not render state, and it
   * cannot make the effect re-enter itself.
   *
   * MEMOISED ON THE SOURCE: the transform walks every lease and month, and
   * re-running it on each keystroke in the search box was measurable.
   */
  const [fixture, setFixture] = useState<Payload | null>(null);
  const [sampleBusy, setSampleBusy] = useState(false);
  const sampleAsked = useRef(false);

  useEffect(() => {
    if (!sample || sampleAsked.current) return;
    sampleAsked.current = true;
    setSampleBusy(true);
    fetch('/api/portfolio/sample')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (j) setFixture(j as Payload); })
      .catch(() => { /* reported by the empty state below */ })
      .finally(() => setSampleBusy(false));
  }, [sample]);

  const sampleSource = sample ? fixture : null;
  const shown = useMemo(
    () => (sampleSource ? sampleize(sampleSource) : null), [sampleSource]);
  const data: Payload | null = sample ? (shown?.payload ?? null) : live;

  /* Drop ids the payload no longer carries — see `markRead`. Runs on every
     new snapshot, which is also every owner change. */
  useEffect(() => {
    const items = data?.alerts.items;
    if (!items) return;
    const live = new Set(items.map((a) => a.id));
    setReadIds((prev) => {
      const kept = [...prev].filter((id) => live.has(id));
      if (kept.length === prev.size) return prev;
      const next = new Set(kept);
      persistRead(next);
      return next;
    });
  }, [data?.alerts.items]);

  const openDrawer = useCallback((key: string) => setDrawer(key), []);

  /* ----------------------------------- the settlements, and their explainer */
  /**
   * ONE TIMER READS BOTH, AND THAT IS THE WHOLE POINT OF THIS BLOCK.
   *
   * WHAT WENT WRONG. The strip polled `/api/prices` from its own interval
   * inside `Chrome`, and the panel read `/api/drawers/prices` once, when it
   * opened. Two timers, two moments. The service advances its price snapshot
   * about every ten seconds (measured: `fetched_iso` moved 05:38:21 ->
   * 05:38:31 -> 05:38:41 -> 05:38:57), so within one tick of opening the panel
   * the bar had moved on and the panel had not — `WTI $102.23` over the strip
   * and `WTI $102.16` in the explainer it had just been opened from, and it
   * stayed wrong for as long as the panel was up, because nothing re-read it.
   *
   * THE TWO ENDPOINTS WERE NEVER THE PROBLEM. Fetched at the same instant they
   * agree exactly — three simultaneous pairs, all three identical on all three
   * settlements — because both are served from the same cached snapshot
   * upstream. So the fix is not to reconcile two answers, it is to stop asking
   * at two different times.
   *
   * HENCE ONE `read()`, ISSUING BOTH REQUESTS IN THE SAME `Promise.all`, and it
   * lives here rather than in `Chrome` because this is where `drawer` is: the
   * poller has to know whether the panel is open to know whether the second
   * request is worth making. The strip gets its values from here as a prop.
   *
   * THE EXPLAINER IS ONLY READ WHILE IT IS ON SCREEN. `pricesOpen` is in the
   * dependency list, so opening the panel rebuilds the timer and fires an
   * immediate paired read — the panel does not sit on stale copy waiting up to
   * ten seconds for the next tick, and the bar re-syncs in the same breath.
   * Closing it drops the second request again. No other Dashboard read is
   * repeated at any point.
   *
   * THE PAYLOAD'S OWN COPY STAYS ON SCREEN UNTIL THE FRESH ONE ARRIVES, and on
   * a failure too. `owner-data.ts` already fetched all eleven flat explainers
   * from this same endpoint during the payload build, so the fallback is not a
   * different kind of answer, only an older one — and a panel that opens with
   * its content already in it is the behaviour every other panel has. A spinner
   * here, or an error card over a readable explainer, would be the worse page.
   *
   * KEYED ON THE OWNER IT WAS READ FOR. The explainer endpoint takes
   * `member_id`, so a cached copy belongs to whoever was active when it
   * answered; switching owner makes it somebody else's. Comparing the name is
   * self-contained here — clearing it from the owner-switch path instead would
   * put a second place in this file that has to remember this cache exists.
   *
   * A FAILED POLL KEEPS THE LAST GOOD SETTLEMENTS AND SAYS NOTHING. Every value
   * ever shown is one the service really returned, carrying its own `as_of` in
   * the tooltip, so nothing is invented and nothing is extrapolated — which is
   * the line `spot-prices.ts` draws, and draws for good reason: what it
   * replaced was a hardcoded seed pushed through a random walk. Not updating
   * for a tick is not the same act as manufacturing a number, and blanking the
   * bar on a transient 502 would take a true settlement off the screen and put
   * nothing in its place.
   *
   * NO OVERLAPPING REQUESTS, and the guard is a LOCAL rather than a ref. A ref
   * outlives the effect while the timer it guards does not, which breaks on the
   * first render under React's development double-invoke: the first effect
   * starts a request, its cleanup aborts it, the second effect runs before that
   * abort has rejected and finds the flag still raised, so it returns WITHOUT
   * ASKING — and the strip then has no live settlements until the 10s tick,
   * which is precisely the delay in front of the first call that must not be
   * there. A local is scoped to exactly the run that owns the timer.
   *
   * TORN DOWN WITH THE COMPONENT, and the open requests with it: `clearInterval`
   * stops the timer, `abort()` drops whatever is in flight, and `mounted` stops
   * a reply that was already decoding from setting state on a dead tree. All
   * three, because each covers a moment the other two do not.
   */
  const [spot, setSpot] = useState<SpotQuote[] | null>(null);
  const [priceCopy, setPriceCopy] =
    useState<{ owner: string; drawer: DrawerCopy } | null>(null);
  const ownerName = data?.owner.ownername ?? '';
  const pricesOpen = drawer === 'prices';

  useEffect(() => {
    let mounted = true;
    let busy = false;
    const ac = new AbortController();

    const read = async () => {
      if (busy) return;
      busy = true;
      try {
        /* TOGETHER, NOT ONE AFTER THE OTHER. Both are served from the same
           upstream snapshot, so issuing them in parallel is what makes the bar
           and the panel quote the same three numbers. */
        const [stripRes, panelRes] = await Promise.all([
          fetch('/api/prices', { cache: 'no-store', signal: ac.signal }),
          pricesOpen
            ? fetch('/api/drawers/prices', { cache: 'no-store', signal: ac.signal })
            : null,
        ]);
        const strip = stripRes.ok
          ? ((await stripRes.json()) as { items?: SpotQuote[] })
          : null;
        const panel = panelRes?.ok
          ? ((await panelRes.json()) as { drawer?: DrawerCopy | null })
          : null;
        if (!mounted) return;
        /* AN EMPTY LIST IS NOT AN ANSWER TO BIND. `ok_count` can be zero
           upstream, and replacing three real settlements with nothing would
           empty the bar on a bad read — the same argument as the catch. */
        if (strip?.items?.length) setSpot(strip.items);
        /* `drawer: null` is what the route answers for a signed-out reader —
           it has nothing newer, so the payload's copy goes on rendering. */
        if (panel?.drawer) setPriceCopy({ owner: ownerName, drawer: panel.drawer });
      } catch {
        /* aborted, offline, or unparseable — the last good values stand */
      } finally {
        busy = false;
      }
    };

    void read();
    const timer = setInterval(() => { void read(); }, SPOT_POLL_MS);
    return () => {
      mounted = false;
      clearInterval(timer);
      ac.abort();
    };
  }, [pricesOpen, ownerName]);

  /* A PANEL A VIEW BUILT ITSELF, rather than a key into `data.drawers`. The
     Activities timeline composes one per event so the detail matches the card
     that was clicked (defects #12-#14, #17); it arrives already complete, so
     there is nothing to look up and the string branches below do not apply. */
  const openEventDrawer = useCallback((d: DrawerCopy) => setDrawer(d), []);

  const rawCopy: DrawerCopy | null = !drawer
    ? null
    : typeof drawer !== 'string'
      ? drawer
      : drawer === 'prices'
        ? ((priceCopy?.owner === ownerName ? priceCopy.drawer : null)
          ?? data?.drawers?.prices ?? null)
        : (data?.drawers?.[drawer] ?? null);

  /* every panel goes through the same reduction — see `collapseNames` */
  const counties = data?.totals.counties;
  const operatorNames = data?.totals.operator_names;
  const copy = useMemo(
    () => collapseNames(rawCopy, counties ?? [], operatorNames ?? []),
    [rawCopy, counties, operatorNames],
  );
  /* Esc closes the drawer wherever focus is — a panel that can only be closed
     by hitting its own button is a trap for a keyboard user. */
  const wrap = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawer(null); };
    document.addEventListener('keydown', onKey);
    /* `ctx-open` is what reveals the scrim and slides the drawer in
       (`body.ctx-open .ctx-drawer{transform:translateX(0);visibility:visible}`).
       It goes on the wrapper for the same reason the gate classes do, and on
       the body as well because the reference's print rule reads it there. */
    const el = wrap.current;
    document.body.classList.add('ctx-open');
    el?.classList.add('ctx-open');

    /* THE PAGE BEHIND THE PANEL IS HELD STILL WHILE IT IS OPEN.
     *
     * ONE LOCK FOR EVERY DRAWER, because there is only one drawer. Each of the
     * explainers — the eleven flat ones, the twelve `pf_*`, every `lease:*`,
     * `well:*` and `alert:*` panel — is the SAME `DrawerPanel` with different
     * copy in it, opened through this one piece of state. So locking here is
     * what makes the behaviour identical across all of them, and there is no
     * second panel anywhere in this shell to keep in step: `.ctx-drawer` and
     * `.ctx-scrim` are the only fixed right-side elements the reference sheet
     * declares.
     *
     * THE MEASUREMENT HAS TO HAPPEN BEFORE THE CLASS GOES ON, which is the
     * whole reason this is not two lines of CSS. Taking the page's overflow
     * away takes its scrollbar with it, and on a platform with a CLASSIC
     * scrollbar that hands 15px back to the layout: measured at 1440x900, the
     * content and the top row both jumped from x=1425 to x=1440 the instant
     * `overflow: hidden` applied. A modal that shoves the page sideways as it
     * opens is a worse defect than the one being fixed, and it is exactly why
     * the note in `onebar.css` declined this lock when row 55 was fixed.
     *
     * `scrollbar-gutter: stable` IS THE COMPENSATION, and it goes on the ROOT.
     * Measured all four ways: `overflow: hidden` on `html` or on `body` both
     * stop the page (`body` works because the root's overflow is `visible`, so
     * the viewport takes its overflow from the body) — but the gutter is only
     * honoured on `html`. On `body` it is ignored and the 15px jump stays. So
     * both declarations sit on the root element, and the shift measures zero.
     *
     * THE GUTTER IS CONDITIONAL, and that is what makes this right on a phone.
     * `scrollbar-gutter` reserves the track whenever the container is not
     * `overflow: visible` — including on a page that never had a scrollbar to
     * begin with, where reserving one would shift the layout the OTHER way. So
     * the class is added only when a classic scrollbar was actually measured.
     * Overlay scrollbars — every touch platform, and macOS unless a mouse is
     * attached — measure 0 and get the lock with no gutter, which is correct:
     * an overlay scrollbar takes no layout space, so there is nothing to
     * give back.
     */
    const root = document.documentElement;
    const gutter = window.innerWidth - root.clientWidth;
    root.classList.add('mv-ctx-lock');
    if (gutter > 0) root.classList.add('mv-ctx-gutter');

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('ctx-open');
      el?.classList.remove('ctx-open');
      /* THE PAGE SCROLLS AGAIN, AND FROM WHERE IT LEFT OFF. `overflow: hidden`
         on the root clips the page without unsetting `scrollTop`, so nothing
         has to be saved and restored here — the reader is returned to the same
         position they opened the panel from. */
      root.classList.remove('mv-ctx-lock', 'mv-ctx-gutter');
    };
  }, [drawer]);

  const view = (
    children ??
    /* THE DENSITY IS NOT KNOWN YET — see `prefsReady`. Every surface below
       branches on `effTier`, so rendering one before the reader's own choice
       has been read paints the server's guess and then re-lays the whole page
       out when it corrects. The skeleton holds the shape for that one frame.
       `children` is exempt: a page that brought its own view (the Map) does
       not read the density at all. */
    (!prefsReady ? <ShellSkeleton />
      : !data ? null
      : route === 'weekly'
        ? <WeeklyView p={data} tier={effTier} funnel={funnel} sample={sample} open={openDrawer} go={go} />
        : route === 'alerts'
          ? (
            <AlertsView
              p={data} tier={effTier} funnel={funnel} sample={sample} open={openDrawer} go={go}
              readIds={readIds} markRead={markRead} readReady={readReady}
            />
          )
          : route === 'activities'
            ? (
              <ActivitiesView
                p={data} tier={effTier} funnel={funnel} sample={sample} open={openDrawer} go={go}
                openEvent={openEventDrawer}
              />
            )
            : route === 'production'
              ? <ProductionView p={data} tier={effTier} funnel={funnel} sample={sample} open={openDrawer} go={go} />
              : (
                <Dashboard
                  p={data} tier={effTier} funnel={funnel} sample={sample} open={openDrawer} go={go}
                  trialStarted={trialStarted} setFunnel={pickFunnel}
                  reloadActiveOwner={reloadActiveOwner}
                />
              ))
  );

  return (
    <div className={rootClass} ref={wrap}>
      {/* The two axes, readable by anything under the chrome. `tier` and not
          `effTier`: the raw choice, so a surface with its own ceiling rule can
          apply it rather than inherit this one's. See `view-state.tsx`. */}
      <PortalViewStateProvider tier={tier} funnel={funnel} setTier={pickTier}>
      {/* `onOwner` AND `busy` NO LONGER GO TO THE CHROME. The owner-search band
          was their only consumer and it has been removed (see `Chrome`); `load`
          and `busy` are still owned here — `load` for the URL-driven read in the
          effect above, `busy` for the `Loader` below — so nothing about the
          owner read changed, only who is told about it. */}
      <Chrome
        p={data} route={route} go={go} tier={tier} setTier={pickTier} readIds={readIds}
        readReady={readReady}
        funnel={funnel} setFunnel={pickFunnel} sample={sample}
        open={openDrawer} spot={spot}
        sampleNote={shown?.note ?? null} trialStarted={trialStarted}
      >
        {error
          ? (errorCode === 'DASHBOARD_NO_CLAIM'
            ? <NoClaimCard detail={error} />
            : <ErrorCard detail={error} />)
          : null}
        {view}
        {/* NOT WHEN THE PAGE BROUGHT ITS OWN VIEW. This card stands in for the
            Dashboard and the Weekly Report, which are nothing without a
            snapshot. The Map is not: it reads the whole public record, not one
            owner, so it renders perfectly well before anybody is picked and the
            card would be an error message under a working page. */}
        {/* The copy no longer says "search for a name above" — there is no
            search box above it any more. The owner comes from the URL or from
            the default read, so a reload is the honest suggestion. */}
        {/* `prefsReady` too: until the density is known the skeleton is what is
            on screen, and "no owner is loaded" under it would be a second,
            contradictory answer to the same question. `sampleBusy` is the same
            argument for the not-claimed preview: entering that state fetches
            its fixed base record, and without the guard this card showed for
            the length of that request. */}
        {prefsReady && !children && !data && !error && !busy && !sampleBusy ? <ErrorCard detail="No owner is loaded yet. Reload the page, or open a link that names one." /> : null}
      </Chrome>
      </PortalViewStateProvider>

      {/* `sampleBusy` too: entering the not-claimed state fetches its fixed
          base record, and without this the page showed the "nothing loaded"
          card for the length of that request. */}
      <Loader on={busy || sampleBusy} name={loadingName} steps={STEPS} />

      <DrawerPanel
        copy={copy} onClose={() => setDrawer(null)}
        sample={sample} sourceNote={data?.owner.identity_note ?? null}
      />
    </div>
  );
}

/**
 * WHAT IS ON SCREEN WHILE THE DENSITY IS STILL UNKNOWN — see `prefsReady`.
 *
 * It is a SKELETON and not a spinner, and the difference matters here: the
 * thing being waited for is a layout, so the honest placeholder is the shape
 * of a layout. A spinner in the middle of an empty column would say "this page
 * is loading its data", which is a different and untrue claim — the payload is
 * already here, it is the reader's own choice of density that is not.
 *
 * It holds roughly the height the real page opens at, so the scroll position
 * does not jump when the tree lands. `aria-busy` and the visually-hidden line
 * say the same thing to a screen reader, which sees no skeleton at all.
 *
 * ONE FRAME, USUALLY. `prefsReady` flips in a layout effect, so this is
 * replaced before the browser paints the hydrated tree; what it actually
 * covers is the gap between the server's HTML arriving and hydration running,
 * which on a cold load is the only window the wrong density was ever visible
 * in.
 */
function ShellSkeleton() {
  return (
    <div className="mv-shellskel" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading your view</span>
      <div className="sk-line sk-head" />
      <div className="sk-line sk-sub" />
      <div className="sk-card" />
      <div className="sk-row">
        <div className="sk-card sk-sm" />
        <div className="sk-card sk-sm" />
        <div className="sk-card sk-sm" />
      </div>
      <div className="sk-card" />
    </div>
  );
}

function ErrorCard({ detail }: { detail: string }) {
  return (
    <div className="card card-pad" style={{ borderLeft: '4px solid #b8892f', margin: '16px 0' }}>
      <h3 style={{ margin: '0 0 6px' }}>That did not load</h3>
      <p className="small" style={{ margin: 0 }}>{detail}</p>
      <p className="tiny muted" style={{ margin: '8px 0 0' }}>
        {/* NOT "try the search box above" any more — that band was removed (see
            `Chrome`), so this was pointing at a control the reader cannot find.
            This card also serves the `detail` failures, which is why it says
            reload rather than naming any one cause. */}
        {/* NO <code>/api/health</code>. This app serves no such route — it 404s —
           so the one concrete thing the card told the reader to try was a dead
           end. What is true is left: nothing stale is on screen, and a reload
           is the honest suggestion for the failures this card does serve. */}
        Nothing is cached from a failed read, so nothing stale is being shown. Reload the page to
        try the read again.
      </p>
    </div>
  );
}

/**
 * NOT CLAIMED YET IS NOT A FAILURE — `DASHBOARD_NO_CLAIM`.
 *
 * The member-keyed `/dashboard` answers 404 with this code for a signed-in
 * member who has not claimed a roll owner, which is where every new account
 * starts. Rendered through `ErrorCard` it read "That did not load" over an
 * invitation to reload — a page that will answer the same way every time. The
 * state is ordinary, so it is given the ordinary next step instead: the claim
 * flow the sidebar already links to.
 */
function NoClaimCard({ detail }: { detail: string }) {
  return (
    <div className="card card-pad" style={{ borderLeft: '4px solid #54bf96', margin: '16px 0' }}>
      <h3 style={{ margin: '0 0 6px' }}>Nothing is claimed on this account yet</h3>
      <p className="small" style={{ margin: 0 }}>
        Your dashboard fills in the moment a record is claimed — your leases, what they
        produced, what they are worth and what changed since your last visit.
      </p>
      {/* The service's own sentence and its request id, minus the headline
          half this card has already said in its own words. */}
      <p className="tiny muted" style={{ margin: '8px 0 10px' }}>
        {detail.includes(' — ') ? detail.slice(detail.indexOf(' — ') + 3) : detail}
      </p>
      <Link className="btn btn-primary btn-sm" href="/mineralownersite/claim">
        Claim your record — free →
      </Link>
    </div>
  );
}

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
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

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
import Loader, { type Step } from './Loader';
import ProductionView from './ProductionView';
import { PortalViewStateProvider } from './view-state';

export type Route = 'dashboard' | 'alerts' | 'activities' | 'leases'
  | 'production' | 'weekly' | 'map';

/** the five funnel states, in funnel order — the prototype's own sequence */
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
  const [tier, setTier] = useState<Tier>('detailed');
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
    /* `?.length === 0` and not `!length`: the capture has no such field, and
       "this source does not say" must keep the old default rather than
       declaring the record unclaimed. Only an explicitly EMPTY list flips it. */
    initial?.owner.claimed_owners?.length === 0 ? 'unclaimed' : 'paid',
  );
  const [drawer, setDrawer] = useState<string | null>(null);
  const [loadingName, setLoadingName] = useState<string | null>(null);
  const [trialStarted, setTrialStarted] = useState<string | null>(null);
  /* WHICH ALERTS THIS READER HAS OPENED — see `markRead` below for why it
     lives up here rather than inside `AlertsView`. */
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const seq = useRef(0);
  const router = useRouter();

  /* ---------------------------------------------------- the derived flags */
  const sample = funnel === 'unclaimed';
  /* THE UNCLAIMED VIEW IS ALWAYS THE FULLEST ONE.
     Someone deciding whether to claim is looking at a shop window: the point is
     to show everything the record becomes, so the density preference is
     overridden to `pro` while nothing is claimed. The persona buttons keep
     their own state and take effect the moment the record is claimed.
     Declared here rather than beside the render because the class effect
     below reads it. */
  const effTier: Tier = funnel === 'unclaimed' ? 'pro' : tier;

  /* ------------------------------------------------------ persisted choice */
  /* Density and funnel state are the reader's own preference, not data, so they
     live in the browser. Read in an effect rather than in the initial state so
     the server and the first client render agree. */
  useEffect(() => {
    try {
      const t = localStorage.getItem('mv.tier') as Tier | null;
      if (t && PERSONAS.some((p) => p.key === t)) setTier(t);
      const f = localStorage.getItem('mv.funnel') as FunnelKey | null;
      if (f && FUNNEL.some((s) => s.key === f)) setFunnel(f);
      setTrialStarted(localStorage.getItem('mv.trialStart'));
      const r = JSON.parse(localStorage.getItem(READ_KEY) ?? '[]') as unknown;
      if (Array.isArray(r)) setReadIds(new Set(r.filter((x): x is string => typeof x === 'string')));
    } catch { /* private mode — nothing read yet is the correct default */ }
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
  const pickTier = useCallback((t: Tier) => {
    setTier(t);
    try { localStorage.setItem('mv.tier', t); } catch { /* ignore */ }
  }, []);
  const pickFunnel = useCallback((f: FunnelKey) => {
    setFunnel(f);
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

  const go = useCallback((r: Route) => {
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
      router.push(ROUTE_PATH[r] + window.location.search);
      return;
    }
    setRoute(r);
    setDrawer(null);
    const q = window.location.search;
    window.history.pushState({ r }, '', ROUTE_PATH[r] + q);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [router, children]);

  /* ----------------------------------------------------------- owner loads */
  const load = useCallback(async (o: OwnerRef) => {
    const my = ++seq.current;
    setBusy(true);
    setError(null);
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
      if (my === seq.current) setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (my === seq.current) { setBusy(false); setLoadingName(null); }
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
  /* Not claimed means the reader has not proved these interests are theirs, so
     the payload is rewritten as a sample of itself — same shape, same code path,
     real dates, illustrative figures. Memoised on the payload identity: the
     transform walks every lease and month, and re-running it on each keystroke
     in the search box was measurable. */
  const shown = useMemo(
    () => (live && sample ? sampleize(live) : null), [live, sample]);
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
  const copy: DrawerCopy | null = drawer ? (data?.drawers?.[drawer] ?? null) : null;

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
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('ctx-open');
      el?.classList.remove('ctx-open');
    };
  }, [drawer]);

  const view = (
    children ??
    (!data ? null
      : route === 'weekly'
        ? <WeeklyView p={data} tier={effTier} funnel={funnel} sample={sample} open={openDrawer} go={go} />
        : route === 'alerts'
          ? (
            <AlertsView
              p={data} tier={effTier} funnel={funnel} sample={sample} open={openDrawer} go={go}
              readIds={readIds} markRead={markRead}
            />
          )
          : route === 'activities'
            ? <ActivitiesView p={data} tier={effTier} funnel={funnel} sample={sample} open={openDrawer} go={go} />
            : route === 'production'
              ? <ProductionView p={data} tier={effTier} funnel={funnel} sample={sample} open={openDrawer} go={go} />
              : (
                <Dashboard
                  p={data} tier={effTier} funnel={funnel} sample={sample} open={openDrawer} go={go}
                  trialStarted={trialStarted} setFunnel={pickFunnel}
                />
              ))
  );

  return (
    <div className={rootClass} ref={wrap}>
      {/* The two axes, readable by anything under the chrome. `tier` and not
          `effTier`: the raw choice, so a surface with its own ceiling rule can
          apply it rather than inherit this one's. See `view-state.tsx`. */}
      <PortalViewStateProvider tier={tier} funnel={funnel}>
      {/* `onOwner` AND `busy` NO LONGER GO TO THE CHROME. The owner-search band
          was their only consumer and it has been removed (see `Chrome`); `load`
          and `busy` are still owned here — `load` for the URL-driven read in the
          effect above, `busy` for the `Loader` below — so nothing about the
          owner read changed, only who is told about it. */}
      <Chrome
        p={data} route={route} go={go} tier={tier} setTier={pickTier} readIds={readIds}
        funnel={funnel} setFunnel={pickFunnel} sample={sample}
        open={openDrawer}
        sampleNote={shown?.note ?? null} trialStarted={trialStarted}
      >
        {error ? <ErrorCard detail={error} /> : null}
        {view}
        {/* NOT WHEN THE PAGE BROUGHT ITS OWN VIEW. This card stands in for the
            Dashboard and the Weekly Report, which are nothing without a
            snapshot. The Map is not: it reads the whole public record, not one
            owner, so it renders perfectly well before anybody is picked and the
            card would be an error message under a working page. */}
        {/* The copy no longer says "search for a name above" — there is no
            search box above it any more. The owner comes from the URL or from
            the default read, so a reload is the honest suggestion. */}
        {!children && !data && !error && !busy ? <ErrorCard detail="No owner is loaded yet. Reload the page, or open a link that names one." /> : null}
      </Chrome>
      </PortalViewStateProvider>

      <Loader on={busy} name={loadingName} steps={STEPS} />

      <DrawerPanel
        copy={copy} onClose={() => setDrawer(null)}
        sample={sample} sourceNote={data?.owner.identity_note ?? null}
      />
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
        Nothing is cached from a failed read, so nothing stale is being shown. Reload the page, or
        open <code>/api/health</code> to see which source did not answer.
      </p>
    </div>
  );
}

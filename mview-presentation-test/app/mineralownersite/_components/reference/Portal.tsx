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
 * included. THREE ADAPTATIONS, each marked `ADAPTED` where it appears:
 *
 *   1  THE ROUTE TABLE. The reference serves `/`, `/alerts`, `/activities` and
 *      `/weekly`. Here the Dashboard is `/mineralownersite` and the Weekly
 *      Report is `/mineralownersite/briefing`, which is where this app's
 *      sidebar has always pointed.
 *
 *   2  ALERTS AND ACTIVITIES ARE THIS APP'S OWN PAGES. They are outside the
 *      scope of this work, so `go('alerts')` and `go('activities')` navigate
 *      to the existing `/mineralownersite/alerts` and `.../activities` rather
 *      than rendering the reference's `AlertsView`/`ActivitiesView`. Every
 *      label, icon, badge and position in the chrome is still the reference's;
 *      only the destination is this build's.
 *
 *   3  THE GATE CLASSES GO ON THE ROOT ELEMENT, not on `<body>`. The reference
 *      writes `in-app`, `view-*`, `no-claim`/`mv-sample` and `state-*` to the
 *      document body, which is fine in an app that is nothing but this portal.
 *      Here the same document also carries the marketing site, so the classes
 *      go on this component's own wrapper and the ported stylesheet is scoped
 *      to it. Without that, `state-claimed .cl-lock` would blur figures on
 *      pages that have nothing to do with this one.
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
import DrawerPanel from './DrawerPanel';
import Loader, { type Step } from './Loader';

export type Route = 'dashboard' | 'alerts' | 'activities' | 'weekly';

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
  alerts: '/mineralownersite/alerts',
  activities: '/mineralownersite/activities',
};
/** ADAPTED 2 · which routes this shell renders itself */
const OWNED: Route[] = ['dashboard', 'weekly'];

export const ROUTE_TITLE: Record<Route, string> = {
  dashboard: 'Dashboard', alerts: 'Alerts', activities: 'Activities',
  weekly: 'Weekly Report',
};

export interface OwnerRef {
  ownername: string; ownernumber: string | number | null;
  districtcode: string | null; year: number | null;
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

export default function Portal({ route: initialRoute, initial }:
{ route: Route; initial: Payload | null }) {
  const [route, setRoute] = useState<Route>(initialRoute);
  const [live, setLive] = useState<Payload | null>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tier, setTier] = useState<Tier>('detailed');
  const [funnel, setFunnel] = useState<FunnelKey>('paid');
  const [drawer, setDrawer] = useState<string | null>(null);
  const [loadingName, setLoadingName] = useState<string | null>(null);
  const [trialStarted, setTrialStarted] = useState<string | null>(null);
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
    } catch { /* private mode — the defaults are correct */ }
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
  /* ADAPTED 3 · the reference writes these to <body>; they go on this
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
    return want.join(' ');
  }, [effTier, funnel]);

  /* --------------------------------------------------------------- the URL */
  useEffect(() => {
    const onPop = () => {
      const p = window.location.pathname.replace(/\/+$/, '') || '/';
      setRoute(p === ROUTE_PATH.weekly ? 'weekly' : 'dashboard');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const go = useCallback((r: Route) => {
    /* ADAPTED 2 · the two routes this shell does not own are real pages under
       this app's other layout, so they are a navigation rather than a state
       change. The reference's own reason for keeping ITS four in-component —
       "a route change must not discard a snapshot that took seconds to build"
       — still applies to the two it does own, which is why those still switch
       without a request. */
    if (!OWNED.includes(r)) {
      setDrawer(null);
      router.push(ROUTE_PATH[r]);
      return;
    }
    setRoute(r);
    setDrawer(null);
    const q = window.location.search;
    window.history.pushState({ r }, '', ROUTE_PATH[r] + q);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [router]);

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
    !data ? null
      : route === 'weekly'
        ? <WeeklyView p={data} tier={effTier} funnel={funnel} sample={sample} open={openDrawer} go={go} />
        : (
          <Dashboard
            p={data} tier={effTier} funnel={funnel} sample={sample} open={openDrawer} go={go}
            trialStarted={trialStarted} setFunnel={pickFunnel}
          />
        )
  );

  return (
    <div className={rootClass} ref={wrap}>
      <Chrome
        p={data} route={route} go={go} tier={tier} setTier={pickTier}
        funnel={funnel} setFunnel={pickFunnel} sample={sample}
        onOwner={load} busy={busy} open={openDrawer}
        sampleNote={shown?.note ?? null} trialStarted={trialStarted}
      >
        {error ? <ErrorCard detail={error} /> : null}
        {view}
        {!data && !error && !busy ? <ErrorCard detail="No owner is loaded yet. Search for a name above." /> : null}
      </Chrome>

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
        Nothing is cached from a failed read, so nothing stale is being shown. Try the search box
        above, or open <code>/api/health</code> to see which source did not answer.
      </p>
    </div>
  );
}

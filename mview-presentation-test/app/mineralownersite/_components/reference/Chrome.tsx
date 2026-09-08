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
 * The chrome: owner picker, sidebar, top bar, pinned value + price bar,
 * profile menu, and the phone bottom bar.
 *
 * Structure and class names are v1's (`.mvlive-picker`, `.app-shell`,
 * `.app-side`, `.app-top`, `#mvPinBar`, `.pin-spot`), so the prototype sheets
 * and `live.css` style it directly rather than being re-implemented.
 *
 * TWO DELIBERATE CHANGES FROM v1, and only these:
 *
 * 1. THE FOUR PERSONAS AND THE FIVE FUNNEL STATES MOVED INTO THE PROFILE MENU.
 *    v1 had the density switch and a state cycler side by side on the top bar,
 *    which is two demo controls competing with the page. They now live behind
 *    the avatar, which is where people look for "how do I want this to look".
 *
 * 2. THE PINNED PRICE STRIP IS FOUR LIVE SETTLEMENTS. v1 put the value model's
 *    own two deck prices here, which is a different number from a market price
 *    — it is the path the estimate is calculated on. The deck moved to its own
 *    labelled card on the dashboard, and this strip now carries WTI, natural
 *    gas, Brent and propane as published by the EIA, each with its settlement
 *    date. A series that failed shows "n/a", never a last-known value.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { Payload } from '../../_lib/reference/payload';
import { usd, usdShort, pctS, plural, productWord } from '../../_lib/reference/fmt';
import {
  FUNNEL, PERSONAS, ROUTE_PATH, ROUTE_TITLE, type FunnelKey, type OwnerRef, type Route,
} from './Portal';
import type { Tier } from './bits';
import { FunnelBar } from './funnel';

const PLAN: Record<FunnelKey, string> = {
  unclaimed: 'Not claimed', claimed: 'Free', trial: 'Trial', lapsed: 'Lapsed', paid: 'Premium plan',
};

/**
 * The sidebar, in the reference's own order, with its own labels and icons.
 *
 * ADAPTED — `href`. In the reference every row that is not one of its four
 * routes carries `key: null` and renders as a `soon` link, because those
 * modules are not in that build. Two of them ARE in this one, so they get a
 * real destination and lose the `soon` tag: telling a reader that My Leases is
 * "not in this build" while `/mineralownersite/leases` sits there would be a
 * false statement, and the reference's own rule for this row is "give the row
 * its `href` when its page lands".
 *
 * Nothing else moves: the labels, the icons, the order and the three section
 * headings are the reference's, and the rows that genuinely have no page here
 * keep its `soon` treatment exactly.
 */
const NAV: {
  key: Route | null; label: string; icon: string; sec?: string; href?: string;
}[] = [
  { sec: 'My Minerals', key: 'dashboard', label: 'Dashboard', icon: 'mvi-home' },
  { key: 'alerts', label: 'Alerts', icon: 'mvi-bell' },
  { key: 'activities', label: 'Activities', icon: 'mvi-activity' },
  { key: null, label: 'My Leases', icon: 'mvi-leases', href: '/mineralownersite/leases' },
  { key: null, label: 'Map', icon: 'mvi-map', href: '/map-explorer' },
  { key: null, label: 'Production & Forecast', icon: 'mvi-trend' },
  { key: 'weekly', label: 'Weekly Report', icon: 'mvi-mail' },
  { sec: 'Services', key: null, label: 'Lease Audit', icon: 'mvi-audit' },
  { sec: 'Community', key: null, label: 'Groups', icon: 'mvi-groups' },
  { key: null, label: 'Invite Co-Owners', icon: 'mvi-invite' },
];

/** where the account menu's four rows go in this app */
const ACCOUNT: { label: string; href?: string }[] = [
  { label: 'My Profile' },
  { label: 'Settings', href: '/mineralownersite/settings' },
  { label: 'Billing & Plan' },
  { label: 'Contact Us', href: '/contact-us' },
];

function Icon({ id }: { id: string }) {
  return <svg className="mvi" aria-hidden="true"><use href={'#' + id} /></svg>;
}

export interface ChromeProps {
  p: Payload | null;
  route: Route;
  go: (r: Route) => void;
  tier: Tier; setTier: (t: Tier) => void;
  funnel: FunnelKey; setFunnel: (f: FunnelKey) => void;
  sample: boolean;
  sampleNote: string | null;
  trialStarted: string | null;
  onOwner: (o: OwnerRef) => void;
  busy: boolean;
  open: (key: string) => void;
  children: React.ReactNode;
}

export default function Chrome(c: ChromeProps) {
  const [menu, setMenu] = useState(false);
  const [stateMenu, setStateMenu] = useState(false);
  const [nav, setNav] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef<HTMLDivElement | null>(null);

  /* a menu that does not close on an outside click stays open behind whatever
     the reader does next */
  useEffect(() => {
    if (!menu) return;
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenu(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [menu]);

  /* the account-state menu is a SEPARATE control on the bar, so it needs its
     own outside-click handler rather than sharing the profile menu's */
  useEffect(() => {
    if (!stateMenu) return;
    const onDoc = (e: MouseEvent) => {
      if (!stateRef.current?.contains(e.target as Node)) setStateMenu(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setStateMenu(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [stateMenu]);

  const o = c.p?.owner;
  const t = c.p?.totals;
  const unread = c.p?.alerts.items.filter((a) => a.unread).length ?? 0;
  const state = FUNNEL.find((s) => s.key === c.funnel)!;
  const persona = PERSONAS.find((x) => x.key === c.tier)!;

  return (
    <div className="app-shell" id="appShell">
      {/* ------------------------------------------------------------ side */}
      <aside className={'app-side' + (nav ? ' open' : '')} role="navigation" aria-label="Portal navigation">
        <div style={{ margin: '4px 8px 16px', fontWeight: 800, fontSize: 17, color: '#eaf6f0' }}>
          Mineral<span style={{ color: 'var(--green)' }}>View</span>
        </div>

        {c.sample
          ? (
            <a
              className="nav-item" href="#claim"
              onClick={(e) => { e.preventDefault(); c.open('identity'); }}
            >
              <span className="nav-ico"><Icon id="mvi-claim" /></span> Claim Mineral Owner
            </a>
          )
          : null}

        {NAV.map((item) => (
          <React.Fragment key={item.label}>
            {item.sec ? <div className="navsec">{item.sec}</div> : null}
            {item.key
              ? (
                <a
                  className={'nav-item' + (c.route === item.key ? ' on' : '')}
                  href={ROUTE_PATH[item.key]}
                  aria-current={c.route === item.key ? 'page' : undefined}
                  onClick={(e) => { e.preventDefault(); setNav(false); c.go(item.key!); }}
                  style={{ justifyContent: 'flex-start' }}
                >
                  <span className="nav-ico"><Icon id={item.icon} /></span> {item.label}
                  {item.key === 'alerts' && unread
                    ? <span className="unread" style={{ marginLeft: 'auto' }}>{unread}</span>
                    : null}
                </a>
              )
              : item.href
                ? (
                  /* ADAPTED · the module exists in this app, so the row is a
                     real link and carries no `soon` tag */
                  <a
                    className="nav-item" href={item.href}
                    style={{ justifyContent: 'flex-start' }}
                  >
                    <span className="nav-ico"><Icon id={item.icon} /></span> {item.label}
                  </a>
                )
                : (
                  <a
                    className="nav-item soon" href={'/mineralownersite/soon/' + slug(item.label)}
                    title={item.label + ' — not in this build'}
                  >
                    <span className="nav-ico"><Icon id={item.icon} /></span> {item.label}
                    <span className="soon-tag">soon</span>
                  </a>
                )}
          </React.Fragment>
        ))}

        <div className="side-foot" style={{ marginTop: 18 }}>
          <span>{c.sample ? 'This account' : o?.ownername ?? '—'}</span> · <span>{PLAN[c.funnel]}</span>
          <br />
          <span style={{ color: '#5b6472' }}>
            {c.sample
              ? 'Nothing claimed — every amount below is a sample'
              : `Roll year ${o?.roll_year ?? '—'} · live from the public record`}
          </span>
        </div>
      </aside>

      {/* ------------------------------------------------------------ main */}
      <div className="app-main">
        <OwnerPicker
          onOwner={c.onOwner} busy={c.busy} p={c.p} sample={c.sample}
        />

        <div className="app-top">
          <button className="app-hamburger" onClick={() => setNav((v) => !v)} aria-label="Menu">☰</button>
          <span className="pagename">{ROUTE_TITLE[c.route]}</span>
          {c.sample
            ? <span className="mv-demochip" title="Nothing claimed — every amount is illustrative">
                Sample data
              </span>
            : null}
          <span className="spacer" />

          {/* ACCOUNT STATE — on the bar, not in the profile menu.
              It changes what the whole page shows, so it belongs where it is
              visible at a glance rather than two clicks deep behind an avatar.
              `.mv-statewrap` / `.mv-statemenu` are v1's own classes, already
              styled in live.css. */}
          <div className="mv-statewrap" ref={stateRef}>
            <button
              className="btn btn-ghost btn-sm" type="button"
              aria-haspopup="menu" aria-expanded={stateMenu}
              onClick={() => setStateMenu((v) => !v)}
              title="Account state — walk the five owner funnel states"
            >
              {state.label} &#9662;
            </button>
            <div
              className={'mv-statemenu' + (stateMenu ? ' open' : '')}
              role="menu" aria-label="Account state"
            >
              <div className="mv-statehead">Account state</div>
              {FUNNEL.map((s) => (
                <button
                  key={s.key} type="button" role="menuitemradio"
                  aria-checked={c.funnel === s.key}
                  className={c.funnel === s.key ? 'on' : ''}
                  onClick={() => { c.setFunnel(s.key); setStateMenu(false); }}
                >
                  <b>{s.label}</b><span>{s.note}</span>
                </button>
              ))}
            </div>
          </div>

          <Link
            className="plan-pill" href="/mineralownersite/soon/billing-and-plan"
            style={{ textDecoration: 'none' }}
          >
            {PLAN[c.funnel]}
          </Link>

          <a
            className="bellbtn" href={ROUTE_PATH.alerts}
            title={unread ? `Alerts — ${unread} unread` : 'Alerts'}
            aria-label={`Open alerts${unread ? `, ${unread} unread` : ''}`}
            onClick={(e) => { e.preventDefault(); c.go('alerts'); }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
          >
            ⚑{unread ? <span className="bdg">{unread}</span> : null}
          </a>

          {/* ------------------------------------------- the profile menu */}
          <div className="mv-menuwrap" ref={menuRef}>
            <button
              className="avatar" onClick={() => setMenu((v) => !v)}
              aria-haspopup="menu" aria-expanded={menu}
              title={c.sample ? 'No record claimed yet' : `${o?.ownername ?? 'Account'} — account menu`}
              style={{ border: 0, cursor: 'pointer' }}
            >
              {c.sample ? 'Me' : o?.initials ?? '··'}
            </button>

            <div className="mv-menu" role="menu" aria-label="Account menu" hidden={!menu}>
              <div className="mv-menu-head">
                <strong>{c.sample ? 'No record claimed' : o?.ownername ?? '—'}</strong>
                <span>
                  {PLAN[c.funnel]}
                  {!c.sample && o?.city ? ` · ${o.city}` : ''}
                  {!c.sample && o?.ownernumber != null ? ` · owner ${o.ownernumber}` : ''}
                </span>
              </div>

              {/* THE FOUR PERSONAS — the redesign's density tiers, moved here */}
              <div className="mv-menu-sec">
                How much detail
                <span className="tiny muted" style={{ fontWeight: 400 }}>{persona.label}</span>
              </div>
              <div className="mv-persona" role="tablist" aria-label="How much detail to show">
                {PERSONAS.map((x) => (
                  <button
                    key={x.key} role="tab" aria-selected={c.tier === x.key}
                    className={c.tier === x.key ? 'on' : ''}
                    title={x.note}
                    onClick={() => c.setTier(x.key)}
                  >
                    {x.label}
                  </button>
                ))}
              </div>
              <p className="tiny muted" style={{ margin: '0 12px 6px' }}>{persona.note}</p>

              <div className="mv-menu-sec" style={{ borderTop: '1px solid var(--line)' }}>Account</div>
              {/* ADAPTED · the same four rows the reference lists, with the two
                  this app actually has pointing at their real pages */}
              {ACCOUNT.map((x) => (
                <a
                  key={x.label} role="menuitem"
                  href={x.href ?? '/mineralownersite/soon/' + slug(x.label)}
                  onClick={() => setMenu(false)}
                >
                  <Icon id="mvi-user" /> {x.label}
                  {x.href
                    ? null
                    : <span className="soon-tag" style={{ color: 'var(--muted)' }}>soon</span>}
                </a>
              ))}
              <button className="mi" onClick={() => { setMenu(false); c.open('identity'); }}>
                <Icon id="mvi-audit" /> How this record was identified
              </button>
            </div>
          </div>
        </div>

        {/* THE PLAN BANNER — between the top bar and the pinned value, which
            is where the redesign puts it. `#mvFunnelBar` is display:none by
            default and revealed per state by mvfunnelstates.css, so `paid`
            correctly shows nothing at all. */}
        <FunnelBar
          p={c.p} funnel={c.funnel} trialStarted={c.trialStarted}
          setFunnel={c.setFunnel} go={c.go} open={c.open}
        />

        {/* --------------------------------------------- pinned value line */}
        <div id="mvPinBar" role="group" aria-label="Your portfolio value and the commodity settlements">
          {c.sample
            ? (
              <span className="nc-inline pin-claim">
                Claim your mineral owner record to see what it is worth —{' '}
                <a href="#claim" onClick={(e) => { e.preventDefault(); c.open('value'); }}>
                  what the estimate is →
                </a>
              </span>
            )
            : (
              <div
                className="pin-val-wrap" role="button" tabIndex={0}
                onClick={() => c.open('value')}
                onKeyDown={(e) => { if (e.key === 'Enter') c.open('value'); }}
                title="Your value estimate — an estimate, not an appraisal. Click for how it is worked out."
              >
                <span className="pin-label">Your minerals</span>
                <span className="pin-val num cl-lock">{usd(c.p?.totals.owner_value) ?? '—'}</span>
                {/* Short on purpose. This is ONE slim line that also carries four
                    settlements; the full range and the re-run date are in the
                    drawer this whole block opens. Measured: the longer wording
                    put the bar 64px over its width and clipped the first price. */}
                <span className="pin-sub hide-s">
                  {c.funnel === 'lapsed'
                    ? 'on hold — Premium'
                    : t
                      ? `${usdShort(t.owner_value_low)}–${usdShort(t.owner_value_high)}`
                      : 'estimate, not an appraisal'}
                </span>
              </div>
            )}

          <PriceStrip ticker={c.p?.ticker ?? null} open={c.open} />

          {c.p
            ? (
              <span className="pin-note">
                {productWord(c.p.totals.has_gas, c.p.totals.has_oil)} through{' '}
                {c.p.as_of.data_month_label ?? '—'}
              </span>
            )
            : null}
        </div>

        <div className="app-body">
          {c.children}
        </div>
      </div>

      {/* --------------------------------- phone bottom bar (CSS-gated) */}
      <nav className="mv-bottom" aria-label="Sections">
        {/* four now: the weekly report is a route rather than a "soon" page,
            and on a phone it is the one people open on a Saturday */}
        {(['dashboard', 'alerts', 'activities', 'weekly'] as Route[]).map((r) => (
          <a
            key={r} href={ROUTE_PATH[r]}
            className={c.route === r ? 'on' : ''}
            aria-current={c.route === r ? 'page' : undefined}
            onClick={(e) => { e.preventDefault(); c.go(r); }}
          >
            <Icon id={r === 'dashboard' ? 'mvi-home'
              : r === 'alerts' ? 'mvi-bell'
                : r === 'activities' ? 'mvi-activity' : 'mvi-mail'} />
            {r === 'weekly' ? 'Weekly' : ROUTE_TITLE[r]}
          </a>
        ))}
      </nav>
    </div>
  );
}

/* ================================================================ prices */
/**
 * WTI, natural gas, Brent and propane, as published by the EIA.
 *
 * Each carries its own settlement date in its tooltip because they do not
 * settle together — one date over four values would be wrong for at least one
 * of them. A series that failed to load renders "n/a" rather than a last-known
 * value: the prototype's own comment records that this strip once random-walked
 * from a hardcoded $68.78 WTI seed while the real settlement was $84.38.
 */
function PriceStrip({ ticker, open }: { ticker: Payload['ticker']; open: (k: string) => void }) {
  if (!ticker || !ticker.items.length) return <span className="spacer" />;
  return (
    <div className="pin-spot">
      {ticker.items.map((q) => (
        <span
          key={q.key} className="pin-tk tk-click" role="button" tabIndex={0}
          onClick={() => open('prices')}
          onKeyDown={(e) => { if (e.key === 'Enter') open('prices'); }}
          title={q.error
            ? `${q.label} did not load: ${q.error}`
            : `${q.label} ${q.display} ${q.unit} — ${q.desc}, settled ${q.as_of}`}
        >
          <span className="sym">{q.label}</span>
          {q.display
            ? <span className="mv-spot-val">{q.display}</span>
            : <span className="tk-na">n/a</span>}
          {q.change_pct != null && Math.abs(q.change_pct) >= 0.005
            ? (
              <span
                className="tk-chg"
                style={{ color: q.change_pct >= 0 ? '#7fe3bd' : '#ff9a8b' }}
              >
                {q.change_pct > 0 ? '▲' : '▼'}{Math.abs(q.change_pct).toFixed(1)}%
              </span>
            )
            : null}
        </span>
      ))}
    </div>
  );
}

/* ========================================================== owner picker */
/**
 * Search the appraisal roll by name.
 *
 * Debounced at 450ms and only from three characters, because each miss is a
 * scan of the roll year — there is no index on the owner name. An exact single
 * hit loads on Enter; anything else lists, because picking the wrong Smith is
 * worse than one extra click.
 */
function OwnerPicker(
  { onOwner, busy, p, sample }:
  { onOwner: (o: OwnerRef) => void; busy: boolean; p: Payload | null; sample: boolean },
) {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<OwnerHit[] | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const seq = useRef(0);
  const box = useRef<HTMLDivElement | null>(null);

  const run = useCallback(async (text: string) => {
    const my = ++seq.current;
    setSearching(true);
    try {
      const res = await fetch('/api/owners/search?q=' + encodeURIComponent(text), { cache: 'no-store' });
      const d = await res.json();
      if (my !== seq.current) return;
      setRows(d.results ?? []);
      setNote(d.note
        ?? (d.widened_to_prefix
          ? `No exact match for “${text}”, so these are names that start with it — roll year ${d.year}.`
          : d.count
            ? `${d.count} ${d.count === 1 ? 'match' : 'matches'} on the ${d.year} appraisal roll.`
            : `Nothing on the ${d.year} roll matches “${text}”. The roll carries the name as the county recorded it — surname first — so try a surname on its own.`));
    } catch (e) {
      if (my === seq.current) {
        setRows([]);
        setNote('The search did not answer: ' + (e instanceof Error ? e.message : String(e)));
      }
    } finally {
      if (my === seq.current) setSearching(false);
    }
  }, []);

  /* debounce — every keystroke would otherwise start a roll scan */
  useEffect(() => {
    const text = q.trim();
    if (text.length < 3) { setRows(null); setNote(null); return; }
    const id = window.setTimeout(() => void run(text), 450);
    return () => window.clearTimeout(id);
  }, [q, run]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) { setRows(null); setNote(null); }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const pick = (r: OwnerHit) => {
    setRows(null); setNote(null); setQ('');
    onOwner({
      ownername: r.ownername, ownernumber: r.ownernumber,
      districtcode: r.districtcode, year: r.year,
    });
  };
  const single = rows?.length === 1 ? rows[0] : null;

  return (
    <div className="mvlive-picker" ref={box}>
      <div className="mvlive-picker-in">
        <span className="mvlive-tag">Mineral owner</span>
        <form
          autoComplete="off" role="search"
          onSubmit={(e) => {
            e.preventDefault();
            if (single) pick(single);
            else if (q.trim().length >= 3) void run(q.trim());
          }}
        >
          <input
            type="search" value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search a mineral owner by name — e.g. Platis Sydney Kay"
            aria-label="Search a mineral owner by name"
            autoComplete="off" spellCheck={false} disabled={busy}
          />
          <button className="btn btn-primary btn-sm" type="submit" disabled={busy || q.trim().length < 3}>
            {searching ? 'Searching…' : 'Search'}
          </button>
        </form>
        <span className="mvlive-who">
          {busy
            ? <><span className="mv-inline-spin" aria-hidden="true" />loading</>
            : p
              ? (
                <>
                  Showing <b>{sample ? 'a sample of this record' : p.owner.ownername}</b> ·{' '}
                  {p.totals.lease_count} {plural(p.totals.lease_count, 'lease')} ·{' '}
                  {p.totals.counties.join(', ')} · roll {p.owner.roll_year}
                </>
              )
              : 'no owner loaded'}
        </span>
      </div>

      {rows
        ? (
          <div className="mvlive-results" role="listbox" aria-label="Owner search results">
            {note ? <div className="mvlive-note">{note}</div> : null}
            {rows.length
              ? rows.map((r) => (
                <button
                  key={`${r.ownernumber}:${r.districtcode}:${r.ownername}`}
                  className="mvlive-row" role="option" aria-selected={false}
                  onClick={() => pick(r)} type="button"
                >
                  <b>{r.ownername}</b>
                  <span className="r-meta">
                    owner {r.ownernumber} · district {r.districtcode}
                    {r.city ? ` · ${r.city}` : ''} · {r.lease_count}{' '}
                    {plural(r.lease_count, 'lease')}
                  </span>
                  <span className="r-val">{usdShort(r.appraised_total) ?? '—'}</span>
                </button>
              ))
              : <div className="mvlive-empty">{note}</div>}
          </div>
        )
        : null}
    </div>
  );
}

interface OwnerHit {
  ownername: string; ownernumber: string | number; districtcode: string;
  city: string | null; lease_count: number; appraised_total: number; year: number;
}

const slug = (s: string) =>
  s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

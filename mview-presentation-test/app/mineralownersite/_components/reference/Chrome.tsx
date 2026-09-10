'use client';
/* THE FILE-LEVEL `react-hooks/set-state-in-effect` DISABLE IS GONE, and its
 * absence is the evidence rather than an oversight: the one effect here that
 * tripped the rule was the owner search's 450ms debounce, and that component has
 * been removed (see the note where it used to render). What is left — two
 * outside-click/Escape listeners — sets state from an event handler, which the
 * rule has never objected to. ESLint now reports an UNUSED disable directive if
 * one is put back, so this cannot rot silently.
 *
 * The argument for the ported effects that do still need it, and why rewriting
 * them would fork the reference rather than copy it, is at the top of
 * `Portal.tsx`, where those effects live.
 */
/**
 * The chrome: sidebar, top bar, pinned value + price bar, profile menu, and
 * the phone bottom bar.
 *
 * Structure and class names are v1's (`.app-shell`, `.app-side`, `.app-top`,
 * `#mvPinBar`, `.pin-spot`), so the prototype sheets and `live.css` style it
 * directly rather than being re-implemented.
 *
 * THREE DELIBERATE CHANGES FROM v1, and only these:
 *
 * 1. THE FOUR PERSONAS AND THE FIVE FUNNEL STATES MOVED INTO THE PROFILE MENU.
 *    v1 had the density switch and a state cycler side by side on the top bar,
 *    which is two demo controls competing with the page. They now live behind
 *    the avatar, which is where people look for "how do I want this to look".
 *
 * 2. THE OWNER-SEARCH BAND IS GONE (requested). v1 put a full-width name
 *    search above this row. See the note where it used to render for what went
 *    with it and what did not.
 *
 * 3. THE PINNED PRICE STRIP IS FOUR LIVE SETTLEMENTS. v1 put the value model's
 *    own two deck prices here, which is a different number from a market price
 *    — it is the path the estimate is calculated on. The deck moved to its own
 *    labelled card on the dashboard, and this strip now carries WTI, natural
 *    gas, Brent and propane as published by the EIA, each with its settlement
 *    date. A series that failed shows "n/a", never a last-known value.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PortalAvatar } from '../portal-avatar';
import { PortalLogout } from '../portal-logout';
import { usePortalMember } from '../portal-session';
import type { Payload } from '../../_lib/reference/payload';
import { usd, usdShort, pctS, productWord } from '../../_lib/reference/fmt';
import {
  FUNNEL, PERSONAS, ROUTE_PATH, ROUTE_TITLE, type FunnelKey, type Route,
} from './Portal';
import type { Tier } from './bits';
import { FunnelBar } from './funnel';

const PLAN: Record<FunnelKey, string> = {
  unclaimed: 'Not claimed', claimed: 'Free', trial: 'Trial', lapsed: 'Lapsed', paid: 'Premium plan',
};

/**
 * THE REAL LOGO, on both of this shell's dark surfaces.
 *
 * WHAT THIS REPLACED. The sidebar's wordmark was HAND-DRAWN IN TEXT —
 * `Mineral<span style={{color:'var(--green)'}}>View</span>` at weight 800 — so
 * the portal's only branding was a two-tone approximation of the logo in
 * whatever face the page happened to load. `site-nav.ts` has a standing
 * instruction against exactly that ("Never hand-recreate either as SVG", and
 * "every hand-drawn reproduction of this logo has been wrong"), and the top bar
 * carried no mark at all.
 *
 * THE DARK-GROUND PAIR, because both surfaces here are `--ink`: the sidebar
 * (`dashboard-reference.css`) and, since the rows were merged, `.app-top` too
 * (`dashboard-reference.onebar.css` §1). `icons/mineralview-logo.png` is green
 * "MINERAL" plus WHITE "VIEW", which is what makes it read on black — and
 * exactly what makes it fail on the white bar the OTHER portal shell has, where
 * `graphics/mview-logo.png` is used instead. The pairs are not interchangeable;
 * `site-nav.ts` sets out the whole distinction, and swapping them is a bug that
 * has been rediscovered several times.
 *
 * `icons/logo.jpg.jpg` is the square icon mark, the same file the marketing
 * header takes at phone width. Its black tile is baked in (a JPG has no
 * transparency), which is why it wants a circular crop — and why it sits so well
 * on `--ink`: the tile disappears into the row and the mark's green ring is what
 * reads.
 *
 * NO CLOUDINARY TRANSFORM ON EITHER — a standing instruction (Ryan, 2026-08-13,
 * confirmed after seeing the rendered result). A colour swap is never the fix
 * for a logo that does not read; pick the pair drawn for the ground.
 *
 * Sizes are the files' real intrinsic ones, which `next/image` needs for the
 * aspect ratio; the rendered size comes from the stylesheet.
 */
const LOGO = {
  wordmark: {
    src: 'https://res.cloudinary.com/mview/image/upload/icons/mineralview-logo.png',
    width: 577,
    height: 132,
  },
  mark: {
    src: 'https://res.cloudinary.com/mview/image/upload/icons/logo.jpg.jpg',
    width: 63,
    height: 63,
  },
} as const;

/**
 * The sidebar, in the reference's own order, with its own labels and icons.
 *
 * The reference promotes My Leases and Production & Forecast to real routes in
 * this version, so both are `key:` rows here as they are there.
 *
 * ADAPTED — `Map` is a row the reference marks `soon`, because that module is
 * not in that build. It IS in this one, so it loses the tag and becomes a real
 * destination: telling a reader that Map is "not in this build" while the page
 * sits one click away would be a false statement.
 *
 * AND MAP IS A `key` ROW, NOT AN `href` ROW, which is the difference that
 * matters. It used to point at `/map-explorer` — outside this shell, so the row
 * could never light up and the top bar could never name it. The map is now
 * `/mineralownersite/map` under this same route group, wearing this shell, so it
 * is a `Route` like the others: `ROUTE_PATH` supplies the destination, the row
 * takes `.on` when it is the current one and the top bar reads "Map".
 *
 * ADAPTED — `leases` is a route this shell does NOT own. My Leases is outside
 * this work, so `go('leases')` navigates to the page this app already has (see
 * OWNED in Portal). The row is the reference's in every other respect, `.on`
 * highlighting included.
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
  { key: 'leases', label: 'My Leases', icon: 'mvi-leases' },
  { key: 'map', label: 'Map', icon: 'mvi-map' },
  { key: 'production', label: 'Production & Forecast', icon: 'mvi-trend' },
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
  /** the current row, or `null` on a page that is not one of the routes — see
   *  the prop's own note on `Portal`. Every `route ===` test below misses on
   *  `null`, which lights nothing and marks nothing `aria-current`. */
  route: Route | null;
  go: (r: Route) => void;
  tier: Tier; setTier: (t: Tier) => void;
  funnel: FunnelKey; setFunnel: (f: FunnelKey) => void;
  sample: boolean;
  sampleNote: string | null;
  trialStarted: string | null;
  /* `onOwner` AND `busy` ARE GONE from this interface along with the owner
     search that was their only consumer — see the note where it used to
     render. `Portal` still owns both (`load` for the URL-driven read on mount,
     `busy` for the Loader); they simply no longer reach the chrome. */
  open: (key: string) => void;
  /** the alerts this reader has opened, owned by `Portal` so the rail badge
   *  and the Alerts page cannot disagree — see `markRead` there */
  readIds: Set<string>;
  children: React.ReactNode;
}

export default function Chrome(c: ChromeProps) {
  /* WHO IS SIGNED IN — the member, which is NOT the owner record.
     `c.p.owner` is the mineral owner record on screen (its name, its initials,
     its owner number); this is the person logged in. The avatar and the menu
     head printed the record for both jobs, so a signed-in member saw the
     record's initials where their own account should be. Read from the session
     cookie on the server in `(reference)/layout.tsx` — see `portal-session.tsx`
     for why it arrives as a context rather than a prop. Null when signed out,
     and every use below falls back to what it printed before. */
  const member = usePortalMember();
  const [menu, setMenu] = useState(false);
  const [stateMenu, setStateMenu] = useState(false);
  const [nav, setNav] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  /**
   * A COMING-SOON ROW CARRIES THE OWNER ACROSS WITH IT.
   *
   * Those pages render this same shell now, and the shell reads the owner off
   * the query string — so a bare `href="/mineralownersite/soon/lease-audit"`
   * arrived with no owner and the sidebar foot, the picker and the pinned value
   * line came back holding the DEFAULT owner. Clicking a greyed-out row is not
   * a request to change who you are looking at, and the shell silently
   * swapping owners underneath the click is worse than the missing sidebar it
   * replaced.
   *
   * `pathname` off the anchor rather than the string it was built from, so this
   * one handler serves the sidebar rows, the account rows and the plan pill
   * without any of them repeating their own href.
   */
  const goSoon = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    /* a modified or middle click is the reader asking the BROWSER for a new tab
       — it is not ours to intercept, and the href it follows is already right */
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    router.push(e.currentTarget.pathname + window.location.search);
  }, [router]);

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
  /* `a.unread` is the SERVER'S opinion and `readIds` is this reader's, so the
     badge subtracts one from the other. Counting the payload alone left the
     rail saying 6 after the page had been marked all read. */
  const unread = c.p?.alerts.items
    .filter((a) => a.unread && !c.readIds.has(a.id)).length ?? 0;
  const state = FUNNEL.find((s) => s.key === c.funnel)!;
  const persona = PERSONAS.find((x) => x.key === c.tier)!;
  /* The avatar is the MEMBER when there is one. Its old value — the owner
     record's initials, or `Me` while nothing is claimed — stays as the fallback
     for a signed-out reader, so the demo walkthrough is unchanged. */
  const avatarName = member?.name ?? (c.sample ? 'No record claimed yet' : o?.ownername ?? 'Account');
  const avatarInitials = member?.initials ?? (c.sample ? 'Me' : o?.initials ?? '··');

  return (
    <div className="app-shell" id="appShell">
      {/* ------------------------------------------------------------ side */}
      <aside className={'app-side' + (nav ? ' open' : '')} role="navigation" aria-label="Portal navigation">
        {/* THE REAL WORDMARK, not the two-tone text that used to be here — see
            `LOGO` above. `height: 30px; width: auto` is what the reference build
            renders this same file at on this same rail
            (`owner/src/shell/chunk-004.html`), and the margins are the ones the
            text carried, so nothing below it moves. */}
        <Image
          src={LOGO.wordmark.src}
          alt="Mineral View"
          width={LOGO.wordmark.width}
          height={LOGO.wordmark.height}
          priority
          className="mv-side-logo"
        />

        {/*
          IT OPENS THE CLAIM FLOW, NOT THE EXPLAINER.

          This used to `preventDefault` and open the `identity` drawer — "How
          this record was identified as yours". That drawer explains why a
          SAMPLE record is being shown; it does not claim anything, so the one
          control in the whole sidebar labelled "Claim Mineral Owner" never led
          to claiming. The five-step flow lives at /mineralownersite/claim.

          A REAL NAVIGATION, not the reference's own `c.go`. That router only
          moves between routes inside this (reference) group; the claim flow is
          under (portal), with a different layout, so it has to be a genuine
          route change. The explainer keeps its other triggers — the dashboard,
          alerts, activities and the account menu all still open it.
        */}
        {c.sample
          ? (
            <Link className="nav-item" href="/mineralownersite/claim">
              <span className="nav-ico"><Icon id="mvi-claim" /></span> Claim Mineral Owner
            </Link>
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
                    title={item.label + ' — coming soon'}
                    onClick={(e) => { setNav(false); goSoon(e); }}
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
        {/* NO OWNER-SEARCH BAND ABOVE THIS ROW (requested).

            `.mvlive-picker` used to sit here: a full-width "MINERAL OWNER"
            strip with a name search, a Search button and a "Showing <owner> ·
            10 leases · DE WITT · roll 2025" summary. It is gone, and with it
            the last piece of chrome that read as a data-browsing tool rather
            than one owner's portal — an owner has no reason to search the
            appraisal roll for other people's names, and it cost every screen a
            band of height above the chrome (OW-30: "I don't want to have so
            much at the top that you bury everything below it").

            WHAT WENT WITH IT, so this is not discovered later by surprise:

              · SWITCHING OWNERS FROM THE UI. Nothing on screen changes who is
                loaded any more. The shell still reads `?owner=`, `?num=`,
                `?dist=` and `?year=` from the URL and `Portal`'s `load` is
                untouched, so a deep link still selects an owner and the
                Loader still names its steps — see `(reference)/page.tsx`.
              · The roll year and lease count that strip restated. Both are
                already on the page: the sidebar foot carries "roll year …·
                live from the public record" and the dashboard's own subhead
                counts the leases.

            `OwnerPicker` itself is deleted rather than left unrendered —
            unreachable code is how a component stops being maintained, and git
            has it if the search is wanted back. */}
        <div className="app-top">
          <button className="app-hamburger" onClick={() => setNav((v) => !v)} aria-label="Menu">☰</button>

          {/* THE LOGO ON THE CHROME ROW, which had none.

              The rail carries the wordmark, and the rail is `display: none`
              below 860px — so on a phone this portal showed no Mineral View
              mark anywhere. Both files are in the markup and the stylesheet
              picks: the compact icon mark from 861px up, where the rail's
              wordmark is already on screen and this row is measured to the
              pixel (see `dashboard-reference.onebar.css` §3 — the row is
              always exactly full and drops content in a defined order), and the
              full wordmark below that, where the rail is gone and the row has
              wrapped the pinned group onto its own line.

              CSS AND NOT JAVASCRIPT, for the reason the marketing header
              records: choosing in JS would send one from the server and pop the
              other in after hydration.

              `alt` on the wordmark and `alt=""` on the mark, so the link is
              announced once rather than twice.

              IT LEAVES THE PORTAL, and that is the point of a brand mark. It
              used to be a second route to the Dashboard: `href` on
              `ROUTE_PATH.dashboard` with an `onClick` that called
              `c.go('dashboard')` so the switch cost no request. But the
              sidebar's own Dashboard row is already that, one line below, and
              a logo that goes nowhere new is a dead control — on the Dashboard
              itself it did literally nothing. Everywhere else on this site the
              wordmark means "back to the top of the site", including the other
              portal shell's rail (`portal-side-nav.tsx`, `href="/"`), which
              this now matches.

              NO `onClick` AT ALL any more. The handler existed to keep the
              navigation inside the client shell; leaving the shell is now the
              whole intent, so the plain `Link` is correct and a middle-click,
              a modified click and a right-click all behave the way the browser
              means them to. */}
          <Link
            className="app-brand"
            href="/"
            aria-label="Mineral View — home"
          >
            <Image
              src={LOGO.wordmark.src}
              alt="Mineral View"
              width={LOGO.wordmark.width}
              height={LOGO.wordmark.height}
              priority
              className="app-brand-word"
            />
            <Image
              src={LOGO.mark.src}
              alt=""
              width={LOGO.mark.width}
              height={LOGO.mark.height}
              priority
              className="app-brand-mark"
            />
          </Link>
          {/* NO PAGE NAME. It used to sit here and it was the third thing on
              screen saying the same word: the sidebar row is already marked
              `aria-current="page"` and painted green, and the page's own `<h1>`
              names the route immediately below. On the merged row it was also
              84px of the width the settlements now want.

              `ROUTE_TITLE` stays — the phone bottom bar labels its five tabs
              from it. */}
          {c.sample
            ? <span className="mv-demochip" title="Nothing claimed — every amount is illustrative">
                Sample data
              </span>
            : null}
          {/* THE VALUE AND THE SETTLEMENTS, ON THE CHROME ROW ITSELF.

              They were a second sticky band under this one (`#mvPinBar` at
              `top:58px`). Two bands cost 106px of every screen before any
              page content, and OW-30 — "I don't want to have so much at the
              top that you bury everything below it" — is an argument against
              the stack, not just against a tall bar. One row honours it
              better than two slim ones do.

              `#mvPinBar` IS KEPT AS THE WRAPPER, not unwrapped into loose
              children, because every rule that styles this content is scoped
              to that id — `#mvPinBar .pin-val`, `#mvPinBar .pin-tk .sym`,
              the lapsed blur, the whole width ladder. Nested here it keeps
              all of them and only sheds its own bar chrome (its background,
              its border, its sticky position), which the overrides sheet
              does. Unwrapping would have meant re-homing ~20 rules.

              IT SITS BEFORE `.spacer`, so the reading order is page name →
              value → prices → account controls, and the controls stay hard
              right where they have always been. */}
          {/* ------------------------------- the pinned value, INLINE */}
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
            onClick={goSoon}
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
              /* `.mv-avbtn` adds only what a tile holding a photograph needs
                 and a tile holding two letters does not — `overflow: hidden`
                 and a padding reset. The `.avatar` circle itself is untouched. */
              className="avatar mv-avbtn" onClick={() => setMenu((v) => !v)}
              aria-haspopup="menu" aria-expanded={menu}
              title={`${avatarName} — account menu`}
              aria-label={`${avatarName} — open account menu`}
              style={{ border: 0, cursor: 'pointer' }}
            >
              <PortalAvatar
                image={member?.image ?? null}
                initials={avatarInitials}
                className="mv-avfill"
              />
            </button>

            <div className="mv-menu" role="menu" aria-label="Account menu" hidden={!menu}>
              {/* THE MEMBER FIRST, THE RECORD UNDER IT. Both are here because
                  they are two different things and the menu was only ever
                  showing the second: the head named the owner RECORD, so a
                  signed-in member looking for their own account found the
                  appraisal-roll name they happened to be viewing.

                  Signed out — or on a page with no session — it falls back to
                  exactly what it printed before, so nothing about the demo
                  walkthrough changes. */}
              <div className="mv-menu-head">
                <PortalAvatar
                  image={member?.image ?? null}
                  initials={avatarInitials}
                  className="avatar mv-menu-pic"
                />
                <div className="mv-menu-who">
                  <strong>
                    {member?.name ?? (c.sample ? 'No record claimed' : o?.ownername ?? '—')}
                  </strong>
                  {member?.email ? <span className="mv-menu-mail">{member.email}</span> : null}
                  <span>
                    {PLAN[c.funnel]}
                    {!c.sample && o?.ownername && member ? ` · ${o.ownername}` : ''}
                    {!c.sample && o?.city ? ` · ${o.city}` : ''}
                    {!c.sample && o?.ownernumber != null ? ` · owner ${o.ownernumber}` : ''}
                  </span>
                </div>
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
                  onClick={(e) => { setMenu(false); if (!x.href) goSoon(e); }}
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

              {/* LOG OUT — last, behind its own rule. Bottom of the menu and
                  separated is where a signed-in product puts it, and it keeps
                  the one destructive item away from the rows a pointer sweeps
                  through on its way to Settings.

                  `PortalLogout` calls the SAME `signOutAction` the marketing
                  header calls. There is one sign-out path in this app and this
                  is it — nothing about the auth flow is re-implemented here.

                  Signed out the slot is the way IN instead: a menu offering Log
                  out to someone who is not logged in is worse than one offering
                  nothing. */}
              <div className="mv-menu-foot">
                {member
                  ? <PortalLogout className="mi mv-logout" onDone={() => setMenu(false)} />
                  : (
                    <Link
                      role="menuitem" href="/login"
                      className="mv-logout mv-logout-in"
                      onClick={() => setMenu(false)}
                    >
                      <Icon id="mvi-user" /> Sign in
                    </Link>
                  )}
              </div>
            </div>
          </div>
        </div>

        {/* THE PLAN BANNER — directly under the chrome row, which is still
            where the redesign puts it: the row above now carries the pinned
            value too, so "between the top bar and the pinned value" is one
            position rather than two and this is it. `#mvFunnelBar` is
            display:none by default and revealed per state by
            mvfunnelstates.css, so `paid` correctly shows nothing at all. */}
        <FunnelBar
          p={c.p} funnel={c.funnel} trialStarted={c.trialStarted}
          setFunnel={c.setFunnel} go={c.go} open={c.open}
        />

        <div className="app-body">
          {c.children}
        </div>
      </div>

      {/* --------------------------------- phone bottom bar (CSS-gated) */}
      <nav className="mv-bottom" aria-label="Sections">
        {/* five now: the weekly report is a route rather than a "soon" page and
            on a phone it is the one people open on a Saturday, and Production &
            Forecast is the one they open when a statement looks light */}
        {(['dashboard', 'alerts', 'leases', 'production', 'weekly'] as Route[]).map((r) => (
          <a
            key={r} href={ROUTE_PATH[r]}
            className={c.route === r ? 'on' : ''}
            aria-current={c.route === r ? 'page' : undefined}
            onClick={(e) => { e.preventDefault(); c.go(r); }}
          >
            <Icon id={r === 'dashboard' ? 'mvi-home'
              : r === 'alerts' ? 'mvi-bell'
                : r === 'activities' ? 'mvi-activity'
                  : r === 'leases' ? 'mvi-leases'
                    : r === 'production' ? 'mvi-trend' : 'mvi-mail'} />
            {r === 'weekly' ? 'Weekly' : r === 'production' ? 'Production'
              : r === 'leases' ? 'Leases' : ROUTE_TITLE[r]}
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
          {/* THE DELTA CARRIES A CLASS, NOT AN INLINE `style`. Its two colours
              were literals here — `#7fe3bd` and `#ff9a8b`, both picked to sit
              on the dark pinned bar. An inline style is unreachable from a
              stylesheet without `!important`, so when the bar's background
              changed these were the one pair of colours that could not follow
              it, and a pale mint arrow on white is invisible. The sheet owns
              them now: `.tk-up` / `.tk-dn` in
              `dashboard-reference.onebar.css`. */}
          {q.change_pct != null && Math.abs(q.change_pct) >= 0.005
            ? (
              <span
                className={'tk-chg ' + (q.change_pct >= 0 ? 'tk-up' : 'tk-dn')}
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

const slug = (s: string) =>
  s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

'use client';
/**
 * The dashboard — v1's layout, ported.
 *
 * An earlier pass here re-composed the page: its own greeting, its own card
 * selection, its own two-rail split. Same class names, same stylesheets, but a
 * different product. This is v1's structure, section for section, in the same
 * order, with the same card anatomy:
 *
 *    ultra hero (tier-u) · claim rail (nc-only) · greeting + owner chip ·
 *    sample badge · pf-strip · alerts rollup · Essentials hero · what changed ·
 *    alert strip · KPI grid · #dashcols
 *      left   chart (switchable series) · monthly trend · what is going on
 *             around you · operators · wells · every lease (tier-p)
 *      right  what we watched · reserves · neighbours & permits · provenance
 *
 * WHAT IS DELIBERATELY DIFFERENT FROM v1, and only this:
 *
 * 1. "What is going on around you" now reads the ACTIVITY FEED. In v1 that card
 *    showed the value model's own price deck, which is not what is going on
 *    around you — it is the price path the estimate runs on. The deck moved to
 *    its own card underneath, correctly labelled, and this card carries the
 *    permits, completions and status changes filed near the acreage.
 *
 * 2. The affordance says what it opens. v1 printed "explain →" on every cell.
 *
 * 3. The neighbours card carries the feed's own filings, not just ring counts.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import type { Payload } from '../../_lib/reference/payload';
import { usePortalMember } from '../portal-session';
import {
  n0, n1, usd, usdShort, usdScaled, pctS, vol, volWords, plural, productWord, interest, nShort,
  MCF, BBL,
} from '../../_lib/reference/fmt';
import type { Tier } from './bits';
import { Pager, ProductPair, usePaged } from './bits';
import { Essentials, ProdCols, Wells, ValueMix } from './panels';
import { Maturity } from './maturity';
import { Charts } from './LineChart';
import { productCharts } from '../../_lib/reference/chart';
import type { FunnelKey, Route } from './Portal';

export interface ViewProps {
  p: Payload;
  tier: Tier;
  funnel: FunnelKey;
  sample: boolean;
  open: (key: string) => void;
  go: (r: Route, params?: Record<string, string | null>) => void;
}

/** the dashboard also drives the plan card, so it needs the two funnel props */
export interface DashProps extends ViewProps {
  /**
   * Re-read this member's payload and resolve once it is in state.
   *
   * Supplied by `Portal`, which owns the payload. The switch flow AWAITS it —
   * see `applySwitch` for why a resolvable request replaced `router.refresh()`.
   */
  reloadActiveOwner: () => Promise<boolean>;
  trialStarted: string | null;
  setFunnel: (f: FunnelKey) => void;
}

/* the switchable lease chart, exactly v1's set */
type SeriesKey = 'value' | 'gas' | 'oil' | 'appraised' | 'reserves';
interface SeriesDef {
  key: keyof Payload['leases'][number];
  fmt: (v: number) => string;
  cls: string; name: string; title: string; note: string;
}

export default function Dashboard(
  /* `trialStarted` and `setFunnel` are still part of `DashProps` — `Portal`
     passes them and the plan card used to read them. They are accepted and
     not destructured so the shell's call site is unchanged and the props stay
     available the moment anything on this page needs the trial stamp again. */
  { p, tier, funnel, sample, open, go, reloadActiveOwner }: DashProps,
) {
  const t = p.totals;
  const a = p.as_of;
  const al = p.alerts;
  const [series, setSeries] = useState<SeriesKey>('value');

  const unclaimed = funnel === 'unclaimed';
  const pw = productWord(t.has_gas, t.has_oil);
  /* WHO IS READING, for the greeting. The context is filled on the SERVER in
     the group's layout from the httpOnly `mv_user` cookie, so the name is in
     the first HTML and no signed-in identity is ever requested from the
     browser. `null` when nobody is signed in, which `greetLine` handles. */
  const member = usePortalMember();
  const top = al.items[0] ?? null;

  /**
   * SWITCHING TO ANOTHER RECORD — the loader, and nothing else about the page.
   *
   * WHAT STAYS ON SCREEN IS THE PREVIOUS OWNER'S PAGE. Nothing below is
   * unmounted, hidden or blanked while the new record is read: a page that
   * empties itself the moment a control is pressed reads as if the control
   * broke it, and for the length of the request there is nothing better to put
   * there. The reader keeps what they were looking at, under a loader that
   * says what is happening.
   *
   * AND THE NEW OWNER'S DATA IS NOT BOUND UNTIL IT ARRIVES — which is the same
   * statement from the other side. `p` is still the previous record for the
   * whole of the wait, so every figure below is still that record's; the swap
   * happens in one render when the refresh lands.
   *
   * THE TRANSITION IS OWNED HERE rather than in `OwnerSwitch` because this is
   * the component that survives the swap and renders the loader; the panel
   * below only reports what the reader pressed.
   */
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);
  const switching = switchingTo !== null;

  /* WHERE THE LOADER IS PORTALLED — see the overlay below for why it cannot
     render in place.
     LOOKED UP IN THE EVENT, AND HELD AS STATE. The server has no `document`,
     so it cannot be resolved during render; an effect that set it tripped
     `set-state-in-effect`; and a ref cannot be READ during render at all. A
     `setState` from an event handler is none of those things. */
  const [shellRoot, setShellRoot] = useState<HTMLElement | null>(null);

  /* Pressed: the loader goes up before the request leaves, so the wait the
     reader sees is the whole wait rather than only the render after it. */
  const beginSwitch = useCallback((ownername: string) => {
    setShellRoot(document.querySelector<HTMLElement>('.mv-ref-app'));
    setSwitchingTo(ownername);
  }, []);
  const cancelSwitch = useCallback(() => setSwitchingTo(null), []);

  /**
   * THE WAIT ENDS WHEN THE DATA LANDS — not when a transition says so.
   *
   * THE DEFECT THIS REPLACES. This used to be
   * `startTransition(() => router.refresh())`, with the loader keyed on the
   * transition's `isPending`. `router.refresh()` returns void, so `isPending`
   * tracks React's own render and not the round trip behind it: on a large
   * record it settled seconds before the new payload arrived. The loader came
   * down over the PREVIOUS owner's figures, which then sat there — measured at
   * ten to eleven seconds on a 100+ lease record — until the refresh finally
   * delivered and the page changed under the reader with no warning.
   *
   * `reloadActiveOwner()` RESOLVES WHEN THE PAYLOAD IS IN STATE, so the wait
   * is the real wait. Clearing `switchingTo` immediately after it means React
   * batches the new payload and the end of the loading state into ONE render:
   * the loader lifts and the new owner's dashboard is already underneath it.
   * There is no window in which one owner's figures are on screen without the
   * loader over them.
   *
   * NO TIMER UNDER IT. The previous version needed a failsafe because its
   * completion signal was a guess; an awaited request either resolves or
   * rejects, and both are handled here.
   */
  const applySwitch = useCallback(async () => {
    try {
      await reloadActiveOwner();
    } finally {
      setSwitchingTo(null);
    }
  }, [reloadActiveOwner]);

  /**
   * A BELT-AND-BRACES CLEAR, if the record changes by any other route.
   *
   * ADJUSTED DURING RENDER, NOT IN AN EFFECT — React's own recommendation for
   * "reset state when a prop changes": React re-runs this component with the
   * new state before anything is painted, so the loader and the new record
   * never both reach the screen. In an effect it would paint the loader once
   * OVER the new data and then remove it, which is a visible flash and what
   * the `set-state-in-effect` rule warns about.
   */
  const [shownOwner, setShownOwner] = useState(p.owner.ownername);
  if (shownOwner !== p.owner.ownername) {
    setShownOwner(p.owner.ownername);
    setSwitchingTo(null);
  }

  /* See the greeting's own note below: the string is held in state so the
     reader's clock can replace the server's after mount. */
  const [greet, setGreet] = useState(() => greetLine(p, member?.firstName));
  useEffect(() => {
    setGreet(greetLine(p, member?.firstName));
  }, [p, member?.firstName]);

  /* ---------------------------------------------- EACH FINDING, SHOWN ONCE.
   *
   * THREE BLOCKS ON THIS PAGE WERE DRAWING THE SAME ALERTS. The rollup prints
   * the top finding as a sentence; "What changed" printed `items[0..4]`, which
   * begins with that same finding; and the alert strip printed `items[0..]`,
   * which begins with all five of those. So the reader met finding #1 three
   * times and findings #2-#5 twice, on one screen — the defect sheet's rows 6,
   * 37 and 53, filed separately because they look different at each tier.
   *
   * THE FIX IS A PARTITION, NOT A DELETION. The rollup keeps the top finding,
   * "What changed" takes the next five, and the strip takes whatever is left.
   * Every finding the payload carries is still on the page, still opens its own
   * drawer, and now appears exactly once. A portfolio with a single finding
   * simply leaves the two lower blocks empty, and each is already gated on its
   * own list being non-empty.
   *
   * `TOP_IN_ROLLUP` is 1 because that is how many the rollup prints — it is
   * derived from the block above rather than written twice, so changing the
   * rollup cannot silently reintroduce the overlap. */
  const TOP_IN_ROLLUP = top ? 1 : 0;
  const CHANGED_ROWS = 5;
  const changedItems = al.items.slice(TOP_IN_ROLLUP, TOP_IN_ROLLUP + CHANGED_ROWS);
  const stripItems = al.items.slice(TOP_IN_ROLLUP + changedItems.length);

  return (
    /* `.active` is REQUIRED, not decorative: the prototype ships
       `section[data-route]{display:none}` and only `section[data-route].active`
       is shown. Without it the whole dashboard renders into a hidden element
       and the page comes up empty below the pinned bar. */
    <section data-route="app" id="routeApp" className="active">
      {/* `.mv-loader` IS THE SHELL THIS APP ALREADY LOADS BEHIND — fixed,
          full-page, centred over a scrim (`dashboard-reference.css:1006`), with
          `.mv-load-mark`'s three-dot spinner in its card. Reused rather than
          re-drawn so a wait looks the same wherever the reader meets one. It
          does NOT carry the owner-read loader's progress bar, elapsed timer and
          roll-scan footnote: this wait is short, and the message is the whole
          of what there is to say. */}
      {/* PORTALLED TO THE BODY, AND IT HAS TO BE.

          `.mv-loader` is `position: fixed; inset: 0`, which is measured against
          the VIEWPORT only while no ancestor establishes a containing block.
          The route section around this one does: `section[data-route].active`
          carries a `transform` for its enter animation, and a transformed
          ancestor becomes the containing block for every fixed descendant.
          Rendered in place the overlay sized itself to the section — measured
          1114x5110 at a 1440x900 viewport, so the card sat two thousand pixels
          down the page instead of in the middle of the screen.

          This is why the shell's own `Loader` centres correctly and this one
          did not: `Portal` renders it OUTSIDE the section. A portal puts this
          one in the same place without moving the component that owns it.

          THE TARGET IS THE SHELL ROOT, NOT `document.body`. Every rule in these
          sheets is scoped under `.mv-ref-app` — that is how the reference's
          stylesheets are kept off the rest of the site — so an overlay in the
          body would be unstyled markup. `.mv-ref-app` is the element `Portal`
          renders its own loader inside, it is not transformed, and there is
          exactly one of it. */}
      {switching && shellRoot
        ? createPortal(
          <div className="mv-loader mv-loader-switch" role="status" aria-live="polite">
            <div className="mv-loader-card">
              {/* A SPINNER, NOT `.mv-load-mark`'s three bouncing dots — and it
                  is its own element rather than a restyling of that one,
                  because the dots belong to the owner-read loader and must
                  keep working there. */}
              <span className="mv-spin" aria-hidden="true" />
              <h3>Loading…</h3>
            </div>
          </div>,
          shellRoot,
        )
        : null}

      {/* ---------- the plan card: REMOVED, because the chrome already says it.
           `StateCard` and `FunnelBar` render for the SAME three funnel states —
           claimed, trial, lapsed — and say the same thing in the same words:
           the same headline, the same "what Premium adds" paragraph, the same
           primary button. The bar is sticky chrome directly above this element,
           so on every one of those three states the reader met the message
           twice, one line apart. Defect sheet rows 15, 33, 37 and 53 are all
           that duplication seen from different tiers.

           THE BAR IS THE ONE THAT STAYS, not this card, for two reasons: it is
           visible from every scroll position rather than only at the top, and
           it belongs to `Chrome`, so the Weekly Report and the Map keep the
           same message without the Dashboard having to render its own copy.

           NOTHING IS LOST. The card's primary CTA is the bar's CTA. Its one
           unique control was a ghost link to Activities or Alerts — and both
           routes are already reachable from this page: the alerts rollup below
           carries "Open all alerts →" and "What's going on around you" carries
           "See all N filings →". The component itself is untouched in
           `funnel.tsx`; only this call site is gone. */}

      {/* ---------- ULTRA: one headline, one status, one action ---------- */}
      {tier === 'ultra' ? <UltraHero p={p} funnel={funnel} open={open} /> : null}


      {/* ---------- SAMPLE PREVIEW: UNCLAIMED only ----------

           ONE BANNER, AND THE PAGE BELOW IT IS THE PAID PAGE. This replaced a
           claim rail whose own headline, sub-copy, CTA and two-swatch legend
           re-arranged the top of the dashboard, so the state a visitor is
           being shown looked like a different product rather than like the
           thing they get by claiming — which is the one job this state has.
           The rail's facts are not lost: the lease count, the counties and the
           appraised figure are all on the greeting line and the strip
           immediately below, and the sidebar carries "Claim Mineral Owner"
           throughout this state.

           `.smp-badge` / `.smp-tag` ARE THE EXISTING PAIR, not new styling —
           the amber dashed box at `dashboard-reference.css:387`, its pill at
           388 and its paragraph at 389. The same markup already carries this
           message on My Leases and on the Weekly Report, so the sample state
           reads identically wherever a visitor meets it.

           TWO LINES, AND THE SENTENCE RUNS THE FULL WIDTH. The shared rule is
           a `flex` row, so the pill took a column and the copy wrapped in what
           was left of it — five short lines in a box as wide as the page. The
           column direction is set HERE, inline on this one banner, and not in
           `.smp-badge`: that class is also My Leases' and the Weekly Report's,
           and re-flowing their banners is not this change. The copy is cut to
           the two facts a reader needs before they look at a figure — whose
           record this is, and that the amounts are not real. The roll year,
           the filing month and the model run date left with it; all three are
           already printed on the strip and the cards below. */}
      {unclaimed
        ? (
          <div
            className="smp-badge" id="sampleBadge"
            style={{ flexDirection: 'column', alignItems: 'stretch', flexWrap: 'nowrap', gap: 6 }}
          >
            <span className="smp-tag" style={{ alignSelf: 'flex-start' }}>SAMPLE PREVIEW</span>
            {/* `stretch` on the box and `flex-start` on the pill, rather than a
                width on this paragraph. The shared rule grows it along a ROW
                (`flex: 1`); turned into a column that sizes it to its content
                instead — 615px of a 1114px box — and a percentage width did
                not fix it, because the shared `flex-wrap: wrap` puts a
                column-direction item on a flex line whose cross size is its
                own. Stretching the line is what actually widens it, and the
                pill opts out so it keeps hugging its label.

                `maxWidth: none` LIFTS A DELIBERATE CAP, and only here. The
                reference measures this paragraph at `78ch`
                (`dashboard-reference.css`, the rule it shares with
                `.simple-hero > p`, `#mvStateCard` and `.act-empty p`) — a
                readability limit, not an oversight. At 13px that is 615px, so
                in a 1114px box the banner ran three short lines with half its
                width empty. The brief is two lines across the full width, and
                the copy above was cut to suit it. The cap is untouched for
                every other element that shares the rule. */}
            <p style={{ maxWidth: 'none' }}>
              <strong>This is what your dashboard looks like once you claim your record.</strong>{' '}
              Every figure below belongs to <strong>{p.owner.ownername}, a fictional sample
              owner</strong> — the dates are real, the amounts are illustrative. Claiming is
              free, takes about two minutes, and never changes legal ownership.
            </p>
          </div>
        )
        : null}

      {tier === 'ultra' ? null : (
        <>
          {/* ---------- greeting + page head ---------- */}
          <div className="mv-greet">
            <div>
              {/* THE VIEWER'S CLOCK, WITHOUT A HYDRATION MISMATCH.

                  `greetLine` reads `new Date()`, so the server renders the
                  greeting on the SERVER's clock and the browser re-renders it
                  on the reader's. Whenever the two straddle a noon, a 5pm or a
                  midnight the two strings differ and React throws #418,
                  "Hydration failed because the initial UI does not match what
                  was rendered on the server" — the defect sheet's row 45,
                  reported once per load.

                  BOTH HALVES ARE NEEDED. `suppressHydrationWarning` tells React
                  this one subtree is legitimately time-dependent, which stops
                  the error; on its own it also freezes the SERVER's wording on
                  screen, so a reader five time zones away would be wished good
                  morning at ten at night. The effect re-reads the clock after
                  mount and writes the reader's own greeting, and React bails
                  out of the re-render when the two agree — which is most
                  loads. Nothing flashes, and nothing is wrong. */}
              <p className="greet-line" suppressHydrationWarning>{greet}</p>
              {/* THE PAID HEADLINE, IN EVERY STATE. "Here is what your dashboard
                  becomes" was the unclaimed variant, and it described the page
                  instead of naming the record on it — the banner above now does
                  the describing, so this can go back to being the same sentence
                  a claimed owner reads. */}
              <h2 className="greet-head">
                Your minerals, through {a.data_month_label ?? 'the latest filing'}
              </h2>
              <p className="small muted" style={{ margin: '3px 0 0' }}>
                {t.lease_count} {plural(t.lease_count, 'lease')} · {t.producing_count} producing ·{' '}
                {t.reporting_count} filed for {a.data_month_label ?? '—'} ·{' '}
                {/* THE COUNTIES COLLAPSE TO A COUNT once there are more than
                    five of them. Twenty names is not a fact anyone reads — it
                    is a wall the eye skips, and it pushed this line to three
                    rows. The count OPENS, so the names are one click away on
                    every input — see `NameList`. */}
                <NameList
                  names={t.counties} max={MAX_COUNTY_NAMES}
                  one="county" many="counties"
                /> ·{' '}
                {t.operator_count} {plural(t.operator_count, 'operator')}
                {/* THE PLAYS COLLAPSE THE SAME WAY THE COUNTIES DO, and for the
                    same measured reason. Four play names — "EAGLE FORD SHALE,
                    GRANITE WASH, HAYNESVILLE/BOSSIER SHALE, PERMIAN BASIN" — is
                    118 characters at the end of a line that already carries six
                    facts, and it pushed this subhead onto a third row. */}
                {t.plays.length
                  ? (
                    <>
                      {' · '}
                      <NameList names={t.plays} max={MAX_PLAY_NAMES} one="play" many="plays" />
                    </>
                  )
                  : null}
              </p>
            </div>
            {/* ADAPTED · the reference says "Owner:"; this build says
                "Mineral Owner:", which is the term the rest of this app uses
                for the same thing — the sidebar heading, the owner search and
                the claim flow all say mineral owner.

                THE CITY AND "HOW WE MATCHED THIS" LEFT THIS CHIP. The city was
                a second, quieter answer to the question the name already
                answers, and the identity drawer it sat beside is still one
                click away from the account menu ("How this record was
                identified") and from the "what was matched →" hint in the
                sources card. What the chip lacked was the thing an account
                with more than one claimed record actually needs: a way to see
                which of them is filling the page. */}
            <OwnerSwitch
              p={p}
              unclaimed={unclaimed}
              onSwitchBegin={beginSwitch}
              onSwitchApply={applySwitch}
              onSwitchCancel={cancelSwitch}
            />
          </div>

          {/* the sample badge moved to the top of the page — see SAMPLE
              PREVIEW above, which is the only place this state announces
              itself now. */}

          {/* ---------- pf-strip: the numbers that change ---------- */}
          <PfStrip p={p} sample={sample} open={open} />

          {/* ---------- alerts rollup ---------- */}
          {al.count
            ? (
              <div className="mv-alsum" id="dashAlSum">
                <div className="as-top">
                  <div style={{ minWidth: 0 }}>
                    {/* THE SAMPLE MARKER IS NOT PLACED HERE ANY MORE. It belongs
                        beside EVERY card title on the not-claimed page, not
                        just this one, so it is drawn from a single rule in
                        `dashboard-reference.css` keyed on `.no-claim` — see
                        "the sample marker" there. Hand-placing it per card
                        meant fourteen edits and a fifteenth card that quietly
                        went unmarked. */}
                    <span className="as-kicker">What moved — the short version</span>
                    <span className="as-line">
                      <strong className="as-count num">{al.count}</strong>{' '}
                      {plural(al.count, 'finding')} {al.window_label} — {al.window_note}
                      {al.action_count
                        ? <> · <strong>{al.action_count} {al.action_count === 1 ? 'asks' : 'ask'} something of you</strong></>
                        : null}
                      {al.important_count ? ` · ${al.important_count} important` : ''}
                      {al.context_count ? ` · ${al.context_count} for context` : ''}
                    </span>
                  </div>
                  <button className="btn btn-ghost btn-sm" type="button" onClick={() => go('alerts')}>
                    Open all alerts →
                  </button>
                </div>
                <div className="as-cats">
                  {(Object.keys(al.counts) as (keyof typeof al.counts)[])
                    .filter((k) => k !== 'all' && al.counts[k])
                    .map((k) => (
                      /* THE CHIP CARRIES ITS CATEGORY TO THE ALERTS PAGE.
                         Every one of these called a bare `go('alerts')`, so
                         "2 Money" landed on the unfiltered list with "All · 9"
                         active and the reader had to find the Money filter
                         again — the two counts on screen disagreed the moment
                         they arrived. The category rides in the query string,
                         which is where `AlertsView` already looks for it. */
                      <button
                        key={k} className={'as-cat' + (k === 'money' ? ' as-act' : '')}
                        type="button" onClick={() => go('alerts', { cat: k })}
                      >
                        <b>{al.counts[k]}</b> {CAT_NAME[k] ?? k}
                      </button>
                    ))}
                </div>
                {top
                  ? (
                    <p className="as-top">
                      {top.severity === 'action' ? <span className="as-act-tag">NEEDS YOU</span> : null}
                      <strong>{top.title}</strong> — {top.body}
                    </p>
                  )
                  : null}
              </div>
            )
            : null}

          {/* ---------- ESSENTIALS hero ---------- */}
          {tier === 'simple'
            ? (
              <div className="card card-pad simple-hero" style={{ margin: '14px 0' }}>
                <h3 style={{ marginBottom: 6 }}>Your minerals, in one line</h3>
                {/* THE PORTFOLIO LINE, NOT THE TOP ALERT.

                    This printed `top.title — top.body`, which is word for word
                    what the rollup directly above it prints. At Essentials the
                    two sat one card apart, so the page's first two blocks said
                    the same sentence twice (defect sheet row 53). The branch
                    below was already written — it was the fallback for an
                    account with no findings — and it is the sentence this card
                    is actually titled for: what the portfolio filed, in one
                    line. The finding is not lost; it is in the rollup above and
                    the button below still opens it. */}
                <p style={{ fontSize: 16, margin: '0 0 10px' }}>
                  <strong>
                    {t.reporting_count} of your {t.lease_count} {plural(t.lease_count, 'lease')}{' '}
                    filed {pw} in {a.data_month_label}
                  </strong>{' '}
                  — {volWords(t.anchor_gas_net, t.anchor_oil_net)} to you.
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-primary btn-sm" type="button"
                    onClick={() => open(top ? topKey(top) : 'value')}
                  >
                    {top ? 'Expand' : 'How your value is built'}
                  </button>
                  <button className="btn btn-ghost btn-sm" type="button" onClick={() => go('activities')}>
                    What happened around you
                  </button>
                </div>
              </div>
            )
            : null}

          {/* ---------- ESSENTIALS: the plain-English read ---------- */}
          {tier === 'simple'
            ? <Essentials p={p} sample={sample} open={open} go={go} />
            : null}

          {/* ---------- what changed ---------- */}
          {changedItems.length && tier !== 'simple'
            ? (
              <div
                className="card card-pad" id="changedCard"
                style={{ margin: '12px 0', borderLeft: '4px solid var(--green)' }}
              >
                <div className="between" style={{ flexWrap: 'wrap' }}>
                  <h4>
                    <svg className="mvi-inline" aria-hidden="true"><use href="#mvi-activity" /></svg>{' '}
                    What changed {al.window_label}
                  </h4>
                  <span className="small muted">{al.window_note}</span>
                </div>
                <ul className="timeline" style={{ marginTop: 10 }}>
                  {/* `changedItems`, not `al.items.slice(0, 5)` — see the
                      partition where it is built. */}
                  {changedItems.map((it) => (
                    <li
                      key={it.id} role="button" tabIndex={0}
                      onClick={() => open('alert:' + it.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter') open('alert:' + it.id); }}
                    >
                      <strong>{it.title}</strong>
                      <span className="sub tiny muted">{it.body}</span>
                      <span className="sub tiny">
                        {[it.lead_lease, it.event_label].filter(Boolean).join(' · ')}{' '}
                        <span className="ctx-hint">expand →</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )
            : null}

          {/* ---------- the alert strip ---------- */}
          {(tier === 'detailed' || tier === 'pro') && stripItems.length
            ? (
              <div className="al-strip" id="alStrip">
                {/* `stripItems`, not `al.items` — see the partition above. The
                    strip used to repeat the five "What changed" rows verbatim
                    immediately under them. */}
                {stripItems.map((it) => (
                  <button
                    key={it.id} type="button"
                    className={'al-mini' + (it.severity === 'action' ? ' gold' : '')}
                    onClick={() => open('alert:' + it.id)}
                  >
                    <span className="al-k">{GLYPH[it.category] ?? '▤'} {it.title}</span>
                    <span className="al-s">
                      {[it.lead_lease, it.event_label, metricText(it)].filter(Boolean).join(' · ')}{' '}
                      <span className="ctx-hint">expand →</span>
                    </span>
                  </button>
                ))}
              </div>
            )
            : null}

          {/* ---------- KPI grid ---------- */}
          {tier === 'detailed' || tier === 'pro'
            ? <KpiGrid p={p} sample={sample} funnel={funnel} open={open} />
            : null}

          {/* ---------- two columns ---------- */}
          {tier === 'detailed' || tier === 'pro'
            ? (
              <div
                className="grid" id="dashcols"
                style={{ gridTemplateColumns: 'minmax(0,1.42fr) minmax(0,1fr)', gap: 18 }}
              >
                {/* =============================================== LEFT */}
                {/* BALANCE IS BY CONTENT, NOT BY CSS.
                    The rails are measured: with the price deck on the left and
                    the Pro lease table under it, the left ran 3291px against
                    the right's 2745 — a 17% gap, which is the empty rectangle
                    at the bottom of the shorter rail. The price deck is
                    reference material like everything in the right rail, so it
                    moved there, and Maturity (a read nothing was showing) came
                    in on the left. */}
                <div className="stack">
                  <LeaseChart p={p} series={series} setSeries={setSeries} open={open} />
                  <ProdSeries p={p} />
                  <AroundYou p={p} tier={tier} open={open} go={go} />
                  <Maturity p={p} open={open} />
                  {/* OPERATORS CROSSES TO THE RIGHT AT DETAILED, and only there.
                      Shedding the three reference panels left that rail 1,847px
                      against this one's 2,930 -- a 37% gap, which is the empty
                      rectangle the balancing note above was written about, just
                      on the other side. This card is 563px, which is almost
                      exactly the difference; measured after the move, 2,367
                      against 2,410, a 2% gap. Pro keeps it here, where its own
                      rails are already balanced by the lease table. */}
                  {tier === 'pro' ? <Operators p={p} open={open} /> : null}
                  {/* The price deck now sits on the right in BOTH tiers. It
                      used to cross to the left at Detailed, to fill a right
                      rail that ran short — but Detailed has since given up the
                      three reference panels below, so the right rail is the
                      short one in both tiers and the deck belongs on it in
                      both. One rule instead of a swap. */}
                  {tier === 'pro' ? <RawTable p={p} open={open} /> : null}
                </div>

                {/* ============================================== RIGHT */}
                {/* Six panels, not four. The rail ran out of content well
                    above the left one and left a rectangle of empty page at the
                    bottom; Wells and ValueMix are both reads already in the
                    payload that nothing was showing. */}
                {/* DETAILED IS NO LONGER PRO MINUS ONE TABLE.

                    The two tiers differed by the every-lease table and by
                    which rail held the price deck — thirteen cards against
                    fourteen, in the same order, so a reader switching between
                    them saw the same page twice and the control looked broken.

                    THE CUT IS THE CONTRACT'S OWN WORDING. Detailed is "key
                    numbers plus context and drill-downs"; Professional is
                    "full tables, maximum density, exports"
                    (`_lib/portal-state.ts`). The three panels below are the
                    reference material on this page — a permit register, a well
                    register and the source table — and each is a list to look
                    something up in rather than a number to read. They are what
                    "full tables" means, so they are what Pro keeps.

                    NOTHING IS LOST AT DETAILED. Neighbours is the same ring the
                    "Permits within 1 mile" KPI counts and its drawer explains;
                    Wells is the well list the map and each lease's own drawer
                    carry; Provenance is the freshness table whose one live
                    figure — the read date — is already in the greeting. Every
                    one of them is a click away, and Pro is one click away too.

                    PRO IS UNTOUCHED: same seven panels, same order. */}
                <div className="stack">
                  <Watched p={p} open={open} />
                  <PriceDeck p={p} open={open} />
                  <Reserves p={p} open={open} />
                  {tier === 'pro' ? null : <Operators p={p} open={open} />}
                  {tier === 'pro' ? <Neighbors p={p} open={open} go={go} /> : null}
                  {tier === 'pro' ? <Wells p={p} open={open} /> : null}
                  <ValueMix p={p} open={open} />
                  {tier === 'pro' ? <Provenance p={p} open={open} /> : null}
                </div>
              </div>
            )
            : null}
        </>
      )}
    </section>
  );
}

/* ============================================================ ultra hero */
function UltraHero(
  { p, funnel, open }: { p: Payload; funnel: FunnelKey; open: (k: string) => void },
) {
  const t = p.totals;
  const a = p.as_of;
  const top = p.alerts.items[0] ?? null;
  const unclaimed = funnel === 'unclaimed';

  return (
    /* `.tier-u` is what the prototype's density rule keeps visible in
       view-ultra; `.nc-keep` is what keeps it visible in no-claim, where bare
       .tier-u blocks are hidden. Both are load-bearing. */
    <div className="ultra-hero tier-u nc-keep" id="ultraHero">
      <div className="u-kicker">
        {unclaimed ? 'Your record is on file' : `Your minerals · ${a.data_month_label ?? ''}`}
      </div>
      <h1 className={'u-headline' + (unclaimed ? '' : ' cl-lock')}>
        {unclaimed
          ? `${t.lease_count} ${plural(t.lease_count, 'lease')} are yours to claim`
          : usd(t.owner_value)}
      </h1>
      <p className="u-status">
        {unclaimed
          ? `Appraised at ${usdScaled(t.appraised_value)} on the ${t.appraised_year} roll. Claiming is free.`
          : `Your share across ${t.lease_count} ${plural(t.lease_count, 'lease')}. ` +
            `${t.reporting_count} filed ${productWord(t.has_gas, t.has_oil)} in ${a.data_month_label} — ` +
            `${volWords(t.anchor_gas_net, t.anchor_oil_net)} to you.`}
      </p>
      {/* WHAT CHANGED, INSIDE THE HERO — the Alerts route's own Ultra, which
          is the design this tier is supposed to share.

          A FIRST PASS PUT THIS UNDER THE CARD as a row of alert chips and a
          count line. That was wrong twice over: Ultra is ONE card on an empty
          page — dot, kicker, headline, status, button, note, and nothing else
          — so a second block below it reads as the Detailed layout starting,
          and it also invented a layout the portal does not have. `AlertsView`
          already solved this: it keeps the single hero and writes the finding
          into `u-status` as a sentence. Same thing here, in the same slot,
          with the same classes.

          IT REPLACES NOTHING. The line above is the money and the volumes;
          this one is what moved. Together they are the two questions this page
          answers, which is what Ultra was missing when it answered only the
          first. */}
      {/* THE TWO VOLUMES, AS FIGURES — the third and fourth things this page
          knows, after the estimate above and before anything else.

          THE LADDER, STATED: Ultra is the estimate, the two volumes and the
          finding; Essentials adds the five plain-English cards; Detailed adds
          the KPIs, the charts and the rails; Pro adds the registers and the
          table. Ultra was carrying the volumes already, but inside the
          sentence above — "247,404 MCF of gas and 50 barrels of oil to you" —
          where they read as grammar rather than as numbers. The same two
          fields, given the weight the estimate has.

          A STRICT SUBSET OF THE STRIP, deliberately: `anchor_gas_net` and
          `anchor_oil_net` are the same fields the "Gas filed" and "Oil filed"
          cells read at every other tier, with the same "none" when a product
          was never filed, so a figure learned here is the figure met again one
          tier down.

          NOT CONTROLS. Every other tier makes these tiles open a drawer;
          Ultra's whole contract is one action, and that is the button below. */}
      {!unclaimed && (t.has_gas || t.has_oil)
        ? (
          <div className="u-figs">
            <div className="u-fig">
              <span className="u-fig-k">Gas filed in {a.data_month_label ?? '—'}</span>
              <span className="u-fig-v num">
                {t.has_gas
                  ? <>{n0(t.anchor_gas_net)} <span className="u-fig-u">{MCF}</span></>
                  : <span className="nodata">none</span>}
              </span>
            </div>
            <div className="u-fig">
              <span className="u-fig-k">Oil filed in {a.data_month_label ?? '—'}</span>
              <span className="u-fig-v num">
                {t.has_oil
                  ? <>{n0(t.anchor_oil_net)} <span className="u-fig-u">{BBL}</span></>
                  : <span className="nodata">none</span>}
              </span>
            </div>
          </div>
        )
        : null}

      {!unclaimed && top
        ? (
          <p className="u-status">
            <strong>{p.alerts.count} {plural(p.alerts.count, 'finding')}</strong>{' '}
            {p.alerts.window_label}
            {p.alerts.action_count
              ? <> · <strong>{p.alerts.action_count}{' '}
                {p.alerts.action_count === 1 ? 'asks' : 'ask'} something of you</strong></>
              : null}
            . {top.title}.
          </p>
        )
        : null}
      <div>
        <button
          className="btn btn-primary btn-lg" type="button"
          onClick={() => open(top ? topKey(top) : 'value')}
        >
          {unclaimed ? 'What is on the record' : top ? 'See what changed' : 'See the details'}
        </button>
      </div>
      <p className="u-note">
        Estimate, not an appraisal · re-run {a.estimate_run_label} ·{' '}
        {productWord(t.has_gas, t.has_oil)} through {a.data_month_label}
      </p>
    </div>
  );
}

/* ============================================================= pf-strip */
function PfStrip(
  { p, sample, open }: { p: Payload; sample: boolean; open: (k: string) => void },
) {
  const t = p.totals;
  const a = p.as_of;

  /* LAKHS ARE GONE FROM THIS STRIP, and that is the fix for two defects at once.
   *
   * WHAT IT DID. `formatLakhs` re-expressed the already-formatted figure in
   * lakhs — so "$3,178,463,600" was printed as "$31784636 L" and "22,511,490
   * MCF" as "22511.49 L MCF". Three things were wrong with that on this page:
   *
   *   1  IT DROPPED THE GROUPING. The helper divides and calls `toFixed`, which
   *      returns a bare decimal, so the largest figure on the dashboard came
   *      out as an unbroken run of digits. That is the defect sheet's row 8,
   *      "need proper commas".
   *
   *   2  IT PUT A CURRENCY SUFFIX ON A VOLUME. A lakh is a grouping for a
   *      COUNT; "22511.49 L MCF" reads as a unit that does not exist. That is
   *      row 21's "stray 'L' unit".
   *
   *   3  IT WAS APPLIED TO TWO FIGURES OUT OF FORTY. Only the strip's headline
   *      values went through it — every sub-line, chart, drawer, lease row and
   *      the pinned bar beside them stayed in US grouping. So one cell read
   *      "$31784636 L" directly above its own sub-line reading "your share of
   *      $15150.42B", which is the "internally inconsistent by 1000x" in row
   *      21: the reader is asked to hold two scales for one quantity.
   *
   * WHY REMOVING IT IS THE ROOT-CAUSE FIX AND NOT A PREFERENCE. `fmt.ts` opens
   * by pinning every formatter to `en-US` and names this exact failure as the
   * reason: "on an Indian-locale machine $4,548,479 rendered as $45,48,479 —
   * the lakh grouping. The figures here are US oil-and-gas records quoted in
   * dollars, mcf and barrels; the grouping belongs to the data, not to the
   * reader's operating system." The lakh pass reintroduced by hand what that
   * module exists to prevent. `format-lakhs.ts` itself is untouched and still
   * exported, so anything that genuinely wants lakhs can still ask for them.
   */

  const cells: React.ReactNode[] = [];
  const cell = (
    label: string, val: React.ReactNode, sub: React.ReactNode,
    ctx: string, hint: string, big?: string,
  ) => (
    <div
      className="pf-cell" key={label} role="button" tabIndex={0}
      onClick={() => open(ctx)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(ctx); } }}
    >
      <div className="pf-label">{label}</div>
      <div className={'pf-val num ' + (big ?? '')}>{val}</div>
      <div className="pf-sub">{sub} <span className="ctx-hint">{hint} →</span></div>
    </div>
  );

  /* `.cl-lock` is the prototype's own money gate: it blurs in state-claimed and
     state-lapsed and is untouched in trial and paid. Only the VALUE figures carry
     it — a claimed owner keeps every lease, volume and permit, because they
     claimed them. What Premium adds is what they are worth. */
  cells.push(cell('Your value', usd(t.owner_value),
    <>your share of {usdShort(t.gross_value)} · range {usdShort(t.owner_value_low)}–{usdShort(t.owner_value_high)}</>,
    'value', 'How it is built', 'big cl-lock'));

  /* BOTH PRODUCTS, ALWAYS. These two cells were each conditional on the
     portfolio having that product, so a gas-only owner saw one figure with
     nothing to say whether oil was absent from the record or merely absent
     from the strip — and those are different facts. The missing one now names
     itself, and points at the reserves, where oil can exist even when no
     barrel has ever been filed. */
  if (t.has_gas || t.has_oil) {
    cells.push(cell(`Gas filed in ${a.data_month_label ?? '—'}`,
      t.has_gas
        ? <>{n0(t.anchor_gas_net)}<span className="pf-val-s"> {MCF}</span></>
        : <span className="nodata">none</span>,
      t.has_gas
        ? (t.gas_change_pct == null
          ? 'no earlier filed month to compare'
          : `${pctS(t.gas_change_pct)} against ${a.prev_month_label}`)
        : (t.reserves_gas_net > 0
          ? `no gas has ever been filed — the model still forecasts ${nShort(t.reserves_gas_net)} ${MCF}`
          : 'no gas has ever been filed on these leases'),
      'production', 'Why not a cheque'));

    /* "WHY NOT A CHEQUE", NOT "WHY THIS IS NOT A CHEQUE".

       Same question, eight characters shorter, and the shorter one is what
       fits. These two cells carried the longest affordance label in the strip
       by a wide margin — 24 characters against "What paused means" at 17,
       "How it is built" at 15 and "Why it differs" at 14 — and the pill drew
       past its own tile and over the divider into the cell beside it. The
       chip is on its own line inside a tile that is 220px of content at the
       width the strip runs five across, and the label has to fit that at
       whatever width the reader's own font renders it; the four siblings do,
       and this one did not.

       NOTHING IS LOST FROM THE QUESTION. The subject is the figure directly
       above the label — the volume filed that month — so "this" was pointing
       at something already on screen and in the reader's eye. The panel it
       opens is unchanged, and it is the panel that answers at length: a state
       filing is a production fact, not a payment. */
    /* THE FIGURE IS THE FIX HERE, not the wording. This cell read
       "no oil has ever been filed" for a record holding 1.9M barrels of it,
       because the volume was being taken from a column the state leaves empty
       on a gas lease. `rules.liquid` reads whichever column it was filed in;
       the label is just "Oil", which is what an owner's statement calls it. */
    cells.push(cell(`Oil filed in ${a.data_month_label ?? '—'}`,
      t.has_oil
        ? <>{n0(t.anchor_oil_net)}<span className="pf-val-s"> {BBL}</span></>
        : <span className="nodata">none</span>,
      t.has_oil
        ? (t.oil_change_pct == null
          ? 'no earlier filed month to compare'
          : `${pctS(t.oil_change_pct)} against ${a.prev_month_label}`)
        : (t.reserves_oil_net > 0
          ? `nothing filed that month — the model forecasts `
            + `${nShort(t.reserves_oil_net)} ${BBL} ahead`
          : 'no oil on the record for that month'),
      'production', 'Why not a cheque'));
  }
  if (!t.has_gas && !t.has_oil) {
    cells.push(cell(`Filed in ${a.data_month_label ?? '—'}`,
      <span className="nodata">nothing filed</span>,
      'no volume on the record for that month', 'production', 'What that means'));
  }

  /* "ALL 794 LEASES" WAS A CLAIM THE ROLL DOES NOT MAKE.
     This cell said "roll year 2025 · all 794 leases" while the panel it opens
     headed its own KPI "LEASES ON THE ROLL — 703": the appraisal roll is a
     county document and it does not carry a row for every lease the owner
     holds. Defect sheet row 35, where the same figure appears three ways in
     one view. `owner.roll_rows` is the count of rows the roll actually
     returned for this owner, so the cell quotes that and says what it is a
     count OF; when the roll does cover everything the two are equal and the
     sentence goes back to being the one that was there. */
  const rollRows = num(p.owner.roll_rows);
  /* `usdScaled`, NOT `usd` — this one tile and the four other places the same
     figure appears. See `usdScaled` in `fmt.ts`: the appraisal roll covers the
     whole lease at 100%, so it is the longest figure on the page and the only
     one that does not fit its tile. Nothing else in this strip changes. */
  cells.push(cell('County appraised', usdScaled(t.appraised_value),
    `roll year ${t.appraised_year} · `
    + (rollRows && rollRows !== t.lease_count
      ? `${n0(rollRows)} of your ${n0(t.lease_count)} ${plural(t.lease_count, 'lease')} on the roll`
      : `all ${t.lease_count} ${plural(t.lease_count, 'lease')}`),
    'appraised', 'Why it differs'));

  cells.push(cell('Producing',
    <>{t.producing_count}<span className="pf-val-s"> of {t.lease_count}</span></>,
    <>
      {t.behind_count
        ? `${t.reporting_count} filed ${a.data_month_label}, ${t.behind_count} still behind`
        : `all filed ${a.data_month_label}`}
      {' · '}{t.operator_names.slice(0, MAX_OPERATOR_NAMES).join(' · ')}
      {/* AND THE REST BEHIND ONE CONTROL. Fifty-seven names ran the cell down
          past the fold and stretched every tile in the strip to match. The
          overflow opens the `operators` explainer, which is not a new panel:
          it is the drawer this page already fetches for every payload, and it
          lists every operator with its lease count, its volume and its share
          of the value — more than the names ever said.

          `stopPropagation` on BOTH handlers. The tile around this is itself a
          `role="button"` that opens the `producing` drawer, so without it a
          click here opens the wrong panel, and Enter on the focused control
          opens both. */}
      {t.operator_names.length > MAX_OPERATOR_NAMES
        ? (
          <>
            {' · '}
            <button
              type="button" className="pf-more"
              onClick={(e) => { e.stopPropagation(); open('operators'); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') e.stopPropagation();
              }}
            >
              +{t.operator_names.length - MAX_OPERATOR_NAMES} more
            </button>
          </>
        )
        : null}
    </>,
    'producing', 'What paused means'));

  return (
    <div className="pf-strip" id="pfStrip">
      {/* NO SIXTH CELL WHILE SAMPLING. A cell reading "Sample / illustrative"
          sat in the strip beside the five figures, so the sample state laid
          out differently from the paid one — five cells became six, and every
          cell narrowed. The banner at the top of the page says the same thing
          once, and the strip keeps the amber ring `.no-claim` already puts
          round it (`dashboard-reference.css:1351`). */}
      {cells}
    </div>
  );
}

/* ============================================================= KPI grid */
function KpiGrid(
  { p, sample, funnel, open }:
  { p: Payload; sample: boolean; funnel: FunnelKey; open: (k: string) => void },
) {
  const t = p.totals;
  /**
   * THE UPSELL LINE IS MARKUP NOW, NOT A `::after`.
   *
   * `dashboard-reference.css` painted it with two absolutely-positioned
   * pseudo-elements pinned to `bottom: 6px` inside the tile. Two things were
   * wrong with that, and both are on the defect sheet:
   *
   *   · IT OVERLAPPED THE TILE'S OWN TEXT (row 38). An absolute box in a tile
   *     whose height is set by its content sits ON the last lines rather than
   *     after them, so "What it's worth unlocks with your free 7-day trial"
   *     printed across "your interest applied to the six-year projection" and
   *     the freshness stamp below it.
   *
   *   · THE LAPSED ONE HARDCODED A LEASE COUNT. `content: "Portfolio totals
   *     cover all 10 leases — Premium"` — ten, for every account, because a
   *     `content` string cannot read a number. On the 794-lease record it was
   *     simply false. A CSS pseudo-element can never be right here; the count
   *     has to come from the payload, so the line has to be an element.
   *
   * In normal flow it takes its own space, so nothing can be written over, and
   * the two rules in the copy are switched off in the overrides sheet.
   */
  /* THE CLAIMED TILE SAYS NOTHING EXTRA, AND THAT IS THE ASK.
   *
   * "What it's worth unlocks with your free 7-day trial" is REMOVED, not
   * hidden: the sentence is already on the page twice above this grid — the
   * free-plan banner opens with it and puts the trial button under it, and the
   * covered figure's own affordance says "How it is built →". A third copy
   * under every masked tile is the page repeating its own upsell at the reader,
   * which is what the tile has to stop doing.
   *
   * THE LAPSED LINE STAYS. It is not an upsell, it is the answer to "why is
   * this figure covered when the rest of the page is not" — and it carries the
   * lease count, which is the fact the reader needs and the one a `content`
   * string could never get right. Nothing about that state changes here.
   */
  const upsell = funnel === 'lapsed'
    ? `Portfolio totals cover all ${t.lease_count} ${plural(t.lease_count, 'lease')} — Premium`
    : null;
  const a = p.as_of;
  const r = p.reserves;
  const rad = p.radius['1'];
  const trend = (p.series.months ?? []).map((m) => (t.has_gas ? m.gas_net : m.oil_net));

  /* LAKHS ARE GONE FROM THIS STRIP, and that is the fix for two defects at once.
   *
   * WHAT IT DID. `formatLakhs` re-expressed the already-formatted figure in
   * lakhs — so "$3,178,463,600" was printed as "$31784636 L" and "22,511,490
   * MCF" as "22511.49 L MCF". Three things were wrong with that on this page:
   *
   *   1  IT DROPPED THE GROUPING. The helper divides and calls `toFixed`, which
   *      returns a bare decimal, so the largest figure on the dashboard came
   *      out as an unbroken run of digits. That is the defect sheet's row 8,
   *      "need proper commas".
   *
   *   2  IT PUT A CURRENCY SUFFIX ON A VOLUME. A lakh is a grouping for a
   *      COUNT; "22511.49 L MCF" reads as a unit that does not exist. That is
   *      row 21's "stray 'L' unit".
   *
   *   3  IT WAS APPLIED TO TWO FIGURES OUT OF FORTY. Only the strip's headline
   *      values went through it — every sub-line, chart, drawer, lease row and
   *      the pinned bar beside them stayed in US grouping. So one cell read
   *      "$31784636 L" directly above its own sub-line reading "your share of
   *      $15150.42B", which is the "internally inconsistent by 1000x" in row
   *      21: the reader is asked to hold two scales for one quantity.
   *
   * WHY REMOVING IT IS THE ROOT-CAUSE FIX AND NOT A PREFERENCE. `fmt.ts` opens
   * by pinning every formatter to `en-US` and names this exact failure as the
   * reason: "on an Indian-locale machine $4,548,479 rendered as $45,48,479 —
   * the lakh grouping. The figures here are US oil-and-gas records quoted in
   * dollars, mcf and barrels; the grouping belongs to the data, not to the
   * reader's operating system." The lakh pass reintroduced by hand what that
   * module exists to prevent. `format-lakhs.ts` itself is untouched and still
   * exported, so anything that genuinely wants lakhs can still ask for them.
   */

  const kpi = (
    label: string, val: React.ReactNode, sub: React.ReactNode, chip: string | null,
    fresh: string, ctx: string, hint: string, showSpark: boolean, lock?: string,
  ) => (
    <div
      className="kpi kpi-click" key={label} role="button" tabIndex={0}
      onClick={() => open(ctx)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(ctx); } }}
    >
      {/* NO PER-CARD TAG. It repeated the page banner on four cards and
          pushed the labels onto a second line at Detailed width, which the
          paid page does not do. */}
      <div className="k-label">{label}</div>
      <div className={'k-val num ' + (lock ?? '')}>{val}</div>
      {showSpark ? <Spark vals={trend} /> : null}
      <div className="k-sub">
        {sub}
        {chip ? <> <span className="chip chip-est" style={{ fontSize: 10 }}>{chip}</span></> : null}
      </div>
      <div className="k-sub"><span className="ctx-hint">{hint} →</span></div>
      <div className="freshness">{fresh}</div>
      {/* ON THE TILES THAT ARE ACTUALLY COVERED, AND ONLY THOSE.

          The lapsed pseudo-element had no `:has(.cl-lock)` on it, so it printed
          this line under all four tiles — including "Leases earning" and
          "Permits within 1 mile", which lapsed does not cover and never did.
          A sentence explaining why a figure is hidden, under a figure that is
          not, is a worse defect than the overlap it was printed in. Now that
          both states cover the same one thing (see the money gate in the
          overrides sheet), both use the same test: the tile is locked. */}
      {upsell && lock
        ? <div className={'k-upsell k-upsell-' + funnel}>{upsell}</div>
        : null}
    </div>
  );

  return (
    <div className="grid g4" style={{ margin: '14px 0' }} id="kpiGrid">
      {kpi('Your value', usd(t.owner_value),
        'your interest applied to the six-year projection',
        'Estimate — not an appraisal', `re-run ${a.estimate_run_label}`,
        'value', 'How it is built', true, 'cl-lock')}

      {kpi('Leases earning', `${t.producing_count} of ${t.lease_count}`,
        <>
          {t.paused_count
            ? `${t.paused_count} ${plural(t.paused_count, 'lease has', 'leases have')} never filed volume`
            : 'every lease has filed volume'}
          {t.behind_count ? ` · ${t.behind_count} not yet filed for ${a.data_month_label}` : ''}
        </>,
        null, `through ${a.data_month_label}`, 'producing', 'What paused means', false)}

      {kpi('Still to come, your share', vol(t.reserves_gas_net, t.reserves_oil_net, true),
        <>
          remaining reserves
          {r.unmodelled_leases
            ? ` · ${r.unmodelled_leases} ${plural(r.unmodelled_leases, 'lease')} not modelled`
            : ''}
        </>,
        null, `model run ${a.decline_run_label ?? '—'}`, 'reserves', 'What a reserve is', false, 'cl-lock')}

      {kpi('Permits within 1 mile', n0(rad?.permit_count) ?? '0',
        `${rad?.neighbour_lease_count ?? 0} neighboring ${plural(rad?.neighbour_lease_count ?? 0, 'lease')} inside the ring`,
        null, `survey rebuilt ${a.radius_rebuild_label ?? '—'}`, 'permits', 'Why neighbors matter', false)}
    </div>
  );
}

function Spark({ vals }: { vals: number[] }) {
  const v = vals.filter((x) => x != null);
  if (v.length < 3) return null;
  const max = Math.max(...v) || 1;
  const pts = v.map((x, i) => `${((i / (v.length - 1)) * 90).toFixed(1)},${(18 - (x / max) * 16).toFixed(1)}`);
  const lastY = (18 - (v[v.length - 1] / max) * 16).toFixed(1);
  return (
    <svg className="spark" viewBox="0 0 90 20" width="90" height="20" aria-hidden="true">
      <polyline fill="none" stroke="#54bf96" strokeWidth="1.5" points={pts.join(' ')} />
      <circle cx="90" cy={lastY} r="2" fill="#2e8f6d" />
    </svg>
  );
}

/* ========================================================== lease chart */
function LeaseChart(
  { p, series, setSeries, open }:
  { p: Payload; series: SeriesKey; setSeries: (s: SeriesKey) => void; open: (k: string) => void },
) {
  const t = p.totals;
  const defs = seriesDefs(t);
  const order: SeriesKey[] = ['value'];
  if (t.has_gas) order.push('gas');
  if (t.has_oil) order.push('oil');
  order.push('appraised');
  if (t.reserves_gas_net > 0 || t.reserves_oil_net > 0) order.push('reserves');
  const active = order.includes(series) ? series : 'value';
  const conf = defs[active];

  const leases = [...p.leases].sort(
    (x, y) => (num(y[conf.key]) - num(x[conf.key])));
  const total = leases.reduce((s, l) => s + num(l[conf.key]), 0);
  const max = Math.max(0, ...leases.map((l) => num(l[conf.key])));

  const withVal = leases.filter((l) => num(l[conf.key]) > 0);
  let need = 0;
  let run = 0;
  for (const l of withVal) { run += num(l[conf.key]); need++; if (run >= total / 2) break; }

  return (
    <div className="card card-pad" id="chartCard">
      <div className="between" style={{ flexWrap: 'wrap' }}>
        <h4>{conf.title}</h4>
        <span className="chartbtns">
          {order.map((k) => (
            <button
              key={k} type="button"
              className={'btn btn-ghost btn-sm' + (k === active ? ' on' : '')}
              onClick={() => setSeries(k)}
            >
              {defs[k].name}
            </button>
          ))}
        </span>
      </div>
      <p className="tiny muted" style={{ margin: '4px 0 10px' }}>
        {conf.note} · {leases.length} {plural(leases.length, 'lease')}
        {total > 0 ? ` · total ${conf.fmt(total)}` : ''}
      </p>

      <div id="leaseChart">
        {/* ADAPTED · TOP TEN ONLY. The reference draws a bar for every lease the
            record holds; a live account can carry far more than fits the card,
            so the render is capped at ten. `leases` itself is NOT capped — the
            total, the maximum and the "half your value" count above are facts
            about the whole portfolio and are still computed over all of it. */}
        {leases.slice(0, 10).map((l) => {
          const v = num(l[conf.key]);
          const w = max > 0 ? Math.max((v / max) * 100, v > 0 ? 1.5 : 0) : 0;
          return (
            <div
              className="lbar" key={l.lease_id + String(l.interest_type)}
              role="button" tabIndex={0}
              onClick={() => open('lease:' + l.lease_id)}
              onKeyDown={(e) => { if (e.key === 'Enter') open('lease:' + l.lease_id); }}
              title={`${l.lease_name} — ${conf.fmt(v)}${total > 0 ? ` · ${((v / total) * 100).toFixed(1)}% of the total` : ''} · your interest ${interest(l.interest_value)}`}
            >
              <span className="lb-name">{l.lease_name ?? l.lease_id}</span>
              <span className="lb-track">
                <span className={'lb-fill ' + conf.cls} style={{ width: w.toFixed(2) + '%' }} />
              </span>
              {v > 0
                ? <span className="lb-val">{conf.fmt(v)}</span>
                : <span className="lb-zero">none</span>}
            </div>
          );
        })}
      </div>

      {/* the insight line: CONCENTRATION, which is what a bar chart of ten
          leases actually tells an owner and which no single bar says */}
      {withVal.length && total > 0
        ? (
          <div className="chart-insight">
            <span className="ci-dot" aria-hidden="true" />
            <strong>{withVal[0].lease_name}</strong> alone is{' '}
            <strong>{((num(withVal[0][conf.key]) / total) * 100).toFixed(0)}%</strong> of this
            total, and <strong>{need} of {withVal.length}</strong> {plural(need, 'lease')}{' '}
            {need === 1 ? 'accounts' : 'account'} for half of it.{' '}
            {withVal.length < leases.length
              ? `${leases.length - withVal.length} ${plural(leases.length - withVal.length, 'lease')} contributes nothing here.`
              : 'Every lease contributes something.'}
          </div>
        )
        : null}
    </div>
  );
}

function seriesDefs(t: Payload['totals']): Record<SeriesKey, SeriesDef> {
  const gasReserves = t.reserves_gas_net > 0;
  return {
    value: { key: 'owner_value', fmt: (v) => usd(v) ?? '—', cls: '', name: 'Value',
      title: 'Your value by lease',
      note: 'your interest applied to each lease’s six-year projection' },
    gas: { key: 'anchor_gas_net', fmt: (v) => `${n0(v)} ${MCF}`, cls: 'gas', name: 'Gas',
      title: 'Gas filed to you, by lease',
      note: 'your share of the last month each lease filed' },
    oil: { key: 'anchor_oil_net', fmt: (v) => `${n0(v)} ${BBL}`, cls: 'oil', name: 'Oil',
      title: 'Oil filed to you, by lease',
      note: 'your share of the last month each lease filed' },
    /* the bar labels, the hover title and the "total" line, all through the
       same formatter the tile uses — this series IS the county appraised
       value, and a ten-lease roll puts a thirteen-character figure at the end
       of every bar. */
    appraised: { key: 'appraised_value', fmt: (v) => usdScaled(v) ?? '—', cls: 'amber',
      name: 'Appraised', title: 'County appraised value, by lease',
      note: 'the appraisal roll’s own figure' },
    reserves: gasReserves
      ? { key: 'reserves_gas_net', fmt: (v) => `${nShort(v)} ${MCF}`, cls: 'slate',
          name: 'Reserves', title: 'Gas still to come, by lease',
          note: 'remaining reserves, your share, from the decline model' }
      : { key: 'reserves_oil_net', fmt: (v) => `${nShort(v)} ${BBL}`, cls: 'slate',
          name: 'Reserves', title: 'Oil still to come, by lease',
          note: 'remaining reserves, your share, from the decline model' },
  };
}

/* ======================================================= monthly trend */
function ProdSeries({ p }: { p: Payload }) {
  const s = p.series;
  const t = p.totals;
  if (!s.months?.length) return null;
  const gas = t.has_gas;
  const key = gas ? 'gas_net' : 'oil_net';
  const unit = gas ? MCF : BBL;
  const filed = s.months.filter((m) => m[key] > 0);
  const max = Math.max(1, ...s.months.map((m) => m[key]));

  let insight: React.ReactNode;
  if (filed.length >= 6) {
    const last3 = filed.slice(-3).reduce((a, m) => a + m[key], 0) / 3;
    const prev3 = filed.slice(-6, -3).reduce((a, m) => a + m[key], 0) / 3;
    const chg = prev3 ? ((last3 - prev3) / prev3) * 100 : null;
    const best = filed.reduce((a, m) => (m[key] > a[key] ? m : a), filed[0]);
    insight = (
      <>
        The last three filed months averaged <strong>{n0(last3)} {unit}</strong> to you,{' '}
        {chg == null
          ? 'with no earlier window to compare'
          : <><strong>{pctS(chg)}</strong> against the three before</>}
        . Best month on record: <strong>{best.label}</strong> at {n0(best[key])} {unit}. Decline is
        normal in a well — a slow taper is the curve doing what it does; a steep one-month drop is
        the thing worth asking about.
      </>
    );
  } else {
    insight = (
      <>Only {filed.length} {plural(filed.length, 'month')} in this window carries a filing — too
        few to read a trend from.</>
    );
  }

  return (
    <div className="card card-pad" id="seriesCard">
      <div className="between" style={{ flexWrap: 'wrap' }}>
        <h4>Your {productWord(t.has_gas, t.has_oil)}, month by month</h4>
        <span className="chip chip-slate" style={{ fontSize: 10 }}>
          {filed.length} of {s.months.length} months filed
        </span>
      </div>
      <p className="tiny muted" style={{ margin: '4px 0 10px' }}>
        Your share of {productWord(t.has_gas, t.has_oil)} by month, ending{' '}
        {p.as_of.data_month_label}. Months the
        state has not filed yet are drawn grey rather than as a fall to zero — the record carries{' '}
        {p.as_of.unreported_tail_months} such {plural(p.as_of.unreported_tail_months, 'month')}{' '}
        beyond {p.as_of.data_month_label}.
      </p>
      {/* The interactive chart, not the static bars this card used to draw.
          Hover or arrow-key any month for the exact figure the state holds for
          it, instead of estimating it against an axis. */}
      <div id="prodSeries">
        <ProductPair
          subject="your leases"
          months={s.months.map((m) => ({
            label: m.label, cycle: m.cycle,
            /* `leases` is how many of the owner's leases filed that
               month. Zero means nothing was filed, which must draw as a GAP
               rather than as a month of no production — the portfolio series
               carries no per-month `reported` flag, and this is the same
               fact stated by the data it does carry. */
            gas: m.leases === 0 ? Number.NaN : m.gas_net,
            oil: m.leases === 0 ? Number.NaN : m.oil_net,
          }))}
          opts={{
            gasName: 'Gas to you, by month',
            oilName: 'Oil to you, by month',
            /* THE SUB-LINE SAYS WHICH MONTHS, not only how many of them.
               "24 of 24 months filed" is a coverage figure and was the whole
               of it, so the chart under it did not say what window it draws —
               the anchor month is in the paragraph above and in the axis, and
               neither is beside the series the reader is hovering. Defect
               sheet row 16. The drawer charts already carry the window this
               way ("24 months to June 2026"), so this is the same sentence the
               same reader meets one click deeper, and it is built from
               `as_of`, which every mode and every account state shares. */
            sub: `${filed.length} of ${s.months.length} months filed`
              + (p.as_of.data_month_label ? ` · to ${p.as_of.data_month_label}` : ''),
            keyPrefix: 'dash',
          }}
        />
      </div>
      <div className="chart-insight"><span className="ci-dot" aria-hidden="true" />{insight}</div>
    </div>
  );
}

/* ============================================ what is going on around you */
/**
 * v1's card of this name showed the value model's price deck, which is not what
 * is going on around you — it is the price path the estimate is calculated on.
 * This reads the ACTIVITY FEED: the permits, completions and status changes
 * filed in the owner's own counties, with the owner's own rows flagged.
 *
 * The county fold matters here. One collection spells the same county "DEWITT"
 * and another "DE WITT"; matching exactly loses 57% of the permits. The fold is
 * in the feed, and this card shows what it returns.
 */
function AroundYou(
  { p, tier, open, go }:
  { p: Payload; tier: Tier; open: (k: string) => void; go: (r: Route, params?: Record<string, string | null>) => void },
) {
  const ac = p.activities;
  const cmp = ac.compare_90;

  return (
    <div className="card card-pad" id="marketCard">
      <div className="between" style={{ flexWrap: 'wrap' }}>
        <h4>What’s going on around you</h4>
        <span className="chip chip-slate" style={{ fontSize: 10 }}>
          {ac.counties.join(', ') || 'your counties'}
        </span>
      </div>
      <p className="tiny muted" style={{ margin: '4px 0 8px' }}>
        Permits, completions and well-status changes filed near your acreage in the last{' '}
        {ac.window_months} months
        {ac.newest_label ? ` · newest filing ${ac.newest_label}` : ''}. Public record, as filed.
      </p>

      <div id="marketBody">
        {ac.counts.nearby
          ? (
            <>
              {([
                ['Permits filed', ac.counts.permits, 'intent to drill — not a well yet', 'permits'],
                ['Wells completed', ac.counts.completions, 'finished and reported — production usually follows', 'completions'],
                ['Standing permits within 1 mile', p.radius['1']?.permit_count ?? 0,
                  `${p.radius['1']?.neighbour_lease_count ?? 0} neighboring ${plural(p.radius['1']?.neighbour_lease_count ?? 0, 'lease')}`, 'permits'],
                ['On leases you hold', ac.counts.mine,
                  ac.counts.mine ? 'filed against one of your own lease numbers'
                    : 'a permit carries no lease number, so only completions can be matched to you',
                  'completions'],
              ] as const).map(([label, val, why, ctx]) => (
                <div
                  className="setrow" key={label} role="button" tabIndex={0}
                  onClick={() => open(ctx)}
                  onKeyDown={(e) => { if (e.key === 'Enter') open(ctx); }}
                >
                  <div style={{ minWidth: 0 }}>
                    <strong className="small">{label}</strong>
                    <div className="tiny muted">{why}</div>
                  </div>
                  <span className="num small" style={{ fontWeight: 800 }}>{n0(val)}</span>
                </div>
              ))}

              {/* ADAPTED · THE PER-FILING LIST IS NOT RENDERED. The reference
                  prints the neighbouring permits and completions one by one
                  here. It was removed at the owner's request: the counts above
                  and the 90-day comparison below already say what the card is
                  for, and the row-by-row feed repeated on the Activities page,
                  which is where the whole list belongs. Nothing else in the
                  card changed, and `activities.nearby` is still read for
                  `counts.nearby` and the "See all N filings" link.

                  `ctxForKind` and this component's `tier` prop fed only that
                  list and are now unreferenced. They are LEFT IN PLACE, beside
                  the reference's own unused declarations, so restoring the list
                  is a matter of putting the block back rather than rebuilding
                  its plumbing. ESLint reports them as two warnings, not
                  errors. */}
              <div className="chart-insight">
                <span className="ci-dot" aria-hidden="true" />
                {cmp.change_pct != null
                  ? (
                    <>
                      <strong>{cmp.recent} {plural(cmp.recent, 'filing')} in the last 90 days</strong>{' '}
                      against {cmp.prior} in the 90 before — {cmp.change_pct > 0 ? 'up' : cmp.change_pct < 0 ? 'down' : 'level at'}{' '}
                      {pctS(Math.abs(cmp.change_pct))}. {aroundMeaning(cmp)}
                    </>
                  )
                  : (
                    <>
                      <strong>{cmp.recent} {plural(cmp.recent, 'filing')} in the last 90 days.</strong>{' '}
                      There is no earlier 90-day window in the feed to compare it with, so the
                      direction is not stated rather than guessed.
                    </>
                  )}
              </div>

              <p className="small" style={{ margin: '10px 0 0', paddingTop: 8, borderTop: '1px solid var(--line)' }}>
                A permit next door means somebody intends to drill nearby — it proves the rock, it
                is not your well and it does not pay you.{' '}
                <button type="button" className="linklike" onClick={() => go('activities')}>
                  See all {n0(ac.counts.nearby)} filings →
                </button>
              </p>
            </>
          )
          : (
            <p className="small" style={{ margin: 0 }}>
              No permit, completion or status change has been filed in{' '}
              {ac.counties.join(', ') || 'these counties'} in the last {ac.window_months} months.
              That is the record as it stands, not a gap in the feed
              {ac.newest_label ? ` — the newest filing anywhere in it is ${ac.newest_label}` : ''}.
            </p>
          )}

        {ac.status_note
          ? (
            <p className="tiny muted" style={{ margin: '9px 0 0' }}>
              <strong>One feed is behind.</strong> {ac.status_note} Said out loud rather than shown
              as a zero — “nothing happened” and “we could not see” are different facts.
            </p>
          )
          : null}
      </div>
    </div>
  );
}

/* ========================================================== price deck */
/* v1 had this inside "What's going on around you". It is a different thing —
   the price path the value model runs on, not a market quote and not activity —
   so it is its own card, and it says how it differs from the live settlements
   in the bar at the top of the page. */
function PriceDeck({ p, open }: { p: Payload; open: (k: string) => void }) {
  const d = p.model_deck;
  const t = p.totals;
  if (!d) return null;
  const hist = d.history ?? [];
  const pk: 'gas' | 'oil' = t.has_gas && !t.has_oil ? 'gas' : t.has_oil && !t.has_gas ? 'oil' : 'gas';

  const row = (sym: string, v: string, chg: number | null, why: string) => (
    <div
      className="setrow" key={sym} role="button" tabIndex={0}
      onClick={() => open('prices')}
      onKeyDown={(e) => { if (e.key === 'Enter') open('prices'); }}
    >
      <div style={{ minWidth: 0 }}>
        <strong className="small">{sym} · {v}</strong>
        <div className="tiny muted">{why}</div>
      </div>
      <span
        className="small"
        style={{ fontWeight: 800, color: chg == null ? 'var(--muted)' : chg >= 0 ? 'var(--green-deep)' : '#b3261e' }}
      >
        {chg == null ? 'no prior month' : pctS(chg, 2)}
      </span>
    </div>
  );

  return (
    <div className="card card-pad">
      <div className="between" style={{ flexWrap: 'wrap' }}>
        <h4>The price path behind your value</h4>
        <span className="chip chip-slate" style={{ fontSize: 10 }}>{d.label}</span>
      </div>
      <p className="tiny muted" style={{ margin: '4px 0 8px' }}>{d.basis}</p>

      {(t.has_gas || !t.has_oil)
        ? row('Gas', `$${d.gas.toFixed(3)} /MMBtu`, d.gas_change_pct,
          `the gas price your value is calculated on for ${d.label}`)
        : null}
      {(t.has_oil || !t.has_gas)
        ? row('Oil', `$${d.oil.toFixed(2)} /${BBL}`, d.oil_change_pct,
          `the oil price your value is calculated on for ${d.label}`)
        : null}

      {hist.length > 2 ? <PriceSpark hist={hist} k={pk} /> : null}

      <p className="small" style={{ margin: '10px 0 0', paddingTop: 8, borderTop: '1px solid var(--line)' }}>
        {t.has_gas && !t.has_oil
          ? `Your leases filed gas and no oil in ${p.as_of.data_month_label}, so the gas line is the one that moves your value.`
          : t.has_oil && !t.has_gas
            ? `Your leases filed oil and no gas in ${p.as_of.data_month_label}, so the oil line is the one that moves your value.`
            : 'Your leases filed both oil and gas, so both lines move your value.'}
        {p.ticker?.items.length
          ? ' The four prices in the bar at the top of the page are a different number — those are published market settlements.'
          : ''}{' '}
        <button type="button" className="linklike" onClick={() => open('prices')}>
          How the two differ →
        </button>
      </p>
    </div>
  );
}

function PriceSpark({ hist, k }: { hist: { label: string | null; gas: number; oil: number }[]; k: 'gas' | 'oil' }) {
  const vals = hist.map((h) => h[k]);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = (max - min) || 1;
  const pts = vals.map((v, i) =>
    `${((i / (vals.length - 1)) * 300).toFixed(1)},${(44 - ((v - min) / span) * 38).toFixed(1)}`);
  const dp = k === 'gas' ? 3 : 2;
  return (
    <div className="price-spark ps-has-axis">
      <div className="ps-head">
        <strong className="small">
          {k === 'gas' ? 'Gas' : 'Oil'} across the last {hist.length} months
        </strong>
        <span className="tiny muted">{hist[0].label} → {hist[hist.length - 1].label}</span>
      </div>
      <svg viewBox="0 0 300 48" className="ps-svg" preserveAspectRatio="none" aria-hidden="true">
        <polyline
          fill="none" stroke={k === 'gas' ? '#54bf96' : '#b8892f'} strokeWidth="2"
          points={pts.join(' ')}
        />
        <circle
          cx="300" cy={(44 - ((vals[vals.length - 1] - min) / span) * 38).toFixed(1)} r="3"
          fill={k === 'gas' ? '#2e8f6d' : '#8a6420'}
        />
      </svg>
      {/* THE TWO BOUNDS SIT WHERE THEY HAPPEN, not side by side under the line.
          Printed as a row, "low $2.821" and "high $4.921" shared one baseline
          while the line above plainly put its high at the top — so the card
          showed a high and a low at the same height and invited the reading
          that they were equal (defect sheet row 41). They are the ends of a
          vertical scale, so they are labelled as one: high against the top of
          the plot, low against the bottom. The same two figures, in the two
          positions that make them readable. */}
      <div className="ps-ax ps-ax-v">
        <span className="ps-hi">high ${max.toFixed(dp)}</span>
        <span className="ps-lo">low ${min.toFixed(dp)}</span>
      </div>
    </div>
  );
}

/* =========================================================== operators */
function Operators({ p, open }: { p: Payload; open: (k: string) => void }) {
  const o = p.operators;
  const t = p.totals;
  /* BEFORE THE EARLY RETURN, because it is a hook. An owner whose operator
     list arrives empty on one render and filled on the next would change the
     hook order between them, which React treats as a different component and
     throws on. `eslint react-hooks/rules-of-hooks` caught this. */
  const pg = usePaged(o.operators);
  if (!o.operators.length) return null;
  /* THE BAR SCALE IS THE WHOLE LIST'S, not the page's. Scaling to the page
     would make the largest operator on page six look like the largest overall
     — every page would end in a full bar and the comparison the bars exist
     for would be gone. */
  const maxVal = Math.max(1, ...o.operators.map((x) => x.owner_share_value));

  /* one entry per distinct change of hands — see the note on the handover
     line at the foot of this card */
  const handoverCount = new Map<string, number>();
  for (const h of o.handovers) {
    const k = `${h.from_operator} → ${h.to_operator} (${h.cycle_label})`;
    handoverCount.set(k, (handoverCount.get(k) ?? 0) + 1);
  }
  const handoverLines = [...handoverCount].map(
    ([k, n]) => (n > 1 ? `${k} on ${n} leases` : k),
  );

  return (
    <div className="card card-pad" id="opCard">
      <div className="between" style={{ flexWrap: 'wrap' }}>
        <h4>Your operators</h4>
        <span className="chip chip-slate" style={{ fontSize: 10 }}>
          {o.operator_count} {plural(o.operator_count, 'operator')}
        </span>
      </div>
      <p className="tiny muted" style={{ margin: '4px 0 8px' }}>
        {o.operator_count} {plural(o.operator_count, 'operator')}{' '}
        {o.operator_count === 1 ? 'runs' : 'run'} your {t.lease_count}{' '}
        {plural(t.lease_count, 'lease')}
        {o.latest_handover
          ? `. The most recent handover was ${o.latest_handover.cycle_label}.`
          : '. No handover is recorded on these leases.'}
      </p>
      <div id="opBody">
        {pg.rows.map((op) => (
          <div
            className="opscore" key={op.operator_name} role="button" tabIndex={0}
            onClick={() => open('operators')}
            onKeyDown={(e) => { if (e.key === 'Enter') open('operators'); }}
          >
            <div style={{ minWidth: 0 }}>
              <strong className="small">{op.operator_name}</strong>
              <div className="tiny muted">
                {op.lease_count} of your {plural(op.lease_count, 'lease')} · {op.producing} producing ·{' '}
                {vol(op.last_month_gas_net, op.last_month_oil_net, true)} to you last filed month
              </div>
              <div className="op-bar">
                <i style={{ width: ((op.owner_share_value / maxVal) * 100).toFixed(1) + '%' }} />
              </div>
            </div>
            <span
              className="small cl-lock"
              style={{ fontWeight: 800, textAlign: 'right', flex: 'none' }}
            >
              {usdShort(op.owner_share_value)}
              <div className="tiny muted" style={{ fontWeight: 400 }}>
                {((op.owner_share_value / (t.owner_value || 1)) * 100).toFixed(0)}% of your value
              </div>
            </span>
          </div>
        ))}
        <Pager
          page={pg.page} pages={pg.pages} setPage={pg.setPage} start={pg.start}
          shown={pg.rows.length} total={o.operators.length} label="Operators pages"
        />
        {o.handovers.length
          ? (
            <p className="tiny muted" style={{ margin: '9px 0 0', paddingTop: 8, borderTop: '1px solid var(--line)' }}>
              Handovers on record:{' '}
              {/* ONE LINE PER HANDOVER, NOT PER LEASE IT HAPPENED ON.

                  `handovers` is keyed by lease — `{lease_id, cycle,
                  from_operator, to_operator}` — and this printed only the two
                  operators and the month. An operator that sold a package of
                  leases hands over every one of them in the same month, so the
                  identical sentence was printed two and three times in a row:
                  "BLACKBRUSH O & G, LLC → SCOTT SUGG ... (May 2026) ·
                  BLACKBRUSH O & G, LLC → ... (May 2026)". Defect sheet row 27.

                  The rows are grouped by the sentence they produce, so one
                  change of hands reads as one change of hands and the lease
                  count it covers — the fact the repetition was accidentally
                  standing in for — is stated instead of implied. Nothing is
                  dropped: the panel behind "why a handover matters" still
                  lists every lease, and `slice(0, 3)` still limits the line to
                  three the way it always has. */}
              {handoverLines.slice(0, 3).join(' · ')}
              {' '}— <button type="button" className="linklike" onClick={() => open('operators')}>
                why a handover matters →
              </button>
            </p>
          )
          : null}
      </div>
    </div>
  );
}

/* ============================================================ raw table */
function RawTable({ p, open }: { p: Payload; open: (k: string) => void }) {
  /* SORTED ONCE, not on every page turn. 1,659 rows re-sorted on each click of
     the pager is work with nothing to show for it — the order never changes. */
  const sorted = useMemo(
    () => [...p.leases].sort((x, y) => y.owner_value - x.owner_value), [p.leases],
  );
  const pg = usePaged(sorted);
  return (
    <div className="card card-pad" id="rawCard">
      <div className="between" style={{ flexWrap: 'wrap' }}>
        <h4>Every lease, every field</h4>
      </div>
      <p className="tiny muted" style={{ margin: '4px 0 8px' }}>
        {p.leases.length} {plural(p.leases.length, 'holding')} · one row per interest, because an
        owner can hold one lease under two of them
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Lease</th><th>County</th><th>Operator</th><th>Interest</th>
              <th style={{ textAlign: 'right' }}>Your value</th>
              <th style={{ textAlign: 'right' }}>Appraised</th>
              <th>Last filed</th>
              <th style={{ textAlign: 'right' }}>Your share</th>
              {/* reserves per lease, not the new-well probability. The
                  probability is a model output about acreage; what an owner
                  reads across a table of their own leases is how much is
                  still to come from each one. It also keeps the column in the
                  units they are paid in rather than as a bare percentage. */}
              <th style={{ textAlign: 'right' }}>Gas left</th>
              <th style={{ textAlign: 'right' }}>Oil left</th>
            </tr>
          </thead>
          <tbody>
            {pg.rows.map((l) => (
              <tr
                key={l.lease_id + String(l.interest_type)} style={{ cursor: 'pointer' }}
                onClick={() => open('lease:' + l.lease_id)}
              >
                <td><b>{l.lease_name ?? l.lease_id}</b></td>
                <td>{l.county ?? '—'}</td>
                <td>{l.operator_name ?? '—'}</td>
                <td>{interest(l.interest_value)}</td>
                <td style={{ textAlign: 'right' }} className="num">{usdShort(l.owner_value)}</td>
                {/* the appraised column moves to `usdScaled` with the rest of
                    this figure; `usdShort` beside it still serves "Your value",
                    which is a different quantity and is unchanged. */}
                <td style={{ textAlign: 'right' }} className="num">{usdScaled(l.appraised_value)}</td>
                <td>
                  {l.anchor_label ?? 'never'}
                  {l.months_behind ? <span className="tiny muted"> · {l.months_behind}m behind</span> : null}
                </td>
                <td style={{ textAlign: 'right' }} className="num">
                  {vol(l.anchor_gas_net, l.anchor_oil_net, true)}
                </td>
                <td style={{ textAlign: 'right' }} className="num">
                  {l.reserves_gas_net > 0
                    ? `${nShort(l.reserves_gas_net)} ${MCF}`
                    : <em className="muted">none</em>}
                </td>
                <td style={{ textAlign: 'right' }} className="num">
                  {l.reserves_oil_net > 0
                    ? `${nShort(l.reserves_oil_net)} ${BBL}`
                    : <em className="muted">none</em>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager
        page={pg.page} pages={pg.pages} setPage={pg.setPage} start={pg.start}
        shown={pg.rows.length} total={sorted.length} label="Lease table pages"
      />
      <p className="tiny muted" style={{ margin: '8px 0 0' }}>
        “Gas left” and “Oil left” are the decline model’s remaining reserves with your interest
        already applied — your share, not the whole lease. A lease showing “none” either has no
        model run or has nothing left in the one it has; the two are different, and the lease’s own
        panel says which.
      </p>
    </div>
  );
}

/* ============================================== what we watched for you */
function Watched({ p, open }: { p: Payload; open: (k: string) => void }) {
  const t = p.totals;
  const a = p.as_of;
  const r = p.reserves;
  const rad = p.radius;
  /* THE DECLINE RUN'S OWN UNIVERSE — see the Decline models row below.
     Clamped to the portfolio, because a service that ever reported more
     modelled leases than the owner holds must not make the remainder go
     negative on screen. */
  const modelUniverse = Math.min(
    t.lease_count, num(r.modelled_leases) + num(r.unmodelled_leases),
  );
  const noModelRecord = Math.max(0, t.lease_count - modelUniverse);
  const rows: [string, string, string, string][] = [
    ['Lease-months read', n0(p.leases.reduce((s, l) => s + l.months_reported, 0)) ?? '0',
      `across ${t.lease_count} ${plural(t.lease_count, 'lease')}, through ${a.data_month_label}`,
      'production'],
    ['Permits tracked',
      `${n0(rad['1']?.permit_count)} / ${n0(rad['3']?.permit_count)} / ${n0(rad['5']?.permit_count)}`,
      `inside 1 / 3 / 5 miles · survey rebuilt ${a.radius_rebuild_label ?? '—'}`, 'permits'],
    ['Leases re-valued', n0(t.valued_count) ?? '0',
      `the model re-ran on ${a.estimate_run_label}`, 'value'],
    /* THE THREE FIGURES IN THIS ROW COME OUT RIGHT WHEN A READER SUBTRACTS.
       It printed `modelled_leases of lease_count` beside "`unmodelled_leases`
       not modelled", and those are counts of two DIFFERENT sets: 738 of 794,
       43 not modelled, and 794 − 738 is 56. Defect sheet row 24. The decline
       run covers the leases the reserves block reached — 738 modelled plus 43
       not, which is 781 — and the other 13 were never in front of it at all,
       so quoting the portfolio as the denominator claims a coverage the model
       does not have.

       The pair that actually belongs together is shown as a pair, and the
       leases the run never saw are named as their own third figure rather than
       being folded into "not modelled" — a lease with no model is a different
       fact from a lease the model could not fit, and the note under the
       reserves card turns on that distinction. */
    ['Decline models', `${n0(r.modelled_leases)} of ${n0(modelUniverse)}`,
      [r.unmodelled_leases
        ? `${n0(r.unmodelled_leases)} not modelled — shown as such, never as 0%`
        : 'every lease the run reached carries a model',
      noModelRecord
        ? `${n0(noModelRecord)} of your ${n0(t.lease_count)} carry no decline run yet`
        : null].filter(Boolean).join(' · '), 'reserves'],
    /* NOT `'value'`. This row counts WELLS and opened "Your value — how it is
       built", which is the one panel on the list that has nothing to do with
       it — every sibling maps correctly (lease-months to production, permits
       to the permit panel, decline models to reserves), so the mismatch read
       as a broken control rather than a choice. `producing` is the well-record
       panel this page already uses: it is what the "Your wells" card's own
       status rows open, so a reader who clicks a well status and a reader who
       clicks this count now land in the same place. A dedicated well-register
       drawer would be better still and needs an endpoint — the service
       advertises no `wells` key today. */
    ['Wells located', n0(t.well_count) ?? '0', 'with coordinates, status and depth', 'producing'],
    ['Filings near you', n0(p.activities.counts.nearby) ?? '0',
      `permits, completions and status changes in the last ${p.activities.window_months} months`,
      'permits'],
  ];
  return (
    <div className="card card-pad" style={{ borderTop: '3px solid var(--green)' }} id="watchCard">
      <div className="between" style={{ flexWrap: 'wrap' }}><h4>✦ What we watched for you</h4></div>
      <p className="tiny muted" style={{ margin: '4px 0 8px' }}>
        What was actually read for this owner, and when. Each line is a count from the source, not
        a claim about it.
      </p>
      <div id="watchBody">
        {rows.map(([k, v, sub, ctx]) => (
          <div
            className="setrow" key={k} role="button" tabIndex={0}
            onClick={() => open(ctx)} onKeyDown={(e) => { if (e.key === 'Enter') open(ctx); }}
          >
            <div style={{ minWidth: 0 }}>
              <strong className="small">{k}</strong>
              <div className="tiny muted">{sub}</div>
            </div>
            <span className="num small" style={{ fontWeight: 800 }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================ reserves */
function Reserves({ p, open }: { p: Payload; open: (k: string) => void }) {
  const r = p.reserves;
  const t = p.totals;
  const best = r.probability_best;
  /* the decline run's own universe, and the leases outside it — the same two
     figures the "Decline models" row in `Watched` is built on, for the same
     reason. See the comment there. */
  const modelUniverse = Math.min(
    t.lease_count, num(r.modelled_leases) + num(r.unmodelled_leases),
  );
  const noModelRecord = Math.max(0, t.lease_count - modelUniverse);

  const line = (k: string, v: React.ReactNode, sub: string, ctx: string) => (
    <div
      className="setrow" key={k} role="button" tabIndex={0}
      onClick={() => open(ctx)} onKeyDown={(e) => { if (e.key === 'Enter') open(ctx); }}
    >
      <div style={{ minWidth: 0 }}>
        <strong className="small">{k}</strong>
        <div className="tiny muted">{sub}</div>
      </div>
      <span className="num small" style={{ fontWeight: 800 }}>{v}</span>
    </div>
  );

  return (
    <div className="card card-pad" id="resCard">
      <div className="between" style={{ flexWrap: 'wrap' }}><h4>Reserves &amp; new-well outlook</h4></div>
      <p className="tiny muted" style={{ margin: '4px 0 8px' }}>
        From the decline model{r.updated_label ? `, run ${r.updated_label}` : ''}
        {r.forecast_to_label ? `, forecast to ${r.forecast_to_label}` : ''}.
      </p>
      <div id="resBody">
        {line('Still to come, your share', vol(t.reserves_gas_net, t.reserves_oil_net, true),
          `the whole lease holds ${vol(r.reserves_gas, r.reserves_oil, true)} across the ${t.lease_count} ${plural(t.lease_count, 'lease')}`,
          'reserves')}
        {line('Produced so far', vol(t.life_gas_gross, t.life_oil_gross, true),
          'life of lease, on a 100% basis', 'reserves')}
        {line('New-well chance',
          r.probability_avg == null ? 'not modelled' : `${r.probability_avg.toFixed(0)}%`,
          r.probability_avg == null
            ? 'no lease here carries a model — that is not the same as 0%'
            /* THE SAME THREE FIGURES AS THE "Decline models" ROW, and they add
               up here for the same reason — see that row. This line used to
               name the modelled and the unmodelled count with no denominator
               at all, so a reader carried the portfolio's 794 over from the
               card above and got 781. The run's own universe is stated, and
               the leases outside it are named as being outside it. */
            : `average across the ${n0(r.modelled_leases)} modelled of ${n0(modelUniverse)}`
              + (r.unmodelled_leases ? ` · ${n0(r.unmodelled_leases)} excluded as not modelled` : '')
              + (noModelRecord ? ` · ${n0(noModelRecord)} carry no decline run yet` : ''),
          'reserves')}
        {best
          ? line('Best-placed lease', `${(best.probability ?? 0).toFixed(0)}%`,
            `${best.lease_name}${best.probability_category ? ' · ' + best.probability_category : ''}`,
            'lease:' + best.lease_id)
          : null}
        {r.unmodelled_leases
          ? (
            <p className="tiny muted" style={{ margin: '9px 0 0' }}>
              A lease with no model is shown as “not modelled”, never as 0% — printing zero would
              tell you your acreage has no chance of a new well when the truth is nobody modelled it.
            </p>
          )
          : null}
      </div>
    </div>
  );
}

/* ========================================================== neighbours */
function Neighbors(
  { p, open, go }: { p: Payload; open: (k: string) => void; go: (r: Route, params?: Record<string, string | null>) => void },
) {
  const rad = p.radius;
  const ac = p.activities;
  return (
    <div className="card card-pad" id="radCard">
      <h4>Neighbors &amp; standing permits</h4>
      <p className="tiny muted" style={{ margin: '4px 0 8px' }}>
        These are STANDING permits. The survey behind them was rebuilt {p.radius_stamp ?? '—'}, and
        that date stamps the survey, not any one filing.
      </p>
      <div id="radBody">
        {(['1', '3', '5'] as const).map((b) => {
          const r = rad[b];
          if (!r) return null;
          return (
            <div
              className="setrow" key={b} role="button" tabIndex={0}
              onClick={() => open('permits')}
              onKeyDown={(e) => { if (e.key === 'Enter') open('permits'); }}
            >
              <div style={{ minWidth: 0 }}>
                <strong className="small">Within {b} {plural(Number(b), 'mile')}</strong>
                <div className="tiny muted">
                  {r.neighbour_lease_count} neighboring {plural(r.neighbour_lease_count, 'lease')}{' '}
                  — your own {plural(p.totals.lease_count, 'lease')} excluded
                </div>
              </div>
              <span className="num small" style={{ fontWeight: 800 }}>
                {n0(r.permit_count)}
                <div className="tiny muted" style={{ fontWeight: 400 }}>
                  {plural(r.permit_count, 'permit')}
                </div>
              </span>
            </div>
          );
        })}
        {ac.operators.length
          ? (
            <p className="tiny muted" style={{ margin: '9px 0 0', paddingTop: 8, borderTop: '1px solid var(--line)' }}>
              Busiest nearby:{' '}
              {ac.operators.slice(0, 2).map((o) => `${o.operator_name} (${o.total})`).join(' · ')}
              {' '}— <button type="button" className="linklike" onClick={() => go('activities')}>
                the whole feed →
              </button>
            </p>
          )
          : null}
      </div>
    </div>
  );
}

/* ========================================================== provenance */
function Provenance({ p, open }: { p: Payload; open: (k: string) => void }) {
  const o = p.owner;
  const cov = p.coverage;
  /* what the sources say they were run over, and what the portfolio holds
     beyond it — see the heading below */
  const covOf = Math.max(
    0, ...Object.values(cov).map((v) => num((v as { of: number }).of)),
  ) || p.totals.lease_count;
  const covGap = Math.max(0, p.totals.lease_count - covOf);
  return (
    <div className="card card-pad" id="provCard">
      <h4>Where every number came from</h4>
      <p className="tiny muted" style={{ margin: '4px 0 8px' }}>
        Every read is keyed on this owner’s own leases. Freshness is the source’s, not this page’s.
      </p>
      <div id="provBody">
        {p.sources.map((s) => (
          <div className="srcrow" key={s.name}>
            <span className="s-name">{s.name}</span>
            <span className="s-gives">{s.gives}</span>
            <span className="s-fresh">{s.fresh}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--line)' }}>
        <strong className="small">How this owner was identified</strong>
        <p className="tiny muted" style={{ margin: '4px 0 6px' }}>
          {o.identity_note}{' '}
          <button type="button" className="linklike" onClick={() => open('identity')}>
            what was matched →
          </button>
        </p>
        {o.other_identities?.length
          ? (
            <p className="tiny" style={{ margin: '0 0 8px' }}>
              That owner number is also used by <strong>{o.other_identities.length}</strong> other{' '}
              {plural(o.other_identities.length, 'owner')} on this roll — matching on the number
              alone would have pulled in leases that are not this owner’s.
            </p>
          )
          : null}
        {o.collapsed_rows
          ? <p className="tiny muted" style={{ margin: '0 0 8px' }}>{o.collapse_note}</p>
          : null}
        {/* THE HEADING COUNTS THE SAME LEASES THE ROWS UNDER IT COUNT.

            It read "Source coverage of the 794 leases" over a line where every
            single denominator was 782 — production 782/782, valuation 781/782,
            radius 707/782 — so the twelve leases between the two numbers were
            asserted to be covered by the heading and were in none of the
            figures. Defect sheet row 25.

            The denominator is the sources' own, and where it falls short of
            the portfolio the shortfall is stated rather than papered over: a
            lease no source has reached yet is a real and useful fact about
            this record, and it is the one thing the old heading hid. `outOf`
            takes the LARGEST `of` the sources report, so a source that covers
            more than its neighbours cannot make the gap read as bigger than it
            is; they are equal on every payload seen so far. */}
        <strong className="small">
          Source coverage of {covGap ? '' : 'the '}{n0(covOf)} {plural(covOf, 'lease')}
        </strong>
        <p className="tiny muted" style={{ margin: '4px 0 0' }}>
          {Object.entries(cov).map(([k, v]) => `${k.replace(/_/g, ' ')} ${v.have}/${v.of}`).join(' · ')}
          {covGap
            ? ` · ${n0(covGap)} of your ${n0(p.totals.lease_count)} ${plural(p.totals.lease_count, 'lease')} `
              + 'carry no source row yet'
            : ''}
        </p>
      </div>
    </div>
  );
}

/* ================================================================ bits */
const CAT_NAME: Record<string, string> = {
  money: 'Money', activity: 'Activity', models: 'Models & forecasts', community: 'Community',
};
const GLYPH: Record<string, string> = {
  money: '✓', activity: '⚑', models: '◔', community: '◉',
};

function num(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

/**
 * A LIST THAT COLLAPSES TO A COUNT, AND OPENS AGAIN.
 *
 * WHAT WAS WRONG. The greeting line collapses its counties past five names and
 * its plays past two, and the only way back to the names was the `title`
 * attribute — which is a hover, so it does not exist on a phone, on a tablet,
 * on a keyboard or to a screen reader that is not in browse mode. The line
 * therefore read "4 plays" and, for most of the people reading it, that was
 * all it would ever read. Defect sheet row 9, "More than one playtypes show
 * only count".
 *
 * THE COLLAPSE ITSELF IS KEPT. The measurement behind it has not changed —
 * twenty county names is a wall, and four play names pushed this subhead onto
 * a third row — so the default is still the count. What changes is that the
 * count is now a CONTROL: it says how many, it opens to the names, and it
 * closes again. Nothing is hidden from anybody; the page simply does not open
 * with a wall of names on it.
 *
 * `title` IS KEPT TOO, because a hover that already worked should go on
 * working, and it is what a tooltip-reading assistive technology finds.
 *
 * A LIST SHORT ENOUGH TO PRINT IS PRINTED, with no control at all — a button
 * around three words the reader can already see is noise, and this component
 * is used inside a sentence.
 */
function NameList(
  { names, max, one, many }:
  { names: string[]; max: number; one: string; many?: string },
) {
  const [open, setOpen] = useState(false);
  if (!names.length) return null;
  if (names.length <= max) return <>{names.join(', ')}</>;
  const all = names.join(', ');
  return (
    <button
      type="button" className="linklike name-list" title={all}
      aria-expanded={open}
      onClick={() => setOpen((v) => !v)}
    >
      {open ? all : `${names.length} ${plural(names.length, one, many)}`}
      <span aria-hidden="true">{open ? ' ▴' : ' ▾'}</span>
    </button>
  );
}

function ctxForKind(k: string): string {
  return k === 'completion' ? 'completions' : k === 'status' ? 'status' : 'permits';
}

export function topKey(ev: { category: string }): string {
  return ev.category === 'money' ? 'production'
    : ev.category === 'models' ? 'reserves'
      : ev.category === 'activity' ? 'permits' : 'value';
}

function metricText(it: { metric: number | null; metric_unit: string | null }): string | null {
  if (it.metric == null) return null;
  return `${n1(it.metric)}${it.metric_unit ? ' ' + it.metric_unit : ''}`;
}

/**
 * HOW MANY NAMES A LIST PRINTS BEFORE IT COLLAPSES TO A COUNT.
 *
 * Both numbers are the point where a list stops informing and starts pushing
 * the page around. A portfolio with 1,659 leases across 20 counties and 57
 * operators wrapped the greeting onto three lines and grew the Producing cell
 * to eight times the height of the four beside it — the strip is a row of
 * equal tiles, so one tall cell stretches all five.
 *
 * FIVE AND THREE, not one rule for both. The counties sit in a sentence that
 * already carries five other facts, so five names is as much as it can hold
 * without becoming the line's subject. The operators sit under a figure in a
 * narrow tile, where three is a sample and anything more is a wall.
 */
const MAX_COUNTY_NAMES = 5;
const MAX_OPERATOR_NAMES = 3;
/**
 * AND TWO FOR THE PLAYS, which sit at the END of that same sentence.
 *
 * The counties get five because they are the line's subject; the plays trail
 * it, and their names are long — "HAYNESVILLE/BOSSIER SHALE" is one fact and
 * twenty-five characters. Four of them added 118 characters to a line already
 * carrying six figures and pushed the subhead onto a third row. Two names is
 * still an answer ("Eagle Ford and Permian"); past that the count is the more
 * useful fact and the names stay on the `title`.
 */
const MAX_PLAY_NAMES = 2;

/* ============================================================ owner switch */
/**
 * WHICH CLAIMED RECORD IS FILLING THIS PAGE — the chip, and the panel behind it.
 *
 * WHY IT EXISTS. One account can hold several owner records: a spouse, a family
 * trust, an inherited interest. `/api/v1/dashboard` answers with the one it
 * resolved (`owner.ownername`) and lists the rest in `owner.claimed_owners`,
 * and until now the page named the active one and said nothing about the
 * others — so an owner with three records had no way to tell which of the
 * three every figure on the page belonged to, or that the other two existed.
 *
 * EVERY FIGURE IN HERE IS THE PAYLOAD'S. The name, the roll number, the lease
 * count, the counties and the list of other records are all read off the same
 * answer the strip is drawn from, so the panel cannot disagree with the page it
 * explains — the failure the drawer endpoint's `owner` parameter is documented
 * against in `owner-data.ts`.
 *
 * SWITCHING IS NOT WIRED, AND NO CONTROL PRETENDS IT IS. There is no endpoint:
 * `/api/v1/dashboard?member_id=&owner=` answers 502, so the active record
 * cannot be changed from here yet. The other records are therefore LISTED —
 * which is honest and is itself the missing information — and not given a
 * button that would do nothing. The one action in the panel is the claim flow,
 * which does exist. When the API can take an owner, each row becomes the
 * control; nothing else here has to change.
 */
function OwnerSwitch(
  { p, unclaimed, onSwitchBegin, onSwitchApply, onSwitchCancel }: {
    p: Payload;
    /**
     * NOT CLAIMED HAS NOTHING TO SWITCH TO, so it is not offered the control.
     *
     * The record on screen in that state is the FIXED SAMPLE — one fictional
     * capture, identical for every reader, served by `/api/portfolio?sample=1`
     * and deliberately unrelated to whoever is signed in. Switching is an
     * action on the member's own claimed records, so offering it here would
     * either do nothing to the page in front of them or replace a sample they
     * were told is a sample with somebody's real minerals.
     *
     * THE CHIP ITSELF STAYS. "Mineral Owner: <name>" is a label, not a control
     * — it answers "whose figures am I looking at", which is the one question
     * the sample state most needs answered. Only the button is withheld, and
     * with it the panel: `open` starts false and nothing but that button ever
     * sets it, so the popup below cannot be reached and the
     * `/api/owners/claimed` read it triggers is never made.
     */
    unclaimed: boolean;
    /** the row was pressed — put the loader up before the request goes out */
    onSwitchBegin: (ownername: string) => void;
    /** the service accepted it — re-read the page, resolving when it is ready */
    onSwitchApply: () => Promise<void>;
    /** it did not go through — take the loader down again */
    onSwitchCancel: () => void;
  },
) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLSpanElement>(null);

  /* A click anywhere else, or Escape, closes it — the same contract the
     account menu and the demo state menu in `Chrome` already keep. */
  useEffect(() => {
    if (!open) return undefined;
    const away = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  /**
   * THE LIST IS THE SERVICE'S, NOT THE PAYLOAD'S.
   *
   * This read `p.owner.claimed_owners` — a bare array of names on the dashboard
   * payload, with no lease counts, no counties and no marker for which one is
   * active, so the panel had to assume the active record was `owner.ownername`
   * and could show nothing about the others. `GET /owners/claimed` answers with
   * the whole set and says which is active itself.
   *
   * `member_id` IS NOT SENT FROM HERE. `/api/owners/claimed` reads it from the
   * session on the server, the same way every other member-keyed read in this
   * app resolves it — the cookie is httpOnly, so this component could not send
   * it even if it should, and it should not.
   *
   * FETCHED WHEN THE PANEL OPENS, not on mount: it is one request per reader
   * who actually asks the question, and the chip above it already names the
   * active record from the payload. Asked once and kept, so re-opening the
   * panel does not re-fetch.
   */
  const [rows, setRows] = useState<ClaimedOwner[] | null>(null);
  const [listErr, setListErr] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const asked = useRef(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/owners/claimed', { cache: 'no-store' });
      const body = (await res.json()) as ClaimedResponse;
      if (!res.ok) throw new Error('claimed list failed');
      setRows(Array.isArray(body?.owners) ? body.owners : []);
      setListErr(false);
    } catch {
      setListErr(true);
    }
  }, []);

  useEffect(() => {
    if (!open || asked.current) return;
    asked.current = true;
    void load();
  }, [open, load]);

  /**
   * MAKE THE CLICKED RECORD ACTIVE.
   *
   * The name is what identifies the record to the service — see
   * `/api/owners/active`, which explains why the member id is the session's and
   * not the row's, and why the forward upstream is a `PATCH`.
   *
   * THE LIST IS RE-READ RATHER THAN PATCHED IN PLACE, so the tick moves because
   * the service says it moved and not because this component assumed it would.
   */
  const choose = useCallback(async (ownername: string) => {
    if (saving) return;
    setSaving(ownername);
    /* THE PANEL GOES FIRST, THEN THE LOADER — in that order, and both before
       the request leaves.

       It used to close on the way OUT, after the POST and the list re-read had
       both returned, so the reader pressed a row and the dropdown sat open on
       top of the page for the whole round trip with only a "Making this the
       active record…" line inside it. The press is the decision; the panel has
       nothing left to offer once it is made. */
    setOpen(false);
    onSwitchBegin(ownername);
    try {
      const res = await fetch('/api/owners/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownername }),
      });
      if (!res.ok) { onSwitchCancel(); return; }

      /* THE PANEL'S OWN LIST IS REFRESHED FIRST, and it is cheap — it decides
         which row carries the tick the next time the panel opens. The page
         payload after it is the long one, and it is what the loader is
         covering. */
      await load();

      /* AWAITED. `applySwitch` re-reads the member's payload and resolves when
         it is in state; the loader stays up until it does. Not awaiting this
         is the whole of the defect it replaced — see `applySwitch`. */
      await onSwitchApply();
    } catch {
      /* the row simply stays where it was */
      onSwitchCancel();
    } finally {
      setSaving(null);
    }
  }, [saving, load, onSwitchBegin, onSwitchApply, onSwitchCancel]);

  /* The chip keeps naming the payload's owner until the list arrives, so the
     header does not flicker; once it has, the service's own `is_active` is
     what the panel marks. */
  const active = rows?.find((o) => o.is_active)?.ownername ?? p.owner.ownername;
  const others = (rows ?? []).filter((o) => !o.is_active);

  return (
    <span className="owner-chip mv-ownersw" ref={box}>
      Mineral Owner: <strong>{active}</strong>
      {unclaimed ? null : (
        <button
          type="button" className="sw-btn" aria-expanded={open} aria-haspopup="dialog"
          onClick={() => setOpen((v) => !v)}
        >
          Switch Owner ▾
        </button>
      )}

      {open ? (
        <div className="ownersw-pop" role="dialog" aria-label="Switch the active owner record">
          <h4>Switch the active owner record</h4>
          {/* CUT FROM 183 CHARACTERS TO 92, SAME MEANING.

              What it dropped is the list of examples — "a spouse, a family
              trust, an inherited interest" — which is 61 characters spent
              illustrating a point the rows underneath make by simply being
              there. What it keeps is the only thing a reader needs before
              pressing one: that the choice reaches every page, and which
              pages. */}
          <p className="ownersw-lede">
            Switching changes <strong>which record fills every page</strong> —
            dashboard, leases, map, alerts and reports.
          </p>

          {/* THE LIST SCROLLS, THE PANEL DOES NOT. This account holds eight
              claimed records and the panel grew to 802px against a 720px
              viewport, which put the claim button — the only working control
              in here — below the fold with no scrollbar to suggest it was
              there. Capping the list keeps the heading, the button and the
              seven-day note on screen whatever the account holds. */}
          <div className="ownersw-list">
          {/* THE ACTIVE ROW IS THE ONE THE SERVICE MARKS `is_active`, and its
              figures are that row's own. While the list is still loading it
              falls back to the payload, so the panel opens filled rather than
              blank. */}
          <div className="ownersw-rec is-active">
            <div className="ownersw-name">
              {/* THE NAME IS ITS OWN ELEMENT so the badge can sit beside it.
                  As a bare text node it was an anonymous flex item, which
                  cannot take a `min-width`, so a long record name — "Addison
                  Sidney Tennille Smith" — could not shrink and pushed
                  "✓ Active now" onto a second line. */}
              <span className="ownersw-nm">{active}</span>
              <span className="ownersw-now">✓ Active now</span>
            </div>
            <div className="ownersw-meta">
              <OwnerMeta
                row={rows?.find((o) => o.is_active) ?? null}
                fallbackLeases={p.totals.lease_count}
              />
            </div>
          </div>

          {/* EVERY OTHER CLAIMED RECORD, AND EACH ONE IS A CONTROL NOW. The
              rows used to read "Claimed · waiting its turn" because there was
              no endpoint to switch to them; there is one, so a row does what it
              looks like it does. */}
          {others.length
            ? others.map((o) => (
              <button
                type="button" className="ownersw-rec ownersw-pick" key={o.ownername}
                disabled={saving !== null}
                aria-busy={saving === o.ownername}
                onClick={() => { void choose(o.ownername); }}
              >
                <div className="ownersw-name">{o.ownername}</div>
                <div className="ownersw-meta">
                  {saving === o.ownername
                    ? 'Making this the active record…'
                    : <OwnerMeta row={o} />}
                </div>
              </button>
            ))
            : rows === null && !listErr
              ? (
                /* STILL READING THE LIST — placeholder rows, not a blank panel.
                   The panel opens instantly and the request behind it does not,
                   so a line of text left the reader looking at an empty box and
                   no sign of how much was coming. These are the row's own shape
                   at the row's own height, so nothing moves when the real ones
                   replace them. Three, because that is the commonest number of
                   claimed records — not a measurement of this account's. */
                <div aria-hidden="true">
                  {[0, 1, 2].map((i) => (
                    <div className="ownersw-rec ownersw-skel" key={i}>
                      <div className="ownersw-skel-line ownersw-skel-name" />
                      <div className="ownersw-skel-line ownersw-skel-meta" />
                    </div>
                  ))}
                  <p className="ownersw-empty" role="status">Reading your claimed records…</p>
                </div>
              )
              : (
                <p className="ownersw-empty">
                  {listErr
                    ? 'Your other claimed records could not be read just now.'
                    : 'No other owner records on this account yet — claim one below '
                      + 'and it appears here, ready to switch to.'}
                </p>
              )}
          </div>

          <Link className="ownersw-cta" href="/mineralownersite/claim">
            + Claim another owner record — free
          </Link>
        </div>
      ) : null}
    </span>
  );
}

/** one claimed record, as `GET /api/v1/owners/claimed` returns it */
interface ClaimedOwner {
  ownername: string;
  ownernumber: string | number | null;
  is_active: boolean;
  lease_count: number;
  county_count: number;
  counties: string[];
  claimed_at: string | null;
  /** OPTIONAL BECAUSE THE SERVICE DOES NOT SEND IT YET — see `OwnerMeta`. */
  address?: string | null;
}

interface ClaimedResponse {
  member_id: number | null;
  active: string | null;
  count: number;
  owners: ClaimedOwner[];
}

/**
 * A record's own one-line summary — its address and how many leases it holds.
 *
 * STRAIGHT OFF THE RESPONSE. Both figures are the ROW'S, so a record the page
 * is not currently showing still describes itself correctly; before this, the
 * one row that had a summary borrowed the dashboard's own lease count and
 * counties, which are the ACTIVE record's and belong to no other row.
 *
 * THE ROLL NUMBER AND THE COUNTY LIST ARE GONE, as asked: the row now names the
 * record and says where it is and how big it is, which is what a reader picking
 * between records actually needs. The roll number is an internal key and the
 * counties are a detail the dashboard itself carries once a record is active.
 *
 * THE ADDRESS IS READ BUT THE SERVICE DOES NOT YET SEND IT.
 * `GET /api/v1/owners/claimed` returns exactly `ownername`, `ownernumber`,
 * `is_active`, `lease_count`, `county_count`, `counties` and `claimed_at` —
 * measured, no address field on any row, and no city either. The appraisal-roll
 * SEARCH endpoint does carry `address`, but it answers per owner-and-county
 * rather than per claimed record, so one claimed owner matches many rows there
 * and none of them is "the" address.
 *
 * So this reads `address` off the row and prints it when it is there. Nothing
 * is invented and nothing is fetched twice; the day the endpoint adds the
 * field, the line fills in with no further change here.
 */
function OwnerMeta(
  { row, fallbackLeases }: {
    row: ClaimedOwner | null;
    fallbackLeases?: number;
  },
) {
  const address = row?.address?.trim() || null;
  const leases = row ? row.lease_count : fallbackLeases;
  const hasLeases = typeof leases === 'number';
  if (!address && !hasLeases) return null;
  return (
    <>
      {address ? <>{address}</> : null}
      {address && hasLeases ? ' · ' : null}
      {hasLeases ? <>{n0(leases)} {plural(leases, 'lease')}</> : null}
    </>
  );
}

/* the greeting reads the VIEWER's clock — the only "now" on this page, and the
   only thing here that legitimately is one */
function greetLine(p: Payload, memberFirstName?: string): string {
  const h = new Date().getHours();
  const part = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const day = new Date().toLocaleDateString('en-US',
    { weekday: 'long', day: 'numeric', month: 'long' });
  /* THE READER, NOT THE RECORD.

     This greeted `owner.first_name` — the name on the appraisal roll — which
     is a different person from the one reading the page whenever a member
     claims a record filed under a relative's name, a trust or a company. It
     also read "Good morning, there" in the sample state, because that is what
     `sample.ts` substitutes into the record. The signed-in member's own first
     name comes from the session (`portal-member.ts`, via the context the
     group's layout fills on the server), so the greeting is right in every
     state — including the sample one, where the banner above has already said
     the figures are not theirs.

     THE RECORD IS STILL THE FALLBACK. Nobody is signed in on a shared link or
     a cold visit, and greeting the record is better than greeting no one. */
  const who = memberFirstName || p.owner.first_name;
  return part + (who ? ', ' + who : '') + ' · ' + day;
}

function aroundMeaning(cmp: Payload['activities']['compare_90']): string {
  if (cmp.recent_completions > cmp.prior_completions) {
    return 'The rise is in completions rather than permits, which is the stronger signal: a ' +
      'completed well usually starts filing production within weeks.';
  }
  if (cmp.recent_permits > cmp.prior_permits) {
    return 'The rise is in permits — intent to drill rather than a well yet. Worth watching, ' +
      'not yet worth expecting.';
  }
  if ((cmp.change_pct ?? 0) < -20) {
    return 'A quieter quarter nearby says nothing about your own leases, which file on their own ' +
      'schedule.';
  }
  return 'Neither permits nor completions moved much, so nothing has changed around this acreage.';
}

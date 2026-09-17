'use client';
/**
 * The plan messaging: the funnel bar and the per-state card.
 *
 * Both were in the redesign and both were missing from this build, so the five
 * account states changed the numbers on the page but never said what the state
 * MEANT or what to do about it. The copy below is the redesign's own, with the
 * lease count and the dates read from the live payload instead of hardcoded.
 *
 * `#mvFunnelBar` and `#mvStateCard` are the prototype's own ids and are already
 * styled, per state, in `mvfunnelstates.css` — including the colour change
 * (blue for free, green for trial, amber for lapsed) and the display gate that
 * hides both in the states where they do not belong. Nothing here re-styles
 * them; it supplies the markup they were written for.
 *
 * THE TRIAL DAY IS DERIVED, NOT HARDCODED. The redesign fixed it at day 3 so
 * the mockup always showed the moment the ask lands best. That would freeze
 * "4 days left" forever, so the trial's start is stamped when the state is
 * first switched to `trial` and the day is counted from it — the same rule the
 * rest of this build follows for dates.
 */
import React from 'react';
import Link from 'next/link';
import type { Payload } from '../../_lib/reference/payload';
import { plural } from '../../_lib/reference/fmt';
import type { FunnelKey, Route } from './Portal';

export const TRIAL_LEN = 7;
export const LEASE_LOCK_DAYS = 7;
const PRICE = '$99.99/mo';

/**
 * WHERE A PLAN QUESTION GOES — the plan ladder, which is a real page.
 *
 * TWO CONTROLS, ONE WRONG DESTINATION EACH.
 *
 * "Restore full access" called `setFunnel('paid')`, which is the demo menu's
 * own switch: pressing the one button a lapsed reader is offered silently
 * relabelled the account "Paid" and unlocked every figure on the page without a
 * plan, a price or a payment ever being shown. That is the prototype
 * demonstrating its five states; on a build a real member signs into, it is an
 * entitlement granted by a click.
 *
 * The secondary link — "What the trial includes" on the free plan, "Compare
 * plans" on trial, "What I am missing" once lapsed — opened `drawers.value`,
 * whose title is "Your value — how it is built". That panel explains how the
 * VALUATION is computed. It is a good panel and it answers a different
 * question: all three labels ask what a plan gets you, and none of them is
 * about the estimate.
 *
 * `/pricing#plans` is the page that answers both. It is this app's own plan
 * ladder, it is where `upgradeHref` in `lib/entitlements.ts` already sends
 * every other upgrade prompt, and `#plans` is a real anchor on it — so the
 * reader lands on the comparison rather than at the top of a marketing page.
 */
const PLANS_HREF = '/pricing#plans';

/** how far into the trial we are, counted from the stamp the Portal writes */
export function trialDay(startedIso: string | null): number {
  if (!startedIso) return 0;
  const started = new Date(startedIso).getTime();
  if (!Number.isFinite(started)) return 0;
  const days = Math.floor((Date.now() - started) / 86400000);
  return Math.max(0, Math.min(TRIAL_LEN, days));
}

interface Props {
  p: Payload | null;
  funnel: FunnelKey;
  trialStarted: string | null;
  go: (r: Route, params?: Record<string, string | null>) => void;
  open: (k: string) => void;
  setFunnel: (f: FunnelKey) => void;
}

/* ============================================================ the top bar */
export function FunnelBar({ p, funnel, open }: Props) {
  const n = p?.totals.lease_count ?? 0;

  let tag: string | null = null;
  let msg: React.ReactNode = null;
  let cta: string | null = null;
  let snd: string | null = null;
  /**
   * WHERE THE SECONDARY LINK GOES.
   *
   * It used to be one expression for all five states —
   * `open(funnel === 'unclaimed' ? 'identity' : 'value')` — so "What the trial
   * includes", "Compare plans" and "What I am missing" every one of them opened
   * "Your value — how it is built". Three different questions, one answer, and
   * none of them the one asked (defect sheet row 30).
   *
   * THE LINK NOW CARRIES ITS OWN TARGET, set beside its own label so the two
   * cannot drift apart again. Every state that asks a PLAN question goes to
   * `PLANS_HREF`; `unclaimed` keeps the identity drawer, because "is this
   * really me" is a question about the record and a panel is the right answer.
   */
  let sndHref: string | null = null;
  /** set instead of `onCta` when the CTA is a destination rather than a switch */
  let ctaHref: string | null = null;

  /* CLAIMED · FREE CARRIES NO BANNER (defect #26).
     It used to open with "Your record is claimed — all N of your leases are
     here and stay here ... Try all of it free for 7 days", a trial CTA and a
     "What the trial includes" link, pinned above every portal route. QA asked
     for the text and both buttons to go, and the reason holds: a reader who
     has just claimed is being sold to before they have seen what they claimed,
     on every page, with no way to dismiss it. The upgrade path is not lost —
     the account menu and the plans page both carry it, and `PLANS_HREF` is
     still one click from the chrome.

     `paid` and `unclaimed` already returned null here, for the reasons the
     note below gives; `claimed` now joins them.

     TRIAL CARRIES NO BANNER EITHER, and it went the way `claimed`'s did: QA
     boxed the whole message — "7 days left … this is the full Premium plan …
     Keep it for $99.99/mo" — and asked for the text to go. The same argument
     holds: a reader who has just started the trial is being sold to on every
     route for all seven days, and the day count, the plan contents and the
     upgrade are all still one click away — `#mvStateCard` on the Dashboard
     says all of it, and the account menu and `/pricing#plans` carry the
     upgrade. That leaves `lapsed` as the only state with a bar — the one
     where something the reader had has actually stopped. */
  if (funnel === 'lapsed') {
    tag = 'Trial ended';
    cta = 'Restore full access';
    snd = 'What I am missing';
    sndHref = PLANS_HREF;
    /* RESTORING ACCESS IS A PAYMENT, SO IT GOES WHERE PAYMENTS LIVE.
       This called `setFunnel('paid')`, which silently re-dressed the page as a
       paid account without asking for anything — the reader pressed "Restore
       full access" and the values simply appeared (defect sheet row 49).
       `/pricing#plans` is this app's own plan ladder and the destination
       `upgradeHref` in `lib/entitlements.ts` already uses for every other
       upgrade prompt, so the reader lands on the comparison rather than on a
       placeholder. The demo's own way of reaching the paid state is untouched —
       the account-state menu in the top bar still switches to it directly,
       which is what that menu is for. */
    ctaHref = PLANS_HREF;
    msg = (
      <>
        {/* IT NO LONGER CLAIMS TO BE THE FREE PLAN. The banner said "so your
            account is on the free plan" while this state covers the value
            figures on a record that a genuinely free — claimed — account shows
            in the clear, which is the contradiction on defect sheet row 23.
            Both states now mask the same one thing (see `.cl-lock` in the
            overrides sheet), and this sentence says what lapsed actually is
            rather than borrowing another state's name for it. */}
        Your <b>Premium</b> trial has ended, so your portfolio totals are on hold.{' '}
        <b>One lease stays fully live</b> — pick which below. Your other{' '}
        {Math.max(0, n - 1)} {plural(Math.max(0, n - 1), 'lease')} and their values are on hold,
        and nothing has been deleted.
      </>
    );
  }

  /* `paid`, `unclaimed` AND `claimed` GET NO BANNER, for three reasons.
     `paid` has nothing to sell and nothing on hold, and a bar that says
     "everything is fine" is one the reader learns to skip. `unclaimed` already
     carries the claim message twice — the pinned bar line and the claim rail at
     the top of the dashboard. `claimed` was removed at QA's request; see the
     note above the `trial` branch. */
  if (!tag) return null;

  return (
    <div id="mvFunnelBar" role="status">
      <span className="fb-tag">{tag}</span>
      <span className="fb-msg">{msg}</span>
      {/* THE ACTION GROUP ONLY EXISTS WHERE THERE IS AN ACTION.

          The free plan no longer offers anything to press (see the `claimed`
          branch above), and `.fb-act` is a flex item with its own gap and, at
          640px, `width: 100%` — so rendered empty it would take a row of the
          banner and push the message off it on a phone. Each control is also
          gated on its own label, so a state can carry one without the other. */}
      {cta || snd
        ? (
          <span className="fb-act">
            {/* A LINK WHEN IT NAVIGATES, A BUTTON WHEN IT DOES NOT — so a
                middle-click, a modified click and the browser's own status bar
                all behave the way the destination deserves. */}
            {/* the one remaining CTA navigates (`ctaHref`); the button branch
                went with the trial banner, whose `setFunnel` switch was its
                only caller */}
            {cta && ctaHref
              ? <Link className="fb-cta btn btn-sm" href={ctaHref}>{cta}</Link>
              : null}
            {/* THE SECONDARY LINK IS A PLAN QUESTION IN EVERY STATE THAT SETS
                `sndHref` — see the note beside its declaration. `unclaimed` is
                the one that is not, and it keeps the identity drawer. */}
            {snd
              ? (sndHref
                ? <Link className="linklike fb-2nd" href={sndHref}>{snd}</Link>
                : (
                  <button
                    type="button" className="linklike fb-2nd"
                    onClick={() => open(funnel === 'unclaimed' ? 'identity' : 'value')}
                  >
                    {snd}
                  </button>
                ))
              : null}
          </span>
        )
        : null}
    </div>
  );
}

/* ====================================================== the dashboard card */
/**
 * The same state, said on the route the banner's link actually opens.
 *
 * Ultra's contract is one status and one action, so the supporting sentences
 * and the secondary link carry `.hide-u` — the state still reads at Ultra
 * length rather than dropping a five-sentence card onto a one-number page.
 */
export function StateCard({ p, funnel, trialStarted, setFunnel, go }: Props) {
  const n = p?.totals.lease_count ?? 0;
  const day = trialDay(trialStarted);
  const left = Math.max(0, TRIAL_LEN - day);

  if (funnel === 'claimed') {
    return (
      <div id="mvStateCard">
        <h4>Your record is claimed — all {n} {plural(n, 'lease')} {n === 1 ? 'is' : 'are'} yours</h4>
        <span className="hide-u">
          Everything on your record is open: every lease, its wells, whether it is producing, and
          the permits and completions happening around it. We watch all of it for you on the free
          plan and nothing here expires.{' '}
        </span>
        <b>What each lease is worth to you</b> is the one figure still covered up, together with
        your weekly report, the owner community and the monthly production report printed and
        mailed. Those are Premium, and you can have all of them free for {TRIAL_LEN} days.
        <div className="sc-row">
          <a role="button" tabIndex={0} onClick={() => setFunnel('trial')}
            onKeyDown={(e) => { if (e.key === 'Enter') setFunnel('trial'); }}>
            Start my {TRIAL_LEN}-day free trial
          </a>
          <a className="ghost hide-u" role="button" tabIndex={0} onClick={() => go('activities')}
            onKeyDown={(e) => { if (e.key === 'Enter') go('activities'); }}>
            See what is happening around them →
          </a>
        </div>
      </div>
    );
  }

  if (funnel === 'trial') {
    return (
      <div id="mvStateCard">
        <h4>
          Day {day} of your {TRIAL_LEN}-day <b>Premium</b> trial · {left} {plural(left, 'day')} left
        </h4>
        You are on the full Premium plan, not a cut-down one — all {n} {plural(n, 'lease')}, the
        value on each, the owner community, your weekly report, and the monthly production report
        printed and mailed. <span className="hide-u">Nothing on this screen is a preview. </span>
        When the trial ends, one lease stays live and the rest go on hold.
        <div className="sc-row">
          <a role="button" tabIndex={0} onClick={() => setFunnel('paid')}
            onKeyDown={(e) => { if (e.key === 'Enter') setFunnel('paid'); }}>
            Upgrade to Premium — {PRICE}
          </a>
          <a className="ghost hide-u" role="button" tabIndex={0} onClick={() => go('alerts')}
            onKeyDown={(e) => { if (e.key === 'Enter') go('alerts'); }}>
            See everything you have →
          </a>
        </div>
      </div>
    );
  }

  if (funnel === 'lapsed') {
    return (
      <div id="mvStateCard">
        <h4>Your trial has ended — one lease stays live</h4>
        Nothing has been deleted. {Math.max(0, n - 1)} of your {n} {plural(n, 'lease')} and your
        portfolio totals are on hold, and the value figures below are covered for that reason.{' '}
        <span className="hide-u">
          You can change which lease is live once every {LEASE_LOCK_DAYS} days.
        </span>
        <div className="sc-row">
          {/* same destination as the bar's own CTA — see `PLANS_HREF` */}
          <Link href={PLANS_HREF}>Restore full access</Link>
          <a className="ghost hide-u" role="button" tabIndex={0} onClick={() => go('activities')}
            onKeyDown={(e) => { if (e.key === 'Enter') go('activities'); }}>
            What is still watched →
          </a>
        </div>
      </div>
    );
  }

  return null;
}

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
import type { Payload } from '../../_lib/reference/payload';
import { plural } from '../../_lib/reference/fmt';
import type { FunnelKey, Route } from './Portal';

export const TRIAL_LEN = 7;
export const LEASE_LOCK_DAYS = 7;
const PRICE = '$99.95/mo';

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
  go: (r: Route) => void;
  open: (k: string) => void;
  setFunnel: (f: FunnelKey) => void;
}

/* ============================================================ the top bar */
export function FunnelBar({ p, funnel, trialStarted, setFunnel, open }: Props) {
  const n = p?.totals.lease_count ?? 0;
  const day = trialDay(trialStarted);
  const left = Math.max(0, TRIAL_LEN - day);

  let tag: string | null = null;
  let msg: React.ReactNode = null;
  let cta: string | null = null;
  let snd: string | null = null;
  let onCta: (() => void) | null = null;

  if (funnel === 'claimed') {
    tag = 'Free plan';
    cta = `Start my ${TRIAL_LEN}-day free trial`;
    snd = 'What the trial includes';
    onCta = () => setFunnel('trial');
    msg = (
      <>
        Your record is claimed — <b>all {n} of your {plural(n, 'lease')}</b> are here and stay
        here. What each one is <b>worth to you</b> is the part Premium adds, along with your weekly
        report, the owner community and the monthly production report printed and mailed.{' '}
        <b>Try all of it free for {TRIAL_LEN} days.</b>
      </>
    );
  } else if (funnel === 'trial') {
    tag = 'Premium trial';
    cta = 'Upgrade to Premium';
    snd = 'Compare plans';
    onCta = () => setFunnel('paid');
    msg = (
      <>
        <b>{left} {plural(left, 'day')} left</b>{' '}
        <span className="fb-pips" aria-hidden="true">
          {Array.from({ length: TRIAL_LEN }, (_, i) => (
            <i key={i} className={i < day ? 'spent' : ''} />
          ))}
        </span>{' '}
        — this is <b>the full Premium plan</b>: all {n} of your {plural(n, 'lease')}, the value on
        each, the owner community, your weekly report and the monthly mailed report. Keep it for{' '}
        <b>{PRICE}</b>.
      </>
    );
  } else if (funnel === 'lapsed') {
    tag = 'Trial ended';
    cta = 'Restore full access';
    snd = 'What I am missing';
    onCta = () => setFunnel('paid');
    msg = (
      <>
        Your <b>Premium</b> trial has ended, so your account is on the free plan.{' '}
        <b>One lease stays fully live</b> — pick which below. Your other{' '}
        {Math.max(0, n - 1)} {plural(Math.max(0, n - 1), 'lease')} and their values are on hold,
        and nothing has been deleted.
      </>
    );
  }

  /* NEITHER `paid` NOR `unclaimed` GETS A BANNER, for opposite reasons.
     `paid` has nothing to sell and nothing on hold, and a bar that says
     "everything is fine" is one the reader learns to skip. `unclaimed` already
     carries the claim message twice — the pinned bar line and the claim rail at
     the top of the dashboard — and `mvfunnelstates.css` reveals #mvFunnelBar
     only in claimed/trial/lapsed anyway, so a third copy would be markup that
     never paints. */
  if (!tag) return null;

  return (
    <div id="mvFunnelBar" role="status">
      <span className="fb-tag">{tag}</span>
      <span className="fb-msg">{msg}</span>
      <span className="fb-act">
        <button type="button" className="fb-cta btn btn-sm" onClick={() => onCta?.()}>
          {cta}
        </button>
        <button
          type="button" className="linklike fb-2nd"
          onClick={() => open(funnel === 'unclaimed' ? 'identity' : 'value')}
        >
          {snd}
        </button>
      </span>
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
          <a role="button" tabIndex={0} onClick={() => setFunnel('paid')}
            onKeyDown={(e) => { if (e.key === 'Enter') setFunnel('paid'); }}>
            Restore full access
          </a>
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

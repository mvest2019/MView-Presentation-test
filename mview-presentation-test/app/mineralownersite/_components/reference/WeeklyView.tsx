'use client';
/**
 * The Weekly Report — following `owner/src/routes/app-briefing.html` from the
 * redesign build, which is the full version of this screen. The earlier pass
 * followed `lock-weekly.html`, the locked marketing preview, and so missed
 * most of it.
 *
 * WHAT THE REFERENCE HAS THAT THIS NOW HAS, and the reasoning it ships with:
 *
 * · THE PAGE RAIL (`.wr-rail`) — "the report gets the OPERATOR_SETUP model:
 *   ONE visible path… five numbered pages plus the monthly and the archive,
 *   each with its minute mark, so the reader always knows where they are and
 *   how much deeper it goes." Navigation, not content, so `wr-noprint`.
 *
 * · NO EXECUTIVE SUMMARY CARD. The reference deleted it at v49 and says why:
 *   "it restated the cover's four verdicts word for word, one screen above
 *   them… A number repeated in three places is not emphasis, it is noise."
 *   The COVER is the executive summary. My first pass had both.
 *
 * · THE NEXT-STATEMENT BAND (`.wr-est`) — the number the report is opened for,
 *   given as a range with every reason it is a range travelling with it.
 *
 * · PAGE 2 RANKED BY DRIFT FROM EXPECTED, with a total row and a table that
 *   never truncates. This is the centre of the whole report and it needed a
 *   source: `ARPS_potential` in the decline collection, which carries the
 *   model's own month-by-month curve. See sources/decline.ts.
 *
 * · THE DATED CALENDAR, the price drivers each with a public `.src-chip`
 *   source, the MONTHLY keeper, and the ARCHIVE.
 *
 * The CSS is the reference's own, scoped to `section[data-route="app-briefing"]`
 * exactly as it is there — see section 10 of app.css.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { WeeklyReport, Verdict, WeeklyBar } from '../../_lib/reference/weekly';
import { n0, nShort, pctS, plural } from '../../_lib/reference/fmt';
import { Band, ProductPair } from './bits';
import type { ViewProps } from './Dashboard';
import { usePortalMember } from '../portal-session';

const MARK: Record<Verdict, string> = { good: '✓', watch: '⚑', flag: '⚑', quiet: '·' };
const CHIP: Record<Verdict, string> = {
  good: 'chip-mint', watch: 'chip-est', flag: 'chip-est', quiet: 'chip-slate',
};

/**
 * ONE BUTTON, NO FORM.
 *
 * "Email me this report" used to expand a panel — an address field, a second
 * button, and a line about what the build could send with — and the reader had
 * to cross all three to get the thing the button already named. The panel is
 * gone: the control sends, to the address the account registered, on the first
 * click.
 *
 * SO THE STATE IS THE THREE THINGS A SEND HAS: who it goes to, whether one is
 * in flight, and what came back. `open` and `toAuto` went with the panel —
 * there is nothing to open and nothing to type over. `transport` /
 * `transportNote` went with it too: both existed ONLY to label the panel's
 * button and print its note, and the answer they carried is in the POST's own
 * `detail` verbatim, which the result notice already prints. Keeping the
 * capability request would have been a round trip per page load for a sentence
 * with nowhere left to go.
 */
interface MailState {
  to: string;
  busy: boolean;
  result: null | {
    sent: boolean; detail?: string; subject?: string; text?: string; reason?: string;
    to?: string; transport?: string;
  };
}

/**
 * THE REGISTERED ADDRESS, WHEREVER THIS BUILD KEEPS IT.
 *
 * The brief asks for "the registered email ID from sessionStorage (the email
 * stored after login)". Nothing in this app writes one there today — login
 * stores the member in the httpOnly `mv_user` cookie (`lib/session.ts`), which
 * is deliberate: page JavaScript cannot read or forge it. The portal layout
 * hands the four printable fields of that cookie to the client through
 * `PortalSessionProvider`, and `email` is one of them, so the registered
 * address IS available here — it just arrives by context rather than by
 * storage.
 *
 * So both are read, storage first. If a later change does write the address at
 * login, this picks it up with no further edit; until then the session context
 * answers, and the field is never left empty for a signed-in reader. The keys
 * are the plausible spellings rather than one guess, because a miss here is a
 * silently blank field.
 */
const EMAIL_KEYS = ['mvEmail', 'mv_email', 'mvUserEmail', 'userEmail', 'email'];

function storedEmail(): string {
  if (typeof window === 'undefined') return '';
  for (const store of [window.sessionStorage, window.localStorage]) {
    try {
      for (const k of EMAIL_KEYS) {
        const v = store?.getItem(k);
        if (!v) continue;
        /* the value may be the address itself or a JSON record holding one */
        const one = v.trim().startsWith('{')
          ? (() => {
              try {
                const o = JSON.parse(v) as Record<string, unknown>;
                const hit = ['email', 'email_id', 'emailId'].find((f) => typeof o[f] === 'string');
                return hit ? String(o[hit]) : '';
              } catch { return ''; }
            })()
          : v;
        if (one && one.includes('@')) return one.trim();
      }
    } catch { /* private mode — the session context is the answer */ }
  }
  return '';
}

export default function WeeklyView({ p, tier, funnel, sample, open, go }: ViewProps) {
  const r = p.weekly;
  const member = usePortalMember();
  const [mail, setMail] = useState<MailState>({ to: '', busy: false, result: null });

  const unclaimed = funnel === 'unclaimed';
  const pageOf = (n: number) => r.pages.find((x) => x.n === n) ?? null;
  const explainFor = (n: number) => r.explains.find((x) => x.page === n) ?? null;
  /* THE RAIL IS THE PAGES THAT ARE ACTUALLY THERE. `rail` comes from the
     service and always names the archive; the not-claimed report does not
     render one — see the archive block at the foot of this component — and a
     rail row pointing at an anchor that does not exist is a control that
     silently does nothing. Filtered here rather than in the payload, so the
     claimed report is untouched. */
  const railItems = unclaimed ? r.rail.filter((it) => it.id !== 'wrArchive') : r.rail;
  /* THE MINUTE MARKS ARE THE REPORT'S OWN, not four numbers typed into this
     file. Every evidence page printed one — "4 min", "5 min", "5 min", "4 min"
     — while `rail[].minutes` carried the same four from the service, so a
     report the service re-timed would have gone on showing the old figure
     beside a rail that had moved. One lookup, keyed on the anchor each page
     already has; the fallback keeps the reference's own number if a rail row
     ever stops being sent. */
  const minutesFor = (id: string, fallback: number) =>
    r.rail.find((it) => it.id === id)?.minutes ?? fallback;

  /* WHERE THE REPORT GOES, resolved before anyone presses anything.
     With the address field gone this is the only answer to "to whom", so it is
     read on mount and again if the session lands late — see `storedEmail` above
     for the two places it is read from and why. It is the address the account
     registered, which is what "Email ME this report" says on the button. */
  useEffect(() => {
    const known = storedEmail() || member?.email || '';
    if (!known) return;
    setMail((m) => (m.to === known ? m : { ...m, to: known }));
  }, [member?.email]);

  /* A SHARED LINK HAS TO LAND.
     `/weekly#wrPage2` is the point of using anchors, but the page is rendered
     on the client, so the browser tries to scroll to the target before it
     exists and gives up. Measured: the hash was set, the element was 1,726px
     down, and the window never moved. Once the report is on screen, the hash
     is honoured. In-page clicks need none of this — the element is there by
     then. */
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id) return;
    /* TWICE, NOT ONCE. The report is 13,700px of charts and tables, and the
       first attempt at 60ms landed 79px down because the layout was still
       settling — the target had not reached its final offset yet. A second
       pass once it has is the difference between landing on the page and
       landing near the top of the document. */
    const go = () => document.getElementById(id)?.scrollIntoView({ block: 'start' });
    const a = window.setTimeout(go, 80);
    const b = window.setTimeout(go, 600);
    return () => { window.clearTimeout(a); window.clearTimeout(b); };
  }, [r.week_ending_iso]);

  const qs = useMemo(() => {
    const u = new URLSearchParams();
    if (p.owner.ownername) u.set('owner', p.owner.ownername);
    if (p.owner.ownernumber != null) u.set('num', String(p.owner.ownernumber));
    if (p.owner.districtcode) u.set('dist', p.owner.districtcode);
    if (unclaimed) u.set('sample', '1');
    return u.toString();
  }, [p.owner, unclaimed]);

  /**
   * SENDING IT — AND WHY NO REPORT HTML IS IN THIS BODY.
   *
   * The contract already exists, at two levels, and neither of them takes a
   * document:
   *
   *   this app   POST /api/weekly/email      {to, owner, num, dist, sample}
   *   upstream   POST /api/v1/weekly/email   {member_id, to}
   *
   * `member_id` is NOT sent from here and must not be: it lives in the
   * httpOnly `mv_user` cookie, page JavaScript cannot read it, and the route
   * handler resolves it per request through `currentMemberTarget()`. That is
   * the stronger arrangement — a member id posted by the browser is an id the
   * browser could change, which is one edited request away from mailing
   * somebody else's report to an address of your choosing. So the id travels
   * with the session and reaches the service on the server's side of the wire,
   * exactly as `sendWeeklyEmail()` sends it.
   *
   * POSTING THE RENDERED HTML WAS CONSIDERED AND IS THE WRONG SHAPE HERE.
   * The service renders and sends the report itself from the same 15-minute
   * `/api/v1/weekly` snapshot this screen was drawn from, so the message
   * already carries the current dynamic data — there is nothing a posted
   * document would add, and three things it would cost: a second renderer of
   * the same report with nothing keeping the two in step (the argument
   * `../../../api/weekly/route.ts` already makes about the download), a mail
   * body the browser controls end to end, and an invented request shape the
   * service does not accept. The one case that genuinely cannot be served by
   * the member's own report is the NOT-CLAIMED sample, which is this app's
   * transform of the payload and unknown upstream — and that case already
   * renders locally, behind `sample`, in the route handler.
   */
  const send = useCallback(async () => {
    /* NO ADDRESS IS ANSWERED HERE, not by the route. Signed out there is no
       registered address to send to, and posting an empty `to` only spends a
       request to be told "bad address" — a sentence written for a reader who
       mistyped one, which this reader did not. */
    const to = mail.to.trim();
    if (!to) {
      setMail((m) => ({
        ...m,
        result: {
          sent: false,
          detail: 'Nothing was sent: this account has no email address on it to send to. '
            + 'Sign in and press this again, or use "Download the report" to keep a copy.',
        },
      }));
      return;
    }
    setMail((m) => ({ ...m, busy: true, result: null }));
    try {
      const res = await fetch('/api/weekly/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to,
          owner: p.owner.ownername,
          num: p.owner.ownernumber != null ? String(p.owner.ownernumber) : undefined,
          dist: p.owner.districtcode ?? undefined,
          sample: unclaimed,
        }),
      });
      const d = await res.json() as MailState['result'];
      setMail((m) => ({ ...m, busy: false, result: d }));
    } catch (e) {
      setMail((m) => ({
        ...m, busy: false,
        result: { sent: false, detail: e instanceof Error ? e.message : String(e) },
      }));
    }
  }, [mail.to, p.owner, unclaimed]);

  return (
    <section data-route="app-briefing" className="active">

      {/* ---------- SAMPLE PREVIEW: NOT CLAIMED only ----------

          ONE BANNER, AND THE REPORT BELOW IT IS THE PAID REPORT — the
          Dashboard's own arrangement, and the same `.smp-badge` / `.smp-tag`
          pair it, Alerts, Activities and Production & Forecast already carry.
          It replaces the `mv-claimrail` that used to sit here: that rail had
          its own kicker, headline, sub-copy and full-width CTA, which
          re-arranged the top of the report so the state a visitor is being
          shown looked like a different product rather than like the thing they
          get by claiming — the one job this state has.

          THE CLAIM CONTROL SURVIVES THE SWAP, and it had to. The rail was this
          report's ONLY route into the identity flow (`open('identity')`), so
          dropping it wholesale would have cost the page its one conversion
          path and left a visitor who wanted to act with nowhere on the report
          to do it. It moves into the banner at `btn-sm` instead of leading a
          block of its own: the report below reads exactly as the paid one
          does, and the offer is still one click away.

          TWO LINES, FULL WIDTH, exactly as the Dashboard sets it. The shared
          rule is a `flex` ROW, so the pill takes a column and the copy wraps in
          what is left of it; the column direction is set here, inline on this
          one banner, so the class stays the one My Leases and the other routes
          share. */}
      {unclaimed
        ? (
          <div
            className="smp-badge wr-noprint" id="sampleBadge"
            style={{ flexDirection: 'column', alignItems: 'stretch', flexWrap: 'nowrap', gap: 6 }}
          >
            <span className="smp-tag" style={{ alignSelf: 'flex-start' }}>SAMPLE PREVIEW</span>
            {/* `maxWidth: none` lifts the shared 78ch readability cap on this
                one banner and nowhere else — the same lift, for the same
                reason, that the Dashboard's and Production's banners make. */}
            <p style={{ maxWidth: 'none' }}>
              <strong>This is what your weekly report looks like once you claim your
              record.</strong>{' '}
              It is the <strong>whole report, not a teaser</strong> — the dates, the filings and
              the prices are the real public record. Every figure below belongs to{' '}
              <strong>{p.owner.ownername}, a fictional sample owner</strong>. Claiming is free,
              takes about two minutes, and never changes legal ownership.
            </p>
            <span style={{ alignSelf: 'flex-start' }}>
              <button
                className="btn btn-primary btn-sm" type="button"
                onClick={() => open('identity')}
              >
                Claim your record — free, no obligation
              </button>
            </span>
          </div>
        )
        : null}

      <Band tier={tier} to="ultra">
        <div className="ultra-hero tier-u nc-keep wr-noprint">
          <div className="u-dot" aria-hidden="true" />
          <p className="u-kicker">Week ending {r.week_ending_label}</p>
          <h2 className="u-headline">
            {r.quiet ? <>You&rsquo;re <strong>earning as expected</strong></> : <><strong>Something moved</strong></>}
          </h2>
          <p className="u-status">{r.headline}</p>
          <div>
            <a className="btn btn-primary btn-lg" href="#wrPage2">What each lease posted</a>
          </div>
          <p className="u-note">{r.bottom_line}</p>
        </div>
      </Band>

      <Band tier={tier} from="simple">
        {/* ------------------------------------- the title and the two buttons */}
        <div className="between wr-noprint" style={{ flexWrap: 'wrap', marginBottom: 8 }}>
          <div>
            <h2 style={{ fontSize: 24, margin: 0 }}>Weekly Mineral Owner Report</h2>
            <p className="small muted" style={{ margin: '3px 0 0' }}>
              Week ending {r.week_ending_label} · {r.owner_record} · delivered Saturday morning ·
              about a {r.read_minutes}-minute read, and the cover alone is{' '}
              {minutesFor('wrPage1', 2)}
            </p>
          </div>
          <div className="flex" style={{ flexWrap: 'wrap', gap: 6 }}>
            {/* ADAPTED · "Print / Save as PDF" and "The filings (CSV)" were
                removed at the owner's request. "Download the report" still
                serves the same standalone HTML the print button rendered, and
                `/api/weekly?format=csv` is untouched — only the two controls
                are gone, not the routes behind them. */}
            {/* IT SENDS. It used to open a panel that asked for an address and
                carried its own send button — three steps for a control whose
                label is already the whole instruction. The address is the one
                on the account (see the effect above), so the first click is the
                send; the answer appears below the promise line, where the panel
                used to be. Disabled only while one is in flight, so a second
                click cannot post a second copy. */}
            <button
              className="btn btn-ghost btn-sm" type="button"
              onClick={send}
              disabled={mail.busy}
            >
              {mail.busy ? 'Sending…' : 'Email me this report'}
            </button>
            <a className="btn btn-ghost btn-sm" href={`/api/weekly?format=html&dl=1&${qs}`}>
              Download the report
            </a>
          </div>
        </div>

        {/* ---------------------------------------------------- THE PAGE RAIL */}
        {/* REAL ANCHORS, NOT SCRIPTED SCROLLS.
            The rail was `<button onClick={scrollIntoView}>`, copying the
            reference's `wrGo()`. Anchors are better here for three reasons that
            have nothing to do with taste: they work before the JavaScript
            loads, a keyboard and a screen reader already know what a link to a
            section is, and `/weekly#wrPage2` becomes a place you can send
            someone. `scroll-margin-top` on the pages keeps the sticky header
            off the heading. */}
        <nav className="wr-rail wr-noprint" aria-label="Report pages">
          {railItems.map((it) => (
            <a key={it.id} href={'#' + it.id}>
              <span className="rl-n">{it.mark}</span>
              <span className="rl-t">{it.title}</span>
              <span className="rl-s">{it.sub} · {it.minutes} min</span>
            </a>
          ))}
        </nav>

        {/* ---------------------------------------------------- the promise */}
        <div className="notice slate wr-noprint">
          <div>☕ {r.promise}</div>
        </div>

        {/* ----------------------------------------------- what the send said

            THE ANSWER, AND NOTHING ELSE. This is all that is left of the
            mailer panel that used to stand here: the address field, its send
            button and the transport note went with the one-click send above,
            and what remains is the one part of that panel a reader still needs
            — whether the report went, and where.

            A send the reader cannot tell succeeded is a send they make twice,
            so the success case is marked three ways: the mint notice, a tick,
            and the address it actually went to, read off the RESPONSE
            (`result.to`) rather than off local state, so the line names what
            the server accepted. `role="status"` is what carries the same
            sentence to a screen reader, which is the one reader for whom a
            colour and a tick are nothing at all — and it matters more now that
            pressing the button no longer opens anything visible.

            THE CANNOT-SEND FALLBACK IS KEPT INTACT. When the build has no
            transport the route answers with the rendered message instead of
            claiming a send, and the three controls under it — open in your
            mail app, copy, download to attach — are what make that answer
            useful rather than merely honest. */}
        {mail.result
          ? (
            <div
              className={'notice wr-noprint ' + (mail.result.sent ? 'mint' : '')}
              role="status" aria-live="polite"
            >
              <div>
                <strong>
                  {mail.result.sent
                    ? `✓ Sent — the report is on its way to ${mail.result.to || mail.to}.`
                    : 'Nothing was sent.'}
                </strong>
                {mail.result.sent
                  ? (
                    <p className="small" style={{ margin: '4px 0 0' }}>
                      Week ending {r.week_ending_label}. It can take a minute or two to
                      arrive — check the spam folder if it does not.
                    </p>
                  )
                  : null}
                {mail.result.subject
                  ? <p className="small" style={{ margin: '4px 0 0' }}>Subject: {mail.result.subject}</p>
                  : null}
                {mail.result.detail
                  ? <p className="small" style={{ margin: '4px 0 0' }}>{mail.result.detail}</p>
                  : null}
                {!mail.result.sent && mail.result.text
                  ? (
                    <>
                      <div className="flex" style={{ flexWrap: 'wrap', gap: 6, marginTop: 9 }}>
                        <a
                          className="btn btn-primary btn-sm"
                          href={`mailto:${encodeURIComponent(mail.to)}`
                            + `?subject=${encodeURIComponent(mail.result.subject ?? '')}`
                            + `&body=${encodeURIComponent(mail.result.text.slice(0, 1800))}`}
                        >
                          Open it in your mail app
                        </a>
                        <button
                          className="btn btn-ghost btn-sm" type="button"
                          onClick={() => { void navigator.clipboard?.writeText(mail.result?.text ?? ''); }}
                        >
                          Copy the message
                        </button>
                        <a className="btn btn-ghost btn-sm" href={`/api/weekly?format=html&dl=1&${qs}`}>
                          Download it to attach
                        </a>
                      </div>
                      <pre className="wm-pre">{mail.result.text}</pre>
                    </>
                  )
                  : null}
              </div>
            </div>
          )
          : null}

        {/* ==================================================== PAGE 1 · cover
            The cover IS the executive summary — see the note at the top of this
            file. There is no summary card above it any more. */}
        <div className="wr-page" id="wrPage1">
          <div className="wr-head">
            <div>
              <div className="section-label">Weekly Mineral Owner Report</div>
              <div className="small muted">Week ending {r.week_ending_label}</div>
            </div>
            <div className="right small muted">
              {r.lease_count} {plural(r.lease_count, 'lease')} ·{' '}
              {r.counties.join(', ') || 'Texas'}
              <br />
              covering {r.window_label}
            </div>
          </div>

          <h2 style={{ margin: '0 0 4px', fontSize: 26 }}>{r.owner_first}, here&rsquo;s your week.</h2>
          <p className="small muted" style={{ margin: '0 0 10px' }}>
            Owner record {r.owner_record} · {minutesFor('wrPage1', 2)} min to read this cover,
            about {r.read_minutes} for all of it
          </p>
          <p className="small" style={{ margin: '0 0 12px', maxWidth: '74ch' }}>
            <strong>{r.headline}</strong> This cover is written so the four answers below are
            enough. If you stop here you will not have missed anything that mattered this week —
            every page beneath it is the evidence, kept for when you want it rather than because
            you need it.
          </p>

          <div className="grid g2">
            {r.answers.map((q) => (
              <div className="card card-pad" key={q.n}>
                <div className="section-label">
                  <b aria-hidden="true">{MARK[q.verdict]}</b> {q.n} · {q.question}
                </div>
                <p className="small" style={{ margin: '4px 0 6px' }}>{q.short}</p>
                <a className="linklike" href={'#wrPage' + q.page}>Page {q.page} →</a>
              </div>
            ))}
          </div>

          <div className="notice" style={{ marginTop: 12 }}>
            <div className="small">
              <strong>Two things first.</strong> The production figures here are the
              operator&rsquo;s own filings with the state, not our measurements — where a lease
              drifted from what the model expected, <strong>the filing is the fact and the model
              is what was wrong</strong>. And no payment figure in this report is observed: every
              &ldquo;were you paid&rdquo; question is one we can raise, never a finding we can
              make. The only instrument that settles one is your own statement.
            </div>
          </div>

          <div className="grid g3" style={{ marginTop: 12 }}>
            <div className="kpi">
              <div className="k-label">Filings this week</div>
              <div className="k-val num">{n0(r.compare.this_week)}</div>
              <div className="k-sub">dated inside {r.window_label}</div>
            </div>
            <div className="kpi">
              <div className="k-label">The week before</div>
              <div className="k-val num">{n0(r.compare.last_week)}</div>
              <div className="k-sub">the seven days before that</div>
            </div>
            <div className="kpi">
              <div className="k-label">Change</div>
              <div className={'k-val num ' + (
                r.compare.change_pct == null ? '' : r.compare.change_pct >= 0 ? 'delta-up' : 'delta-down')}>
                {r.compare.change_pct == null ? '—' : pctS(r.compare.change_pct)}
              </div>
              <div className="k-sub">
                {r.compare.change_pct == null ? 'no earlier week to compare'
                  : 'a count on its own says nothing'}
              </div>
            </div>
          </div>

          <p className="tiny muted" style={{ marginTop: 12 }}>{r.disclaimer}</p>
          <span className="wr-pageno">Page 1 of {r.page_count}</span>
        </div>

        {/* ---------------------------------- ESSENTIALS: where the rest lives
            The inherited stylesheet hides every `.wr-page` in the Essentials
            view and shows THIS element instead — "Simple = the 60-90 second
            brief; the five evidence pages open in Detailed". Without it the
            Essentials reader got the cover and nothing else, with a rail whose
            links pointed at hidden sections. */}
        <div className="card card-pad wr-noprint" id="wrSimpleEvidence">
          <div className="section-label">The evidence, one click deeper</div>
          <p className="small" style={{ margin: '2px 0 0', maxWidth: '74ch' }}>
            You are reading the <strong>Essentials</strong> view, which is the cover: the four
            answers and nothing you have to wade through. The five evidence pages behind them —
            what every lease posted against expected, who is drilling within a mile, what the
            prices did and what is coming with a date on it —{' '}
            <strong>open in the Detailed view</strong>, from the view control beside your name.
          </p>
          <div className="wse-list">
            {railItems.slice(1).map((it) => (
              <span key={it.id}>
                <b>{it.title}</b>
                {it.sub} · {it.minutes} min
              </span>
            ))}
          </div>
        </div>

        {/* ================================================== PAGE 2 · the money */}
        {pageOf(2)
          ? (
            <div className="wr-page" id="wrPage2">
              <div className="between">
                <p className="wr-q">1 · {pageOf(2)!.title}</p>
                <span className="tiny muted">{minutesFor('wrPage2', 4)} min</span>
              </div>
              <p className="small" style={{ maxWidth: '74ch' }}>{pageOf(2)!.lead}</p>

              <div className="grid g4" style={{ margin: '12px 0' }}>
                {pageOf(2)!.stats.slice(0, 4).map((st) => (
                  <div className="kpi" key={st.label}>
                    <div className="k-label">{st.label}</div>
                    <div className={'k-val num ' + toneCls(st.tone)}>{st.value}</div>
                    {st.sub ? <div className="k-sub">{st.sub}</div> : null}
                  </div>
                ))}
              </div>

              <div className="between" style={{ marginTop: 6 }}>
                <div className="section-label" style={{ margin: 0 }}>
                  All {r.lease_count} leases this month — ranked by drift from expected, biggest
                  exception first
                </div>
                <span className="chip chip-est">Model vs the posted month</span>
              </div>
              <Tables page={{ tables: [pageOf(2)!.tables[0]] }} />

              {/* THE DEPTH — four figures a total hides. The reference's own
                  argument for the long version: "A summary can only tell you
                  the total was fine — the table can show you a single lease
                  going quietly sideways underneath a fine total." */}
              {r.insights.length
                ? (
                  <>
                    <div className="between" style={{ marginTop: 14 }}>
                      <div className="section-label" style={{ margin: 0 }}>
                        What the total does not show
                      </div>
                      <span className="chip chip-slate">Measured, not modelled</span>
                    </div>
                    <div className="grid g4" style={{ margin: '6px 0 12px' }}>
                      {r.insights.map((st) => (
                        <div className="kpi" key={st.label}>
                          <div className="k-label">{st.label}</div>
                          <div className={'k-val num ' + toneCls(st.tone)}>{st.value}</div>
                          {st.sub ? <div className="k-sub">{st.sub}</div> : null}
                        </div>
                      ))}
                    </div>
                  </>
                )
                : null}

              <Explain e={explainFor(2)} />

              <Band tier={tier} from="detailed">
                <div className="wr-mini" style={{ padding: '11px 13px', margin: '12px 0' }}>
                  <div className="between" style={{ marginBottom: 6 }}>
                    <div className="section-label" style={{ margin: 0 }}>
                      Owner-share trend — your interest applied
                    </div>
                    <span className="chip chip-est">Derived estimate</span>
                  </div>
                  <ProductPair
                    subject="your leases"
                    months={p.series.months.map((m) => ({
                      label: m.label, cycle: m.cycle,
                      gas: m.leases === 0 ? Number.NaN : m.gas_net,
                      oil: m.leases === 0 ? Number.NaN : m.oil_net,
                    }))}
                    opts={{
                      gasName: 'Gas to you, by month',
                      oilName: 'Oil to you, by month',
                      sub: 'your interest applied',
                      keyPrefix: 'wkprod',
                      footnote: 'A gap is a month the state has not filed, drawn as a gap rather '
                        + 'than as a fall to zero.',
                    }}
                  />
                </div>

                <div className="section-label">The same months at your interest</div>
                {/* ADAPTED · TEN ROWS A PAGE. This is the only paged table —
                    the API returns one row per lease and a large account runs
                    to twenty-odd, which is a long scroll inside a report page.
                    `pageSize` is opt-in, so every other `Tables` call renders
                    exactly as the reference does. */}
                <Tables page={{ tables: pageOf(2)!.tables.slice(1) }} pageSize={10} />
              </Band>

              {r.volume_bars.length
                ? (
                  <BarChart
                    title="Posted volumes by lease — the last month each one filed"
                    chip="Gross, as filed"
                    /* ADAPTED · top ten only, in the order the service ranks
                       them; the API sends every lease that filed. */
                    rows={r.volume_bars.slice(0, 10)}
                    tone="gas"
                    note="Gross lease volumes as posted to the state, not your share."
                  />
                )
                : null}

              {/* ADAPTED · FULL WIDTH. The reference holds these paragraphs to a
                  reading measure TWICE — an inline `maxWidth: '74ch'` here, and
                  `.wr-page .small { max-width: 84ch }` in the stylesheet, which
                  is the one that was actually winning at 84ch. Dropping the
                  inline value alone left them at 663px inside an 808px card, so
                  this sets `none` explicitly to beat the class rule.

                  ONLY THIS BLOCK. The shared rule is left alone, so every other
                  paragraph in every report page keeps its measure — editing the
                  stylesheet would have widened all of them. */}
              {pageOf(2)!.paras.map((t, i) => (
                <p className="small" key={i} style={{ maxWidth: 'none' }}>{t}</p>
              ))}

              <div className="notice mint">
                <div>
                  <strong>Monthly production anchor.</strong> The weekly report is a slice; the
                  monthly filing is the truth. New monthly figures appear here whenever they post,
                  even on a quiet week.
                </div>
              </div>
              {pageOf(2)!.note ? <p className="tiny muted">{pageOf(2)!.note}</p> : null}
              <span className="wr-pageno">Page 2 of {r.page_count}</span>
            </div>
          )
          : null}

        {/* ======================================= PAGE 3 · activity and the map */}
        {pageOf(3)
          ? (
            <div className="wr-page" id="wrPage3">
              <div className="between">
                <p className="wr-q">2 · {pageOf(3)!.title}</p>
                <span className="tiny muted">{minutesFor('wrPage3', 5)} min</span>
              </div>
              <p className="small" style={{ maxWidth: '74ch' }}>{pageOf(3)!.lead}</p>

              <div className="grid g4" style={{ margin: '12px 0' }}>
                {pageOf(3)!.stats.slice(0, 4).map((st) => (
                  <div className="kpi kpi-click" key={st.label}
                    role="button" tabIndex={0}
                    onClick={() => go('activities')}
                    onKeyDown={(e) => { if (e.key === 'Enter') go('activities'); }}
                  >
                    <div className="k-label">{st.label}</div>
                    <div className={'k-val num ' + toneCls(st.tone)}>{st.value}</div>
                    {st.sub ? <div className="k-sub">{st.sub}</div> : null}
                    <span className="ctx-hint">what we watched →</span>
                  </div>
                ))}
              </div>

              <Explain e={explainFor(3)} />

              <NearMap p={p} />

              <div className="grid g2" style={{ margin: '12px 0' }}>
                {pageOf(3)!.stats.slice(4).map((st) => (
                  <div className="kpi" key={st.label}>
                    <div className="k-label">{st.label}</div>
                    <div className={'k-val num ' + toneCls(st.tone)}>{st.value}</div>
                    {st.sub ? <div className="k-sub">{st.sub}</div> : null}
                  </div>
                ))}
              </div>

              {pageOf(3)!.paras.map((t, i) => (
                <p className="small" key={i} style={{ maxWidth: '74ch' }}>{t}</p>
              ))}

              <div className="section-label" style={{ marginTop: 12 }}>
                Every filing dated inside this week
              </div>
              <Tables page={pageOf(3)!} />
              {pageOf(3)!.note ? <p className="tiny muted">{pageOf(3)!.note}</p> : null}
              <span className="wr-pageno">Page 3 of {r.page_count}</span>
            </div>
          )
          : null}

        {/* ================================================= PAGE 4 · the prices */}
        {pageOf(5)
          ? (
            <div className="wr-page" id="wrPage4">
              <div className="between">
                <p className="wr-q">4 · {pageOf(5)!.title}</p>
                <span className="tiny muted">{minutesFor('wrPage4', 5)} min</span>
              </div>
              <p className="small" style={{ maxWidth: '74ch' }}>{pageOf(5)!.lead}</p>

              <div className="grid g4" style={{ margin: '12px 0' }}>
                {r.prices.map((q) => (
                  <div className="pricebox" key={q.key}>
                    <div className="k-label">{q.label}</div>
                    <div className="k-val num">{q.display}</div>
                    <div className="k-sub">
                      {q.week_change_pct == null
                        ? 'no week-on-week move reported'
                        : (
                          <span className={q.week_change_pct >= 0 ? 'delta-up' : 'delta-down'}>
                            {q.week_change_pct >= 0 ? '▲' : '▼'}{' '}
                            {Math.abs(q.week_change_pct).toFixed(2)}% this week
                          </span>
                        )}
                      <br />
                      {q.unit}{q.as_of ? ` · settled ${q.as_of}` : ''}
                    </div>
                  </div>
                ))}
              </div>

              {/* the drivers, each with the public source beside it */}
              {r.drivers.length
                ? (
                  <>
                    <div className="section-label">Why it moved, and where to check</div>
                    {r.drivers.map((d) => (
                      <div className="glossary-term" key={d.headline}>
                        <dt>{d.headline}</dt>
                        <dd>
                          {d.text}
                          <br />
                          <a
                            className="src-chip" href={d.href}
                            target={d.href.startsWith('#') ? undefined : '_blank'}
                            rel="noreferrer"
                          >
                            source: {d.source} ↗
                          </a>
                        </dd>
                      </div>
                    ))}
                  </>
                )
                : null}

              {r.value_bars.length
                ? (
                  <BarChart
                    title="Where your estimate lives — by lease"
                    chip="Estimate — not an appraisal"
                    /* ADAPTED · top ten only, as above. */
                    rows={r.value_bars.slice(0, 10)}
                    tone="value"
                    money
                    note={`Your share of the model's six-year projection, lease by lease — `
                      + `${r.estimate.six_year} across the record.`}
                  />
                )
                : null}

              {pageOf(5)!.paras.map((t, i) => (
                <p className="small" key={i} style={{ maxWidth: '74ch' }}>{t}</p>
              ))}
              {pageOf(5)!.note ? <p className="tiny muted">{pageOf(5)!.note}</p> : null}
              <span className="wr-pageno">Page 4 of {r.page_count}</span>
            </div>
          )
          : null}

        {/* ============================================ PAGE 5 · what to watch */}
        {pageOf(6)
          ? (
            <div className="wr-page" id="wrPage5">
              <div className="between">
                <p className="wr-q">5 · {pageOf(6)!.title}</p>
                <span className="tiny muted">{minutesFor('wrPage5', 4)} min</span>
              </div>

              {/* THE NUMBER PEOPLE OPEN IT FOR */}
              <div className="wr-est">
                <div className="wr-est-head">
                  <div className="section-label" style={{ color: '#9fd7bd' }}>
                    What we think your next statement holds ·{' '}
                    {r.estimate.month_label ?? 'next month'}
                  </div>
                  {r.estimate.unavailable
                    ? <p className="wr-est-range" style={{ fontSize: 19 }}>Not modelled</p>
                    : (
                      <>
                        <p className="wr-est-range">
                          {r.estimate.low} – {r.estimate.high}
                        </p>
                        <p className="wr-est-mid">midpoint about {r.estimate.mid}</p>
                      </>
                    )}
                </div>
                <div className="card-pad">
                  {r.estimate.unavailable
                    ? <p className="small">{r.estimate.unavailable}</p>
                    : (
                      <>
                        <div className="wr-est-bar" aria-hidden="true">
                          <span className="wr-est-track" />
                          <span className="wr-est-tick" style={{ left: '10%' }} />
                          <span className="wr-est-cap" style={{ left: '10%' }}>{r.estimate.low}</span>
                          <span className="wr-est-tick" style={{ left: '50%' }} />
                          <span className="wr-est-cap" style={{ left: '50%' }}>{r.estimate.mid}</span>
                          <span className="wr-est-tick" style={{ left: '90%' }} />
                          <span className="wr-est-cap" style={{ left: '90%' }}>{r.estimate.high}</span>
                        </div>
                        <p className="small" style={{ marginTop: 10 }}>
                          Across the whole record. The next quarter ({r.estimate.quarter_label})
                          models at <strong>{r.estimate.quarter_low} – {r.estimate.quarter_high}
                          </strong>, and the six-year figure remains{' '}
                          <strong>{r.estimate.six_year}</strong>.
                        </p>
                        <p className="tiny muted">Built from {r.estimate.basis}.</p>
                        <div className="section-label" style={{ marginTop: 10 }}>Why a range</div>
                        <ul className="wr-watch">
                          {r.estimate.why_range.map((w, i) => (
                            <li key={i}><b aria-hidden="true">·</b><span className="small">{w}</span></li>
                          ))}
                        </ul>
                        <div className="notice mint">
                          <div className="small">{r.estimate.narrower}</div>
                        </div>
                      </>
                    )}
                </div>
              </div>

              {/* THE COUNT IS THE LIST'S OWN. This heading read "Three things
                  to watch" over a list the service fills: it is sending four,
                  and has been — a heading that miscounts the list directly
                  beneath it is the cheapest kind of wrong to notice and the
                  quickest to lose a reader's trust in the figures above it.
                  The wording is otherwise the reference's. */}
              <div className="section-label">
                {r.watch.items.length} {plural(r.watch.items.length, 'thing')} to watch
              </div>
              <ul className="wr-watch">
                {r.watch.items.map((w, i) => (
                  <li key={i}><b aria-hidden="true">👀</b><span className="small">{w}</span></li>
                ))}
              </ul>

              <div className="section-label" style={{ marginTop: 14 }}>
                Next on the calendar — what is coming, dated
              </div>
              <div className="tablewrap">
                <table>
                  <thead><tr><th>When</th><th>What</th><th>Why it matters</th></tr></thead>
                  <tbody>
                    {r.calendar.map((c) => (
                      <tr key={c.what}>
                        <td className="num"><strong>{c.when}</strong></td>
                        <td>{c.what}</td>
                        <td className="small muted">{c.detail}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="section-label" style={{ marginTop: 14 }}>
                What would change this picture
              </div>
              <Tables page={pageOf(6)!} />

              <div className="notice slate">
                <div className="small">
                  <strong>If this had been a quiet week.</strong> {r.quiet_week_note}
                </div>
              </div>

              <div className="section-label" style={{ marginTop: 14 }}>
                Where every figure in this report came from
              </div>
              <div className="tablewrap">
                <table>
                  <thead><tr><th>What</th><th>Source, and how fresh</th></tr></thead>
                  <tbody>
                    {r.sources.map((sc) => (
                      <tr key={sc.label}>
                        <td><strong>{sc.label}</strong></td>
                        <td className="small muted">{sc.detail}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="tiny muted" style={{ marginTop: 12 }}>{r.disclaimer}</p>
              <span className="wr-pageno">Page 5 of {r.page_count}</span>
            </div>
          )
          : null}

        {/* ============================================ THE KEEPER — MONTHLY */}
        {r.monthly
          ? (
            <div className="wr-page" id="wrMonthly" style={{ border: '2px solid var(--green)' }}>
              <div className="wr-head">
                <div>
                  <div className="section-label">The keeper — your monthly</div>
                  <div className="small muted">{r.monthly.issue}</div>
                </div>
                <div className="flex wr-noprint" style={{ gap: 6 }}>
                  <a className="btn btn-ghost btn-sm" href={`/api/weekly?format=html&dl=1&${qs}`}>
                    Download this issue
                  </a>
                </div>
              </div>
              <h2 style={{ margin: '0 0 4px', fontSize: 22 }}>{r.monthly.title}</h2>
              <p className="small" style={{ maxWidth: '74ch' }}>
                <strong>{r.monthly.find}</strong>
              </p>

              <div className="grid g4" style={{ margin: '12px 0' }}>
                {r.monthly.stats.map((st) => (
                  <div className="kpi" key={st.label}>
                    <div className="k-label">{st.label}</div>
                    <div className={'k-val num ' + toneCls(st.tone)}>{st.value}</div>
                    {st.sub ? <div className="k-sub">{st.sub}</div> : null}
                  </div>
                ))}
              </div>

              <div className="section-label">
                {r.monthly.closed_label} — our estimate against the actual, per lease
              </div>
              <Tables page={{ tables: [r.monthly.table] }} />
              <p className="tiny muted">{r.monthly.note}</p>
              <span className="wr-pageno">The monthly</span>
            </div>
          )
          : null}

        {/* ================================================== EVERY ISSUE KEPT

            CLAIMED ONLY. "Past briefings — your archive" is a promise about a
            record that has been kept over time, and a not-claimed visitor has
            no such record: every line under it would be a sampled week
            belonging to the fictional owner, offered as "every issue kept" for
            an account that has never had one. It is the single section of this
            report whose SUBJECT is the reader's own history rather than the
            public filings, which is why it is the only one held back — the
            five evidence pages and the monthly keeper all stay, sampled, so
            the state still shows the whole product. `railItems` above drops
            its rail row to match. */}
        {unclaimed ? null : (
        <div className="wr-page" id="wrArchive">
          <div className="wr-head">
            <div>
              <div className="section-label">Past briefings — your archive</div>
              <div className="small muted">Every issue kept</div>
            </div>
            <div className="right small muted">
              {r.archive.length} {plural(r.archive.length, 'issue')} before this one
            </div>
          </div>
          <div className="leaselist">
            {r.archive.map((it) => (
              <div className="li" key={it.week_ending_iso}>
                <span>
                  <strong>Week ending {it.week_ending_label}</strong>
                  <br />
                  <span className="tiny muted">{it.line}</span>
                </span>
                <span className={'chip ' + (it.quiet ? 'chip-slate' : 'chip-mint')}>
                  {it.quiet ? 'quiet week' : 'active'}
                </span>
              </div>
            ))}
          </div>
          <p className="tiny muted" style={{ marginTop: 10 }}>
            Each line is the same window rule this issue uses, walked back a week at a time over
            the same record — so a past week that had nothing in it says so. That is the point of
            keeping them: &ldquo;what did it say in March?&rdquo; always has an answer.
          </p>
          <span className="wr-pageno">The archive</span>
        </div>
        )}
      </Band>
    </section>
  );
}

/* ------------------------------------------------------------------ pieces */
function toneCls(t?: 'up' | 'down' | 'warn'): string {
  return t === 'up' ? 'delta-up' : t === 'down' ? 'delta-down' : '';
}

function Explain({ e }: { e: { summary: string; paras: string[] } | null }) {
  if (!e) return null;
  return (
    <details className="explain wr-noprint">
      <summary>{e.summary}</summary>
      <div className="ex-body">
        {e.paras.map((t, i) => <p className="small" key={i}>{t}</p>)}
      </div>
    </details>
  );
}

interface WeeklyTable {
  head: string[];
  rows: { key: string; cells: string[]; mine?: boolean }[];
  empty?: string | null;
  note?: string;
}

function Tables(
  { page, pageSize }: { page: { tables: WeeklyTable[] }; pageSize?: number },
) {
  return (
    <>
      {page.tables.map((tb, i) => (
        <OneTable key={i} tb={tb} pageSize={pageSize} />
      ))}
    </>
  );
}

/**
 * One report table, optionally ten rows at a time.
 *
 * ITS OWN COMPONENT BECAUSE PAGING NEEDS ITS OWN STATE, and a page can hold
 * more than one table — a hook cannot live inside the `map` that renders them.
 *
 * A `total` ROW IS NEVER PAGED AWAY. The first table on page 2 carries one, and
 * a totals row that disappears on page 2 of 3 would read as a different total
 * rather than a hidden one. It is pulled out, the rest is paged, and it is put
 * back at the bottom of whichever page is showing.
 *
 * The pager reuses the sheet's own `btn`/`between`/`tiny muted` classes so it
 * needs no new CSS, and carries `wr-noprint` because a printed report has no
 * next page to go to — which is also why printing shows every row.
 */
function OneTable({ tb, pageSize }: { tb: WeeklyTable; pageSize?: number }) {
  const [pageNo, setPageNo] = React.useState(0);

  const totals = tb.rows.filter((r) => r.key === 'total');
  const body = tb.rows.filter((r) => r.key !== 'total');
  const paged = Boolean(pageSize && body.length > pageSize);
  const count = paged ? Math.ceil(body.length / (pageSize as number)) : 1;
  const at = Math.min(pageNo, count - 1);
  const from = paged ? at * (pageSize as number) : 0;
  const shown = paged ? body.slice(from, from + (pageSize as number)) : body;
  const rows = [...shown, ...totals];

  return (
    <>
      {tb.rows.length
        ? (
          <>
            <div className="tablewrap">
              <table>
                <thead><tr>{tb.head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.key} className={row.key === 'total' ? 'wr-total' : undefined}>
                      {row.cells.map((c, k) => (
                        <td key={k}>{k === 0 ? <strong>{c}</strong> : c}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {paged
              ? (
                <div
                  className="between wr-noprint"
                  style={{ margin: '8px 0 0', flexWrap: 'wrap', gap: 8 }}
                >
                  <span className="tiny muted">
                    {from + 1}–{from + shown.length} of {body.length} leases
                  </span>
                  <span className="flex" style={{ gap: 6, alignItems: 'center' }}>
                    <button
                      className="btn btn-ghost btn-sm" type="button"
                      disabled={at === 0} onClick={() => setPageNo(at - 1)}
                    >
                      Previous
                    </button>
                    <span className="tiny muted">Page {at + 1} of {count}</span>
                    <button
                      className="btn btn-ghost btn-sm" type="button"
                      disabled={at >= count - 1} onClick={() => setPageNo(at + 1)}
                    >
                      Next
                    </button>
                  </span>
                </div>
              )
              : null}
          </>
        )
        : tb.empty
          ? <div className="notice"><div>{tb.empty}</div></div>
          : null}
      {tb.note && tb.rows.length
        ? <p className="tiny muted" style={{ margin: '6px 0 0' }}>{tb.note}</p>
        : null}
    </>
  );
}

/**
 * A RANKED BAR CHART WITH AN AXIS.
 *
 * The first attempt was a list of label-track-value rows with no scale at all,
 * which is what a bar chart is for. The reference draws an axis — "$5,000
 * $10,000 $15,000" across the top with the bars measured against it — so this
 * does the same: three ticks, gridlines showing through the bars, and the value
 * at the end of each bar. Everything is measured against the LARGEST bar, and
 * the tick labels say what the scale is, so a bar can be read without hovering.
 */
function BarChart(
  { title, chip, rows, tone, note, money }: {
    title: string; chip: string; rows: WeeklyBar[]; tone: 'gas' | 'value';
    note: string; money?: boolean;
  },
) {
  const max = Math.max(...rows.map((b) => b.value), 1);
  /* a round number just above the biggest bar, so the ticks are readable */
  const step = niceStep(max);
  const top = Math.ceil(max / step) * step;
  const ticks = [1, 2, 3].map((k) => (step * k * (top / step / 3)));
  const fmt = (v: number) => (money ? '$' + nShort(v) : nShort(v)) ?? '—';

  return (
    <div className="wr-chart">
      <div className="between" style={{ marginBottom: 2 }}>
        <div className="section-label" style={{ margin: 0 }}>{title}</div>
        <span className="chip chip-est">{chip}</span>
      </div>
      <div className="wc-axis" aria-hidden="true">
        <span className="wc-lab" />
        <span className="wc-plot">
          {ticks.map((v, i) => (
            <span className="wc-tick" key={i} style={{ left: ((v / top) * 100).toFixed(2) + '%' }}>
              {fmt(v)}
            </span>
          ))}
        </span>
        <span className="wc-val" />
      </div>
      {rows.map((b) => (
        <div className="wc-row" key={b.label}>
          <span className="wc-lab">
            {b.label}
            {b.sub ? <i>{b.sub}</i> : null}
          </span>
          <span className="wc-plot">
            {ticks.map((v, i) => (
              <span className="wc-grid" key={i} style={{ left: ((v / top) * 100).toFixed(2) + '%' }} />
            ))}
            <span
              className={'wc-fill ' + tone}
              style={{ width: Math.max((b.value / top) * 100, 0.6).toFixed(2) + '%' }}
            />
          </span>
          <span className="wc-val num">{b.display}</span>
        </div>
      ))}
      <p className="tiny muted" style={{ margin: '6px 0 0' }}>{note}</p>
    </div>
  );
}

/** 1, 2 or 5 × a power of ten — the readable step for an axis */
function niceStep(max: number): number {
  const raw = max / 3;
  const mag = 10 ** Math.floor(Math.log10(Math.max(raw, 1)));
  const n = raw / mag;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag;
}

/**
 * THE MAP — a real one, drawn from measured offsets.
 *
 * The reference has a raster tile with pins on it. There is no tile server in
 * this build, and a decorative rectangle would be worse than no map — so this
 * plots what the record actually knows: the owner's own wells at the centre,
 * every nearby permit, completion and wellbore at its measured offset in
 * miles, and the one, three and five-mile rings around them. Every dot is a
 * real coordinate reduced to an east/north offset (see sources/nearby.ts).
 */
function NearMap({ p }: { p: ViewProps['p'] }) {
  const rows = p.nearby.rows;
  if (!rows.length) {
    return (
      <div className="notice">
        <div className="small">
          {p.nearby.unavailable
            ?? 'No well, permit or completion inside five miles carries a location, so there is '
              + 'nothing to map. An empty frame would say less than this sentence.'}
        </div>
      </div>
    );
  }
  const R = 5.4;
  const S = 150;                       /* the viewBox is 300 across, so 150 is the centre */
  const px = (mi: number) => S + (mi / R) * (S - 8);
  const own = rows.filter((x) => x.is_own);
  const near = rows.filter((x) => !x.is_own);

  return (
    <div className="wr-mini" style={{ padding: '11px 13px', margin: '12px 0' }}>
      <div className="between" style={{ marginBottom: 6 }}>
        <div className="section-label" style={{ margin: 0 }}>
          What sits around your wells — measured, to five miles
        </div>
        <span className="chip chip-mint">Live coordinates</span>
      </div>
      <svg viewBox="0 0 300 300" className="wr-map" role="img"
        aria-label={`A map of ${rows.length} records within five miles of this owner's wells: `
          + `${own.length} on her own leases and ${near.length} belonging to neighbors.`}
      >
        {[1, 3, 5].map((mi) => (
          <g key={mi}>
            <circle cx={S} cy={S} r={(mi / R) * (S - 8)} className="wm-ring" />
            <text x={S} y={S - (mi / R) * (S - 8) + 10} className="wm-ringlab">{mi} mi</text>
          </g>
        ))}
        <line x1={8} y1={S} x2={292} y2={S} className="wm-axis" />
        <line x1={S} y1={8} x2={S} y2={292} className="wm-axis" />
        {near.map((x) => (
          <circle
            key={x.id}
            cx={px(x.dx_mi)} cy={px(-x.dy_mi)} r={x.kind === 'wellbore' ? 2.4 : 3.2}
            className={'wm-dot k-' + x.kind}
          >
            <title>
              {`${x.lease_name ?? 'unnamed'} · ${x.kind} · ${x.distance_mi.toFixed(2)} mi`}
            </title>
          </circle>
        ))}
        {own.map((x) => (
          <rect
            key={x.id} x={px(x.dx_mi) - 3} y={px(-x.dy_mi) - 3} width="6" height="6"
            className="wm-own"
          >
            <title>{`${x.lease_name ?? 'your lease'} · yours`}</title>
          </rect>
        ))}
      </svg>
      <p className="wm-key">
        <span><i className="sw own" />your wells</span>
        <span><i className="sw k-permit" />permits</span>
        <span><i className="sw k-completion" />completions</span>
        <span><i className="sw k-wellbore" />existing wellbores</span>
      </p>
      <p className="tiny muted" style={{ margin: '6px 0 0' }}>
        {rows.length} records inside five miles, each plotted at its own measured offset from the
        center of your wells. {p.nearby.note}
      </p>
    </div>
  );
}

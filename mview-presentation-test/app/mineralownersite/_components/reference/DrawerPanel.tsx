'use client';
/**
 * The explainer panel.
 *
 * It answers the same four questions in the same order it always did, because
 * that order is right for a reader who is a landowner and not an industry
 * professional:
 *
 *   what this is  →  what it means for you  →  what it is built on  →  what to do
 *
 * WHAT CHANGED, and why. The panel used to be four prose blocks and a bullet
 * list. Correct, but it read as a document rather than as an answer: every
 * figure was buried mid-sentence, so the reader had to read a paragraph to
 * learn what something was worth, and nothing told them which of the four
 * blocks was the one they wanted.
 *
 *   · IT LEADS WITH THE FIGURES. A metric band sits directly under the header
 *     carrying the two-to-four numbers the panel is about, with the series
 *     beside them where one exists. The answer first, the explanation after.
 *
 *   · EACH SECTION IS A CARD WITH A NUMBERED STEP. Four indistinguishable
 *     `<h4>`s gave no way to skim; a numbered marker and a card edge do.
 *
 *   · THE EVIDENCE IS ROWS, NOT BULLETS. Each line is a record, so it is
 *     presented as one — its own row and marker, readable as a list of facts
 *     rather than as a paragraph chopped up.
 *
 *   · "WHAT TO DO" IS THE ONE HIGHLIGHTED BLOCK. It is the only section that
 *     asks anything of the reader, so it is the only one that looks like it.
 *
 * FOCUS. It is a real dialog: focus moves in on open, is trapped while open,
 * and returns to whatever opened it on close. A drawer a keyboard user can tab
 * out of, leaving focus on a page they cannot see, is worse than no drawer.
 */
import React, { useEffect, useRef } from 'react';
import type { Drawer, Payload } from '../../_lib/reference/payload';
import { Html } from './bits';
import DrawerMapBlock from './DrawerMapBlock';
import { serviceText, spanLabel } from '../../_lib/reference/fmt';
import { Charts } from './LineChart';

/**
 * WRAP EVERY FIGURE IN THE EVIDENCE SO THE LAPSED STATE CAN COVER IT.
 *
 * DEFECT #14, QA's re-open: "Need to blur the in detail side nav." The page
 * behind this panel blurs its values once the subscription has ended — the
 * Ultra stat strip and every row's `.alx-v` — and then the reader pressed
 * `expand` and the same volumes were printed in the open drawer: "14K MCF ·
 * no oil", "7.0%", and four evidence lines each carrying a month's gas. The
 * cover was on the summary and off the detail.
 *
 * WHY IT NEEDED MARKUP AND NOT ANOTHER CSS RULE. The band values have their
 * own element (`.dx-v`) and the stylesheet can reach them. The evidence lines
 * cannot be reached: an alert drawer's evidence arrives as PLAIN TEXT —
 * "MCCABE ETAL GU — 3,998 MCF of gas and 157 barrels of oil (Hurd
 * Enterprises, Ltd)" — with no element around the number. Blurring the whole
 * line would take the lease name and the operator with it, and defect #17 is
 * explicit that the lapsed state covers VALUES AND NOT TEXT.
 *
 * WHAT COUNTS AS A FIGURE: a number carrying a unit, a currency mark or a
 * percent, or a grouped number like "3,998". A BARE YEAR IS NOT ONE — "roll
 * year 2025" and "completed Aug 11, 2026" are the dates that say when, which
 * the reader keeps in every state; covering them would tell them nothing
 * about what they are missing.
 *
 * IT RUNS IN EVERY STATE and marks the same spans every time, so there is no
 * second render path to keep in step: the stylesheet decides whether a marked
 * figure is covered, and only `state-lapsed` says yes. That also keeps this
 * function out of the funnel's business — it does not need to know the state.
 *
 * TAGS ARE STEPPED OVER, not matched. Some drawers (a lease, a well) do carry
 * `<strong>` around their figures, so the scan alternates between markup and
 * text and only rewrites the text.
 */
const FIGURE =
  /(?:\$\s?)?\d[\d,]*(?:\.\d+)?[KMB]?(?:\s*(?:%|MCF|BBL|BOE|mcf|bbl|boe|barrels?|ft|acres?|months?))?/g;

/**
 * IS THIS MATCH A VALUE, OR IS IT AN IDENTIFIER THE READER STILL NEEDS?
 *
 * Defect #17's rule is that the lapsed state covers VALUES and not text, and a
 * digit on its own is not enough to tell the two apart. Measured on the open
 * drawer, a bare-integer rule covered the lease numbers — "WEST GRAYBURG UNIT
 * (20416)", "(01055)" — which are the reader's own references, the thing they
 * would quote in a question to the operator, and worth nothing to anybody
 * selling them a subscription. It also covered API numbers and well numbers
 * for the same reason.
 *
 * So a match is a VALUE when it says how much rather than which one:
 *
 *   · it carries a currency mark, a percent or a unit   $99.99 · 7.0% · 9 barrels
 *   · it carries a magnitude suffix                     14K MCF
 *   · it is grouped or fractional                       3,998 · 23.7
 *
 * and it is an IDENTIFIER — left legible — when it is a plain run of digits:
 * 20416, 01055, a four-digit year, a count in "9 of 10".
 */
function isValue(m: string): boolean {
  const t = m.trim();
  if (/[$%]/.test(t)) return true;
  if (/[A-Za-z]/.test(t)) return true;
  return /[,.]/.test(t);
}

/**
 * WRAP EVERY FIGURE SO THE LAPSED STATE CAN COVER IT — the HTML form.
 *
 * DEFECT #14, QA's re-open: "Need to blur the in detail side nav." The page
 * behind this panel covers its values once the subscription has ended — the
 * Ultra stat strip and every row's `.alx-v` — and then the reader pressed
 * `expand` and the open drawer printed the same volumes: the band's "14K MCF ·
 * no oil" and "7.0%", then four evidence lines each carrying a month's gas.
 * The cover was on the summary and off the detail.
 *
 * WHY IT NEEDED MARKUP AND NOT ANOTHER CSS RULE. The evidence lines have no
 * element around their numbers — an alert's evidence arrives as plain text,
 * "MCCABE ETAL GU — 3,998 MCF of gas and 157 barrels of oil (Hurd Enterprises,
 * Ltd)". Blurring the line would take the lease name and the operator with it.
 *
 * TAGS ARE STEPPED OVER, not matched. Some drawers (a lease, a well) carry
 * `<strong>` around their figures, so the scan alternates between markup and
 * text and only rewrites the text.
 *
 * IT RUNS IN EVERY STATE and marks the same spans every time, so there is no
 * second render path to keep in step: the stylesheet decides whether a marked
 * figure is covered. `state-lapsed` covers every marked figure; `state-claimed`
 * covers only those also marked `.cl-money` — see `isMoney`.
 */
/**
 * IS THIS FIGURE MONEY? — the difference between the two covered states.
 *
 * `lapsed` holds back the portfolio TOTALS, so every figure in a panel is
 * covered there. `claimed · free` withholds one thing only, and the state menu
 * says which: "the value estimate is the paid feature". Volumes, month counts,
 * lease counts and percentages are not the paid feature, and a free reader is
 * meant to have them.
 *
 * So the marking carries a second class for the figures that ARE money, and the
 * stylesheet covers `.cl-fig` in lapsed and only `.cl-money` in claimed. Defect
 * sheet row 19: the page covered the estimate, the reader pressed "How it is
 * built", and the panel printed the same number in the clear beside its range
 * and the whole-lease value.
 *
 * THE TEST IS THE CURRENCY MARK, nothing cleverer. `FIGURE` already captures a
 * leading "$", so a match either opens with one or it does not; no figure is
 * classified by what it happens to sit near.
 */
function isMoney(m: string): boolean {
  return m.trim().startsWith('$');
}

export function lockFigures(html: string): string {
  return html
    .split(/(<[^>]*>)/)
    .map((part, i) => (i % 2 === 1
      ? part
      : serviceText(part).replace(FIGURE, (m) => (isValue(m)
        ? '<span class="cl-fig' + (isMoney(m) ? ' cl-money' : '') + '">' + m + '</span>'
        : m))))
    .join('');
}

/**
 * The same marking for a PLAIN-TEXT value — the metric band's own cells.
 *
 * `.dx-v` was covered whole at first and that was too broad in the other
 * direction: the band's value is not always a number. "Busiest operator ·
 * DEVON ENERGY PRODUCTION CO L.P." and "Lease · WEST GRAYBURG UNIT (20416)"
 * are cells whose value IS text, and blurring them told the reader nothing
 * except that something had been taken away. Marking the figures inside
 * instead covers "14K MCF" and "7.0%" and leaves the names to be read.
 *
 * A component rather than the string form above because these arrive as text,
 * not markup, and building HTML out of them would mean escaping them first.
 */
function LockFigures({ text }: { text: string }) {
  const out: React.ReactNode[] = [];
  let last = 0;
  let k = 0;
  for (const m of text.matchAll(FIGURE)) {
    const at = m.index ?? 0;
    if (!isValue(m[0])) continue;
    if (at > last) out.push(text.slice(last, at));
    out.push(
      <span className={'cl-fig' + (isMoney(m[0]) ? ' cl-money' : '')} key={k++}>{m[0]}</span>,
    );
    last = at + m[0].length;
  }
  if (!out.length) return <>{text}</>;
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}

/**
 * WHAT A DELIVERY CLASS MEANS, SAID NEXT TO IT.
 *
 * The panel's sub-line opens with the alert's class — "Urgent · event June 2026
 * · detected Sep 10, 2026" — and a reader met the word "Urgent" with nothing to
 * say what it was claiming (defect sheet row 5). It is easy to read as "this is
 * an emergency", and that is not what it says: `payload.ts` types
 * `AlertClass` as "the DELIVERY class, which is a METHOD taxonomy", and the
 * Alerts page states the same thing in words — "the class decides where an
 * alert is delivered". So the word is about the CHANNEL, not the severity, and
 * on its own above a money figure it invites the wrong one of the two.
 *
 * The gloss below is that same sentence, per class, in the place the word
 * actually appears. The class itself is unchanged — it is the service's
 * taxonomy and the Alerts page filters on it.
 */
const CLASS_MEANS: Record<string, string> = {
  Urgent: 'sent on its own, as soon as it is found',
  'Important digest': 'gathered into your weekly report',
  Educational: 'context, kept for you to read when you want it',
  Community: 'shared by other owners, not from the record',
};

/** The panel's sub-line, with the leading class explained where it appears. */
function subLine(sub: string): string {
  const cut = sub.indexOf(' · ');
  const klass = cut === -1 ? sub : sub.slice(0, cut);
  const means = CLASS_MEANS[klass.trim()];
  if (!means) return sub;
  return `${klass} — ${means}${cut === -1 ? '' : sub.slice(cut)}`;
}

const TONE_LABEL: Record<string, string> = {
  money: 'Money',
  activity: 'Activity',
  models: 'Models & forecasts',
  record: 'Your record',
};

export default function DrawerPanel(
  { copy, onClose, sample, sourceNote, evidenceTotal, panelKey,
    nearby = [], onOpen, canOpen }:
  {
    copy: Drawer | null; onClose: () => void; sample: boolean; sourceNote: string | null;
    /**
     * WHICH PANEL THIS IS, for the one rule that has to tell them apart.
     *
     * `claimed · free` withholds the value ESTIMATE and nothing else, so the
     * cover in that state has to reach the estimate's own panel and stop
     * there — the county roll is public record and the page prints it in the
     * clear beside the covered estimate. Without this the sheet could only say
     * "money in a drawer", which covered `$1,708,163,073` of appraised value
     * that the tile behind it was showing openly.
     *
     * Null for a panel a view composed itself (an Activities event), which has
     * no key and is never the estimate.
     */
    panelKey?: string | null;
    /**
     * HOW MANY ROWS THE PANEL IS ACTUALLY ABOUT, when the payload knows.
     *
     * The evidence list is a SAMPLE of the record — the service sends nine
     * lines for a record holding hundreds — and it said so in a way that read
     * as the whole story: "9 lines from the record", with nothing to tell a
     * reader that 753 more existed. On a 575-lease record QA read the panel as
     * claiming six leases were all there was.
     *
     * `Portal` supplies this only for the keys where the payload carries an
     * unambiguous universe for that panel; everywhere else it is null and the
     * note is what it always was. Nothing is inferred from the prose, and no
     * number here is computed — it is a field the service already sends.
     */
    evidenceTotal?: number | null;
    /* ---- THE POINTS THE MAP DRAWS FROM.
       The drawer carries a SELECTION, not the points — see `DrawerMapBlock`.
       These are `payload.nearby.rows`, already on the client for the neighbor
       lists, and both read the one copy. */
    nearby?: Payload['nearby']['rows'];
    /** open another panel — the "See this well" button */
    onOpen?: (key: string) => void;
    /** whether that panel exists, so a dead button is never offered */
    canOpen?: (key: string) => boolean;
  },
) {
  const panel = useRef<HTMLDivElement | null>(null);
  const body = useRef<HTMLDivElement | null>(null);
  const returnTo = useRef<HTMLElement | null>(null);
  const open = Boolean(copy);

  /**
   * EVERY PANEL OPENS AT ITS OWN TOP.
   *
   * This drawer is hidden with `display: none` rather than unmounted — see the
   * focus note below, which depends on that — so the scroll container survives
   * a close. Read one panel to the bottom, close it, open a different one, and
   * the second panel opened at the first one's scroll offset: its heading, its
   * figures and its first two sections were already above the fold, so the
   * reader was dropped into the middle of an explanation they had not started.
   * That is the defect sheet's row 7, filed as "show side nav bar page last
   * info first instead need to go starting at side nav bar".
   *
   * KEYED ON `copy.title`, NOT ON `open`. Several of this page's controls swap
   * the panel's CONTENT without closing it — the alert strip, the KPI tiles and
   * the setrows all call `open()` again while the drawer is up — so resetting
   * only on open would have left those switches showing the previous panel's
   * offset. Anything that changes which panel is on screen resets it.
   *
   * `scrollTop` AND NOT `scrollTo({behavior:'smooth'})`: the panel is sliding in
   * at the same moment, and animating a scroll inside an animating element
   * reads as a stutter. There is nothing for the reader to follow here — the
   * top is simply where the panel starts.
   */
  useEffect(() => {
    if (!open) return;
    if (body.current) body.current.scrollTop = 0;
  }, [open, copy?.title]);

  useEffect(() => {
    if (!open) return;
    returnTo.current = document.activeElement as HTMLElement | null;
    const el = panel.current;
    const focusables = () => Array.from(
      el?.querySelectorAll<HTMLElement>('button, [href], input, [tabindex]:not([tabindex="-1"])') ?? [],
    ).filter((n) => !n.hasAttribute('disabled'));
    /* DEFERRED BY ONE TASK, AND IT HAS TO BE.
     *
     * `focus()` is a no-op on an element in a `display: none` subtree, and this
     * panel is hidden exactly that way — `style={open ? undefined : {display:
     * 'none'}}` below. Called straight out of this effect the panel was still
     * hidden, so the focus silently failed and nothing retried it. Measured by
     * sampling `document.activeElement` across the open: the panel goes
     * `none` -> `flex` at the microtask boundary and focus stayed on the
     * TRIGGER at every sample from sync through t+366ms — it never landed and
     * was never stolen back.
     *
     * WHAT THAT COST, and it is not only a nicety: this dialog declares
     * `aria-modal="true"` and traps Tab below, but the trap only engages once
     * `document.activeElement` is already inside the panel. With focus left on
     * the card behind it, Tab walked the page UNDER the open drawer — measured,
     * the next stop was the next insight card — and a screen reader was never
     * moved to the dialog it had just opened.
     *
     * A TIMEOUT RATHER THAN `requestAnimationFrame`: rAF does not fire while
     * the tab is in the background, which would leave the focus permanently
     * unmoved for anyone who opens a drawer and switches away. The handle is
     * cleared below so a drawer closed within the same tick cannot pull focus
     * after it has gone. */
    const focusTimer = window.setTimeout(() => { focusables()[0]?.focus(); }, 0);

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const f = focusables();
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    el?.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(focusTimer);
      el?.removeEventListener('keydown', onKey);
      returnTo.current?.focus?.();
    };
  }, [open]);

  const tone = copy?.tone ?? 'record';

  return (
    <>
      <div
        className="ctx-scrim" onClick={onClose} aria-hidden="true"
        style={open ? undefined : { display: 'none' }}
      />
      <div
        className={'ctx-drawer dx dx-' + tone} id="ctxDrawer" ref={panel}
        data-panel={panelKey ?? undefined}
        role="dialog" aria-modal="true" aria-label={copy?.title ?? 'Explanation'}
        style={open ? undefined : { display: 'none' }}
      >
        {/* `<h3>` and a BLOCK sub, matching v1. The prototype styles
            `.ctx-head h3`, and `.ctx-sub` carries only `margin-top` — no
            display rule. Rendered as a <strong> plus a <span>, both stayed
            inline and the title ran straight into the sub. */}
        <div className="ctx-head">
          <div style={{ minWidth: 0, flex: '1 1 auto' }}>
            {copy?.tone ? <span className="dx-kind">{TONE_LABEL[tone]}</span> : null}
            <h3 id="ctxTitle">{serviceText(copy?.title ?? '')}</h3>
            <div className="ctx-sub" id="ctxSub">{serviceText(subLine(copy?.sub ?? ''))}</div>
          </div>
          <button type="button" className="ctx-x" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="ctx-body" ref={body}>
          {copy
            ? (
              <>
                {/* WHAT THE SAMPLE ACTUALLY DOES TO THESE FIGURES, which is no
                    longer what this band said.
                    It read "the figures in this panel are withheld and shown as
                    •••", which was true while `sampleize` ran every sentence
                    through `scrub()`. That transform was replaced by
                    `scaleFigures`: the panel now prints real, legible numbers
                    drawn from a live record and multiplied by one factor. So
                    the band promised a masked panel above an unmasked one —
                    the reader's first test of whether this product tells the
                    truth, failed on the page that exists to prove it does.
                    The sentence now describes the transform that runs: the
                    shape is the record's, the amounts are not the reader's. */}
                {sample
                  ? (
                    <p className="samp-band" style={{ margin: '0 0 14px' }}>
                      <strong>Sample view.</strong> The dates and the shape of every figure below
                      are read from the live public record, but the names and the amounts belong to
                      a sample owner and are scaled for illustration — claim your record to see
                      your own.
                    </p>
                  )
                  : null}

                {/* ---------------------------------------- the metric band */}
                {copy.stats?.length
                  ? (
                    <div className="dx-band">
                      <div className="dx-band-grid">
                        {copy.stats.map((st) => (
                          <div className="dx-stat" key={st.label}>
                            <span className="dx-k">{serviceText(st.label)}</span>
                            <span
                              className={'dx-v' + (st.tone ? ' t-' + st.tone : '')}
                            >
                              {st.tone === 'up' ? '▲ ' : st.tone === 'down' ? '▼ ' : ''}
                              {/* the figures inside, not the cell — see
                                  `LockFigures` for why a band value is not
                                  always a number */}
                              <LockFigures
                                text={serviceText(st.tone === 'up' || st.tone === 'down'
                                  ? st.value.replace(/^[+-]/, '')
                                  : st.value)}
                              />
                            </span>
                            {st.sub
                              ? <span className="dx-s"><LockFigures text={serviceText(st.sub)} /></span>
                              : null}
                          </div>
                        ))}
                      </div>
                      {copy.spark && copy.spark.filter((v) => v > 0).length > 2
                        ? (
                          <div className="dx-spark">
                            <BandSpark values={copy.spark} />
                            {/* the same span wording as the charts below it —
                                see `spanLabel` in `fmt.ts` */}
                            {copy.spark_label
                              ? <span className="dx-sparkcap">{spanLabel(copy.spark_label)}</span>
                              : null}
                          </div>
                        )
                        : null}
                    </div>
                  )
                  : null}

                {/* ---------------------------------------------- the record
                    THE FACTS BEFORE THE EXPLANATION OF THEM. A reader who
                    opened one permit wants its numbers and its dates, and they
                    used to be spread through three prose blocks. Unnumbered,
                    because it is not one of the four questions — it is the
                    record the four answers are about. */}
                {copy.facts?.rows.length
                  ? (
                    <section className="dx-facts">
                      <div className="dx-facts-h">
                        <h4>{copy.facts.head}</h4>
                        {copy.facts.note
                          ? <span className="dx-note">{copy.facts.note}</span>
                          : null}
                      </div>
                      <div className="dx-facts-g">
                        {copy.facts.rows.map((f) => (
                          <div className="dx-f" key={f.k}>
                            <span className="dx-fk">{f.k}</span>
                            <span className="dx-fv cl-fig">{f.v}</span>
                            {f.sub ? <span className="dx-fs">{f.sub}</span> : null}
                          </div>
                        ))}
                      </div>
                    </section>
                  )
                  : null}

                {/* ------------------------------------------ the four steps */}
                {/* THE PROSE IS COVERED ON THE SAME TERMS AS THE BAND.
                    Marked and left alone at first, and it undid the cover: the
                    band read "•••• MCF · ••• BBL" and the sentence three lines
                    under it read "Your share of that month is 4 MCF and 31
                    barrels of oil". One figure, hidden once and printed once,
                    on the same panel. `lockFigures` marks the figures inside
                    the sentence and leaves every word of it legible, so the
                    paragraph still says what it means. */}
                <Step n={1} head="What this is">
                  <Html html={lockFigures(copy.what)} className="small" />
                </Step>

                {/* ---- AND WHERE IT IS.
                    Directly after "what this is", because a permit near your
                    acreage is a fact about a PLACE, and the sentence above has
                    just said which permits. Before "what it means", because
                    the meaning is easier to read once the reader has seen how
                    close the thing actually is. */}
                {copy.map && onOpen && canOpen ? (
                  <DrawerMapBlock
                    spec={copy.map} rows={nearby} onOpen={onOpen} canOpen={canOpen}
                  />
                ) : null}

                <Step n={2} head="What it means for you">
                  <Html html={lockFigures(copy.means)} className="small" />
                </Step>

                {/* the charts belong with the meaning: they are the picture of
                    the sentence above, and the record below then names the
                    individual figures */}
                <Charts specs={copy.charts ?? []} />

                {copy.evidence.length
                  ? (
                    <Step
                      n={3} head="What this is built on"
                      note={evidenceTotal != null && evidenceTotal > copy.evidence.length
                        ? `${copy.evidence.length} of ${evidenceTotal.toLocaleString('en-US')} from the record`
                        : `${copy.evidence.length} ${copy.evidence.length === 1 ? 'line' : 'lines'} from the record`}
                    >
                      <ul className="dx-evid">
                        {copy.evidence.map((e, i) => (
                          <li key={i}>
                            <span className="dx-bullet" aria-hidden="true" />
                            <Html html={lockFigures(e)} as="span" />
                          </li>
                        ))}
                      </ul>
                      {/* THE REST ARE NOT MISSING, THEY ARE ELSEWHERE — and
                          saying where is the whole of this line's job. A list
                          that stops at nine with no remark reads as a complete
                          list. */}
                      {evidenceTotal != null && evidenceTotal > copy.evidence.length
                        ? (
                          <p className="tiny muted dx-evid-rest">
                            The other{' '}
                            {(evidenceTotal - copy.evidence.length).toLocaleString('en-US')}{' '}
                            are on My Leases — these are the largest.
                          </p>
                        )
                        : null}
                    </Step>
                  )
                  : null}

                {/* the only block that asks anything of the reader is the only
                    one that looks like it */}
                <div className="dx-do">
                  <span className="dx-do-k">What to do</span>
                  <Html html={lockFigures(copy.next)} className="dx-do-t" />
                </div>

                {copy.chips.length
                  ? (
                    <div className="ctx-chips">
                      {copy.chips.map((ch) => (
                        <span key={ch} className="chip chip-est" style={{ marginRight: 6 }}>{serviceText(ch)}</span>
                      ))}
                    </div>
                  )
                  : null}

                {/* ---- THE PANEL'S OWN SOURCE LINE, WHERE IT HAS ONE.
                    The reference prefers `copy.source` and falls back to the
                    global note. This used to print only the global note, so
                    every alert panel closed on the same sentence about how the
                    OWNER was matched on the appraisal roll — correct, and
                    nothing to do with the finding the reader had opened. */}
                {copy.source ?? sourceNote
                  ? <p className="tiny muted ctx-foot">{copy.source ?? sourceNote}</p>
                  : null}
              </>
            )
            : null}
        </div>
      </div>
    </>
  );
}

/* ---------------------------------------------------------------- a step */
function Step(
  { n, head, note, children }:
  { n: number; head: string; note?: string; children: React.ReactNode },
) {
  return (
    <section className="dx-step">
      <div className="dx-step-h">
        <span className="dx-n" aria-hidden="true">{n}</span>
        <h4>{head}</h4>
        {note ? <span className="dx-note">{note}</span> : null}
      </div>
      <div className="dx-step-b">{children}</div>
    </section>
  );
}

/* -------------------------------------------------------------- the spark */
/**
 * A 26px bar strip for the metric band.
 *
 * Bars and no axis: at this size a line is noise and an axis is unreadable,
 * but the shape — rising, tailing off, one spike — is legible, and the shape is
 * the only thing being claimed. The exact figures are in the band beside it and
 * in the full chart below, so nothing depends on reading this precisely. The
 * last bar is solid because it is the one the panel is about.
 */
function BandSpark({ values }: { values: number[] }) {
  const v = values.filter((x) => Number.isFinite(x));
  if (v.length < 3) return null;
  const max = Math.max(...v) || 1;
  return (
    <svg
      className="dx-svg" viewBox={`0 0 ${v.length * 4} 26`} preserveAspectRatio="none"
      role="img"
      aria-label={`${v.length} periods, highest ${Math.round(max)}, latest ${Math.round(v[v.length - 1])}`}
    >
      {v.map((x, i) => {
        const h = Math.max((x / max) * 24, x > 0 ? 2 : 0.6);
        return (
          <rect
            key={i} x={i * 4} y={26 - h} width="2.6" height={h} rx="0.8"
            fill="currentColor" opacity={i === v.length - 1 ? 1 : 0.4}
          />
        );
      })}
    </svg>
  );
}

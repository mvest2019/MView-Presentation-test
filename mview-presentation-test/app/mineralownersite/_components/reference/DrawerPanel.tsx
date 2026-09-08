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
import type { Drawer } from '../../_lib/reference/payload';
import { Html } from './bits';
import { Charts } from './LineChart';

const TONE_LABEL: Record<string, string> = {
  money: 'Money',
  activity: 'Activity',
  models: 'Models & forecasts',
  record: 'Your record',
};

export default function DrawerPanel(
  { copy, onClose, sample, sourceNote }:
  { copy: Drawer | null; onClose: () => void; sample: boolean; sourceNote: string | null },
) {
  const panel = useRef<HTMLDivElement | null>(null);
  const returnTo = useRef<HTMLElement | null>(null);
  const open = Boolean(copy);

  useEffect(() => {
    if (!open) return;
    returnTo.current = document.activeElement as HTMLElement | null;
    const el = panel.current;
    const focusables = () => Array.from(
      el?.querySelectorAll<HTMLElement>('button, [href], input, [tabindex]:not([tabindex="-1"])') ?? [],
    ).filter((n) => !n.hasAttribute('disabled'));
    focusables()[0]?.focus();

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
            <h3 id="ctxTitle">{copy?.title ?? ''}</h3>
            <div className="ctx-sub" id="ctxSub">{copy?.sub ?? ''}</div>
          </div>
          <button type="button" className="ctx-x" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="ctx-body">
          {copy
            ? (
              <>
                {sample
                  ? (
                    <p className="samp-band" style={{ margin: '0 0 14px' }}>
                      <strong>Sample view.</strong> The figures in this panel are withheld and shown
                      as <span aria-label="withheld">•••</span> — claim the record to see them.
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
                            <span className="dx-k">{st.label}</span>
                            <span className={'dx-v' + (st.tone ? ' t-' + st.tone : '')}>
                              {st.tone === 'up' ? '▲ ' : st.tone === 'down' ? '▼ ' : ''}
                              {st.tone === 'up' || st.tone === 'down'
                                ? st.value.replace(/^[+-]/, '')
                                : st.value}
                            </span>
                            {st.sub ? <span className="dx-s">{st.sub}</span> : null}
                          </div>
                        ))}
                      </div>
                      {copy.spark && copy.spark.filter((v) => v > 0).length > 2
                        ? (
                          <div className="dx-spark">
                            <BandSpark values={copy.spark} />
                            {copy.spark_label
                              ? <span className="dx-sparkcap">{copy.spark_label}</span>
                              : null}
                          </div>
                        )
                        : null}
                    </div>
                  )
                  : null}

                {/* ------------------------------------------ the four steps */}
                <Step n={1} head="What this is">
                  <Html html={copy.what} className="small" />
                </Step>

                <Step n={2} head="What it means for you">
                  <Html html={copy.means} className="small" />
                </Step>

                {/* the charts belong with the meaning: they are the picture of
                    the sentence above, and the record below then names the
                    individual figures */}
                <Charts specs={copy.charts ?? []} />

                {copy.evidence.length
                  ? (
                    <Step
                      n={3} head="What this is built on"
                      note={`${copy.evidence.length} ${copy.evidence.length === 1 ? 'line' : 'lines'} from the record`}
                    >
                      <ul className="dx-evid">
                        {copy.evidence.map((e, i) => (
                          <li key={i}>
                            <span className="dx-bullet" aria-hidden="true" />
                            <Html html={e} as="span" />
                          </li>
                        ))}
                      </ul>
                    </Step>
                  )
                  : null}

                {/* the only block that asks anything of the reader is the only
                    one that looks like it */}
                <div className="dx-do">
                  <span className="dx-do-k">What to do</span>
                  <Html html={copy.next} className="dx-do-t" />
                </div>

                {copy.chips.length
                  ? (
                    <div className="ctx-chips">
                      {copy.chips.map((ch) => (
                        <span key={ch} className="chip chip-est" style={{ marginRight: 6 }}>{ch}</span>
                      ))}
                    </div>
                  )
                  : null}

                {sourceNote
                  ? <p className="tiny muted ctx-foot">{sourceNote}</p>
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

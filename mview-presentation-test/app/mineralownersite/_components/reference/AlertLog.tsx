'use client';
/**
 * The alerts, opened out — one row per thing that actually happened.
 *
 * PORTED FROM the reference's `src/components/AlertLog.tsx`, which is the
 * first tab of its Alerts route. This app's Alerts page had the cards and not
 * the log, so twelve findings were the whole of what a reader could reach.
 *
 * ── WHAT THIS IS FOR ───────────────────────────────────────────────────────
 * An alert summarises, and that is right for a summary: "413 new drilling
 * permits filed in DE WITT" is the headline a reader wants. But it lists six
 * permits in its evidence and the other 407 are unreachable.
 *
 * This tab takes the same alerts and expands them: one row per filing, per
 * production month, per operator change — every kind, not only permits and
 * completions. Nothing is invented and nothing is dropped.
 *
 * ── IT IS BUILT ON THE TIMELINE, NOT ON THE FEED ───────────────────────────
 * `payload.timeline.events` is already this list — every row with its date,
 * its stats, and the drawer key it opens. Building from the raw activity feed
 * instead gave permits, completions and well status and silently left out the
 * PRODUCTION months, which are the rows about the reader's own leases and the
 * only ones that are about being paid.
 *
 * ── IT REUSES THE ALERT CARD'S OWN CLASSES ─────────────────────────────────
 * `al-row`, `al-ico`, `alx-stats`, `alx-k`, `alx-v` — the same markup the
 * cards on the other tab emit, so the two are the same object in the same
 * clothes. A hand-rolled card of its own drifted from them within a day: its
 * own radius, its own padding, its own type scale. There is no styling here
 * at all beyond the filter bar, and that is the point.
 *
 * ── ONE ADAPTATION, and it is this app's own improvement carried in ────────
 * The reference opens a row with `open(e.ctx)`, the KIND-level explainer —
 * one panel for "all permits". This app's Activities route already fixed that
 * (defects #12-#14, #17): `eventDrawer` builds the panel out of the clicked
 * row's own fields, and the API's `event.detail` overrides it where the
 * backend sends one. `AlertLog` opens rows exactly the same way, through the
 * SAME exported builder, so a filing opened from the log and the same filing
 * opened from Activities show one panel. Without `openEvent` — a caller that
 * has no event drawer — it falls back to the reference's `open(e.ctx)`.
 */
import { useMemo, useState } from 'react';
import type { Drawer, TimelineEvent } from '../../_lib/reference/payload';
import { n0, api10 } from '../../_lib/reference/fmt';
import { eventDrawer } from './ActivitiesView';

/** the icon tile and its colour, per kind — the card's own vocabulary */
const KIND: Record<string, { icon: string; tone: string }> = {
  production: { icon: 'mvi-audit', tone: '' },
  permit: { icon: 'mvi-map', tone: 'blue' },
  completion: { icon: 'mvi-activity', tone: '' },
  status: { icon: 'mvi-flag', tone: '' },
  adjacent: { icon: 'mvi-map', tone: 'gold' },
  operator: { icon: 'mvi-chat', tone: 'gold' },
};

/* ---- WHICH OF A FILING'S THREE DATES THE ROW IS SHOWING.
   A permit and a completion each carry a submitted, an approved and a
   completed date, and the row is dated by the one it is ABOUT — a completion
   by the day the well was finished, a permit by the day the state approved
   it. Printing the bare date said nothing about which, so the word goes in
   front of it. The full record is on the panel the row opens. */
const VERB: Record<string, string> = {
  completion: 'completed', approved: 'approved',
  submitted: 'submitted', published: 'published',
};

function isoOf(v: unknown): string | null {
  const s = String(v ?? '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

/** "202606" -> "2026-06-01", so a monthly row filters by day like the rest */
function cycleIso(c: string | null | undefined): string | null {
  const s = String(c ?? '');
  return /^\d{6}$/.test(s) ? `${s.slice(0, 4)}-${s.slice(4)}-01` : null;
}

export interface AlertLogProps {
  events: TimelineEvent[];
  /** the reference's own contract — a drawer KEY, used when nothing better */
  open: (key: string) => void;
  /** how many alert CARDS these events were drawn from, for the count line */
  cards: number;
  /** this app's per-event panel; absent, rows fall back to `open(e.ctx)` */
  openEvent?: (d: Drawer) => void;
  /** the pre-built kind explainers, for `eventDrawer`'s generic prose */
  drawers?: Record<string, Drawer> | null;
}

export default function AlertLog(
  { events, open, cards, openEvent, drawers }: AlertLogProps,
) {
  const all = useMemo(() => {
    const rows = events.map((e) => ({ e, iso: isoOf(e.sort_key) ?? cycleIso(e.cycle) }));
    /* NEWEST FIRST; undated last, because a missing date is not a recent one */
    rows.sort((x, y) => (y.iso ?? '').localeCompare(x.iso ?? ''));
    return rows;
  }, [events]);

  const span = useMemo(() => {
    const ds = all.map((r) => r.iso).filter((d): d is string => !!d).sort();
    return { first: ds[0] ?? '', last: ds[ds.length - 1] ?? '' };
  }, [all]);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [kind, setKind] = useState('all');
  const [mineOnly, setMineOnly] = useState(false);
  const [shown, setShown] = useState(25);
  const ranged = from !== '' || to !== '';
  const reset = () => setShown(25);

  const rows = useMemo(() => all.filter((r) => {
    if (kind !== 'all' && r.e.kind !== kind) return false;
    if (mineOnly && !r.e.is_mine) return false;
    if (!r.iso) return !ranged;
    if (from && r.iso < from) return false;
    if (to && r.iso > to) return false;
    return true;
  }), [all, kind, mineOnly, from, to, ranged]);

  const kinds = useMemo(() => {
    const seen = new Map<string, { n: number; label: string }>();
    for (const r of all) {
      const at = seen.get(r.e.kind);
      if (at) at.n += 1;
      else seen.set(r.e.kind, { n: 1, label: r.e.kind_label });
    }
    return [...seen.entries()];
  }, [all]);

  /* ONE EVENT, ONE PANEL — the same rule and the same builder as Activities.
     See the note at the top of this file. */
  const openRow = (e: TimelineEvent) => {
    if (!openEvent) { open(e.ctx); return; }
    const built = eventDrawer(e, drawers?.[e.ctx] ?? null);
    if (!e.detail) { openEvent(built); return; }
    const sent = Object.fromEntries(
      Object.entries(e.detail).filter(([, v]) =>
        v != null && (Array.isArray(v) ? v.length > 0 : v !== '')),
    );
    openEvent({ ...built, ...sent });
  };

  return (
    <div className="alog">
      {/* ---- THE FILTER BAR IS THE ONLY CHROME.
          No heading and no blurb: the tab is already named, and a paragraph
          explaining a list the reader is looking at is a paragraph in the way. */}
      <div className="alog-bar">
        <span className="alog-kinds" role="group" aria-label="Which kind">
          <button type="button" className={kind === 'all' ? 'on' : ''}
            aria-pressed={kind === 'all'}
            onClick={() => { setKind('all'); reset(); }}
          >
            Everything <b>{n0(all.length)}</b>
          </button>
          {kinds.map(([k, v]) => (
            <button key={k} type="button" className={kind === k ? 'on' : ''}
              aria-pressed={kind === k}
              onClick={() => { setKind(k); reset(); }}
            >
              {v.label} <b>{n0(v.n)}</b>
            </button>
          ))}
        </span>

        <label className={`alog-mine${mineOnly ? ' on' : ''}`}>
          <input type="checkbox" checked={mineOnly}
            onChange={(ev) => { setMineOnly(ev.target.checked); reset(); }}
          />
          On my leases
        </label>

        <label className="alog-range">
          <span className="alog-rk">From</span>
          <input type="date" value={from} min={span.first} max={span.last}
            onChange={(ev) => { setFrom(ev.target.value); reset(); }}
            aria-label="From this date"
          />
          <span className="alog-rk alog-rk-mid">to</span>
          <input type="date" value={to} min={span.first} max={span.last}
            onChange={(ev) => { setTo(ev.target.value); reset(); }}
            aria-label="Up to this date"
          />
          {ranged ? (
            <button type="button" className="alog-clear"
              onClick={() => { setFrom(''); setTo(''); reset(); }}
            >
              clear
            </button>
          ) : null}
        </label>
      </div>

      {/* ---- WHAT THIS TAB IS, IN THE LINE THAT WAS ALREADY THERE.
          The two tabs read as two products: "Alerts 985" beside "Alert cards
          8", described as the same thing in two shapes when they are not the
          same set at all. The cards are the FINDINGS — one per rule. These
          are the EVENTS those findings were drawn from, one row each. Said in
          the count line rather than as a heading, because the heading and the
          blurb were removed on purpose and a paragraph explaining a list the
          reader is looking at is a paragraph in the way. */}
      <p className="alog-count">
        <strong>{n0(Math.min(shown, rows.length))}</strong> of {n0(rows.length)}
        {' '}— every event the {cards} alert {cards === 1 ? 'card' : 'cards'} were drawn from,
        one row each
        {ranged ? <> · {from || span.first} to {to || span.last}</> : null}
      </p>

      {rows.length ? (
        <>
          <div className="stack">
            {rows.slice(0, shown).map(({ e, iso }) => {
              const k = KIND[e.kind] ?? { icon: 'mvi-bell', tone: '' };
              return (
                <article
                  key={e.id}
                  className={`al-row${e.is_mine ? ' sev-action' : ''}`}
                  role="button" tabIndex={0}
                  style={{ cursor: 'pointer' }}
                  onClick={() => openRow(e)}
                  onKeyDown={(ev) => {
                    /* `ev.code` as well as `ev.key`: a layout or IME that does
                       not report a space in `key` still reports `Space` here,
                       and a row that answers the mouse but not the keyboard is
                       not a button whatever `role` says. Same rule as the
                       alert cards on the next tab. */
                    if (ev.key === 'Enter' || ev.key === ' ' || ev.code === 'Space') {
                      ev.preventDefault(); openRow(e);
                    }
                  }}
                  aria-label={`${e.kind_label}. ${e.title}. Opens the detail.`}
                >
                  <span className={`al-ico ${k.tone}`} aria-hidden="true">
                    <svg className="mvi-inline"><use href={`#${k.icon}`} /></svg>
                  </span>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="between" style={{ flexWrap: 'wrap', gap: 6 }}>
                      <strong className="small">
                        <span className="al-sev s-imp">{e.kind_label}</span>
                        {e.title}
                      </strong>
                      <span className="tiny muted num">
                        {e.filing?.date_basis && e.when_label
                          ? `${e.filing.of === 'status'
                            ? 'recorded' : VERB[e.filing.date_basis]} ${e.when_label}`
                          : e.when_label ?? iso ?? 'no date'}
                        {e.distance_mi != null
                          ? ` · ${e.distance_mi.toFixed(2)} mi away`
                          : ''}
                        {e.is_mine ? ' · on your lease' : ''}
                      </span>
                    </div>

                    <p className="tiny muted" style={{ margin: '3px 0 8px' }}>
                      {e.body} <span className="ctx-hint">expand →</span>
                    </p>

                    {/* THE CARD'S OWN STAT STRIP, class for class — so a row
                        here and a card there are the same object. */}
                    {e.stats?.length || api10(e.api)
                      || e.filing?.permit_no || e.filing?.tracking_no ? (
                      <div className="alx-stats">
                        {(e.stats ?? []).slice(0, 4).map((st) => (
                          <div className="alx-stat" key={st.label}>
                            <span className="alx-k">{st.label}</span>
                            <span className="alx-v">{st.value}</span>
                            {st.sub ? <span className="alx-s">{st.sub}</span> : null}
                          </div>
                        ))}
                        {api10(e.api) ? (
                          <div className="alx-stat">
                            <span className="alx-k">API</span>
                            <span className="alx-v">{api10(e.api)}</span>
                          </div>
                        ) : null}
                        {/* THE NUMBER THE READER WOULD QUOTE BACK to the
                            Commission. A permit carries `status_number` and a
                            completion `tracking_no`, and never the other's —
                            so the label moves with the value. */}
                        {e.filing?.permit_no ? (
                          <div className="alx-stat">
                            <span className="alx-k">Permit no.</span>
                            <span className="alx-v">{e.filing.permit_no}</span>
                          </div>
                        ) : null}
                        {e.filing?.tracking_no ? (
                          <div className="alx-stat">
                            <span className="alx-k">Tracking no.</span>
                            <span className="alx-v">{e.filing.tracking_no}</span>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>

          {shown < rows.length ? (
            <button type="button" className="alog-more" onClick={() => setShown((v) => v + 50)}>
              Show 50 more — {n0(rows.length - shown)} still below
            </button>
          ) : (
            <p className="alog-end">That is all {n0(rows.length)} of them.</p>
          )}
        </>
      ) : (
        <p className="alog-empty">
          Nothing falls in that range. The record runs{' '}
          <strong>{span.first || 'no dates'}</strong> to <strong>{span.last || 'no dates'}</strong>.
        </p>
      )}
    </div>
  );
}

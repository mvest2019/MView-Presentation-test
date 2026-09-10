'use client';
/**
 * Three panels the dashboard was missing, plus one shared chart.
 *
 * WHY THEY EXIST
 *
 * · `Essentials` — the Essentials persona was four panels and almost nothing to
 *   read. It is the view for an owner who is NOT an industry professional, so it
 *   now answers five questions in the order a landowner actually asks them,
 *   each in sentences rather than as figures in a grid, each opening the full
 *   evidence. Nothing here is duplicated from Detailed: the trend sentence reads
 *   the filed months, the nearby sentence reads the activity feed, and "watch
 *   next" picks the single highest-severity finding rather than listing nine.
 *
 * · `Wells` — v1 had this card and this build had dropped it, which is part of
 *   why the right rail ran short and left a rectangle of empty page.
 *
 * · `ValueMix` — a ten-lease portfolio is almost never even, and the
 *   concentration is the one thing an owner cannot see from a list.
 */
import React, { useMemo } from 'react';
import type { Payload } from '../../_lib/reference/payload';
import { n0, usd, usdShort, pctS, vol, plural, MCF, BBL } from '../../_lib/reference/fmt';
import { Pager, usePaged } from './bits';
import type { Route } from './Portal';

/* ============================================================= Essentials */
export function Essentials(
  { p, sample, open, go }:
  { p: Payload; sample: boolean; open: (k: string) => void; go: (r: Route) => void },
) {
  const t = p.totals;
  const a = p.as_of;
  const ac = p.activities;
  const r = p.reserves;
  const key = t.has_gas ? 'gas_net' : 'oil_net';
  const unit = t.has_gas ? MCF : BBL;
  const filed = p.series.months.filter((m) => m[key] > 0);
  const action = p.alerts.items.find((x) => x.severity === 'action') ?? p.alerts.items[0] ?? null;

  /* the direction of travel, in words rather than as a percentage */
  let trend: React.ReactNode;
  if (filed.length >= 6) {
    const last3 = filed.slice(-3).reduce((x, m) => x + m[key], 0) / 3;
    const prev3 = filed.slice(-6, -3).reduce((x, m) => x + m[key], 0) / 3;
    const chg = prev3 ? ((last3 - prev3) / prev3) * 100 : null;
    const word = chg == null ? 'steady' : chg > 8 ? 'rising' : chg < -8 ? 'easing back' : 'holding steady';
    trend = (
      <>
        Your {t.has_gas ? 'gas' : 'oil'} is <strong>{word}</strong>. The last three filed months
        averaged <strong>{n0(last3)} {unit}</strong> to you
        {chg == null ? null : <> against {n0(prev3)} {unit} in the three before</>}. A slow taper is
        what a producing well does; a sharp one-month drop is the thing worth asking about.
      </>
    );
  } else {
    trend = (
      <>
        Only <strong>{filed.length}</strong> {plural(filed.length, 'month')} on record carries a
        filing, which is too few to read a direction from yet.
      </>
    );
  }

  const cards: { k: string; head: string; body: React.ReactNode; ctx: string; hint: string }[] = [
    {
      k: 'earning',
      head: 'Are my leases earning?',
      ctx: 'producing',
      hint: 'What paused means',
      body: (
        <>
          <strong>{t.producing_count} of your {t.lease_count} {plural(t.lease_count, 'lease')}</strong>{' '}
          have production on the public record, and <strong>{t.reporting_count}</strong> filed for{' '}
          {a.data_month_label}.{' '}
          {t.behind_count
            ? <>{t.behind_count} {t.behind_count === 1 ? 'is' : 'are'} simply behind on paperwork — a
                filing lag, not a stoppage.</>
            : <>Every producing lease is up to date on its filing.</>}
          {t.paused_count
            ? <> {t.paused_count} {t.paused_count === 1 ? 'lease has' : 'leases have'} nothing on
                record at all, which is worth asking your operator about.</>
            : null}
        </>
      ),
    },
    {
      k: 'trend',
      head: 'Is it going up or down?',
      ctx: 'production',
      hint: 'See the months',
      body: trend,
    },
    {
      k: 'worth',
      head: 'What is it worth?',
      ctx: 'value',
      hint: 'How it is built',
      body: (
        <>
          The model puts your share at <strong>{usd(t.owner_value)}</strong> over six years, in a
          range of {usdShort(t.owner_value_low)} to {usdShort(t.owner_value_high)}. The county
          separately appraised the same interests at <strong>{usd(t.appraised_value)}</strong> for
          roll year {t.appraised_year} — the two answer different questions, so them disagreeing is
          normal. Still to come, as your share:{' '}
          <strong>{vol(t.reserves_gas_net, t.reserves_oil_net, true)}</strong>
          {r.probability_avg != null
            ? <>, with a {pctS(r.probability_avg, 0)} average chance of a new well.</>
            : <>.</>}
        </>
      ),
    },
    {
      k: 'around',
      head: 'What is happening around me?',
      ctx: 'permits',
      hint: 'Why neighbors matter',
      body: ac.counts.nearby
        ? (
          <>
            <strong>{n0(ac.counts.nearby)} {plural(ac.counts.nearby, 'filing')}</strong> near your
            acreage in the last {ac.window_months} months — {ac.counts.permits}{' '}
            {plural(ac.counts.permits, 'permit')} and {ac.counts.completions}{' '}
            {plural(ac.counts.completions, 'completion')} in {ac.counties.join(', ')}.{' '}
            {ac.compare_90.change_pct != null
              ? <>That is {ac.compare_90.change_pct > 0 ? 'busier' : 'quieter'} than the 90 days
                  before it. </>
              : null}
            A completion next door does not pay you, but it proves the rock under your own tract.
          </>
        )
        : (
          <>
            Nothing has been filed in {ac.counties.join(', ') || 'your counties'} in the last{' '}
            {ac.window_months} months. That is the record as it stands rather than a gap in it.
          </>
        ),
    },
    {
      k: 'watch',
      head: 'What should I watch next?',
      ctx: action ? 'alert:' + action.id : 'reserves',
      hint: 'Expand',
      body: action
        ? (
          <>
            <strong>{action.title}</strong> — {action.body}
            {action.lead_lease ? <> The lease is {action.lead_lease}.</> : null}
          </>
        )
        : (
          <>
            Nothing on these leases is asking for a decision. The next thing that would is a
            neighbor permit inside a mile of a lease with a high new-well chance — both are watched
            for you.
          </>
        ),
    },
  ];

  return (
    <>
      <div className="act-band" style={{ marginTop: 14 }}>
        Your minerals in plain English{sample ? ' — sample figures, real dates' : ''}
      </div>
      <div className="mv-cards">
        {cards.map((c) => (
          <div
            className="card card-pad" key={c.k} role="button" tabIndex={0}
            style={{ cursor: 'pointer', borderLeft: '4px solid var(--green)' }}
            onClick={() => open(c.ctx)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(c.ctx); }
            }}
          >
            <h4 style={{ margin: '0 0 6px' }}>{c.head}</h4>
            <p className="small" style={{ margin: '0 0 8px', lineHeight: 1.6 }}>{c.body}</p>
            <span className="ctx-hint">{c.hint} &#8594;</span>
          </div>
        ))}
      </div>

      {/* the month chart earns its place even here — it is the one thing a
          sentence cannot show as well as a picture */}
      <div className="card card-pad" style={{ margin: '14px 0 0' }}>
        <div className="between" style={{ flexWrap: 'wrap' }}>
          <h4>Your {t.has_gas ? 'gas' : 'oil'}, month by month</h4>
          <span className="chip chip-slate" style={{ fontSize: 10 }}>
            {filed.length} of {p.series.months.length} months filed
          </span>
        </div>
        <p className="tiny muted" style={{ margin: '4px 0 10px' }}>
          Grey months are ones the state has not filed yet — not a fall to zero.
        </p>
        <ProdCols p={p} />
        <p style={{ margin: '12px 0 0', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => go('activities')}>
            All activity near you &#8594;
          </button>
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => go('alerts')}>
            All {p.alerts.count} findings &#8594;
          </button>
        </p>
      </div>
    </>
  );
}

/** the bare month columns, shared by Essentials and the Detailed trend card */
export function ProdCols({ p }: { p: Payload }) {
  const s = p.series;
  const key = p.totals.has_gas ? 'gas_net' : 'oil_net';
  const unit = p.totals.has_gas ? MCF : BBL;
  const max = Math.max(1, ...s.months.map((m) => m[key]));
  return (
    <>
      <div className="mcols">
        {s.months.map((m) => (
          <span
            key={m.cycle}
            className={'mc' + (m[key] > 0 ? '' : ' dim')}
            style={{ height: Math.max((m[key] / max) * 100, m[key] > 0 ? 2 : 1).toFixed(1) + '%' }}
            title={`${m.label} · ${n0(m[key])} ${unit} to you · ${m.leases} ${plural(m.leases, 'lease')} filing`}
          />
        ))}
      </div>
      <div className="mcax">
        <span>{s.months[0]?.label}</span>
        <span>peak {n0(max)} {unit}</span>
        <span>{s.months[s.months.length - 1]?.label}</span>
      </div>
    </>
  );
}

/* ================================================================== wells */
/**
 * The wells behind the volume.
 *
 * The map is a scatter of the real coordinates, scaled to the bounding box of
 * this owner's own wells. It is NOT a basemap and does not pretend to be one —
 * the caption says "relative positions", because a scatter with no geography
 * behind it that looked like a map would be a lie about precision.
 */
export function Wells({ p, open }: { p: Payload; open: (k: string) => void }) {
  const all = p.leases.flatMap((l) =>
    (l.wells ?? []).map((w) => ({ ...w, lease_name: l.lease_name, lid: l.lease_id })));
  if (!all.length) return null;

  const pts = all.filter((w) => w.lat != null && w.lon != null);
  const lats = pts.map((w) => w.lat as number);
  const lons = pts.map((w) => w.lon as number);
  const pad = 0.07;
  const y0 = Math.min(...lats);
  const y1 = Math.max(...lats);
  const x0 = Math.min(...lons);
  const x1 = Math.max(...lons);
  const spanY = (y1 - y0) || 1;
  const spanX = (x1 - x0) || 1;

  const byStatus = new Map<string, number>();
  for (const w of all) {
    const k = (w.status ?? 'not recorded').toUpperCase();
    byStatus.set(k, (byStatus.get(k) ?? 0) + 1);
  }
  const deepest = all.filter((w) => w.depth_ft).sort((a, b) => (b.depth_ft ?? 0) - (a.depth_ft ?? 0))[0];
  const newest = all.filter((w) => w.spud_iso)
    .sort((a, b) => (b.spud_iso ?? '').localeCompare(a.spud_iso ?? ''))[0];
  const live = all.filter((w) => w.last_month_boe > 0).length;

  return (
    <div className="card card-pad" id="wellCard">
      <div className="between" style={{ flexWrap: 'wrap' }}>
        <h4>Your wells</h4>
        <span className="chip chip-slate" style={{ fontSize: 10 }}>
          {all.length} {plural(all.length, 'well')}
        </span>
      </div>
      <p className="tiny muted" style={{ margin: '4px 0 8px' }}>
        Every well the state records on a lease you hold. {pts.length} of {all.length} carry
        coordinates; {live} filed volume in the last reported month.
      </p>

      {pts.length > 1
        ? (
          <div className="wmap">
            {pts.map((w, i) => {
              const left = ((((w.lon as number) - x0) / spanX) * (1 - 2 * pad) + pad) * 100;
              const top = (1 - (((w.lat as number) - y0) / spanY) * (1 - 2 * pad) - pad) * 100;
              const on = w.last_month_boe > 0;
              const size = on ? 11 : 8;
              return (
                <span
                  key={(w.api14 ?? w.lid) + ':' + i}
                  className="wpt" role="button" tabIndex={0}
                  style={{
                    position: 'absolute',
                    left: left.toFixed(1) + '%', top: top.toFixed(1) + '%',
                    width: size, height: size, borderRadius: '50%',
                    background: on ? 'var(--green)' : '#b8892f',
                    border: '2px solid #fff', transform: 'translate(-50%,-50%)',
                    boxShadow: '0 1px 4px rgba(0,0,0,.3)', cursor: 'pointer',
                  }}
                  title={`${w.well_name ?? w.lease_name} well ${w.well_number ?? '—'} — ${w.status ?? 'status not recorded'}${w.depth_ft ? `, ${n0(w.depth_ft)} ft` : ''}${w.spud_label ? `, spudded ${w.spud_label}` : ''}`}
                  /* the WELL drawer, not the lease drawer: clicking a pin
                      used to show the lease and none of the well's own record
                      - no API number, no status, no depth */
                  onClick={() => open('well:' + (w.api14 ?? `${w.lid}-${w.well_number ?? 'x'}`))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') open('well:' + (w.api14 ?? `${w.lid}-${w.well_number ?? 'x'}`));
                  }}
                />
              );
            })}
            <span className="wmap-note">
              relative positions · green filed last month, amber did not
            </span>
          </div>
        )
        : null}

      {[...byStatus.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => (
        <div
          className="setrow" key={k} role="button" tabIndex={0}
          onClick={() => open('producing')}
          onKeyDown={(e) => { if (e.key === 'Enter') open('producing'); }}
        >
          <div style={{ minWidth: 0 }}>
            <strong className="small">{k}</strong>
            <div className="tiny muted">as the state records it</div>
          </div>
          <span className="num small" style={{ fontWeight: 800 }}>{v}</span>
        </div>
      ))}

      <p
        className="tiny muted"
        style={{ margin: '9px 0 0', paddingTop: 8, borderTop: '1px solid var(--line)' }}
      >
        {deepest?.depth_ft
          ? <>Deepest on record: <strong>{n0(deepest.depth_ft)} ft</strong> ({deepest.lease_name}). </>
          : null}
        {newest?.spud_label
          ? <>Most recently drilled: <strong>{newest.spud_label}</strong> ({newest.lease_name}).</>
          : null}
        {!deepest?.depth_ft && !newest?.spud_label
          ? 'The well records carry no depth or spud date for these leases.'
          : null}
      </p>
    </div>
  );
}

/* ============================================================== value mix */
/**
 * Where the value actually sits.
 *
 * Said twice — by county and by operator — because those are the two ways it
 * matters: county is where the rock is, operator is who has to pay you.
 */
export function ValueMix({ p, open }: { p: Payload; open: (k: string) => void }) {
  const t = p.totals;

  /* ROLLED UP BEFORE THE EARLY RETURN, because `usePaged` below is a hook and
     an account whose value arrives zero on one render and non-zero on the next
     would otherwise change the hook order between them. Same trap the
     operators card hit; `react-hooks/rules-of-hooks` catches it. */
  const counties = useMemo(() => {
    const byCounty = new Map<string, number>();
    for (const l of p.leases) {
      const k = l.county ?? 'county not recorded';
      byCounty.set(k, (byCounty.get(k) ?? 0) + l.owner_value);
    }
    return [...byCounty.entries()].sort((a, b) => b[1] - a[1]);
  }, [p.leases]);
  const pg = usePaged(counties);

  if (!t.owner_value) return null;

  const ops = p.operators.operators;
  const topOp = ops[0];
  /* THE BAR SCALE IS EVERY COUNTY'S, not the page's — otherwise the biggest
     county on page three draws a full bar and looks like the biggest overall.
     Same rule as the operators card. */
  const maxC = Math.max(1, ...counties.map(([, v]) => v));

  return (
    <div className="card card-pad" style={{ borderTop: '3px solid var(--green)' }}>
      <div className="between" style={{ flexWrap: 'wrap' }}>
        <h4>Where your value sits</h4>
        <span className="chip chip-slate" style={{ fontSize: 10 }}>
          {counties.length} {counties.length === 1 ? 'county' : 'counties'}
        </span>
      </div>
      <p className="tiny muted" style={{ margin: '4px 0 10px' }}>
        Your share of the six-year estimate, split by where the acreage is.
      </p>

      {pg.rows.map(([name, v]) => (
        <div
          className="lbar" key={name} role="button" tabIndex={0}
          onClick={() => open('value')}
          onKeyDown={(e) => { if (e.key === 'Enter') open('value'); }}
          title={`${name} — ${usd(v)}, ${((v / t.owner_value) * 100).toFixed(1)}% of your value`}
        >
          <span className="lb-name">{name}</span>
          <span className="lb-track">
            <span
              className="lb-fill"
              style={{ width: Math.max((v / maxC) * 100, v > 0 ? 1.5 : 0).toFixed(2) + '%' }}
            />
          </span>
          <span className="lb-val">{usdShort(v)}</span>
        </div>
      ))}

      <Pager
        page={pg.page} pages={pg.pages} setPage={pg.setPage} start={pg.start}
        shown={pg.rows.length} total={counties.length} label="County pages"
      />

      <div className="chart-insight">
        <span className="ci-dot" aria-hidden="true" />
        {topOp
          ? (
            <>
              <strong>{topOp.operator_name}</strong> holds{' '}
              <strong>{((topOp.owner_share_value / t.owner_value) * 100).toFixed(0)}%</strong> of
              your value across {topOp.lease_count} of your {plural(topOp.lease_count, 'lease')}.
              {ops.length > 1
                ? <> The other {ops.length - 1} {plural(ops.length - 1, 'operator')}{' '}
                    {ops.length - 1 === 1 ? 'accounts' : 'account'} for the rest.</>
                : <> They are your only operator, so one relationship carries the whole portfolio.</>}
              {' '}That concentration is worth knowing before a division order or a payment address
              ever needs checking.
            </>
          )
          : <>No operator is recorded against these leases.</>}
      </div>
    </div>
  );
}

'use client';
/**
 * How long these leases have been producing.
 *
 * The one thing the dashboard could not answer and an owner always asks: is
 * this acreage young or old? It decides how to read everything else on the
 * page — a lease three years into its life declining 8% a year is behaving
 * normally, and the same decline on a lease four months old is not.
 *
 * Both figures are already in the payload and nothing was showing them:
 * `first_production_label` (when the state first recorded volume) and
 * `months_reported` (how many months it has actually filed). They are
 * different numbers, and the gap between them is itself the finding — a lease
 * that first produced 120 months ago but has only filed 60 has been off as
 * often as on.
 */
import React from 'react';
import type { Payload } from '../../_lib/reference/payload';
import { n0, plural, vol } from '../../_lib/reference/fmt';

export function Maturity({ p, open }: { p: Payload; open: (k: string) => void }) {
  const withFirst = p.leases.filter((l) => l.first_production);
  if (!withFirst.length) return null;

  /* age in months, from the earliest recorded production on each lease */
  const now = new Date();
  const ageOf = (iso: string | null): number | null => {
    if (!iso) return null;
    const m = /^(\d{4})(\d{2})/.exec(iso.replace(/-/g, ''));
    if (!m) return null;
    const y = Number(m[1]);
    const mo = Number(m[2]);
    if (!y || !mo) return null;
    return (now.getUTCFullYear() - y) * 12 + (now.getUTCMonth() + 1 - mo);
  };

  const rows = withFirst
    .map((l) => ({
      lease_id: l.lease_id,
      name: l.lease_name ?? l.lease_id,
      first: l.first_production_label,
      age: ageOf(l.first_production),
      filed: l.months_reported,
      gas: l.ttm_gas_net,
      oil: l.ttm_oil_net,
    }))
    .filter((r) => r.age != null && r.age > 0)
    .sort((a, b) => (b.age ?? 0) - (a.age ?? 0));

  if (!rows.length) return null;

  const maxAge = Math.max(...rows.map((r) => r.age ?? 0));
  const oldest = rows[0];
  const youngest = rows[rows.length - 1];
  const medianAge = rows.map((r) => r.age ?? 0).sort((a, b) => a - b)[Math.floor(rows.length / 2)];
  /* how much of its own life each lease has actually filed for */
  const duty = rows.map((r) => (r.age ? Math.min(1, r.filed / r.age) : 1));
  const meanDuty = duty.reduce((a, b) => a + b, 0) / duty.length;
  const patchy = rows.filter((r, i) => duty[i] < 0.7);

  const yrs = (m: number | null) => (m == null ? '—' : (m / 12).toFixed(m < 24 ? 1 : 0));

  return (
    <div className="card card-pad">
      <div className="between" style={{ flexWrap: 'wrap' }}>
        <h4>How long these leases have produced</h4>
        <span className="chip chip-slate" style={{ fontSize: 10 }}>
          median {yrs(medianAge)} {Number(yrs(medianAge)) === 1 ? 'year' : 'years'}
        </span>
      </div>
      <p className="tiny muted" style={{ margin: '4px 0 10px' }}>
        Counted from the first month the state recorded production on each lease. The bar is the
        lease&rsquo;s age; the figure beside it is how many months it has actually filed.
      </p>

      {/* ADAPTED · TOP TEN ONLY, sorted oldest first as the reference sorts
          them. The median, the mean duty cycle and the patchy count above stay
          over EVERY lease — they are statements about the portfolio, and
          computing them off a truncated list would make them wrong. */}
      {rows.slice(0, 10).map((r, i) => (
        <div
          className="lbar" key={r.lease_id + r.first} role="button" tabIndex={0}
          onClick={() => open('lease:' + r.lease_id)}
          onKeyDown={(e) => { if (e.key === 'Enter') open('lease:' + r.lease_id); }}
          title={`${r.name} — first produced ${r.first}, ${yrs(r.age)} years ago. Filed ${r.filed} of those ${r.age} months. Last twelve filed months to you: ${vol(r.gas, r.oil, true)}.`}
        >
          <span className="lb-name">{r.name}</span>
          <span className="lb-track">
            <span
              className={'lb-fill' + (duty[i] < 0.7 ? ' amber' : '')}
              style={{ width: Math.max(((r.age ?? 0) / maxAge) * 100, 1.5).toFixed(2) + '%' }}
            />
          </span>
          <span className="lb-val">{yrs(r.age)}y · {r.filed}m</span>
        </div>
      ))}

      <div className="chart-insight">
        <span className="ci-dot" aria-hidden="true" />
        <strong>{oldest.name}</strong> is the oldest at {yrs(oldest.age)} years, first producing{' '}
        {oldest.first}
        {rows.length > 1
          ? <>, and <strong>{youngest.name}</strong> the youngest at {yrs(youngest.age)}</>
          : null}
        . Across all {rows.length} {plural(rows.length, 'lease')} the record shows volume filed for{' '}
        <strong>{Math.round(meanDuty * 100)}%</strong> of the months they have existed.{' '}
        {patchy.length
          ? (
            <>
              {patchy.length} {plural(patchy.length, 'lease')} {patchy.length === 1 ? 'has' : 'have'}{' '}
              filed for well under three quarters of its life — shown amber above. That is a well
              that has been shut in and restarted rather than one that simply declined, and it is
              worth knowing before reading any trend on it.
            </>
          )
          : (
            <>
              None of them has a large gap in its filing history, so the decline you see on this
              page is a real curve rather than an artefact of months that were never reported.
            </>
          )}
        {' '}Older acreage declines more slowly and more predictably; a lease under two years old
        is still in the steep part of its curve.
      </div>
    </div>
  );
}

/** total months of filed production behind the whole portfolio, for the header */
export function totalLeaseMonths(p: Payload): number {
  return p.leases.reduce((a, l) => a + l.months_reported, 0);
}

export { n0 };

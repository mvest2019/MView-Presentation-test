import { productCharts } from './chart';
import {
  interest, n0, pct0, plural, usd, usdShort, vol, volWords,
} from './fmt';
import type { Drawer, Payload } from './payload';

/**
 * THE `lease:*` AND `well:*` EXPLAINERS, built from the rows themselves.
 *
 * WHY THIS FILE EXISTS. `/api/v1/dashboard/drawers/{key}` serves the eleven
 * flat keys and five of the nine `alert:*` keys. It advertises `lease:*` and
 * `well:*` in `drawer_keys` and serves NEITHER — every one of the twenty-one
 * lease keys and sixty-eight well keys answers
 * `DASHBOARD_DRAWER_NOT_FOUND: "There is no explainer with that key for this
 * owner"`. That was measured across the whole family, not inferred from one id.
 *
 * A missing key is not a blank panel, it is a DEAD CONTROL. `DrawerPanel`
 * hides both itself and its scrim when `copy` is null, so the Dashboard's
 * value-by-lease rows, its wells, its maturity bars and its "where your value
 * sits" card would all have an "expand →" that does nothing — five places, in
 * the reference's own layout, silently inert.
 *
 * THIS IS NOT INVENTED DATA, and that is the point of doing it this way. The
 * reference derives these two families from the lease and well rows and
 * nothing else — no prose of its own, no second source — so the code below is
 * `src/lib/drawers.ts` lines 556-705, VERBATIM, with the loop body lifted out
 * into two functions and `movement()` copied down with it. Every field it
 * reads was checked against the live response: thirty-four on the lease,
 * twenty-one on the well, none missing. The same argument the alert
 * explainers are rebuilt on, in `owner-data.ts`, applies here unchanged.
 */

/** `drawers.ts` line 52, copied with the code that calls it */
function movement(p: number | null | undefined): string {
  if (p == null) return 'had no prior month';
  if (Math.abs(p) < 0.005) return 'held steady';
  return `${p > 0 ? 'rose' : 'eased'} ${Math.abs(p).toFixed(2)}%`;
}

type Lease = Payload['leases'][number];
type Well = Lease['wells'][number];
type Totals = Payload['totals'];
type AsOf = Payload['as_of'];

/** one lease's panel — `drawers.ts` lines 559-629 */
function leaseDrawer(l: Lease, t: Totals): Drawer {
  const share = t.owner_value ? (l.owner_value / t.owner_value) * 100 : null;
  return {
    title: l.lease_name ?? l.lease_id,
    sub: `${l.county ?? 'county not recorded'}${l.play ? ' · ' + l.play : ''} · operator `
      + `${l.operator_name ?? 'not recorded'}`,
    what: `You hold a <strong>${(l.interest_type ?? 'interest').toLowerCase()}</strong> of `
      + `<strong>${interest(l.interest_value)}</strong> in this lease. The model values the whole `
      + `lease at <strong>${usd(l.gross_value)}</strong>, which makes your share `
      + `<strong>${usd(l.owner_value)}</strong>`
      + (share ? ` — ${share.toFixed(1)}% of your whole portfolio` : '') + '.',
    means: `It last filed production for <strong>${l.anchor_label ?? 'never'}</strong>: `
      + `${volWords(l.anchor_gas_net, l.anchor_oil_net)}. `
      + (l.gas_change_pct != null || l.oil_change_pct != null
        ? `Against the month before it ${movement(l.gas_change_pct ?? l.oil_change_pct)}.`
        : 'There is no earlier filed month to compare it with.'),
    evidence: [
      `First production <strong>${l.first_production_label ?? 'not recorded'}</strong>, `
        + `${l.months_reported} filed ${plural(l.months_reported, 'month')} on record.`,
      `Life of lease: ${volWords(l.total_gas, l.total_oil)}.`,
      `Still to come, your share: ${volWords(l.reserves_gas_net, l.reserves_oil_net)}.`,
      `Appraised at <strong>${usd(l.appraised_value)}</strong> for roll year ${t.appraised_year}.`,
      `New-well chance: ${l.modelled
        ? `${pct0(l.probability)} (${l.probability_category})`
        : 'not modelled — which is not the same as 0%'}.`,
      ...(l.permits_1mi || l.neighbours_1mi
        ? [`${n0(l.permits_1mi)} ${plural(l.permits_1mi, 'permit')} within a mile, on `
           + `${n0(l.neighbours_1mi)} neighbouring ${plural(l.neighbours_1mi, 'lease')}.`]
        : []),
      ...(l.acres ? [`Acreage ${n0(l.acres)}.`] : []),
      ...(l.operator_changes
        ? [`Operator changed ${l.operator_changes} ${plural(l.operator_changes, 'time')} on this `
           + `lease; the latest is ${l.tenures[l.tenures.length - 1]?.operator_name ?? '—'}.`]
        : []),
      ...(l.completion_operator && l.operator_name
          && l.completion_operator.slice(0, 6).toUpperCase()
            !== l.operator_name.slice(0, 6).toUpperCase()
        ? [`The wells here were completed by <strong>${l.completion_operator}</strong>, which is `
           + 'not the operator running it now — normal after a handover.']
        : []),
    ],
    next: 'Compare the filed volume above against the volume on your statement for the same '
      + 'month. They should agree. If they do not, that gap is exactly what a lease audit is for.',
    tone: 'money',
    stats: [
      { label: 'Your interest', value: interest(l.interest_value) ?? '—',
        sub: (l.interest_type ?? 'interest').toLowerCase() },
      { label: 'Your share of the value', value: usd(l.owner_value) ?? '—',
        sub: `whole lease ${usdShort(l.gross_value)}` },
      { label: 'Last filed', value: l.anchor_label ?? 'never',
        sub: vol(l.anchor_gas_net, l.anchor_oil_net, true),
        tone: l.at_portfolio_anchor ? undefined : 'warn' },
      { label: 'Still to come',
        value: vol(l.reserves_gas_net, l.reserves_oil_net, true) },
    ],
    chips: l.lease_status ? [l.lease_status] : [],
    /* THIS lease's own months, gas and oil in separate panels because mcf
       and bbl do not share an axis. A lease that only ever produced gas gets
       one panel rather than an empty oil chart implying the oil stopped. */
    charts: productCharts(
      l.monthly.map((m) => ({
        label: m.label, cycle: m.cycle,
        gas: m.reported ? m.gas_net : Number.NaN,
        oil: m.reported ? m.oil_net : Number.NaN,
      })),
      { gasName: 'Gas to you from this lease',
        oilName: 'Oil to you from this lease',
        sub: `${l.months_reported} filed ${plural(l.months_reported, 'month')} · first produced `
          + `${l.first_production_label ?? 'not recorded'}`,
        keyPrefix: 'lease:' + l.lease_id,
        footnote: 'Your interest applied. Hover any month for the exact figure the state '
          + 'holds for it.' },
    ),
  };
}

/**
 * one well's panel — `drawers.ts` lines 636-704
 *
 * The comment the reference leaves on this loop is worth keeping: "The wells
 * map sent every pin to the LEASE drawer, so clicking a well showed the lease
 * and none of the well's own record — no API number, no status, no depth. Each
 * well now has its own panel."
 */
function wellDrawer(w: Well, l: Lease, a: AsOf): Drawer {
  return {
    title: `${w.well_name ?? l.lease_name ?? 'Well'}${w.well_number ? ' · well ' + w.well_number : ''}`,
    sub: [w.status, w.well_type, w.profile, l.county ? l.county + ' County' : null]
      .filter(Boolean).join(' · ') || 'one well on a lease you hold',
    what: `This is <strong>one well</strong> on <strong>${l.lease_name}</strong>, the lease you `
      + `hold a ${(l.interest_type ?? 'interest').toLowerCase()} of `
      + `${interest(l.interest_value)} in. `
      + (w.api14
        ? 'Its API number — the state’s permanent identifier for this wellbore — is '
          + `<strong>${w.api14}</strong>.`
        : 'The record carries no API number for it.'),
    means: (w.status
      ? `The state currently records it as <strong>${w.status}</strong>. `
      : 'The state records no status for it. ')
      + (w.last_month_boe > 0
        ? 'It filed volume in the last reported month, so it is one of the wells actually '
          + 'earning on this lease.'
        : 'It did not file volume in the last reported month. That can mean shut in, '
          + 'awaiting completion, or simply behind on filing — the status above is the '
          + 'state’s own word for it.'),
    evidence: [
      ...(w.api14 ? [`API number <strong>${w.api14}</strong> — the identifier to quote in `
        + 'any question to the operator or the Commission.'] : []),
      ...(w.well_number ? [`Well number on the lease: <strong>${w.well_number}</strong>.`] : []),
      ...(w.status ? [`Status: <strong>${w.status}</strong>`
        + (w.status_number ? ` (code ${w.status_number})` : '') + '.'] : []),
      ...(w.well_type ? [`Type: <strong>${w.well_type}</strong>.`] : []),
      ...(w.profile ? [`Wellbore profile: <strong>${w.profile}</strong>.`] : []),
      ...(w.depth_ft
        ? [`Depth: <strong>${n0(w.depth_ft)} ft</strong>`
          + (w.depth_basis ? ` (${w.depth_basis})` : '') + '.']
        : ['The record carries no depth for this well.']),
      ...(w.spud_label
        ? [`Spudded <strong>${w.spud_label}</strong>`
          + (w.age_years != null ? ` — about ${w.age_years.toFixed(1)} years ago` : '') + '.']
        : []),
      ...(w.field_name ? [`Field: <strong>${w.field_name}</strong>`
        + (w.play ? ` · ${w.play}` : '') + '.'] : []),
      ...(w.completion_operator
        ? [`Completed by <strong>${w.completion_operator}</strong>`
          + (l.operator_name && l.operator_name !== w.completion_operator
            ? `, which is not the operator running the lease now (${l.operator_name}) — `
              + 'normal after a handover'
            : '') + '.']
        : []),
      ...(w.reserve_gas > 0 || w.reserve_oil > 0
        ? ['Still to come from this wellbore, on a 100% basis: '
          + `<strong>${volWords(w.reserve_gas, w.reserve_oil)}</strong>. Your share is `
          + `${(l.interest_value * 100).toFixed(4)}% of it.`]
        : []),
      ...(w.last_month_boe > 0
        ? [`It filed volume in the last reported month (${a.data_month_label}).`]
        : []),
      ...(w.nearest_well_mi != null
        ? [`Nearest other well on record: <strong>${w.nearest_well_mi.toFixed(2)} miles</strong> — `
          + 'spacing is one of the inputs to the new-well model.']
        : []),
      ...(w.lat != null && w.lon != null
        ? [`Surface location ${w.lat.toFixed(5)}, ${w.lon.toFixed(5)}.`]
        : ['No coordinates are recorded, which is why this well is not on the map.']),
      ...(w.permit_status ? [`Permit status: ${w.permit_status}.`] : []),
    ],
    next: 'The API number above is the one thing to quote if you ever ask the operator or '
      + 'the Railroad Commission about this well — lease names repeat across counties and '
      + 'well numbers repeat across leases, but an API number never does.',
    chips: [w.status ?? 'status not recorded', ...(w.profile ? [w.profile] : [])],
  };
}

/**
 * Every `lease:*` and `well:*` explainer for one payload.
 *
 * The well key is the reference's own: `w.api14` when the record carries one,
 * and `<lease_id>-<well_number>` when it does not — the same expression
 * `panels.tsx` builds on the click side, which is what makes the two agree.
 */
export function leaseAndWellDrawers(
  leases: Payload['leases'], totals: Totals, asOf: AsOf,
): Record<string, Drawer> {
  const d: Record<string, Drawer> = {};
  for (const l of leases) {
    d[`lease:${l.lease_id}`] = leaseDrawer(l, totals);
    for (const w of l.wells) {
      const id = w.api14 ?? `${l.lease_id}-${w.well_number ?? 'x'}`;
      d[`well:${id}`] = wellDrawer(w, l, asOf);
    }
  }
  return d;
}

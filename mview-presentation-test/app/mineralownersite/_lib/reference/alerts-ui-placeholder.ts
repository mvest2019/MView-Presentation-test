/**
 * ███ TEMPORARY — PLACEHOLDER DATA SO THE ALERTS UI RENDERS WHOLE ███
 *
 * ── WHAT THIS IS ───────────────────────────────────────────────────────────
 * The Alerts page and its detail panel are built to the reference
 * (`mineral-owner-site-2.0`). Three blocks of that UI are driven by fields
 * `mineralview-api` does not send yet, so they render empty against the live
 * payload. This module fills those fields in so the page can be reviewed and
 * signed off before the backend work lands.
 *
 * `docs/ALERTS-BACKEND-NEEDED.md` is the request that makes it real. Every
 * field invented here is listed there with its type and its endpoint.
 *
 * ── HOW TO DELETE IT ───────────────────────────────────────────────────────
 * Two lines in `owner-data.ts`: the import, and the `uiPlaceholder(...)` call
 * wrapping the payload. Nothing else in the app refers to this file.
 *
 * ── THE ONE RULE IT FOLLOWS: NEVER OVERWRITE THE SERVICE ────────────────────
 * Every field is filled ONLY where the payload does not already carry it. So
 * the day `/activity` starts sending `filing`, this module stops inventing one
 * for that row — with no code change and no conflict. When every field below
 * arrives, the whole thing becomes a no-op and can be deleted without the page
 * changing by a pixel. That is the property that makes it safe to ship behind
 * a review and not safe to forget about.
 *
 * ── WHAT IS DERIVED (honest) vs INVENTED (not) ─────────────────────────────
 * DERIVED — computed from data the payload already carries, and correct:
 *   · `event_iso`      from `sort_key` ("YYYYMMDD") or `cycle` ("YYYYMM")
 *   · `filing.of`      from the row's own `kind`
 *   · the three filing date labels, from `when_label`
 *   · `filing.profile`, `field_name`, operator, county — all already on the row
 *
 * INVENTED — no source anywhere in the payload. These are the ones that must
 * not reach a customer:
 *   · `lat` / `lon`         a point placed near the county's approximate
 *                           centre, jittered deterministically by row id
 *   · `permit_no` / `tracking_no`   a stable number derived from the row id
 *   · `api`                 a well number in the state's format, from the id
 *   · `scope`               'mine' follows `is_mine` where the row has it;
 *                           otherwise it follows the backend's own stated rule
 *                           (money is always 'mine') and falls to 'neighbours'
 *   · `alerts.silent`       a fixed list of the rules that commonly find
 *                           nothing
 *
 * Everything invented is DETERMINISTIC — seeded from the row's own id — so the
 * page does not reshuffle between reloads and a screenshot stays reproducible.
 */
import type { DrawerMap, MapPoint, Payload } from './payload';
import { n0, plural } from './fmt';

/** on/off in one place; flip to false to see the real, emptier page */
export const UI_PLACEHOLDER_ON = true;

/* ---- THE PINS, ON THEIR OWN SWITCH.
   Every other field here is a label, a number or a date — wrong in a demo, and
   obviously a placeholder once the real one arrives. A coordinate is different:
   drawn on satellite imagery it reads as surveyed fact, and there is no caption
   that fully undoes that. So it is separable. Turn this off and the rest of the
   placeholder keeps working; the map blocks simply close and the panels explain
   why, which is what the reference does with an unplaced filing. */
export const DEMO_POSITIONS = true;

/* a small stable hash, so every invented value is the same on every render */
function seed(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** "20260915" or "202609" -> "2026-09-15" / "2026-09-01" */
function isoFrom(sortKey: string | null | undefined, cycle: string | null | undefined): string | null {
  const k = String(sortKey ?? '');
  if (/^\d{8}$/.test(k) && !k.endsWith('00')) {
    return `${k.slice(0, 4)}-${k.slice(4, 6)}-${k.slice(6, 8)}`;
  }
  if (/^\d{8}$/.test(k)) return `${k.slice(0, 4)}-${k.slice(4, 6)}-01`;
  const c = String(cycle ?? '');
  if (/^\d{6}$/.test(c)) return `${c.slice(0, 4)}-${c.slice(4)}-01`;
  return null;
}

/* ---- ROUGHLY WHERE THE TEXAS COUNTIES IN THIS RECORD ARE.
   Approximate centres, to one decimal. They are only ever used to place an
   INVENTED point, so their precision is irrelevant and deliberately low — the
   real position comes from the filing, which is what the backend doc asks for.
   A county not in this list falls back to the centre of the state. */
const COUNTY_AT: Record<string, [number, number]> = {
  'DE WITT': [29.1, -97.4], DEWITT: [29.1, -97.4], CULBERSON: [31.4, -104.5],
  ANDERSON: [31.8, -95.7], MIDLAND: [32.0, -102.1], MARTIN: [32.3, -101.9],
  REEVES: [31.3, -103.7], LOVING: [31.8, -103.6], WINKLER: [31.8, -103.0],
  HOWARD: [32.3, -101.4], GLASSCOCK: [31.9, -101.5], UPTON: [31.4, -102.0],
  PECOS: [30.8, -102.7], ANDREWS: [32.3, -102.6], BORDEN: [32.7, -101.4],
  DAWSON: [32.7, -101.9], IRION: [31.3, -100.9], JONES: [32.7, -99.9],
  BURLESON: [30.5, -96.6], FREESTONE: [31.7, -96.2], GRIMES: [30.5, -96.0],
  LEE: [30.3, -96.9], LEON: [31.3, -95.9], LIBERTY: [30.1, -94.8],
  GRAYSON: [33.6, -96.7], CROCKETT: [30.7, -101.4],
};
const TEXAS_AT: [number, number] = [31.5, -99.3];

function placeNear(county: string | null | undefined, id: string): { lat: number; lon: number } {
  const key = String(county ?? '').toUpperCase().replace(/\s+COUNTY$/, '').trim();
  const [baseLat, baseLon] = COUNTY_AT[key] ?? TEXAS_AT;
  const s = seed(id);
  /* +/- about six miles, so several rows in one county do not stack */
  const dLat = (((s % 1000) / 1000) - 0.5) * 0.18;
  const dLon = ((((s >> 10) % 1000) / 1000) - 0.5) * 0.18;
  return { lat: +(baseLat + dLat).toFixed(5), lon: +(baseLon + dLon).toFixed(5) };
}

function fakeApi(id: string): string {
  const s = seed(id);
  return `42-${String(100 + (s % 400)).padStart(3, '0')}-${String(s % 100000).padStart(5, '0')}`;
}

/* ---- THE RULES THAT COMMONLY FIND NOTHING.
   A fixed list, because there is no source for it. The real one is per-sweep
   and comes from `/dashboard`; see §1 of the backend doc. */
const SILENT_RULES = [
  { id: 'ring-quiet', label: 'Quiet rings', reason: 'nothing filed within five miles this sweep' },
  { id: 'handover', label: 'Operator handover', reason: 'no change of operator on any lease' },
  { id: 'title-gap', label: 'Title gap', reason: 'every lease resolved to a current owner' },
  { id: 'status-flip', label: 'Well status change', reason: 'no well changed status this window' },
  { id: 'payment-gap', label: 'Payment gap', reason: 'no month is missing a filing that had one' },
  { id: 'lease-expiry', label: 'Lease expiry', reason: 'no primary term ends inside six months' },
];

/* ---- THE KIND PANELS' OWN MAPS, copied from the reference's `drawers.ts`.
   `d.permits` and `d.completions` each carry one there; the API's versions of
   those panels carry none, so a Neighbour row — which opens the kind panel
   rather than a per-filing one — had no map at all. These are SELECTIONS over
   `nearby.rows`, not carried points: `kinds` + `band` say what to draw. */
const MAP_PERMITS = (band: 1 | 3 | 5 | 10): DrawerMap => ({
  kinds: ['permit', 'completion', 'wellbore'],
  band,
  own: true,
  rings: true,
  title: 'The permits on the ground',
  caption: `Every standing permit within ${band} ${plural(band, 'mile')} of your wells, with `
    + 'your own wells drawn underneath. A permit is a filed intention to drill, so it is a '
    + 'point on the ground and not a path — nothing has been drilled yet.',
});

const MAP_COMPLETIONS = (band: 1 | 3 | 5 | 10): DrawerMap => ({
  kinds: ['permit', 'completion', 'wellbore'],
  band,
  own: true,
  rings: true,
  title: 'The completions on the ground',
  caption: `Every well completed within ${band} ${plural(band, 'mile')} of your wells, with your `
    + 'own wells drawn underneath. These are finished wells reported to the state.',
});

/* ---- AND THE ROWS THOSE MAPS SELECT OVER.
   `payload.nearby.rows` is empty on the member path — `owner-data.ts` serves
   `NO_NEARBY`, because no endpoint supplies it for a `member_id`. Without rows
   a ring map draws nothing, so one is built here from the timeline's own
   filings, which already carry a county and (after this module) a position.
   §3 of the backend doc asks for the real thing. */
function nearbyFrom(p: Payload, events: Payload['timeline']['events']): Payload['nearby']['rows'] {
  const ring = (n: number): 1 | 3 | 5 => (n % 3 === 0 ? 1 : n % 3 === 1 ? 3 : 5);
  return events
    .filter((e) => (e.kind === 'permit' || e.kind === 'completion' || e.kind === 'adjacent')
      && e.lat != null && e.lon != null)
    .slice(0, 120)
    .map((e) => {
      const s = seed(e.id);
      const band = ring(s);
      /* the offsets the ring list sorts on, consistent with the band */
      const dx = +(((s % 200) / 100 - 1) * band).toFixed(2);
      const dy = +(((((s >> 8) % 200) / 100) - 1) * band).toFixed(2);
      return {
        id: e.id,
        kind: (e.kind === 'adjacent' ? 'wellbore' : e.kind) as 'permit' | 'completion' | 'wellbore',
        api14: e.api ?? null,
        api: e.api ?? null,
        lease_id: e.lease_id,
        lease_name: e.lease_name,
        well_number: e.well_number ?? null,
        operator_name: e.operator_name,
        county: e.county,
        field_name: null,
        play: null,
        distance_mi: +Math.min(Math.hypot(dx, dy), band).toFixed(2),
        band,
        dx_mi: dx,
        dy_mi: dy,
        lat: e.lat ?? null,
        lon: e.lon ?? null,
        direction: null,
        is_own: e.is_mine,
        status: null,
        purpose: null,
        profile: e.filing?.profile ?? null,
        well_type: e.filing?.well_type ?? null,
        tvd: null,
        age_years: null,
        last_month_gas: null,
        last_month_oil: null,
        reserve_oil: null,
        reserve_gas: null,
        first_prod_cycle: null,
        last_prod_cycle: null,
        date_iso: null,
        date_label: e.when_label,
        date_kind: null,
      };
    });
}

/* ═══════════════════════════════ THE ALERT PANELS' OWN MAPS ════════════════
   PORTED FROM the reference's `drawers.ts`, where five of the nine `alert:*`
   panels carry one. This app rebuilds every `alert:*` panel from the live
   finding (`owner-data.ts`, `withAlertDrawers`) and the finding carries no
   geometry, so those five opened with no map at all — a county digest that
   counts 3,040 permits and shows the reader none of them.

   THE MAP DRAWS WHAT THE CARD COUNTED, which is the reference's whole
   argument for carrying points rather than a selection. A five-mile ring under
   "3,040 permits filed in 23 counties" draws a boundary the headline is not
   about, and a neighbourhood selection under "1,063 standing permits within
   1 mile" draws every well in the ring instead of the permits it counted. So
   each panel below carries its OWN rows.

   WHERE THE ROWS COME FROM HERE. The reference reads `snap.ring_detail`, which
   `mineralview-api` does not send — see §3 of the backend doc. The nearest
   true equivalents already on the payload are used instead:
     · the county digests read the timeline's own filings, which are the rows
       the digest counted and (after this module) carry a position;
     · the ring panels read `nearby.rows`, which carry the band the ring alert
       is about.
   Both are the same rows the rest of the page is drawn from, so the map and
   the card cannot disagree. */

/** a timeline filing as a point — only the ones that have a location */
function eventPt(e: Payload['timeline']['events'][number]): MapPoint | null {
  return e.lat == null || e.lon == null ? null : {
    id: e.id,
    kind: e.kind === 'completion' ? 'completion' : 'permit',
    label: `${e.lease_name ?? 'unnamed lease'}`
      + `${e.well_number ? ` · well ${e.well_number}` : ''}`,
    well_number: e.well_number ?? null,
    lease_name: e.lease_name,
    operator_name: e.operator_name,
    api: e.api ?? null,
    lat: e.lat,
    lon: e.lon,
    when_label: e.when_label,
    band: null,
    is_mine: e.is_mine,
  };
}

/** a ring row as a point — same rule, and it keeps the band it was counted in */
function ringRowPt(r: Payload['nearby']['rows'][number]): MapPoint | null {
  return r.lat == null || r.lon == null ? null : {
    id: r.id,
    kind: r.kind,
    label: `${r.lease_name ?? 'unnamed lease'}`
      + `${r.well_number ? ` · well ${r.well_number}` : ''}`,
    well_number: r.well_number,
    lease_name: r.lease_name,
    operator_name: r.operator_name,
    api: r.api,
    lat: r.lat,
    lon: r.lon,
    when_label: r.date_label,
    band: String(r.band) as '1' | '3' | '5',
    is_mine: r.is_own,
  };
}

function keepPts(xs: (MapPoint | null)[]): MapPoint[] {
  return xs.filter((x): x is MapPoint => x !== null);
}

/** Every `alert:*` map, keyed exactly as `withAlertDrawers` keys the panels. */
function alertMaps(
  p: Payload,
  events: Payload['timeline']['events'],
  rows: Payload['nearby']['rows'],
): Record<string, DrawerMap> {
  const counties = p.totals.counties ?? [];
  const countyLabel = counties.length
    ? `${counties.slice(0, 3).join(', ')}${counties.length > 3 ? ` +${counties.length - 3}` : ''}`
    : null;
  const metricOf = (id: string): number => {
    const a = p.alerts.items.find((x) => x.id === id);
    return a?.metric ?? 0;
  };

  /* ---- THE COUNTY DIGESTS: every filing they counted, and NO MILE RINGS.
     There is no county polygon anywhere in this data, so the map frames the
     filings themselves and names the county in the caption rather than
     pretending to outline it. */
  const countyMap = (kind: 'permit' | 'completion', n: number): DrawerMap => {
    const pts = keepPts(events.filter((e) => e.kind === kind).map(eventPt));
    return {
      points: pts,
      own: true,
      rings: false,
      county_label: countyLabel,
      title: kind === 'permit' ? 'Where those permits are' : 'Where those completions are',
      caption: `All ${n0(n) ?? n} of them, as far as the state has filed a location — `
        + `${n0(pts.length) ?? pts.length} of ${n0(n) ?? n} resolve to one. `
        + `These are county-wide${countyLabel ? ` (${countyLabel})` : ''}, not a radius, so `
        + 'there are no mile circles on this map: your own wells are drawn underneath for '
        + 'somewhere to measure against.',
    };
  };

  /* ---- THE RING ALERTS: the rows the join found, and nothing else.
     NO MILE CIRCLES, DELIBERATELY. The band is measured against the lease's
     own geometry; the dot is the wellhead. Those are two measurements of two
     different things and they disagree at the edges, so a filing counted
     inside five miles can plot a little outside a five-mile circle drawn from
     the reader's wells. Both are right — the circle is what makes them look
     wrong, because it invites the reader to check a label against a line that
     was never drawn from the same origin. */
  const ringMap = (kind: 'permit' | 'completion'): DrawerMap => {
    const evs = rows.filter((r) => r.kind === kind && !r.is_own);
    const pts = keepPts(evs.map(ringRowPt));
    return {
      points: pts,
      own: true,
      rings: false,
      title: kind === 'permit'
        ? 'The permits in your rings' : 'The completions in your rings',
      caption: `The ${n0(evs.length) ?? evs.length} `
        + `${kind === 'permit' ? 'permit' : 'completion'}${evs.length === 1 ? '' : 's'} this `
        + 'alert counted, and nothing else — each one a filing the radius survey places '
        + 'inside your rings and the state has actually filed. '
        + (pts.length < evs.length
          ? `${n0(pts.length) ?? pts.length} of them carry a surface location; the rest were `
            + 'filed against a county only. '
          : 'Every one of them carries a surface location. ')
        + 'Each is drawn at the surface location the state filed, so a few sit just outside '
        + 'the ring they were counted in — the ring was measured against the lease, the dot '
        + 'is the wellhead.',
    };
  };

  return {
    'alert:permits-filed': countyMap('permit', metricOf('permits-filed')),
    'alert:completions': countyMap('completion', metricOf('completions')),
    'alert:permit-ring': ringMap('permit'),
    'alert:completion-ring': ringMap('completion'),
    'alert:filing-mine': {
      points: keepPts(events.filter((e) => e.is_mine
        && (e.kind === 'permit' || e.kind === 'completion')).map(eventPt)),
      own: true,
      rings: false,
      title: 'On your own acreage',
      caption: 'Every permit and completion the state has filed against a lease you hold, and '
        + 'nothing else. Your other wells are drawn underneath.',
    },
  };
}

/* ---- WHOSE ACREAGE THE FINDING HAPPENED ON, per rule.
   THE REFERENCE'S OWN TABLE, read off `src/lib/alerts.ts` where each rule
   declares its own `scope` beside the finding it builds. It is a property of
   the RULE, not of the row: "3,040 permits filed in 23 counties" is a
   neighbours finding however many counties it covers, and a payment check is
   the owner's however it is dated.

   IT USED TO BE A COIN FLIP — `seed(id) % 2` — for everything that was not
   money or community. MEASURED, that put the county digests and the ring
   alerts under "My leases", so the scope row read "My leases 6" and its own
   category tabs offered "Around your leases 4": four findings about the ground
   around the reader, filed under the reader's own acreage. The two words
   contradict each other on screen, which is how it was spotted.

   An id the table does not name falls back to the category, which is the
   honest reading — money is the owner's, operator news is not. */
const ALERT_SCOPE: Record<string, 'mine' | 'neighbours'> = {
  'filed-': 'mine',
  'filing-mine': 'mine',
  'handover-': 'mine',
  'trend-': 'mine',
  newwell: 'mine',
  pricedeck: 'mine',
  nogap: 'mine',
  completions: 'neighbours',
  'permits-filed': 'neighbours',
  'permit-ring': 'neighbours',
  'completion-ring': 'neighbours',
  'ring-quiet': 'neighbours',
  opnews: 'neighbours',
};

function scopeOf(id: string, category: string): 'mine' | 'neighbours' {
  for (const k of Object.keys(ALERT_SCOPE)) {
    if (k.endsWith('-') ? id.startsWith(k) : id === k) return ALERT_SCOPE[k];
  }
  return category === 'money' ? 'mine' : 'neighbours';
}

/* ---- "Aug 19, 2026" MINUS N DAYS, IN THE SAME SHAPE.
   The record grid prints `submit_label` beside `approved_label`, so a made-up
   submission date has to read like the approval date it sits next to. Built
   off the row's own ISO and formatted the way the service formats
   `when_label`, rather than parsing that label back — a label is presentation
   and the ISO is the fact. Returns null when there is no ISO to work from, and
   the caller falls back to the label it already had. */
function backDated(iso: string | null, days: number): string | null {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  d.setUTCDate(d.getUTCDate() - days);
  return d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });
}

/* ---- THE TWO SIDES OF A WELL STATUS CHANGE.
   Paired by index so the transition always reads forwards — a well does not go
   from Producing to Permitted. The state's own vocabulary, in the spellings
   the Activity feed uses. */
const STATUS_WAS = ['Shut-In Producer', 'Permitted', 'Drilling', 'Shut-In Producer', 'Inactive'];
const STATUS_NOW = ['Producing', 'Drilling', 'Completed', 'Producing', 'Producing'];

/** Fill only what the service has not sent. See the header. */
export function uiPlaceholder(p: Payload): Payload {
  if (!UI_PLACEHOLDER_ON) return p;

  /* -------------------------------------------------------------- alerts */
  const items = p.alerts.items.map((a) => {
    if (a.scope && a.event_iso !== undefined) return a;
    return {
      ...a,
      scope: a.scope ?? scopeOf(a.id, a.category),
      event_iso: a.event_iso ?? null,
    };
  });

  /* ------------------------------------------------------------ timeline */
  const events = p.timeline.events.map((e) => {
    const iso = isoFrom(e.sort_key, e.cycle);
    const s = seed(e.id);
    const isPermit = e.kind === 'permit';
    const isCompletion = e.kind === 'completion';
    const isStatus = e.kind === 'status';
    const isFiling = isPermit || isCompletion || isStatus;
    /* one draw for the pair the permit grid prints on two rows */
    const act = s % 3 === 0 ? 'Recompletion' : 'New Drill';

    return {
      ...e,
      api: e.api ?? (isFiling ? fakeApi(e.id) : null),
      well_number: e.well_number
        ?? (/well\s+([0-9A-Za-z-]+)/.exec(e.title)?.[1] ?? null),
      /* ---- A POSITION SO THE MAP BLOCK RENDERS. DEMO ONLY.
         `event-drawer.ts` gates the map on `placed = lat != null && lon !=
         null`, so with the capture carrying no coordinates at all — 0 of 893
         timeline rows — every map on the Alerts page stays shut and three
         blocks of the reference's UI cannot be reviewed.

         READ THIS BEFORE SHIPPING. These coordinates are NOT filed positions.
         They are a county centroid, jittered deterministically by the row's
         id so a pad does not stack and a screenshot reproduces. A made-up
         figure in a stat cell is a placeholder; a made-up pin on a satellite
         map is a claim about where somebody is drilling. This is therefore
         the one field in this module that must be switched off before a
         customer sees the page, and it has its own flag — `DEMO_POSITIONS` —
         so it can go without taking the rest of the placeholder with it.

         With it false the panels fall back to the reference's own unplaced
         behaviour: no map block, and an evidence line saying the state filed
         this against a county and recorded no surface location, so there is
         nothing to put on a map. §2a of the backend doc is the request that
         makes the pins real. */
      lat: e.lat ?? (DEMO_POSITIONS && isFiling ? placeNear(e.county, e.id).lat : null),
      lon: e.lon ?? (DEMO_POSITIONS && isFiling ? placeNear(e.county, e.id).lon : null),
      /* both follow the position, and the position is now the service's or
         nothing — see the note on `lat`/`lon` above. With no coordinate there
         is no basis to describe and no spread to quote. */
      /* 'surveyed' — the reference's normal map state, which is what this
         page is being reviewed against: the block heads "Where this is" and
         draws the filing on its own. `location_spread_mi` stays null because
         it belongs to the abstract-placed state and the caption there is the
         only thing that reads it. */
      location_basis: e.location_basis ?? (DEMO_POSITIONS && isFiling ? 'surveyed' as const : null),
      location_spread_mi: e.location_spread_mi ?? null,
      legal_description: e.legal_description
        ?? (isFiling ? `Abstract #${300 + (s % 700)}, ${e.county ?? 'unnamed'} Survey` : null),
      filing: e.filing ?? (isFiling
        ? {
          of: (isPermit ? 'permit' : isCompletion ? 'completion' : 'status') as
            'permit' | 'completion' | 'status',
          permit_no: isPermit ? String(900000 + (s % 99999)) : null,
          permit_suffix: null,
          /* ---- PURPOSE AND ACTION ARE ONE FACT, SO THEY ARE INVENTED ONCE.
             They used to be invented separately — `purpose` hardcoded to
             'New Drill' while `permit_action` coin-flipped 'Recompletion' —
             so one permit in three printed PURPOSE "New Drill" directly above
             PERMIT ACTION "Recompletion" in the same grid. Two fields of the
             same record contradicting each other on screen is a worse
             placeholder than a blank, because it reads as a data bug in the
             state's own filing. */
          permit_action: isPermit ? act : null,
          total_depth: isPermit ? 9000 + (s % 8000) : null,
          tracking_no: isCompletion ? String(300000 + (s % 99999)) : null,
          completion_type: isCompletion ? (s % 3 === 0 ? 'Recompletion' : 'New Well') : null,
          completion_action: null,
          well_type: isCompletion ? (s % 2 === 0 ? 'Oil' : 'Gas') : null,
          /* ---- A STATUS CHANGE HAS TO CARRY BOTH SIDES OR IT IS NOT ONE.
             These were both null, so `record()` printed the transition as
             blank and captioned it "unchanged" — on the one row whose entire
             subject is that something changed. The reference's own note on
             that grid is "the pair IS the record". */
          prev_well_status: isStatus ? STATUS_WAS[s % STATUS_WAS.length] : null,
          new_well_status: isStatus ? STATUS_NOW[s % STATUS_NOW.length]
            : isCompletion ? 'Producing' : null,
          prev_operator_name: null, new_operator_name: null,
          prev_completion_label: null, new_completion_label: null,
          changed: isStatus ? { status: true, operator: false, lease: false } : null,
          status: isPermit ? 'Approved' : 'Submitted',
          /* ---- SUBMITTED IS NOT APPROVED, AND THE PANEL SAYS SO.
             Both used to be `when_label`, so every permit was lodged and
             cleared on the same day — while the evidence line beneath the grid
             reads "the gaps between them are the part worth reading". A few
             days, deterministic from the row's id, so there is a gap to read
             and it does not reshuffle between reloads. */
          submit_label: e.when_label
            ? (isPermit ? backDated(iso, 3 + (s % 25)) ?? e.when_label : e.when_label)
            : null,
          approved_label: isPermit ? e.when_label ?? null : null,
          completion_label: isCompletion ? e.when_label ?? null : null,
          date_basis: (isCompletion ? 'completion' : 'approved') as 'completion' | 'approved',
          purpose: isPermit ? act : null,
          profile: s % 4 === 0 ? 'VERTICAL' : 'HORIZONTAL',
          /* ---- THE FIELD THE ROW ALREADY PRINTS, LIFTED OFF ITS OWN STATS.
             The log row shows "FIELD · ANWAC (900 WILCOX)" and the drawer's
             record grid reads `filing.field_name`, which was null — so the
             same filing named a field in the list and omitted it from its own
             paperwork two clicks later. `TimelineEvent` has no `field_name` of
             its own, but the stat the row renders is right there, so this is
             derived rather than invented. */
          field_name: e.stats?.find((x) => /^field$/i.test(x.label))?.value ?? null,
          api_source: 'resolved' as const,
          seen_label: null,
        }
        : null),
      /* honest: this one really is computable from what the row carries */
      sort_key: e.sort_key || (iso ? iso.replace(/-/g, '') : ''),
    };
  });

  /* -------------------------------------------------------------- nearby
     TWO GAPS, NOT ONE, AND THE SECOND WAS BEING MISSED.

     The member path serves an explicitly empty block, so `nearbyFrom` builds
     rows out of the timeline's own filings — that case was already handled.
     But the owner path serves the capture's 149 rows, and not one of them
     carries `lat`/`lon`: `DrawerMapBlock` drops a row with no position, so a
     full array produced an empty map just as reliably as an empty one. The
     ring panels and both kind panels had no map on the path that HAS rows.

     So the rows are filled rather than replaced — the capture's own leases,
     operators, kinds and bands are kept exactly, and only the missing
     position is supplied. §3 of the backend doc asks for the real one. */
  const rows = p.nearby.rows.length
    ? p.nearby.rows.map((r) => (r.lat != null && r.lon != null) || !DEMO_POSITIONS ? r : {
      ...r,
      ...placeNear(r.county, r.id),
    })
    : nearbyFrom(p, events);

  /* ------------------------------------------------- the kind panels' maps */
  const drawers = { ...p.drawers };
  /* ---- A MAP ONLY WHERE THERE IS SOMETHING TO DRAW.
     These are selections over `nearby.rows`, and those rows now carry a
     position only where the service filed one. With none, `DrawerMapBlock`
     renders its empty state — a bordered box saying nothing falls inside the
     ring — which is worse than no block at all on a panel that never promised
     a map. Same rule as the alert maps below and the same rule the reference
     applies to a filing with no surface location. */
  const canMap = rows.some((r) => r.lat != null && r.lon != null);
  if (canMap && drawers.permits && !drawers.permits.map) {
    drawers.permits = { ...drawers.permits, map: MAP_PERMITS(5) };
  }
  if (canMap && drawers.completions && !drawers.completions.map) {
    drawers.completions = { ...drawers.completions, map: MAP_COMPLETIONS(5) };
  }

  /* ---------------------------------------------- the alert panels' maps
     Only where the panel exists and has none of its own, so the day the
     service starts sending a map with the finding this stops inventing one —
     the same rule every other field in this module follows. */
  const amaps = alertMaps({ ...p, timeline: { ...p.timeline, events } }, events, rows);
  for (const key of Object.keys(amaps)) {
    const d = drawers[key];
    const m = amaps[key];
    /* no points, no block — see `canMap` above */
    if (d && !d.map && m.points && m.points.length > 0) drawers[key] = { ...d, map: m };
  }

  return {
    ...p,
    alerts: { ...p.alerts, items, silent: p.alerts.silent?.length ? p.alerts.silent : SILENT_RULES },
    timeline: { ...p.timeline, events },
    nearby: { ...p.nearby, rows },
    drawers,
  };
}

'use client';
/**
 * The permits and completions in an explainer panel, on the ground.
 *
 * ── THE PANEL SELECTS, IT DOES NOT CARRY ───────────────────────────────────
 * The drawer says WHICH rows it is about (`DrawerMap`: kinds, ring, whether to
 * draw the reader's own wells) and this builds the map from
 * `payload.nearby.rows`, which is already on the client — 114 rows, every one
 * with a latitude and a longitude.
 *
 * MEASURED: those rows are ~27 KB. Five panels want a map of them (permits,
 * completions and three activity alerts), so shipping the points inside each
 * drawer would put five copies in one payload to draw one map at a time. It
 * also means the map and the neighbour list beside it cannot drift apart —
 * there is one set of points and both read it.
 *
 * ── WHY THE BOX IS COMPUTED HERE AND NOT BY `mapOf` ────────────────────────
 * `lib/leases.ts` exports exactly this maths, and it cannot be imported.
 * It pulls `split`, `operatorKey` and `miles` as VALUES from modules that
 * import the Mongo driver, so a component that imports it fails the bundle on
 * Node's `net`. Types cross that line; values do not. The box is ten lines.
 *
 * ── A PERMIT IS A POINT, NOT A PATH ────────────────────────────────────────
 * Nothing has been drilled on a permit, so there is no trajectory and no
 * bottom hole to draw — it is one location on the ground, and that is the
 * honest way to show it. The reader's own wells are drawn in the same map so
 * there is something to measure the distance against.
 */
import { useMemo, useState } from 'react';
import type { Payload } from '../../_lib/reference/payload';
import type { DrawerMap, MapPoint } from '../../_lib/reference/payload';
import type { MapData, MapWell } from '../../_lib/reference/map-data';
import WellMap, { type BaseMap } from './WellMap';
import { n1, api10 } from '../../_lib/reference/fmt';

type Row = Payload['nearby']['rows'][number];

/** how the three groups are named in the legend and in the readout */
const GROUP: Record<string, string> = {
  permit: 'New permit',
  completion: 'New completion',
  wellbore: 'Existing well',
};

/**
 * A neighbouring row as a point on the map.
 *
 * THE KEY HAS TO BE UNIQUE AND CANNOT BE NULL — `WellMap` uses `api14` as the
 * React key AND as the hover and selection key, so two points sharing one, or
 * carrying an empty one, is two points the map cannot tell apart. The row's
 * own id is the fallback, because it always exists and is always distinct.
 */
function point(r: Row): MapWell | null {
  if (r.lat == null || r.lon == null) return null;
  const kind = GROUP[r.kind] ?? 'Well';
  const name = r.lease_name ?? 'unnamed lease';
  return {
    api14: r.api14 ?? r.api ?? r.id,
    label: `${name}${r.well_number ? ` · well ${r.well_number}` : ''}`,
    well_number: r.well_number,
    lease_id: r.lease_id ?? '',
    lease_label: name,
    reservoir: null,
    group: r.is_own ? 'Your well' : kind,
    profile: r.profile,
    lat: r.lat,
    lon: r.lon,
    /* NO BOTTOM HOLE AND NO PATH. A permit is an intention, and a neighbour's
       completion carries no surveyed trajectory in this feed — drawing either
       as a line would claim a shape nothing here recorded. */
    bh_lat: null,
    bh_lon: null,
    path: [],
    path_basis: null,
    deviated: false,
    lateral_ft: null,
    bearing_deg: null,
    bearing_compass: null,
    depth_ft: r.tvd,
    /* FILLED MEANS PRODUCING, which is what the map already means by it. A
       permit has produced nothing, so a permit is never filled. */
    active: (r.last_month_gas ?? 0) + (r.last_month_oil ?? 0) > 0,
  };
}

export default function DrawerMapBlock(
  { spec, rows, onOpen, canOpen }:
  {
    spec: DrawerMap;
    rows: Row[];
    onOpen: (key: string) => void;
    canOpen: (key: string) => boolean;
  },
) {
  const [base, setBase] = useState<BaseMap>('satellite');
  const [picked, setPicked] = useState<string | null>(null);

  /* ---- THE SELECTION, AND THE BOX AROUND IT. */
  const built = useMemo(() => {
    /* ---- ONE FILING: ONE POINT, AND NOTHING ELSE ON THE MAP.
       A reader who clicked one permit is asking about that permit. Drawing
       the other eighty around it answers a question they did not ask and
       zooms the map out to ten miles to do it.

       `WellMap` opens a half-mile box around a lone point — its own `FLOOR`,
       measured there — which is the zoom a well pad wants. */
    if (spec.focus) {
      const f = spec.focus;
      const one: MapWell = {
        api14: f.api14 ?? f.id,
        label: f.label,
        well_number: f.well_number,
        lease_id: '',
        lease_label: f.lease_name ?? 'unnamed lease',
        reservoir: null,
        /* THE LEGEND SAYS WHICH KIND OF POINT IT IS. An approximate one must
           never share a swatch with a surveyed one. */
        group: f.basis === 'abstract'
          ? 'Approximate — filed abstract'
          : f.is_mine ? 'Your well' : GROUP[f.kind] ?? 'Filing',
        profile: null,
        lat: f.lat,
        lon: f.lon,
        bh_lat: null,
        bh_lon: null,
        path: [],
        path_basis: null,
        deviated: false,
        lateral_ft: null,
        bearing_deg: null,
        bearing_compass: null,
        depth_ft: null,
        active: false,
      };
      /* ---- A POINT ONLY AS TIGHT AS IT DESERVES.
         A surveyed location is drawn at pad zoom, which `WellMap` gives a lone
         point by its own measured floor. An ABSTRACT point is the centre of
         wells spread across a land grid, so the box is opened to that spread —
         a two-mile approximation framed at half a mile is a lie told at high
         magnification. */
      const pad = f.basis === 'abstract'
        ? Math.max(0.5, (f.spread_mi ?? 0)) / 69 / 2
        : 0;
      return {
        data: {
          wells: [one],
          min_lat: f.lat - pad,
          max_lat: f.lat + pad,
          min_lon: f.lon - pad,
          max_lon: f.lon + pad,
          span_ns_mi: Math.round(pad * 2 * 69 * 100) / 100,
          span_ew_mi: Math.round(pad * 2 * 60 * 100) / 100,
          deviated_count: 0,
          note: f.basis === 'abstract'
            ? `${f.label} — approximately, from the abstract it was filed against.`
            : `${f.label} — the surface location the state filed.`,
        } as MapData,
        rows: new Map<string, Row>(),
        focus: f,
      };
    }

    /* ---- THE PANEL CARRIED ITS OWN ROWS, so those are the map.
       An alert whose subject is a named list — "414 permits in DE WITT", "26
       permits in your rings" — ships that list, and selecting a radius out of
       `rows` instead drew a different claim than the card made. When `points`
       is present it wins outright; `kinds`/`band` are for the panels that
       really are about "everything within N miles".

       The reader's own wells still come from `rows`, because those are the
       same wells on every map and there is no reason to ship them twice. */
    if (spec.points) {
      const pts = spec.points;
      const wells: MapWell[] = pts.map((pt) => ({
        api14: pt.api ?? pt.id,
        label: pt.label,
        well_number: pt.well_number,
        lease_id: '',
        lease_label: pt.lease_name ?? 'unnamed lease',
        reservoir: null,
        group: pt.is_mine ? 'On your lease' : GROUP[pt.kind] ?? 'Filing',
        profile: null,
        lat: pt.lat,
        lon: pt.lon,
        bh_lat: null, bh_lon: null, path: [], path_basis: null, deviated: false,
        lateral_ft: null, bearing_deg: null, bearing_compass: null, depth_ft: null,
        active: false,
      }));
      /* the reader's own wells underneath, for something to measure against */
      const mineRows = spec.own
        ? rows.filter((r) => r.is_own && r.lat != null && r.lon != null) : [];
      const seenKeys = new Set(wells.map((w) => w.api14));
      for (const r of mineRows) {
        const w = point(r);
        if (!w || seenKeys.has(w.api14)) continue;
        seenKeys.add(w.api14);
        wells.push({ ...w, group: 'Your well' });
      }
      if (!wells.length) return null;

      const la = wells.map((w) => w.lat);
      const lo = wells.map((w) => w.lon);
      const nLat = Math.min(...la);
      const xLat = Math.max(...la);
      const nLon = Math.min(...lo);
      const xLon = Math.max(...lo);
      const nsMi = Math.round((xLat - nLat) * 69 * 100) / 100;
      const ewMi = Math.round((xLon - nLon) * 69
        * Math.cos((nLat * Math.PI) / 180) * 100) / 100;
      const subj = pts.length;
      const own = wells.length - subj;
      return {
        data: {
          wells,
          min_lat: nLat, max_lat: xLat, min_lon: nLon, max_lon: xLon,
          span_ns_mi: nsMi, span_ew_mi: ewMi,
          deviated_count: 0,
          note: `${subj} ${subj === 1 ? 'filing' : 'filings'}`
            + (own ? ` and ${own} of your own ${own === 1 ? 'well' : 'wells'}` : '')
            + `, across ${nsMi || '<0.01'} by ${ewMi || '<0.01'} miles.`,
        } as MapData,
        rows: new Map<string, Row>(),
        focus: null,
      };
    }

    const want = new Set(spec.kinds ?? []);
    const band = spec.band ?? 5;
    const keep = rows.filter((r) => r.lat != null && r.lon != null
      && r.band <= band
      && (want.has(r.kind) || (spec.own && r.is_own)));

    const byKey = new Map<string, { w: MapWell; r: Row }>();
    for (const r of keep) {
      const w = point(r);
      /* THE READER'S OWN WELL WINS A COLLISION. A row can be both own and a
         completion; drawn as a neighbour it would disappear into the group it
         is being measured against. */
      if (!w) continue;
      const seen = byKey.get(w.api14);
      if (seen && !r.is_own) continue;
      byKey.set(w.api14, { w, r });
    }
    const wells = [...byKey.values()].map((x) => x.w);
    if (!wells.length) return null;

    const lats = wells.map((w) => w.lat);
    const lons = wells.map((w) => w.lon);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    /* a degree of longitude at 29°N is about 60 miles, not 69 */
    const ns = Math.round((maxLat - minLat) * 69 * 100) / 100;
    const ew = Math.round((maxLon - minLon) * 69
      * Math.cos((minLat * Math.PI) / 180) * 100) / 100;

    const subject = wells.filter((w) => w.group !== 'Your well').length;
    const mine = wells.length - subject;
    const data: MapData = {
      wells,
      min_lat: minLat,
      max_lat: maxLat,
      min_lon: minLon,
      max_lon: maxLon,
      span_ns_mi: ns,
      span_ew_mi: ew,
      deviated_count: 0,
      note: `${subject} ${subject === 1 ? 'filing' : 'filings'} and ${mine} of your own `
        + `${mine === 1 ? 'well' : 'wells'}, inside ${ns || '<0.01'} by ${ew || '<0.01'} miles.`,
    };
    return { data, rows: new Map([...byKey].map(([k, v]) => [k, v.r])), focus: null };
  }, [rows, spec]);

  /* ---- NOTHING TO DRAW IS SAID, NOT DRAWN AS AN EMPTY BOX.
     A blank map reads as "no data arrived"; a sentence reads as "nothing has
     been filed", which is a real and different answer. */
  if (!built) {
    return (
      <div className="dx-map dx-map-empty">
        <p className="dx-map-h">{spec.title}</p>
        <p className="tiny muted">
          {spec.points
            ? (
              <>
                {spec.points.length
                  ? 'None of these filings carries a surface location the state has recorded, '
                  : 'There is nothing in this set, '}
                so there is nothing to put on a map. That is a gap in the filings, not an
                absence of data.
              </>
            )
            : (
              <>
                Nothing with a recorded location falls inside {spec.band ?? 5}{' '}
                {spec.band === 1 ? 'mile' : 'miles'} of your wells, so there is nothing to put
                on a map. That is an absence of filings, not an absence of data.
              </>
            )}
        </p>
      </div>
    );
  }

  const row = picked ? built.rows.get(picked) ?? null : null;

  /* ---- THE WELL PANEL IS KEYED ON API-14; A FILING CARRIES API-10.
     "42-123-33516" against "42-123-33516-0000" — the same well, and a
     straight lookup misses every time. The neighbour rows carry both, so one
     of them is the translation. */
  const focusApi = built.focus?.api14 ?? null;
  const api14 = row?.api14
    ?? (focusApi
      ? rows.find((r) => r.api14 === focusApi || r.api === focusApi)?.api14 ?? null
      : null);

  /* THE WELL PANEL ONLY EXISTS FOR WELLS THE READER HOLDS. A neighbour's
     permit has no report on this record, so the button is offered only where
     it leads somewhere. */
  const wellKey = api14 ? `well:${api14}` : null;
  const canSee = Boolean(wellKey && canOpen(wellKey));

  return (
    <div className="dx-map">
      <p className="dx-map-h">{spec.title}</p>
      <p className="tiny muted dx-map-cap">{spec.caption}</p>
      <WellMap
        data={built.data}
        colourBy="group"
        /* ---- THE CIRCLES ARE THE POINT OF A RING MAP.
           "within three miles" is a claim about distance, and a reader given
           dots on a photograph has no way to check it. `band` draws the mile
           circles from the centre of the reader's own wells. */
        rings={spec.rings ? undefined : false}
        band={spec.rings ? (spec.band ?? 5) : 0}
        /* ---- NO MILE PICKER ON A MAP THAT WAS HANDED ITS POINTS.
           There is nothing to widen to: the panel counted these rows and
           these rows are drawn. The circles stay on a ring panel, because
           they are the scale its claim is read against. */
        bandPicker={!spec.points}
        base={base}
        onBase={setBase}
        /* AN APPROXIMATE POINT IS FRAMED AT ITS OWN UNCERTAINTY, not at pad
           zoom — see the note where the box is built. */
        minSpan={built.focus?.basis === 'abstract'
          ? Math.max(1, built.focus.spread_mi ?? 0) / 69
          : 0}
        selected={built.focus ? null : picked}
        /* NOTHING TO PICK ON A ONE-POINT MAP. The panel around it is already
           about that filing, so a click would select the thing the reader is
           reading. */
        onPick={built.focus
          ? undefined
          : (w) => setPicked((p) => (p === w.api14 ? null : w.api14))}
      />
      {row ? (
        <div className="dx-pick">
          <div className="dx-pick-t">
            <strong>{row.lease_name ?? 'unnamed lease'}</strong>
            {row.well_number ? ` · well ${row.well_number}` : ''}
            <span className={`dx-pick-k dx-pick-${row.kind}`}>
              {row.is_own ? 'Your well' : GROUP[row.kind] ?? 'Well'}
            </span>
          </div>
          <p className="tiny muted">
            {/* TEN, NOT FOURTEEN — the last four digits are the wellbore
                suffix and are noise to a reader copying the number out. */}
            {api10(row.api14 ?? row.api) ? `API ${api10(row.api14 ?? row.api)} · ` : ''}
            {row.operator_name ?? 'operator not recorded'}
            {row.date_label ? ` · ${row.date_kind ?? 'filed'} ${row.date_label}` : ''}
            {/* HOW FAR, AND "ZERO MILES NORTH" IS NOT A DISTANCE.
                The reader's own wells are the thing everything else is
                measured FROM, so they measure zero — and printing a bearing
                off a distance of nothing is a direction to nowhere.

                PLURALISE WHAT IS PRINTED, NOT WHAT IS STORED: `n1` rounds, so
                a row measured at 0.95 miles prints "1", and testing the stored
                number gave "1 miles West". */}
            {(() => {
              const mi = n1(row.distance_mi);
              if (mi === '0') return ' · on your own acreage';
              return ` · ${mi} ${mi === '1' ? 'mile' : 'miles'} ${row.direction ?? 'away'}`;
            })()}
            {row.purpose ? ` · ${row.purpose}` : ''}
            {row.status ? ` · ${row.status}` : ''}
          </p>
          {canSee && wellKey ? (
            <button type="button" className="dx-see" onClick={() => onOpen(wellKey)}>
              See this well →
            </button>
          ) : (
            <p className="tiny muted dx-pick-none">
              This is a neighbour’s well, so there is no report of it on your record — only
              what the state has filed, above.
            </p>
          )}
        </div>
      ) : built.focus && canSee && wellKey ? (
        /* ---- A FOCUSED PANEL NEEDS NO CARD — the panel around it already
           says what the filing is. What it does need is the way through to
           the reader's own report of the well, when this is one of theirs. */
        <button type="button" className="dx-see" onClick={() => onOpen(wellKey)}>
          See this well →
        </button>
      ) : built.focus ? null : (
        <p className="tiny muted dx-map-hint">
          Pick any point to see what was filed on it.
        </p>
      )}
    </div>
  );
}

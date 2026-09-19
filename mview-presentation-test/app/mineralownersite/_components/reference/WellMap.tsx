'use client';
/**
 * The wells on a lease, on a real map.
 *
 * THREE BASEMAPS, drawn as TILES from Esri's public pyramid.
 *
 * NOT `MapServer/export`, which is what this used first and which was the
 * reason the panel sat blank for a second and a half after every gesture:
 * export RENDERS an arbitrary bounding box on demand, so nothing is ever
 * cached — no two views ask for the same box twice. Tiles are pre-rendered,
 * CDN-served and cached by the browser, so a pan re-uses everything already
 * on screen and fetches only the strip that came into view.
 *
 * THERE IS NO BLANK OPTION: a well on a grey grid is not a map of anything,
 * so this panel needs the network — and says so if the imagery does not
 * arrive rather than silently drawing pins on nothing.
 *
 * WHAT IT DRAWS, in the order it draws it:
 *
 *   1. the basemap;
 *   2. the 1, 3 and 5 mile rings, when the reader asks for neighbours;
 *   3. the neighbouring wells inside the chosen ring;
 *   4. this lease's own well paths — the TRAJECTORY from `geom_multiline`
 *      where the record has one, otherwise the two-point chord from
 *      `geometry_well_direction`, drawn dashed so the two are never confused;
 *   5. the BOTTOM holes as diamonds and the SURFACE holes as rings, on top,
 *      because a point must never hide under a line.
 *
 * THE ASPECT IS HELD HONEST THROUGHOUT. A mile north is the same number of
 * pixels as a mile east; the narrower axis is padded rather than stretched.
 * Without that a 0.2 x 1.2 mile lease would show a north-south lateral as an
 * east-west one, and the ring circles would be ellipses.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  MapData, MapWell, LeaseNeighbour, LeaseSurvey,
} from '../../_lib/reference/map-data';
import { n0, n1 } from '../../_lib/reference/fmt';

/* WIDER AND SHORTER. 700x470 rendered 697px tall in a 1038px column, which
   is most of a screen for one well on a photograph. A lease is a wide thing;
   1000x420 renders 436px at the same width and shows more ground. */
const W = 1000;
const H = 420;
const PAD = 26;
const MI_PER_DEG_LAT = 69;

/* six colours, then it gives up and says so — see `tooMany` */
const RES_COLOURS = ['#2e8f6d', '#b8892f', '#3b5bdb', '#8b5cf6', '#0e7490', '#be123c'];

/** A view the reader has moved to: a centre, and the LATITUDE span. */
type Vw = { lat: number; lon: number; span: number };

/**
 * The box a view describes, without touching React state.
 *
 * `span` is the latitude span; the longitude span follows from it and the
 * drawing box's aspect, so a view is fully invertible on its own. That is
 * what lets a wheel gesture compose correctly however fast it arrives.
 */
function boxOf(v: Vw, innerW: number, innerH: number) {
  const lonScale = Math.max(0.2, Math.cos((v.lat * Math.PI) / 180));
  const latSpan = v.span;
  const lonSpan = (latSpan * innerW) / innerH / lonScale;
  return {
    latSpan,
    lonSpan,
    lat0: v.lat - latSpan / 2,
    lon0: v.lon - lonSpan / 2,
  };
}

export type BaseMap = 'street' | 'topo' | 'satellite';

/**
 * HOW CLOSE THE READER MAY GET, in degrees of latitude, and how deep the
 * tiles may go — one number per basemap, because it is a property of the
 * imagery rather than of the map.
 *
 * MEASURED: a one-well lease opens at a 0.00376 degree span, so the old
 * single stop of 0.0035 meant `+` did nothing on the first screen a reader
 * ever saw. The aerial pyramid carries level 19 over Texas, about 330 ft
 * across the box; the topographic and street pyramids thin out over rural
 * ground long before that, and upscaling one is not detail.
 */
const CLOSEST: Record<BaseMap, { span: number; z: number }> = {
  satellite: { span: 0.0009, z: 19 },
  topo: { span: 0.0035, z: 17 },
  street: { span: 0.0035, z: 17 },
};
const WIDEST = 0.6;

/**
 * Web Mercator tile arithmetic.
 *
 * The pyramid is the standard one: level 0 is a single 256px tile of the
 * world, each level doubles. `lon2x` and `lat2y` give FRACTIONAL tile
 * coordinates, so the integer part is which tile and the remainder is where
 * inside it — which is what lets a tile be placed exactly rather than
 * snapped.
 *
 * LATITUDE IS NOT LINEAR in this projection, which is the whole trap: the
 * y coordinate goes through the Mercator formula, and treating it as a
 * straight scale of degrees puts every tile progressively out of place as
 * you leave the equator. Texas is far enough north for that to be visible.
 */
const TILE = 256;
function lon2x(lon: number, z: number): number {
  return ((lon + 180) / 360) * 2 ** z;
}
function lat2y(lat: number, z: number): number {
  const r = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z;
}
function x2lon(x: number, z: number): number {
  return (x / 2 ** z) * 360 - 180;
}
function y2lat(y: number, z: number): number {
  const n = Math.PI * (1 - (2 * y) / 2 ** z);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

/** The Esri service behind each basemap, and whether its ink is light or dark. */
const BASE: Record<BaseMap, { service: string; dark: boolean; name: string }> = {
  satellite: { service: 'World_Imagery', dark: true, name: 'Satellite' },
  topo: { service: 'World_Topo_Map', dark: false, name: 'Topographic' },
  street: { service: 'World_Street_Map', dark: false, name: 'Street' },
};

export default function WellMap(
  {
    data, colourBy = 'reservoir', onPick, selected,
    neighbours = [], band = 0, onBand, rings, bandPicker = true, surveys = [],
    base = 'satellite', onBase, layers, minSpan = 0,
  }:
  {
    data: MapData;
    colourBy?: 'reservoir' | 'lease' | 'group';
    onPick?: (w: MapWell) => void;
    selected?: string | null;
    /** wells around this lease, already measured from ITS wells */
    neighbours?: LeaseNeighbour[];
    /** which ring is showing: 0 for none, else 1, 3 or 5 miles */
    band?: 0 | 1 | 3 | 5 | 10;
    /** RINGS OFF, said outright. A ring is a distance from ONE lease's wells,
     *  and the reservoir map draws wells from nine of them -- so a circle
     *  around the middle of them is centred on a point no lease owns. Until
     *  now the only way to suppress the strip was to pass a layer panel,
     *  which is a different statement that happened to have this effect. */
    rings?: false;
    onBand?: (b: 0 | 1 | 3 | 5 | 10) => void;
    /* ---- WHETHER THE MILE PICKER IS OFFERED AT ALL.
       A map that was handed its exact points has nothing to widen TO: the
       panel above it counted 26 permits and those 26 are what is drawn.
       MEASURED: the strip still rendered under those maps, four dead buttons
       and a legend chip reading "0 within 5 mi", because both are computed
       from `neighbours`, which such a map does not use. The rings themselves
       stay — they are the scale the distance claim is read against. */
    bandPicker?: boolean;
    /** the survey grade per well, for the readout */
    surveys?: LeaseSurvey[];
    base?: BaseMap;
    onBase?: (b: BaseMap) => void;
    /** WHICH LAYERS TO DRAW. Undefined means all of them, which is what the
        other callers of this map want; the lease report passes switches. */
    layers?: { surface: boolean; bottom: boolean; paths: boolean; neighbours: boolean };
    /* ---- HOW WIDE THE VIEW MUST OPEN, in degrees of latitude.
       A lone point is framed by `FLOOR` below — half a mile, which is right
       for a surveyed pad and wrong for a position that is only known to the
       nearest land grid. A caller that knows its point is approximate says so
       here, and the frame is honest about the uncertainty. */
    minSpan?: number;
  },
) {
  const [hover, setHover] = useState<string | null>(null);
  const [nHover, setNHover] = useState<string | null>(null);
  /* THE READER'S OWN VIEW, when they have moved it. Null means "fit to what
     is drawn", which is where every lease opens.

     THE REF IS THE SOURCE OF TRUTH FOR THE MATHS. A wheel gesture fires
     faster than React commits, so a handler that reads the view out of state
     is reading the value from before the previous event — and the cursor
     corrections compound into a jump. The ref is written synchronously; the
     state exists to trigger the repaint. */
  const [view, setView] = useState<Vw | null>(null);
  const viewRef = useRef<Vw | null>(null);
  const putView = (v: Vw | null) => { viewRef.current = v; setView(v); };
  /* THE LIVE DRAG, in pixels. Kept apart from `view` so the picture can be
     translated under the cursor at 60fps without recomputing the projection
     or asking Esri for a new photograph on every mouse move.

     THE ORIGIN IS A REF, NOT STATE. MEASURED: with the origin in state, a
     `pointermove` arriving before React had committed the `pointerdown`
     render read `null` out of the closure and the whole gesture panned
     nothing. A ref is current the instant it is written; the offset stays in
     state because that is the part that has to repaint. */
  const from = useRef<{ x: number; y: number } | null>(null);
  const [drag, setDrag] = useState<{ dx: number; dy: number } | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);


  /* dark ink on a photograph is unreadable; light ink on a street map is too */
  const onDark = BASE[base].dark;
  const ink = onDark ? '#ffffff' : '#334155';
  const faint = onDark ? '#e2e8f0' : '#94a3b8';
  const halo = onDark ? '#0d0e17' : 'none';
  const haloW = onDark ? 2.6 : 0;

  const show = layers ?? { surface: true, bottom: true, paths: true, neighbours: true };
  const shownN = useMemo(
    () => (band && (layers?.neighbours ?? true)
      ? neighbours.filter((nb) => nb.band <= band) : []),
    [neighbours, band, layers],
  );
  const svByApi = useMemo(() => {
    const m = new Map<string, LeaseSurvey>();
    for (const s of surveys) if (s.api14) m.set(s.api14, s);
    return m;
  }, [surveys]);

  const geom = useMemo(() => {
    /* THE EXTENT IS WHAT IS ACTUALLY DRAWN, not what the lease alone spans.
       Turning on the 5-mile ring and keeping the lease's own bounding box
       would push every neighbour outside the picture. */
    const lats: number[] = [];
    const lons: number[] = [];
    for (const w of data.wells) {
      lats.push(w.lat);
      lons.push(w.lon);
      if (w.bh_lat != null && w.bh_lon != null) { lats.push(w.bh_lat); lons.push(w.bh_lon); }
      for (const [la, lo] of w.path) { lats.push(la); lons.push(lo); }
    }
    for (const nb of shownN) { lats.push(nb.lat); lons.push(nb.lon); }
    if (!lats.length) {
      lats.push(data.min_lat, data.max_lat);
      lons.push(data.min_lon, data.max_lon);
    }

    const fitLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const fitLon = (Math.min(...lons) + Math.max(...lons)) / 2;
    const cLat = view?.lat ?? fitLat;
    const cLon = view?.lon ?? fitLon;
    const lonScale = Math.cos((cLat * Math.PI) / 180);

    /* A SINGLE WELL HAS NO EXTENT. Without a floor the projection divides by
       zero and every coordinate becomes NaN, which renders as an empty box.
       0.004 degrees is about a quarter of a mile — enough room to see it. */
    /* 0.008 degrees is about half a mile. MEASURED: at the old 0.004 floor a
       single-well lease opened with a 500 ft scale bar, which is closer than
       any reader wants to start — the pad fills the frame and the road it
       sits on is off the edge. */
    const innerW = W - PAD * 2;
    const innerH = H - PAD * 2;
    const innerW0 = innerW;
    const innerH0 = innerH;
    const FLOOR = Math.max(0.008, minSpan);
    let latSpan = Math.max(Math.max(...lats) - Math.min(...lats), FLOOR) * 1.15;
    let lonSpan = Math.max(Math.max(...lons) - Math.min(...lons), FLOOR) * 1.15;
    /* a ring needs room for its own circumference, not just its wells */
    if (band) {
      const need = (band * 2.2) / MI_PER_DEG_LAT;
      latSpan = Math.max(latSpan, need);
      lonSpan = Math.max(lonSpan, need / lonScale);
    }
    /* THE READER'S ZOOM REPLACES THE FITTED EXTENT ENTIRELY, and by exactly
       the definition `boxOf` uses — otherwise the maths and the picture
       disagree and the cursor drifts as you zoom. */
    if (view) {
      const b = boxOf(view, innerW0, innerH0);
      latSpan = b.latSpan;
      lonSpan = b.lonSpan;
    }

    if ((lonSpan * lonScale) / innerW > latSpan / innerH) {
      latSpan = (lonSpan * lonScale * innerH) / innerW;
    } else lonSpan = (latSpan * innerW) / innerH / lonScale;

    const lat0 = cLat - latSpan / 2;
    const lon0 = cLon - lonSpan / 2;
    const X = (lon: number) => PAD + ((lon - lon0) / lonSpan) * innerW;
    /* latitude grows north and y grows down, so it is inverted */
    const Y = (lat: number) => H - PAD - ((lat - lat0) / latSpan) * innerH;

    const pxPerMi = innerH / (latSpan * MI_PER_DEG_LAT);
    const ftPerPx = 5280 / pxPerMi;
    const target = ftPerPx * (innerW / 4);
    const steps = [200, 500, 1000, 2000, 5280, 10560, 26400, 52800];
    const barFt = steps.find((v) => v >= target) ?? steps[steps.length - 1];

    /* the box the basemap must render: the PADDED box, not the wells' box,
       or the photograph is drawn at the wrong scale under them */
    /* the inverse, so a pixel the reader dragged or scrolled over can be
       turned back into a place on the ground */
    const lonAt = (px: number) => lon0 + ((px - PAD) / innerW) * lonSpan;
    const latAt = (py: number) => lat0 + ((H - PAD - py) / innerH) * latSpan;
    return {
      X, Y, pxPerMi, barPx: barFt / ftPerPx, barFt,
      lonAt, latAt, latSpan, lonSpan, fitLat, fitLon,
      bbox: [lon0, lat0, lon0 + lonSpan, lat0 + latSpan] as const,
    };
  }, [data, shownN, band, view, minSpan]);

  /* the geometry the handlers read, kept current for the same reason as the
     view: a gesture must not be computing against the previous render */
  const geomRef = useRef(geom);
  geomRef.current = geom;
  /* and the basemap, because the wheel listener is attached once and would
     otherwise keep the stop belonging to whichever map was showing then */
  const baseRef = useRef(base);
  baseRef.current = base;

  /* the centre of THIS lease's own wells — where the rings are drawn from */
  const own = useMemo(() => {
    if (!data.wells.length) return null;
    return {
      lat: data.wells.reduce((a, w) => a + w.lat, 0) / data.wells.length,
      lon: data.wells.reduce((a, w) => a + w.lon, 0) / data.wells.length,
    };
  }, [data.wells]);

  /* ONE FUNCTION DECIDES THE KEY, and both the legend and the colour call it
     — which is the only way the swatch beside a name can be the swatch on the
     map. They were two expressions before this and had to be kept in step by
     hand. */
  const keyOf = (w: MapWell) => (colourBy === 'lease' ? w.lease_label
    : colourBy === 'group' ? w.group ?? 'not grouped'
      : w.reservoir ?? 'not named');
  const keys = useMemo(() => [...new Set(data.wells.map(keyOf))].sort(),
    [data.wells, colourBy]);

  /**
   * MORE KEYS THAN COLOURS IS NO KEY AT ALL.
   *
   * MEASURED: the WILCOX 10400 reservoir holds nine of this owner's leases,
   * and colouring by lease cycled a six-colour palette — so two different
   * leases were given the same swatch and the legend claimed they were the
   * same thing. Past the palette the map goes to one colour and says so.
   */
  const tooMany = keys.length > RES_COLOURS.length;
  const colour = (w: MapWell) => {
    if (tooMany) return '#2e8f6d';
    return RES_COLOURS[Math.max(0, keys.indexOf(keyOf(w))) % RES_COLOURS.length];
  };

  /* WHAT THE POINT IS CALLED IN WORDS. On a reservoir map that is the
     reservoir; on a map of permits and completions it is the group, because
     "reservoir not named" is a true sentence about the wrong subject. */
  const saidAs = (w: MapWell) => (colourBy === 'group'
    ? w.group ?? 'not grouped'
    : w.reservoir ?? 'reservoir not named');

  const shown = hover ? data.wells.find((w) => w.api14 === hover) : null;
  const shownNb = nHover ? shownN.find((x) => x.id === nHover) : null;

  /* ---- THE TILES THAT COVER THE VIEW.
     The level is chosen so one tile is about 256 drawing units — any coarser
     and the imagery is visibly soft, any finer and it fetches four times the
     tiles for detail the box cannot show. */
  /* ---- THE LEVEL IN FORCE, which lags the ideal one while the reader moves.
     MEASURED: six wheel steps cross about three level boundaries, and each
     boundary is a fresh mosaic -- roughly 45 tile requests for one picture
     the reader ends up looking at. Holding the level until the view settles
     asks for one. Tiles are positioned from their own bounds, so a level one
     off ideal is soft for an instant and never misplaced. */
  const [heldZ, setHeldZ] = useState<number | null>(null);
  const settleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tiles = useMemo(() => {
    const [w0, s0, e0, n0] = geom.bbox;
    const innerW = W - PAD * 2;
    /* THE CLOSER OF THE TWO CANDIDATE LEVELS, not the first that fits.
       Each level doubles, so "the first level whose span reaches the target"
       overshoots by up to 2x — MEASURED at z=18 and 24 tiles where 12 would
       do. 17 is the cap: below it the street and topographic pyramids thin
       out over rural ground while the tile count keeps doubling. */
    const want = innerW / TILE;
    const maxZ = CLOSEST[base].z;
    let z = 8;
    for (let k = 9; k <= maxZ; k += 1) {
      const at = lon2x(e0, k) - lon2x(w0, k);
      const below = lon2x(e0, k - 1) - lon2x(w0, k - 1);
      if (at >= want) {
        z = Math.abs(at - want) <= Math.abs(want - below) ? k : k - 1;
        break;
      }
      z = k;
    }
    z = Math.max(8, Math.min(maxZ, z));
    /* THE LEVEL THE VIEW WANTS, kept separately from the one that gets drawn.
       Returning the drawn level as the ideal would make them always equal and
       the settle below would never fire. */
    const ideal = z;
    /* TWO LEVELS OF SLACK, NOT ANY AMOUNT. One level is not enough: a flick
       of the wheel crosses two, and adopting on the second undoes the point.
       Two is a fourfold scale difference -- soft for a seventh of a second,
       which is what every map on the web looks like while you move it. Past
       that the imagery is wrong rather than soft, so the ideal level wins
       immediately even mid-gesture. */
    if (heldZ != null && heldZ !== z && Math.abs(heldZ - z) <= 2
      && heldZ >= 8 && heldZ <= maxZ) z = heldZ;
    const x0 = Math.floor(lon2x(w0, z));
    const x1 = Math.floor(lon2x(e0, z));
    const y0 = Math.floor(lat2y(n0, z));
    const y1 = Math.floor(lat2y(s0, z));
    const out: { key: string; url: string; x: number; y: number; w: number; h: number }[] = [];
    /* A RUNAWAY LEVEL WOULD ASK FOR THOUSANDS OF TILES. 8x8 is far more than
       this box can need and is a hard stop rather than a hope. */
    if ((x1 - x0) > 8 || (y1 - y0) > 8) return { z, out, ideal };
    const svc = BASE[base].service;
    for (let x = x0; x <= x1; x += 1) {
      for (let y = y0; y <= y1; y += 1) {
        /* each tile's own corners, projected the same way as everything else,
           so it lands exactly where it belongs rather than being stretched */
        const tw = x2lon(x, z);
        const te = x2lon(x + 1, z);
        const tn = y2lat(y, z);
        const ts = y2lat(y + 1, z);
        const px = geom.X(tw);
        const py = geom.Y(tn);
        out.push({
          key: `${z}/${y}/${x}`,
          url: `https://services.arcgisonline.com/ArcGIS/rest/services/${svc}`
            + `/MapServer/tile/${z}/${y}/${x}`,
          x: px,
          y: py,
          w: geom.X(te) - px,
          h: geom.Y(ts) - py,
        });
      }
    }
    return { z, out, ideal };
  }, [geom, base, heldZ]);

  /* ---- ADOPT THE IDEAL LEVEL ONCE THE VIEW HAS STOPPED CHANGING.
     140ms is long enough to swallow a run of wheel events -- they arrive
     tens of milliseconds apart -- and short enough that a reader who has
     stopped does not notice waiting for the sharp version. */
  /* MEASURED, AND MY FIRST VERSION OF THIS DID NOTHING: it compared the level
     being drawn with the ideal one, and those are equal until something has
     been held -- so nothing was ever held and the level still moved on every
     other wheel step (15, 16, 16, 17, 17, 17, 18). The comparison has to be
     between what is HELD and what is ideal. */
  useEffect(() => {
    if (settleRef.current) clearTimeout(settleRef.current);
    if (heldZ === tiles.ideal) return undefined;
    settleRef.current = setTimeout(() => setHeldZ(tiles.ideal), 140);
    return () => { if (settleRef.current) clearTimeout(settleRef.current); };
    /* GEOM IS IN THE DEPS BECAUSE THE TIMER MUST RESET ON EVERY MOVE, not
       only when the ideal level changes. MEASURED without it: wheel events
       arrive about 40ms apart and the ideal level holds for two of them, so
       the effect did not re-run, the first timer was never cleared, and it
       fired 140ms in -- mid-gesture. The level still walked 15, 16, 16, 17.
       geom changes on every view change, which is exactly the signal. */
  }, [heldZ, tiles.ideal, geom]);

  /* a new lease, or a new basemap, starts from the level it asks for */
  useEffect(() => { setHeldZ(null); }, [data, base]);

  /* CHANGING WHAT IS SHOWN REFITS WHAT IS LOOKED AT.
     MEASURED: zoomed in two steps and then asked for the 5-mile ring, the
     map drew none of the 120 neighbours it had just counted — they were all
     outside the reader's own zoom. A new question deserves a new view. */
  useEffect(() => { putView(null); }, [band, data]);

  /* WHICH TILES HAVE LOADED, by key, ever.
     NOT A COUNTER. MEASURED: a counter never reached zero, because React
     keys tiles by `z/y/x` and a tile still in view after a zoom is the same
     element with the same href — already loaded, so it fires no new event.
     A set needs no event for a tile it already holds. */
  const [loadedTiles, setLoadedTiles] = useState<Set<string>>(() => new Set());
  const tileDone = (key: string) => setLoadedTiles((prev) => {
    if (prev.has(key)) return prev;
    const next = new Set(prev);
    next.add(key);
    return next;
  });
  /* the strip shows while any tile of the CURRENT mosaic is still coming */
  const stillLoading = tiles.out.length > 0
    && tiles.out.some((t) => !loadedTiles.has(t.key));

  /* ---- pan and zoom.
     THE DRAG IS A TRANSFORM, NOT A REPROJECTION. Recomputing the projection
     on every pointer move would re-request the photograph dozens of times
     across one gesture; translating the whole group and committing the move
     once on release asks for exactly one new picture. */
  const onDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    from.current = { x: e.clientX, y: e.clientY };
    setDrag({ dx: 0, dy: 0 });
  };
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const f = from.current;
    if (!f) return;
    setDrag({ dx: e.clientX - f.x, dy: e.clientY - f.y });
  };
  const onUp = (e?: React.PointerEvent<SVGSVGElement>) => {
    const f = from.current;
    from.current = null;
    if (!f) { setDrag(null); return; }
    /* the last move may not have landed as state yet, so the offset is taken
       from the event where there is one rather than from `drag` */
    const dx = e ? e.clientX - f.x : (drag?.dx ?? 0);
    const dy = e ? e.clientY - f.y : (drag?.dy ?? 0);
    /* A CLICK IS NOT A PAN. Under about three pixels the reader was aiming at
       a well, not moving the map, and committing a view would fight the pin's
       own click handler. */
    if (Math.abs(dx) < 3 && Math.abs(dy) < 3) { setDrag(null); return; }
    const el = svgRef.current;
    /* the SVG is drawn at whatever width the column gives it, so a pixel of
       mouse movement is not a pixel of viewBox — scale by the ratio */
    const k = el ? W / el.getBoundingClientRect().width : 1;
    const innerW = W - PAD * 2;
    const innerH = H - PAD * 2;
    const dLon = -((dx * k) / innerW) * geom.lonSpan;
    const dLat = ((dy * k) / innerH) * geom.latSpan;
    putView({
      lat: (viewRef.current?.lat ?? geom.fitLat) + dLat,
      lon: (viewRef.current?.lon ?? geom.fitLon) + dLon,
      span: geom.latSpan,
    });
    setDrag(null);
  };
  /* ---- THE WHEEL, attached by hand because React's is passive.
     `onWheel` in JSX cannot call preventDefault — React registers it
     passively — so the page scrolled while the map zoomed, which is most of
     what "unstable" was. Everything the handler needs comes from the ref, so
     consecutive events compose instead of each correcting a stale view. */
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const innerW = W - PAD * 2;
    const innerH = H - PAD * 2;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const cur: Vw = viewRef.current
        ?? { lat: geomRef.current.fitLat, lon: geomRef.current.fitLon,
          span: geomRef.current.latSpan };
      const b = boxOf(cur, innerW, innerH);
      /* the cursor as a fraction of the DRAWING box, then as a place */
      const fx = (((e.clientX - r.left) / r.width) * W - PAD) / innerW;
      const fy = (((e.clientY - r.top) / r.height) * H - PAD) / innerH;
      const atLon = b.lon0 + Math.min(1, Math.max(0, fx)) * b.lonSpan;
      const atLat = b.lat0 + (1 - Math.min(1, Math.max(0, fy))) * b.latSpan;
      /* ZOOM ABOUT THE CURSOR: the place under the mouse is the place being
         looked at, and it should not move. A quarter mile is a pad and forty
         miles is a county, so those are the stops. */
      const want = cur.span * (e.deltaY > 0 ? 1.3 : 1 / 1.3);
      const span = Math.max(CLOSEST[baseRef.current].span, Math.min(WIDEST, want));
      const f = span / cur.span;
      putView({
        lat: atLat + (cur.lat - atLat) * f,
        lon: atLon + (cur.lon - atLon) * f,
        span,
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  /** the drawn path for a well: its trajectory, else its two filed points */
  const pathOf = (w: MapWell): { pts: [number, number][]; real: boolean } => {
    if (w.path.length > 2) return { pts: w.path, real: true };
    if (w.path.length === 2) return { pts: w.path, real: false };
    if (w.bh_lat != null && w.bh_lon != null) {
      return { pts: [[w.lat, w.lon], [w.bh_lat, w.bh_lon]], real: false };
    }
    return { pts: [], real: false };
  };

  const bases: BaseMap[] = ['satellite', 'topo', 'street'];
  const ringSteps: (0 | 1 | 3 | 5)[] = [0, 1, 3, 5];
  const trajN = data.wells.filter((w) => w.path_basis === 'trajectory').length;

  return (
    <div className="ml-map">
      <div className="ml-mapctl">
        {/* THE RING BUTTONS ARE THE CALLER'S when it has its own layer panel:
            the lease report puts them beside the neighbours switch, and two
            copies of one control is a reader wondering which one is live. */}
        {/* NOT RENDERED, RATHER THAN HIDDEN. `hidden` is a rule in the
            browser's stylesheet and `.ml-segs { display: flex }` outranks it,
            so this strip was on screen the whole time -- two ring pickers,
            and the reader asked for the miles only once neighbours are on. */}
        <span className="ml-segs" role="group" aria-label="Neighbouring wells to show"
          hidden={Boolean(layers) || rings === false || !bandPicker}
        >
          {layers || rings === false || !bandPicker ? null : ringSteps.map((b) => (
            <button
              key={b} type="button"
              className={band === b ? 'on' : ''}
              aria-pressed={band === b}
              disabled={!onBand || (b !== 0 && !neighbours.length)}
              onClick={() => onBand?.(b)}
            >
              {b === 0 ? 'This lease' : `${b} mi`}
              {b !== 0 && neighbours.length ? (
                <i>{neighbours.filter((nb) => nb.band <= b).length}</i>
              ) : null}
            </button>
          ))}
        </span>
        <span className="ml-segs ml-bases" role="group" aria-label="Base map">
          {bases.map((b) => (
            <button
              key={b} type="button"
              className={base === b ? 'on' : ''}
              aria-pressed={base === b}
              disabled={!onBase}
              onClick={() => onBase?.(b)}
            >
              {BASE[b].name}
            </button>
          ))}
        </span>
      </div>

      <div className="ml-mapwrap">
        {stillLoading ? <span className="ml-loading">loading imagery…</span> : null}
        {view ? (
          <button type="button" className="ml-reset" onClick={() => putView(null)}>
            Reset view
          </button>
        ) : null}
        <span className="ml-zoom" role="group" aria-label="Zoom">
          <button type="button" aria-label="Zoom in"
            onClick={() => putView({
              lat: viewRef.current?.lat ?? geom.fitLat,
              lon: viewRef.current?.lon ?? geom.fitLon,
              span: Math.max(CLOSEST[base].span, geom.latSpan / 1.3),
            })}
          >
            +
          </button>
          <button type="button" aria-label="Zoom out"
            onClick={() => putView({
              lat: viewRef.current?.lat ?? geom.fitLat,
              lon: viewRef.current?.lon ?? geom.fitLon,
              span: Math.min(WIDEST, geom.latSpan * 1.3),
            })}
          >
            −
          </button>
        </span>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`} role="img" aria-label={data.note}
        className={`ml-mapsvg${drag ? ' dragging' : ''}`}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onDoubleClick={() => putView(null)}
      >
        <defs>
          <clipPath id="mlClip">
            <rect x="1" y="1" width={W - 2} height={H - 2} rx="12" />
          </clipPath>
        </defs>
        <rect x="1" y="1" width={W - 2} height={H - 2} rx="12" fill="#e9eef1" stroke="#e5eaee" />

        <g clipPath="url(#mlClip)"
          transform={drag ? `translate(${drag.dx} ${drag.dy})` : undefined}
        >
          {tiles.out.map((t) => (
            <image
              key={t.key} href={t.url}
              x={t.x} y={t.y} width={t.w + 0.6} height={t.h + 0.6}
              preserveAspectRatio="none"
              onLoad={() => tileDone(t.key)}
              /* A TILE THAT 404s MUST NOT HOLD THE STRIP OPEN. Esri's pyramid
                 has gaps at the deepest levels over some ground. */
              onError={() => tileDone(t.key)}
            />
          ))}
        </g>
        <g transform={drag ? `translate(${drag.dx} ${drag.dy})` : undefined}>

        {/* the rings, measured from this lease's own wells */}
        {band && own ? (
          <g clipPath="url(#mlClip)">
            {([1, 3, 5, 10] as const).filter((r) => r <= band).map((r) => (
              <g key={r}>
                <circle
                  cx={geom.X(own.lon)} cy={geom.Y(own.lat)} r={r * geom.pxPerMi}
                  fill="none" stroke={faint} strokeWidth="1.3" strokeDasharray="5 5"
                  opacity={onDark ? 0.8 : 0.95}
                />
                <text
                  x={geom.X(own.lon)} y={geom.Y(own.lat) - r * geom.pxPerMi + 13}
                  textAnchor="middle" fontSize="10" fontWeight="800" fill={faint}
                  stroke={halo} strokeWidth={haloW} paintOrder="stroke"
                >
                  {r} mi
                </text>
              </g>
            ))}
          </g>
        ) : null}

        {/* the neighbours, under this lease's own wells */}
        {/* A 3.4px GREY DOT ON A PHOTOGRAPH IS NOT A MARK. Sized to be seen,
            filled where the well is producing and hollow where it is not, and
            haloed so it survives whatever is underneath. */}
        {shownN.map((nb) => {
          const on = nHover === nb.id;
          /* grown with the well pins, and kept smaller than them — a
             neighbour is context, not the subject */
          const r = on ? 9 : 6.5;
          return (
            <g
              key={nb.id} className="ml-nb"
              onPointerEnter={() => setNHover(nb.id)}
              onPointerLeave={() => setNHover(null)}
            >
              <circle
                cx={geom.X(nb.lon)} cy={geom.Y(nb.lat)} r={r}
                fill={nb.producing ? '#f1f5f9' : 'none'}
                stroke={onDark ? '#0d0e17' : '#ffffff'} strokeWidth="3"
              />
              <circle
                cx={geom.X(nb.lon)} cy={geom.Y(nb.lat)} r={r}
                fill={nb.producing ? '#64748b' : 'none'}
                fillOpacity={nb.producing ? 0.55 : 0}
                stroke="#64748b" strokeWidth="1.6"
              />
            </g>
          );
        })}

        {/* ---- this lease's own well paths.
            A REAL TRAJECTORY AND A TWO-POINT CHORD MUST NOT LOOK ALIKE. The
            first follows the bends the record carries; the second is the
            state's note of where the hole started and finished, with nothing
            in between. Solid and dashed respectively. */}
        {(show.paths ? data.wells : []).map((w) => {
          const { pts, real } = pathOf(w);
          if (pts.length < 2) return null;
          const on = selected === w.api14 || hover === w.api14;
          const d = pts.map(([la, lo], i) => `${i ? 'L' : 'M'}${geom.X(lo).toFixed(1)} `
            + `${geom.Y(la).toFixed(1)}`).join(' ');
          const [eLa, eLo] = pts[pts.length - 1];
          const [pLa, pLo] = pts[pts.length - 2];
          const x2 = geom.X(eLo);
          const y2 = geom.Y(eLa);
          const ang = Math.atan2(y2 - geom.Y(pLa), x2 - geom.X(pLo));
          const L = on ? 11 : 9;
          const tip = (a: number) => `${(x2 - L * Math.cos(ang - a)).toFixed(1)},`
            + `${(y2 - L * Math.sin(ang - a)).toFixed(1)}`;
          return (
            <g key={`p${w.api14}`}>
              {/* a casing under the line keeps it legible on a photograph */}
              {onDark ? (
                <path d={d} fill="none" stroke="#0d0e17" strokeWidth={on ? 6.5 : 5}
                  strokeLinecap="round" strokeLinejoin="round" opacity=".5"
                />
              ) : null}
              <path
                d={d} fill="none" stroke={colour(w)} strokeWidth={on ? 4 : 2.8}
                strokeLinecap="round" strokeLinejoin="round"
                strokeDasharray={real ? undefined : '7 5'}
                opacity={on ? 1 : 0.9}
              />
              <polygon
                points={`${x2.toFixed(1)},${y2.toFixed(1)} ${tip(0.42)} ${tip(-0.42)}`}
                fill={colour(w)}
              />
            </g>
          );
        })}

        {/* the BOTTOM holes — a diamond, so it is not mistaken for a surface
            hole at a glance the way a second circle would be */}
        {(show.bottom ? data.wells : []).map((w) => {
          const { pts } = pathOf(w);
          if (pts.length < 2) return null;
          const [la, lo] = pts[pts.length - 1];
          const x = geom.X(lo);
          const y = geom.Y(la);
          const r = 5;
          return (
            <polygon
              key={`b${w.api14}`}
              points={`${x},${y - r} ${x + r},${y} ${x},${y + r} ${x - r},${y}`}
              fill="#fff" stroke={colour(w)} strokeWidth="2"
            />
          );
        })}

        {/* the SURFACE holes, on top */}
        {(show.surface ? data.wells : []).map((w) => {
          const x = geom.X(w.lon);
          const y = geom.Y(w.lat);
          const on = selected === w.api14 || hover === w.api14;
          return (
            <g
              key={w.api14}
              className={onPick ? 'ml-pin' : undefined}
              onPointerEnter={() => setHover(w.api14)}
              onPointerLeave={() => setHover(null)}
              onClick={onPick ? () => onPick(w) : undefined}
              tabIndex={onPick ? 0 : undefined}
              /* ---- LABELLED EITHER WAY.
                 Only the BUTTON behaviour depends on there being something to
                 click. A point with no click is still a well, and dropping its
                 name left a screen reader with an unlabelled circle — which is
                 exactly the map the focused panel draws. */
              role={onPick ? 'button' : 'img'}
              aria-label={`${w.label}. ${saidAs(w)}.`}
              onKeyDown={onPick ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(w); }
              } : undefined}
            >
              {/* ---- BIG ENOUGH TO SEE AND TO HIT.
                  MEASURED: the ring was 6.5 units of a 1000-unit box, which
                  renders at about 7 px in a drawer and reads as a speck. It is
                  also the click target, and 7 px is under every pointer-size
                  guideline there is. */}
              <circle cx={x} cy={y} r={on ? 12 : 9} fill="#fff" stroke={colour(w)}
                strokeWidth={on ? 4 : 3}
              />
              {/* a hollow ring means it filed nothing in the last posted month */}
              {w.active ? <circle cx={x} cy={y} r={on ? 5.5 : 4} fill={colour(w)} /> : null}
              <text
                x={x} y={y - (on ? 18 : 14.5)} textAnchor="middle"
                fontSize={on ? '12' : '11'} fontWeight="800" fill={ink}
                stroke={halo} strokeWidth={haloW} paintOrder="stroke"
              >
                {w.well_number ?? '?'}
              </text>
            </g>
          );
        })}

        </g>

        {/* the chrome stays put while the ground moves under it */}
        {/* north arrow */}
        <g transform={`translate(${W - 34} 34)`}>
          <line x1="0" y1="14" x2="0" y2="-8" stroke={faint} strokeWidth="1.8" />
          <polygon points="0,-13 -4,-5 4,-5" fill={faint} />
          <text x="0" y="25" textAnchor="middle" fontSize="9.5" fontWeight="800" fill={faint}
            stroke={halo} strokeWidth={haloW} paintOrder="stroke"
          >
            N
          </text>
        </g>

        {/* scale bar */}
        <g transform={`translate(${PAD} ${H - 14})`}>
          <line x1="0" y1="0" x2={geom.barPx} y2="0" stroke={faint} strokeWidth="2.4" />
          <line x1="0" y1="-4" x2="0" y2="4" stroke={faint} strokeWidth="2.4" />
          <line x1={geom.barPx} y1="-4" x2={geom.barPx} y2="4" stroke={faint} strokeWidth="2.4" />
          <text x={geom.barPx / 2} y="-7" textAnchor="middle" fontSize="10" fontWeight="800"
            fill={faint} stroke={halo} strokeWidth={haloW} paintOrder="stroke"
          >
            {geom.barFt >= 5280
              ? `${Math.round((geom.barFt / 5280) * 10) / 10} mi`
              : `${n0(geom.barFt)} ft`}
          </text>
        </g>
      </svg>
      </div>

      <div className="ml-maplegend">
        {tooMany ? (
          <span>
            <i style={{ background: '#2e8f6d' }} />
            {keys.length}{' '}
            {colourBy === 'lease' ? 'leases'
              : colourBy === 'group' ? 'groups' : 'reservoirs'} — too many to colour apart
          </span>
        ) : keys.map((k, i) => (
          <span key={k}>
            <i style={{ background: RES_COLOURS[i % RES_COLOURS.length] }} />
            {k}
          </span>
        ))}
        {band && bandPicker ? (
          <span><i style={{ background: '#94a3b8' }} />{shownN.length} within {band} mi</span>
        ) : null}
        <span className="ml-mapkey">
          {show.surface ? <><b>○</b> surface </> : null}
          {show.bottom ? <><b>◇</b> bottom hole </> : null}
          {show.paths ? (trajN
            ? <>· <b>—</b> recorded trajectory · <b>- -</b> surface-to-bottom line</>
            : <>· <b>- -</b> surface-to-bottom line</>) : null}
        </span>
      </div>

      <p className="ml-mapnote">
        {shownNb ? (
          <>
            <strong>{shownNb.lease_name ?? 'a neighbouring lease'}</strong>
            {shownNb.well_number ? ` · well ${shownNb.well_number}` : ''} ·{' '}
            {n1(shownNb.distance_mi)} miles away
            {shownNb.operator_name ? ` · ${shownNb.operator_name}` : ''} ·{' '}
            {shownNb.producing ? 'producing' : 'no volume last month'} — not your lease
          </>
        ) : shown ? (
          <>
            <strong>{shown.label}</strong> · {saidAs(shown)} ·{' '}
            {shown.profile?.toLowerCase() ?? 'profile not recorded'}
            {shown.depth_ft ? ` · ${n0(shown.depth_ft)} ft deep` : ''}
            {shown.deviated && shown.lateral_ft
              ? ` · ${n0(shown.lateral_ft)} ft ${shown.bearing_compass ?? ''}`
              : ' · vertical'}
            {shown.path_basis === 'trajectory'
              ? ` · path from ${shown.path.length} recorded points`
              : shown.path_basis === 'direction' ? ' · surface-to-bottom line only' : ''}
            {(() => {
              const sv = svByApi.get(shown.api14);
              if (!sv || sv.vertical) return '';
              return ` · ${sv.grade_label.toLowerCase()}`
                + `${sv.error_ft ? `, ±${n0(sv.error_ft)} ft` : ''}`;
            })()}
          </>
        ) : (
          <>Hover a well for its detail · imagery from Esri</>
        )}
      </p>
    </div>
  );
}

/**
 * WHAT A MAP DRAWS — the four shapes `WellMap` reads.
 *
 * PORTED FROM the reference build's `src/lib/leases.ts`, where they are
 * declared beside the lease report that first needed them. They live in a file
 * of their own here because this app has no `lib/leases`: the only readers are
 * `WellMap` and `DrawerMapBlock`, and a map's input is not part of the payload
 * contract — `payload.ts` describes what the SERVICE sends, and these describe
 * what a component is handed after the view has selected and projected it.
 *
 * `MapWell` is the unit. Everything else is a frame around a set of them: the
 * bounding box (`MapData`), the ring rows drawn underneath (`LeaseNeighbour`)
 * and the walked survey track (`LeaseSurvey`). A point carries BOTH holes —
 * surface and bottom — because a horizontal well is a line on the ground and
 * drawing only its surface location puts a mile-and-a-half lateral under a
 * single dot.
 */

/** One well on the map. */
export interface MapWell {
  api14: string;
  label: string;
  well_number: string | null;
  lease_id: string;
  lease_label: string;
  reservoir: string | null;
  /** WHAT KIND OF THING THIS POINT IS, where the map is not about rock.
      A permits-and-completions map has three groups on it and none of them is
      a reservoir; `colourBy: 'group'` keys the legend on this instead. */
  group?: string | null;
  profile: string | null;
  lat: number;
  lon: number;
  /** the bottom hole, where the record has one that is somewhere else */
  bh_lat: number | null;
  bh_lon: number | null;
  /** the hole's own shape on the ground, as [lat, lon] vertices */
  path: [number, number][];
  /** `trajectory` where the path is real, `direction` where it is a chord */
  path_basis: 'trajectory' | 'direction' | null;
  deviated: boolean;
  lateral_ft: number | null;
  bearing_deg: number | null;
  bearing_compass: string | null;
  depth_ft: number | null;
  /** producing at the last posted month, by the allocated series */
  active: boolean;
}

/** A set of wells and the box they fit in. */
export interface MapData {
  wells: MapWell[];
  /** the box every well fits in, and how big it is on the ground */
  min_lat: number;
  max_lat: number;
  min_lon: number;
  max_lon: number;
  span_ns_mi: number;
  span_ew_mi: number;
  deviated_count: number;
  note: string;
}

/** A ring row, drawn underneath the subject wells for somewhere to measure from. */
export interface LeaseNeighbour {
  id: string;
  lat: number;
  lon: number;
  band: 1 | 3 | 5;
  distance_mi: number;
  kind: string;
  lease_name: string | null;
  operator_name: string | null;
  well_number: string | null;
  producing: boolean;
  is_own: boolean;
  last_month_gas: number | null;
  last_month_oil: number | null;
}

/** The walked directional survey behind one hole, where the state has one. */
export interface LeaseSurvey {
  api14: string;
  well_number: string | null;
  grade: 'measured' | 'partial' | 'estimated' | 'none';
  grade_label: string;
  error_ft: number | null;
  station_count: number;
  surveyed_md_ft: number | null;
  /** the raw band letter, for anyone who needs the pipeline's own grade */
  band: string | null;
  /** WHY there is no survey — a missing document and an unreadable one are
      different jobs for whoever has to chase it */
  h_reason: string | null;
  /** the walked ground track, as feet east and north of the surface hole */
  track: { east_ft: number; north_ft: number }[];
  /** how far the walk lands from the FILED bottom hole, in feet */
  closure_ft: number | null;
  reach_ft: number | null;
  /** true for a vertical hole, which needs no survey and is not a gap */
  vertical: boolean;
  note: string;
}

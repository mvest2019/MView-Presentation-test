/**
 * MAP EXPLORER ENTITLEMENTS — THE ONLY PLACE ANY TIER LIMIT IS WRITTEN.
 *
 * Transcribed from `MAP_EXPLORER_TIER_PERSONAS_SPEC_2026-09-09.md` §7.1, §7.2
 * and §7.5. Its own instruction for this file is "copy this verbatim … do not
 * re-derive them from the tables by hand", so the four objects below are the
 * spec's, number for number.
 *
 * NO COMPONENT, ROUTE HANDLER OR MARKETING PAGE MAY HARD-CODE A NUMBER THAT
 * APPEARS HERE. If a cap changes it changes once, here, and the map, the API
 * and the pricing page all move together.
 *
 * ── WHAT THIS FILE IS NOT ──
 *
 * It is not enforcement. §7.4: "The client entitlement object is a rendering
 * hint only. It decides what to draw. It never decides what data exists."
 * Every gate in the spec is two gates — a UI gate and a server gate — and the
 * server half needs the proxy §8.2 calls for, which does not exist yet: the map
 * APIs are unauthenticated and `MAP_BASE_URL` is inlined into the client bundle
 * (§8.1). Until that lands these caps shape the UI and nothing more, and anyone
 * reading the bundle can still call upstream directly. A documented gap, not an
 * oversight — see `entitlements-server.ts`.
 *
 * ── THE VIEW-DENSITY AXIS THIS REPLACED ──
 *
 * The map used to gate itself on the portal's four view-density values, which
 * carry the same four words and mean the opposite thing: density is how much
 * the reader WANTS to see, an untrusted preference they set for themselves. A
 * tier is what the account MAY see. The map now reads this; the density picker
 * in the portal chrome chooses which tier to *demo*, floored by the account's
 * real one so a demo can never grant an entitlement — §12.1, fail down never
 * up.
 */

export const TIER_ORDER = ["ultra", "essential", "detailed", "pro"] as const;
export type Tier = (typeof TIER_ORDER)[number];

/** Every facet the filter rail can carry, in the spec's unlock order. */
export type Facet =
  | "county"
  | "wtype"
  | "operator"
  | "status"
  | "play"
  | "field";

export type Entitlements = {
  tier: Tier;

  map: {
    basemaps: string[];
    wellsCapPerExtent: number;
    wellBores: boolean;
    wellTooltipFull: boolean;
    clusterTooltipMix: boolean;
  };

  search: { api: boolean };

  filters: {
    facets: Facet[];
    productionRange: boolean;
    returnCap: number;
  };

  table: { maxPage: number | null; sort: boolean; summaryFull: boolean };

  insights: {
    summaryFields: "basic" | "full";
    production: "none" | "reported" | "full";
    customRange: boolean;
    wellbore: boolean;
    decline: boolean;
    cohorts: boolean;
    permitFull: boolean;
    permitBottomHole: boolean;
    permitNearestWell: boolean;
  };

  ai: { enabled: boolean; perDay: number; perMinute: number };

  timeLapse: boolean;

  tools: {
    measureDistance: boolean;
    measureArea: boolean;
    drawArea: boolean;
    /** `[]` means locked. */
    nearbyRadii: number[];
  };

  exports: {
    mapPng: boolean;
    tableCsvPerMonth: number;
    viewCsvPerMonth: number;
    areaCsvPerMonth: number;
    nearbyCsvPerMonth: number;
    pdfPerMonth: number;
  };

  quota: { requestsPerDay: number };
};

/**
 * Display names, in one constant.
 *
 * REVIEW RULE, §7.2: the string "Ultra" — or any other tier name — must not
 * appear in JSX anywhere. Always `TIER_LABELS[tier]`. That is what makes the
 * rename §2 recommends a one-line change instead of a sweep, and §2 is not
 * settled: `Ultra` as the ENTRY tier inverts the market convention that Ultra
 * means top, and the spec expects checkout confusion and refunds because of it.
 */
export const TIER_LABELS: Record<Tier, string> = {
  ultra: "Ultra",
  essential: "Essential",
  detailed: "Detailed",
  pro: "Pro",
};

/** Is `t` at or above `min` on the ladder? */
export const atLeast = (t: Tier, min: Tier): boolean =>
  TIER_ORDER.indexOf(t) >= TIER_ORDER.indexOf(min);

export const TIERS: Record<Tier, Entitlements> = {
  ultra: {
    tier: "ultra",
    map: {
      basemaps: ["streets", "topo-vector"],
      wellsCapPerExtent: 250,
      wellBores: false,
      wellTooltipFull: false,
      clusterTooltipMix: false,
    },
    search: { api: false },
    filters: {
      facets: ["county", "wtype"],
      productionRange: false,
      returnCap: 500,
    },
    table: { maxPage: 3, sort: false, summaryFull: false },
    insights: {
      summaryFields: "basic",
      production: "none",
      customRange: false,
      wellbore: false,
      decline: false,
      cohorts: false,
      permitFull: false,
      permitBottomHole: false,
      permitNearestWell: false,
    },
    ai: { enabled: false, perDay: 0, perMinute: 0 },
    timeLapse: false,
    tools: {
      measureDistance: true,
      measureArea: false,
      drawArea: false,
      nearbyRadii: [],
    },
    exports: {
      mapPng: false,
      tableCsvPerMonth: 0,
      viewCsvPerMonth: 0,
      areaCsvPerMonth: 0,
      nearbyCsvPerMonth: 0,
      pdfPerMonth: 0,
    },
    quota: { requestsPerDay: 2_000 },
  },

  essential: {
    tier: "essential",
    map: {
      basemaps: ["streets", "topo-vector", "satellite", "hybrid"],
      wellsCapPerExtent: 1_000,
      wellBores: true,
      wellTooltipFull: true,
      clusterTooltipMix: true,
    },
    search: { api: true },
    filters: {
      facets: ["county", "wtype", "operator", "status"],
      productionRange: false,
      returnCap: 1_000,
    },
    table: { maxPage: 20, sort: true, summaryFull: true },
    insights: {
      summaryFields: "full",
      production: "reported",
      customRange: false,
      wellbore: true,
      decline: false,
      cohorts: false,
      permitFull: true,
      permitBottomHole: false,
      permitNearestWell: false,
    },
    ai: { enabled: false, perDay: 0, perMinute: 0 },
    timeLapse: false,
    tools: {
      measureDistance: true,
      measureArea: true,
      drawArea: false,
      nearbyRadii: [],
    },
    exports: {
      mapPng: true,
      tableCsvPerMonth: 10,
      viewCsvPerMonth: 0,
      areaCsvPerMonth: 0,
      nearbyCsvPerMonth: 0,
      pdfPerMonth: 0,
    },
    quota: { requestsPerDay: 10_000 },
  },

  detailed: {
    tier: "detailed",
    map: {
      basemaps: ["streets", "topo-vector", "satellite", "hybrid"],
      wellsCapPerExtent: 5_000,
      wellBores: true,
      wellTooltipFull: true,
      clusterTooltipMix: true,
    },
    search: { api: true },
    filters: {
      facets: ["county", "wtype", "operator", "status", "play", "field"],
      productionRange: true,
      returnCap: 5_000,
    },
    table: { maxPage: 500, sort: true, summaryFull: true },
    insights: {
      summaryFields: "full",
      production: "full",
      customRange: true,
      wellbore: true,
      decline: true,
      cohorts: true,
      permitFull: true,
      permitBottomHole: true,
      permitNearestWell: true,
    },
    ai: { enabled: true, perDay: 30, perMinute: 5 },
    timeLapse: true,
    tools: {
      measureDistance: true,
      measureArea: true,
      drawArea: true,
      nearbyRadii: [1],
    },
    exports: {
      mapPng: true,
      tableCsvPerMonth: 100,
      viewCsvPerMonth: 100,
      areaCsvPerMonth: 100,
      nearbyCsvPerMonth: 0,
      pdfPerMonth: 50,
    },
    quota: { requestsPerDay: 50_000 },
  },

  pro: {
    tier: "pro",
    map: {
      basemaps: ["streets", "topo-vector", "satellite", "hybrid"],
      wellsCapPerExtent: 10_000,
      wellBores: true,
      wellTooltipFull: true,
      clusterTooltipMix: true,
    },
    search: { api: true },
    filters: {
      facets: ["county", "wtype", "operator", "status", "play", "field"],
      productionRange: true,
      returnCap: 25_000,
    },
    /* `null` IS UNLIMITED, and it is handled explicitly everywhere it is read.
       The spec's own warning: a `null` falling through a `page > maxPage`
       comparison evaluates false and works by accident, "which will break the
       day someone tidies the type". */
    table: { maxPage: null, sort: true, summaryFull: true },
    insights: {
      summaryFields: "full",
      production: "full",
      customRange: true,
      wellbore: true,
      decline: true,
      cohorts: true,
      permitFull: true,
      permitBottomHole: true,
      permitNearestWell: true,
    },
    ai: { enabled: true, perDay: 200, perMinute: 8 },
    timeLapse: true,
    tools: {
      measureDistance: true,
      measureArea: true,
      drawArea: true,
      nearbyRadii: [1, 3, 5],
    },
    exports: {
      /* Soft abuse ceilings, never shown in the UI — §3.10's footnote. Crossing
         one raises an internal alert and does not block the user. */
      mapPng: true,
      tableCsvPerMonth: 2_000,
      viewCsvPerMonth: 2_000,
      areaCsvPerMonth: 2_000,
      nearbyCsvPerMonth: 2_000,
      pdfPerMonth: 500,
    },
    quota: { requestsPerDay: 250_000 },
  },
};

/** A tier name off a URL, a cookie or a picker, floored to something real. */
export function toTier(value: string | null | undefined): Tier {
  return TIER_ORDER.includes(value as Tier) ? (value as Tier) : "ultra";
}

/**
 * The lowest tier whose entitlements satisfy `has`.
 *
 * What every lock chip and locked card calls to name its upgrade, so no
 * component restates "this is a Detailed feature" — a claim that would then
 * have to be kept in step with `TIERS` by hand.
 */
export function tierThatUnlocks(
  has: (e: Entitlements) => boolean,
): Tier | null {
  return TIER_ORDER.find((t) => has(TIERS[t])) ?? null;
}

/**
 * Where every lock sends the reader — one destination, §11.3.
 *
 * The current tier and the blocked feature ride along as query parameters so
 * the pricing page can attribute the click (§16, Appendix E.2).
 *
 * ⚠️ `/pricing` IS A HARD BLOCKER, §13.4: the route does not exist in this app,
 * so every one of these links is a 404 today. Written the spec's way regardless
 * — the page is a separate task and this is the address it has to answer on.
 */
export function upgradeHref(from: Tier, feature: string): string {
  const q = new URLSearchParams({ from, feature });
  return `/pricing?${q.toString()}#plans`;
}

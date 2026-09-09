/**
 * BRITISH SPELLINGS OUT OF THE OWNER PAYLOAD, on the way in.
 *
 * WHY THIS EXISTS. Most of the British spellings a reader can see in this
 * portal are not in this repo's code — they are in the DATA. `/api/portfolio`
 * answers with, among others, a kind card labeled "Neighbours", stat labels
 * reading "Neighbouring leases", `kind_label: "Neighbour"`, a data source named
 * "Permit & neighbour survey", and prose carrying "neighbourhood", "colour",
 * "labelled" and "favoured". Counted on one response: 43 × "Neighbouring",
 * 39 × "neighbours", 31 × "colour", 26 × "neighbour".
 *
 * Two sources feed that payload and NEITHER can be fixed by editing text in a
 * component: `owner-payload.json`, a 2 MB capture of the reference build's own
 * response, and four blocks read live from `mineralview-api`. Normalizing here
 * — at the one seam every route's payload passes through — covers both, and
 * leaves the capture and the service untouched.
 *
 * VALUES ONLY, NEVER KEYS. `neighbour_leases`, `neighbours_1mi` and
 * `neighbour_lease_count` are field names in the API contract; renaming them
 * would break every reader. The walk below rewrites string VALUES and copies
 * keys through verbatim, so that cannot happen by construction.
 *
 * AND NOT EVERY VALUE. A string value can be an identifier as easily as a
 * sentence — `kind: 'permit'` drives `KIND_ICON[e.kind]` and a rewritten one
 * would look up nothing. `SKIP` is a blacklist rather than a prose whitelist on
 * purpose: a whitelist silently misses any prose field added later, while a
 * blacklist's failure mode is a field this does not know about being left
 * alone. Verified against a live response before this was written — every one
 * of the 21 fields carrying a British spelling is prose (`label`, `body`,
 * `kind_label`, `evidence[]`, `paras[]`, `headline`, `means`, `why`, …) and not
 * one is an identifier.
 *
 * DELIBERATELY CONSERVATIVE. Only enumerated stems are rewritten. The tempting
 * general rules are the dangerous ones: `-ise → -ize` would maul "expertise",
 * "franchise" and "supervise"; a generic `-ll- → -l-` would turn "totally"
 * into "totaly"; and `analysis` is correct American English while `analyse` is
 * not, so only the verb forms are listed. A normalizer that guesses is worse
 * than one that misses — a missed word reads as a typo, a wrong one reads as
 * a broken product.
 *
 * THE FIXTURE IS NORMALIZED ONCE, at module load, because it is a module-level
 * constant and the walk is over 2 MB. Only the live blocks pay the cost per
 * request. See `owner-data.ts`.
 */

/**
 * Stem → American stem. Applied case-insensitively, with the match's own
 * capitalization carried over, so "Neighbouring" and "neighbouring" both land
 * correctly and an ALL-CAPS label stays shouting.
 *
 * Order matters only where one stem is a prefix of another; none here is.
 */
const STEMS: ReadonlyArray<readonly [string, string]> = [
  // The ones this payload actually contains.
  ["neighbour", "neighbor"], // neighbours, neighbouring, neighbourhood
  ["colour", "color"], // colours, coloured, colourful
  ["centre", "center"], // centres, centred
  ["labell", "label"], // labelled, labelling
  ["favour", "favor"], // favours, favoured, favourite
  ["behaviour", "behavior"],
  // Common enough elsewhere in this corpus to be worth covering.
  ["metre", "meter"], // metres, kilometre
  ["licence", "license"],
  ["defence", "defense"],
  ["offence", "offense"],
  ["programme", "program"],
  ["judgement", "judgment"],
  ["cancell", "cancel"], // cancelled, cancelling
  ["travell", "travel"],
  ["modell", "model"],
  ["fuell", "fuel"],
  ["signall", "signal"],
  ["whilst", "while"],
  ["amongst", "among"],
  // `-ise` verbs, enumerated. See the note above on why the general rule is not
  // used: "expertise" and "franchise" are correct and a blanket rule breaks them.
  ["organis", "organiz"],
  ["recognis", "recogniz"],
  ["apologis", "apologiz"],
  ["prioritis", "prioritiz"],
  ["summaris", "summariz"],
  ["optimis", "optimiz"],
  ["realis", "realiz"],
  ["utilis", "utiliz"],
  ["specialis", "specializ"],
  ["minimis", "minimiz"],
  ["maximis", "maximiz"],
  ["normalis", "normaliz"],
  ["customis", "customiz"],
  ["authoris", "authoriz"],
  // The VERB only. `analysis` is American English; `analyse` is not.
  ["analyse", "analyze"],
  ["analysed", "analyzed"],
  ["analysing", "analyzing"],
];

const PATTERN = new RegExp(
  `(${STEMS.map(([from]) => from).join("|")})`,
  "gi",
);

const REPLACEMENT = new Map(STEMS.map(([from, to]) => [from, to]));

/** Carries the matched text's capitalization onto its replacement. */
function matchCase(match: string, replacement: string): string {
  if (match === match.toUpperCase()) return replacement.toUpperCase();
  if (match[0] === match[0].toUpperCase()) {
    return replacement[0].toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

/** One string, Americanized. Exported for the walk and for tests. */
export function americanizeText(value: string): string {
  if (!PATTERN.test(value)) {
    PATTERN.lastIndex = 0;
    return value;
  }
  PATTERN.lastIndex = 0;
  return value.replace(PATTERN, (m) =>
    matchCase(m, REPLACEMENT.get(m.toLowerCase()) ?? m),
  );
}

/**
 * Keys whose string value is an IDENTIFIER, not prose, and must survive
 * untouched.
 *
 * `kind` and `type` drive icon and class lookups; `status` gates rendering;
 * `key`, `id`, `slug` and `code` address things; `href`, `url` and `src` are
 * addresses. Matched on the whole key and on a trailing `_`-segment, so
 * `lease_key` and `owner_id` are covered too.
 */
const SKIP =
  /^(kind|type|status|key|id|slug|code|href|url|src|icon|colour|color|tone|state|route|nav|cycle|iso)$|_(kind|type|status|key|id|slug|code|href|url|src|icon|iso)$/i;

/**
 * A payload with every prose string Americanized.
 *
 * Returns a NEW structure and never mutates its input — the fixture is a
 * module-level constant shared by every request, so mutating it in place would
 * be a cross-request side effect. Strings that need no change are returned as
 * the same reference, so unchanged subtrees cost only the walk.
 */
export function americanize<T>(value: T): T {
  return walk(value) as T;
}

function walk(value: unknown, key?: string): unknown {
  if (typeof value === "string") {
    return key && SKIP.test(key) ? value : americanizeText(value);
  }
  if (Array.isArray(value)) {
    // The key is carried INTO an array, so `evidence[]` and `paras[]` are
    // treated as their field is rather than as unnamed strings.
    return value.map((item) => walk(item, key));
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = walk(v, k);
    }
    return out;
  }
  return value;
}

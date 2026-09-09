/**
 * The not-claimed view.
 *
 * "Not claimed" means the person reading has not proved the interests are
 * theirs, so the page must not show the real figures. It still has to show the
 * whole product — an empty dashboard sells nothing — so this rewrites ONE live
 * payload into a sample of itself.
 *
 * THREE RULES, and the reasons they are these rules:
 *
 * 1. DATES STAY REAL. Every date on the sample page comes from the live
 *    snapshot. A build shipped today would otherwise still say "May 2026" nine
 *    months from now, and a demo dated in the past reads as a broken product
 *    rather than a sample. Freshness is the one thing worth showing truthfully,
 *    and it is not the owner's private information.
 *
 * 2. FIGURES ARE SCALED, NOT INVENTED. Every money and volume figure is
 *    multiplied by one factor drawn from a seeded generator. Scaling — rather
 *    than replacing each number independently — is what keeps the page
 *    internally consistent: the lease rows still add to the total, the
 *    month-over-month percentages still match the bars, and the value range
 *    still brackets the estimate. Independent random numbers break all three
 *    and it shows immediately.
 *
 * 3. IDENTITY IS REPLACED, NOT SCALED. Names, owner numbers and operators are
 *    substituted. Counties are kept, because the activity feed and the county
 *    figures are public record either way and stripping them leaves the
 *    neighbouring-activity panel meaningless.
 *
 * Prose is handled differently from figures: a sentence like "your share is
 * 8,776 mcf" cannot be scaled without rewriting the sentence, so in sample mode
 * narrative numbers are MASKED (`scrub`) rather than scaled. A masked number is
 * obviously withheld; a wrong one would look like a fact.
 */
import type { Payload } from './payload';

/* A seeded generator, so the same owner always produces the same sample. An
   unstable sample looks like a bug — figures that change on every refresh. */
function seeded(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

function seedOf(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Mask every number in a sentence. Withheld reads as withheld; a scaled number
 * inside prose would read as a fact.
 *
 * The money pattern's magnitude suffix is `(?:\s?(?:million|…))?` — the space
 * is INSIDE the optional group. Written the other way round, as `\s?(…)?`, the
 * optional space is consumed and the empty suffix matches, so "$4,548,479 today"
 * came out as "$•••today" with the space eaten. `\b` after the suffix keeps
 * "$4 mcf" from having its "m" swallowed as an abbreviated million.
 */
export function scrub(text: string | null | undefined): string {
  return String(text ?? '')
    .replace(/\$\s?[\d,]+(?:\.\d+)?(?:\s?(?:million|billion|[MBk])\b)?/gi, '$•••')
    .replace(/-?\b\d[\d,]*(\.\d+)?\s?%/g, '•••%')
    .replace(/-?\b\d[\d,]*(\.\d+)?\b/g, '•••');
}

const LEASE_NAMES = [
  'BLUESTEM RANCH', 'CADDO CREEK', 'ELM HOLLOW', 'FALLOW FIELD', 'GRAYSON DRAW',
  'HALE PASTURE', 'INDIAN MOUND', 'JUNIPER FLAT', 'KIOWA SPRING', 'LONE MESQUITE',
  'MORRISON TRACT', 'NORTH FORK', 'OAK BRANCH', 'PECAN BEND', 'QUAIL RUN',
  'RED BLUFF', 'SANDY POINT', 'TWIN WELLS', 'UPPER PRAIRIE', 'VERBENA',
];
const OPERATOR_NAMES = [
  'ALTON BASIN OPERATING, LLC', 'BRAZOS RIDGE ENERGY, LP', 'CORDELL RESOURCES CO',
  'DELMAR PETROLEUM, INC', 'EASTGATE PRODUCTION LLC', 'FAIRLANE OIL & GAS',
  'GRANITE HOLLOW ENERGY', 'HALSTEAD OPERATING CO',
];

/** a person-shaped placeholder, never a real roll name */
const SAMPLE_OWNER = 'Sample Owner';

/**
 * Fold a company name to ONE identity.
 *
 * Case and punctuation removed, which is the same fold the activity feed uses
 * to stop one company ranking twice. Exported so the check on it tests the
 * function the transform actually calls.
 */
export function foldOp(v: string): string {
  return v.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export interface SampleResult { payload: Payload; factor: number; note: string }

/**
 * Rewrite a live payload as a sample of itself.
 *
 * Structure-preserving on purpose: every component renders the sample through
 * exactly the same code path as the real thing, so the not-claimed view cannot
 * drift away from the claimed one as either changes.
 */
export function sampleize(real: Payload): SampleResult {
  const rnd = seeded(seedOf(real.owner.ownername + ':' + real.owner.roll_year));
  /* one factor for the whole portfolio — see rule 2 */
  const f = 0.55 + rnd() * 1.15;
  const nm = (i: number) => LEASE_NAMES[i % LEASE_NAMES.length];
  const op = (i: number) => OPERATOR_NAMES[i % OPERATOR_NAMES.length];

  const s = (v: number | null | undefined): number =>
    typeof v === 'number' && Number.isFinite(v) ? Math.round(v * f * 100) / 100 : 0;

  /* Name maps, built once so every surface substitutes the same way — a lease
     called ELM HOLLOW in the table must be ELM HOLLOW in the alert, the drawer
     and the activity feed too. */
  const leaseName = new Map<string, string>();
  const opName = new Map<string, string>();
  real.leases.forEach((l, i) => {
    leaseName.set(l.lease_id, nm(i));
    if (l.lease_name) leaseName.set(l.lease_name, nm(i));
    /* THE FIRST WORD TOO, because not every surface uses the whole name.
       MEASURED LEAK: a per-well drawer titles itself "MCCABE · well 1R" — the
       lease name cut at its first space — and `names()` replaces exact keys,
       so the full "MCCABE ETAL GU" never matched and the fragment survived on
       the not-claimed page. Registered only when the fragment is long enough
       to be a name and is not the whole name already; the match is
       case-sensitive, so an ordinary lower-case word cannot collide with it. */
    const head = l.lease_name?.split(/\s+/)[0];
    if (head && head.length > 3 && head !== l.lease_name && !leaseName.has(head)) {
      leaseName.set(head, nm(i));
    }
  });
  /* A SAMPLE ID FOR A REAL LEASE ID — see `names()`.
     Lettered, not numbered: `scrub()` masks every digit in a sentence, so
     "SMPL-3" rendered as "SMPL•••". A letter is not a figure, so it survives
     and the reader gets a legible reference. */
  const leaseRef = new Map<string, string>();
  real.leases.forEach((l, i) =>
    leaseRef.set(l.lease_id, 'SMPL-' + String.fromCharCode(65 + (i % 26))));

  let opi = 0;

  /**
   * ONE COMPANY IS ONE SAMPLE NAME, however the record spells it.
   *
   * MEASURED LEAK. `opName` was keyed on the exact string, and this record
   * spells one company two ways: the operator roll says "HURD ENTERPRISES,
   * LTD." and the production store says "Hurd Enterprises, Ltd". So the
   * uppercase spelling was substituted, the title-case spelling was
   * registered as a SECOND company with a different sample name, and the
   * title-case one survived in prose because `names()` replaces exact keys
   * and had never seen it. The live leak check caught it in the depth block
   * on page 2, which quotes the largest operator by name.
   *
   * `opFold` therefore keys on a folded form — case and punctuation removed,
   * which is the same fold the activity feed uses to stop one company ranking
   * twice — and `opSpellings` remembers every real spelling seen so `names()`
   * can replace all of them in a sentence.
   */
  const opFold = new Map<string, string>();
  /** every real spelling encountered, longest first so a prefix cannot win */
  const opSpellings: [string, string][] = [];

  const registerOp = (raw: string): string => {
    const k = foldOp(raw);
    let to = opFold.get(k);
    if (!to) {
      to = op(opi++);
      opFold.set(k, to);
    }
    if (!opName.has(raw)) {
      opName.set(raw, to);
      opSpellings.push([raw, to]);
      opSpellings.sort((x, y) => y[0].length - x[0].length);
    }
    return to;
  };

  /* seed from every place a company name appears, so the FIRST spelling seen
     does not decide which sample name the others get */
  for (const o of real.operators.operators) registerOp(o.operator_name);
  for (const l of real.leases) {
    if (l.operator_name) registerOp(l.operator_name);
    if (l.completion_operator) registerOp(l.completion_operator);
  }
  for (const h of real.operators.handovers) {
    if (h.from_operator) registerOp(h.from_operator);
    if (h.to_operator) registerOp(h.to_operator);
  }

  /**
   * Substitute an operator name.
   *
   * THE LENGTH GUARD IS LOAD-BEARING. This is handed stat values as well as
   * real operator names, and a stat value can be the em-dash placeholder for
   * "not recorded". Registering that put the key "—" into `opName`, and
   * `prose()` — which replaces every map key it finds in a sentence — then
   * rewrote every em dash on the page as an operator name: "KIOWA SPRING
   * ALTON BASIN OPERATING, LLC New Production". Anything too short to be a
   * company name is passed through untouched.
   */
  const subOp = (v: string | null): string | null => {
    if (!v) return v;
    if (v.trim().length < 4) return v;
    return registerOp(v);
  };
  const subLease = (v: string | null): string | null =>
    v ? (leaseName.get(v) ?? nm(seedOf(v) % LEASE_NAMES.length)) : v;

  /**
   * Is this one of the OWNER'S OWN operators, under any spelling?
   *
   * MEASURED LEAK, caught by scripts/leakcheck against the live payload. The
   * ring panel lists the leases inside one, three and five miles, and those are
   * other people's leases — public record, correctly left as filed. But two of
   * them are operated by HURD ENTERPRISES and KALER ENERGY, which are two of
   * THIS owner's own operators. Left as filed, the not-claimed page named her
   * operators next door while calling them something else on her own rows.
   *
   * The comparison is folded because one company is spelled several ways in
   * this record: "HURD ENTERPRISES, LTD." on a neighbouring lease and
   * "HURD ENTERPRISES  LTD." on a well of her own are the same operator, and an
   * exact-string check misses the second. Folding for COMPARISON also means
   * every spelling maps to ONE sample name, rather than the variants each
   * getting a different company.
   */
  const subIfOwnOp = (v: string | null): string | null => {
    if (!v) return v;
    /* only a company THIS owner's record names is substituted; a neighbour's
       operator is public record and stays as filed */
    return opFold.get(foldOp(v)) ?? v;
  };

  /**
   * A PUBLIC ROW KEEPS ITS FIGURES AND LOSES HER IDENTITY.
   *
   * MEASURED LEAK, second half. The timeline now carries permit and completion
   * rows read from the well map, each with a measured distance. They sit on
   * other people's leases, so they are public record and correctly left as
   * filed — but two of them are operated by HURD ENTERPRISES and KALER ENERGY,
   * two of this owner's own operators, and the old rule only substituted rows
   * flagged as hers. So the not-claimed page named her operators on the rows
   * next door while calling them something else on her own.
   *
   * Unlike her own rows, nothing here is masked: a distance, a date and a
   * neighbour's volume are facts about the public record rather than about the
   * reader, and masking them would empty the panel that the mile buttons exist
   * to fill.
   */
  const publicRow = <T extends {
    operator_name: string | null; lease_name: string | null; title: string;
    stats: { value: string; sub?: string }[];
  }>(e: T): T => {
    const op = subIfOwnOp(e.operator_name);
    const ownName = e.lease_name != null && leaseName.has(e.lease_name);
    const stats = e.stats.map((st) => {
      const v = subIfOwnOp(st.value);
      return v === st.value ? st : { ...st, value: v as string };
    });
    const touched = op !== e.operator_name || ownName
      || stats.some((x, i) => x !== e.stats[i]);
    if (!touched) return e;
    const lease = ownName ? subLease(e.lease_name) : e.lease_name;
    return {
      ...e,
      operator_name: op,
      lease_name: lease,
      /* the title is built from the lease name, so it has to move with it */
      title: ownName && e.lease_name && lease
        ? e.title.split(e.lease_name).join(lease) : e.title,
      stats,
    };
  };

  /** one stat row: a figure is masked, a name inside a value is substituted */
  const sampleStat = <T extends { value: string; sub?: string }>(st: T): T => ({
    ...st,
    value: /^[\d$.,+-]/.test(st.value) ? scrub(st.value) : (subOp(st.value) ?? st.value),
    sub: st.sub ? scrub(st.sub) : st.sub,
  });

  /**
   * Replace her names inside a sentence, and NOTHING else.
   *
   * Split out of `prose` because a PUBLIC sentence — an operator's own investor
   * update, a county filing count — must lose her identity without losing its
   * figures. Masking those numbers does not make the sample safer, it only
   * makes it emptier: they are facts about the public record.
   */
  const names = (text: string | null | undefined): string => {
    let out = String(text ?? '');
    /* LEASE IDS FIRST, and as an id rather than as a name.
       `leaseName` is keyed by id AS WELL AS by name, so a title that
       disambiguates two same-named leases with their ids — "MCCABE ETAL GU
       (02_290271)", which the timeline builds because this owner holds three
       leases of that name — came out as "KIOWA SPRING (BLUESTEM RANCH)": a
       sample lease name nested inside another one. An id has to become an id. */
    for (const [from, to] of leaseRef) {
      out = out.split(from).join(to);
    }
    for (const [from, to] of leaseName) {
      if (from.length > 3) out = out.split(from).join(to);
    }
    /* THE SPELLING LIST, LONGEST FIRST, not the map.
       Two spellings of one company both have to go, and the longer has to go
       first: replacing "HURD ENTERPRISES" before "HURD ENTERPRISES, LTD."
       would leave the suffix stranded on the sample name. The same length
       floor as the lease map above applies — a two-character key would match
       inside ordinary words and punctuation. */
    for (const [from, to] of opSpellings) {
      if (from.length > 3) out = out.split(from).join(to);
    }
    out = out.split(real.owner.ownername).join(SAMPLE_OWNER);
    if (real.owner.first_name) out = out.split(real.owner.first_name).join('there');
    return out;
  };

  /** replace known names inside a sentence, then mask the numbers */
  const prose = (text: string | null | undefined): string => scrub(names(text));

  const t = real.totals;
  const payload: Payload = {
    ...real,

    /* ------------------------------------------------------------- identity */
    owner: {
      ...real.owner,
      ownername: SAMPLE_OWNER,
      first_name: 'there',
      initials: 'SO',
      ownernumber: 'SAMPLE',
      city: null,
      identity_note:
        'This is the sample view. No interests are claimed on this account, so every figure ' +
        'below is illustrative — the dates are real, the amounts are not.',
      other_identities: [],
      collapse_note: 'Not applicable in the sample view.',
    },

    /* dates untouched — rule 1 */
    as_of: real.as_of,

    /* --------------------------------------------------------------- totals */
    totals: {
      ...t,
      owner_value: s(t.owner_value),
      owner_value_low: s(t.owner_value_low),
      owner_value_high: s(t.owner_value_high),
      gross_value: s(t.gross_value),
      appraised_value: s(t.appraised_value),
      anchor_gas_net: s(t.anchor_gas_net), anchor_oil_net: s(t.anchor_oil_net),
      anchor_boe_net: s(t.anchor_boe_net),
      prev_gas_net: s(t.prev_gas_net), prev_oil_net: s(t.prev_oil_net),
      prev_boe_net: s(t.prev_boe_net),
      ttm_gas_net: s(t.ttm_gas_net), ttm_oil_net: s(t.ttm_oil_net),
      life_gas_gross: s(t.life_gas_gross), life_oil_gross: s(t.life_oil_gross),
      reserves_gas_net: s(t.reserves_gas_net), reserves_oil_net: s(t.reserves_oil_net),
      acres: s(t.acres),
      /* percentages are NOT scaled — one factor across the whole portfolio
         cancels out of a ratio, so they are already the sample's own true
         change, and rescaling them would break the bars they label */
      operator_names: t.operator_names.map((o) => subOp(o) ?? o),
      behind_leases: t.behind_leases.map((b) => ({ ...b, lease_name: subLease(b.lease_name) })),
    },

    /* --------------------------------------------------------------- leases */
    leases: real.leases.map((l) => ({
      ...l,
      lease_name: leaseName.get(l.lease_id) ?? l.lease_name,
      lease_name_roll: leaseName.get(l.lease_id) ?? l.lease_name_roll,
      lease_number: l.lease_number ? 'SAMPLE' : l.lease_number,
      operator_name: subOp(l.operator_name),
      completion_operator: subOp(l.completion_operator),
      appraised_value: s(l.appraised_value),
      gross_value: s(l.gross_value),
      owner_value: s(l.owner_value),
      owner_value_low: s(l.owner_value_low),
      owner_value_high: s(l.owner_value_high),
      anchor_gas: s(l.anchor_gas), anchor_oil: s(l.anchor_oil),
      anchor_gas_net: s(l.anchor_gas_net), anchor_oil_net: s(l.anchor_oil_net),
      anchor_boe: s(l.anchor_boe), anchor_boe_net: s(l.anchor_boe_net),
      prev_gas: s(l.prev_gas), prev_oil: s(l.prev_oil), prev_boe: s(l.prev_boe),
      ttm_gas_net: s(l.ttm_gas_net), ttm_oil_net: s(l.ttm_oil_net),
      total_gas: s(l.total_gas), total_oil: s(l.total_oil), total_boe: s(l.total_boe),
      reserves_gas_net: s(l.reserves_gas_net), reserves_oil_net: s(l.reserves_oil_net),
      reserves_boe_net: s(l.reserves_boe_net),
      wells: l.wells.map((w) => ({ ...w, well_number: 'S-' + (w.well_number ?? '1') })),
      tenures: l.tenures.map((tn) => ({ ...tn, operator_name: subOp(tn.operator_name) })),
      monthly: l.monthly.map((m) => ({
        ...m, gas: s(m.gas), oil: s(m.oil), gas_net: s(m.gas_net), oil_net: s(m.oil_net),
        boe: s(m.boe), boe_net: s(m.boe_net),
      })),
    })),

    /* ------------------------------------------------------------ operators */
    operators: {
      ...real.operators,
      operators: real.operators.operators.map((o) => ({
        ...o,
        operator_name: subOp(o.operator_name)!,
        operator_no: 'SAMPLE',
        lease_names: o.lease_names.map((n) => subLease(n) ?? n),
        owner_share_value: s(o.owner_share_value),
        last_month_gas_net: s(o.last_month_gas_net),
        last_month_oil_net: s(o.last_month_oil_net),
      })),
      handovers: real.operators.handovers.map((h) => ({
        ...h,
        from_operator: subOp(h.from_operator),
        to_operator: subOp(h.to_operator),
      })),
      /* the else branch returns the ORIGINAL null rather than a fresh literal,
         so this keeps whatever type the snapshot declared instead of widening */
      latest_handover: real.operators.latest_handover
        ? { ...real.operators.latest_handover,
            from_operator: subOp(real.operators.latest_handover.from_operator),
            to_operator: subOp(real.operators.latest_handover.to_operator) }
        : real.operators.latest_handover,
    },

    reserves: {
      ...real.reserves,
      reserves_boe: s(real.reserves.reserves_boe),
      reserves_gas: s(real.reserves.reserves_gas),
      reserves_oil: s(real.reserves.reserves_oil),
      eur_gas: s(real.reserves.eur_gas), eur_oil: s(real.reserves.eur_oil),
      produced_boe: s(real.reserves.produced_boe),
      probability_best: real.reserves.probability_best
        ? { ...real.reserves.probability_best,
            lease_name: subLease(real.reserves.probability_best.lease_name) ?? '' }
        : null,
    },

    series: {
      ...real.series,
      months: real.series.months.map((m) => ({
        ...m, gas_net: s(m.gas_net), oil_net: s(m.oil_net), boe_net: s(m.boe_net),
      })),
      peak_gas_net: s(real.series.peak_gas_net),
      peak_oil_net: s(real.series.peak_oil_net),
    },

    /* --------------------------------------------------------------- alerts */
    alerts: {
      ...real.alerts,
      items: real.alerts.items.map((a) => ({
        ...a,
        title: prose(a.title),
        body: prose(a.body),
        why: prose(a.why),
        lead_lease: subLease(a.lead_lease),
        evidence: a.evidence.map(prose),
        metric: null,
      })),
      notes: real.alerts.notes.map(prose),
    },

    /* ----------------------------------------------------------- activities */
    /* The neighbouring activity is PUBLIC RECORD — permits and completions on
       other people's leases. It is not the reader's private information and it
       is the whole point of the panel, so it stays as filed. Only the rows
       flagged as the owner's own are substituted. */
    /* MEASURED LEAK, third instance. The county rows are public record and stay
       as filed — but the "who is drilling here" ranking is built from the same
       county feed, and three of the companies at the top of it are HER OWN
       operators. Left as filed, the not-claimed page named them in the bar
       chart while calling them something else two panels above. Every list
       here therefore passes its operator through `subIfOwnOp`, which touches
       only the companies her own record names and leaves the rest alone. */
    activities: {
      ...real.activities,
      kpis_mine: real.activities.kpis_mine.map((k) => ({
        ...k, value: scrub(k.value), sub: scrub(k.sub),
      })),
      kpis_nearby: real.activities.kpis_nearby.map((k) => ({
        ...k, value: names(k.value), sub: names(k.sub),
      })),
      mine: real.activities.mine.map((i) => ({
        ...i, lease_name: subLease(i.lease_name), lease_number: 'SAMPLE',
        operator_name: subOp(i.operator_name),
      })),
      nearby: real.activities.nearby.map((i) => ({
        ...i, operator_name: subIfOwnOp(i.operator_name),
      })),
      news: real.activities.news.map((i) => ({
        ...i, operator_name: subIfOwnOp(i.operator_name),
        title: i.title == null ? i.title : names(i.title),
        summary: i.summary == null ? i.summary : names(i.summary),
      })),
      production: real.activities.production.map((e) => ({
        ...e, lease_name: subLease(e.lease_name), operator_name: subOp(e.operator_name),
        gas: s(e.gas), oil: s(e.oil), gas_net: s(e.gas_net), oil_net: s(e.oil_net),
      })),
      /* the ranking the Activities route draws as a bar per company */
      operators: real.activities.operators.map((o) => ({
        ...o, operator_name: subIfOwnOp(o.operator_name) ?? o.operator_name,
      })),
      /* a field name is public geography and is not an identity, so it stays */
      mine_empty_reason: real.activities.mine_empty_reason
        ? scrub(real.activities.mine_empty_reason) : null,
      news_empty_reason: real.activities.news_empty_reason
        ? prose(real.activities.news_empty_reason) : null,
    },

    /* ------------------------------------------------------- nearby + rings
       THE SAME RULE AS THE ACTIVITY FEED, applied to the two sources behind the
       mile buttons. A well, permit or completion on somebody else's lease is
       public record and the whole point of a distance panel, so it stays as
       filed — including its measured distance, which is a fact about the map
       and not about the reader. What DOES get substituted is any row the
       record places on a lease this owner holds: `is_own` rows in the nearby
       read carry her real lease names.

       `rings[*].neighbours` needs no substitution by construction: the radius
       source excludes the owner's own leases from a neighbour list (they are
       `foreign_neighbours`), so a neighbour is by definition not hers. The
       VOLUMES there are other people's whole-lease production and are never
       netted to her, so they are not scaled either — scaling them would make
       the sample claim the neighbourhood produced less than it did. */
    nearby: {
      ...real.nearby,
      rows: real.nearby.rows.map((r) => {
        const opSub = subIfOwnOp(r.operator_name);
        if (!r.is_own && opSub === r.operator_name) return r;
        return {
          ...r,
          lease_name: r.is_own ? subLease(r.lease_name) : r.lease_name,
          operator_name: opSub,
        };
      }),
    },
    rings: {
      ...real.rings,
      rings: Object.fromEntries(Object.entries(real.rings.rings).map(([k, ring]) => [k, {
        ...ring,
        neighbours: ring.neighbours.map((n) => {
          /* a neighbour is by construction not one of her leases, but it can
             still carry her identity two ways: a lease that happens to share a
             name with one of hers, and an operator that is one of hers */
          const ownLease = leaseName.has(n.lease_id)
            || (n.lease_name != null && leaseName.has(n.lease_name));
          const opSub = subIfOwnOp(n.operator_name);
          if (!ownLease && opSub === n.operator_name) return n;
          return {
            ...n,
            lease_name: ownLease ? subLease(n.lease_name) : n.lease_name,
            operator_name: opSub,
          };
        }),
      }])) as typeof real.rings.rings,
    },

    /* ------------------------------------------------------ weekly report
       THE WHOLE REPORT IS THE OWNER'S OWN, so unlike the county feed nothing
       in it is public: it is her leases, her operators, her share and her
       name, written out in prose. `prose()` therefore runs over every
       sentence — substituting the names it knows and masking every figure —
       and the stats and table cells go through the same masker the timeline
       rows use. The DATES stay real, per rule 1: a sample dated in the past
       reads as a broken product rather than as a sample. */
    weekly: {
      ...real.weekly,
      owner_name: SAMPLE_OWNER,
      owner_first: 'there',
      owner_record: `${SAMPLE_OWNER} (sample record) · roll year ${real.owner.roll_year}`,
      headline: prose(real.weekly.headline),
      bottom_line: prose(real.weekly.bottom_line),
      answers: real.weekly.answers.map((x) => ({
        ...x, short: prose(x.short), body: prose(x.body),
      })),
      exec: real.weekly.exec.map((x) => ({ ...x, text: prose(x.text) })),
      /* the two ranked bar charts. The bars carry a LEASE NAME and its
         operator in the label and the sub, so they leaked the moment they were
         added — the live leak check caught exactly that, which is the reason
         it runs against the real payload rather than a fixture. */
      volume_bars: real.weekly.volume_bars.map((b) => ({
        ...b,
        label: prose(b.label),
        sub: b.sub ? prose(b.sub) : b.sub,
        display: scrub(b.display),
        /* the BAR LENGTH is scaled, not masked: it is a shape rather than a
           figure, and a sample with no bars is a page with nothing on it */
        value: s(b.value),
      })),
      value_bars: real.weekly.value_bars.map((b) => ({
        ...b,
        label: prose(b.label),
        sub: b.sub ? prose(b.sub) : b.sub,
        display: scrub(b.display),
        value: s(b.value),
      })),
      explains: real.weekly.explains.map((x) => ({
        ...x, summary: prose(x.summary), paras: x.paras.map(prose),
      })),
      /* the depth block names her two biggest leases and her largest operator
         by name, which is exactly the kind of thing the live leak check exists
         to catch — it did, twice before this */
      /* `sampleStat` masks a figure and substitutes a name that IS the whole
         value; these subs are sentences carrying both, so they go through
         `prose` — which substitutes the names and then masks the numbers */
      insights: real.weekly.insights.map((st) => ({
        ...st,
        value: /^[\d$.,+-]/.test(st.value) ? scrub(st.value) : prose(st.value),
        sub: st.sub ? prose(st.sub) : st.sub,
      })),
      depth: real.weekly.depth.map(prose),
      /* THE MONTHLY KEEPER SHARES PAGE 2'S TABLE, so it carries the same real
         lease names — the live leak check found it the moment the section was
         added, which is the second time that has happened and the reason the
         check exists. */
      monthly: real.weekly.monthly
        ? {
          ...real.weekly.monthly,
          find: prose(real.weekly.monthly.find),
          note: prose(real.weekly.monthly.note),
          stats: real.weekly.monthly.stats.map(sampleStat),
          table: {
            ...real.weekly.monthly.table,
            rows: real.weekly.monthly.table.rows.map((row) => ({
              ...row, cells: row.cells.map(prose),
            })),
            note: real.weekly.monthly.table.note
              ? prose(real.weekly.monthly.table.note) : undefined,
          },
        }
        : null,
      calendar: real.weekly.calendar.map((c) => ({
        ...c, what: prose(c.what), detail: prose(c.detail),
      })),
      drivers: real.weekly.drivers.map((d) => ({
        ...d, headline: prose(d.headline), text: prose(d.text),
      })),
      /* the archive lines are county counts, not identities — but they are
         still this owner's weeks, so they go through the same masker */
      archive: real.weekly.archive.map((x) => ({ ...x, line: prose(x.line) })),
      estimate: {
        ...real.weekly.estimate,
        low: scrub(real.weekly.estimate.low),
        high: scrub(real.weekly.estimate.high),
        mid: scrub(real.weekly.estimate.mid),
        quarter_low: scrub(real.weekly.estimate.quarter_low),
        quarter_high: scrub(real.weekly.estimate.quarter_high),
        six_year: scrub(real.weekly.estimate.six_year),
        basis: prose(real.weekly.estimate.basis),
        why_range: real.weekly.estimate.why_range.map(prose),
        narrower: prose(real.weekly.estimate.narrower),
      },
      quiet_week_note: prose(real.weekly.quiet_week_note),
      pages: real.weekly.pages.map((pg) => ({
        ...pg,
        lead: prose(pg.lead),
        paras: pg.paras.map(prose),
        note: pg.note ? prose(pg.note) : pg.note,
        stats: pg.stats.map(sampleStat),
        tables: pg.tables.map((tb) => ({
          ...tb,
          rows: tb.rows.map((r) => ({
            ...r,
            /* a cell is either a name or a figure; `prose` handles both, and
               masks the figure rather than scaling it — a scaled number inside
               a sentence would read as a fact */
            cells: r.cells.map(prose),
          })),
          empty: tb.empty ? prose(tb.empty) : tb.empty,
          note: tb.note ? prose(tb.note) : tb.note,
        })),
      })),
      watch: {
        items: real.weekly.watch.items.map(prose),
        table: {
          ...real.weekly.watch.table,
          rows: real.weekly.watch.table.rows.map((r) => ({
            ...r, cells: r.cells.map(prose),
          })),
        },
      },
      /* the price settlements are public record and stay exactly as they are —
         masking them would empty the page they exist to fill */
      sources: real.weekly.sources.map((x) => ({ ...x, detail: prose(x.detail) })),
      events: real.weekly.events.map((e) => (e.is_mine
        ? { ...e, title: prose(e.title), lease_name: subLease(e.lease_name),
          operator_name: subOp(e.operator_name), stats: e.stats.map(sampleStat) }
        : publicRow(e))),
    },

    /* ------------------------------------------------- production & forecast
       WHAT LEAKS OUT OF THIS SECTION IF IT IS NOT HANDLED, in the order the
       live leak check finds it:

         · `leases[].label`, which is a lease name plus its id;
         · `leases[].operator_name`, `county`, `field_name`, `lease_number`;
         · `insights` — two of the six quote a lease BY LABEL, and one quotes
           the steepest and the gentlest curve by label as well;
         · `paras` and the two disposition sentences, which carry counts and
           county names inside prose.

       THE NUMERIC SERIES IS SCALED, NOT MASKED. `months[]` is what the chart
       draws, and a masked series is an empty chart — the not-claimed page
       would show the shape of the product with no shape in it. Every figure
       that appears as TEXT is masked instead, so no reader can recover a
       volume from the picture.

       THE DECIMAL INTEREST IS NEITHER SCALED NOR MASKED, IT IS REPLACED. An
       interest is an identity in this record: it is the one number that, with
       a county, finds the owner on a public roll. Scaling it by the portfolio
       factor would leave a number that still reads as this owner's, so it
       becomes a fixed sample interest and the label says so. */
    forecast: (() => {
      const SAMPLE_INTEREST = 0.0125;
      const num = (v: number | null): number | null => (v == null ? null : s(v));
      const mon = <T extends {
        gas_gross: number; gas_net: number; oil_gross: number; oil_net: number;
        gas_share: number; oil_share: number; value_share: number;
        value_share_low: number; value_share_high: number; removed: number | null;
      }>(m: T): T => ({
        ...m,
        gas_gross: s(m.gas_gross), gas_net: s(m.gas_net),
        oil_gross: s(m.oil_gross), oil_net: s(m.oil_net),
        gas_share: s(m.gas_share), oil_share: s(m.oil_share),
        value_share: s(m.value_share),
        value_share_low: s(m.value_share_low), value_share_high: s(m.value_share_high),
        removed: num(m.removed),
      });
      const rf = real.forecast;
      const rt = rf.totals;
      return {
        ...rf,
        boundary: {
          ...rf.boundary,
          note: prose(rf.boundary.note),
          blind_note: prose(rf.boundary.blind_note),
        },
        months: rf.months.map(mon),
        leases: rf.leases.map((l, i) => ({
          ...l,
          label: leaseName.get(l.lease_id) ?? nm(i),
          lease_name: leaseName.get(l.lease_id) ?? nm(i),
          lease_number: leaseRef.get(l.lease_id) ?? 'SMPL',
          county: 'Sample',
          operator_name: subOp(l.operator_name),
          field_name: l.field_name ? 'SAMPLE FIELD' : null,
          interest: SAMPLE_INTEREST,
          interest_label: '0.01250 · 1.2500% (sample)',
          gas_to_date: s(l.gas_to_date),
          oil_to_date: s(l.oil_to_date),
          gas_to_date_share: s(l.gas_to_date_share),
          oil_to_date_share: s(l.oil_to_date_share),
          last_gas: s(l.last_gas),
          last_gas_net: s(l.last_gas_net),
          last_oil: s(l.last_oil),
          last_gas_share: s(l.last_gas_share),
          last_oil_share: s(l.last_oil_share),
          rate_gas: num(l.rate_gas),
          rate_gas_net: num(l.rate_gas_net),
          rate_oil: num(l.rate_oil),
          rate_gas_share: num(l.rate_gas_share),
          rate_oil_share: num(l.rate_oil_share),
          year_gas: num(l.year_gas),
          year_oil: num(l.year_oil),
          year_gas_share: num(l.year_gas_share),
          year_oil_share: num(l.year_oil_share),
          year_value_share: num(l.year_value_share),
          reserves_gas: num(l.reserves_gas),
          reserves_oil: num(l.reserves_oil),
          reserves_gas_share: num(l.reserves_gas_share),
          reserves_oil_share: num(l.reserves_oil_share),
          eur_gas: num(l.eur_gas),
          eur_oil: num(l.eur_oil),
          reserves_gas_model: num(l.reserves_gas_model),
          eur_gas_model: num(l.eur_gas_model),
          eur_oil_model: num(l.eur_oil_model),
          next_month_low: num(l.next_month_low),
          next_month_high: num(l.next_month_high),
          next_month_mid: num(l.next_month_mid),
          quarter_low: num(l.quarter_low),
          quarter_high: num(l.quarter_high),
          quarter_mid: num(l.quarter_mid),
          six_year: s(l.six_year),
          removed_total: num(l.removed_total),
          months: l.months.map(mon),
          /* the life share is a share, not a volume: scaling it would put a bar
             at a different length from the percentage printed beside it */
          note: l.note ? prose(l.note) : l.note,
        })),
        totals: {
          ...rt,
          gas_to_date: s(rt.gas_to_date),
          oil_to_date: s(rt.oil_to_date),
          gas_to_date_share: s(rt.gas_to_date_share),
          oil_to_date_share: s(rt.oil_to_date_share),
          last_gas: s(rt.last_gas),
          last_oil: s(rt.last_oil),
          rate_gas: s(rt.rate_gas),
          rate_oil: s(rt.rate_oil),
          year_gas: s(rt.year_gas),
          year_oil: s(rt.year_oil),
          year_gas_share: s(rt.year_gas_share),
          year_oil_share: s(rt.year_oil_share),
          reserves_gas: s(rt.reserves_gas),
          reserves_oil: s(rt.reserves_oil),
          reserves_gas_share: s(rt.reserves_gas_share),
          reserves_oil_share: s(rt.reserves_oil_share),
          eur_gas: s(rt.eur_gas),
          eur_oil: s(rt.eur_oil),
          next_month_low: s(rt.next_month_low),
          next_month_high: s(rt.next_month_high),
          next_month_mid: s(rt.next_month_mid),
          quarter_low: s(rt.quarter_low),
          quarter_high: s(rt.quarter_high),
          quarter_mid: s(rt.quarter_mid),
          six_year: s(rt.six_year),
        },
        cards: rf.cards.map((c) => ({ ...c, value: scrub(c.value), sub: prose(c.sub) })),
        disposition: {
          ...rf.disposition,
          accounted: s(rf.disposition.accounted),
          removed: s(rf.disposition.removed),
          net: s(rf.disposition.net),
          oil_sold: s(rf.disposition.oil_sold),
          oil_total: s(rf.disposition.oil_total),
          routes: rf.disposition.routes.map((r) => ({
            ...r, volume: s(r.volume), removed: s(r.removed),
          })),
          months: rf.disposition.months.map((m) => ({
            ...m, accounted: s(m.accounted), removed: s(m.removed),
          })),
          note: prose(rf.disposition.note),
          why: prose(rf.disposition.why),
        },
        insights: rf.insights.map((st) => ({
          ...st,
          value: /^[\d$.,+-]/.test(st.value) ? scrub(st.value) : prose(st.value),
          sub: st.sub ? prose(st.sub) : st.sub,
        })),
        stats: rf.stats.map((st) => ({
          ...st,
          value: /^[\d$.,+-]/.test(st.value) ? scrub(st.value) : prose(st.value),
          sub: st.sub ? prose(st.sub) : st.sub,
        })),
        /* the year columns are a SHAPE as well as a figure, so the money is
           scaled rather than masked — a masked column has no height and the
           chart becomes an empty frame */
        annual: rf.annual.map((y) => ({
          ...y,
          gas_value_share: s(y.gas_value_share),
          oil_value_share: s(y.oil_value_share),
          value_share: s(y.value_share),
          gas_vol: s(y.gas_vol),
          oil_vol: s(y.oil_vol),
        })),
        depletion: {
          ...rf.depletion,
          gas_produced: s(rf.depletion.gas_produced),
          gas_remaining: s(rf.depletion.gas_remaining),
          gas_eur: s(rf.depletion.gas_eur),
          oil_produced: s(rf.depletion.oil_produced),
          oil_remaining: s(rf.depletion.oil_remaining),
          oil_eur: s(rf.depletion.oil_eur),
          /* THE PERCENTAGES AND THE DATE STAY. A share of a life and the month
             half the remainder arrives are facts about a decline curve, not
             about this owner — and scaling them would make the bars disagree
             with the number printed beside them. */
          note: prose(rf.depletion.note),
        },
        /* the price deck is the model's published path, not an identity */
        deck: rf.deck ? { ...rf.deck, note: prose(rf.deck.note) } : null,
        peak: rf.peak ? { ...rf.peak, gas: s(rf.peak.gas) } : null,
        mix: rf.mix ? { ...rf.mix, note: prose(rf.mix.note) } : null,
        findings: rf.findings.map((f) => ({
          label: prose(f.label), text: prose(f.text),
        })),
        charts: rf.charts.map((c) => ({
          ...c,
          sub: prose(c.sub),
          footnote: c.footnote ? prose(c.footnote) : c.footnote,
          series: c.series.map((sr) => ({
            ...sr, points: sr.points.map((v) => (v == null ? null : s(v))),
          })),
        })),
        provenance: rf.provenance.map((x) => ({ ...x, gives: prose(x.gives) })),
      };
    })(),

    /* ---------------------------------------------------------- my leases
       THE DENSEST IDENTITY SURFACE IN THE APP, and three things it needs that
       nothing else does:

       1. THE API NUMBER IS REPLACED, NOT MASKED. `scrub` masks digits, but
          "42-•••-•••••-••••" still leaks the county (42-123 is DE WITT) and
          the well count. A synthetic number keeps the shape without the key.
       2. COORDINATES ARE MOVED, NOT MASKED. Fifteen decimal places of
          latitude is a pin on the exact wellhead — the most identifying field
          in the whole payload. The set is TRANSLATED to a neutral origin, so
          every distance, bearing and lateral length stays exactly right (the
          map is the product) and the record sits nowhere real.
       3. RESERVOIR NAMES STAY. EDWARDS and WILCOX are public formations under
          a third of Texas. Masking them would empty the reservoir report to
          protect information that is not this owner's. */
    my_leases: (() => {
      const rl = real.my_leases;
      /* a neutral origin in open country west of Abilene, chosen because it
         is nowhere near this owner and on land rather than in the Gulf */
      const OX = 32.0;
      const OY = -100.0;
      const dLat = rl.map ? OX - rl.map.min_lat : 0;
      const dLon = rl.map ? OY - rl.map.min_lon : 0;

      const apiOf = new Map<string, string>();
      let ai = 0;
      const subApi = (a: string | null): string => {
        if (!a) return '42-000-00000-0000';
        let v = apiOf.get(a);
        if (!v) {
          ai += 1;
          /* district 42-999 does not exist, so the number cannot resolve */
          v = `42-999-${String(10000 + ai).padStart(5, '0')}-0000`;
          apiOf.set(a, v);
        }
        return v;
      };

      const moveWell = <T extends { api14: string; label: string; lease_id: string;
        lease_label: string; lat: number; lon: number; bh_lat: number | null;
        bh_lon: number | null; well_number: string | null }>(w: T): T => ({
          ...w,
          api14: subApi(w.api14),
          label: prose(w.label),
          lease_label: prose(w.lease_label),
          lat: Math.round((w.lat + dLat) * 1e6) / 1e6,
          lon: Math.round((w.lon + dLon) * 1e6) / 1e6,
          bh_lat: w.bh_lat == null ? null : Math.round((w.bh_lat + dLat) * 1e6) / 1e6,
          bh_lon: w.bh_lon == null ? null : Math.round((w.bh_lon + dLon) * 1e6) / 1e6,
        });

      const moveMap = (mp: typeof rl.map): typeof rl.map => (mp ? {
        ...mp,
        wells: mp.wells.map(moveWell),
        min_lat: Math.round((mp.min_lat + dLat) * 1e6) / 1e6,
        max_lat: Math.round((mp.max_lat + dLat) * 1e6) / 1e6,
        min_lon: Math.round((mp.min_lon + dLon) * 1e6) / 1e6,
        max_lon: Math.round((mp.max_lon + dLon) * 1e6) / 1e6,
        /* THE SPANS ARE NOT SCALED. A translation does not change a distance,
           and scaling them would make the note disagree with the picture. */
        note: prose(mp.note),
      } : null);

      const subStat = <T extends { label: string; value: string; sub: string | null }>(
        st: T,
      ): T => ({
        ...st,
        value: /^[\d$.,+-]/.test(st.value) ? scrub(st.value) : prose(st.value),
        sub: st.sub ? prose(st.sub) : st.sub,
      });

      const months = <T extends { gas: number; oil: number }>(ms: T[]): T[] =>
        ms.map((m) => ({ ...m, gas: s(m.gas), oil: s(m.oil) }));

      return {
        ...rl,
        picker: rl.picker.map((l, i) => ({
          ...l,
          label: leaseName.get(l.lease_id) ?? nm(i),
          county: 'Sample',
          operator_name: subOp(l.operator_name),
          owner_value: s(l.owner_value),
        })),
        leases: rl.leases.map((l, i) => ({
          ...l,
          label: leaseName.get(l.lease_id) ?? nm(i),
          lease_name: leaseName.get(l.lease_id) ?? nm(i),
          lease_number: leaseRef.get(l.lease_id) ?? 'SMPL',
          county: 'Sample',
          operator_name: subOp(l.operator_name),
          field_name: l.field_name ? 'SAMPLE FIELD' : null,
          field_stem: l.field_stem ? 'SAMPLE' : null,
          interest: 0.0125,
          interest_label: '0.01250 · 1.2500% (sample)',
          owner_value: s(l.owner_value),
          well_apis: l.well_apis.map(subApi),
          gas_to_date: s(l.gas_to_date),
          oil_to_date: s(l.oil_to_date),
          gas_to_date_share: s(l.gas_to_date_share),
          oil_to_date_share: s(l.oil_to_date_share),
          reserves_gas_share: s(l.reserves_gas_share),
          stats: l.stats.map(subStat),
          map: moveMap(l.map),
          note: l.note ? prose(l.note) : l.note,
        })),
        reservoirs: rl.reservoirs.map((r) => ({
          ...r,
          lease_ids: r.lease_ids,
          well_apis: r.well_apis.map(subApi),
          gas_to_date: s(r.gas_to_date),
          oil_to_date: s(r.oil_to_date),
          gas_forecast: s(r.gas_forecast),
          oil_forecast: s(r.oil_forecast),
          months: months(r.months),
          stats: r.stats.map(subStat),
          map: moveMap(r.map),
        })),
        wells: rl.wells.map((w) => ({
          ...w,
          api14: subApi(w.api14),
          api10: w.api10 ? subApi(w.api10).slice(0, 13) : null,
          label: prose(w.label),
          /* MEASURED LEAK, caught by the live check. `completions.ts` builds
             `well_name` as "{lease_name} {well_number}", so it carried the
             real lease name into eight of the ten well reports while every
             label beside it was substituted. */
          well_name: w.well_name ? prose(w.well_name) : w.well_name,
          lease_label: prose(w.lease_label),
          county: 'Sample',
          field_name: w.field_name ? 'SAMPLE FIELD' : null,
          completion_operator: subOp(w.completion_operator),
          operator_name: subOp(w.operator_name),
          completions: w.completions.map((c) => ({ ...c, api14: subApi(c.api14) })),
          months: months(w.months),
          gas_filed: s(w.gas_filed),
          oil_filed: s(w.oil_filed),
          gas_projected: s(w.gas_projected),
          oil_projected: s(w.oil_projected),
          peak_gas: w.peak_gas == null ? null : s(w.peak_gas),
          stats: w.stats.map(subStat),
          map: moveMap(w.map),
          note: w.note ? prose(w.note) : w.note,
        })),
        map: moveMap(rl.map),
        totals: {
          ...rl.totals,
          gas_to_date: s(rl.totals.gas_to_date),
          oil_to_date: s(rl.totals.oil_to_date),
          owner_value: s(rl.totals.owner_value),
          roster_note: prose(rl.totals.roster_note),
        },
        stats: rl.stats.map(subStat),
        findings: rl.findings.map((f) => ({
          label: prose(f.label), text: prose(f.text),
        })),
        provenance: rl.provenance.map((x) => ({ ...x, gives: prose(x.gives) })),
      };
    })(),

    /* ----------------------------------------------------------- timeline */
    /* MEASURED LEAK: adding the timeline to the payload without extending this
       transform put the owner's REAL lease names on the not-claimed page —
       "COOK-KAISER GU", "MCCABE ETAL GU" — with only the figures masked.
       The rows flagged `is_mine` are the owner's own record and are
       substituted; the rest are permits, completions and status changes on
       OTHER people's leases, which are public record either way and stay as
       filed, exactly as the activity feed does. */
    timeline: {
      ...real.timeline,
      events: real.timeline.events.map((e) => (e.is_mine
        ? {
          ...e,
          title: prose(e.title),
          body: prose(e.body),
          lease_name: subLease(e.lease_name),
          operator_name: subOp(e.operator_name),
          stats: e.stats.map(sampleStat),
          /* THE RINGS TOO. An adjacent row carries its figures at 1, 3 and 5
             miles so a mile button can change what the row says — masking only
             `stats` would leave the other two rings showing real counts the
             moment the reader pressed 3 mi. */
          ring_stats: e.ring_stats
            ? Object.fromEntries(Object.entries(e.ring_stats)
              .map(([k, v]) => [k, v.map(sampleStat)])) as typeof e.ring_stats
            : null,
        }
        : publicRow(e))),
      kinds: real.timeline.kinds.map((k) => ({ ...k, meaning: k.meaning })),
      notes: real.timeline.notes.map(prose),
    },

    /* ---------------------------------------------------------------- prose */
    drawers: Object.fromEntries(Object.entries(real.drawers).map(([k, d]) => [k, {
      ...d,
      title: prose(d.title),
      sub: prose(d.sub),
      what: prose(d.what),
      means: prose(d.means),
      evidence: d.evidence.map(prose),
      next: prose(d.next),
      /* THE STAT BAND WAS RIDING THROUGH UNMASKED on `...d`. It carries lease
         names as values in the new production panels, so it goes through the
         same masker as every other stat on the site. */
      stats: d.stats?.map(sampleStat),
      /* and the spark caption, which names the lease the series belongs to —
         the third field found riding through untouched on the spread */
      spark_label: d.spark_label ? prose(d.spark_label) : d.spark_label,
      chips: ['Sample view', ...d.chips],
      /* The chart POINTS are scaled by the same portfolio factor as every
         other figure, so the shape the reader is being shown is real while the
         amounts are not. A price chart is exempt: those are published market
         settlements, not this owner's information, and scaling them would be
         inventing a market. */
      charts: d.charts?.map((c) => (c.key.startsWith('price:') ? c : {
        ...c,
        series: c.series.map((se) => ({
          ...se,
          points: se.points.map((v) => (v == null ? null : Math.round(v * f * 100) / 100)),
        })),
      })),
    }])),

    /* the ticker is a published market settlement — real, and nobody's private
       information, so it stays live even here */
    ticker: real.ticker,
  };

  return {
    payload,
    factor: Math.round(f * 1000) / 1000,
    note:
      'Sample view. The dates, the commodity settlements and the neighbouring public filings are ' +
      'real; the names, amounts and volumes are illustrative. Claim your interests to see your own.',
  };
}

/* ---------------------------------------------------------------- selftest */
export function selftest() {
  const lines: string[] = [];
  let ok = true;
  const chk = (name: string, cond: boolean, got?: unknown) => {
    lines.push((cond ? 'ok    ' : 'FAIL  ') + name + (cond ? '' : `   <- ${JSON.stringify(got)}`));
    if (!cond) ok = false;
  };

  chk('scrub masks a dollar amount', scrub('worth $4,548,479 today') === 'worth $••• today',
    scrub('worth $4,548,479 today'));
  // the trap the pattern is shaped for: the space after the amount must survive
  chk('scrub keeps the space after an amount — the eaten-space bug',
    scrub('worth $4,548,479 today').includes('••• today'),
    scrub('worth $4,548,479 today'));
  chk('scrub masks a spelled magnitude', scrub('about $4.5 million now') === 'about $••• now',
    scrub('about $4.5 million now'));
  chk('scrub does NOT eat the m of mcf', scrub('$4 mcf') === '$••• mcf', scrub('$4 mcf'));
  chk('scrub masks a percentage', scrub('up 12.4% on the month').includes('•••%'),
    scrub('up 12.4% on the month'));
  chk('scrub masks a bare volume', scrub('8,776 mcf of gas') === '••• mcf of gas',
    scrub('8,776 mcf of gas'));
  chk('scrub leaves prose intact', scrub('four of your leases filed') === 'four of your leases filed');
  chk('scrub leaves NO digit behind', !/\d/.test(scrub('$1,234 and 56.7% over 8 months')),
    scrub('$1,234 and 56.7% over 8 months'));

  // the seeded factor must be stable, in range, and NOT 1 — a factor of 1
  // would publish the real figures under a sample badge
  const f1 = seeded(seedOf('Platis Sydney Kay:2025'))();
  const f2 = seeded(seedOf('Platis Sydney Kay:2025'))();
  chk('the sample factor is stable for one owner', f1 === f2);
  chk('the sample factor differs between owners',
    seeded(seedOf('A:2025'))() !== seeded(seedOf('B:2025'))());
  const scale = 0.55 + f1 * 1.15;
  chk('the sample factor is inside its band', scale > 0.55 && scale < 1.70, scale);
  chk('the sample factor is not 1 — it would publish the real figures',
    Math.abs(scale - 1) > 0.001, scale);

  /* THE LEAK THIS TEST EXISTS FOR. The timeline was added to the payload and
     this transform was not extended, so the not-claimed page showed the
     owner's real lease names ("COOK-KAISER GU") with only the figures masked.
     A name is not scrubbed by `scrub` — it carries no digits — so the only
     thing that catches it is substitution, and the only thing that catches a
     MISSING substitution is a test on the shape. */
  chk('a value that starts with a digit is scrubbed, not treated as a name',
    scrub('35,382 mcf') === '••• mcf', scrub('35,382 mcf'));
  chk('scrub does NOT hide a lease name — substitution has to',
    scrub('COOK-KAISER GU') === 'COOK-KAISER GU', scrub('COOK-KAISER GU'));
  chk('the money/number test recognises a figure',
    /^[\d$.,+-]/.test('35,382 mcf') && /^[\d$.,+-]/.test('$1,234'));
  chk('the money/number test does NOT match a lease name',
    !/^[\d$.,+-]/.test('COOK-KAISER GU'));

  /* THE EM-DASH BUG. `subOp` is handed stat values as well as operator names,
     and a stat value can be the "not recorded" placeholder. Registering it
     made prose() rewrite every em dash on the page as a company name. */
  chk('a short placeholder is NOT treated as an operator name',
    (() => {
      const seen = new Map<string, string>();
      const sub = (v: string | null): string | null => {
        if (!v) return v;
        if (v.trim().length < 4) return v;
        if (!seen.has(v)) seen.set(v, 'SAMPLE OPERATOR');
        return seen.get(v)!;
      };
      return sub('—') === '—' && seen.size === 0;
    })());
  chk('a real operator name IS substituted',
    (() => {
      const seen = new Map<string, string>();
      const sub = (v: string | null): string | null => {
        if (!v) return v;
        if (v.trim().length < 4) return v;
        if (!seen.has(v)) seen.set(v, 'SAMPLE OPERATOR');
        return seen.get(v)!;
      };
      return sub('HURD ENTERPRISES, LTD') === 'SAMPLE OPERATOR';
    })());

  /* ONE COMPANY, ONE SAMPLE NAME — the two-spellings leak.
     This record spells one operator "HURD ENTERPRISES, LTD." on the operator
     roll and "Hurd Enterprises, Ltd" in the production store. Keyed on the
     exact string they became two sample companies, and the title-case one
     survived in prose because the replacement list had never seen it. */
  chk('two spellings of one company fold to one identity',
    foldOp('HURD ENTERPRISES, LTD.') === foldOp('Hurd Enterprises, Ltd'),
    [foldOp('HURD ENTERPRISES, LTD.'), foldOp('Hurd Enterprises, Ltd')]);
  chk('the fold survives the punctuation the feed varies',
    foldOp('DEVON ENERGY PRODUCTION CO, L.P.') === foldOp('Devon Energy Production Co L.P.'));
  chk('two DIFFERENT companies do not fold together',
    foldOp('HURD ENTERPRISES, LTD.') !== foldOp('KALER ENERGY CORP.'));
  chk('the fold keeps the digits that distinguish a name',
    foldOp('R4 PARTNERS') === 'R4PARTNERS');

  /* longest spelling first, or the suffix is stranded on the sample name */
  const spellings: [string, string][] = [
    ['HURD ENTERPRISES', 'ALPHA CO'], ['HURD ENTERPRISES, LTD.', 'ALPHA CO'],
  ].sort((x, y) => y[0].length - x[0].length) as [string, string][];
  chk('the longer spelling is replaced first',
    spellings[0][0] === 'HURD ENTERPRISES, LTD.', spellings.map((x) => x[0]));
  chk('so a sentence loses the whole name, not part of it', (() => {
    let out = 'operated by HURD ENTERPRISES, LTD. this month';
    for (const [from, to] of spellings) out = out.split(from).join(to);
    return !/HURD|LTD/.test(out);
  })());

  return { name: 'not-claimed sample view', ok, lines };
}

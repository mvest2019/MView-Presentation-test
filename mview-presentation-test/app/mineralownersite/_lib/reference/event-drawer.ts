/**
 * The panel for ONE filing, built where it is read.
 *
 * ── WHY THIS IS NOT IN `drawers.ts` ────────────────────────────────────────
 * It was, for one build. MEASURED: 343 of this owner's 973 timeline rows can
 * be placed on the ground, and building a panel for each of them server-side
 * added 488 KB to a 5.2 MB payload — a tenth of everything the page loads, to
 * carry 343 copies of two sentences that differ in a lease name.
 *
 * Every word of it is already on the client. The event's own `body` is the
 * "what this is"; its `stats` are the evidence; its title, kind and distance
 * are its own. So the panel is assembled from the row that opened it, at the
 * moment it opens, and the payload carries nothing.
 *
 * This is the same shape as `prices-drawer.ts`, and for the same reason: a
 * panel whose content is derivable from data the client already holds should
 * be derived, not shipped.
 *
 * ── IT MUST STAY IMPORTABLE FROM A COMPONENT ───────────────────────────────
 * Type-only imports, no runtime dependency that reaches `lib/mongo`. A value
 * imported from `lib/timeline` or `lib/leases` would pull the Mongo driver
 * into the browser bundle and fail on Node's `net`.
 */
import { api10 } from './fmt';
import type { Drawer, TimelineEvent } from './payload';


/** "0.42 miles" / "1 mile" — pluralised off what is printed, not what is stored. */
function miles(v: number): string {
  const s = v.toFixed(2);
  return `${s} ${s === '1.00' ? 'mile' : 'miles'}`;
}

/* ---- WHICH OF THE THREE DATES THE ROW IS DATED BY.
   A completion is dated by the day the well was finished and a permit by the
   day the state approved it — see `sources/activity.ts` for the measurement
   that settled it. The word has to move with the value: a permit still
   pending approval is dated by its submission, and printing that under
   "Approved" would be a false statement about a regulatory decision. */
const DATED: Record<string, { verb: string; why: string }> = {
  completion: { verb: 'Completed', why: 'the day the well was finished' },
  approved: { verb: 'Approved', why: 'the day the state let it go ahead' },
  submitted: { verb: 'Submitted', why: 'not approved yet, so dated by its filing' },
  published: { verb: 'Published', why: 'the day it was published' },
};

/**
 * The panel for a single permit, completion or status change.
 *
 * Returns null for anything that is not one of those three — a production
 * month and a ring summary are facts about a lease rather than about a well,
 * and they have their own panels.
 */
export function eventDrawer(e: TimelineEvent | null | undefined): Drawer | null {
  if (!e) return null;
  if (e.kind !== 'permit' && e.kind !== 'completion' && e.kind !== 'status') return null;

  /* ---- A FILING WITH NO LOCATION STILL GETS ITS OWN PANEL.
     It used to fall through to the shared county panel, so clicking one
     permit opened a map of eighty-one others. The operator, the depth, the
     field and the date are what the reader clicked for; the map is the part
     that is missing, and the panel says so. */
  const placed = e.lat != null && e.lon != null;

  /* the filing's own paperwork; null on a ring row built from the well record
     rather than from an Activity filing */
  const f = e.filing;
  /* ---- A STATUS CHANGE IS DATED BY A COMPLETION IT DID NOT MAKE.
     Its date is `current_completion_date` — the completion filing that
     carried the change — so the row is dated by a completion date without
     being a completion. "Completed 13 Jan" over "Shut-In Producer becomes
     Producing" reads as if the well were finished that day; "recorded" is
     what actually happened, and the pair in the record says the rest. */
  const dated = f?.of === 'status'
    ? { verb: 'Recorded', why: 'on the completion filing that carried the change' }
    : DATED[f?.date_basis ?? ''] ?? null;

  /* AN ABSTRACT IS A PART OF THE COUNTY, NOT A WELL PAD. Said here once and
     then repeated everywhere the point is drawn — the legend, the caption and
     the evidence — because a pin is read as a surveyed location unless it is
     told otherwise. */
  const rough = placed && e.location_basis === 'abstract';

  const where = e.distance_mi != null
    ? `${miles(e.distance_mi)} from your nearest well`
    : `in ${e.county ?? 'your county'}`;

  return {
    title: e.title,
    /* "New completion · completed 25 Nov 2025 · 3.14 miles from your nearest
       well" — the sub says WHICH date it is showing, because "25 Nov 2025" on
       a filing carrying three dates does not say which one it is. */
    sub: [
      e.kind_label,
      e.when_label ? (dated ? `${dated.verb.toLowerCase()} ${e.when_label}` : e.when_label) : null,
      e.is_mine ? 'on your lease' : where,
    ].filter(Boolean).join(' · '),
    what: e.body,
    means: e.is_mine
      ? 'This filing is against a lease you hold, so it is about your own acreage — the wells '
        + 'on it are the ones your interest is paid from.'
      : 'This is a neighbour’s filing. It does not pay you and it is not yours; what it tells '
        + 'you is what is happening to the rock around your tract.',

    /* ---- THE FACTS FIRST, THEN THE EXPLANATION.
       The panel used to open on "Somebody intends to drill here" — a true
       sentence about permits in general, and not what a reader who clicked one
       particular permit came for. The band renders above every step, so the
       filing's own identity is the first thing on the panel and the prose
       follows it.

       AND THE IDENTIFIER IS THE KIND'S OWN. It used to lead with the API on
       every row, which put "API — not filed" at the top of all 414 permits:
       not one permit in the feed carries the field, so the panel's opening
       fact was a permanent absence. A permit is identified by its permit
       number, a completion by its API, and each now leads with the one it
       actually has. */
    stats: [
      f?.of === 'permit'
        ? { label: 'Permit no.', value: f.permit_no ?? 'not recorded',
            sub: f.permit_suffix ? `amendment ${f.permit_suffix}` : 'RRC drilling permit' }
        : { label: 'API', value: api10(e.api) ?? 'not recorded',
            sub: f?.api_source === 'resolved'
              ? 'resolved from the well record' : 'the state’s well number' },
      ...(e.well_number
        ? [{ label: 'Well', value: e.well_number, sub: e.lease_name ?? undefined }]
        : []),
      /* ---- THE BAND STOPS AT IDENTITY, because the record below is the
         record. It used to pass two of the row's own stats through here —
         Operator and Field — and now that the paperwork grid carries both,
         the same two facts appeared twice on one panel, once in 19px serif
         and once ten pixels lower. MEASURED at 680px, the serif band broke
         "DEVON ENERGY PRODUCTION CO L.P." across four lines to do it.

         What stays is what identifies the filing and, when it is a
         neighbour's, how far away it is — the one number the band is
         genuinely for. */
      ...(e.distance_mi != null
        ? [{ label: 'Distance', value: `${e.distance_mi.toFixed(2)} mi`,
            sub: 'from your nearest well' }]
        : []),
      /* ---- THE DATE IS LABELLED BY WHICH DATE IT IS.
         This stat used to read "Filed" on every permit, which was wrong on
         the 1,121 that carry an approval date — they were approved, not
         merely filed — and the word "Completed" was hard-coded on completions
         whether or not a completion date was the one being shown.

         A WELL ROW'S `when_label` ALREADY CARRIES ITS VERB — the timeline
         builds it as "completed 17 Mar 2025" — so it is stripped here rather
         than printed under a second "Completed". */
      { label: dated?.verb ?? (e.kind === 'completion' ? 'Completed' : 'Filed'),
        value: (e.when_label ?? 'date not recorded')
          .replace(/^(completed|permitted|approved|submitted|dated)\s+/i, ''),
        sub: dated?.why ?? (e.county ? `${e.county} County` : undefined) },
    ],

    /* ---- THE STATE'S OWN RECORD, laid out as the document it actually is.
       ONE TEMPLATE PER KIND, built by `record` below. The first version was a
       single merged list, and it read every filing as a union of all of them:
       every permit carried "Completed — a permit is not a well yet" and
       "API — not filed", and every completion carried a blank depth. Those
       are TRUE ZEROES, not gaps — a permit has not drilled a well, a
       completion is not proposing a depth — and printing an absence the
       document was never going to have invents a hole in the record. */
    facts: record(e, f),

    /* ---- PROVENANCE, NOT A SECOND COPY OF THE RECORD.
       This list used to restate the API, the well, the reference number, the
       three dates and then every one of the row's stats — all of which now sit
       in the grid above, in two columns, where a record belongs. What is left
       is the part a grid cannot say: WHICH document this came out of, which of
       its dates the row is sorted by, and how far the position on the map can
       be trusted. */
    evidence: [
      f?.of === 'permit'
        ? 'A <strong>drilling permit</strong> as the Railroad Commission files it — a '
          + 'permit number, a submitted and an approved date, a proposed depth and the survey '
          + 'it was filed against. It carries no API and no completion date, because nothing '
          + 'has been drilled yet.'
        : f?.of === 'completion'
          ? 'A <strong>completion filing</strong> as the Railroad Commission files it — a '
            + 'tracking number, the well’s own API, what it produces and the day it was '
            + 'finished. It carries no proposed depth, because the well is already drilled.'
          : f?.of === 'status'
            ? 'A <strong>well status change</strong>. The record carries both sides of every '
              + 'field that moved, so what is shown is the transition rather than either half '
              + 'of it.'
            : 'The state’s <strong>well record</strong> rather than a filing — this one '
              + 'was matched by position, not read off a permit or a completion.',

      ...(dated
        ? [`This row is dated by its <strong>${dated.verb.toLowerCase()}</strong> date, `
          + `${dated.why}. The others are in the record above, and the gaps between them are `
          + 'the part worth reading.']
        : []),

      ...(f?.of === 'permit' && e.api
        ? ['Its <strong>API</strong> is one resolved from the well record, not one the permit '
          + 'carries — no permit in this feed files an API.']
        : []),

      ...(e.distance_mi != null
        ? [`Measured <strong>${miles(e.distance_mi)}</strong> from your nearest well, from the `
          + 'surface location the state has on file.']
        : rough
          ? ['No surface location has been filed for this one yet. The map shows the '
            + '<strong>abstract it was filed against</strong>, placed from other wells in the '
            + 'same survey'
            /* ---- "THEY SIT 0 MILES APART" IS NOT A SENTENCE TO PRINT.
               `location_spread_mi` is how far apart the anchors this point was
               averaged from actually sat, and the backend files 0 when they
               all resolved to one place — measured on this owner, 19 of the 28
               abstract-placed rows. Printed unconditionally that reads as a
               contradiction of the caption it sits under: nothing is
               approximate about wells zero miles apart, so the reader is told
               the position is rough and then shown a figure saying it is not.
               The clause is dropped where there is no spread to quote; the
               sentence's actual point — this is a survey, not a pad — is in
               the half that always prints. */
            + (e.location_spread_mi ? ` — they sit ${e.location_spread_mi} miles apart` : '')
            + ', so read it as which part of the county rather than as a well pad.']
          : placed
            ? ['The state filed this against a county rather than a measured position, so the '
              + 'map shows the surface location its well record resolves to rather than a '
              + 'measured distance from your acreage.']
            : ['The state filed this against a county and recorded no surface location for it, '
              + 'and no other well in the same abstract has one either — so there is nothing '
              + 'to put on a map. That is a gap in the filing, not in the record here.']),
    ],

    next: e.is_mine
      ? 'Nothing is required of you. Watch this lease’s production for the months after it.'
      : 'Nothing is required of you. If it starts filing volume, that is the rock under your '
        + 'own acreage performing.',
    tone: 'activity',
    chips: [e.kind_label],

    /* ---- ONE WELL, AND NOTHING ELSE ON THE MAP.
       A reader who clicked one permit is asking about that permit. `WellMap`
       opens a half-mile box around a lone point — its own measured `FLOOR` —
       which is the zoom a well pad wants, and an approximate point opens
       wider still. */
    map: placed && e.lat != null && e.lon != null ? {
      focus: {
        id: e.id,
        kind: e.kind,
        label: e.title,
        /* `?? null` on the four optional ones: this app's payload contract
           marks the geo fields optional, because the committed capture the
           seam serves predates them, and `FocusPoint` takes `string | null`.
           Absent and null are the same fact to a map — there is nothing to
           draw — so they are collapsed here rather than widening the point. */
        well_number: e.well_number ?? null,
        lat: e.lat,
        lon: e.lon,
        api14: e.api ?? null,
        basis: rough ? 'abstract' : 'surveyed',
        spread_mi: e.location_spread_mi ?? null,
        lease_name: e.lease_name,
        operator_name: e.operator_name,
        when_label: e.when_label,
        distance_mi: e.distance_mi,
        is_mine: e.is_mine,
      },
      title: rough ? 'Roughly where this is' : 'Where this is',
      caption: rough
        ? `No surface location has been filed for this ${e.kind_label.toLowerCase()} yet. This `
          + `is the abstract it was filed against — ${e.legal_description ?? 'the survey named '
            + 'on the filing'} — placed from other wells in the same survey. It says which part `
          + 'of the county, not which pad.'
        : `The surface location of this ${e.kind_label.toLowerCase()}, as the state filed `
          + 'it. Nothing else is drawn — this panel is about this one filing.',
    } : null,
  };
}

/* ================================================================= records */
/**
 * The paperwork grid for one row, laid out per kind.
 *
 * MEASURED across district 02's 2,142 Activity rows, by how many of each kind
 * carry the field at all — this is what decides which rows each layout has:
 *
 *                         New Permit   New Completion   Well Status Change
 *   status_number/suffix       100%          —                  —
 *   tracking_no                  —         100%           100% (current_)
 *   api                          —         100%           100% (api_no)
 *   submit_date                100%        99.9%                —
 *   approved_date               96%          93%                 —
 *   completion_date              —         100%           100% (current_)
 *   total_depth                100%          —                  —
 *   legal_description           98%          —                  —
 *   filing_purpose             100%          —                  —
 *   filling_purpose              —        98.6%                 —
 *   completion_type              —         100%                 —
 *   well_type / well_status      —         100%           100% (current_)
 *
 * A dash is a TRUE ZERO. So a permit's grid has no completion date and no well
 * type; a completion's has no proposed depth and no abstract; and a status
 * change is before-and-after pairs, which neither of the others has at all.
 */
function record(e: TimelineEvent, f: TimelineEvent['filing']): Drawer['facts'] {
  if (!f) return null;
  const well = e.well_number
    ? [{ k: 'Well', v: e.well_number, sub: e.lease_name ?? undefined }] : [];
  const op = e.operator_name ? [{ k: 'Operator', v: e.operator_name }] : [];
  const county = e.county ? [{ k: 'County', v: `${e.county} County` }] : [];
  const field = f.field_name ? [{ k: 'Field', v: f.field_name }] : [];
  const bore = f.profile ? [{ k: 'Wellbore', v: f.profile }] : [];
  /* ------------------------------------------------------------- a permit */
  if (f.of === 'permit') {
    return {
      head: 'Permit record',
      note: 'as the Railroad Commission filed it',
      rows: [
        { k: 'Permit no.', v: f.permit_no ?? 'not recorded',
          sub: f.permit_suffix ? `amendment ${f.permit_suffix}` : 'RRC drilling permit' },
        { k: 'Filing status', v: f.status ?? 'not recorded',
          sub: f.status === 'Approved' ? 'cleared to drill'
            : f.status === 'PendingApproval' ? 'awaiting the state'
              : f.status === 'Withdrawn' ? 'pulled by the operator' : undefined },
        /* ---- TWO DATES, NOT THREE. A permit has no completion date and is
           never going to have one: it is an intention to drill. */
        { k: 'Submitted', v: f.submit_label ?? 'not recorded',
          sub: 'lodged with the state' },
        { k: 'Approved', v: f.approved_label ?? '—',
          sub: f.approved_label ? 'cleared to drill'
            : f.status === 'PendingApproval' ? 'still pending'
              : f.status === 'Withdrawn' ? 'withdrawn before approval' : 'not yet approved' },
        ...(f.purpose ? [{ k: 'Purpose', v: f.purpose, sub: 'what it is for' }] : []),
        ...(f.permit_action ? [{ k: 'Permit action', v: f.permit_action }] : []),
        ...well,
        ...bore,
        ...(f.total_depth
          ? [{ k: 'Proposed depth', v: `${f.total_depth.toLocaleString('en-US')} ft`,
              sub: 'what it plans to drill to' }]
          : []),
        ...field,
        ...op,
        ...county,
        ...(e.legal_description
          ? [{ k: 'Filed against', v: e.legal_description, sub: 'the survey, not a pad' }]
          : []),
        /* ---- AND THE API LAST, BECAUSE A PERMIT DOES NOT HAVE ONE.
           Not one of district 02's 1,168 permits carries the field. Where a
           number appears here this app found it — from the permit number, or
           from the lease and well name — and "the state's well number" over
           it would be a false claim about every permit in the feed. */
        { k: 'API', v: api10(e.api) ?? 'none yet',
          sub: e.api
            ? 'resolved from the well record — a permit files no API'
            : 'a permit files no API, and none resolved' },
      ],
    };
  }

  /* --------------------------------------------------------- a completion */
  if (f.of === 'completion') {
    return {
      head: 'Completion record',
      note: 'as the Railroad Commission filed it',
      rows: [
        { k: 'Tracking no.', v: f.tracking_no ?? 'not recorded',
          sub: 'RRC completion filing' },
        /* THE API IS THE COMPLETION'S OWN — all 798 carry it. */
        { k: 'API', v: api10(e.api) ?? 'not recorded',
          sub: f.api_source === 'resolved'
            ? 'resolved from the well record' : 'the state’s well number' },
        { k: 'Filing status', v: f.status ?? 'not recorded' },
        /* ---- THE COMPLETION DATE IS OFTEN THE EARLIEST OF THE THREE.
           The well is finished first and the paperwork follows — measured on
           this record, by as much as four months. That gap is the fact the
           three dates are shown for. */
        { k: 'Completed', v: f.completion_label ?? 'not recorded',
          sub: 'the day the well was finished' },
        { k: 'Submitted', v: f.submit_label ?? '—',
          sub: f.submit_label ? 'the paperwork followed' : 'not on this filing' },
        { k: 'Approved', v: f.approved_label ?? '—',
          sub: f.approved_label ? 'the state accepted it' : 'not accepted yet' },
        ...(f.completion_type
          ? [{ k: 'Completion type', v: f.completion_type, sub: 'a new well or a re-entry' }]
          : []),
        ...(f.purpose ? [{ k: 'Purpose', v: f.purpose }] : []),
        ...(f.completion_action ? [{ k: 'Completion action', v: f.completion_action }] : []),
        ...well,
        ...(f.well_type ? [{ k: 'Well type', v: f.well_type, sub: 'what it produces' }] : []),
        ...(f.new_well_status
          ? [{ k: 'Well status', v: f.new_well_status, sub: 'as filed on the completion' }]
          : []),
        ...bore,
        ...field,
        ...op,
        ...county,
      ],
    };
  }

  /* ------------------------------------------------------ a status change */
  if (f.of === 'status') {
    const moved = (was: string | null, now: string | null) =>
      (was && now && was !== now ? `${was} → ${now}` : now ?? was ?? 'not recorded');
    return {
      head: 'Status change record',
      note: 'both sides of what moved',
      rows: [
        /* ---- THE PAIR IS THE RECORD. A status change is not a fact about a
           state, it is a fact about a TRANSITION, and either half alone says
           nothing. The row carries both sides of every field it touched, plus
           three booleans naming which of them moved. */
        { k: 'Well status', v: moved(f.prev_well_status, f.new_well_status),
          sub: f.changed?.status ? 'this is what changed' : 'unchanged' },
        { k: 'API', v: api10(e.api) ?? 'not recorded', sub: 'the state’s well number' },
        { k: 'Tracking no.', v: f.tracking_no ?? 'not recorded',
          sub: 'the completion filing that carried the change' },
        { k: 'Completion date', v: moved(f.prev_completion_label, f.new_completion_label),
          sub: 'on the filing before and after' },
        { k: 'Operator', v: moved(f.prev_operator_name, f.new_operator_name),
          sub: f.changed?.operator ? 'the operator changed too' : 'unchanged' },
        ...(f.changed?.lease
          ? [{ k: 'Lease number', v: 'changed', sub: 'it moved to a different lease' }] : []),
        ...well,
        ...(f.status ? [{ k: 'Filing status', v: f.status }] : []),
        ...county,
      ],
    };
  }

  /* --------------------------------------------------- a plain well record
     A ring row measured out of WellGeoData rather than read off an Activity
     filing. It has the well's own status and one date; the submitted /
     approved / completed trio belongs to a document this is not, and three
     em-dashes under "not on this filing" is noise pretending to be a record. */
  return {
    head: 'Well record',
    note: 'from the state’s well file',
    rows: [
      { k: 'API', v: api10(e.api) ?? 'not recorded', sub: 'the state’s well number' },
      ...(f.status ? [{ k: 'Well status', v: f.status }] : []),
      ...(e.when_label
        ? [{ k: e.kind === 'completion' ? 'Completed' : 'Dated',
            v: e.when_label.replace(/^(completed|permitted|dated)\s+/i, ''),
            sub: 'from the well file, not a filing' }]
        : []),
      ...(f.purpose ? [{ k: 'Purpose', v: f.purpose }] : []),
      ...well,
      ...bore,
      ...field,
      ...op,
      ...county,
    ],
  };
}

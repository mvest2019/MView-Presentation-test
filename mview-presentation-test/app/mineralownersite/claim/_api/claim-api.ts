import type {
  ClaimSet,
  CountyIndex,
  FlowLease,
  OwnerLeaseSet,
  OwnerRecord,
  SameNameResult,
} from "../_lib/claim-types";

/**
 * THE CLAIM FLOW'S ENTIRE API LAYER — all six `/api/v1/owners/*` endpoints, in
 * one file, in its own folder.
 *
 * ── `_api/` IS THIS ROUTE'S OWN, AND ONLY THIS ROUTE'S ──
 *
 * It sits beside `_components/` and `_lib/` under `app/mineralownersite/claim`
 * and belongs to that URL alone. Nothing outside this folder should reach for
 * it, and it reaches for nothing outside the flow: the one import is the flow's
 * own types. Keeping the network layer in its own folder rather than mixed into
 * `_lib/` — which holds formatting, plan config and step copy — means the
 * answer to "what does this page call?" is one directory, not a filename you
 * have to already know.
 *
 * ── WHY ONE FILE ──
 *
 * This was ten small modules — a transport, wire types, mappers and a file per
 * endpoint — and it is one on purpose (requested). Six functions that share a
 * base URL, one fetch helper and two mappers are a single unit of work:
 * splitting them meant nine import hops to follow one request from the
 * component to the wire, and a ten-file diff for what is really one subject.
 * Everything a claim call touches is on this page.
 *
 * ── IT IS SEPARATE FROM `lib/claim-search/api.ts`, DELIBERATELY ──
 *
 * That module calls the same six endpoints for the MARKETING finder at
 * `/claim`. Nothing here imports from it and nothing there imports from here,
 * so a change made for one page cannot reach the other.
 *
 * What the two share is a backend contract, not code — and the mapping is where
 * they genuinely differ: the finder needs scored positional rows for its view
 * algebra, this flow needs records and leases. Pointing both at one mapper
 * would mean one of them consuming a shape built for the other.
 *
 * THE BASE URL READS THE SAME ENV VAR because it is the same backend. Separate
 * modules, one host.
 *
 * ── EVERY FETCHER VALIDATES THE SHAPE IT GOT ──
 *
 * `res.ok` is not enough. A 200 carrying `{}` — or `counties` as an object, or
 * `owners` missing — would otherwise reach a component as `undefined.map` at
 * render time, which surfaces as a blank step with no explanation. Each
 * function checks the one field it depends on and throws a sentence a human can
 * act on, which the steps show verbatim.
 */

/* ============================================================================
   TRANSPORT
   ============================================================================ */

const BASE =
  process.env.NEXT_PUBLIC_CLAIM_API_BASE_URL ||
  "https://mview-dev-api.mineralview.com";

const OWNERS = `${BASE}/api/v1/owners`;

/** 20s: the counties tally is computed in the background and can be slow warm. */
const TIMEOUT_MS = 20_000;

async function getJson<T>(url: string, what: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (cause) {
    /* A network failure and a timeout arrive here identically, and the reader
       can do the same thing about both, so they get the same sentence. */
    throw new Error(`Could not reach the records service to ${what}.`, { cause });
  }
  if (!res.ok) {
    throw new Error(`The records service could not ${what} (${res.status}).`);
  }
  try {
    return (await res.json()) as T;
  } catch (cause) {
    throw new Error("The records service sent an unreadable reply.", { cause });
  }
}

/**
 * The anonymous visitor id, for the one endpoint that accepts one: the site's
 * `guestUserID` cookie (minted in `proxy.ts`, shared with the news endpoints),
 * with a local fallback for a first-ever visit where it has not been set yet.
 */
function visitorId(): string {
  const fromCookie = document.cookie.match(/(?:^|;\s*)guestUserID=([^;]+)/);
  if (fromCookie) return decodeURIComponent(fromCookie[1]);
  try {
    let v = localStorage.getItem("mvVisitorId");
    if (!v) {
      v = crypto.randomUUID();
      localStorage.setItem("mvVisitorId", v);
    }
    return v;
  } catch {
    return "anonymous";
  }
}

/* ============================================================================
   THE BACKEND'S OWN SHAPES

   These describe the wire, not the UI, and stay private to this file — a
   component that knows about `interestValues` is one that breaks when the
   backend renames it. `ClaimResult` is the exception: the completion screen
   reports per-owner outcomes, so it is exported.
   ============================================================================ */

/** An owner as every read endpoint serves it — named fields, parallel arrays. */
interface WireOwner {
  name: string;
  county: string;
  leaseCount: number;
  appraisedValue: number;
  /**
   * PER-LEASE ARRAYS, ALL INDEX-ALIGNED WITH `leases`. Any of them can be null,
   * which is why the mapper guards every read rather than trusting alignment.
   */
  leases: string[] | null;
  leaseValues: number[] | null;
  leaseNumbers: string[] | null;
  operators: string[] | null;
  /** Decimal interest, e.g. 0.007753 — NOT a percentage. */
  interestValues: number[] | null;
  address: string | null;
  workingInterest: boolean;
  score: number | null;
}

/** `allLeases` from `/same-name` — a SUMMARY per county, not a lease list. */
interface WireAllLeases {
  leaseCount?: number;
  appraisedValue?: number;
  countyCount?: number;
  counties?: {
    county?: string;
    leaseCount?: number;
    appraisedValue?: number;
    leases?: string[];
    leaseValues?: number[];
  }[];
}

/**
 * `POST /owners/claim`.
 *
 * PARTIAL SUCCESS IS NORMAL: the endpoint reports each name separately, so a
 * claim of three owners can come back with two filed and one rejected (most
 * often `OWNER_ALREADY_CLAIMED`). The receipt has to show both halves rather
 * than treating the call as pass/fail.
 */
export interface ClaimResult {
  successful_owners: {
    ownername: string;
    claimed_leases_count: number;
    failed_leases_count: number;
  }[];
  failed_owners: {
    ownername: string;
    error: string;
    error_code: string;
    failed_lease_count: number;
  }[];
  summary: {
    total_owners_processed: number;
    total_successful_owners: number;
    total_failed_owners: number;
  };
  claimedAt: string;
}

/* ============================================================================
   WIRE → FLOW

   The API serves index-aligned parallel arrays, which is the right wire format
   and the wrong thing to hand a component: every consumer would have to re-zip
   them and every consumer would have to get the alignment right. It happens
   once, here.
   ============================================================================ */

/**
 * One owner record, with its leases zipped.
 *
 * Every parallel array can be `null`, so each read is guarded and a missing
 * entry becomes `null` rather than `undefined` — the difference between a cell
 * that renders an em dash and one that renders nothing.
 */
function toRecord(o: WireOwner): OwnerRecord {
  const names = o.leases ?? [];
  const leases: FlowLease[] = names.map((name, i) => {
    const value = o.leaseValues?.[i] ?? 0;
    return {
      name,
      number: o.leaseNumbers?.[i] ?? null,
      operator: o.operators?.[i] ?? null,
      county: o.county,
      value,
      decimal: o.interestValues?.[i] ?? null,
      producing: value > 0,
    };
  });

  return {
    name: o.name,
    address: o.address ?? "",
    county: o.county,
    leaseCount: o.leaseCount ?? leases.length,
    appraisedValue: o.appraisedValue ?? 0,
    operatorCount: new Set((o.operators ?? []).filter(Boolean)).size,
    leases,
  };
}

/**
 * `allLeases` → the flat, statewide lease set steps 4 and 5 print.
 *
 * ── THE ENRICHMENT, AND ITS LIMIT ──
 *
 * `allLeases` carries lease NAMES and VALUES per county and nothing else. The
 * picked record carries number, operator and interest — but only for its own
 * county. So rows in that county are matched BY NAME against the record and
 * filled in; rows in every other county stay thin.
 *
 * Matching on name rather than index is deliberate: the two lists are served by
 * different queries and nothing promises they are ordered the same way. A
 * positional zip would silently attach one lease's operator to another.
 */
function toLeaseSet(
  all: WireAllLeases | undefined,
  selected: OwnerRecord | null,
): OwnerLeaseSet {
  const counties = all?.counties ?? [];

  const detail = new Map(
    (selected?.leases ?? []).map((lease) => [lease.name, lease]),
  );

  const leases: FlowLease[] = counties.flatMap((c) =>
    (c.leases ?? []).map((name, i) => {
      const value = c.leaseValues?.[i] ?? 0;
      const known = c.county === selected?.county ? detail.get(name) : undefined;
      return {
        name,
        number: known?.number ?? null,
        operator: known?.operator ?? null,
        county: c.county ?? "",
        value,
        decimal: known?.decimal ?? null,
        producing: value > 0,
      };
    }),
  );

  const countyNames = counties.map((c) => c.county ?? "").filter(Boolean);

  return {
    leases,
    leaseCount: all?.leaseCount ?? leases.length,
    appraisedValue:
      all?.appraisedValue ?? leases.reduce((sum, l) => sum + l.value, 0),
    countyCount: all?.countyCount ?? countyNames.length,
    countyList: countyNames.join(", "),
  };
}

/* ============================================================================
   1 · GET /owners/counties — the county dropdown and the "N owners" tally
   ============================================================================ */

/**
 * COLD START IS A NORMAL RESPONSE, NOT AN ERROR. The tally takes minutes to
 * compute and is cached for 25 hours; until it lands the endpoint answers with
 * `pending: true` and zeroed counts so the dropdown still fills. Reporting that
 * as a failure would hide a working control behind an error message — so the
 * flag is passed through and step 1 simply does not print the counts.
 */
export async function fetchCounties(): Promise<CountyIndex> {
  const data = await getJson<{
    totalOwners?: number;
    total?: number;
    pending?: boolean;
    counties?: { name?: string; county?: string; owners?: number }[];
  }>(`${OWNERS}/counties`, "load the county list");

  if (!Array.isArray(data.counties)) {
    throw new Error("The county list came back in a shape we don't recognise.");
  }

  const counties = data.counties
    .map((c) => ({ name: c.name ?? c.county ?? "", owners: c.owners ?? 0 }))
    .filter((c) => c.name !== "");

  return {
    counties,
    totalOwners:
      data.totalOwners ??
      data.total ??
      counties.reduce((sum, c) => sum + c.owners, 0),
    pending: data.pending === true,
  };
}

/* ============================================================================
   2 · GET /owners/search — the finder
   ============================================================================ */

export interface OwnerSearchResult {
  owners: OwnerRecord[];
  /** How many matched in total, which can exceed the rows returned. */
  total: number;
  /** The backend capped the result set. */
  truncated: boolean;
}

/**
 * AT LEAST ONE PARAMETER IS REQUIRED and they combine. Empty strings are
 * dropped rather than sent: a blank `name=` is not the same request as no name.
 *
 * `operator` IS NOT SENT AND CANNOT BE — the endpoint answers 400 for it, since
 * no roll carries an operator. That is why step 1's Operator field is disabled
 * rather than merely empty.
 *
 * STATEWIDE IS THE ABSENCE OF `county`, never a literal "*": the backend 404s
 * on that.
 */
export async function searchOwners(query: {
  q?: string;
  name?: string;
  lease?: string;
  county?: string;
  address?: string;
  street?: string;
  city?: string;
  zip?: string;
  page?: number;
  limit?: number;
}): Promise<OwnerSearchResult> {
  const p = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    const v = typeof value === "number" ? String(value) : value?.trim();
    if (v) p.set(key, v);
  }
  if ([...p.keys()].length === 0) {
    throw new Error("Enter a name, a lease or a county to search.");
  }

  const data = await getJson<{
    owners?: WireOwner[];
    total?: number;
    truncated?: boolean;
  }>(`${OWNERS}/search?${p}`, "run that search");

  if (!Array.isArray(data.owners)) {
    throw new Error(
      "The search results came back in a shape we don't recognise.",
    );
  }

  return {
    owners: data.owners.map(toRecord),
    total: data.total ?? data.owners.length,
    truncated: data.truncated === true,
  };
}

/* ============================================================================
   3 · GET /owners/lease-owners — everyone else on one lease
   ============================================================================ */

/**
 * EXACT MEMBERSHIP ONLY — fuzzy scoring never links an owner to a lease, so
 * this is the only honest way to answer "who else is on this?".
 *
 * PREFER `leasenumber`: with a county or district it answers in about 300ms,
 * against roughly four seconds for a lease NAME. The caller passes whichever it
 * has and this sends the faster one when both are present.
 *
 * LEADING ZEROS ARE SIGNIFICANT — `015896` and `15896` are different leases —
 * which is why the number is a string end to end and never parsed.
 *
 * NOT CALLED BY THE FIVE-STEP FLOW TODAY. It is here so the set of six is
 * complete: a co-owners view on step 4 is one component away.
 */
export async function fetchLeaseOwners(params: {
  leasenumber?: string | null;
  lease?: string;
  county?: string;
  districtcode?: string;
}): Promise<OwnerRecord[]> {
  const p = new URLSearchParams();
  if (params.leasenumber) p.set("leasenumber", params.leasenumber);
  else if (params.lease) p.set("lease", params.lease);
  else throw new Error("A lease number or lease name is required.");

  if (params.county) p.set("county", params.county);
  if (params.districtcode) p.set("districtcode", params.districtcode);

  const data = await getJson<{ owners?: WireOwner[] }>(
    `${OWNERS}/lease-owners?${p}`,
    "load that lease's owners",
  );

  if (!Array.isArray(data.owners)) {
    throw new Error(
      "That lease's owners came back in a shape we don't recognise.",
    );
  }
  return data.owners.map(toRecord);
}

/* ============================================================================
   4 · GET /owners/same-name — "is this you?", and the statewide lease set
   ============================================================================ */

/**
 * THE ADDRESS IS WHAT MAKES THIS USEFUL. Called with a name alone the endpoint
 * returns the matching records and an EMPTY `allLeases` with no `selected` —
 * measured against the live API. With the address it returns the picked record
 * in full, the same name at other addresses, and the statewide totals the claim
 * will actually take. Steps 3, 4 and 5 all read one call's answer.
 *
 * WHY THE STATEWIDE TOTALS MATTER: a county view under-reports. The backend's
 * own example is a name showing 19 leases in Archer that holds 22 across two
 * counties, and a claim takes all 22.
 *
 * `county` is accepted by the endpoint and ignored, so it is not sent.
 */
export async function fetchSameName(
  name: string,
  address: string,
): Promise<SameNameResult> {
  if (!name.trim()) throw new Error("An owner name is required.");

  const p = new URLSearchParams({ name });
  if (address) p.set("address", address);

  const data = await getJson<{
    selected?: WireOwner | null;
    records?: WireOwner[];
    allLeases?: WireAllLeases;
  }>(`${OWNERS}/same-name?${p}`, "check that record");

  const selected = data.selected ? toRecord(data.selected) : null;
  const others = Array.isArray(data.records) ? data.records.map(toRecord) : [];

  return { selected, others, all: toLeaseSet(data.allLeases, selected) };
}

/* ============================================================================
   5 · POST /owners/claim — the write
   ============================================================================ */

/**
 * MEMBERS ONLY: the endpoint rejects a visitor id with a 400, so an anonymous
 * reader must sign in first. Step 3 disables Confirm and says so rather than
 * offering a button that cannot work.
 *
 * OWNER NAMES ARE THE UNIT OF A CLAIM. The backend resolves each name's leases
 * itself and takes every one it holds STATEWIDE — not just the county that was
 * searched — writing `membersclaimedleases` and `claimed_owners` in one
 * transaction. Up to 25 names per call.
 *
 * IT RETURNS THE BODY RATHER THAN FIRING AND FORGETTING, because partial
 * success is normal: each name comes back filed or refused, and a refusal shown
 * as a success is the worst thing a receipt can do.
 */
export async function postClaim(
  memberId: number,
  ownerNames: string[],
): Promise<ClaimResult> {
  if (ownerNames.length === 0) {
    throw new Error("Pick at least one record to claim.");
  }
  if (ownerNames.length > 25) {
    throw new Error("A single claim can cover at most 25 owner records.");
  }

  let res: Response;
  try {
    res = await fetch(`${OWNERS}/claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        member_id: memberId,
        mineralOwners: ownerNames.map((ownername) => ({ ownername })),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (cause) {
    throw new Error("Could not reach the records service to file your claim.", {
      cause,
    });
  }
  if (!res.ok) {
    throw new Error(
      `The records service could not file your claim (${res.status}).`,
    );
  }
  return (await res.json()) as ClaimResult;
}

/* ============================================================================
   6 · POST /owners/address-correction — "Wrong address?"
   ============================================================================ */

/**
 * THE ENDPOINT WANTS EXACTLY ONE IDENTITY: `member_id` for a signed-in member,
 * `visitorId` for an anonymous visitor. Sending the visitor id for a member
 * would file the correction against a guest rather than the account, so the
 * member id wins whenever there is one.
 *
 * `owner` and `newAddress` are required by the contract; the rest are optional
 * context and are only sent when present.
 *
 * FIRE-AND-FORGET BY DESIGN. It returns nothing the flow acts on, so the button
 * acknowledges in place rather than waiting on a response — and a failure here
 * must never interrupt a claim that is otherwise fine, which is why the promise
 * is swallowed.
 */
export function postAddressCorrection(
  body: {
    owner: string;
    newAddress: string;
    county?: string;
    oldAddress?: string;
    ownerNumber?: string;
  },
  memberId?: number | null,
): void {
  const identity =
    typeof memberId === "number"
      ? { member_id: memberId }
      : { visitorId: visitorId() };

  fetch(`${OWNERS}/address-correction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, ...identity }),
  }).catch(() => {});
}

/* ============================================================================
   4b · SEVERAL RECORDS AT ONCE — `/same-name` per pick, merged
   ============================================================================ */

/**
 * Step 2 allows more than one record to be ticked, so this resolves the whole
 * selection in one call from the flow's point of view.
 *
 * ── ONE REQUEST PER RECORD, IN PARALLEL ──
 *
 * `/same-name` is keyed on name AND address — the address is what makes it
 * return `selected` and the statewide totals — so a set of records cannot be
 * asked for in a single request. They go together with `Promise.all` rather
 * than in sequence: at ~4s each, five picks in series is twenty seconds of
 * staring at a spinner.
 *
 * ── EVERYTHING IS DEDUPLICATED ON THE WAY OUT ──
 *
 * `allLeases` is keyed on the owner NAME, so two picked records that share a
 * name return the SAME lease set. Concatenating would double every figure on
 * steps 4 and 5. Leases are keyed county+name (a lease number is null outside
 * the record's own county and is not unique across counties either), and the
 * "other address" records are keyed county+name+address.
 *
 * A record the reader already picked is never also listed as an "other": it is
 * theirs by selection, not a candidate to consider.
 */
export async function fetchClaimSet(
  picked: OwnerRecord[],
): Promise<ClaimSet> {
  if (picked.length === 0) throw new Error("Pick at least one record.");

  const answers = await Promise.all(
    picked.map((r) => fetchSameName(r.name, r.address)),
  );

  /* The endpoint's own view of each pick where it has one; the row the reader
     ticked otherwise, so a record never silently disappears from the list. */
  const records = answers.map((a, i) => a.selected ?? picked[i]);

  const pickedKeys = new Set(
    records.map((r) => `${r.county}|${r.name}|${r.address}`),
  );
  const others = new Map<string, OwnerRecord>();
  for (const answer of answers) {
    for (const other of answer.others) {
      const key = `${other.county}|${other.name}|${other.address}`;
      if (!pickedKeys.has(key)) others.set(key, other);
    }
  }

  const leases = new Map<string, FlowLease>();
  for (const answer of answers) {
    for (const lease of answer.all.leases) {
      leases.set(`${lease.county}|${lease.name}`, lease);
    }
  }

  const unique = [...leases.values()];
  const countyNames = [...new Set(unique.map((l) => l.county).filter(Boolean))];

  return {
    records,
    others: [...others.values()],
    all: {
      leases: unique,
      leaseCount: unique.length,
      appraisedValue: unique.reduce((sum, l) => sum + l.value, 0),
      countyCount: countyNames.length,
      countyList: countyNames.join(", "),
    },
  };
}

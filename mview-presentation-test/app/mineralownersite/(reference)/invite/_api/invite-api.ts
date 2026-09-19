import type { GreetingStyle, OwnerKind } from "../_lib/invite-types";

/**
 * THE INVITE PAGE'S ENTIRE API LAYER — all five backend calls, in one file, in
 * its own folder, exactly as the claim flow arranges its `_api/claim-api.ts`.
 *
 * ── IT CALLS `/api/invite/*` ON OUR OWN ORIGIN, NEVER THE BACKEND ──
 *
 * The invite service lives on `MINERALVIEW_API_BASE_URL`, which is server-only
 * on purpose, and every call needs a `member_id` this page must not be trusted
 * to choose. `app/api/invite/[endpoint]/route.ts` supplies both: it reads the
 * member off the session cookie and forwards to the service. What this module
 * knows is the three same-origin paths and the shapes that come back.
 *
 * ── WIRE SHAPES IN, VIEW SHAPES OUT ──
 *
 * The contract's responses are snake_case and carry far more than the page
 * reads (`identity_basis`, `roll_rows`, raw address blocks). Each fetcher maps
 * to a small camelCase view type here, so a contract field renaming reaches one
 * file — and so the components never learn a shape they would then depend on.
 *
 * TWO CONTRACT RULES ARE ENFORCED IN THE MAPPING, where they cannot be
 * forgotten by a component:
 *
 *   `owner_key` IS THE IDENTITY — never an array index, never the bare number.
 *   The list is sorted by share, so an index addresses a different person the
 *   moment the roll changes, and some owners have no number at all. Every view
 *   type carries `ownerKey` and every tick and code keys off it.
 *
 *   A NULL SHARE IS "NOT FILED", NEVER 0%. `sharePct` stays null through the
 *   mapping and the row renders the words.
 *
 * ── ERRORS ARRIVE IN ONE ENVELOPE AND LEAVE AS ONE ERROR TYPE ──
 *
 * Everything — the backend's own errors, the proxy's not-signed-in, a dead
 * network — surfaces as `InviteApiError` with a `code` the workbench can
 * branch on (`INVITE_NO_CLAIM` → the claim-first notice) and a `message`
 * readable enough to show verbatim.
 */

/* ============================================================================
   ERRORS
   ============================================================================ */

export class InviteApiError extends Error {
  /** The backend's error code — `INVITE_NO_CLAIM`, `RATE_LIMITED`, … — or a
   *  transport code of our own (`UNREACHABLE`, `BAD_SHAPE`). */
  readonly code: string;
  readonly status: number;

  constructor(code: string, status: number, message: string) {
    super(message);
    this.name = "InviteApiError";
    this.code = code;
    this.status = status;
  }
}

/** The one envelope every error uses — see the contract's Errors table. */
interface ErrorEnvelope {
  error?: {
    statusCode?: number;
    code?: string;
    message?: string;
  };
}

/** 60s, matching the proxy's own ceiling on the upstream call. */
const TIMEOUT_MS = 60_000;

async function request<T>(
  url: string,
  what: string,
  init?: RequestInit & { signal?: AbortSignal },
): Promise<T> {
  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, {
      cache: "no-store",
      ...init,
      signal: init?.signal
        ? AbortSignal.any([timeout, init.signal])
        : timeout,
    });
  } catch (cause) {
    /* A caller's own abort must not be reported as an outage — it re-throws so
       the effect that cancelled can recognise its own signal. */
    if (init?.signal?.aborted) throw cause;
    throw new InviteApiError(
      "UNREACHABLE",
      0,
      `Could not reach the service to ${what}.`,
    );
  }

  if (res.status === 204) return undefined as T;

  if (!res.ok) {
    let envelope: ErrorEnvelope | null = null;
    try {
      envelope = (await res.json()) as ErrorEnvelope;
    } catch {
      /* fall through to the generic sentence */
    }
    throw new InviteApiError(
      envelope?.error?.code ?? "UPSTREAM_FAILED",
      res.status,
      envelope?.error?.message ?? `The service could not ${what} (${res.status}).`,
    );
  }

  try {
    return (await res.json()) as T;
  } catch {
    throw new InviteApiError(
      "BAD_SHAPE",
      res.status,
      "The service sent an unreadable reply.",
    );
  }
}

/* ============================================================================
   VIEW SHAPES — what the components read
   ============================================================================ */

/** One claimed owner identity on this member's record — see `activeOwner`. */
export interface ClaimedOwner {
  name: string;
  ownerNumber: string | null;
  /** True for the identity the account is currently looking through. */
  active: boolean;
}

/** One lease the member has claimed — the step 1 dropdown's row. */
export interface LeaseChoice {
  /** `02_290271` — passed straight back on every later call. */
  leaseId: string;
  /**
   * THE DROPDOWN ROW, WRITTEN HERE AND NOT TAKEN FROM THE SERVICE.
   *
   * The contract's own `label` is `NAME · Lease 15203`, and QA asked for the
   * word "Lease" out and the number in brackets — `NAME (15203)`. The service
   * keeps sending its form (other clients read it); this composes the one this
   * page shows, from the same two fields the service composed its own from.
   * A lease filed with no number is its name alone rather than an empty pair
   * of brackets. Defect sheet · Invite co-owners row 2.
   */
  label: string;
  leaseName: string;
  leaseNumber: string | null;
  /** Every county the lease was claimed under — a lease can straddle a line. */
  counties: string[];
  /** The claimed identity this lease came through. */
  ownerName: string | null;
  /** A decimal (`0.05138` = 5.138%), or null when the roll filed nothing. */
  decimalInterest: number | null;
}

/** One other owner of record on the chosen lease — the step 2 checkbox row. */
export interface RollCoOwner {
  /** The stable handle. THE identity — see the module header. */
  ownerKey: string;
  ownerNumber: string | null;
  name: string;
  kind: OwnerKind;
  city: string | null;
  state: string | null;
  zip: string | null;
  /**
   * THE POSTING BLOCK AS THE ROLL FILED IT, one or two lines.
   *
   * Kept because `city` is frequently NULL while the address is perfectly
   * present: the roll files the town inside the street line in some counties
   * and the service will not guess where it ends (`address.whole`). The row
   * showed "no address on the roll" for every one of those owners, which is a
   * statement about the roll that was not true. Defect sheet row 8.
   */
  addressLines: string[];
  /** Percent (`0.1777` = 0.1777%), or null when the roll filed no interest. */
  sharePct: number | null;
  /**
   * THE ROLL'S OWN `Interest_Value` — a decimal, not a percentage.
   *
   * This is what the Share column prints. The percentage is a conversion this
   * page was doing to a figure the appraisal roll files as a decimal, and a
   * reader checking the page against their own roll extract had to undo it.
   * Defect sheet row 4.
   */
  shareDecimal: number | null;
}

/** The step 2 list plus the whole-lease tallies the card prints. */
export interface LeaseRoster {
  owners: RollCoOwner[];
  /** Whole-lease counts, even when a filter narrowed `owners`. */
  counts: {
    owners: number;
    people: number;
    companies: number;
    trusts: number;
    operators: number;
  };
  /** The contract's ready-to-render sentence about the roll read. */
  note: string | null;
  /** True when the lease holds more rows than this page of them. */
  truncated: boolean;
}

/** One written email, exactly as the service rendered it. */
export interface InviteEmailView {
  ownerKey: string;
  to: string;
  kind: OwnerKind;
  greeting: string;
  heading: string;
  subject: string;
  /** `31597778` / `3159-7778` — display always uses the label. */
  code: string;
  codeLabel: string;
  inviteUrl: string;
  sender: string;
  /** Greeting through signature, for the on-screen preview. */
  bodyText: string;
  /**
   * THE BODY ALONE, PARAGRAPH BY PARAGRAPH — what `body` renders into.
   *
   * `bodyText` is the whole letter: greeting, body, link, signature and the
   * closing note. Only the middle is editable, and "Customize invitation" was
   * opening a LOCAL template that had drifted from the words on screen — the
   * reader saw one letter and edited another. These are the service's own
   * paragraphs, which `templateFrom` turns back into the template that
   * produced them. Defect sheet row 14.
   */
  paragraphs: string[];
  /** Subject + blank line + body. THE COPY BUTTON'S PAYLOAD, verbatim. */
  copyText: string;
  /** Why this one wants a second look before it goes out, or null. */
  caution: string | null;
}

/** What one POST changed — the emails minted plus anything that could not be. */
export interface RecordOutcome {
  emails: InviteEmailView[];
  /** Owners the roll no longer carries for this lease — untick, show the note. */
  notOnRoll: { requested: string; note: string | null }[];
}

/** The recorded state for one lease — restores ticks after a reload. */
export interface InviteSnapshot {
  emails: InviteEmailView[];
}

/** The three wording choices every render of the emails depends on. */
export interface InviteWording {
  greeting: GreetingStyle;
  custom: string;
  /** The letter template. Null sends nothing and takes the service's default. */
  body: string | null;
}

/* ============================================================================
   WIRE SHAPES — only what the mappers touch
   ============================================================================ */

interface WireLease {
  lease_id?: string;
  label?: string;
  lease_name?: string;
  lease_number?: string | null;
  county?: string;
  counties?: string[];
  owner?: { name?: string; owner_number?: string } | null;
  decimal_interest?: number | null;
}

interface WireClaimedOwner {
  name?: string;
  owner_number?: string | null;
  active?: boolean;
}

interface WireLeasesResponse {
  leases?: WireLease[];
  owners?: WireClaimedOwner[];
  owner_filter?: string | null;
  page?: { total?: number };
}

interface WireOwner {
  owner_key?: string;
  owner_number?: string | null;
  name?: string;
  kind?: string;
  city?: string | null;
  address?: {
    city?: string | null;
    state?: string | null;
    zip?: string | null;
    lines?: string[];
  } | null;
  share?: { percent?: number | null; decimal?: number | null } | null;
}

interface WireOwnersResponse {
  owners?: WireOwner[];
  page?: { total?: number };
  counts?: {
    owners?: number;
    people?: number;
    companies?: number;
    trusts?: number;
    operators?: number;
  };
  note?: string | null;
}

interface WireEmail {
  owner_key?: string;
  to?: string;
  kind?: string;
  greeting?: string;
  heading?: string;
  subject?: string;
  code?: string;
  code_label?: string;
  invite_url?: string;
  sender?: string;
  body_text?: string;
  paragraphs?: string[];
  copy_text?: string;
  caution?: string | null;
}

interface WirePostResponse {
  results?: {
    requested?: string;
    status?: "invited" | "already_invited" | "not_on_roll";
    email?: WireEmail | null;
    note?: string | null;
  }[];
}

interface WireGetInvitesResponse {
  invited?: { active?: boolean }[];
  emails?: WireEmail[];
  copy_all?: string | null;
}

/* ============================================================================
   MAPPERS
   ============================================================================ */

const KINDS: readonly OwnerKind[] = ["person", "company", "trust", "operator"];

/** An unrecognised kind renders as a company: greeted by its own name and
 *  never promised a credit — the two failure modes that matter. */
function kindOf(raw: string | undefined): OwnerKind {
  return KINDS.includes(raw as OwnerKind) ? (raw as OwnerKind) : "company";
}

function toEmailView(wire: WireEmail): InviteEmailView | null {
  if (!wire.owner_key || !wire.copy_text) return null;
  return {
    ownerKey: wire.owner_key,
    to: wire.to ?? "",
    kind: kindOf(wire.kind),
    greeting: wire.greeting ?? "",
    heading: wire.heading ?? "",
    subject: wire.subject ?? "",
    code: wire.code ?? "",
    codeLabel: wire.code_label ?? wire.code ?? "",
    inviteUrl: wire.invite_url ?? "",
    sender: wire.sender ?? "",
    bodyText: wire.body_text ?? "",
    paragraphs: wire.paragraphs ?? [],
    copyText: wire.copy_text,
    caution: wire.caution ?? null,
  };
}

/** The wording as query parameters — GET re-renders without writing anything. */
function wordingParams(params: URLSearchParams, wording: InviteWording): void {
  if (wording.greeting !== "first") params.set("greeting", wording.greeting);
  if (wording.greeting === "custom" && wording.custom.trim())
    params.set("custom", wording.custom.trim());
  if (wording.body !== null) params.set("body", wording.body);
}

/**
 * "Copy all N" as one block — BUILT HERE, NOT FETCHED.
 *
 * The service returns a `copy_all` too, but only for the call that produced
 * it: after a tick the accurate one would cost a second round trip, and that
 * round trip was most of what made a tick feel slow. The separator format is
 * the service's own (and the reference build's before it): a rule naming the
 * recipient and code, so a reader working down twenty pastes can see where one
 * letter ends.
 */
export function buildCopyAll(emails: InviteEmailView[]): string | null {
  if (emails.length < 2) return null;
  return emails
    .map((email, index) =>
      [
        `----- ${index + 1} of ${emails.length} · to ${email.to}  (code ${email.codeLabel}) -----`,
        "",
        `Subject: ${email.subject}`,
        "",
        email.bodyText,
      ].join("\n"),
    )
    .join("\n\n\n");
}

/** Every regex metacharacter in a name or a URL, made literal. */
function literal(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * THE LETTER ON SCREEN, TURNED BACK INTO THE TEMPLATE THAT PRODUCED IT.
 *
 * "Customize invitation" used to open a template held in this repo, and that
 * template had drifted from the service's own wording — the reader saw one
 * letter in the preview, pressed edit, and was handed a different one to
 * change. Defect sheet row 14.
 *
 * SO THE EDITOR IS SEEDED FROM THE LETTER ITSELF. The service returns the body
 * it rendered as `paragraphs`; this walks the four substitutions backwards —
 * the code, the claim link, the recipient and the lease — so what opens in the
 * textarea is the words on screen with the per-person parts back in their
 * braces. Edit it and every recipient still gets their own name and their own
 * code, which is the whole reason the tokens exist.
 *
 * IT RETURNS NULL WHEN THERE IS NOTHING TO SEED FROM. A letter with no
 * paragraphs means the service sent a shape this cannot read, and the caller
 * falls back to the standard letter rather than opening an empty box.
 */
export function templateFrom(email: InviteEmailView): string | null {
  if (!email.paragraphs.length) return null;
  let body = email.paragraphs.join("\n\n");

  /* THE LINK BEFORE THE CODE. `invite_url` is the claim link WITH the code
     hung off it, and `{url}` renders as the same link WITHOUT — so the base
     has to go first or the code inside the longer one is replaced separately
     and leaves a broken half-link behind. */
  const base = email.inviteUrl.split("?")[0];
  /* `JOE HINDES 'D' UNIT · Lease 16743 · ATASCOSA County` — the service's own
     heading, and its first part is the lease name `{lease}` renders as. It was
     the one substitution this did not reverse, so the lease was left written
     into the template in longhand: edit it and every recipient on every other
     lease would have been told they own a share of that one. */
  const leaseName = email.heading.split(" · ")[0]?.trim() ?? "";
  for (const [text, token] of [
    [email.inviteUrl, "{url}"],
    [base, "{url}"],
    [email.codeLabel, "{code}"],
    [email.code, "{code}"],
    [email.to, "{name}"],
    [leaseName, "{lease}"],
  ] as [string, string][]) {
    if (text) body = body.replace(new RegExp(literal(text), "g"), token);
  }
  return body;
}

/* ============================================================================
   THE FIVE CALLS
   ============================================================================ */

/**
 * ONE PAGE OF LEASES IS 100 ROWS, NOT 500. The 500-row read was measured at
 * 1.7–2.2s and 153KB on the dev service and it was the page's first paint
 * waiting for it; 100 answers in a fraction of that, and the search box covers
 * the rest of a 3,529-lease record — which the one-shot 500 never did.
 */
export const LEASES_PAGE = 100;

/**
 * `BRISCOE COCHINA EAST RANCH (15203)` — see `LeaseChoice.label`.
 *
 * Exported because the picker draws the chosen lease's name in two places and
 * both have to agree with the option the reader picked.
 */
export function leaseLabel(name: string, number: string | null): string {
  const named = name.trim();
  if (!named) return number ? `(${number})` : "";
  return number ? `${named} (${number})` : named;
}

/** The wire→view mapping, exported so the server-side prefetch shares it. */
export function mapLeasesResponse(data: WireLeasesResponse): {
  leases: LeaseChoice[];
  total: number;
  owners: ClaimedOwner[];
  /** The claimed identity the account is looking through, when it names one. */
  activeOwner: string | null;
} {
  const leases = (data.leases ?? [])
    .filter((lease) => typeof lease.lease_id === "string")
    .map((lease) => ({
      leaseId: lease.lease_id as string,
      label:
        leaseLabel(lease.lease_name ?? "", lease.lease_number ?? null) ||
        lease.label ||
        (lease.lease_id as string),
      leaseName: lease.lease_name ?? "",
      leaseNumber: lease.lease_number ?? null,
      counties: lease.counties?.length
        ? lease.counties
        : lease.county
          ? [lease.county]
          : [],
      ownerName: lease.owner?.name ?? null,
      decimalInterest: lease.decimal_interest ?? null,
    }));

  const owners = (data.owners ?? [])
    .filter((owner) => typeof owner.name === "string" && owner.name !== "")
    .map((owner) => ({
      name: owner.name as string,
      ownerNumber: owner.owner_number ?? null,
      active: owner.active === true,
    }));

  return {
    leases,
    total: data.page?.total ?? leases.length,
    owners,
    activeOwner: owners.find((owner) => owner.active)?.name ?? null,
  };
}

/**
 * Step 1 — GET /invite/leases. One row per claimed lease.
 *
 * `owner` NARROWS TO ONE CLAIMED IDENTITY, and it is what makes the picker
 * agree with the owner the top bar is showing. The contract lists every
 * identity the member has claimed when the parameter is omitted — "an invite
 * is sent by the member, not by one of their owner records" — which is why
 * switching owner in the chrome left the same 4,461 leases on offer. Defect
 * sheet row 23.
 */
export async function fetchInviteLeases(options?: {
  q?: string;
  owner?: string | null;
  limit?: number;
  offset?: number;
  signal?: AbortSignal;
}): Promise<{
  leases: LeaseChoice[];
  total: number;
  owners: ClaimedOwner[];
  activeOwner: string | null;
}> {
  const params = new URLSearchParams();
  if (options?.q?.trim()) params.set("q", options.q.trim());
  if (options?.owner?.trim()) params.set("owner", options.owner.trim());
  params.set("limit", String(options?.limit ?? LEASES_PAGE));
  if (options?.offset) params.set("offset", String(options.offset));

  const data = await request<WireLeasesResponse>(
    `/api/invite/leases?${params}`,
    "list your claimed leases",
    { signal: options?.signal },
  );

  return mapLeasesResponse(data);
}

/** Step 2 — GET /invite/owners. Everyone else on the roll for one lease. */
export async function fetchLeaseRoster(
  leaseId: string,
  options?: { limit?: number; signal?: AbortSignal },
): Promise<LeaseRoster> {
  const params = new URLSearchParams({
    lease: leaseId,
    limit: String(options?.limit ?? 500),
  });

  const data = await request<WireOwnersResponse>(
    `/api/invite/owners?${params}`,
    "read the co-owner roll",
    { signal: options?.signal },
  );

  const owners = (data.owners ?? [])
    .filter((owner) => typeof owner.owner_key === "string")
    .map((owner) => ({
      ownerKey: owner.owner_key as string,
      ownerNumber: owner.owner_number ?? null,
      name: owner.name ?? "",
      kind: kindOf(owner.kind),
      city: owner.city ?? owner.address?.city ?? null,
      state: owner.address?.state ?? null,
      zip: owner.address?.zip ?? null,
      addressLines: owner.address?.lines ?? [],
      sharePct: owner.share?.percent ?? null,
      shareDecimal: owner.share?.decimal ?? null,
    }));

  const counts = {
    owners: data.counts?.owners ?? owners.length,
    people: data.counts?.people ?? 0,
    companies: data.counts?.companies ?? 0,
    trusts: data.counts?.trusts ?? 0,
    operators: data.counts?.operators ?? 0,
  };

  return {
    owners,
    counts,
    note: data.note ?? null,
    truncated: (data.page?.total ?? owners.length) > owners.length,
  };
}

/**
 * Step 3 — POST /invite/co-owners. Records the ticks, mints the codes, returns
 * the written emails.
 *
 * `already_invited` IS A SUCCESS: the box was ticked before and the email
 * carries the code issued then, so it lands in `emails` beside the fresh ones.
 * Only `not_on_roll` is reported separately — it is the one status where there
 * is no email to show.
 */
export async function recordInvites(
  leaseId: string,
  ownerKeys: string[],
  wording: InviteWording,
): Promise<RecordOutcome> {
  const body: Record<string, unknown> = {
    lease: leaseId,
    owners: ownerKeys,
    greeting: wording.greeting,
  };
  if (wording.greeting === "custom" && wording.custom.trim())
    body.custom = wording.custom.trim();
  if (wording.body !== null) body.body = wording.body;

  const data = await request<WirePostResponse>(
    "/api/invite/co-owners",
    "record the invites",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
  );

  const emails: InviteEmailView[] = [];
  const notOnRoll: RecordOutcome["notOnRoll"] = [];
  for (const result of data.results ?? []) {
    if (result.status === "not_on_roll") {
      notOnRoll.push({
        requested: result.requested ?? "",
        note: result.note ?? null,
      });
      continue;
    }
    const email = result.email ? toEmailView(result.email) : null;
    if (email) emails.push(email);
  }
  return { emails, notOnRoll };
}

/**
 * GET /invite/co-owners — restore the ticks after a reload, and re-render
 * every email under different wording WITHOUT writing anything: the codes are
 * already reserved, so re-rendering cannot change them.
 *
 * `invited[i]` and `emails[i]` are index-aligned, and the pairing is used to
 * keep only ACTIVE rows — the contract's own known gap is that inactive
 * co-owners can appear in `emails` unmarked, and an email carrying a revoked
 * code must never reach the copy button.
 */
export async function fetchInvites(
  leaseId: string,
  wording: InviteWording,
  signal?: AbortSignal,
): Promise<InviteSnapshot> {
  const params = new URLSearchParams({ lease: leaseId });
  wordingParams(params, wording);

  const data = await request<WireGetInvitesResponse>(
    `/api/invite/co-owners?${params}`,
    "load your recorded invites",
    { signal },
  );

  const invited = data.invited ?? [];
  const emails = (data.emails ?? [])
    .filter((_, index) => invited[index]?.active !== false)
    .map(toEmailView)
    .filter((email): email is InviteEmailView => email !== null);

  return { emails };
}

/**
 * DELETE /invite/co-owners — untick. Deactivates, never deletes: the code may
 * already be in a sent email, and re-ticking later returns the same one. A 204
 * means the end state is correct, including for a box that was never ticked.
 */
export async function revokeInvites(
  leaseId: string,
  ownerKeys: string[],
): Promise<void> {
  await request<void>("/api/invite/co-owners", "withdraw the invite", {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ lease: leaseId, owners: ownerKeys }),
  });
}

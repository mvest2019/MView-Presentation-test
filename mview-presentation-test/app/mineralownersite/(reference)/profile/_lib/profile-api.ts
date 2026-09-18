import "server-only";

import {
  apiBase,
  OwnerApiError,
  type ApiErrorBody,
} from "../../../_lib/reference/owner-api";

/**
 * `mineralview-api` — the My-profile endpoints (`PROFILE-API-FRONTEND.md`,
 * backend branch `feat/users-profile`, module `src/modules/users`).
 *
 *   GET   /api/v1/users/me?member_id            the whole screen
 *   PATCH /api/v1/users/me                      save the form (dirty fields only)
 *   PATCH /api/v1/users/me/email                change the sign-in address
 *   PUT   /api/v1/users/me/password             change the password
 *   POST  /api/v1/email-verification/send-code  step 1 of the email change
 *   POST  /api/v1/email-verification/verify-code step 2 of the email change
 *
 * and the device panel (backend `src/modules/sessions`, branch
 * `auto_log_out_devices`), which closes §7 — the contract's "the device list on
 * screen today is not real data":
 *
 *   GET   /api/v1/users/me/sessions                    the live devices
 *   POST  /api/v1/users/me/sessions/sign-out           end one
 *   POST  /api/v1/users/me/sessions/sign-out-others    end everything but this
 *
 * SAME HOST, SAME ENVELOPE AS `owner-api.ts` / `member-api.ts`. The contract's
 * error shape is byte-for-byte the `ApiErrorBody` those clients already decode
 * — `{error: {statusCode, code, message, details?, requestId}}` — so failures
 * are thrown as the same `OwnerApiError` rather than a third error type, and
 * `error.code` is what callers switch on. Messages are prose and get reworded.
 *
 * `member_id` IS CALLER-SUPPLIED AND IS NOT AUTHENTICATION — there is no auth
 * guard on the backend yet. It arrives here as an argument on every call and
 * the ONLY caller is `profile-actions.ts`, which reads it from the session
 * cookie. When the auth guard lands and the id comes off the bearer token,
 * these signatures lose one parameter and nothing else moves — that is the
 * contract's "member_id comes from one place, ready to be deleted".
 *
 * NOTHING HERE IS CACHED. Every response sends `Cache-Control: private,
 * no-store`; `cache: 'no-store'` keeps Next's side matching.
 *
 * `server-only` for the same reason as its two siblings: the host stays out of
 * the bundle, and a password must never be posted from the browser to another
 * origin.
 */

/** where the API is — the same host the Dashboard and Alerts read */
export function profileApiBase(): string | null {
  return apiBase();
}

/** the same generous deadline the sibling clients use */
const TIMEOUT_MS = 60_000;

/* ------------------------------------------------------------ the contract */

export interface MailingAddress {
  street: string | null;
  city: string | null;
  /** an ID against the states master, not a name. No states list ships in this
   *  repo yet, so the form neither edits nor sends it — omitted, not cleared. */
  state_master_id: number | null;
  zip: string | null;
  /** the parts joined for display; null when nothing is stored */
  one_line: string | null;
}

export interface PasswordInfo {
  /** false on a Google account — the change-password button must gate on this */
  set: boolean;
  /** the sentence to show where the change control would be, when `set` is false */
  unavailable_reason: string | null;
  /*
   * NO `last_changed_at` / `last_changed_label` ANY MORE. The contract's
   * second revision (PROFILE-API-FRONTEND 1.md §2, 2026-09-17) dropped them:
   * `members_entity` records that a password EXISTS and nothing about when it
   * was written, so the API cannot answer "last changed 4 months ago" — and
   * the column an earlier revision added for it is what 500ed every GET. The
   * screen's "last changed" line went with them, and it must NOT fall back to
   * `member_since`, which is a different fact.
   */
}

export interface UserProfile {
  member_id: number;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  /** pre-formatted for the avatar circle; null means a PLAIN circle, not "?" */
  initials: string | null;
  email: string;
  email_verified: boolean;
  /** null when not stored, never "" */
  phone: string | null;
  /**
   * The avatar photo's URL, SERVER-BUILT, cache-buster (`v`) and all — null
   * when none has been uploaded, which is the signal to fall back to the
   * letter. Treat it as OPAQUE: do not reassemble it from `member_id` and do
   * not strip its `v`, which is what makes a replaced photo repaint (§2/§11).
   *
   * It is root-relative to the API'S OWN ORIGIN, which the browser never
   * learns — the strip renders it through this app's `/api/profile-image`
   * proxy, passing the whole URL through untouched.
   */
  profile_image_url: string | null;
  mailing_address: MailingAddress;
  password: PasswordInfo;
  member_since: string;
}

/** what both writes answer: the fresh profile plus exactly what moved.
 *  `changed: []` is a SUCCESS where nothing differed — "No changes", not an error. */
export interface ProfileWriteResult {
  profile: UserProfile;
  changed: string[];
}

/**
 * The PATCH body, minus `member_id`. SEND ONLY WHAT IS DIRTY: `""` clears a
 * field and omitting it leaves it alone, so an untouched empty input that gets
 * serialised anyway DELETES the stored value. `email` is refused here (400,
 * unrecognized key), which is why the type cannot carry it.
 */
export interface ProfilePatch {
  full_name?: string;
  phone?: string;
  /** the street line only */
  mailing_address?: string;
  city?: string;
  zip?: string;
}

/* ------------------------------------------------------------- the request */

async function req(
  base: string,
  route: string,
  init: {
    method?: string;
    params?: Record<string, string>;
    body?: Record<string, unknown>;
    /**
     * The member's bearer token, for the routes that VERIFY one.
     *
     * Only the three device routes do. It is attached as a header rather than
     * put in a body or a query, so it never reaches a URL — and it is never
     * logged: the line below records the route and the status, never the
     * headers.
     */
    token?: string;
  } = {},
): Promise<Response> {
  const qs = init.params ? "?" + new URLSearchParams(init.params) : "";
  const url = `${base}/api/v1${route}${qs}`;
  const method = init.method ?? "GET";
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      method,
      cache: "no-store",
      headers: {
        accept: "application/json",
        ...(init.body ? { "content-type": "application/json" } : {}),
        ...(init.token ? { authorization: `Bearer ${init.token}` } : {}),
      },
      ...(init.body ? { body: JSON.stringify(init.body) } : {}),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    /* one line per outbound call, exactly as `member-api.ts` argues for: these
       run server-side and are otherwise invisible in both the browser and the
       terminal */
    console.info(
      `[mineralview-api] ${method} /api/v1${route} ${res.status} ${Date.now() - t0}ms`,
    );
    return res;
  } catch (e) {
    const timedOut = e instanceof Error && e.name === "TimeoutError";
    console.info(
      `[mineralview-api] ${method} /api/v1${route} ${timedOut ? "TIMEOUT" : "UNREACHABLE"} ${Date.now() - t0}ms`,
    );
    throw new OwnerApiError(route, 0, {
      statusCode: 0,
      code: timedOut ? "CLIENT_TIMEOUT" : "NETWORK_ERROR",
      message: timedOut
        ? `${route} did not answer within ${TIMEOUT_MS / 1000}s`
        : `${route} could not be reached`,
    });
  }
}

async function decode<T>(route: string, res: Response): Promise<T> {
  if (!res.ok) {
    let body: ApiErrorBody | undefined;
    try {
      body = ((await res.json()) as { error?: ApiErrorBody }).error;
    } catch {
      /* a proxy's HTML 502 is not the envelope; the status carries it */
    }
    throw new OwnerApiError(route, res.status, body);
  }
  return (await res.json()) as T;
}

/* --------------------------------------------------------------- the calls */

/** `GET /users/me` — the whole screen. */
export async function fetchProfile(
  base: string,
  memberId: number,
): Promise<UserProfile> {
  const res = await req(base, "/users/me", {
    params: { member_id: String(memberId) },
  });
  return decode<UserProfile>("/users/me", res);
}

/** `PATCH /users/me` — the caller has already reduced this to dirty fields. */
export async function patchProfile(
  base: string,
  memberId: number,
  fields: ProfilePatch,
): Promise<ProfileWriteResult> {
  const res = await req(base, "/users/me", {
    method: "PATCH",
    body: { member_id: memberId, ...fields },
  });
  return decode<ProfileWriteResult>("/users/me", res);
}

/**
 * `PATCH /users/me/email` — step 3 of 3. The two OTP calls below must have
 * succeeded for this address first, or it answers 409 `USERS_EMAIL_NOT_VERIFIED`.
 * Stored lower-cased; `email_verified` flips true in the same write. Re-sending
 * the address already on file is a 200 with `changed: []`.
 */
export async function changeEmail(
  base: string,
  memberId: number,
  email: string,
): Promise<ProfileWriteResult> {
  const res = await req(base, "/users/me/email", {
    method: "PATCH",
    body: { member_id: memberId, email },
  });
  return decode<ProfileWriteResult>("/users/me/email", res);
}

/** what `PUT /users/me/password` answers */
export interface PasswordChangeResult {
  member_id: number;
  changed: boolean;
  changed_at: string;
  /**
   * How many OTHER devices the change signed out.
   *
   * `0` is an ordinary success — nothing else was signed in. `null` means the
   * sweep could not run at all, and **the password still changed**: the API had
   * already written it before it tried. Render `null` as the caveat it is, never
   * as a zero. `note` says the same thing in a sentence.
   */
  signed_out_devices?: number | null;
  /** the server's own sentence about what this change actually did */
  note?: string;
}

/**
 * `PUT /users/me/password`. PASSWORDS ARE NOT TRIMMED — leading and trailing
 * spaces are part of the secret, here and at sign-in. Neither field is logged.
 *
 * `currentSessionId` is THIS browser's session, and it is what the API spares
 * when it signs the member's other devices out. Omitted, there is no session to
 * keep: the API sweeps what it can enumerate, sets no cut-off, and says so in
 * `note` rather than claiming a clean sweep.
 */
export async function putPassword(
  base: string,
  memberId: number,
  currentPassword: string,
  newPassword: string,
  currentSessionId?: string,
): Promise<PasswordChangeResult> {
  const res = await req(base, "/users/me/password", {
    method: "PUT",
    body: {
      member_id: memberId,
      current_password: currentPassword,
      new_password: newPassword,
      ...(currentSessionId ? { current_session_id: currentSessionId } : {}),
    },
  });
  return decode<PasswordChangeResult>("/users/me/password", res);
}

/**
 * The two OTP calls around the email change — steps 1 and 2 of 3.
 *
 * ON THIS HOST, not on `AUTH_API_URL`. `lib/auth-api.ts` carries a
 * near-namesake pair for REGISTRATION, pointed at the auth host, and they are
 * deliberately not reused: a code is issued by one backend and checked by the
 * same one, and it is THIS backend's `PATCH /users/me/email` that demands the
 * verified flag.
 *
 * THE VERIFY FIELD IS `verification_code`, NOT `code`. The contract doc's §4
 * says `{email, code}`; the RUNNING API's own Swagger declares
 * `required: ["email", "verification_code"]` (read from `/api/docs-json`,
 * 2026-09-17), and the deployed validator refuses unknown keys — so `code`
 * would have failed every verification. The Swagger wins: it is generated from
 * the handler that answers.
 */
export async function sendEmailCode(
  base: string,
  email: string,
  username: string,
): Promise<void> {
  const route = "/email-verification/send-code";
  const res = await req(base, route, {
    method: "POST",
    body: { email, username },
  });
  await decode<unknown>(route, res);
}

/** what `PUT /users/me/profile-image` answers (§11) */
export interface ProfileImageResult {
  member_id: number;
  /** decided by the API from the file's own first bytes — the `data:` prefix's
   *  claim is ignored, and this is what the GET will serve it as */
  content_type: string;
  /** the DECODED size stored, not the length of the base64 sent */
  bytes: number;
  updated_at: string;
  /** true when it took the place of an existing photo */
  replaced: boolean;
}

/**
 * `PUT /users/me/profile-image` — upload or replace the avatar (§11).
 *
 * `image` is base64 — bare, or the `data:…;base64,` URL exactly as
 * `FileReader.readAsDataURL()` produces it. The API accepts PNG, JPEG, GIF and
 * WebP only, decides the type from the bytes (an SVG is refused — it can carry
 * script and would be served from the API's own origin), and caps the DECODED
 * size at 2 MB. One photo per member: a second upload replaces the first, and
 * there is no DELETE yet. The bytes are never logged here and never echoed
 * back by the API.
 */
export async function putProfileImage(
  base: string,
  memberId: number,
  image: string,
): Promise<ProfileImageResult> {
  const res = await req(base, "/users/me/profile-image", {
    method: "PUT",
    body: { member_id: memberId, image },
  });
  return decode<ProfileImageResult>("/users/me/profile-image", res);
}

export async function verifyEmailCode(
  base: string,
  email: string,
  code: string,
): Promise<void> {
  const route = "/email-verification/verify-code";
  const res = await req(base, route, {
    method: "POST",
    body: { email, verification_code: code },
  });
  /* Defensive: if this backend reports the verdict inside a 200 the way the
     auth host does, an explicit false must not read as verified. */
  const body = await decode<{ data?: { is_verified?: boolean } | string | null }>(
    route,
    res,
  );
  const data =
    body && typeof body.data === "object" && body.data !== null
      ? body.data
      : null;
  if (data?.is_verified === false) {
    throw new OwnerApiError(route, 400, {
      statusCode: 400,
      code: "CODE_NOT_VERIFIED",
      message: "That code is invalid or expired.",
    });
  }
}

/* ------------------------------------------- where you are signed in (§7) */

/**
 * One signed-in device, as `GET /users/me/sessions` reports it.
 *
 * Note what is NOT here: a rendered "Yesterday, 7:42 PM". The API sends ISO
 * instants because that phrase belongs in the READER's timezone, which the API
 * does not know — a member's stored address is where their minerals are, not
 * where they are sitting. The formatting happens in the browser; see
 * `lastActiveLabel` in `profile-data.ts`.
 */
export interface ApiSession {
  id: string;
  /** "Chrome on Windows", or "Unknown device". Never empty. */
  device: string;
  /**
   * "Beeville, TX", or null.
   *
   * NULL IS THE NORMAL ANSWER TODAY — the API has no geolocation provider
   * configured and will not guess a city. Render the row without it. Do not
   * print "Unknown location": that reads as a fact about the session, under a
   * heading telling the reader to sign out anything they do not recognise.
   */
  place: string | null;
  /** ISO 8601. */
  last_active_at: string;
  /** ISO 8601 — when this device signed in. */
  started_at: string;
  /** The device this request came from. It gets no sign-out button. */
  current: boolean;
}

export interface SessionListResult {
  member_id: number;
  sessions: ApiSession[];
  /**
   * Echoed back only when our `current_session_id` matched a LIVE row.
   *
   * `null` is informative rather than missing: it means the session this
   * browser believes it is on is not live — signed out from another device, or
   * predating the session store.
   */
  current_session_id: string | null;
}

export interface SignOutResult {
  member_id: number;
  /** How many live sessions the call actually ended. Zero is a success. */
  signed_out: number;
  /** True when one of them was this browser's own — clear the cookie. */
  was_current: boolean;
}

/**
 * `GET /users/me/sessions` — the panel's list.
 *
 * ── NO `member_id`, AND THAT IS THE WHOLE SECURITY MODEL OF THESE THREE ──
 *
 * Unlike every other call in this file, the device routes take no member id and
 * no current-session id. Both come off the bearer token's signed claims at the
 * API. They end sessions, so a `member_id` in the request would be a single
 * unauthenticated call that logs any member out of every device — and member
 * ids are small sequential integers.
 *
 * So `token` is not an optimisation here. Without it the API answers 401.
 */
export async function fetchSessions(
  base: string,
  token: string,
): Promise<SessionListResult> {
  const res = await req(base, "/users/me/sessions", { token });
  return decode<SessionListResult>("/users/me/sessions", res);
}

/**
 * `POST /users/me/sessions/sign-out` — end one device.
 *
 * A POST with a body rather than `DELETE /sessions/{id}`, which is the API's
 * choice and worth repeating here: a session id in a URL reaches access logs,
 * proxy logs and `Referer` headers.
 *
 * IDEMPOTENT. An id that is unknown, already signed out, or somebody else's all
 * answer 200 with `signed_out: 0`, so a double-press is harmless and a stale
 * row on screen cannot produce an error the reader has to interpret.
 */
export async function signOutSession(
  base: string,
  token: string,
  sessionId: string,
): Promise<SignOutResult> {
  const route = "/users/me/sessions/sign-out";
  const res = await req(base, route, {
    method: "POST",
    token,
    /* `session_id` names the device to END — a row the token's own member owns,
       which the API re-checks in SQL against the token's member id. It is the
       one thing this body may carry, and it says nothing about who is asking. */
    body: { session_id: sessionId },
  });
  return decode<SignOutResult>(route, res);
}

/**
 * `POST /users/me/sessions/sign-out-others` — everything but this browser.
 *
 * NO BODY AT ALL. The session the API spares is the one the TOKEN names, which
 * is exactly what makes a sweep safe to expose: there is no field in which a
 * caller could nominate somebody else's session to keep and end all the rest.
 *
 * A token minted before the API kept sessions names no device, so there is
 * nothing to spare — the API then ends the sessions it can enumerate and sets
 * no cut-off. It never signs this browser out by surprise; it just cannot reach
 * as far.
 */
export async function signOutOtherSessions(
  base: string,
  token: string,
): Promise<SignOutResult> {
  const route = "/users/me/sessions/sign-out-others";
  const res = await req(base, route, { method: "POST", token, body: {} });
  return decode<SignOutResult>(route, res);
}

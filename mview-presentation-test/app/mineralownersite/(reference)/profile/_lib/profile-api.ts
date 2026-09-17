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
  /** ISO-8601, or null meaning "not recorded" — which is NOT an error and NOT
   *  `member_since` */
  last_changed_at: string | null;
  /** pre-formatted server-side ("4 months ago") — render, never re-derive */
  last_changed_label: string | null;
  /** the sentence to show where the change control would be, when `set` is false */
  unavailable_reason: string | null;
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
   * The member's uploaded photo, when the backend sends one. NOT in the v1
   * contract (`PROFILE-API-FRONTEND.md` documents no photo field or upload
   * endpoint) — declared optional ahead of the backend's photo change (user,
   * 2026-09-17) so the avatar starts showing it the day the field appears.
   * Free-form on the wire; run it through `safePhotoUrl` (in
   * `_lib/safe-photo-url.ts`, shared with the client) before an `<img>`.
   */
  profile_pic?: string | null;
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
  /** the server's own caveat — no sessions are invalidated yet */
  note?: string;
}

/**
 * `PUT /users/me/password`. PASSWORDS ARE NOT TRIMMED — leading and trailing
 * spaces are part of the secret, here and at sign-in. Neither field is logged.
 */
export async function putPassword(
  base: string,
  memberId: number,
  currentPassword: string,
  newPassword: string,
): Promise<PasswordChangeResult> {
  const res = await req(base, "/users/me/password", {
    method: "PUT",
    body: {
      member_id: memberId,
      current_password: currentPassword,
      new_password: newPassword,
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

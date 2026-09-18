"use server";

import { changePasswordSchema, codeSchema } from "@/app/_components/auth-schema";
import { endSession, getSessionUser, startSession } from "@/lib/session";

import { avatarProxyUrl } from "./avatar-url";
/* `SESSION_REVOKED` lives in `profile-data.ts`, not here, and it has to: a
   `"use server"` module may export ONLY async functions. A single exported
   const in this file makes the bundler report it as having NO EXPORTS AT ALL,
   and every action in it stops resolving — a build error whose message names
   an unrelated import. See that file's note. */
import { SESSION_REVOKED, type ProfileSession } from "./profile-data";

import { OwnerApiError } from "../../../_lib/reference/owner-api";
import {
  changeEmail,
  fetchProfile,
  fetchSessions,
  patchProfile,
  profileApiBase,
  putPassword,
  putProfileImage,
  sendEmailCode,
  signOutOtherSessions,
  signOutSession,
  verifyEmailCode,
  type ProfilePatch,
  type UserProfile,
} from "./profile-api";

/**
 * The My-profile writes, as server actions.
 *
 * SERVER, NOT BROWSER, for the reasons `auth-actions.ts` gives: a password must
 * not be posted from the page to another host, and the API's address stays out
 * of the bundle. Every action re-validates — an action is a public endpoint and
 * can be called directly, so the client-side pass is for feedback, not trust.
 *
 * ── `member_id` COMES FROM EXACTLY ONE PLACE ──
 *
 * `requireMember()` below, off the session cookie — never from an argument, so
 * no caller can save another member's profile by passing a different id. The
 * contract says the field disappears from every request when the auth guard
 * lands and the bearer token carries the identity; when that day comes, this
 * helper stops returning an id and `profile-api.ts` drops the parameter. No
 * call SITE changes.
 *
 * ── EVERY FAILURE SWITCHES ON `error.code`, NEVER ON THE MESSAGE ──
 *
 * Messages are prose and will be reworded; `requestId` is carried so the
 * support copy can quote it. `USERS_EMAIL_TAKEN` deliberately says nothing
 * about the other account, matching the API's own refusal to.
 */

export type ProfileActionResult =
  | { ok: true; changed: string[]; profile: UserProfile }
  | ProfileActionFailure;

export interface ProfileActionFailure {
  ok: false;
  message: string;
  code?: string;
  requestId?: string;
  /** field-level messages, keyed by the FORM's field keys */
  fieldErrors?: Record<string, string>;
}

const SIGNED_OUT: ProfileActionFailure = {
  ok: false,
  message: "Your session has ended. Sign in again to edit your profile.",
};

const NOT_CONFIGURED: ProfileActionFailure = {
  ok: false,
  message:
    "Profile changes are not available in this build — no API is configured.",
};

async function requireMember(): Promise<number | null> {
  const user = await getSessionUser();
  return user?.id ?? null;
}

/**
 * REWRITE THE SESSION COOKIE FROM A FRESH PROFILE, after a successful write.
 *
 * The portal chrome — the top-right avatar, the account menu, the drawer —
 * reads the SESSION's name, email and picture, written at sign-in. Without
 * this, a member who changes their name, email or photo watches the profile
 * page update and every OTHER page's bar keep the old identity until their
 * next sign-in (user, 2026-09-17/18). Only the fields the profile owns move;
 * the id and member type ride along unchanged. The picture becomes the
 * uploaded photo's proxy URL when the record has one — a browser-usable,
 * same-origin address, which is what the chrome's `<img>` needs — and keeps
 * the sign-in copy (a Google picture, usually) when it does not.
 * `remember: true` matches what every sign-in path passes since 2026-08-19.
 *
 * BEST-EFFORT by design: the write itself has already succeeded, and a save
 * must not be reported as failed over a cookie.
 */
async function syncSession(profile: UserProfile): Promise<void> {
  try {
    const user = await getSessionUser();
    if (!user || user.id !== profile.member_id) return;
    await startSession(
      {
        member_id: user.id,
        f_name: profile.first_name ?? user.firstName,
        l_name: profile.last_name ?? user.lastName,
        email_id: profile.email,
        member_type: user.memberType,
        profile_pic:
          avatarProxyUrl(profile.profile_image_url) ?? user.profileImage,
        /* CARRIED THROUGH, not re-derived. `startSession` rewrites the whole
           cookie, so a field left out here is a field DELETED — and losing
           either of these would break the device panel from the unrelated act
           of saving a phone number: without the session id it stops marking
           "This device", and without the TOKEN it stops working entirely and
           tells the reader to sign in again. */
        session_id: user.sessionId,
        token: user.token,
      },
      true,
    );
  } catch {
    /* the cookie write is a nicety; the save already stands */
  }
}

/**
 * One sentence per `error.code`, with the requestId kept for support copy.
 *
 * `doing` names WHAT failed, in the reader's terms — "save your changes",
 * "send the code" — because "that did not go through" over a form with three
 * things that can go through tells them nothing (user, 2026-09-17: "if error
 * comes show correct msgs"). Each sentence states the cause the code actually
 * proves: unreachable, timed out, service down, service error. None of them
 * echoes the server's own prose — messages are documented as rewordable — and
 * none blames the reader for a failure that was not theirs.
 */
function failure(e: unknown, doing: string): ProfileActionFailure {
  if (!(e instanceof OwnerApiError)) {
    return {
      ok: false,
      message: `Something went wrong and we could not ${doing}. Please try again.`,
    };
  }
  const base = { ok: false as const, code: e.code, requestId: e.requestId };
  switch (e.code) {
    case "USERS_EMAIL_TAKEN":
      /* nothing about the other account — the API discloses nothing and
         neither does the page */
      return { ...base, message: "That email address is already in use." };
    case "USERS_EMAIL_NOT_VERIFIED":
      return {
        ...base,
        message: "That address has not been verified yet. Enter the code first.",
      };
    case "USERS_PASSWORD_NOT_SET":
      return {
        ...base,
        message:
          "This account signs in with Google and has no password to change.",
      };
    case "USERS_MEMBER_NOT_FOUND":
      /* the id off the session cookie matches no member — a stale or crossed
         session, not a service problem, and retrying will not fix it */
      return {
        ...base,
        message:
          "We could not find your account record. Sign out, sign back in, and try again.",
      };
    case "DATABASE_UNAVAILABLE":
    case "SESSIONS_DB_UNAVAILABLE":
      return {
        ...base,
        message: `The profile service is temporarily unavailable, so we could not ${doing}. Please try again shortly.`,
      };
    /**
     * ⚠ SIGN-OUT IS CONFIGURED OFF, AND THE READER MUST BE TOLD SO PLAINLY.
     *
     * The API answers this when it has no revocation store to record the
     * sign-out in. It refuses rather than returning a 200 it could not honour —
     * which is right, and makes the message here load-bearing: NOTHING was
     * signed out, and "please try again shortly" would be a lie, because
     * trying again changes nothing until an operator configures `REDIS_URL`.
     *
     * Before this case existed the 503 fell into the generic 5xx branch below
     * and read "the profile service hit an error … please try again shortly",
     * which sent members round a retry loop over a deployment setting.
     */
    case "SESSIONS_REVOCATION_UNAVAILABLE":
    case "SESSIONS_AUTH_UNAVAILABLE":
      return {
        ...base,
        message:
          "Signing devices out is switched off on this deployment, so nothing " +
          "was signed out. Contact support — retrying will not help until it " +
          "is turned on.",
      };
    case "CLIENT_TIMEOUT":
      return {
        ...base,
        message: `The profile service took too long to answer, so we could not ${doing}. Please try again.`,
      };
    case "NETWORK_ERROR":
      return {
        ...base,
        message: `We could not reach the profile service to ${doing}. Please try again shortly.`,
      };
    case "USERS_IMAGE_INVALID": {
      /* `details.how` is written FOR THE MEMBER and says which rule the file
         broke — not an image, not base64, empty, truncated, or over 2 MB —
         so it is the sentence to show (§11's refusal table) */
      const d = e.details as unknown;
      const how =
        d && typeof d === "object" && "how" in d ? (d as { how?: unknown }).how : null;
      return {
        ...base,
        message: typeof how === "string" && how ? how : e.message,
      };
    }
    case "VALIDATION_ERROR": {
      /* on VALIDATION_ERROR — and only there — `details` is an array of
         {path, message}; everywhere else it is an object or absent */
      const first = Array.isArray(e.details) ? e.details[0] : undefined;
      return {
        ...base,
        message: first?.message ?? "Please check what you entered.",
      };
    }
    default:
      /* a 5xx we have no name for — `INTERNAL_ERROR` and whatever joins it —
         is reported as the service's failure, never the reader's. The
         requestId stays on the result either way, for support. */
      return e.status >= 500
        ? {
            ...base,
            message: `The profile service hit an error and could not ${doing}. Please try again shortly.`,
          }
        : {
            ...base,
            message: e.message || `We could not ${doing}. Please try again.`,
          };
  }
}

/**
 * BRING THE SESSION COOKIE UP TO THE RECORD — called once when the profile
 * page mounts.
 *
 * The record can be AHEAD of the cookie: a photo uploaded or a name saved
 * before the sync existed, or from another device, leaves the chrome printing
 * the sign-in-era identity on every page until the next save here (user,
 * 2026-09-18: the strip showed the uploaded photo while the bar still showed
 * initials). This re-reads the record and rewrites the cookie from it, so
 * every LATER page's header is right; the page's own chrome is patched
 * client-side by `ProfileLive` in the same moment. Best-effort and silent —
 * a page load must not grow a failure state over a cookie nicety.
 *
 * RETURNS THE FRESH PROFILE (or null on any failure) so a caller that wants to
 * patch the on-screen chrome — `SessionIdentitySync` on every portal page —
 * has the record without a second read. `ProfileLive` ignores the return.
 */
export async function syncSessionFromRecordAction(): Promise<UserProfile | null> {
  const memberId = await requireMember();
  if (memberId == null) return null;
  const base = profileApiBase();
  if (!base) return null;
  try {
    const profile = await fetchProfile(base, memberId);
    await syncSession(profile);
    return profile;
  } catch {
    /* the next visit or the next save will try again */
    return null;
  }
}

/* ---------------------------------------------------------------- the photo */

/**
 * `PUT /users/me/profile-image`, then the fresh `GET` in the same action.
 *
 * The PUT answers with the file's facts (`content_type`, `bytes`, `replaced`)
 * but NOT with a profile — and what the screen needs is the new
 * `profile_image_url`, whose `v` moved with the write. Rather than have the
 * browser rebuild that URL by hand (§11: treat it as opaque), this action
 * re-reads the profile and returns it whole, so the caller publishes it to
 * `ProfileLive` exactly like every other write. If the GET after a successful
 * PUT fails, the upload still happened — the result says so rather than
 * reporting the upload itself as failed.
 *
 * `image` is the `data:` URL off `FileReader.readAsDataURL`; it is passed
 * through, never logged, never echoed.
 */
export async function uploadProfileImageAction(
  image: string,
): Promise<ProfileActionResult> {
  const memberId = await requireMember();
  if (memberId == null) return SIGNED_OUT;
  const base = profileApiBase();
  if (!base) return NOT_CONFIGURED;

  if (typeof image !== "string" || !image) {
    return { ok: false, message: "Choose an image file to upload." };
  }

  try {
    await putProfileImage(base, memberId, image);
  } catch (e) {
    return failure(e, "upload your photo");
  }

  try {
    const profile = await fetchProfile(base, memberId);
    /* the chrome's avatar reads the session — carry the new photo there too */
    await syncSession(profile);
    return { ok: true, changed: ["profile_image_url"], profile };
  } catch {
    return {
      ok: false,
      message:
        "The photo was uploaded, but the page could not re-read your profile. Reload to see it.",
    };
  }
}

/* ------------------------------------------------------------ the form save */

/**
 * `PATCH /users/me`. The card sends ONLY the dirty fields — `""` clears a
 * field and an omitted one is left alone — and this action re-asserts the two
 * payload rules the endpoint enforces: no `email` (it has its own endpoint and
 * flow), and no unknown keys (they are refused, not dropped).
 */
export async function saveProfileAction(
  fields: ProfilePatch,
): Promise<ProfileActionResult> {
  const memberId = await requireMember();
  if (memberId == null) return SIGNED_OUT;
  const base = profileApiBase();
  if (!base) return NOT_CONFIGURED;

  const allowed = ["full_name", "phone", "mailing_address", "city", "zip"] as const;
  const patch: ProfilePatch = {};
  for (const key of allowed) {
    const value = (fields as Record<string, unknown>)[key];
    if (typeof value === "string") patch[key] = value;
  }
  if (!Object.keys(patch).length) {
    /* the endpoint 400s on an empty patch; the card already answers "No
       changes" locally, so reaching here empty is a caller bug — refuse it
       the same way the API would, without the round trip */
    return { ok: false, message: "Nothing was changed." };
  }

  try {
    const result = await patchProfile(base, memberId, patch);
    /* the chrome reads the session's name — keep it saying what the record
       now says */
    if (result.changed.length) await syncSession(result.profile);
    return { ok: true, ...result };
  } catch (e) {
    return failure(e, "save your changes");
  }
}

/* -------------------------------------------------------- the email change

   NO UI CALLS THESE TWO ACTIONS TODAY. The identity card's change-email
   option (dirty email → code panel → confirm) was removed on request (user,
   2026-09-17: "do not give option to edit mail"); the actions stay because
   they are the verified contract wiring — send-code and verify-code match the
   live API's own Swagger, including the `verification_code` field its doc
   misnames — and restoring the option should be UI work, not re-discovery. */

export type SimpleResult = { ok: true } | ProfileActionFailure;

/**
 * Step 1 of 3 — email the six-digit code. Serves the first send and every
 * resend alike, as the register form's equivalent does.
 */
export async function sendEmailCodeAction(email: string): Promise<SimpleResult> {
  const user = await getSessionUser();
  if (!user) return SIGNED_OUT;
  const base = profileApiBase();
  if (!base) return NOT_CONFIGURED;

  const address = email.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(address)) {
    return { ok: false, message: "That email address looks wrong." };
  }
  /* the endpoint only needs something to greet the reader with */
  const username = user.firstName || address.split("@")[0] || "there";

  try {
    await sendEmailCode(base, address, username);
    return { ok: true };
  } catch (e) {
    return failure(e, "send the code");
  }
}

/**
 * Steps 2 and 3 together — confirm the code, then `PATCH /users/me/email`.
 *
 * ONE ACTION, NOT TWO, because nothing useful sits between them: the moment
 * the code checks out the address should be applied, and a page that verified
 * but never patched would leave `email_verified` true on an address the
 * account does not use. A verify that succeeds followed by a patch that is
 * refused (409) is reported as the patch's failure, with the code kept.
 */
export async function confirmEmailChangeAction(
  email: string,
  code: string,
): Promise<ProfileActionResult> {
  const memberId = await requireMember();
  if (memberId == null) return SIGNED_OUT;
  const base = profileApiBase();
  if (!base) return NOT_CONFIGURED;

  const address = email.trim().toLowerCase();
  const parsedCode = codeSchema.safeParse(code.trim());
  if (!parsedCode.success) {
    return {
      ok: false,
      fieldErrors: { code: "Enter the six digits from the email." },
      message: "Enter the six digits from the email.",
    };
  }

  try {
    await verifyEmailCode(base, address, parsedCode.data);
  } catch (e) {
    const failed = failure(e, "check the code");
    /*
     * "Invalid or expired" ONLY WHEN THE API ACTUALLY JUDGED THE CODE — a 4xx.
     * This used to be attached to every failure, so a 500 or an unreachable
     * service told the reader their six digits were wrong and sent them off to
     * retype a code that was right all along. A failure that never reached a
     * verdict keeps the service-level sentence instead.
     */
    const codeWasJudged =
      e instanceof OwnerApiError && e.status >= 400 && e.status < 500;
    return codeWasJudged
      ? { ...failed, fieldErrors: { code: "That code is invalid or expired." } }
      : failed;
  }

  try {
    const result = await changeEmail(base, memberId, address);
    /* the session's email is the one the chrome shows AND the greeting half of
       future sign-ins — move it with the record */
    if (result.changed.length) await syncSession(result.profile);
    return { ok: true, ...result };
  } catch (e) {
    return failure(e, "update your email");
  }
}

/* ----------------------------------------------------------- the password */

export type PasswordActionResult =
  | {
      ok: true;
      /**
       * The API's own sentence about what this change did — including how many
       * other devices it signed out, or that it could not.
       *
       * Passed through rather than re-worded here. It is the only part of the
       * response that knows whether the sweep ran, and the four outcomes it
       * distinguishes are genuinely different facts (see the backend's
       * `passwordChangeNote`). Undefined against an API that predates the
       * sessions work, which is why the panel keeps its own copy as a fallback.
       */
      note?: string;
      /** `null` means the sweep could not run. The password still changed. */
      signedOutDevices?: number | null;
    }
  | ProfileActionFailure;

/**
 * `PUT /users/me/password`, validated with THE SAME schema the panel uses —
 * the client pass is feedback, this one is the gate.
 *
 * PASSWORDS ARE NOT TRIMMED anywhere on the way through: spaces are part of
 * the secret, and a password stored trimmed here would not match at sign-in.
 * Neither field is logged or echoed, including inside the error mapping.
 */
export async function changePasswordAction(
  values: unknown,
): Promise<PasswordActionResult> {
  const memberId = await requireMember();
  if (memberId == null) return SIGNED_OUT;
  const base = profileApiBase();
  if (!base) return NOT_CONFIGURED;

  const parsed = changePasswordSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, message: "Please check the fields above." };
  }

  try {
    const result = await putPassword(
      base,
      memberId,
      parsed.data.currentPassword,
      parsed.data.password,
      /* This browser's session — the one device the change must NOT sign out.
         Read from the cookie, never from an argument, for the same reason
         `member_id` is (see `requireMember`). Absent on a session that predates
         the store, and the API says so in its note rather than guessing. */
      await currentSessionId(),
    );
    return {
      ok: true,
      ...(result.note ? { note: result.note } : {}),
      ...(result.signed_out_devices !== undefined
        ? { signedOutDevices: result.signed_out_devices }
        : {}),
    };
  } catch (e) {
    if (e instanceof OwnerApiError) {
      /* 403 carries NO details, deliberately — nothing more is disclosed than
         "the current password was wrong", against its own field */
      if (e.code === "USERS_PASSWORD_INCORRECT") {
        return {
          ok: false,
          code: e.code,
          requestId: e.requestId,
          message: "That password is incorrect.",
          fieldErrors: { currentPassword: "That password is incorrect." },
        };
      }
      if (e.code === "VALIDATION_ERROR" && Array.isArray(e.details)) {
        /* the API's field names → the form's keys */
        const keyFor: Record<string, string> = {
          new_password: "password",
          current_password: "currentPassword",
        };
        const fieldErrors: Record<string, string> = {};
        for (const d of e.details) {
          const key = keyFor[d.path];
          if (key) fieldErrors[key] = d.message;
        }
        if (Object.keys(fieldErrors).length) {
          return {
            ok: false,
            code: e.code,
            requestId: e.requestId,
            message: "Please check the fields above.",
            fieldErrors,
          };
        }
      }
    }
    return failure(e, "change your password");
  }
}

/* ------------------------------------------- where you are signed in (§7) */

/**
 * THIS BROWSER'S SESSION, off the cookie — never from an argument.
 *
 * Used only by the password change, which is not behind the device routes'
 * bearer-token guard: its own proof of identity is the current password the
 * member just typed. The three device actions below do NOT use this — the API
 * reads the caller's session from the token's claims, so there is nothing for a
 * caller to supply and nothing to get wrong.
 *
 * Undefined for a session signed in before the store existed.
 */
async function currentSessionId(): Promise<string | undefined> {
  return (await getSessionUser())?.sessionId;
}

/**
 * THE BEARER TOKEN, off the httpOnly cookie.
 *
 * ⚠ IT IS RETURNED TO SERVER CODE ONLY, and every caller below hands it
 * straight to `profile-api.ts`, which puts it in an `Authorization` header. It
 * must never be returned from an action, put in a prop, or logged — see
 * `lib/session.ts`.
 *
 * Null for anyone signed in before this shipped: their cookie has no token.
 * They stay signed in everywhere else on the site; only this panel asks them to
 * sign in again, because there is genuinely no way to prove who they are until
 * they do. `NO_TOKEN` is that sentence.
 */
async function requireToken(): Promise<string | null> {
  return (await getSessionUser())?.token ?? null;
}

/**
 * The refusal for a session that predates the token being kept.
 *
 * Deliberately not the generic "your session has ended" — that reader is NOT
 * signed out, and telling them so over a panel that works everywhere else would
 * read as a bug. It names the one thing that fixes it.
 */
const NO_TOKEN: ProfileActionFailure = {
  ok: false,
  code: "NO_TOKEN",
  message:
    "Sign out and sign in again to manage your devices — this browser signed in " +
    "before device management existed.",
};

/**
 * THIS DEVICE HAS BEEN SIGNED OUT — end the session properly, here and now.
 *
 * `proxy.ts` catches this on every portal NAVIGATION, so most readers never
 * reach this path. It exists for the one who is already sitting on the profile
 * page when another device signs them out: they navigate nowhere, so the gate
 * never runs, and the next button they press is the first thing to find out.
 *
 * The cookie is dropped here rather than left for the gate, so the reader is
 * genuinely signed out the moment we learn it — not merely told they are. The
 * panel then sends them to `/login?signedOut=1`, which explains the sign-in
 * screen they did not ask for.
 */
async function revokedHere(): Promise<ProfileActionFailure> {
  try {
    await endSession();
  } catch {
    /* The redirect still stands; the gate drops the cookie on arrival. */
  }
  return {
    ok: false,
    code: SESSION_REVOKED,
    message: "This device was signed out. Sign in again to continue.",
  };
}

/**
 * Was this refused because the session is dead, rather than because something
 * broke?
 *
 * ONLY A 401 COUNTS. A 503 means the API could not check, which is a different
 * statement and must not sign anybody out — see the fail-open note in
 * `proxy.ts`.
 */
function isRevocation(e: unknown): boolean {
  return e instanceof OwnerApiError && e.status === 401;
}

export type SessionListActionResult =
  | { ok: true; sessions: ProfileSession[] }
  | ProfileActionFailure;

export type SignOutActionResult =
  | {
      ok: true;
      /** How many devices went. Zero is a success, not a failed press. */
      signedOut: number;
      /** This browser's own session ended — the cookie has been cleared. */
      wasCurrent: boolean;
    }
  | ProfileActionFailure;

/**
 * `GET /users/me/sessions` — the panel's list, shaped for the rows.
 *
 * ── THE ISO INSTANTS SURVIVE THIS LAYER ───────────────────────────────────
 *
 * They are NOT phrased here. This runs on the server, and "Yesterday, 7:42 PM"
 * belongs in the reader's timezone — see `lastActiveLabel`, which the client
 * component calls. What this function does instead is the one thing the server
 * is better placed for: deciding which row is "This device", from a cookie the
 * browser cannot read.
 */
export async function listSessionsAction(): Promise<SessionListActionResult> {
  const base = profileApiBase();
  if (!base) return NOT_CONFIGURED;
  const token = await requireToken();
  if (!token) return NO_TOKEN;

  try {
    const result = await fetchSessions(base, token);
    return {
      ok: true,
      sessions: result.sessions.map((session) => ({
        id: session.id,
        device: session.device,
        place: session.place,
        /* Carried through as the instant. The component phrases it. */
        lastActive: session.last_active_at,
        ...(session.current ? { current: true } : {}),
      })),
    };
  } catch (e) {
    if (isRevocation(e)) return revokedHere();
    return failure(e, "load your signed-in devices");
  }
}

/**
 * `POST /users/me/sessions/sign-out` — end one device.
 *
 * IDEMPOTENT at the API, so a press against a row that is already gone answers
 * `signedOut: 0` rather than an error the reader would have to interpret.
 */
export async function signOutSessionAction(
  sessionId: string,
): Promise<SignOutActionResult> {
  const base = profileApiBase();
  if (!base) return NOT_CONFIGURED;
  const token = await requireToken();
  if (!token) return NO_TOKEN;

  if (!UUID.test(sessionId)) {
    /* An action is a public endpoint and can be called directly, so the id is
       re-checked here rather than trusted from the page. The API validates it
       again and scopes the statement to the token's member, so this is the
       cheap first refusal rather than the security one. */
    return { ok: false, message: "That device could not be signed out." };
  }

  try {
    const result = await signOutSession(base, token, sessionId);
    return afterSignOut(result.signed_out, result.was_current);
  } catch (e) {
    if (isRevocation(e)) return revokedHere();
    return failure(e, "sign that device out");
  }
}

/** `POST /users/me/sessions/sign-out-others` — everything but this browser. */
export async function signOutOtherSessionsAction(): Promise<SignOutActionResult> {
  const base = profileApiBase();
  if (!base) return NOT_CONFIGURED;
  const token = await requireToken();
  if (!token) return NO_TOKEN;

  try {
    const result = await signOutOtherSessions(base, token);
    return afterSignOut(result.signed_out, result.was_current);
  } catch (e) {
    if (isRevocation(e)) return revokedHere();
    return failure(e, "sign your other devices out");
  }
}

/**
 * Report a sign-out, and drop this browser's cookie if it ended its own session.
 *
 * `was_current` is only reachable through the single sign-out — the panel gives
 * the current row no button. It is handled anyway, because the API allows it and
 * a member left holding a cookie for a session that no longer exists would keep
 * seeing a signed-in header over pages that had stopped answering.
 *
 * The cookie write is best-effort: the sign-out itself has already succeeded on
 * the server, and it must not be reported as failed over a cookie.
 */
async function afterSignOut(
  signedOut: number,
  wasCurrent: boolean,
): Promise<SignOutActionResult> {
  if (wasCurrent) {
    try {
      await endSession();
    } catch {
      /* the sign-out stands; the header will catch up on the next navigation */
    }
  }
  return { ok: true, signedOut, wasCurrent };
}

/** The shape the API validates session ids against. */
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

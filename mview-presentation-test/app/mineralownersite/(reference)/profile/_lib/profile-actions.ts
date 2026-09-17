"use server";

import { changePasswordSchema, codeSchema } from "@/app/_components/auth-schema";
import { getSessionUser, startSession } from "@/lib/session";

import { OwnerApiError } from "../../../_lib/reference/owner-api";
import {
  changeEmail,
  fetchProfile,
  patchProfile,
  profileApiBase,
  putPassword,
  putProfileImage,
  sendEmailCode,
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
 * reads the SESSION's name and email, written at sign-in. Without this, a
 * member who changes their name or email watches the profile page update and
 * the bar above it keep the old identity until their next sign-in (user,
 * 2026-09-17: "same for mail"). Only the fields the profile owns move; the id,
 * member type and photo ride along unchanged. `remember: true` matches what
 * every sign-in path passes since 2026-08-19.
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
        profile_pic: user.profileImage,
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
      return {
        ...base,
        message: `The profile service is temporarily unavailable, so we could not ${doing}. Please try again shortly.`,
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
  | { ok: true }
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
    await putPassword(
      base,
      memberId,
      parsed.data.currentPassword,
      parsed.data.password,
    );
    return { ok: true };
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

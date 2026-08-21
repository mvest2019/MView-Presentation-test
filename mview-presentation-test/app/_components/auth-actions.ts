"use server";

import {
  loginUser,
  loginWithGoogle,
  registerUser,
  requestPasswordReset,
  resetPassword,
  sendVerificationCode,
  splitName,
  type MemberTypeValue,
  verifyCode,
} from "@/lib/auth-api";
import {
  checkLoginThrottle,
  clearLoginFailures,
  recordLoginFailure,
} from "@/lib/login-throttle";
import { endSession, startSession } from "@/lib/session";

import {
  codeSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "./auth-schema";

/**
 * Sign-in, sign-up and email verification, as server actions.
 *
 * SERVER, NOT BROWSER, and that is the point. A password must not be posted from
 * the page to a third-party host. Going through an action also keeps `BASE_URL`
 * out of the client bundle and is the only place able to set the session cookie
 * httpOnly.
 *
 * Every action re-validates with the SAME schema the form used. The client pass
 * is for fast feedback, not for trust: an action is a public endpoint and can be
 * called directly, so the checks have to exist here too.
 *
 * None of them redirect. They return a result and let the form decide, so a
 * failure is shown in place with what was typed still on screen.
 */

export type ActionResult = { ok: true } | { ok: false; message: string };

export async function signInAction(values: unknown): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, message: "Please check the details above." };
  }

  /*
   * THROTTLE CHECKED BEFORE THE API IS CALLED, not after (Ryan, 2026-08-19).
   *
   * A blocked attempt must not reach `login_user` at all — refusing it after the
   * round-trip would still let a guess-loop hammer the upstream at full rate and
   * would protect nothing but our own error message.
   *
   * Read `lib/login-throttle.ts` before relying on this: the counters are in
   * process memory and this route is not the only way to reach the endpoint, so it
   * raises the cost of a scripted attack against this form rather than protecting
   * the account. The limit that protects the account belongs on the API.
   */
  const throttled = await checkLoginThrottle(parsed.data.email);
  if (throttled.blocked) return { ok: false, message: throttled.message };

  const result = await loginUser(parsed.data.email, parsed.data.password);
  if (!result.ok) {
    /*
     * Counted only when the credentials were actually rejected. A 502 or an unset
     * JWT_SECRET also lands here, and counting those would lock out someone whose
     * password was right — an outage turning into a lockout.
     */
    if (result.credentialsRejected) {
      await recordLoginFailure(parsed.data.email);
      /* Re-checked so the eleventh failure is TOLD it is blocked, instead of being
         handed the generic message and only discovering the block on the next
         attempt. */
      const nowBlocked = await checkLoginThrottle(parsed.data.email);
      if (nowBlocked.blocked) return { ok: false, message: nowBlocked.message };
    }
    return { ok: false, message: result.message };
  }

  await clearLoginFailures(parsed.data.email);
  /* `true`, not `parsed.data.remember` — the checkbox that used to decide this is
     gone (Ryan, 2026-08-19), so every sign-in gets the persistent 30-day cookie
     rather than one that dies with the browser session. Matches the live site,
     which has no such checkbox and persists by default, and matches the Google
     flow below, which already passed `true` on the grounds that choosing Google is
     a deliberate sign-in on this device. */
  await startSession(result.user, true);
  return { ok: true };
}

/**
 * Everyone signs up as a Mineral Owner (Ryan, 2026-08-13, restated 2026-08-19:
 * "don't ask for professional by default take mineral owner").
 *
 * The account-type question and its dialog are gone: the value is fixed rather
 * than asked. This is the ONE deliberate departure from the live site's register
 * flow, which opens `MemberTypePopup` (`app/pricing/_components/MemberTypePopUp`)
 * and branches its landing page on `memberType === 'professional'`. Neither the
 * popup nor that branch is ported. `mineral_owner` is also the API's own default
 * for the Google flow, so the two paths agree without either having to prompt.
 */
const DEFAULT_MEMBER_TYPE: MemberTypeValue = "mineral_owner";

/**
 * Signs in straight after a successful registration, retrying a few times.
 *
 * PORTED FROM `signInAfterRegistration` in the live repo's `RegisterForm.tsx`,
 * including the reason it retries. The credentials were accepted by the
 * registration endpoint moments earlier, so a login failure on the very next
 * call is almost never actually wrong credentials — it is far more likely the
 * new row is not yet readable from whatever login reads (replica lag /
 * write-then-read consistency), which surfaces as an intermittent "invalid
 * credentials" nobody can reproduce on demand.
 *
 * Same shape as the original: three attempts, `attempt * 400`ms between them.
 */
async function signInAfterRegistration(
  email: string,
  password: string,
  attempt = 1,
): Promise<Awaited<ReturnType<typeof loginUser>>> {
  const MAX_ATTEMPTS = 3;
  const result = await loginUser(email, password);
  if (!result.ok && attempt < MAX_ATTEMPTS) {
    await new Promise((resolve) => setTimeout(resolve, attempt * 400));
    return signInAfterRegistration(email, password, attempt + 1);
  }
  return result;
}

/**
 * Creates the account. THE EMAIL IS ALREADY VERIFIED BY THE TIME THIS RUNS.
 *
 * ORDER REVERSED to match the live site (Ryan, 2026-08-19: "check current
 * website flow for register need same"). This used to create the account and
 * then email a code; `handleRegisterSubmit` over there refuses to submit at all
 * until `emailVerified` is true, so the code round-trips FIRST and registration
 * is the last step rather than the first. Two consequences worth knowing:
 *
 *   · No `sendVerificationCode` call here any more. The form asks for the code
 *     itself, before it ever calls this.
 *   · A SESSION IS NOW STARTED, which it deliberately was not before. The old
 *     comment argued the code gates the account so signing in here would defeat
 *     the step that follows — true when verification came second, meaningless now
 *     that nothing follows. The live site signs in immediately and lands the new
 *     member on a page, so this does too.
 */
export async function registerAction(values: unknown): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, message: "Please check the details above." };
  }

  const { fullName, email, password, phone, mailingAddress, terms } =
    parsed.data;

  const created = await registerUser({
    fullName,
    email,
    password,
    phone,
    mailingAddress,
    memberType: DEFAULT_MEMBER_TYPE,
    /* Goes to the API as `tnc`. Taken from the parsed form rather than passed as
       `true`: the schema's `z.literal(true)` means this action cannot get here
       with it unticked, so the two agree — but the value that asserts consent
       should be the one the visitor supplied. */
    acceptedTerms: terms,
  });
  if (!created.ok) return { ok: false, message: created.message };

  const signedIn = await signInAfterRegistration(email, password);
  if (!signedIn.ok) {
    // The ACCOUNT EXISTS at this point, so "registration failed" would be a lie
    // that sends them round again into an "already registered" error. The live
    // site shows a bare "Invalid Credentials" here; this names the state the
    // visitor is actually in and what to do about it.
    return {
      ok: false,
      message:
        "Your account was created, but we could not sign you in. Please sign in.",
    };
  }

  await startSession(signedIn.user, true);
  return { ok: true };
}

/**
 * `fullName` IS REQUIRED, despite reading like a nicety.
 *
 * `/email-verification/send-code` rejects a blank one — `{}` answers 422 with
 * "please provide username" — so this passed `""` and every resend failed with
 * a validation error about a field the visitor cannot see. The name is already
 * typed into the form the visitor is still looking at, so it is threaded through
 * rather than re-fetched.
 *
 * The fallback is the local part of the address: the endpoint only needs
 * something to greet the reader with, and refusing to resend because a name went
 * missing would be a worse outcome than an email addressed to "jane".
 */
/*
 * SERVES BOTH THE FIRST SEND AND EVERY RESEND, which is why it is no longer
 * called `resendCodeAction`. In the live site one handler does both jobs —
 * `handleSendOtp` is wired to the "Verify Email" button and to "Resend Code"
 * alike — and the endpoint does not distinguish them.
 *
 * `fullName` is passed as the live site passes it — `handleSendOtp` sends
 * `${firstName} ${lastName}` — but the password it also sends is NOT passed on
 * (Ryan, 2026-08-19). Only the address and a name reach the endpoint; see
 * `sendVerificationCode`.
 */
export async function sendCodeAction(
  email: string,
  fullName: string,
): Promise<ActionResult> {
  const parsed = loginSchema.shape.email.safeParse(email);
  if (!parsed.success) return { ok: false, message: "That email looks wrong." };

  const username =
    splitName(fullName).first || parsed.data.split("@")[0] || "there";

  const sent = await sendVerificationCode(parsed.data, username);
  return sent.ok
    ? { ok: true }
    : { ok: false, message: sent.message || "We could not send the code." };
}

/** Confirms the code. Only this opens the account. */
export async function verifyCodeAction(
  email: string,
  code: string,
): Promise<ActionResult> {
  const parsedEmail = loginSchema.shape.email.safeParse(email);
  const parsedCode = codeSchema.safeParse(code);
  if (!parsedEmail.success || !parsedCode.success) {
    return { ok: false, message: "Enter the six digits from the email." };
  }

  const result = await verifyCode(parsedEmail.data, parsedCode.data);
  if (!result.ok) {
    return {
      ok: false,
      message: result.message || "That code is invalid or expired.",
    };
  }

  return { ok: true };
}

/**
 * Signs in with the ID token Google Identity Services handed the browser.
 *
 * The token is NOT trusted here — it is passed straight to the backend, which
 * validates its signature, audience and expiry before answering. That is the
 * same contract the live site uses, and it is why no Google client secret is
 * needed anywhere in this app.
 */
export async function signInWithGoogleAction(
  idToken: unknown,
  memberType?: MemberTypeValue,
): Promise<ActionResult> {
  if (typeof idToken !== "string" || idToken.length < 20) {
    return { ok: false, message: "Google sign-in failed. Please try again." };
  }

  /*
   * `memberType` now always arrives, because the account-type dialog is shown
   * BEFORE Google (Ryan, 2026-08-13). It stays optional on the signature because
   * the backend treats it as optional: for an account that already exists the
   * value is ignored and the stored type kept, so a returning member cannot
   * change type by answering the dialog differently.
   *
   * This used to check `check-user-exists` first and ask only for new accounts.
   * That branch is gone with the reordering — the question is now asked before
   * anyone's identity is known, so a returning member sees it too.
   */
  const result = await loginWithGoogle(idToken, memberType);
  if (!result.ok) return { ok: false, message: result.message };

  // Choosing Google is a deliberate sign-in on this device, so it gets the
  // persistent cookie rather than a session one.
  await startSession(result.user, true);
  return { ok: true };
}

export async function signOutAction(): Promise<void> {
  await endSession();
}

/**
 * Step 1 of the reset — ask for the emailed link.
 *
 * ALWAYS RETURNS `ok`, WHATEVER THE API SAID, unless the service itself is down.
 * That is deliberate and it is the whole point of this wrapper.
 *
 * The endpoint does not distinguish a known address from an unknown one — probed
 * with `nobody@example.com` and it still answered `{"data":"SUCCESS"}` — and this
 * must not either. Reporting "no account for that address" here would rebuild, on
 * a form that needs no password at all, exactly the enumeration oracle that was
 * removed from sign-in the same day. Anyone could confirm whether an address is
 * registered by typing it.
 *
 * A REAL OUTAGE IS STILL REPORTED, because it is not about the address: telling
 * someone the link is on its way when the mail was never dispatched leaves them
 * waiting for an email that is not coming.
 */
export async function requestPasswordResetAction(
  values: unknown,
): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, message: "Please check the details above." };
  }

  const result = await requestPasswordReset(parsed.data.email);
  if (!result.ok && /try again shortly|could not reach/i.test(result.message)) {
    return { ok: false, message: result.message };
  }
  /* Anything else the API refused for — including an unknown address — is
     swallowed on purpose, and logged so it is not invisible to us. */
  if (!result.ok) {
    console.error(`[auth] reset link not sent, upstream said: ${result.message}`);
  }
  return { ok: true };
}

/** Step 2 of the reset — set the new password against the emailed token. */
export async function resetPasswordAction(
  token: unknown,
  values: unknown,
): Promise<ActionResult> {
  if (typeof token !== "string" || !token.trim()) {
    return {
      ok: false,
      message: "That reset link is incomplete. Request a new one and try again.",
    };
  }

  const parsed = resetPasswordSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, message: "Please check the details above." };
  }

  const result = await resetPassword(token.trim(), parsed.data.password);
  return result.ok
    ? { ok: true }
    : { ok: false, message: result.message || "We could not reset that password." };
}

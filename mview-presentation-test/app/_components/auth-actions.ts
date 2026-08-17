"use server";

import {
  loginUser,
  loginWithGoogle,
  registerUser,
  sendVerificationCode,
  splitName,
  type MemberTypeValue,
  verifyCode,
} from "@/lib/auth-api";
import { endSession, startSession } from "@/lib/session";

import { codeSchema, loginSchema, registerSchema } from "./auth-schema";

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

  const result = await loginUser(parsed.data.email, parsed.data.password);
  if (!result.ok) return { ok: false, message: result.message };

  await startSession(result.user, parsed.data.remember);
  return { ok: true };
}

/**
 * Creates the account, then asks the API to email a code.
 *
 * NO SESSION IS STARTED HERE. The design is explicit that the code gates the
 * account — "no session is issued and the account stays unusable until the code
 * round-trips" — so signing the visitor in at this point would defeat the step
 * that follows.
 */
/**
 * Everyone signs up as a Mineral Owner (Ryan, 2026-08-13).
 *
 * The account-type question and its dialog are gone: the value is fixed rather
 * than asked. `mineral_owner` is also the API's own default for the Google flow,
 * so the two paths agree without either having to prompt.
 */
const DEFAULT_MEMBER_TYPE: MemberTypeValue = "mineral_owner";

export async function registerAction(values: unknown): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, message: "Please check the details above." };
  }

  const { fullName, email, password, phone, mailingAddress } = parsed.data;

  const created = await registerUser({
    fullName,
    email,
    password,
    phone,
    mailingAddress,
    memberType: DEFAULT_MEMBER_TYPE,
  });
  if (!created.ok) return { ok: false, message: created.message };

  const sent = await sendVerificationCode(email, splitName(fullName).first);
  if (!sent.ok) {
    // The ACCOUNT EXISTS at this point. Saying "registration failed" would send
    // them round again into an "already registered" error, so the message names
    // what actually went wrong and what to do about it.
    return {
      ok: false,
      message:
        sent.message ||
        "Your account was created, but we could not send the code. Try signing in, or resend it.",
    };
  }

  return { ok: true };
}

/**
 * `fullName` IS REQUIRED, despite reading like a nicety.
 *
 * `/email-verification/send-code` rejects a blank one — `{}` answers 422 with
 * "please provide username" — so this passed `""` and every resend failed with
 * a validation error about a field the visitor cannot see. The name is already
 * on screen from the form they just submitted, so it is threaded through rather
 * than re-fetched.
 *
 * The fallback is the local part of the address: the endpoint only needs
 * something to greet the reader with, and refusing to resend because a name went
 * missing would be a worse outcome than an email addressed to "jane".
 */
export async function resendCodeAction(
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
    : { ok: false, message: sent.message || "We could not resend the code." };
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

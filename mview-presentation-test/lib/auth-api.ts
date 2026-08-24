import "server-only";

import { getVisitorId } from "./visitor-id";

/**
 * Client for the auth API.
 *
 *   POST {AUTH_API_URL}/User/userRegistration
 *   POST {AUTH_API_URL}/User/login_user
 *
 * WRITTEN TO THE CONTRACT THE BACKEND TEAM SUPPLIED (2026-08-13), which is not
 * the one the live site's repo uses. Four things moved:
 *
 *   · A DIFFERENT HOST AND A PATH PREFIX — `mview-dev-api.mineralview.com/api/v1`,
 *     not `{BASE_URL}/User/...`. `BASE_URL` still serves blog, news and glossary
 *     and is left alone.
 *   · `visitorId` ON EVERY CALL, the same anonymous id the article endpoints
 *     already send, from the `guestUserID` cookie.
 *   · `member_type` IS SPELLED DIFFERENTLY PER ENDPOINT. Registration wants
 *     "mineral owner" with a SPACE; Google login wants "mineral_owner" with an
 *     UNDERSCORE and rejects anything else. `memberTypeFor` is the only place
 *     that difference is written down.
 *   · THE FLOW IS PICKED BY `password`. An empty one selects Google, so the two
 *     payloads must not be mixed: sending both is refused with "password and
 *     GoogleToken cannot be provided together".
 *
 * `server-only`: a password must never be posted from the browser to another
 * host, and this is the only place able to set the session cookie httpOnly.
 */

function authBase(): string {
  const url = process.env.AUTH_API_URL;
  if (!url) {
    throw new Error(
      "AUTH_API_URL is not set. Point it at the auth API (see next.config.ts).",
    );
  }
  return url.replace(/\/+$/, "");
}

/** The subset of the member record this build reads. */
export interface AuthUser {
  member_id: number;
  f_name: string;
  l_name: string;
  email_id: string;
  member_type?: string;
  profile_pic?: string;
}

export type AuthResult =
  | { ok: true; user: AuthUser; alreadyExisted?: boolean }
  | {
      ok: false;
      message: string;
      needsEmailVerification?: boolean;
      /**
       * The API REJECTED THE CREDENTIALS, as opposed to being unreachable or
       * misconfigured.
       *
       * Only this counts towards the sign-in throttle. Without the distinction a
       * 502 or a missing JWT_SECRET would rack up "failures" and lock out someone
       * whose password was right all along, turning an outage into a lockout —
       * and, since the message is generic either way, one they could not diagnose.
       */
      credentialsRejected?: boolean;
    };

/** The account-type dialog's value. */
export type MemberTypeValue = "mineral_owner" | "professional";

/**
 * The same choice, in the spelling each endpoint demands.
 *
 * Registration takes a space, Google login an underscore. Not a typo on either
 * side — it is what the contract specifies, and the login endpoint enforces it
 * with "member_type must be one of: mineral_owner, professional".
 */
export function memberTypeFor(
  endpoint: "register" | "login",
  value: MemberTypeValue,
): string {
  return endpoint === "register" ? value.replace("_", " ") : value;
}

/**
 * Free sign-up plan id.
 *
 * The contract's example sends `subscriptionid: 2` without saying what 2 is.
 * Enrolling every new account in an unknown — possibly paid — plan is not a
 * guess worth making, so this defaults to 0 and is overridable. CONFIRM THE FREE
 * PLAN ID with the backend team and set `AUTH_FREE_SUBSCRIPTION_ID`.
 */
const FREE_SUBSCRIPTION_ID = Number(
  process.env.AUTH_FREE_SUBSCRIPTION_ID ?? "0",
);

/**
 * Pulls a message out of any shape the API answers with.
 *
 * The contract lists four: the `{status_code, data, error}` envelope, a bare
 * `{message}` with no envelope, a plain string for some 400s, and `{errors:[…]}`
 * on 422. Everything falls through to a supplied default rather than showing a
 * visitor a status code.
 */
function messageFrom(body: unknown, fallback: string): string {
  if (typeof body === "string" && body.trim()) return body.trim();
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    for (const key of ["error", "message"]) {
      const value = record[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
    /*
     * The 422 field list. BOTH KEYS AND BOTH MEMBER NAMES are read because the
     * contract and the live API disagree: the contract documents
     * `{errors:[{message}]}`, while `/email-verification/send-code` actually
     * answers `{"error":[{"msg":"Invalid email","param":"email"}]}` — `error`
     * singular, holding an array, with the text under `msg`.
     *
     * This only checked `errors` + `.message`, so every 422 fell through to the
     * generic fallback and the visitor was never told WHICH field was wrong.
     */
    for (const key of ["errors", "error"]) {
      const list = record[key];
      if (!Array.isArray(list) || !list.length) continue;
      const first = list[0];
      if (typeof first === "string") return first;
      if (first && typeof first === "object") {
        const entry = first as Record<string, unknown>;
        for (const field of ["message", "msg"]) {
          const text = entry[field];
          if (typeof text === "string" && text.trim()) return text.trim();
        }
      }
    }
  }
  return fallback;
}

async function post(
  path: string,
  payload: Record<string, unknown>,
  /*
   * The password-reset pair are PUTs, not POSTs — `GenerateResetPassowrdToken`
   * and `ResetPassword` both answer 404 to a POST. Everything else here is a
   * POST, so that stays the default and no existing caller changed.
   */
  method: "POST" | "PUT" = "POST",
  /*
   * Extra request headers. Only the password-reset request uses this, to send an
   * `Origin`/`Referer` a backend might build its emailed link from — see the note
   * in `requestPasswordReset`. A server-to-server `fetch` sends neither by
   * default, so if the API does read them it currently sees nothing.
   */
  headers: Record<string, string> = {},
): Promise<{ status: number; body: unknown }> {
  const response = await fetch(`${authBase()}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  let body: unknown = null;
  const text = await response.text();
  if (text.trim()) {
    try {
      body = JSON.parse(text);
    } catch {
      /*
       * NOT JSON — AND NOT AUTOMATICALLY A MESSAGE.
       *
       * The contract allows a bare string body on some 400s, so a short line of
       * text is still kept and `messageFrom` still reads it. But a failure in
       * front of the API answers with a whole HTML document: Cloudflare's "502
       * Bad gateway" is several kilobytes of markup, and this branch used to
       * pass that straight through as the error message. The register form
       * printed the entire page — DOCTYPE, IE conditional comments, Cloudflare's
       * stylesheet link and all — into the red text under the password field.
       *
       * Anything opening with a tag, or longer than a sentence, is dropped so
       * the caller falls through to its own wording instead.
       */
      const trimmed = text.trim();
      body = trimmed.startsWith("<") || trimmed.length > 300 ? null : trimmed;
    }
  }
  return { status: response.status, body };
}

/**
 * The ENVELOPE'S code wins over the HTTP one.
 *
 * A 200 routinely carries `status_code: 400` — that is how "this email is
 * already registered" arrives. Trusting the HTTP status alone would read those
 * as successes.
 */
function envelopeCode(status: number, body: unknown): number {
  const code = (body as { status_code?: unknown } | null)?.status_code;
  return typeof code === "number" ? code : status;
}

/**
 * The service is DOWN, as distinct from refusing what was sent.
 *
 * Worth separating because every fallback below names the thing the visitor most
 * likely did wrong, and on a 5xx all of them are false: a 502 from the gateway
 * would otherwise be reported as "Email or password is incorrect." to
 * someone whose password was perfect, or as "That code is invalid or expired" to
 * someone holding a code that had minutes left. Both send people off to fix
 * something that was never broken.
 */
function upstreamDown(status: number, body: unknown): boolean {
  return envelopeCode(status, body) >= 500;
}

/* ─────────────────────────────────────────────────────────── registration ── */

export interface RegisterInput {
  /** One field in the design; split for the API — see `splitName`. */
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  /** The design's single "Street, city, state, ZIP" box. */
  mailingAddress?: string;
  memberType?: MemberTypeValue;
  /**
   * The terms checkbox, sent to the API as `tnc` — REQUIRED (Ryan, 2026-08-19).
   *
   * Omitting it was a 422, and the check runs BEFORE the duplicate-email lookup,
   * so no account could be created no matter what the form said:
   *
   *   omitted      → 422 {"msg":"Please accept the Terms of Service and Privacy
   *                       Policy…","param":"tnc"}     ← no `value` key at all
   *   `tnc: false` → 422, same message, with `"value": false`
   *   `tnc: true`  → passes validation (probed against an address that already
   *                  had an account, so it answered 400 "already registered")
   *
   * Worth noting the `false` case is reported separately from the omitted one, so
   * the endpoint is not silently defaulting the field — it rejects both, but it
   * does read what is sent.
   *
   * Threaded from the checkbox rather than hardcoded `true` at the call site. The
   * schema already refuses to validate unless it is ticked (`z.literal(true)`), so
   * the value is always true by the time it gets here — but a payload field that
   * asserts consent should carry what the visitor actually did, not a constant
   * that would keep saying "accepted" if that gate ever moved.
   */
  acceptedTerms: boolean;
}

/**
 * The design collects ONE "Full name" box; the API wants `f_name` and `l_name`.
 *
 * Split on the last space, so "Mary Anne Whitfield" keeps the middle name. A
 * single word becomes the first name with an empty last — better than refusing
 * a mononym.
 */
export function splitName(fullName: string): { first: string; last: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { first: parts[0] ?? "", last: "" };
  return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1] };
}

export async function registerUser(input: RegisterInput): Promise<AuthResult> {
  try {
    const { first, last } = splitName(input.fullName);
    const { status, body } = await post("/User/userRegistration", {
      email_id: input.email,
      password: input.password,
      f_name: first,
      l_name: last,
      member_type: memberTypeFor(
        "register",
        input.memberType ?? "mineral_owner",
      ),
      // ONE address box in the design, four columns in the API. The whole string
      // goes to the street field; city, state and ZIP stay null rather than
      // being guessed apart — the claim step collects them properly.
      mailing_st_address: input.mailingAddress?.trim() || null,
      city: null,
      state_master_id: null,
      zip_code: null,
      phone_number: input.phone?.trim() || null,
      subscriptionid: FREE_SUBSCRIPTION_ID,
      // `tnc`, not `terms` — the API's own field name. See `acceptedTerms`.
      tnc: input.acceptedTerms,
      login_type: "web",
      login_json: {},
      visitorId: await getVisitorId(),
    });

    if (envelopeCode(status, body) === 200) {
      return {
        ok: true,
        user: {
          member_id: 0,
          f_name: first,
          l_name: last,
          email_id: input.email,
        },
      };
    }

    if (upstreamDown(status, body)) {
      console.error(
        `[auth] POST /User/userRegistration upstream failure: ${status}`,
      );
      return {
        ok: false,
        message: "Sign-up is temporarily unavailable. Please try again shortly.",
      };
    }

    const message = messageFrom(body, "We could not create that account.");
    if (/already registered/i.test(message)) {
      return {
        ok: false,
        /*
         * "This email is already registered." (Ryan, 2026-08-19), replacing "That
         * email address already has an account. Sign in instead."
         *
         * This is the LIVE SITE'S wording, character for character —
         * `handleRegisterSubmit` in the live `RegisterForm.tsx` matches the same
         * `.includes('already registered')` on the same API error and raises
         * exactly this string. So the two apps now say the same thing for the
         * same rejection.
         *
         * The dropped half was "Sign in instead." — the instruction, not the
         * fact. It is not missed: the form already ends in "Already have an
         * account? Sign in", so the route out is on screen either way.
         *
         * The API's own text is "This Email Id is already registered with us.
         * Please try with another email.", which is why the test matches on the
         * substring rather than the whole sentence.
         */
        message: "This email is already registered.",
      };
    }
    return { ok: false, message };
  } catch {
    return {
      ok: false,
      message: "We could not reach the sign-up service. Please try again.",
    };
  }
}

/* ──────────────────────────────────────────────────────────────── sign in ── */

/**
 * ONE MESSAGE FOR EVERY FAILED SIGN-IN, whatever the reason.
 *
 * ACCOUNT ENUMERATION FIX (Ryan, 2026-08-19). A `SIGN_IN_MESSAGES` map used to
 * translate each of the API's 401 sentinels into its own sentence:
 *
 *   "please register"                → "We have no account for that email…"
 *   "incorrect email or password"    → "That email and password did not match."
 *
 * The backend distinguishes "no such account" from "wrong password", and that map
 * faithfully passed the distinction to the page — so anyone could test an address
 * and be told, for free, whether it was registered here. Harvesting a list of
 * customers took one script and no credentials.
 *
 * The map is gone rather than reworded. A lookup table keyed on upstream strings
 * invites the next person to add a helpful case to it, which is how this got
 * here; with one constant there is nothing to extend. `signInMessage` now returns
 * this for every non-infrastructure failure, INCLUDING sentinels nobody has seen
 * yet — it used to `return raw` for anything unmapped, so a new backend message
 * would have been printed to the visitor verbatim.
 *
 * The cost is real and accepted: someone who has genuinely forgotten whether they
 * signed up is no longer told. "Forgot password?" sits beside the field for
 * exactly that, and sign-up will tell them if they try it.
 */
const CREDENTIALS_MESSAGE = "Email or password is incorrect.";

/**
 * Server-side misconfiguration, as opposed to anything a visitor did.
 *
 * The API reports its own setup problems through the same `error` field as real
 * failures — "google token is not valid Error: GOOGLE_CLIENT_ID is not
 * configured", "Service temporarily unavailable… (also when JWT_SECRET is
 * unset)". Those are for us, not for the person signing in: they name internal
 * variables, cannot be acted on, and read like a broken site.
 */
const INFRASTRUCTURE = /not configured|internal server|jwt_secret|unavailable/i;

/**
 * Show the upstream text to the person on the page, instead of hiding it.
 *
 * OFF BY DEFAULT — these strings name internal variables and must not reach real
 * visitors. Set `AUTH_SHOW_UPSTREAM_ERRORS=1` on a preview deployment to turn it
 * on there.
 *
 * This exists because hiding the reason cost three rounds of "Google still does
 * not work". The generic sentence below is correct for a visitor and useless for
 * whoever is testing: the actual cause was
 * "GOOGLE_CLIENT_ID is not configured", visible only in a server log nobody
 * reading the preview site can see. `NODE_ENV` is no help as the gate — a Vercel
 * preview builds as production, which is exactly where the testing happens.
 */
const SHOW_UPSTREAM = process.env.AUTH_SHOW_UPSTREAM_ERRORS === "1";

function signInMessage(raw: string): string {
  if (INFRASTRUCTURE.test(raw)) {
    // Kept where an engineer will see it; the visitor gets a plain sentence.
    console.error(`[auth] upstream configuration error: ${raw}`);
    return SHOW_UPSTREAM
      ? `Sign-in is temporarily unavailable. Upstream said: ${raw}`
      : "Sign-in is temporarily unavailable. Please try again shortly.";
  }

  /*
   * EVERYTHING ELSE COLLAPSES, and the upstream text is logged rather than shown.
   * `raw` is what distinguished the failures, so returning it in any form is the
   * leak. It still has to reach a log: without it, diagnosing a real 401 storm
   * would mean guessing, and this is the only place the API's own words appear.
   *
   * `SHOW_UPSTREAM` deliberately does NOT reveal it here as it does above. That
   * flag exists for preview deployments, and a preview that leaks enumeration is
   * still a leak — the log is enough for whoever is testing.
   */
  if (raw && raw !== CREDENTIALS_MESSAGE) {
    console.error(`[auth] sign-in refused, upstream said: ${raw}`);
  }
  return CREDENTIALS_MESSAGE;
}

/**
 * Flow A — email and password.
 *
 * An empty password is refused HERE rather than sent: server-side an empty one
 * selects the Google flow, so it would come back as "GoogleToken is missing",
 * which tells the visitor nothing about the box they left blank.
 */
export async function loginUser(
  email: string,
  password: string,
): Promise<AuthResult> {
  if (!password) {
    return { ok: false, message: "Please enter your password." };
  }

  try {
    const { status, body } = await post("/User/login_user", {
      email_id: email,
      password,
      visitorId: await getVisitorId(),
      id: null,
    });

    /*
     * A 200 with NO envelope, just `{message}`: the account exists but its email
     * has not been confirmed. Not a credentials failure — reporting it as one
     * would send someone to reset a password that was correct.
     */
    if (
      status === 200 &&
      body &&
      typeof body === "object" &&
      !("status_code" in body) &&
      "message" in body
    ) {
      return {
        ok: false,
        needsEmailVerification: true,
        message: messageFrom(body, "Please verify your email address."),
      };
    }

    const data = (body as { data?: AuthUser } | null)?.data;
    if (envelopeCode(status, body) === 200 && data?.member_id) {
      return { ok: true, user: data };
    }

    if (upstreamDown(status, body)) {
      console.error(`[auth] POST /User/login_user upstream failure: ${status}`);
      return {
        ok: false,
        message: "Sign-in is temporarily unavailable. Please try again shortly.",
      };
    }

    const message = signInMessage(
      /* The default only decides what the INFRASTRUCTURE test sees when the body
         carries no message at all; `signInMessage` collapses every
         non-infrastructure outcome to `CREDENTIALS_MESSAGE` regardless. Passing
         the constant keeps the two in step so nobody reading this line thinks a
         distinct sentence still reaches the page. */
      messageFrom(body, CREDENTIALS_MESSAGE),
    );
    return {
      ok: false,
      message,
      /* Only a real rejection is throttle-worthy. `signInMessage` returns the
         "temporarily unavailable" sentence for a misconfigured upstream, and that
         must not count towards a lockout. */
      credentialsRejected: message === CREDENTIALS_MESSAGE,
    };
  } catch {
    return {
      ok: false,
      message: "We could not reach the sign-in service. Please try again.",
    };
  }
}

/**
 * Flow B — Continue with Google.
 *
 * `password` IS OMITTED ENTIRELY rather than sent empty: the API refuses the two
 * together with "password and GoogleToken cannot be provided together".
 *
 * This also SIGNS UP. An unseen Google identity creates the member and
 * `alreadyExist` reports which happened, so there is no separate
 * register-with-Google call.
 */
export async function loginWithGoogle(
  idToken: string,
  memberType?: MemberTypeValue,
): Promise<AuthResult> {
  try {
    const { status, body } = await post("/User/login_user", {
      GoogleToken: idToken,
      /*
       * OMITTED ENTIRELY when we were not told one — signing IN must never carry
       * a type, or a returning member could have theirs overwritten by whatever
       * default we happened to pick. Verified against the API: the key is
       * optional (a request without it is accepted), and only an invalid VALUE
       * is refused with "member_type must be one of: …". Sign-up passes one
       * because the visitor was actually asked.
       */
      ...(memberType
        ? { member_type: memberTypeFor("login", memberType) }
        : {}),
      visitorId: await getVisitorId(),
    });

    const data = (body as { data?: AuthUser & { alreadyExist?: boolean } } | null)
      ?.data;
    if (envelopeCode(status, body) === 200 && data?.member_id) {
      return {
        ok: true,
        user: data,
        alreadyExisted: Boolean(data.alreadyExist),
      };
    }

    if (upstreamDown(status, body)) {
      console.error(
        `[auth] POST /User/login_user (Google) upstream failure: ${status}`,
      );
      return {
        ok: false,
        message: "Sign-in is temporarily unavailable. Please try again shortly.",
      };
    }

    return {
      ok: false,
      message: signInMessage(
        messageFrom(body, "Google sign-in was not accepted."),
      ),
    };
  } catch {
    return {
      ok: false,
      message: "We could not reach the sign-in service. Please try again.",
    };
  }
}

/* ───────────────────────────────────────────────────── email verification ── */

/**
 * ON THE AUTH HOST, under its `/api/v1` prefix (Ryan, 2026-08-17:
 * "/api/v1/email-verification/send-code this for verification code").
 *
 * These used to point at `{BASE_URL}/api/email-verification/...` — the live
 * repo's paths on the OLD host — which could never have worked: an account
 * created on `mview-dev-api` does not exist on `BASE_URL`, and a code issued by
 * one host cannot be checked by the other. Both calls therefore go through the
 * SAME `post` as registration and sign-in, so the three always agree on which
 * backend owns the account.
 *
 * Verified against the live API (2026-08-17):
 *
 *   POST /api/v1/email-verification/send-code    { email, username }
 *        `{}` answers 422 with
 *        `error:[{msg:"Invalid email",param:"email"},
 *                {msg:"please provide username",param:"username"}]`,
 *        so USERNAME IS REQUIRED, not optional as the old call treated it.
 *
 *   POST /api/v1/email-verification/verify-code  — 404, ROUTE DOES NOT EXIST.
 *        Nor does any spelling of it: verifyCode, verify, check-code,
 *        validate-code, confirm-code and update-email-verified all answer
 *        "Cannot POST". `send-code` is the only one of the three the live repo
 *        uses that has been deployed to this host.
 *
 * The 404 is reported as its own thing rather than as a bad code — see
 * `verifyCode`. NEEDED FROM THE BACKEND TEAM: verify-code (and
 * update-email-verified) on `mview-dev-api`, or the confirmation that
 * verification now completes by emailed link instead of by code.
 */

export type VerificationResult = { ok: boolean; message: string };

/**
 * Where verification lives on whichever host `AUTH_API_URL` names.
 *
 * THE TWO HOSTS LAY THESE OUT DIFFERENTLY, and both were surveyed on 2026-08-17:
 *
 *   mview-dev-api.mineralview.com/api/v1  → /api/v1/email-verification/<name>
 *   testing-paymentapi.mineralview.com    → /api/email-verification/<name>
 *                                           (User endpoints at the root, so the
 *                                            base carries no prefix at all)
 *
 * Derived rather than configured separately ON PURPOSE. A code is issued by one
 * host and checked by the same one — they do not share state — so a second env
 * var pointing verification elsewhere would produce an account that can never be
 * confirmed. Tying it to `AUTH_API_URL` means the whole auth surface moves
 * together or not at all, and switching hosts stays a config change.
 *
 * HISTORY, worth one line: `send-code` answered 502 on mview-dev-api for most of
 * 2026-08-19 — it passed its own validation and then died trying to send the
 * mail, which blocked sign-up entirely because Create account is gated on a
 * confirmed code. Fixed on the backend the same day; it now answers 200 with
 * `expires_in_minutes: 5`. Neither path below changed, and no client change was
 * needed. Recorded only so an identical 502 is recognised rather than re-debugged
 * as a path problem.
 */
function verificationPath(name: "send-code" | "verify-code"): string {
  const versioned = /\/api\/v\d+$/.test(authBase());
  return versioned
    ? `/email-verification/${name}`
    : `/api/email-verification/${name}`;
}

/**
 * Did the API answer "no such route" rather than "no"?
 *
 * A 404 alone is the test. Neither of these endpoints has a per-record form —
 * both take an email in the body, not in the path — so there is no legitimate
 * "that email was not found" 404 for this to be confused with. The host's own
 * shape confirms it either way: an unrouted POST answers
 * `{"error":{"statusCode":404,"code":"HTTP_EXCEPTION","message":"Cannot POST …"}}`,
 * which is nothing like the `{status_code,data,error}` envelope its real
 * handlers return.
 */
function isMissingRoute(status: number): boolean {
  return status === 404;
}

/**
 * `{ email, username }` AND NOTHING ELSE (Ryan, 2026-08-19: "don't pass password
 * to send code api").
 *
 * The live site's `sendEmailVerificationCode` takes an optional third `password`
 * argument and spreads it in when truthy, and this briefly mirrored that. It is
 * deliberately NOT mirrored any more: the endpoint does not need it — its
 * validator only ever complains about `email` and `username` — and sending a
 * password to a route that issues a one-time code puts a credential in a request
 * that has no use for it.
 */
export async function sendVerificationCode(
  email: string,
  username: string,
): Promise<VerificationResult> {
  try {
    const { status, body } = await post(verificationPath("send-code"), {
      email,
      username,
    });

    if (isMissingRoute(status)) {
      console.error(
        "[auth] POST /email-verification/send-code is not deployed on AUTH_API_URL.",
      );
      return {
        ok: false,
        message: "We could not send the code just now. Please try again later.",
      };
    }

    // The envelope's own code wins here too — this host answers 422 inside a
    // 200-shaped body on some routes.
    const ok =
      (body as { success?: boolean } | null)?.success ??
      envelopeCode(status, body) < 400;

    if (upstreamDown(status, body)) {
      console.error(
        `[auth] POST /email-verification/send-code upstream failure: ${status}`,
      );
      return {
        ok: false,
        message: "We could not send the code just now. Please try again shortly.",
      };
    }

    return {
      ok: Boolean(ok),
      message: messageFrom(body, ok ? "" : "We could not send the code."),
    };
  } catch {
    return { ok: false, message: "We could not send the code. Please retry." };
  }
}

export async function verifyCode(
  email: string,
  code: string,
): Promise<VerificationResult> {
  try {
    const { status, body } = await post(verificationPath("verify-code"), {
      email,
      verification_code: code,
    });

    /*
     * A MISSING ROUTE IS NOT A WRONG CODE. Left to fall through, the 404 would
     * be reported as "That code is invalid or expired" — sending someone to
     * re-read an email and retype six digits that were right all along, for as
     * long as the endpoint stays undeployed. The visitor gets a sentence that
     * does not blame them; the engineer gets the reason in the log.
     */
    if (isMissingRoute(status)) {
      console.error(
        "[auth] POST /email-verification/verify-code returned 404 — the route is " +
          "not deployed on AUTH_API_URL. Email verification cannot complete " +
          "until the backend ships it.",
      );
      return {
        ok: false,
        message:
          "Email confirmation is not available yet. Your account was created — " +
          "please contact support@mineralview.com to finish activating it.",
      };
    }

    /*
     * `data.is_verified` IS THE ANSWER, and it is checked first (contract from
     * Ryan, 2026-08-19). A success looks like:
     *
     *   {"status_code":200,
     *    "data":{"email":"…","is_verified":true,"verified_at":"…"},
     *    "error":"","message":"Email verified successfully"}
     *
     * There is no top-level `success` or `verified` in that shape, so this used
     * to fall all the way through to "the envelope code is under 400" and call a
     * 200 verified on the strength of the status alone. That is the one thing
     * this function must not get wrong: a 200 carrying `is_verified: false` would
     * have unlocked Create account for an unconfirmed address.
     *
     * `data` needs the typeof guard because it is NOT always an object — the
     * failure envelopes send `"data": ""` (confirmed against the 400 for a wrong
     * code), and `"".is_verified` is undefined rather than an error, which would
     * silently resume the old fall-through.
     *
     * The two legacy keys stay as fallbacks below it: the other host answers with
     * `success`, and nothing is gained by dropping a branch that costs a `??`.
     */
    const record = (body ?? {}) as {
      success?: boolean;
      verified?: boolean;
      data?: { is_verified?: boolean } | string | null;
    };
    const data =
      typeof record.data === "object" && record.data !== null
        ? record.data
        : null;
    const ok =
      data?.is_verified ??
      record.success ??
      record.verified ??
      envelopeCode(status, body) < 400;

    if (upstreamDown(status, body)) {
      console.error(
        `[auth] POST /email-verification/verify-code upstream failure: ${status}`,
      );
      return {
        ok: false,
        message: "We could not check that code just now. Please try again shortly.",
      };
    }

    return {
      ok: Boolean(ok),
      message: messageFrom(body, ok ? "" : "That code is invalid or expired."),
    };
  } catch {
    return { ok: false, message: "That code is invalid or expired." };
  }
}

/* ────────────────────────────────────────────────────── password reset ── */

/**
 * Step 1 — ask the API to email a reset link.
 *
 * `PUT /User/GenerateResetPassowrdToken` with `{ _emailid }`. The spelling of the
 * path is the API's, typo and all; so is `_emailid`. Both are reproduced exactly
 * because they are what the endpoint answers to.
 *
 * `/User/forgot-password` is an ALIAS for the same thing — probed with an
 * identical payload and it returned an identical `{"data":"SUCCESS"}`. The older
 * name is the one used here only because the live site uses it, so both apps hit
 * the same route and a backend change lands on both at once.
 *
 * DOES NOT REVEAL WHETHER THE ADDRESS EXISTS, and neither does this function.
 * Probed with `nobody@example.com`, which has no account, and the answer was
 * still `{"status_code":200,"data":"SUCCESS"}`. That is the correct behaviour —
 * a reset form that distinguishes is an enumeration oracle, exactly what was
 * fixed on sign-in — so the caller must show one neutral sentence either way.
 */
export async function requestPasswordReset(
  email: string,
): Promise<VerificationResult> {
  try {
    /*
     * ─────────────────────────────────────────────────────────────────────────
     * THE EMAILED LINK POINTS AT PRODUCTION, AND THIS MAY NOT FIX IT.
     *
     * Reported 2026-08-19: the reset email that mview-dev-api sends contains a
     * `https://mineralview.com/...` link, so testing the flow on the preview
     * deployment means hand-editing the host out of the URL.
     *
     * THE LINK IS COMPOSED ENTIRELY BY THE BACKEND. Our request carries the
     * address and nothing else — same as the live site's — and the response hands
     * back no token and no URL, just `{"status_code":200,"data":"SUCCESS"}`. So
     * there is nothing here to point anywhere; the host is a setting on the API.
     *
     * WHAT THIS SENDS, AND WHY IT IS A GUESS. `_baseurl` follows the endpoint's
     * own naming (`_emailid`, `_rtoken`, `_newpwd`), and `Origin`/`Referer` are
     * what a backend would read if it derived the host from the caller. Neither
     * is confirmed: probed with EIGHT candidate field names — `_baseurl`,
     * `_redirecturl`, `_url`, `redirectUrl`, `baseUrl`, `origin`, `callbackUrl`,
     * `frontendUrl` — and every one returned the identical `SUCCESS`, because the
     * endpoint ignores unknown fields silently. The response therefore cannot
     * tell us whether any of them lands, and the only place the effect shows is
     * the delivered email, which cannot be read from here.
     *
     * SO: HARMLESS IF IGNORED, correct the moment the backend honours either.
     * Do NOT read this as the bug being fixed — CHECK A REAL EMAIL. If the link
     * still says mineralview.com, the ask is for the backend team: make the
     * reset-link base an environment setting, or tell us the field name and we
     * will send that instead of guessing.
     * ─────────────────────────────────────────────────────────────────────────
     */
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");

    const { status, body } = await post(
      "/User/GenerateResetPassowrdToken",
      { _emailid: email, ...(siteUrl ? { _baseurl: siteUrl } : {}) },
      "PUT",
      siteUrl ? { Origin: siteUrl, Referer: `${siteUrl}/reset-password` } : {},
    );

    if (upstreamDown(status, body)) {
      console.error(
        `[auth] PUT /User/GenerateResetPassowrdToken upstream failure: ${status}`,
      );
      return {
        ok: false,
        message: "We could not send the link just now. Please try again shortly.",
      };
    }

    /*
     * `data` CARRIES THE VERDICT, not the status. The live site tests
     * `status_code === 200 && !response.data?.includes('INVALID')`, because this
     * endpoint reports a refusal inside a 200 — the same shape that made
     * `verify-code` treat an unverified address as verified until it was fixed.
     * `String()` first: `data` is a bare string here ("SUCCESS") but an array on
     * the sibling endpoint, and `.includes` means different things to each.
     */
    const data = (body as { data?: unknown } | null)?.data;
    const ok =
      envelopeCode(status, body) === 200 &&
      !String(data ?? "").toUpperCase().includes("INVALID");

    return {
      ok,
      message: ok ? "" : messageFrom(body, "We could not send the link."),
    };
  } catch {
    return {
      ok: false,
      message: "We could not reach the sign-in service. Please try again.",
    };
  }
}

/**
 * Step 2 — set the new password, using the token from the emailed link.
 *
 * `PUT /User/ResetPassword` with `{ _rtoken, _newpwd }`. `/User/reset-password`
 * is an alias; same reasoning as above for preferring the live site's spelling.
 *
 * AN INVALID TOKEN STILL ANSWERS HTTP 200. Probed with an all-zero UUID:
 *
 *   {"status_code":200,"data":[{"resetpassowrd":"INVALID_TOKEN"}],"error":""}
 *
 * So the status says nothing and `error` is EMPTY — the outcome lives in
 * `data[0].resetpassowrd`, spelled the way the API spells it. Reading the status
 * alone would report "password updated" to someone whose link had expired, and
 * they would then fail to sign in with a password that was never stored.
 */
export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<VerificationResult> {
  try {
    const { status, body } = await post(
      "/User/ResetPassword",
      { _rtoken: token, _newpwd: newPassword },
      "PUT",
    );

    if (upstreamDown(status, body)) {
      console.error(`[auth] PUT /User/ResetPassword upstream failure: ${status}`);
      return {
        ok: false,
        message: "We could not reset the password just now. Please try again shortly.",
      };
    }

    const rows = (body as { data?: unknown } | null)?.data;
    const outcome =
      Array.isArray(rows) && rows.length > 0
        ? (rows[0] as { resetpassowrd?: unknown }).resetpassowrd
        : undefined;

    if (String(outcome ?? "").toUpperCase() === "INVALID_TOKEN") {
      return {
        ok: false,
        /* Names the cause and the way out. "Invalid token" alone leaves someone
           re-pasting a link that will never work again — the actionable fact is
           that these expire and a fresh one is a click away. */
        message:
          "That reset link is no longer valid. Request a new one and try again.",
      };
    }

    const ok = envelopeCode(status, body) === 200 && outcome !== undefined;
    return {
      ok,
      message: ok ? "" : messageFrom(body, "We could not reset that password."),
    };
  } catch {
    return {
      ok: false,
      message: "We could not reach the sign-in service. Please try again.",
    };
  }
}

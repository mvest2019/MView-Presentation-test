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
  | { ok: false; message: string; needsEmailVerification?: boolean };

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
): Promise<{ status: number; body: unknown }> {
  const response = await fetch(`${authBase()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  let body: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
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

    const message = messageFrom(body, "We could not create that account.");
    if (/already registered/i.test(message)) {
      return {
        ok: false,
        message: "That email address already has an account. Sign in instead.",
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
 * The 401 sentinels, rewritten for a reader.
 *
 * The subscription one is deliberately NOT in here: it is the only one carrying
 * information a visitor cannot get anywhere else, so it passes through word for
 * word. "Please register" is rewritten because on its own it reads as an order
 * with no explanation.
 */
const SIGN_IN_MESSAGES: Record<string, string> = {
  "please register": "We have no account for that email. Create one first.",
  "incorrect email or password": "That email and password did not match.",
  "username or password incorrect": "That email and password did not match.",
};

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
  const known = SIGN_IN_MESSAGES[raw.trim().toLowerCase()];
  if (known) return known;

  if (INFRASTRUCTURE.test(raw)) {
    // Kept where an engineer will see it; the visitor gets a plain sentence.
    console.error(`[auth] upstream configuration error: ${raw}`);
    return SHOW_UPSTREAM
      ? `Sign-in is temporarily unavailable. Upstream said: ${raw}`
      : "Sign-in is temporarily unavailable. Please try again shortly.";
  }

  return raw;
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

    return {
      ok: false,
      message: signInMessage(
        messageFrom(body, "That email and password did not match."),
      ),
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

    const record = (body ?? {}) as { success?: boolean; verified?: boolean };
    const ok =
      record.success ?? record.verified ?? envelopeCode(status, body) < 400;

    return {
      ok: Boolean(ok),
      message: messageFrom(body, ok ? "" : "That code is invalid or expired."),
    };
  } catch {
    return { ok: false, message: "That code is invalid or expired." };
  }
}

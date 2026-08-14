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
    const errors = record.errors;
    if (Array.isArray(errors) && errors.length) {
      const first = errors[0];
      if (typeof first === "string") return first;
      if (first && typeof first === "object") {
        const message = (first as Record<string, unknown>).message;
        if (typeof message === "string") return message;
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

function signInMessage(raw: string): string {
  const known = SIGN_IN_MESSAGES[raw.trim().toLowerCase()];
  if (known) return known;

  if (INFRASTRUCTURE.test(raw)) {
    // Kept where an engineer will see it; the visitor gets a plain sentence.
    console.error(`[auth] upstream configuration error: ${raw}`);
    return "Sign-in is temporarily unavailable. Please try again shortly.";
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
 * NOT PART OF THE SUPPLIED CONTRACT — and probably wrong now.
 *
 * These two are the live repo's endpoints on the OLD host. They are kept because
 * the design gates the account on an emailed code, and the new login response
 * ("Please Verify Your email id") shows the new API expects verification too —
 * but the backend team did not supply endpoints for it.
 *
 * An account created on the new host will not exist on `BASE_URL`, so these
 * calls are expected to fail. ASK FOR THE EQUIVALENTS on the new API before
 * relying on this step.
 */
function legacyBase(): string {
  const url = process.env.BASE_URL;
  if (!url) throw new Error("BASE_URL is not set.");
  return url.replace(/\/+$/, "");
}

export type VerificationResult = { ok: boolean; message: string };

async function postLegacy(path: string, payload: unknown) {
  const response = await fetch(`${legacyBase()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  return { status: response.status, body };
}

export async function sendVerificationCode(
  email: string,
  username: string,
): Promise<VerificationResult> {
  try {
    const { status, body } = await postLegacy(
      "/api/email-verification/send-code",
      { email, username },
    );
    const ok =
      (body as { success?: boolean } | null)?.success ??
      (status >= 200 && status < 300);
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
    const { status, body } = await postLegacy(
      "/api/email-verification/verify-code",
      { email, verification_code: code },
    );
    const record = (body ?? {}) as { success?: boolean; verified?: boolean };
    const ok =
      record.success ?? record.verified ?? (status >= 200 && status < 300);
    return {
      ok: Boolean(ok),
      message: messageFrom(body, ok ? "" : "That code is invalid or expired."),
    };
  } catch {
    return { ok: false, message: "That code is invalid or expired." };
  }
}

import "server-only";

import { cookies } from "next/headers";

import type { AuthUser } from "./auth-api";

/**
 * Who is signed in, for display.
 *
 * READ THIS BEFORE PUTTING ANYTHING BEHIND IT. This cookie is NOT an
 * authorisation boundary. It is httpOnly, so page JavaScript cannot read or
 * forge it from the browser, and `sameSite: lax` keeps it off cross-site
 * requests — but it is not signed, and `/User/login_user` returns no token this
 * build could verify. Anyone able to set a cookie on the domain could put a name
 * in it. All it is trusted to do is decide whether the header shows "Sign in" or
 * the visitor's name.
 *
 * The moment a page holds data that not every visitor may see, this is not
 * enough. That needs either NextAuth (which is how the live site does it — see
 * `auth.ts` in the Next repo) or a signed token from the API, and every gated
 * read must be authorised server-side by the API itself rather than by trusting
 * anything stored here.
 *
 * Only the four fields the header needs are stored. The login response is a
 * ~40-field record including subscription and verification state; putting all of
 * it in a cookie would leak account details into every request and risk blowing
 * the 4KB cookie limit.
 */

const COOKIE = "mv_user";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export interface SessionUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  /**
   * `mineral_owner` or `professional` — the account CATEGORY, which is what
   * the login response carries and all it carries.
   *
   * It was being dropped here, and it is worth keeping: `auth-actions.ts`
   * already branches a landing page on it, and the portal is a mineral-owner
   * surface. But it is NOT a plan: there is no subscription, entitlement or
   * trial field anywhere in the login response or in `/api/v1/dashboard`, so
   * nothing here can tell paid from trial from lapsed. Anything that needs
   * that has to wait for the backend to serve it.
   */
  memberType?: string;
  /**
   * The member's own `profile_pic`, when the record carries a usable one.
   *
   * OPTIONAL, AND EVERY READER MUST COPE WITHOUT IT. The field is absent from
   * the login response for most accounts, absent from every cookie written
   * before this was added, and the URL it names can 404 — so the avatar that
   * uses it falls back to initials rather than treating it as present.
   *
   * A URL and not the bytes, so this costs the cookie a hundred-odd characters
   * and stays nowhere near the 4KB limit the note above is about.
   */
  profileImage?: string;
  /**
   * WHICH SIGN-IN THIS IS — the API's `member_session` id for this device.
   *
   * The profile screen's "Where you are signed in" panel needs it twice over:
   * to mark one row "This device", and to tell "Sign out everywhere else" which
   * session to KEEP. Without it that button cannot spare the browser it was
   * pressed in, and the API refuses to guess rather than signing the reader out
   * of the page they pressed it on.
   *
   * ── IT IS NOT A CREDENTIAL, AND IT IS NOT AUTHENTICATION ──────────────────
   *
   * Read the warning at the top of this file: this cookie is unsigned, so
   * nothing in it may be trusted. An id here lets a caller name a session to
   * sign OUT — a destructive action against their own account and nothing else.
   * It grants no access and reads no data, and the API scopes every statement by
   * member id regardless, so a forged one names a session that is not there.
   * It is httpOnly all the same, so page JavaScript cannot read it out.
   *
   * ── OPTIONAL, AND OLDER COOKIES DO NOT HAVE IT ────────────────────────────
   *
   * Every cookie written before this shipped is missing it, and those sessions
   * stay signed in — the field appears at their next sign-in. Readers cope with
   * its absence rather than treating it as a broken session.
   *
   * A UUID, so it costs the cookie 36 characters and stays nowhere near the 4KB
   * limit the note above is about.
   */
  sessionId?: string;
  /**
   * ⚠ THE API'S BEARER TOKEN. THIS ONE IS A REAL CREDENTIAL.
   *
   * Everything else in this cookie is for display and is explicitly not trusted
   * — see the warning at the top of the file. This is different: it is signed by
   * the API, the API verifies it, and whoever holds it can act as this member on
   * the endpoints that check it. Treat it accordingly.
   *
   *   · NEVER return it from a server action, put it in a prop, or log it.
   *     Server actions read it here and attach it as an `Authorization` header;
   *     it goes from this cookie to the API and nowhere else.
   *   · The cookie is httpOnly, so page JavaScript cannot read it, and
   *     `sameSite: lax` keeps it off cross-site requests.
   *   · It is what makes the device endpoints safe to expose at all. They end
   *     sessions, so a `member_id` in a request body would be a single
   *     unauthenticated call that logs any member out of every device.
   *
   * ── WHY THE FILE'S HEADER WARNING STILL STANDS ────────────────────────────
   *
   * That warning says this cookie is not an authorisation boundary, and it
   * remains true for every OTHER field: they are unsigned and forgeable, and
   * the API must not be given them as identity. This field is the exception
   * only because the API verifies its SIGNATURE — a forged value here does not
   * become a valid token by sitting in the cookie.
   *
   * A few hundred characters, so the 4KB limit is still not in sight. Optional:
   * cookies written before this shipped have no token, and those readers are
   * asked to sign in again when they open the device panel.
   */
  token?: string;
}

/**
 * `profile_pic` as something an `<img>` may be pointed at, or null.
 *
 * The API sends this field free-form — absent, empty, an absolute URL, or a
 * path on our own origin — and the portal avatar hands it straight to `src`.
 * Only `http(s)` and root-relative paths pass, so a stray `javascript:` or
 * `data:` value in the record cannot reach the DOM. A protocol-relative `//host`
 * is refused too: it is a URL to somewhere else wearing a path's clothes.
 *
 * Applied on write AND on read. The cookie is not signed — see the warning at
 * the top of this file — so what comes back out of it is checked again.
 */
function safeImageUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw || raw.startsWith("//")) return null;
  if (raw.startsWith("/") || /^https?:\/\//i.test(raw)) return raw;
  return null;
}

/**
 * `remember` is the design's "Keep me signed in on this device", which it
 * specifies as UNCHECKED by default for shared and family machines. Unchecked,
 * no `maxAge` is set, so the cookie is a session cookie and dies with the
 * browser; checked, it lasts 30 days.
 */
export async function startSession(
  user: AuthUser,
  remember = false,
): Promise<void> {
  const image = safeImageUrl(user.profile_pic);
  const value: SessionUser = {
    id: user.member_id,
    firstName: user.f_name ?? "",
    lastName: user.l_name ?? "",
    email: user.email_id ?? "",
    ...(user.member_type ? { memberType: user.member_type } : {}),
    // Spread rather than `profileImage: image ?? undefined`, so an account with
    // no picture writes no key at all instead of `"profileImage":null`.
    ...(image ? { profileImage: image } : {}),
    /* Same treatment, same reason. A login the API could not record carries no
       `session_id`, and the absence is the honest cookie — a `null` in there
       would have to be told apart from a real id by every reader. */
    ...(user.session_id ? { sessionId: user.session_id } : {}),
    ...(user.token ? { token: user.token } : {}),
  };

  (await cookies()).set(COOKIE, JSON.stringify(value), {
    httpOnly: true,
    sameSite: "lax",
    // Secure everywhere except local http, where the browser would drop it.
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(remember ? { maxAge: MAX_AGE } : {}),
  });
}

export async function endSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

/** The signed-in visitor, or null. Never throws on a malformed cookie. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SessionUser;
    if (typeof parsed?.email !== "string") return null;
    /* Re-checked on the way out, for the reason `safeImageUrl` records: this
       value ends up in an `<img src>` and the cookie carrying it is not
       signed. */
    const image = safeImageUrl(parsed.profileImage);
    return { ...parsed, profileImage: image ?? undefined };
  } catch {
    // A truncated or hand-edited cookie reads as signed out rather than 500ing
    // every page that asks.
    return null;
  }
}

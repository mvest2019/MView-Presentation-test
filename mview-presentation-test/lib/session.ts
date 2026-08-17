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
  const value: SessionUser = {
    id: user.member_id,
    firstName: user.f_name ?? "",
    lastName: user.l_name ?? "",
    email: user.email_id ?? "",
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
    return typeof parsed?.email === "string" ? parsed : null;
  } catch {
    // A truncated or hand-edited cookie reads as signed out rather than 500ing
    // every page that asks.
    return null;
  }
}

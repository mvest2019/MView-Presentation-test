import { cookies } from "next/headers";

/**
 * The anonymous visitor id the NewsFramework endpoints expect as `visitorId`.
 *
 * The production repo generates this client-side in
 * `utils/getOrCreateGuestUserId.ts` and stores it in a `guestUserID` cookie for
 * 30 days. Same cookie name and lifetime here so a visitor keeps one identity
 * across both apps, but it is minted in `proxy.ts` instead — server components
 * cannot set cookies, and doing it on the client would mean the first article
 * read of a session always reports a different id than the rest.
 */
export const GUEST_COOKIE = "guestUserID";
export const GUEST_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

/** Reads the visitor id. Empty string when the cookie has not been set yet. */
export async function getVisitorId(): Promise<string> {
  const store = await cookies();
  return store.get(GUEST_COOKIE)?.value ?? "";
}

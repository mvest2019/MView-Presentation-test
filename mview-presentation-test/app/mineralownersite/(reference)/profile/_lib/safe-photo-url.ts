/**
 * `profile_pic` as something an `<img>` may be pointed at, or null — the same
 * rules `lib/session.ts` applies to the login response's copy: only `http(s)`
 * and root-relative paths pass, so a stray `javascript:` or `data:` value in
 * the record cannot reach the DOM, and a protocol-relative `//host` is refused
 * as a URL to somewhere else wearing a path's clothes.
 *
 * ITS OWN MODULE, WITHOUT `server-only`, because both sides need it: the page
 * sanitises the session's copy on the server, and the identity strip — a
 * client component since the live-profile context — sanitises `profile_pic`
 * off each write's response in the browser.
 */
export function safePhotoUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw || raw.startsWith("//")) return null;
  if (raw.startsWith("/") || /^https?:\/\//i.test(raw)) return raw;
  return null;
}

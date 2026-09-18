/**
 * The browser-usable address of the member's uploaded photo.
 *
 * `profile_image_url` off `GET /users/me` is relative to the API'S ORIGIN,
 * which the browser never learns — every render goes through this app's
 * `/api/profile-image` proxy, with the server-built URL passed through WHOLE
 * (cache-buster `v` and all; the contract says treat it as opaque).
 *
 * ONE CONSTRUCTION, THREE CALLERS: the strip's avatar, the chrome patch in
 * `profile-live.tsx`, and the session-cookie sync in `profile-actions.ts`.
 * Written once so the header and the strip cannot disagree about where a
 * photo lives. Null in, null out — "no photo" stays a real answer.
 */
export function avatarProxyUrl(
  profileImageUrl: string | null | undefined,
): string | null {
  return profileImageUrl
    ? `/api/profile-image?src=${encodeURIComponent(profileImageUrl)}`
    : null;
}

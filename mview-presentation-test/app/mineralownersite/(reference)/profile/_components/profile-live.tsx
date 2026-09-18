"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { portalMember, type PortalMember } from "../../../_lib/portal-member";
import { usePortalMemberUpdate } from "../../../_components/portal-session";
import { avatarProxyUrl } from "../_lib/avatar-url";
import { syncSessionFromRecordAction } from "../_lib/profile-actions";
import type { UserProfile } from "../_lib/profile-api";

/**
 * THE LIVE PROFILE — one client-side copy, shared by the strip and both cards.
 *
 * ── WHY `router.refresh()` WAS NOT ENOUGH ──
 *
 * The identity card used to save and then call `router.refresh()`, trusting
 * the strip (a server component) to re-render with the new name. Measured, it
 * did not — not visibly: refreshing this ROUTE re-runs `getOwnerPayload` for
 * the chrome, and a cold owner is a multi-minute appraisal-roll scan, so the
 * fresh strip arrived minutes after the "Saved ✓" while the reader watched the
 * old name stand (user, 2026-09-17: "changed my name but the profile section
 * not reflected").
 *
 * The wasteful part is that nothing needed fetching: BOTH profile writes
 * answer with the complete fresh profile (`{profile, changed}` — the
 * contract's own shape). So the page seeds this context with the server's GET,
 * the card pushes each write's response into it, and the strip and the
 * security card read from it — the screen reflects a save in the same tick,
 * from data the server itself sent back.
 *
 * `initial` re-syncs on change so a later full server render (a navigation, a
 * reload) still wins: by then it carries data fetched after the save.
 */
const ProfileLiveContext = createContext<{
  profile: UserProfile | null;
  update: (fresh: UserProfile) => void;
} | null>(null);

export function ProfileLive({
  initial,
  children,
}: {
  initial: UserProfile | null;
  children: ReactNode;
}) {
  const [profile, setProfile] = useState(initial);
  const patchChrome = usePortalMemberUpdate();

  /* a fresh server render replaces the client copy — its GET ran after any
     write this screen has made, so it is never older than what it replaces.
     Adjusted DURING render (React's own pattern for state that derives from a
     changed prop), not in an effect: an effect would paint the stale value
     first and re-render after. */
  const [seenInitial, setSeenInitial] = useState(initial);
  if (initial !== seenInitial) {
    setSeenInitial(initial);
    setProfile(initial);
  }

  /*
   * EVERY PUBLISHED PROFILE ALSO REACHES THE CHROME (user, 2026-09-18:
   * "reflect that on header also"). The bar's avatar, the account menu and the
   * drawer all read `usePortalMember()`, built from the session cookie at page
   * load — a save on this page would leave them printing the old identity
   * until the next server render. So each write's fresh profile is derived
   * through `portalMember` — the SAME function the chrome's own values come
   * from, so the bar's initials cannot disagree with themselves — and patched
   * over the server value. The photo is patched only when the record HAS one:
   * with none, the chrome keeps whatever the session carried (a Google
   * picture, usually) rather than losing it to null.
   */
  const update = (fresh: UserProfile) => {
    setProfile(fresh);
    const patch = chromePatchFrom(fresh);
    if (patch && patchChrome) patchChrome(patch);
  };

  /*
   * THE RECORD CAN ALREADY BE AHEAD OF THE COOKIE when the page opens — a
   * photo uploaded before the cookie sync existed, or a change made on another
   * device — and then the strip (off the GET) shows the new identity while the
   * bar (off the cookie) keeps the old one, with no save coming to reconcile
   * them (user, 2026-09-18: exactly this, photo in the strip, initials in the
   * bar). So once on mount: the chrome is patched from the profile the page
   * just fetched, and the session cookie is rewritten from the record —
   * fire-and-forget, so every OTHER page's header is right from now on too.
   */
  useEffect(() => {
    if (!initial) return;
    const patch = chromePatchFrom(initial);
    if (patch && patchChrome) patchChrome(patch);
    void syncSessionFromRecordAction();
    // mount-only by design: later profiles flow through `update`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ProfileLiveContext.Provider value={{ profile, update }}>
      {children}
    </ProfileLiveContext.Provider>
  );
}

/**
 * What the chrome should say once this profile is the truth — derived through
 * `portalMember`, the chrome's OWN derivation, so the bar's initials cannot
 * disagree with themselves. The photo rides along only when the record has
 * one; a null must not erase the session's sign-in picture.
 */
function chromePatchFrom(fresh: UserProfile): Partial<PortalMember> | null {
  const derived = portalMember({
    id: fresh.member_id,
    firstName: fresh.first_name ?? "",
    lastName: fresh.last_name ?? "",
    email: fresh.email,
  });
  if (!derived) return null;
  const photo = avatarProxyUrl(fresh.profile_image_url);
  return {
    name: derived.name,
    firstName: derived.firstName,
    initials: derived.initials,
    email: derived.email,
    ...(photo ? { image: photo } : {}),
  };
}

/** the live profile and its updater; throws where the provider is missing so
 *  a consumer mounted outside it fails loudly instead of rendering nothing */
export function useProfileLive() {
  const ctx = useContext(ProfileLiveContext);
  if (!ctx) {
    throw new Error("useProfileLive: no <ProfileLive> above this component");
  }
  return ctx;
}

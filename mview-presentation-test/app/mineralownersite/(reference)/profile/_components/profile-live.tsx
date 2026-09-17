"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

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

  return (
    <ProfileLiveContext.Provider value={{ profile, update: setProfile }}>
      {children}
    </ProfileLiveContext.Provider>
  );
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

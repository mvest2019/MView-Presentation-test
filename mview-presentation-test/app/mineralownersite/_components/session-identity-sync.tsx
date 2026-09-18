"use client";

import { useEffect, useRef } from "react";

import { chromePatchFrom } from "../(reference)/profile/_components/profile-live";
import { syncSessionFromRecordAction } from "../(reference)/profile/_lib/profile-actions";
import { usePortalMemberUpdate } from "./portal-session";

/**
 * THE SESSION CATCHES UP WITH THE RECORD, ON WHATEVER PORTAL PAGE LOADS FIRST.
 *
 * A fresh sign-in writes the cookie from the AUTH API's login response, which
 * predates the uploaded avatar — `adoptUploadedPhoto` in `auth-actions.ts`
 * papers over that at login, but any path around it (an old cookie, a login
 * that raced the profile read's five-second bound, a photo uploaded on another
 * device) left the header on initials until the member happened to open
 * My Profile, because only that page ran the reconciliation (user, 2026-09-18:
 * "when I am going on profile page, then only on header that profile visible —
 * that is bug"). Both portal layouts render this instead, so the LANDING page
 * after sign-in — the dashboard, usually — heals itself.
 *
 * WHAT IT DOES, ONCE PER MOUNT, AND ONLY WHEN THE SESSION LACKS A PHOTO:
 * `syncSessionFromRecordAction` re-reads the record and rewrites the cookie
 * (so every later page is right), and the returned profile is patched onto
 * the on-screen chrome through the same derivation the profile page uses (so
 * THIS page's bar is right without waiting for a navigation). When the record
 * has no photo either, the patch carries none and the initials stand — the
 * one GET is the entire cost, and only for sessions with no picture.
 *
 * Renders nothing. Mounted inside `PortalSessionProvider` in both group
 * layouts, which App Router keeps mounted across client navigations — so this
 * runs once per full page load, not once per route change.
 */
export function SessionIdentitySync({
  sessionHasPhoto,
}: {
  /** whether the cookie already carries a picture — true means nothing to do */
  sessionHasPhoto: boolean;
}) {
  const patchChrome = usePortalMemberUpdate();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current || sessionHasPhoto) return;
    ran.current = true;
    void syncSessionFromRecordAction().then((profile) => {
      if (!profile || !patchChrome) return;
      const patch = chromePatchFrom(profile);
      if (patch) patchChrome(patch);
    });
    // once per mount by design; the props cannot meaningfully change under it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

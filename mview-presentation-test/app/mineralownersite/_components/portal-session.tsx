"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { portalMember, type PortalMember } from "../_lib/portal-member";
import type { SessionUser } from "@/lib/session";

/**
 * WHO IS SIGNED IN, for the portal chrome.
 *
 * ONE CONTEXT FOR BOTH SHELLS. The portal has two, deliberately — see
 * `(reference)/layout.tsx` — and each has to print the member's own name,
 * picture and email in its account menu. The reason this is a context rather
 * than a prop is the reference one: its chrome is
 * `layout → page → Portal → Chrome`, `Portal` is a deliberate copy of the
 * reference build's own file, and threading a prop through it would fork it for
 * a value it has no use for. Seven pages render `Portal`; all of them get the
 * member from here instead, and `Portal.tsx` is untouched.
 *
 * THE READ IS STILL ON THE SERVER, in each group's layout. The `mv_user` cookie
 * is httpOnly and stays that way: nothing here fetches, and no signed-in name is
 * ever requested from the browser. This only carries a value the server already
 * put in the HTML.
 *
 * NULL IS A NORMAL VALUE, not an error. Neither layout is an auth boundary —
 * the portal is reachable signed out and shows the fictional demo record — so
 * every consumer falls back rather than hiding its chrome.
 *
 * IT IS NOT AN AUTHORISATION SIGNAL. The cookie behind it is unsigned; read the
 * warning at the top of `lib/session.ts` before gating anything on it. All it is
 * trusted to do is decide which name the account menu prints.
 */
const PortalSessionContext = createContext<PortalMember | null>(null);

/**
 * THE LIVE PATCH — how a page updates the chrome WITHOUT a server round trip.
 *
 * The profile page writes a new name, email or photo and the reader expects
 * the bar's avatar and account menu to follow at once (user, 2026-09-18:
 * "when we change profile then reflect that on header also"). The server side
 * is already handled — `profile-actions.ts` rewrites the session cookie, so
 * the NEXT render of any layout carries the change — but the chrome already
 * on screen was built from the cookie as it stood at page load, and
 * re-rendering the route to refresh it would wait on the chrome's own owner
 * scan. So the provider accepts a client-side patch over the server value.
 *
 * A separate context from the member itself, so the thirty-odd read-only
 * consumers do not re-render when the (stable) setter is created, and none of
 * them can patch by accident.
 */
const PortalSessionUpdateContext = createContext<
  ((patch: Partial<PortalMember>) => void) | null
>(null);

export function PortalSessionProvider({
  user,
  children,
}: {
  /** From `getSessionUser()` in the group's layout. */
  user: SessionUser | null;
  children: ReactNode;
}) {
  /* Derived once here rather than in each consumer, so the bar's initials and
     the drawer's initials cannot come out differently — see `portal-member.ts`.
     Memoised on the four fields and not on `user`, because the layout builds a
     fresh object every render and the identity alone would change each time. */
  const serverMember = useMemo(
    () => portalMember(user),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.id, user?.firstName, user?.lastName, user?.email, user?.profileImage],
  );

  const [patch, setPatch] = useState<Partial<PortalMember> | null>(null);

  /* A FRESH SERVER VALUE CLEARS THE PATCH — adjusted during render, React's
     own pattern for state that derives from a changed prop. By the time a new
     server render arrives, the cookie it read already carries what the patch
     was papering over (the actions sync it), so the server value is never
     older than the patch it replaces. */
  const [seenServerMember, setSeenServerMember] = useState(serverMember);
  if (serverMember !== seenServerMember) {
    setSeenServerMember(serverMember);
    setPatch(null);
  }

  /* signed out stays signed out — a patch cannot invent a member */
  const member =
    serverMember && patch ? { ...serverMember, ...patch } : serverMember;

  const applyPatch = (next: Partial<PortalMember>) =>
    setPatch((current) => ({ ...current, ...next }));

  return (
    <PortalSessionContext.Provider value={member}>
      <PortalSessionUpdateContext.Provider value={applyPatch}>
        {children}
      </PortalSessionUpdateContext.Provider>
    </PortalSessionContext.Provider>
  );
}

/**
 * The chrome patcher, or null outside a provider — a caller in a bare test or
 * preview shell simply has no chrome to update, which is not an error.
 */
export function usePortalMemberUpdate(): ((
  patch: Partial<PortalMember>,
) => void) | null {
  return useContext(PortalSessionUpdateContext);
}

/**
 * The signed-in member, or null.
 *
 * NULL FOR "NO PROVIDER" AND FOR "SIGNED OUT" ALIKE, and that is on purpose:
 * both mean "print the fallback", and a hook that threw for a missing provider
 * would turn a shell rendered outside a portal layout — a Storybook page, a
 * test, the mobile preview iframe — into a crash rather than the demo identity.
 */
export function usePortalMember(): PortalMember | null {
  return useContext(PortalSessionContext);
}

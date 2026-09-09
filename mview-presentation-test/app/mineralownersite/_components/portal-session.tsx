"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

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
  const member = useMemo(
    () => portalMember(user),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.id, user?.firstName, user?.lastName, user?.email, user?.profileImage],
  );

  return (
    <PortalSessionContext.Provider value={member}>
      {children}
    </PortalSessionContext.Provider>
  );
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

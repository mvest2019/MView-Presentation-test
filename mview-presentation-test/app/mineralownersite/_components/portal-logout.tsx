"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { PortalIcon } from "./portal-icon";
import { signOutAction } from "@/app/_components/auth-actions";

/**
 * Log out — the portal's copy of the header's Sign out, and the same action.
 *
 * IT REUSES `signOutAction` AND ADDS NOTHING TO IT. That action is one line —
 * `endSession()`, which deletes the `mv_user` cookie — and it is what the
 * marketing header's `AccountMenu` has always called. No second sign-out path,
 * no cookie touched from the browser (it is httpOnly, so page JavaScript could
 * not clear it anyway), and no change to `lib/session.ts`'s contract.
 *
 * THIS IS THE ONE THING THE PORTAL TREE REACHES OUT OF ITSELF FOR, besides the
 * logo. `(portal)/layout.tsx` says the portal is meant to stay isolated from
 * `app/_components`, and duplicating an auth action is exactly the case that
 * rule is not for: two ways to end a session is how one of them stops being
 * maintained.
 *
 * WHERE IT LANDS, and why not `router.refresh()` as the marketing header does.
 * Over there a refresh is the whole job — it swaps the account menu back for
 * "Sign in" and the visitor stays on the marketing page they were reading. Here
 * the page IS the account: a refresh would leave a signed-out person sitting in
 * a dashboard, which reads as the logout having failed. So this leaves for
 * `/login`, then refreshes so the server tree behind it is rebuilt without the
 * cookie rather than served from the client router's cache.
 *
 * `replace`, NOT `push`: Back out of the login page must not return to a portal
 * screen rendered for the member who just left.
 *
 * A `<button>` INSIDE THE MENU, not a link. Signing out is an action, and the
 * `role="menuitem"` beside the menu's links keeps it in the same arrow-key
 * order. `.v41-logout` gives it the design's own destructive treatment — see
 * `portal.css` §3.
 */
export function PortalLogout({
  className = "v41-logout",
  onDone,
}: {
  /** The row's class. `.v41-logout` in the menu, plus `.nav-item` in the drawer. */
  className?: string;
  /** Close the menu or drawer that holds this row. */
  onDone?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function logOut() {
    startTransition(async () => {
      await signOutAction();
      onDone?.();
      router.replace("/login");
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      role="menuitem"
      className={className}
      onClick={logOut}
      /* Disabled only while the action is in flight, so a double-tap on a phone
         does not fire two sign-outs and two navigations. */
      disabled={pending}
      title="Log out of your Mineral View account"
    >
      <PortalIcon name="logout" />
      {pending ? "Logging out…" : "Log out"}
    </button>
  );
}

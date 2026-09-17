import type { Metadata } from "next";

import { PORTAL_HOME } from "@/lib/routes";

import { AuthShell } from "../_components/auth-shell";
import { LoginForm } from "./_components/login-form";

export const metadata: Metadata = {
  title: "Sign in | Mineral View",
  description: "Sign in to your Mineral View account.",
  // A sign-in page in search results is noise.
  robots: { index: false, follow: true },
};

/**
 * Sign in — the design's `route:login`.
 *
 * `?next=` carries where to return to. It is checked for a single leading slash
 * before use: without that, `?next=https://evil.example` would turn this page
 * into an open redirect that borrows Mineral View's domain.
 *
 * WITH NO `?next=`, SIGNING IN LANDS ON THE PORTAL, not on `/`. Someone who has
 * just entered a password wants the signed-in product, and the header already
 * offers exactly that destination once a session exists ("Go to your portal →",
 * `_components/site-header.tsx`); dropping them on the marketing home page made
 * them find that link themselves.
 *
 * THE DESTINATION IS `PORTAL_HOME`, AND IT USED TO BE A HARD-CODED `/portal`
 * THAT 404'd. That path was a placeholder written before the portal existed, on
 * the understanding that the route was coming. It came — at `/mineralownersite`
 * — and `site-header.tsx` was moved onto it while this page was left behind, so
 * every successful sign-in landed on the 404 page. Importing the constant is
 * what stops that happening again: see `lib/routes.ts`.
 */
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  /*
   * NO SESSION CHECK HERE ANY MORE — `proxy.ts` redirects a signed-in GET off
   * this page before it renders, and the redirect() that used to sit here was
   * the LAST piece of the blank-page bug (Pragati, 2026-09-17, screenshot:
   * signed-in header over an empty band at `/login?next=…`, "Rendering…").
   *
   * WHY IT HAD TO GO: signing in is a server-action POST to THIS route, and
   * the proxy passes POSTs through on purpose — bouncing them would break the
   * sign-in itself. `startSession` sets a cookie, and a cookie set in an
   * action makes Next RE-RENDER the current page inside that same POST
   * response — at which point a session exists, this redirect() fired, and
   * the client followed it as a soft navigation: `/login` committed with an
   * EMPTY page slot and held it for the whole portal build, racing the form's
   * own full `window.location.assign(next)`. Without it, the re-render just
   * shows the form again ("Signed in — loading your portal…") and the assign
   * does one clean full navigation, old page on screen until the portal is
   * ready.
   *
   * A signed-in visitor can now only reach this render through a non-GET or
   * with the proxy out of the picture; they get the form, and signing in
   * again simply refreshes their session. That is a better failure than a
   * blank page.
   */
  const params = await searchParams;
  const requested = Array.isArray(params.next) ? params.next[0] : params.next;
  const next = requested && /^\/(?!\/)/.test(requested) ? requested : PORTAL_HOME;

  return (
    <AuthShell>
      <LoginForm next={next} />
    </AuthShell>
  );
}

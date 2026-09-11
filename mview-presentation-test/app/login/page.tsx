import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PORTAL_HOME } from "@/lib/routes";
import { getSessionUser } from "@/lib/session";

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
  if (await getSessionUser()) redirect(PORTAL_HOME);

  const params = await searchParams;
  const requested = Array.isArray(params.next) ? params.next[0] : params.next;
  const next = requested && /^\/(?!\/)/.test(requested) ? requested : PORTAL_HOME;

  return (
    <AuthShell>
      <LoginForm next={next} />
    </AuthShell>
  );
}

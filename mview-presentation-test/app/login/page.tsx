import type { Metadata } from "next";
import { redirect } from "next/navigation";

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
 * WITH NO `?next=`, SIGNING IN LANDS ON `/portal`, not on `/`. Someone who has
 * just entered a password wants the signed-in product, and the header already
 * offers exactly that destination once a session exists ("Go to your portal →",
 * `_components/site-header.tsx`); dropping them on the marketing home page made
 * them find that link themselves.
 *
 * `/portal` DOES NOT EXIST IN THIS APP YET and currently 404s — as the header
 * link already does. Pointed here deliberately, on the understanding that the
 * route is coming; until it lands, sign-in ends on a 404 rather than on the home
 * page. Both this default and that header link need updating together if the
 * portal turns out to live on another domain instead.
 */
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (await getSessionUser()) redirect("/portal");

  const params = await searchParams;
  const requested = Array.isArray(params.next) ? params.next[0] : params.next;
  const next = requested && /^\/(?!\/)/.test(requested) ? requested : "/portal";

  return (
    <AuthShell>
      <LoginForm next={next} />
    </AuthShell>
  );
}

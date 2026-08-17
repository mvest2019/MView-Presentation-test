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
 */
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (await getSessionUser()) redirect("/");

  const params = await searchParams;
  const requested = Array.isArray(params.next) ? params.next[0] : params.next;
  const next = requested && /^\/(?!\/)/.test(requested) ? requested : "/";

  return (
    <AuthShell>
      <LoginForm next={next} />
    </AuthShell>
  );
}

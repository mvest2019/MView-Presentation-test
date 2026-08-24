import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/session";

import { AuthShell } from "../_components/auth-shell";
import { RegisterForm } from "./_components/register-form";

export const metadata: Metadata = {
  title: "Create your free account | Mineral View",
  description:
    "Create a free Mineral View account to claim your owner record and follow lease activity.",
  robots: { index: false, follow: true },
};

/**
 * Sign up — the design's `route:signup`.
 *
 * `?next=` and the `/portal` default are sign-in's, for sign-in's reasons — see
 * the block comment on `app/login/page.tsx`, including the note that `/portal`
 * does not exist in this app yet. Registration now ends in a session (the live
 * site signs the new member straight in), so it has the same destination problem
 * and takes the same answer. The leading-slash test is what stops
 * `?next=https://evil.example` turning this into an open redirect.
 *
 * The live site defaults this to `/portal` too, then routes free plans via
 * `/welcome` and paid ones via `/payment`. Neither page exists here and no plan
 * is chosen on this form, so both branches are dropped and the landing is direct.
 */
export default async function RegisterPage({
  searchParams,
}: PageProps<"/register">) {
  if (await getSessionUser()) redirect("/portal");

  const params = await searchParams;
  const requested = Array.isArray(params.next) ? params.next[0] : params.next;
  const next = requested && /^\/(?!\/)/.test(requested) ? requested : "/portal";

  return (
    <AuthShell>
      <RegisterForm next={next} />
    </AuthShell>
  );
}

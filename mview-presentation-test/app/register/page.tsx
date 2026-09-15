import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { INVITE_CODE_PARAM, normaliseInviteCode } from "@/lib/invite-code";
import { PORTAL_HOME } from "@/lib/routes";
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
 * `?next=` and the `PORTAL_HOME` default are sign-in's, for sign-in's reasons —
 * see the block comment on `app/login/page.tsx`, including why the hard-coded
 * `/portal` it used to send people to was a 404. Registration now ends in a
 * session (the live site signs the new member straight in), so it has the same
 * destination problem and takes the same answer. The leading-slash test is what
 * stops `?next=https://evil.example` turning this into an open redirect.
 *
 * The live site defaults this to its own portal too, then routes free plans via
 * `/welcome` and paid ones via `/payment`. Neither page exists here and no plan
 * is chosen on this form, so both branches are dropped and the landing is direct.
 *
 * ── `?code=` — ARRIVING FROM AN INVITATION ──
 *
 * `/claim?code=…` is the address printed in every invite letter, and it
 * redirects here carrying the code. This page reads it, normalises it once more
 * — the visitor may also have reached `/register?code=…` directly, by editing
 * the URL or from a link somebody pasted — and hands it to the form as the
 * field's initial value.
 *
 * NORMALISED AND NOT TRUSTED. A value that is not eight digits becomes `null`
 * and the field opens empty, so the form can never render a pre-filled code
 * that its own schema would then reject. The visitor can still type one.
 *
 * IT IS PASSED AS A DEFAULT, NOT AS A LOCK. The spec is explicit that the code
 * must be editable and that registration must work without one, so this is the
 * field's starting value and nothing more — `RegisterForm` owns it from there.
 */
export default async function RegisterPage({
  searchParams,
}: PageProps<"/register">) {
  if (await getSessionUser()) redirect(PORTAL_HOME);

  const params = await searchParams;
  const requested = Array.isArray(params.next) ? params.next[0] : params.next;
  const next = requested && /^\/(?!\/)/.test(requested) ? requested : PORTAL_HOME;

  const rawCode = params[INVITE_CODE_PARAM];
  const inviteCode =
    normaliseInviteCode(Array.isArray(rawCode) ? rawCode[0] : rawCode) ?? "";

  return (
    <AuthShell>
      <RegisterForm next={next} inviteCode={inviteCode} />
    </AuthShell>
  );
}

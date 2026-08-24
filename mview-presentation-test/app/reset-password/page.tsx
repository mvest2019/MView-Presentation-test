import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/session";

import { AuthShell } from "../_components/auth-shell";
import { ResetPasswordForm } from "./_components/reset-password-form";

export const metadata: Metadata = {
  title: "Reset password | Mineral View",
  description: "Reset the password on your Mineral View account.",
  // Same as sign-in and sign-up: not a page anyone should land on from search.
  robots: { index: false, follow: true },
};

/**
 * Reset password — BOTH STEPS, one route.
 *
 * The live site does the same (`app/reset-password/ForgotPass.tsx` returns
 * `<ResetPassForm/>` when a token is present), and the reason is the emailed
 * link: it points at this path with `?resetPasswordToken=<uuid>`, so the page has
 * to be able to answer both with and without one. The QUERY KEY IS THE LIVE
 * SITE'S and must not be renamed — links already in people's inboxes use it.
 *
 *   no token  → ask for the address, request a link
 *   token     → set the new password
 *
 * The token is read HERE and passed down rather than being pulled from
 * `useSearchParams` in the client component. That is what keeps the form out of a
 * Suspense boundary: reading search params on the client makes the whole subtree
 * bail to client rendering, which cost a build failure on `/blogs` earlier in this
 * project for exactly the same reason.
 *
 * A SIGNED-IN VISITOR IS SENT AWAY, as on sign-in and sign-up — someone with a
 * session changes their password from the account area, not from a recovery flow.
 * The one exception is arriving WITH a token: that link was mailed to the address
 * on the account and may be the only way back in if the session belongs to a
 * shared browser, so it is honoured.
 */
export default async function ResetPasswordPage({
  searchParams,
}: PageProps<"/reset-password">) {
  const params = await searchParams;
  const raw = params.resetPasswordToken;
  const token = (Array.isArray(raw) ? raw[0] : raw)?.trim() || null;

  if (!token && (await getSessionUser())) redirect("/portal");

  return (
    <AuthShell>
      <ResetPasswordForm token={token} />
    </AuthShell>
  );
}

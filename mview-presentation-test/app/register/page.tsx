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

/** Sign up — the design's `route:signup`. */
export default async function RegisterPage() {
  if (await getSessionUser()) redirect("/");

  return (
    <AuthShell>
      <RegisterForm />
    </AuthShell>
  );
}

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { signInAction } from "@/app/_components/auth-actions";
import { loginSchema, type LoginValues } from "@/app/_components/auth-schema";
import {
  AuthHead,
  CheckRow,
  Divider,
  Field,
  Fine,
  FormError,
  OrDivider,
  PasswordInput,
  SubmitButton,
} from "@/app/_components/auth-shell";
import { GoogleSignIn } from "@/app/_components/google-sign-in";

/**
 * Sign in — the design's `route:login`, wired to `POST /User/login_user`.
 *
 * Order, copy and controls are the mockup's, unchanged. The prototype's own
 * handlers were all demos (`onclick="…Reset link sent ✓ (demo)"`); those are
 * replaced by real calls, and only real calls.
 */
export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [failure, setFailure] = useState<string | null>(null);
  const [googleFailure, setGoogleFailure] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", remember: false },
  });

  async function onValid(values: LoginValues) {
    setFailure(null);
    const result = await signInAction(values);
    if (!result.ok) {
      setFailure(result.message);
      return;
    }
    router.push(next);
    // The cookie was set on the server; the tree on screen is still the
    // signed-out one, so the header needs re-rendering.
    router.refresh();
  }

  return (
    <>
      <AuthHead
        title="Sign in to Mineral View"
        lede="Welcome back. Enter your email and password."
      />

      <GoogleSignIn next={next} onError={setGoogleFailure} />
      {/* `mt-2` matters: the button carries only `mb-1`, so without it this sat
          4px under the border and read as part of the button rather than as a
          message about it. */}
      {googleFailure && (
        <p
          role="alert"
          className="mb-1 mt-2 text-[12.5px] font-semibold leading-[1.45] text-[#b3261e]"
        >
          {googleFailure}
        </p>
      )}

      <OrDivider label="or with email" />

      <form onSubmit={handleSubmit(onValid)} noValidate>
        <FormError message={failure} />

        <Field label="Email" error={errors.email?.message}>
          {(props) => (
            <input
              {...props}
              {...register("email")}
              type="email"
              autoComplete="username"
              placeholder="you@email.com"
            />
          )}
        </Field>

        <Field
          label="Password"
          error={errors.password?.message}
          aside={
            <Link
              href="/reset-password"
              className="text-[12px] font-semibold text-mv-green-deep no-underline hover:underline"
            >
              Forgot password?
            </Link>
          }
        >
          {(props) => (
            <PasswordInput
              {...props}
              {...register("password")}
              autoComplete="current-password"
              placeholder="Your password"
            />
          )}
        </Field>

        {/* Unchecked by default, as the design specifies: shared and family
            devices. Checked, the session cookie lasts 30 days; unchecked it
            lasts the browser session. */}
        <div className="mb-3 mt-[2px]">
          <CheckRow {...register("remember")}>
            <span className="text-[13px]">Keep me signed in on this device</span>
          </CheckRow>
        </div>

        <SubmitButton disabled={isSubmitting}>
          {isSubmitting ? "Signing in…" : "Sign in"}
        </SubmitButton>

        <Fine className="mt-3">
          Mineral View is not a broker · your private data is never sold ·
          estimates, not appraisals
        </Fine>
      </form>

      <Divider />

      <p className="text-center text-[13px] text-mv-slate">
        New to Mineral View?{" "}
        <Link
          href="/register"
          className="font-bold text-mv-green-deep no-underline hover:underline"
        >
          Create your free account →
        </Link>
      </p>
    </>
  );
}

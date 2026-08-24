"use client";

import { useEffect, useRef, useState } from "react";

import { signInWithGoogleAction } from "./auth-actions";

/**
 * "Continue with Google", via Google Identity Services.
 *
 * WHY GIS AND NOT A SERVER-SIDE CODE FLOW. A Google "Web application" client
 * needs the client SECRET at the token exchange, and that secret is in neither
 * repo — so a code flow could only ever say "not set up". GIS is what the live
 * site uses (`app/login/_components/LoginForm.tsx`): the browser gets a signed
 * ID token from the PUBLIC client id alone, and the backend validates it.
 *
 * THE ACCOUNT-TYPE QUESTION IS NOT ASKED HERE (Ryan, 2026-08-13: "on sign in
 * don't show this if already had a account").
 *
 * It cannot be asked usefully at sign-in. The type must be settled BEFORE the
 * account is created, but nothing identifies the visitor until Google answers,
 * and the new API has no user-exists endpoint to ask in advance — `/User/
 * check-user-exists` 404s on it. Asking everyone would put the question in front
 * of returning members, which is exactly what was not wanted.
 *
 * So sign-in sends NO `member_type` at all — verified optional on the endpoint —
 * and an existing member keeps whatever type they already have. Sign-up passes
 * one, because `/register` asks before its form and the visitor is unambiguously
 * creating an account there.
 */
type CredentialResponse = { credential?: string };

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: {
            client_id: string;
            callback: (response: CredentialResponse) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: Record<string, string | number>,
          ) => void;
        };
      };
    };
  }
}

const SCRIPT_ID = "google-gsi-script";

export function GoogleSignIn({
  next = "/",
  onError,
}: {
  next?: string;
  onError?: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);

  /*
   * Latest props, held in a ref so the SDK is initialised once. Written in an
   * effect, never during render — a ref write during render is unsafe under
   * concurrent rendering and `react-hooks/refs` rejects it.
   */
  const handlers = useRef({ next, onError });
  useEffect(() => {
    handlers.current = { next, onError };
  });

  /*
   * The type travels as an ARGUMENT, not through a ref. It was a ref, written
   * during render, which is unsafe under concurrent rendering and rejected by
   * `react-hooks/refs`. An effect keeps it current instead.
   */
  async function completeWithToken(idToken: string) {
    setBusy(true);
    const result = await signInWithGoogleAction(idToken);
    if (!result.ok) {
      setBusy(false);
      handlers.current.onError?.(result.message);
      return;
    }
    // Full navigation, not `router.push`: the session cookie was set on the
    // server and the tree on screen was rendered signed-out.
    window.location.assign(handlers.current.next);
  }

  return (
    <div className="relative mb-1">
      {/* What the visitor sees — the design's button. Hidden from assistive tech
          because Google's real one sits on top and carries its own name. */}
      <div
        aria-hidden="true"
        className={`flex w-full items-center justify-center gap-[10px] rounded-[10px] border border-mv-line bg-white px-[18px] py-[11px] font-sans text-[15px] font-semibold text-mv-ink ${
          busy ? "opacity-60" : ""
        }`}
      >
        <GoogleMark />
        {busy ? "Signing you in…" : "Continue with Google"}
      </div>

      {/* Google's own button: same box, transparent, and it takes the click.
          Unavoidable — the SDK returns a token from nothing else. */}
      <div className="absolute inset-0 overflow-hidden opacity-0">
        <GoogleButtonSlot
          bare
          busy={busy}
          onToken={completeWithToken}
          onError={(message) => handlers.current.onError?.(message)}
        />
      </div>
    </div>
  );
}

/**
 * Google's own rendered button, mounted inside the dialog.
 *
 * Its own component so the SDK is initialised when the dialog opens rather than
 * on every page view, and torn down with it.
 */
function GoogleButtonSlot({
  busy,
  onToken,
  onError,
  bare = false,
}: {
  busy: boolean;
  onToken: (idToken: string) => void;
  onError: (message: string) => void;
  /** Just the button — no heading, for the transparent-overlay case. */
  bare?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onToken, onError });
  useEffect(() => {
    callbacks.current = { onToken, onError };
  });

  useEffect(() => {
    let cancelled = false;

    function init() {
      const gis = window.google?.accounts?.id;
      const parent = host.current;
      if (!gis || !parent || cancelled) return;

      gis.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "",
        callback: (response) => {
          const idToken = response?.credential;
          if (!idToken) {
            callbacks.current.onError("Google did not return a sign-in token.");
            return;
          }
          callbacks.current.onToken(idToken);
        },
      });

      parent.replaceChildren();
      gis.renderButton(parent, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "rectangular",
        logo_alignment: "left",
        width: 400,
      });
    }

    if (window.google?.accounts?.id) {
      init();
      return () => {
        cancelled = true;
      };
    }

    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      existing.addEventListener("load", init);
      return () => {
        cancelled = true;
        existing.removeEventListener("load", init);
      };
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = init;
    script.onerror = () =>
      callbacks.current.onError("Google's sign-in script could not load.");
    document.body.appendChild(script);

    return () => {
      cancelled = true;
    };
  }, []);

  if (bare) {
    return <div ref={host} className="[color-scheme:light]" />;
  }

  return (
    <div>
      <p className="mb-2 text-[12.5px] text-mv-muted">
        Now continue with Google to finish.
      </p>
      {/* Google renders into this. It is its own button with its own styling —
          unavoidable, since the SDK will not return a token from anything else.
          Centred so it does not read as misaligned beside our controls. */}
      <div
        ref={host}
        className={`flex justify-center [color-scheme:light] ${
          busy ? "pointer-events-none opacity-60" : ""
        }`}
      />
      {busy && (
        <p role="status" className="mt-2 text-center text-[12.5px] text-mv-muted">
          Signing you in…
        </p>
      )}
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

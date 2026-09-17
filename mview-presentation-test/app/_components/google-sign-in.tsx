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
  /* Same honesty as the sign-in form's submit button: once the backend has
     accepted the token, the wait is the DESTINATION rendering (the portal's
     cold build runs 11s+), not the sign-in — so the label stops claiming it
     is still signing in. See the note on `redirecting` in `login-form.tsx`. */
  const [redirecting, setRedirecting] = useState(false);

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
    setRedirecting(true);
    window.location.assign(handlers.current.next);
  }

  return (
    /* `group` so the visible copy below can react to a hover that physically
       lands on the transparent overlay — `hover:` on the copy itself never
       fires, because the overlay is always the topmost element. */
    <div className="group relative mb-1">
      {/* What the visitor sees — the design's button. Hidden from assistive tech
          because Google's real one sits on top and carries its own name. The
          hover wash is `GoogleButton`'s (auth-shell.tsx), so the two Google
          treatments read as one control. */}
      <div
        aria-hidden="true"
        className={`flex w-full items-center justify-center gap-[10px] rounded-[10px] border border-mv-line bg-white px-[18px] py-[11px] font-sans text-[15px] font-semibold text-mv-ink transition-colors group-hover:bg-[#f6f8f7] ${
          busy ? "opacity-60" : ""
        }`}
      >
        <GoogleMark />
        {redirecting
          ? "Signed in — loading your portal…"
          : busy
            ? "Signing you in…"
            : "Continue with Google"}
      </div>

      {/* Google's own button: same box, transparent, and it takes the click.
          Unavoidable — the SDK returns a token from nothing else.

          `cursor-pointer` on the overlay, not the copy: the overlay is what the
          pointer is actually over, and before Google's script lands it is the
          only thing saying this is a control at all. */}
      <div className="absolute inset-0 cursor-pointer overflow-hidden opacity-0">
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
    let resizer: ResizeObserver | null = null;

    /*
     * STRETCH GOOGLE'S BUTTON OVER THE WHOLE VISIBLE ONE — the overlay case's
     * missing half (Pragati, 2026-09-17: hovering "Continue with Google" was
     * "not proper clickable").
     *
     * WHY IT WAS BROKEN: GIS renders its button at the `width` it is asked for,
     * and it CAPS THAT AT 400px — asking for more still renders 400. The
     * visible copy underneath is `w-full` inside a 520px card, which is 474px
     * at desktop, so Google's real button covered the left 400×40 of a 474×47
     * box and nothing else. The right ~74px and bottom ~7px looked like button,
     * showed no pointer, and swallowed clicks — measured on `/login` before
     * this change.
     *
     * THE FIX IS A TRANSFORM, NOT A WIDER RENDER, because a wider render is
     * exactly what the cap forbids. The host is pinned to the button's own
     * layout size and scaled up to the overlay's — the button is `opacity-0`
     * anyway, so the distortion is invisible and only the hit area matters.
     * `offsetWidth`/`offsetHeight` on purpose: those are layout values,
     * unaffected by the transform this same function sets, so re-running it is
     * idempotent rather than compounding.
     *
     * A ResizeObserver keeps it true when the card reflows (viewport resize,
     * font load). Observation fires once on registration, so the initial fit
     * needs no separate call.
     */
    function fitOverlay(parent: HTMLElement) {
      const box = parent.parentElement;
      /* The `[role="button"]` INSIDE Google's tree, not `firstElementChild`:
         GIS wraps its button in a full-width positioning div, so the wrapper
         measures whatever the host measures and the scale came out as 1×. The
         role node is the 400px-capped button itself — the thing that has to
         grow. Pinning the host to ITS size first is what makes the wrapper
         follow. */
      const button = parent.querySelector<HTMLElement>('[role="button"]');
      if (!box || !button) return;
      const w = box.clientWidth;
      const h = box.clientHeight;
      const bw = button.offsetWidth;
      const bh = button.offsetHeight;
      if (!w || !h || !bw || !bh) return;
      parent.style.width = `${bw}px`;
      parent.style.height = `${bh}px`;
      parent.style.transformOrigin = "0 0";
      parent.style.transform = `scale(${w / bw}, ${h / bh})`;
    }

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

      /* Only the transparent-overlay case is stretched. The dialog case shows
         Google's button as itself, and scaling a VISIBLE button would distort
         its type and its logo. */
      if (bare && parent.parentElement) {
        resizer = new ResizeObserver(() => fitOverlay(parent));
        resizer.observe(parent.parentElement);
      }
    }

    if (window.google?.accounts?.id) {
      init();
      return () => {
        cancelled = true;
        resizer?.disconnect();
      };
    }

    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      existing.addEventListener("load", init);
      return () => {
        cancelled = true;
        resizer?.disconnect();
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
      resizer?.disconnect();
    };
  }, [bare]);

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

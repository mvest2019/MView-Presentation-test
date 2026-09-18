"use client";

import { ChevronDown, LogOut, UserRound } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { PortalAvatar } from "@/app/mineralownersite/_components/portal-avatar";
import { signOutAction } from "./auth-actions";
import type { SessionUser } from "@/lib/session";

/**
 * The signed-in cluster in the header: the visitor's avatar and name, and
 * Sign out.
 *
 * The design's own header only swaps its two CTAs for "Go to your portal →" when
 * signed in (`data-auth="in"` in `shell/chunk-005.html`) — it shows no name and
 * offers no way out, because the prototype hands off to the owner portal at that
 * point. Both were asked for here, so this follows the live site's shape
 * instead: the name with a small menu under it.
 *
 * ── THE AVATAR, WHERE A GENERIC PERSON GLYPH USED TO STAND ──
 *
 * The same identity the portal bar shows (user, 2026-09-18: "here also add
 * profile"): the member's picture off the SESSION — the uploaded photo's proxy
 * URL once they have opened My Profile, or their sign-in picture — else the
 * first name's first letter in the mint circle, else the old glyph for a
 * session with no name at all. `PortalAvatar` is imported from the portal tree
 * DELIBERATELY despite the marketing/portal split: the split protects each
 * side's type scale and geometry, and that component carries neither — its
 * tile class is passed in by the caller — while its dead-URL fallback (the
 * cookie can outlive the photo behind it) is exactly the part that must not
 * be re-implemented to drift.
 *
 * A CLICK menu, not the hover panels Explore and Learn use. Signing out is
 * destructive enough that it should not sit under a pointer that happens to
 * pass over the name — and on a touch screen there is no hover to open it with.
 */
export function AccountMenu({ user }: { user: SessionUser }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const wrap = useRef<HTMLDivElement>(null);

  // Close on an outside click or Escape — the same behaviour the bar's other
  // menus have, so the header does not feel like two different components.
  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!wrap.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // First name only in the bar: a full name pushes the 64px row out of shape,
  // and the menu below carries the whole thing plus the email.
  const firstName = user.firstName?.trim().split(/\s+/)[0] || "there";
  const fullName = [user.firstName, user.lastName]
    .filter((part) => part?.trim())
    .join(" ")
    .trim();

  /* the avatar's letter — from the REAL first name only, never from the
     "there" greeting fallback; taken whole so a surrogate-pair glyph is not
     split into a broken half */
  const letter = user.firstName?.trim()
    ? (Array.from(user.firstName.trim())[0]?.toUpperCase() ?? "")
    : "";
  const image = user.profileImage ?? null;

  function signOut() {
    startTransition(async () => {
      await signOutAction();
      setOpen(false);
      // `refresh` re-renders the server tree, which is what swaps this menu back
      // for "Sign in" — the cookie is gone but the markup on screen is not.
      router.refresh();
    });
  }

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex cursor-pointer items-center gap-[6px] rounded-lg border-0 bg-transparent px-1 py-1 font-sans text-sm font-semibold text-mv-slate hover:text-mv-green-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
      >
        {image || letter ? (
          <PortalAvatar
            image={image}
            initials={letter}
            className="grid size-6 flex-none place-items-center overflow-hidden rounded-full bg-mv-mint text-[11px] font-extrabold text-mv-green-ink"
          />
        ) : (
          /* a session with no picture and no name keeps the old glyph — a
             blank mint circle would read as a rendering fault */
          <UserRound aria-hidden="true" className="h-[17px] w-[17px]" />
        )}
        <span className="max-[767px]:hidden">Hi, {firstName}</span>
        <ChevronDown aria-hidden="true" className="h-4 w-4" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-[80] w-[240px] rounded-xl border border-mv-line bg-white p-2 shadow-[0_12px_30px_rgba(13,14,23,.14)]"
        >
          {/* Who you are signed in as. `break-words` because an email can be
              longer than the panel and would otherwise widen it. */}
          <div className="border-b border-mv-line px-[10px] pb-2 pt-1">
            {fullName && (
              <p className="text-[13.5px] font-bold text-mv-ink">{fullName}</p>
            )}
            <p className="break-words text-[12px] text-mv-muted">
              {user.email}
            </p>
          </div>

          <button
            type="button"
            role="menuitem"
            onClick={signOut}
            disabled={pending}
            className="mt-1 flex w-full cursor-pointer items-center gap-2 rounded-lg border-0 bg-transparent px-[10px] py-2 text-left font-sans text-[13.5px] font-semibold text-mv-slate hover:bg-mv-mint hover:text-mv-green-deep disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogOut aria-hidden="true" className="h-4 w-4" />
            {pending ? "Signing out…" : "Sign out"}
          </button>
        </div>
      )}
    </div>
  );
}

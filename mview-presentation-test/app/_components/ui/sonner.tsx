"use client";

import { usePathname } from "next/navigation";
import { useEffect, type CSSProperties } from "react";
import { Toaster as SonnerToaster, toast, type ToasterProps } from "sonner";

/**
 * shadcn/ui's Toaster, on `sonner`.
 *
 * shadcn's own toast was deprecated in favour of Sonner, so "the shadcn toast"
 * IS this: their component is a thin wrapper that themes `sonner`'s `<Toaster>`
 * through its CSS variables. This is that wrapper, with two changes, both for the
 * same reason `ui/tooltip.tsx` gives — see the note there before touching this.
 *
 *   · ADDED BY HAND, not by `shadcn add sonner`. The CLI writes its own colour
 *     system into `app/globals.css` (`--background`, `--popover`, `--border`, …)
 *     and shadcn's wrapper points at those. This project defines its palette in a
 *     hand-written `@theme` block, so the variables below are wired to the `mv-*`
 *     tokens instead and no second palette is introduced. `sonner` itself — the
 *     part that does the work — is installed normally.
 *
 *   · NO `useTheme()`. shadcn's version reads `next-themes` to follow the OS.
 *     `next-themes` is not installed and the site has no dark mode, so `theme` is
 *     pinned to `light`. Left as `system` it would render a dark toast over a
 *     light page for anyone whose OS is set to dark — sonner's default palette
 *     switches on `prefers-color-scheme`, and the page's does not.
 *
 * `richColors` is what makes the `--warning-*` / `--error-*` / `--success-*` /
 * `--info-*` variables apply at all: sonner gates them behind
 * `[data-rich-colors='true']`. Without it every toast renders in the neutral
 * `--normal-*` treatment and a warning looks the same as a confirmation.
 *
 * No stylesheet import is needed — sonner injects its own CSS at runtime.
 */

/*
 * Two of the eight borders are derived rather than named, because the palette has
 * a hairline for the amber and mint families (`mv-sand-line`, `mv-mint-line`) and
 * none for red or blue. `color-mix` keeps them tied to `mv-red` / `mv-blue`
 * rather than adding two more hexes to a file whose own rule is that colour is
 * extracted and named, not authored at the call site.
 */
const toastTheme = {
  "--normal-bg": "var(--color-mv-card)",
  "--normal-text": "var(--color-mv-ink)",
  "--normal-border": "var(--color-mv-line)",

  "--warning-bg": "var(--color-mv-amber-bg)",
  "--warning-text": "var(--color-mv-amber)",
  "--warning-border": "var(--color-mv-sand-line)",

  "--error-bg": "var(--color-mv-red-bg)",
  "--error-text": "var(--color-mv-red)",
  "--error-border": "color-mix(in srgb, var(--color-mv-red) 25%, white)",

  "--success-bg": "var(--color-mv-mint)",
  "--success-text": "var(--color-mv-green-deep)",
  "--success-border": "var(--color-mv-mint-line)",

  "--info-bg": "var(--color-mv-blue-bg)",
  "--info-text": "var(--color-mv-blue)",
  "--info-border": "color-mix(in srgb, var(--color-mv-blue) 22%, white)",
} as CSSProperties;

export function Toaster(props: ToasterProps) {
  /*
   * CLEAR EVERY TOAST ON NAVIGATION (Ryan, 2026-08-19).
   *
   * The toaster is mounted in the root layout, so it is NOT remounted between
   * client-side navigations — a toast raised on one page kept counting down over
   * the next one, which is how "Verification code sent to your email." followed
   * you off the register page.
   *
   * `usePathname` rather than a router event: the App Router exposes no
   * `routeChangeComplete`, and the pathname is the thing that actually changed.
   * `toast.dismiss()` with no argument clears all of them. It also runs once on
   * mount, which is a no-op with nothing showing.
   *
   * KNOWN CONSEQUENCE, worth reading before relying on a toast across a redirect:
   * `registerAction` succeeds, raises "Registration Successful", and immediately
   * pushes to `next` — so that toast is now dismissed by its own navigation and is
   * effectively invisible. The redirect is the confirmation in that flow, but if
   * that message is wanted it has to be raised on the destination, not here.
   */
  const pathname = usePathname();
  useEffect(() => {
    toast.dismiss();
  }, [pathname]);

  /*
   * ALSO CLEAR WHEN THE TAB IS HIDDEN, and this is the half that actually fixes
   * the reported "shows for too much time".
   *
   * SONNER PAUSES ITS OWN TIMER WHILE THE PAGE IS HIDDEN. From its source:
   *
   *   if (expanded || interacting || isDocumentHidden) pauseTimer(); else startTimer();
   *
   * `isDocumentHidden` tracks `document.hidden`, and 2.0.8 has no
   * `pauseWhenPageIsHidden` prop to turn it off — the behaviour is unconditional.
   * So the countdown freezes the moment you switch away and resumes only when you
   * come back.
   *
   * That is exactly the verification flow: raise "Verification code sent to your
   * email.", switch to the mail client to fetch the code, and the toast sits
   * frozen for however long that takes. Lowering `duration` cannot help, because
   * no time passes while you are gone. Dismissing on hide means the page is clean
   * when you return, which is what was asked for — switching away to read the
   * email is "navigating to another page" in every sense that matters here.
   *
   * The cost is a toast raised and then immediately switched away from is missed
   * entirely. Acceptable: nothing here is the only record of anything — failures
   * also surface inline or on the next attempt.
   *
   * NO `if (document.hidden)` GUARD, deliberately — it fires in both directions.
   * Sonner defers a dismissal through `requestAnimationFrame`:
   *
   *   this.pendingDismissals.set(id, requestAnimationFrame(() => …))
   *
   * and rAF does not run while a document is hidden. So a `dismiss()` issued at
   * the instant of hiding queues a callback that cannot execute until the page is
   * back — the dismissal is real but its effect is deferred. Handling BOTH
   * transitions means the call also happens once frames are running again, so the
   * toast is gone within a frame of the visitor returning rather than depending on
   * a queued callback surviving the round trip.
   */
  useEffect(() => {
    const onVisibility = () => {
      toast.dismiss();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  return (
    <SonnerToaster
      theme="light"
      richColors
      /*
       * TOP CENTRE — horizontally centred, below the header.
       *
       * Settled after three passes (Ryan, 2026-08-19). In order: `top-center`
       * covered the "Sign in to Mineral View" heading; `bottom-right` fixed that
       * and drew "no Show msg on top"; `top-right` put it back at the top but off
       * to the side, and drew "on the middle of the page". Reading those two
       * together — top, and centred rather than right — lands here.
       *
       * 76px down = the sticky header's 65 plus a gap. The header is `z-[60]` and
       * this toaster is `z-index: 999999999`, so without the offset a toast would
       * sit on top of the nav rather than below it.
       *
       * IT OVERLAPS THE TOP OF THE AUTH CARD, and that is now a chosen trade
       * rather than an oversight. The arithmetic, measured on /login at 1280×720:
       * the header ends at 65, the card starts at 89, and the toast is 54px tall.
       * To clear a heading whose top is at 112 the toast would have to end by 112,
       * so it would have to start at 58 — behind the header. There are 24px of
       * clear page and it needs 54. No offset fixes that, and neither does a
       * narrower toast, because the collision is vertical.
       *
       * SO DO NOT "FIX" THIS BY NUDGING THE OFFSET — it cannot work, and it has
       * been tried. The only real answers are the ones already rejected: move it
       * off the centre line (top-right, clears the card above ~1100px), or stop
       * floating and reserve space so the page shifts down while a toast shows.
       */
      position="top-center"
      offset={{ top: 76 }}
      mobileOffset={{ top: 76, left: 16, right: 16 }}
      /*
       * 4.5s (Ryan, 2026-08-19: the success message "show for too much time",
       * asking for "around 4–5 seconds").
       *
       * This was 6000, set on the argument that the infrastructure warnings run to
       * two lines and ask the reader to try again later. Six seconds turns out to
       * be too long for the short confirmations that dominate in practice —
       * "Verification code sent to your email." is read in about one — and a toast
       * that outstays its welcome is worse than one that has to be re-read.
       *
       * Still above sonner's own 4000 default, so the two-line warnings keep a
       * little more room than stock. A single toast can override this per call if
       * it ever genuinely needs longer.
       */
      duration={4500}
      /*
       * NO CLOSE BUTTON (Ryan, 2026-08-19: "Remove that cross").
       *
       * `closeButton` was set here. Sonner hangs it off the toast's top-LEFT
       * corner, outside the panel, so on the auth card it sat over whatever field
       * the toast happened to cover — the password box, in the report — reading as
       * a stray control belonging to the form rather than to the toast.
       *
       * Nothing is stranded by removing it: these dismiss themselves after 4.5s,
       * on navigation, and on a tab switch, and sonner still allows a swipe to
       * dismiss. It was the least useful of four ways out and the only one that
       * cost layout.
       */
      style={toastTheme}
      toastOptions={{
        classNames: {
          toast:
            "!rounded-[12px] !border !font-sans !text-[13.5px] !leading-[1.45] !shadow-[0_12px_30px_rgba(13,14,23,.14)]",
          title: "!font-semibold",
          description: "!text-[12.5px] !text-mv-muted",
        },
      }}
      {...props}
    />
  );
}

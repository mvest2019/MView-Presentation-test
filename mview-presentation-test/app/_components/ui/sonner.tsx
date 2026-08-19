"use client";

import type { CSSProperties } from "react";
import { Toaster as SonnerToaster, type ToasterProps } from "sonner";

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
  return (
    <SonnerToaster
      theme="light"
      richColors
      /*
       * TOP CENTRE, and offset past the header.
       *
       * These carry messages about something the visitor just did — a sign-in
       * that could not go through, a code sent again — so they have to land where
       * the eye already is. Sonner's default is bottom-right, which on the auth
       * pages is diagonally opposite the form and, on a phone, behind the
       * keyboard that is still up from typing a password.
       *
       * 76px = the sticky header's 64px plus a 12px gap. The header is `z-[60]`
       * and sonner's toaster is `z-index: 999999999`, so a toast would otherwise
       * sit ON TOP of the nav rather than under it.
       */
      position="top-center"
      offset={{ top: 76 }}
      mobileOffset={{ top: 76 }}
      /* Long enough to read a sentence — sonner's 4s default is short for the
         infrastructure warnings this carries, which are two lines and ask the
         reader to try again later. */
      duration={6000}
      closeButton
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

"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import {
  drawerExploreNav,
  learnNav,
  learnNavFooterLink,
  logo,
  primaryNav,
} from "./site-nav";

/*
 * Marketing header — a port of `marketing/src/shell/chunk-005.html` and the
 * `.mk-header` / `.mk-drawer` rules in the prototype stylesheet. Every size,
 * colour and breakpoint below is the document's; the two odd-looking
 * breakpoints (919px and 1180px) are the prototype's, not Tailwind's, so they
 * are written as arbitrary max-width variants rather than rounded to `lg`.
 *
 * The prototype swaps the right-hand actions on auth state (`data-auth`).
 * There is no auth in this build, so only the signed-out cluster is rendered.
 */

const navLinkBase =
  "whitespace-nowrap rounded-[10px] border-2 border-transparent px-3 py-[9px] text-sm font-semibold text-mv-slate no-underline transition-colors hover:bg-[#f2f8f5] hover:text-mv-green-deep hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep max-[1180px]:px-2 max-[1180px]:text-[13.5px]";

const btnBase =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-transparent px-[18px] py-[10px] text-sm font-semibold leading-[1.2] !no-underline transition-[filter,background]";

const btnMint =
  "border-[#bfe9d8] bg-mv-mint text-mv-green-ink hover:brightness-[1.03]";

const btnPrimary = "bg-mv-green text-mv-green-ink hover:brightness-[1.05]";

export function SiteHeader() {
  const [learnOpen, setLearnOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const learnRef = useRef<HTMLDivElement>(null);

  // Close the Learn dropdown on an outside click or Escape. The prototype
  // opens it on hover too, which is kept as a `group-hover` rule below.
  useEffect(() => {
    if (!learnOpen) return;

    function onPointerDown(event: MouseEvent) {
      if (!learnRef.current?.contains(event.target as Node)) setLearnOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setLearnOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [learnOpen]);

  // The drawer is a full-screen overlay; lock the page behind it and let
  // Escape close it.
  useEffect(() => {
    if (!drawerOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setDrawerOpen(false);
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [drawerOpen]);

  return (
    <>
      <a
        href="#main"
        className="fixed left-[10px] top-[-80px] z-[999] rounded-[10px] bg-mv-green-deep px-[18px] py-3 text-sm font-extrabold text-white !no-underline transition-[top] focus:top-[10px]"
      >
        Skip to main content
      </a>

      <header className="sticky top-0 z-[60] border-b border-mv-line bg-white/94 backdrop-blur-[8px]">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-[26px] px-7 max-[767px]:gap-[10px] max-[767px]:px-4">
          <Link href="/" aria-label="Mineral View home" className="shrink-0">
            <Image
              src={logo.onLight}
              alt="Mineral View"
              width={logo.width}
              height={logo.height}
              priority
              className="block h-[34px] w-auto max-[767px]:h-[26px]"
            />
          </Link>

          <nav className="ml-2 flex items-center gap-[10px] max-[1180px]:gap-[2px] max-[919px]:hidden">
            {/* One primary CTA in the bar — the record finder keeps the fill. */}
            <Link
              href="/claim"
              className={`${navLinkBase} !border-mv-green !bg-mv-green !font-extrabold !text-mv-green-ink hover:!border-mv-green-deep hover:!bg-mv-green-deep hover:!text-white`}
            >
              <span className="mr-1 font-black">✚</span>
              Find your record
            </Link>

            {primaryNav.map((item) => (
              <Link key={item.href} href={item.href} className={navLinkBase}>
                {item.label}
              </Link>
            ))}

            <div ref={learnRef} className="group relative">
              <button
                type="button"
                aria-expanded={learnOpen}
                onClick={() => setLearnOpen((open) => !open)}
                className="inline-flex cursor-pointer items-center gap-[5px] whitespace-nowrap border-0 bg-transparent px-3 py-[9px] font-sans text-sm font-semibold text-mv-slate hover:text-mv-green-deep max-[1180px]:px-2 max-[1180px]:text-[13.5px]"
              >
                Learn
                <span aria-hidden="true" className="text-[10px]">
                  ▾
                </span>
              </button>

              <div
                aria-label="Learn"
                className={`absolute right-[-10px] top-full z-[80] min-w-[224px] rounded-xl border border-mv-line bg-white p-2 shadow-[0_12px_30px_rgba(13,14,23,.14)] group-hover:block ${
                  learnOpen ? "block" : "hidden"
                }`}
              >
                {learnNav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setLearnOpen(false)}
                    className="block whitespace-nowrap rounded-lg px-[10px] py-2 text-[13.5px] font-semibold text-mv-slate no-underline hover:bg-mv-mint hover:text-mv-green-deep hover:no-underline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-mv-green-deep"
                  >
                    {item.label}
                  </Link>
                ))}

                <div
                  role="separator"
                  className="mx-[10px] my-[6px] h-px bg-mv-line"
                />

                <Link
                  href={learnNavFooterLink.href}
                  onClick={() => setLearnOpen(false)}
                  className="block whitespace-nowrap rounded-lg px-[10px] py-2 text-[13.5px] font-semibold text-mv-slate no-underline hover:bg-mv-mint hover:text-mv-green-deep hover:no-underline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-mv-green-deep"
                >
                  {learnNavFooterLink.label}
                </Link>
              </div>
            </div>
          </nav>

          <div className="ml-auto flex items-center gap-[14px] max-[767px]:gap-2">
            <Link
              href="/login"
              className="whitespace-nowrap text-sm font-semibold text-mv-slate no-underline hover:text-mv-green-deep hover:no-underline max-[767px]:hidden"
            >
              Sign in
            </Link>

            {/* `.mk-actions a` is nowrap in the prototype — without it "Free
                account" breaks onto two lines and pushes the bar off 64px. */}
            <Link
              href="/signup"
              className={`${btnBase} ${btnMint} whitespace-nowrap max-[767px]:px-[10px] max-[767px]:py-2 max-[767px]:text-xs`}
            >
              Free account
            </Link>

            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Menu"
              aria-expanded={drawerOpen}
              className="hidden shrink-0 cursor-pointer rounded-lg border border-mv-line px-[10px] py-[7px] text-base leading-none text-mv-slate max-[919px]:block"
            >
              ☰
            </button>
          </div>
        </div>
      </header>

      {/* ---------------- mobile drawer ---------------- */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-[90] bg-[rgba(13,14,23,.5)]"
          onClick={(event) => {
            if (event.target === event.currentTarget) setDrawerOpen(false);
          }}
        >
          <div className="absolute right-0 top-0 flex h-full w-[82%] max-w-[340px] flex-col gap-[6px] overflow-y-auto bg-white p-[22px]">
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close menu"
              className="absolute right-[10px] top-[10px] h-[34px] w-[34px] cursor-pointer rounded-full border border-[rgba(128,128,128,.35)] bg-transparent text-[15px] leading-none hover:bg-[rgba(128,128,128,.15)]"
            >
              ✕
            </button>

            <Image
              src={logo.onLight}
              alt="Mineral View"
              width={logo.width}
              height={logo.height}
              className="mb-[14px] block h-[26px] w-auto"
            />

            <Link
              href="/claim"
              onClick={() => setDrawerOpen(false)}
              className={`${btnBase} ${btnPrimary} mb-2 border-b-0 text-center`}
            >
              ✚ Find &amp; claim your record
            </Link>
            <Link
              href="/signup"
              onClick={() => setDrawerOpen(false)}
              className={`${btnBase} ${btnMint} mb-1 border-b-0 text-center`}
            >
              Free account
            </Link>
            <p className="m-0 mb-[10px] text-center text-xs text-mv-muted">
              Always a free plan · No credit card · No commitment
            </p>

            <DrawerSection>Explore</DrawerSection>
            {drawerExploreNav.map((item) => (
              <DrawerLink
                key={item.href}
                href={item.href}
                onNavigate={() => setDrawerOpen(false)}
              >
                {item.label}
              </DrawerLink>
            ))}

            <DrawerSection>Learn</DrawerSection>
            {[...learnNav, learnNavFooterLink].map((item) => (
              <DrawerLink
                key={item.href}
                href={item.href}
                onNavigate={() => setDrawerOpen(false)}
              >
                {item.label}
              </DrawerLink>
            ))}

            <DrawerSection>Account</DrawerSection>
            <DrawerLink href="/login" onNavigate={() => setDrawerOpen(false)}>
              Sign in
            </DrawerLink>
            <DrawerLink
              href="/signup"
              onNavigate={() => setDrawerOpen(false)}
              className="!text-mv-green-deep"
            >
              Create your free account
            </DrawerLink>
          </div>
        </div>
      )}
    </>
  );
}

function DrawerSection({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2 pb-1 pt-[14px] text-[10.5px] font-extrabold uppercase tracking-[.07em] text-mv-muted">
      {children}
    </div>
  );
}

function DrawerLink({
  href,
  children,
  onNavigate,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  onNavigate: () => void;
  className?: string;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`block border-b border-[#f0f1f4] px-2 py-[11px] font-semibold text-mv-slate no-underline hover:no-underline ${className}`}
    >
      {children}
    </Link>
  );
}

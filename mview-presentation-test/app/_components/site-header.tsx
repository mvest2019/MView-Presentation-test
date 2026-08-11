"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import {
  barNav,
  exploreNav,
  learnNav,
  logo,
  type MegaColumn,
} from "./site-nav";

/*
 * Marketing header — follows `header-mockup.html` (Ryan, 2026-08-11), which
 * restructures the prototype's bar: six top-level items, with the data and
 * operator destinations gathered into an Explore mega menu rather than a `Data`
 * tab, and no `Map` slot. Sizes, colours and the 1180px tightening are the
 * mockup's, which in turn carries them over from the prototype stylesheet.
 *
 * The logo stays the real Cloudinary asset. The mockup hand-draws a placeholder
 * SVG mark for its own convenience; that must not be copied — every hand-drawn
 * reproduction of this logo has been wrong.
 *
 * The prototype swaps the right-hand actions on auth state (`data-auth`). There
 * is no auth in this build, so only the signed-out cluster is rendered.
 */

type OpenMenu = "explore" | "learn" | null;

/*
 * 13.5px at 10px padding is the mockup's TIGHTENED scale, which it applies only
 * below 1180px. Here it is the base, because with Map restored the bar carries
 * seven items and the roomier 14px/12px scale does not fit: it needs 1169px of
 * content, and a 1200px wrap minus its 28px padding offers 1129 — so the actions
 * block overhung the bar by 41px and the page scrolled sideways at every desktop
 * width. The wrap cannot grow without breaking alignment with the footer and the
 * article column, so the type comes down instead. One scale, no breakpoint.
 */
const navLinkBase =
  "whitespace-nowrap rounded-[10px] border-2 border-transparent px-[10px] py-[9px] text-[13.5px] font-semibold text-mv-slate no-underline transition-colors hover:bg-[#f2f8f5] hover:text-mv-green-deep hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep";

/** The menu triggers match `.nl` exactly, so they sit level with the links. */
const menuButtonBase = `${navLinkBase} inline-flex cursor-pointer items-center gap-[5px] bg-transparent font-sans`;

/** One item inside either dropdown — the mockup's `.pi`. */
const panelItem =
  "block rounded-lg px-[10px] py-2 text-[13.5px] font-semibold text-mv-slate no-underline hover:bg-mv-mint hover:text-mv-green-deep hover:no-underline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-mv-green-deep";

const btnBase =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-transparent px-[18px] py-[10px] text-sm font-semibold leading-[1.2] !no-underline transition-[filter,background]";

const btnMint =
  "border-[#bfe9d8] bg-mv-mint text-mv-green-ink hover:brightness-[1.03]";

const btnPrimary = "bg-mv-green text-mv-green-ink hover:brightness-[1.05]";

export function SiteHeader() {
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  // Close whichever menu is open on an outside click or Escape. Both also open
  // on hover, which is a `group-hover` rule on the trigger's wrapper.
  useEffect(() => {
    if (!openMenu) return;

    function onPointerDown(event: MouseEvent) {
      if (!navRef.current?.contains(event.target as Node)) setOpenMenu(null);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenMenu(null);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openMenu]);

  // The drawer is a full-screen overlay; lock the page behind it and let Escape
  // close it.
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

  const closeMenu = () => setOpenMenu(null);
  const closeDrawer = () => setDrawerOpen(false);

  return (
    <>
      <a
        href="#main"
        className="fixed left-[10px] top-[-80px] z-[999] rounded-[10px] bg-mv-green-deep px-[18px] py-3 text-sm font-extrabold text-white !no-underline transition-[top] focus:top-[10px]"
      >
        Skip to main content
      </a>

      <header className="sticky top-0 z-[60] border-b border-mv-line bg-white/94 backdrop-blur-[8px]">
        {/* `relative` so the Explore panel can span the bar's full width: that
            panel's wrapper is `static`, letting `left-0` resolve against this
            element rather than against the trigger. */}
        <div className="relative mx-auto flex h-16 max-w-[1200px] items-center gap-[26px] px-7 max-[1180px]:gap-3 max-[1180px]:px-4">
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

          {/* Collapse point is measured, not the design's 919px — see the note
              on the hamburger below. */}
          <nav
            ref={navRef}
            className="ml-2 flex items-center gap-[6px] max-[1180px]:gap-[2px] max-[1023px]:hidden"
          >
            {/* The single filled CTA in the bar. 13.5px/700 in a slightly wider
                pill, per the mockup, and without the prototype's ✚ — the icon
                stays on the mobile sheet, where the row needs the affordance. */}
            <Link
              href="/claim"
              className={`${navLinkBase} !border-mv-green !bg-mv-green !px-[14px] !font-bold !text-mv-green-ink hover:!border-mv-green-deep hover:!bg-mv-green-deep hover:!text-white`}
            >
              Find your record
            </Link>

            {barNav.map((item) =>
              item.kind === "link" ? (
                <Link key={item.href} href={item.href} className={navLinkBase}>
                  {item.label}
                </Link>
              ) : item.menu === "explore" ? (
                <ExploreMenu
                  key={item.label}
                  label={item.label}
                  open={openMenu === "explore"}
                  onToggle={() =>
                    setOpenMenu((current) =>
                      current === "explore" ? null : "explore",
                    )
                  }
                  onNavigate={closeMenu}
                />
              ) : (
                <LearnMenu
                  key={item.label}
                  label={item.label}
                  open={openMenu === "learn"}
                  onToggle={() =>
                    setOpenMenu((current) =>
                      current === "learn" ? null : "learn",
                    )
                  }
                  onNavigate={closeMenu}
                />
              ),
            )}
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

            {/* Collapses at 1024px. The mockup does not set a breakpoint, and the
                design's 919px is too late: measured, this bar needs ~990px of
                content, so below 1024 the actions block runs off the right edge
                and the page scrolls sideways. */}
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Menu"
              aria-expanded={drawerOpen}
              className="hidden shrink-0 cursor-pointer rounded-lg border border-mv-line px-[10px] py-[7px] text-base leading-none text-mv-slate max-[1023px]:block"
            >
              ☰
            </button>
          </div>
        </div>
      </header>

      {/* ---------------- mobile sheet ---------------- */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-[90] bg-[rgba(13,14,23,.5)]"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeDrawer();
          }}
        >
          <div className="absolute right-0 top-0 flex h-full w-[82%] max-w-[340px] flex-col overflow-y-auto bg-white p-[22px]">
            <button
              type="button"
              onClick={closeDrawer}
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
              onClick={closeDrawer}
              className={`${btnBase} ${btnPrimary} mb-2 text-center`}
            >
              ✚ Find your record
            </Link>

            {/* Same order as the bar: the two audience links, the Explore groups,
                Pricing, then Learn — so the sheet and the bar agree. */}
            {barNav.map((item) =>
              item.kind === "link" ? (
                <SheetLink
                  key={item.href}
                  href={item.href}
                  onNavigate={closeDrawer}
                >
                  {item.label}
                </SheetLink>
              ) : item.menu === "explore" ? (
                <div key={item.label}>
                  {exploreNav.map((column) => (
                    <div key={column.heading}>
                      <SheetGroup>
                        Explore · {column.heading.toLowerCase()}
                      </SheetGroup>
                      {column.links.map((link) => (
                        <SheetLink
                          key={link.href}
                          href={link.href}
                          onNavigate={closeDrawer}
                        >
                          {link.label}
                        </SheetLink>
                      ))}
                    </div>
                  ))}
                  <SheetDivider />
                </div>
              ) : (
                <div key={item.label}>
                  <SheetGroup>Learn</SheetGroup>
                  {learnNav.map((link) => (
                    <SheetLink
                      key={link.href}
                      href={link.href}
                      onNavigate={closeDrawer}
                    >
                      {link.label}
                    </SheetLink>
                  ))}
                  <SheetDivider />
                </div>
              ),
            )}

            <SheetLink href="/login" onNavigate={closeDrawer}>
              Sign in
            </SheetLink>
          </div>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ menus --- */

/**
 * The Explore mega menu: three bordered columns, 660px wide, anchored to the
 * left edge of the bar rather than to its trigger.
 *
 * The wrapper is `static` on purpose. `absolute` positioning resolves against
 * the nearest positioned ancestor, so with a `relative` wrapper the panel would
 * hang off the trigger and run past the viewport on the right; `static` lets it
 * resolve against the bar, which is `relative`.
 */
function ExploreMenu({
  label,
  open,
  onToggle,
  onNavigate,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  onNavigate: () => void;
}) {
  return (
    <div className="group static flex h-16 items-center">
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className={menuButtonBase}
      >
        {label}
        <span aria-hidden="true" className="text-[10px]">
          {open ? "▴" : "▾"}
        </span>
      </button>

      <div
        aria-label={label}
        className={`absolute left-0 top-[calc(100%+8px)] z-[80] w-[660px] max-w-[calc(100vw-40px)] flex-wrap rounded-xl border border-mv-line bg-white p-[14px] shadow-[0_12px_30px_rgba(13,14,23,.14)] group-hover:flex ${
          open ? "flex" : "hidden"
        }`}
      >
        {exploreNav.map((column, index) => (
          <MegaColumnBlock
            key={column.heading}
            column={column}
            first={index === 0}
            last={index === exploreNav.length - 1}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </div>
  );
}

function MegaColumnBlock({
  column,
  first,
  last,
  onNavigate,
}: {
  column: MegaColumn;
  first: boolean;
  last: boolean;
  onNavigate: () => void;
}) {
  return (
    <div
      className={`min-w-[190px] flex-1 px-[14px] ${first ? "pl-1" : ""} ${
        last ? "" : "border-r border-mv-line"
      }`}
    >
      <div className="px-2 pb-2 text-[10.5px] font-extrabold uppercase tracking-[.06em] text-mv-green-deep">
        {column.heading}
      </div>
      {column.links.map((link) => (
        <div key={link.href}>
          {link.dividerBefore && (
            <div className="mx-[10px] my-[6px] h-px bg-mv-line" />
          )}
          <Link
            href={link.href}
            onClick={onNavigate}
            /* `whitespace-normal` overrides `.pi`'s nowrap: the descriptions
               wrap inside a 190px column. */
            className={`${panelItem} whitespace-normal`}
          >
            {link.label}
            <span className="block pt-px text-[11px] font-normal leading-[1.35] text-[#94a3b8]">
              {link.sub}
            </span>
          </Link>
        </div>
      ))}
    </div>
  );
}

/** The Learn dropdown: four reading destinations, right-aligned to its trigger. */
function LearnMenu({
  label,
  open,
  onToggle,
  onNavigate,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  onNavigate: () => void;
}) {
  return (
    // Full bar height, so `top: calc(100% + 8px)` measures from the bottom of the
    // bar and this panel drops level with the Explore one. Anchored to the button
    // instead, it opened 11px higher.
    <div className="group relative flex h-16 items-center">
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className={menuButtonBase}
      >
        {label}
        <span aria-hidden="true" className="text-[10px]">
          {open ? "▴" : "▾"}
        </span>
      </button>

      <div
        aria-label={label}
        className={`absolute right-[-10px] top-[calc(100%+8px)] z-[80] min-w-[212px] rounded-xl border border-mv-line bg-white p-2 shadow-[0_12px_30px_rgba(13,14,23,.14)] group-hover:block ${
          open ? "block" : "hidden"
        }`}
      >
        {learnNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`${panelItem} whitespace-nowrap`}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ sheet --- */

function SheetGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-[10px] pb-[3px] pt-2 text-[10.5px] font-semibold uppercase tracking-[.05em] text-[#94a3b8]">
      {children}
    </div>
  );
}

function SheetDivider() {
  return <div className="mx-[10px] my-[6px] h-px bg-mv-line" />;
}

function SheetLink({
  href,
  children,
  onNavigate,
}: {
  href: string;
  children: React.ReactNode;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="block rounded-lg px-[10px] py-2 text-sm font-semibold text-mv-slate no-underline hover:bg-mv-mint hover:text-mv-green-deep hover:no-underline"
    >
      {children}
    </Link>
  );
}

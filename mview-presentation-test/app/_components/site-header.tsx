"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";


import { buttonClass, primaryFillOverrideClass } from "./button";
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
/*
 * `leading-[1.2]` is deliberate. Without it these inherit the body's 1.55, which
 * made the "Find your record" pill 43px tall against the mockup's 38 — the same
 * 9px padding round a line box 5px taller than it should be. The prototype sets
 * `line-height:1.2` on `.btn` for exactly this reason; the mockup gets it free
 * because its own body sets no line-height.
 */
/*
 * DARK BAR. The header is black (Ryan, 2026-08-13) so the logo can be the supplied
 * asset untouched — it is drawn for the live site's black header, and on white its
 * "VIEW" and the icon's inner V simply vanish. Everything in the bar therefore
 * carries the inverted treatment: link colour, hover wash, active state, the
 * "Sign in" link and the burger. The dropdown panels and the mobile drawer hang
 * BELOW the bar and stay white — they are content surfaces, not chrome.
 *
 * `#cbd5e1` is the footer's body colour, so the two dark surfaces agree rather
 * than each inventing a grey. The hover wash is `white/10` for the same reason
 * `mv-nav-hover` was used on white: a faint lift off the bar, not a second colour.
 */
const navLinkBase =
  "whitespace-nowrap rounded-[10px] border-2 border-transparent px-[10px] py-[9px] text-[13.5px] font-semibold leading-[1.2] text-[#cbd5e1] no-underline transition-colors hover:bg-white/10 hover:text-white hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green";

/**
 * The mockup's `.nl.active` — the current page's bar item, and whichever menu is
 * open, carry the same faint green wash as hover. Without it nothing in the bar
 * says where you are: on /glossary every item read as inactive.
 */
/* `!` on both properties on purpose. `navLinkBase` sets `text-mv-slate` and the
   menu triggers used to set `bg-transparent`, and two utilities touching one
   property resolve by stylesheet order rather than by where they sit in the class
   string — so without these the wash and the green text both silently lost. */
const navLinkActive = "!bg-white/10 !text-mv-green";

/** The menu triggers match `.nl` exactly, so they sit level with the links. */
const menuButtonBase = `${navLinkBase} inline-flex cursor-pointer items-center gap-[5px] font-sans`;

/** One item inside either dropdown — the mockup's `.pi`. */
const panelItem =
  "block rounded-lg px-[10px] py-2 text-[13.5px] font-semibold text-mv-slate no-underline hover:bg-mv-mint hover:text-mv-green-deep hover:no-underline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-mv-green-deep";

/* The two CTA treatments now come from the shared button variants. The local
   `btnBase`/`btnMint`/`btnPrimary` trio they replace was the original home of
   these colours; it moved to `_components/button.tsx` so the blog, the operator
   toolbar and this header stop each carrying their own copy. */
const ctaMint = buttonClass({ variant: "mint", size: "lg" });
const ctaPrimary = buttonClass({ variant: "primary", size: "lg" });

export function SiteHeader() {
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const pathname = usePathname();

  /*
   * A bar item is current when the path is it, or sits beneath it — so
   * /blogs/some-article keeps Learn lit, and /glossary/api-gravity too. The `"/"`
   * guard matters: without it `startsWith("/")` would match every route and light
   * up whichever item pointed at the home page.
   */
  const isCurrent = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(`${href}/`);

  const exploreCurrent = exploreNav.some((column) =>
    column.links.some((link) => isCurrent(link.href)),
  );
  const learnCurrent = learnNav.some((link) => isCurrent(link.href));

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
      {/* No "Skip to main content" link (Ryan, 2026-08-13). It was the standard
          keyboard shortcut past the nav — parked off-screen at `top-[-80px]` and
          sliding in only on focus — but it was showing in normal use and was not
          wanted. Removing it costs keyboard and screen-reader users the shortcut:
          they now tab through every bar item to reach the page. Put it back if
          that becomes a problem; nothing else depended on it, though `<main>` in
          `layout.tsx` keeps its `id="main"`. */}

      {/* `bg-mv-ink` is the FOOTER's colour, deliberately — the two dark bands
          that top and tail every page should be the same black, not two. The
          border becomes a light hairline for the same reason `mv-line` was a dark
          one on white: it has to separate the bar from the page below it. */}
      <header className="sticky top-0 z-[60] border-b border-white/10 bg-mv-ink/94 backdrop-blur-[8px]">
        {/* `relative` so the Explore panel can span the bar's full width: that
            panel's wrapper is `static`, letting `left-0` resolve against this
            element rather than against the trigger. */}
        {/* Breakpoints are measured, not the design's. With the prototype's
            heavier CTA the bar needs 1132px of content at the roomy scale plus
            56px padding — 1188px of wrap — so the roomy scale only fits from
            ~1204px up; below that the tighter gap and padding take over, which
            needs 1112px and holds down to ~1127px. Hence 1240 and 1140 with a
            little slack either side. The mockup's single 1180px threshold was
            sized for a lighter six-item bar and overflowed 87px at 1024. */}
        {/* FULL WIDTH, not the 1200px wrap the rest of the site uses (Ryan,
            2026-08-13): the logo sits against the left edge of the bar and the
            actions against the right, rather than both being inset by however
            much empty bar a wide screen leaves either side.

            KNOWN CONSEQUENCE: the header no longer lines up with the footer, the
            listings or the article column, which all still wrap at 1200px. The
            logo will sit to the left of the page content below it. That is the
            trade this change makes; widen the others to match if the misalignment
            reads as wrong.

            The measured 1240/1140 breakpoints below are unaffected in the safe
            direction — they were sized for a 1200px wrap, and this only ever
            gives the bar MORE room, so nothing that fitted before can overflow
            now. */}
        <div className="relative flex h-16 items-center gap-[26px] px-7 max-[1239px]:gap-3 max-[1239px]:px-4">
          {/* Two assets, swapped at 768px (Ryan, 2026-08-13): the full wordmark
              on desktop, the square icon mark on phones, where the bar has to
              fit the burger and the CTA as well.

              Rendered as two <Image>s toggled by CSS rather than one `src` picked
              in JS: the header is a client component, but choosing in JS would
              mean the server sends one of them and the other pops in after
              hydration. Both are in the markup; only one is ever displayed.
              `alt` is on the visible-by-default one and empty on the other, so a
              screen reader announces the link once, not twice. */}
          <Link href="/" aria-label="Mineral View home" className="shrink-0">
            <Image
              src={logo.desktop.src}
              alt="Mineral View"
              width={logo.desktop.width}
              height={logo.desktop.height}
              priority
              className="block h-[34px] w-auto max-[767px]:hidden"
            />
            {/* No corner radius: the JPG's baked-in black ground now matches the
                bar, so the tile is invisible and only the mark reads. The radius
                existed solely to stop a black square looking like a clipped image
                on the old white bar. */}
            <Image
              src={logo.mobile.src}
              alt=""
              width={logo.mobile.width}
              height={logo.mobile.height}
              priority
              className="hidden h-[30px] w-[30px] max-[767px]:block"
            />
          </Link>

          {/* Collapse point is measured, not the design's 919px — see the note
              on the hamburger below. */}
          {/* `mx-auto` centres the bar items between the logo and the actions
              (Ryan, 2026-08-13), matching the live site. Flex splits the free
              space equally between this element's two auto margins, which is what
              both centres the nav AND pushes the actions to the right edge — so
              they need no auto margin of their own above 1140px. See the note on
              the actions block for why they get one back below it. */}
          <nav
            ref={navRef}
            className="mx-auto flex items-center gap-[6px] max-[1239px]:gap-[2px] max-[1139px]:hidden"
          >
            {/* The single filled CTA in the bar, on the PROTOTYPE's treatment
                rather than the mockup's (Ryan, 2026-08-11): `.mk-claim` is 14px
                at weight 800 with 12px side padding and the ✚ at weight 900,
                which makes it read heavier than the nav links either side. The
                mockup had stepped it down to 13.5/700 and dropped the icon. */}
            {/* Colour comes from `primaryFillOverrideClass`, the same green as
                every other primary button, so the two cannot drift. This used to
                carry its own hover — swapping to green-deep on white — which made
                one green behave two different ways. Size stays the prototype's
                14px/800 with the ✚. */}
            <Link
              href="/claim"
              className={`${navLinkBase} ${primaryFillOverrideClass} !px-3 !text-sm !font-extrabold`}
            >
              <span aria-hidden="true" className="mr-1 font-black">
                ✚
              </span>
              Find your record
            </Link>

            {barNav.map((item) =>
              item.kind === "link" ? (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isCurrent(item.href) ? "page" : undefined}
                  className={`${navLinkBase} ${isCurrent(item.href) ? navLinkActive : ""}`}
                >
                  {item.label}
                </Link>
              ) : item.menu === "explore" ? (
                <ExploreMenu
                  key={item.label}
                  label={item.label}
                  current={exploreCurrent}
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
                  current={learnCurrent}
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

          {/* `ml-auto` ONLY below 1140px. Above it the nav's `mx-auto` already
              pushes this block to the right edge, and a third auto margin would
              join the split and drag the nav left of centre. Below 1140 the nav
              is `hidden`, so its margins stop existing — without this the actions
              and the burger would bunch up against the logo instead of sitting
              at the right edge. */}
          <div className="flex items-center gap-[14px] max-[1139px]:ml-auto max-[767px]:gap-2">
            <Link
              href="/login"
              className="whitespace-nowrap text-sm font-semibold text-[#cbd5e1] no-underline hover:text-white hover:no-underline max-[767px]:hidden"
            >
              Sign in
            </Link>

            {/* `.mk-actions a` is nowrap in the prototype — without it "Free
                account" breaks onto two lines and pushes the bar off 64px. */}
            <Link
              href="/signup"
              className={`${ctaMint} whitespace-nowrap max-[767px]:px-[10px] max-[767px]:py-2 max-[767px]:text-xs`}
            >
              Free account
            </Link>

            {/* Collapses at 1140px — see the note on the bar above for how that
                figure is derived. The mockup sets no breakpoint and the design's
                919px is far too late for a seven-item bar. */}
            <button
              type="button"
              onClick={() => setDrawerOpen((open) => !open)}
              aria-label={drawerOpen ? "Close menu" : "Menu"}
              aria-expanded={drawerOpen}
              className="hidden shrink-0 cursor-pointer rounded-lg border border-white/20 px-[10px] py-[7px] text-base leading-none text-white max-[1139px]:block"
            >
              {drawerOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>
      </header>

      {/* ---------------- mobile sheet ---------------- */}
      {/* Full width, docked under the 64px header, rather than the 82%-wide
          right-hand drawer this replaced (QA #3). The drawer left a strip of the
          page showing down one side with the header's OWN logo still in it, so
          the sheet's logo made two logos on screen at once; and a narrow overlay
          squeezed the three "Explore ·" group labels. The header stays visible
          and its burger becomes the close control, so the sheet needs neither a
          logo nor a close button of its own. */}
      {drawerOpen && (
        <div className="fixed inset-x-0 bottom-0 top-16 z-[90] overflow-y-auto border-t border-mv-line bg-white px-4 pb-8 pt-3">
          <Link
            href="/claim"
            onClick={closeDrawer}
            className={`${ctaPrimary} mb-2 w-full text-center`}
          >
            ✚ Find your record
          </Link>

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
      )}
    </>
  );
}

/* ------------------------------------------------------------------ menus --- */

/**
 * The Explore mega menu: three bordered columns, 660px wide, centred under the
 * bar rather than aligned to its left edge.
 *
 * The wrapper is `static` on purpose. `absolute` positioning resolves against
 * the nearest positioned ancestor, so with a `relative` wrapper the panel would
 * hang off the trigger and run past the viewport on the right; `static` lets it
 * resolve against the bar, which is `relative`. Centring is then
 * `left-1/2 -translate-x-1/2` against that same box. The mockup anchors it
 * `left:0`; centred was asked for (Ryan, 2026-08-11).
 */
function ExploreMenu({
  label,
  current,
  open,
  onToggle,
  onNavigate,
}: {
  label: string;
  /** True when the open page lives inside this menu — lights the trigger. */
  current: boolean;
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
        className={`${menuButtonBase} ${open || current ? navLinkActive : ""}`}
      >
        {label}
        <span aria-hidden="true" className="text-[10px]">
          {open ? "▴" : "▾"}
        </span>
      </button>

      <div
        aria-label={label}
        className={`absolute left-1/2 top-[calc(100%+8px)] z-[80] w-[660px] max-w-[calc(100vw-40px)] -translate-x-1/2 flex-wrap rounded-xl border border-mv-line bg-white p-[14px] shadow-[0_12px_30px_rgba(13,14,23,.14)] group-hover:flex ${
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
            <span className="block pt-px text-[11px] font-normal leading-[1.35] text-mv-sublabel">
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
  current,
  open,
  onToggle,
  onNavigate,
}: {
  label: string;
  /** True when the open page lives inside this menu — lights the trigger. */
  current: boolean;
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
        className={`${menuButtonBase} ${open || current ? navLinkActive : ""}`}
      >
        {label}
        <span aria-hidden="true" className="text-[10px]">
          {open ? "▴" : "▾"}
        </span>
      </button>

      <div
        aria-label={label}
        className={`absolute right-[-10px] top-[calc(100%+8px)] z-[80] w-[272px] rounded-xl border border-mv-line bg-white p-2 shadow-[0_12px_30px_rgba(13,14,23,.14)] group-hover:block ${
          open ? "block" : "hidden"
        }`}
      >
        {/* Each row carries a one-line description, the same treatment the
            Explore columns use. Four bare words beside that menu read as an
            afterthought. Fixed 272px rather than the mockup's 212px min-width:
            the descriptions need the room, and a fixed width stops the panel
            resizing as the longest line changes. */}
        {learnNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`${panelItem} whitespace-normal`}
          >
            {item.label}
            <span className="block pt-px text-[11px] font-normal leading-[1.35] text-mv-sublabel">
              {item.sub}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ sheet --- */

function SheetGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-[10px] pb-[3px] pt-2 text-[10.5px] font-semibold uppercase tracking-[.05em] text-mv-sublabel">
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

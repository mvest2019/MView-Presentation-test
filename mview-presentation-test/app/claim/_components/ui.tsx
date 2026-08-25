/**
 * Shared classes and inline icons for the Find Your Record page. The values
 * come from the handoff prototype's stylesheet, mapped onto the site's `mv-`
 * tokens where the two palettes agree (they were designed together); the few
 * literal hexes are the prototype's field-chrome greens, which have no site
 * token.
 */

export const fieldLabel =
  "mb-[5px] flex items-center gap-[5px] text-[10.5px] font-bold uppercase tracking-[.07em] text-mv-muted [&_svg]:flex-none [&_svg]:opacity-75";

export const fieldInput =
  "h-[42px] w-full rounded-[11px] border-[1.5px] border-[#dce4e0] bg-[#fbfdfc] px-3 text-[13.5px] font-light text-mv-ink transition-[border-color,background-color] placeholder:text-[#9fb0a8] hover:border-[#c3d2cb] focus-visible:border-mv-green-deep focus-visible:bg-white focus-visible:shadow-[0_0_0_3px_rgba(46,143,109,.14)] focus-visible:outline-none";

export const refineInput =
  "w-full rounded-[11px] border-[1.5px] border-[#dce4e0] bg-[#fbfdfc] px-[13px] py-[10px] text-[13.5px] font-light transition-[border-color] placeholder:text-[#9fb0a8] focus-visible:border-mv-green-deep focus-visible:bg-white focus-visible:shadow-[0_0_0_3px_rgba(46,143,109,.14)] focus-visible:outline-none";

const btnBase =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-transparent px-[18px] py-[10px] text-sm font-semibold leading-[1.2] no-underline transition active:translate-y-px";

export const btnPrimary = `${btnBase} bg-mv-green-deep text-white shadow-[0_1px_3px_rgba(24,60,47,.22)] hover:bg-[#26775a]`;
export const btnGhost = `${btnBase} border-mv-line bg-white text-mv-slate hover:bg-mv-hover`;
export const btnMint = `${btnBase} border-mv-mint-edge bg-mv-mint text-mv-green-ink hover:brightness-[1.03]`;
export const btnSm = "!rounded-lg !px-3 !py-[6px] !text-[13px]";

/** The prototype's magnifier — search button, empty states. */
export function SearchIcon({ size = 14, stroke = 2.6 }: { size?: number; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.5 15.5 21 21" strokeLinecap="round" />
    </svg>
  );
}

export function PinIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <path d="M12 21s-7-5.1-7-11a7 7 0 0 1 14 0c0 5.9-7 11-7 11z" />
      <circle cx="12" cy="10" r="2.6" />
    </svg>
  );
}

export function HomeIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <path d="M3 11 12 3l9 8" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}

/** Derrick/lease glyph — lease fields and the lease panel heading. */
export function LeaseIcon({ size = 12, stroke = 2.5 }: { size?: number; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} aria-hidden="true">
      <path d="M4 20V8l8-5 8 5v12" />
      <path d="M9 20v-6h6v6" />
    </svg>
  );
}

export function PersonIcon({ size = 12, stroke = 2.5 }: { size?: number; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
    </svg>
  );
}

/** Button-sized spinner — the Search button while a query is in flight. */
export function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-[14px] w-[14px] animate-spin rounded-full border-2 border-white/40 border-t-white"
    />
  );
}

/** The muted magnifier centred above empty-state copy. */
export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 py-[26px] text-center text-[13px] text-mv-muted">
      <span className="mb-2 inline-block opacity-50">
        <SearchIcon size={30} stroke={1.8} />
      </span>
      <div>{children}</div>
    </div>
  );
}

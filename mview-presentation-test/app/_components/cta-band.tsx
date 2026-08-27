import Link from "next/link";
import { ArrowRight, Check, type LucideIcon } from "lucide-react";

/*
 * The site's registration/pricing ask: the claim on the left, the evidence on
 * the right.
 *
 * WHY IT LIVES HERE. It was written for the map feature guide and is now also
 * the Operator Directory's ask, so the markup moved out of
 * `map-explorer/_components/map-guide-ctas.tsx` rather than being copied. Two
 * bands that merely resemble each other drift — one gains a padding change, the
 * other does not, and the site ends up with two nearly-identical conversion
 * surfaces. This is a pure move: the map's three bands render exactly as before.
 *
 * IT IS A SERVER COMPONENT — no `"use client"`, no hooks, no handlers. That is
 * what lets the Operator Directory render its band with no client JavaScript at
 * all, while the map guide (which IS a client file) still imports it happily.
 *
 * A band with a claim and no evidence is an advertisement; a band with the list
 * beside it is an answer. That is why `children` is not optional in spirit —
 * every caller passes the panel that backs up what the copy just said.
 */

/** The shell every band shares: the ask on the left, the evidence on the right. */
export function Band({
  tone,
  icon: Icon,
  eyebrow,
  title,
  body,
  primary,
  secondary,
  children,
}: {
  /** `deep` for the band that closes the page, `plain` for the two mid-page. */
  tone: "plain" | "deep";
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  body: string;
  primary: { href: string; label: string };
  secondary: { href: string; label: string };
  children: React.ReactNode;
}) {
  const deep = tone === "deep";

  return (
    <section
      className={`overflow-hidden rounded-2xl ${
        deep
          ? "bg-gradient-to-br from-[#eaf7ef] via-[#f3fbf6] to-[#e6f5ec] ring-1 ring-[#cfe8da]"
          : "bg-white ring-1 ring-mv-line"
      }`}
    >
      <div className="grid gap-8 p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)] lg:gap-12 lg:p-10">
        <div className="min-w-0 lg:self-center">
          <span className="inline-flex items-center gap-[7px] rounded-full border border-mv-mint-edge bg-mv-mint px-[11px] py-[5px] text-[10px] font-extrabold uppercase tracking-[.11em] text-mv-green-deep">
            <Icon size={12} strokeWidth={2.5} aria-hidden="true" />
            {eyebrow}
          </span>

          <h2 className="mt-4 text-[23px] font-extrabold leading-[1.12] tracking-[-0.02em] text-mv-ink lg:text-[30px]">
            {title}
          </h2>
          <p className="mt-3 max-w-[58ch] text-[13px] leading-relaxed text-mv-slate lg:text-[14px]">
            {body}
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href={primary.href}
              className="inline-flex items-center gap-2 rounded-xl bg-mv-green-deep px-[20px] py-[12px] text-[13.5px] font-semibold text-white shadow-mv transition-[filter] hover:brightness-105"
            >
              {primary.label}
              <ArrowRight size={15} aria-hidden="true" />
            </Link>

            <Link
              href={secondary.href}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-[18px] py-[11px] text-[13.5px] font-semibold text-mv-green-deep ring-1 ring-mv-line transition-shadow hover:ring-mv-green-deep"
            >
              {secondary.label}
            </Link>
          </div>
        </div>

        <div className="min-w-0 lg:self-center">{children}</div>
      </div>
    </section>
  );
}

/** A titled panel of rows, divided rather than boxed one by one. */
export function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl bg-white ring-1 ring-mv-line">
      <p className="border-b border-mv-line bg-mv-card-tint px-4 py-[10px] text-[10px] font-extrabold uppercase tracking-[.12em] text-mv-muted">
        {title}
      </p>
      {children}
    </div>
  );
}

export function Row({ label, note }: { label: string; note?: string }) {
  return (
    <div className="flex items-start gap-[10px] border-b border-mv-line-soft px-4 py-[11px] last:border-b-0">
      <span
        aria-hidden="true"
        className="mt-[1px] grid h-[17px] w-[17px] shrink-0 place-items-center rounded-full bg-mv-mint text-mv-green-deep"
      >
        <Check size={10} strokeWidth={3} />
      </span>
      <span className="min-w-0 text-[12.5px] leading-snug text-mv-slate">
        {label}
        {note && <span className="text-mv-muted"> — {note}</span>}
      </span>
    </div>
  );
}

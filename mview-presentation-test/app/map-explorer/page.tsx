import type { Metadata } from "next";
import { h1Class } from "@/app/_components/typography";

/*
 * Placeholder map page. The interactive explorer is not built yet — this holds
 * the `/map-explorer` route the header, drawer and footer already link to so
 * the nav does not dead-end on a 404.
 */

export const metadata: Metadata = {
  title: "Map — Mineral View",
  description:
    "Explore mineral ownership, wells and permits on the Mineral View map.",
};

export default function MapExplorer() {
  return (
    <div className="mx-auto flex max-w-[1200px] flex-col items-center px-7 py-[120px] text-center max-[767px]:px-4 max-[767px]:py-20">
      <span className="rounded-full border border-[#bfe9d8] bg-mv-mint px-[14px] py-[6px] text-[11px] font-extrabold uppercase tracking-[.12em] text-mv-green-deep">
        Coming soon
      </span>
      <h1 className={`${h1Class} mt-6`}>Coming Soon</h1>
      <p className="mt-4 max-w-[520px] text-mv-muted">
        The map explorer is on its way.
      </p>
    </div>
  );
}

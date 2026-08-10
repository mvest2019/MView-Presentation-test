import { h1Class } from "@/app/_components/typography";

/*
 * Placeholder home page. The marketing pages are not built yet — this holds
 * the route so the header and footer can be reviewed in place.
 */
export default function Home() {
  return (
    <div className="mx-auto flex max-w-[1200px] flex-col items-center px-7 py-[120px] text-center max-[767px]:px-4 max-[767px]:py-20">
      <span className="rounded-full border border-[#bfe9d8] bg-mv-mint px-[14px] py-[6px] text-[11px] font-extrabold uppercase tracking-[.12em] text-mv-green-deep">
        Coming soon
      </span>
      <h1 className={`${h1Class} mt-6`}>Coming Soon</h1>
      <p className="mt-4 max-w-[520px] text-mv-muted">
        A clearer view of your minerals is on its way.
      </p>
    </div>
  );
}

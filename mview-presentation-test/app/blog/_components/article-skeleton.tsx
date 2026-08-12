import { Skeleton, SkeletonScreen } from "@/app/_components/skeleton";

/**
 * Loading state for an article, a news story or a glossary term.
 *
 * All three detail pages share one layout — 1200px wrap, an 804px content
 * column beside a 300px contents rail, collapsing to one column below 1024 —
 * so they share one skeleton. Mirrors `ArticlePage`.
 *
 * `hero` is off for glossary terms: seven of the 46 have no header image, and a
 * placeholder for something that never arrives is worse than none.
 */
export function ArticleSkeleton({ hero = true }: { hero?: boolean }) {
  return (
    <SkeletonScreen label="Loading article">
      <div className="py-16 pt-[26px] max-[767px]:py-11">
        <div className="mx-auto max-w-[1200px] px-7 max-[767px]:px-4">
          {/* Back link */}
          <Skeleton className="h-[17px] w-[96px]" />

          <div className="mt-3 grid grid-cols-[minmax(0,1fr)_300px] items-start gap-10 max-[1023px]:grid-cols-[minmax(0,1fr)]">
            <div className="min-w-0">
              {/* Category chip + date · author */}
              <div className="mt-[14px] flex flex-wrap items-center gap-2">
                <Skeleton className="h-[22px] w-[96px] rounded-full" />
                <Skeleton className="h-[15px] w-[180px]" />
              </div>

              {/* Title — two lines */}
              <Skeleton className="mt-3 h-[40px] w-full" />
              <Skeleton className="mb-[10px] mt-2 h-[40px] w-[72%]" />

              {hero && <Skeleton className="my-[6px] mb-[14px] aspect-video" />}

              {/* Body card */}
              <div className="rounded-[12px] border border-mv-line bg-mv-card p-[22px]">
                {[
                  "100%", "96%", "98%", "60%",
                  "100%", "92%", "97%", "45%",
                  "100%", "94%", "99%", "70%",
                ].map((w, i) => (
                  <Skeleton
                    key={i}
                    className={`h-[15px] ${i % 4 === 0 && i > 0 ? "mt-5" : "mt-[10px]"}`}
                    style={{ width: w }}
                  />
                ))}
              </div>
            </div>

            {/* Contents rail */}
            <div className="max-[1023px]:order-first">
              <div className="rounded-[12px] border border-mv-line bg-mv-card">
                <div className="px-4 py-[14px]">
                  <Skeleton className="h-[15px] w-[112px]" />
                </div>
                <div className="border-t border-mv-line px-2 py-2">
                  {[86, 72, 92, 64, 80, 70].map((w, i) => (
                    <Skeleton
                      key={i}
                      className="my-2 h-[16px]"
                      style={{ width: `${w}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SkeletonScreen>
  );
}

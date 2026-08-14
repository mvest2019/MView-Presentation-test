import { Skeleton, SkeletonScreen } from "@/app/_components/skeleton";

/**
 * Loading state for the Blog and News listings.
 *
 * Mirrors `ArticleListing` block for block — same container, same 26px eyebrow,
 * same tab row height, same 3/2/1 card grid at the same breakpoints — so the
 * real content lands where the placeholder was instead of jumping.
 *
 * Twelve cards because that is `PAGE_SIZE`; a different count would reflow the
 * page the moment the data arrives.
 */
export function ListingSkeleton() {
  return (
    <SkeletonScreen label="Loading articles">
      <div className="py-16 pt-[26px] max-[767px]:pb-11">
        <div className="mx-auto max-w-[1200px] px-7 max-[767px]:px-4">
          {/* Eyebrow, heading, lede */}
          <Skeleton className="h-[14px] w-[64px]" />
          <Skeleton className="my-2 h-[40px] w-[320px] max-w-full" />
          <Skeleton className="h-[20px] w-[560px] max-w-full" />

          {/* Tab row — four pills */}
          <div className="mt-5 flex flex-wrap gap-[6px]">
            {[72, 78, 96, 68].map((w, i) => (
              <Skeleton key={i} className="h-[33px] rounded-full" style={{ width: w }} />
            ))}
          </div>

          {/* Search */}
          <div className="mt-3">
            <Skeleton className="h-[37px] w-full rounded-full" />
          </div>

          {/* Category chips */}
          <div className="mt-3 flex flex-wrap gap-[6px]">
            {[86, 132, 96, 110, 104, 78].map((w, i) => (
              <Skeleton key={i} className="h-[31px] rounded-full" style={{ width: w }} />
            ))}
          </div>

          {/* Cards */}
          <div className="mt-[14px] grid grid-cols-3 gap-[18px] max-[1023px]:grid-cols-2 max-[767px]:grid-cols-1">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-[12px] border border-mv-line bg-mv-card"
              >
                {/* 16:9, matching BlogThumb */}
                <Skeleton className="aspect-video rounded-none" />
                <div className="px-[15px] pb-[15px] pt-[13px]">
                  <div className="flex items-center gap-[6px]">
                    <Skeleton className="h-[19px] w-[74px] rounded-full" />
                    <Skeleton className="h-[13px] w-[78px]" />
                  </div>
                  <Skeleton className="mb-[6px] mt-2 h-[21px] w-full" />
                  <Skeleton className="mb-[10px] h-[21px] w-[70%]" />
                  <Skeleton className="h-[14px] w-full" />
                  <Skeleton className="mt-[6px] h-[14px] w-[88%]" />
                  <Skeleton className="mt-[10px] h-[14px] w-[52px]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SkeletonScreen>
  );
}

import { Skeleton, SkeletonScreen } from "@/app/_components/skeleton";

/**
 * Loading state for the glossary index.
 *
 * Its own file rather than the listing one: this page has an A–Z rail and two
 * CSS columns of definition cards where the listings have a chip row and a
 * three-up grid.
 *
 * 26 rail chips and 16 cards are the real shape — the corpus fills 16 of the 26
 * letters — so the placeholder is the size of what replaces it.
 */
export function GlossaryIndexSkeleton() {
  return (
    <SkeletonScreen label="Loading glossary">
      <div className="py-16 pt-[26px] max-[767px]:py-11">
        <div className="mx-auto max-w-[1200px] px-7 max-[767px]:px-4">
          <Skeleton className="h-[14px] w-[86px]" />
          <Skeleton className="my-2 h-[40px] w-[420px] max-w-full" />
          <Skeleton className="h-[20px] w-[560px] max-w-full" />

          <div className="mt-5 flex flex-wrap gap-[6px]">
            {[72, 78, 96, 68].map((w, i) => (
              <Skeleton key={i} className="h-[33px] rounded-full" style={{ width: w }} />
            ))}
          </div>

          {/* A–Z rail */}
          <div className="flex flex-wrap gap-1 border-b border-mv-line py-[10px]">
            {Array.from({ length: 26 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-7 rounded-[7px]" />
            ))}
          </div>

          {/* Search */}
          <div className="py-2">
            <Skeleton className="h-[37px] w-full rounded-full" />
          </div>

          {/* Two columns of term cards. Spacing mirrors `GlossaryIndex` exactly —
              no margin here, 10px above each letter, and 14px under it (the real
              heading's 4px padding + 2px rule + the list's 8px). When this drifts
              the page visibly jumps as the terms land. */}
          <div className="columns-2 gap-x-[30px] max-[820px]:columns-1">
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className="break-inside-avoid">
                <Skeleton className="mb-[14px] mt-[10px] h-[30px] w-[28px]" />
                <div className="mb-2 rounded-[12px] border border-mv-line bg-white px-4 py-[13px]">
                  <div className="flex flex-wrap items-center gap-2">
                    <Skeleton className="h-[21px] w-[150px]" />
                    <Skeleton className="h-[19px] w-[104px] rounded-full" />
                  </div>
                  <Skeleton className="mt-2 h-[15px] w-full" />
                  <Skeleton className="mt-[6px] h-[15px] w-full" />
                  <Skeleton className="mt-[6px] h-[15px] w-[62%]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SkeletonScreen>
  );
}

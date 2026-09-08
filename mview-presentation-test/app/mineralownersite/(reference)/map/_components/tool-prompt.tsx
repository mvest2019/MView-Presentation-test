"use client";

/*
 * What to do next, while a tool is armed.
 *
 * Draw an area and Measure distance took a gesture nobody was told about: the
 * button read as pressed and the cursor turned into a crosshair, and that was
 * the whole of the feedback. A click did nothing, which reads as a broken
 * tool rather than as the wrong gesture.
 *
 * Same footing as the watch-tool prompt, so the two never argue about where
 * an instruction appears.
 */

export function ToolPrompt({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="pointer-events-none absolute bottom-6 left-1/2 z-30 w-[302px] -translate-x-1/2 rounded-xl border border-mv-line bg-white px-5 py-[14px] text-center shadow-mv-lg">
      <p className="text-[11.5px] font-bold leading-snug text-mv-ink lg:text-[13px]">
        {title}
      </p>
      <p className="mt-[6px] text-[10.5px] leading-none text-mv-muted lg:text-[12px]">
        {hint}
      </p>
    </div>
  );
}

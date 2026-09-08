"use client";

import { LoaderCircle, TriangleAlert } from "lucide-react";

import { PortalButton } from "../../_components/ui/button";

/**
 * THE TWO STATES EVERY CALL IN THIS FLOW CAN BE IN, drawn once.
 *
 * Five steps make live calls and each of them can be waiting or broken. Written
 * per step that is ten variations of the same two ideas, and the one most
 * likely to be skipped is the error — which is the one that matters, because a
 * failed call with no error state is a step that renders empty and blames the
 * reader for it.
 *
 * ── THE ERROR CARRIES A RETRY, ALWAYS ──
 *
 * Every failure this flow can hit is worth retrying: a timeout, a dropped
 * connection, a 500. None of them are the reader's fault and none are fixed by
 * starting the claim again from step 1, which is what they would otherwise do.
 */

export function FlowLoading({ label }: { label: string }) {
  return (
    <p
      className="flex items-center gap-[9px] rounded-mv border border-mv-line bg-mv-card px-4 py-[14px] text-[12.5px] text-mv-muted"
      role="status"
    >
      <LoaderCircle
        aria-hidden="true"
        className="h-[15px] w-[15px] flex-none animate-spin text-mv-green-deep"
      />
      {label}
    </p>
  );
}

export function FlowError({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-mv border border-mv-red bg-mv-red-bg px-4 py-[14px]"
      role="alert"
    >
      <p className="flex min-w-0 flex-1 items-start gap-[9px] text-[12.5px] leading-[1.5] text-mv-red">
        <TriangleAlert
          aria-hidden="true"
          className="mt-[2px] h-[15px] w-[15px] flex-none"
        />
        {message}
      </p>
      {onRetry && (
        <PortalButton variant="ghost" size="sm" onClick={onRetry}>
          Try again
        </PortalButton>
      )}
    </div>
  );
}

/**
 * NOTHING MATCHED — a successful call with an empty answer.
 *
 * Kept apart from `FlowError` on purpose: a search that found nobody is not a
 * fault, and dressing it in red would send someone hunting for a broken page
 * instead of trying a different spelling.
 */
export function FlowEmpty({
  message,
  hint,
}: {
  message: string;
  hint?: string;
}) {
  return (
    <div className="rounded-mv border border-mv-line bg-mv-portal-wash/60 px-4 py-[14px]">
      <p className="text-[12.5px] font-semibold text-mv-ink">{message}</p>
      {hint && (
        <p className="mt-[3px] text-[12px] leading-[1.5] text-mv-muted">{hint}</p>
      )}
    </div>
  );
}

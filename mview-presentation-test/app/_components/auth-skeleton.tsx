/**
 * The card-shaped fallback for `/login` and `/register`, shared by their two
 * `loading.tsx` files. Sign-in and sign-up were the last two routes of their
 * size with no route-level loading state, while `/blogs`, `/glossary`,
 * `/oil-and-gas-news` and `/operators/[slug]` all have one; both pages are
 * dynamic, because both read the session cookie before they can render.
 *
 * WHAT IT DOES NOT COVER, and this is worth knowing before reaching for it to
 * fix a blank auth page. Both routes REDIRECT a visitor who already has a
 * session, and a redirect is NOT a suspension: the server render finishes, so
 * nothing is ever "loading" and this fallback never appears. What happens
 * instead is that the client router commits the `/login` URL with the page slot
 * under the root layout EMPTY, and holds it there until the redirect has been
 * followed and the destination rendered — measured at about a second of blank
 * `<main>` beneath an already signed-in header. Verified by slowing this page
 * deliberately: on the signed-OUT path the skeleton below paints as intended;
 * on the signed-in path it does not paint at all.
 *
 * That path is still reachable, because the footer offers "Sign in" to everyone
 * whether they have a session or not. The fix for it is NOT a bigger fallback —
 * it is to redirect BEFORE the render, which is what `proxy.ts` is for and what
 * Next's own guidance says ("If you'd like to redirect before the render
 * process, use next.config.js or Proxy"). Doing that needs the session cookie's
 * name pulled out of `lib/session.ts`, which cannot be imported from a proxy
 * because it reaches for `next/headers`, and needs the redirect limited to GET
 * so a server-action POST to this URL is never bounced. Not done here.
 *
 * Sign-in and sign-up no longer route through here themselves — both finish
 * with one full navigation now, see the note on `onValid` in
 * `app/login/_components/login-form.tsx`.
 *
 * A SERVER COMPONENT, deliberately: `AuthShell` is `"use client"`, and pulling
 * it in would ship a client bundle to paint a fallback that is replaced within
 * the second. The wrapper classes are copied from it rather than imported for
 * that reason — they are the three divs at the top of `auth-shell.tsx`, and the
 * card's measurements need to keep matching it so the real form does not jump
 * when it lands.
 *
 * Everything visual is `aria-hidden` behind one `role="status"` line.
 */
export function AuthSkeleton({ label }: { label: string }) {
  return (
    <div className="pb-8 pt-6 max-[767px]:pb-6">
      <div className="mx-auto max-w-[1200px] px-7 max-[767px]:px-4">
        <div className="mx-auto max-w-[520px] rounded-mv border border-mv-line bg-mv-card p-[22px] shadow-mv">
          <p role="status" className="sr-only">
            {label}
          </p>

          <div aria-hidden="true">
            {/* The centred heading and lede `AuthHead` renders. */}
            <div className="grid justify-items-center gap-[10px] pb-5">
              <Bar className="h-[23px] w-[250px] max-w-full" />
              <Bar className="h-[13px] w-[200px] max-w-full" />
            </div>

            {/* The Google button, then the "OR WITH EMAIL" rule. */}
            <Bar className="h-[42px] w-full rounded-[10px]" />
            <div className="my-[18px] flex items-center gap-3">
              <span className="h-px flex-1 bg-mv-line" />
              <Bar className="h-[10px] w-[92px]" />
              <span className="h-px flex-1 bg-mv-line" />
            </div>

            {/* Two fields — label row above a full-width input. */}
            <div className="grid gap-[14px]">
              <div className="grid gap-[7px]">
                <Bar className="h-[12px] w-[52px]" />
                <Bar className="h-[42px] w-full rounded-[10px]" />
              </div>
              <div className="grid gap-[7px]">
                <div className="flex items-center justify-between">
                  <Bar className="h-[12px] w-[68px]" />
                  <Bar className="h-[12px] w-[104px]" />
                </div>
                <Bar className="h-[42px] w-full rounded-[10px]" />
              </div>
            </div>

            {/* The submit button and the line of fine print under it. */}
            <Bar className="mt-[18px] h-[46px] w-full rounded-[10px]" />
            <div className="mt-3 grid justify-items-center">
              <Bar className="h-[11px] w-[260px] max-w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** One shimmer bar, in the `bg-mv-line-soft` tone every other skeleton uses. */
function Bar({ className }: { className: string }) {
  return (
    <span
      className={`block animate-pulse rounded-md bg-mv-line-soft ${className}`}
    />
  );
}

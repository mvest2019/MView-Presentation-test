import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // NewsFramework API host for the blog/news endpoints. Same default as the
    // production repo's next.config.ts; override in .env.local to point at
    // another environment (prod is https://mview-info.mineralview.com).
    BASE_URL: process.env.BASE_URL || "https://testing-paymentapi.mineralview.com",

    // Map API host — counties, wells and everything else `lib/map-api.ts`
    // calls. The `/api/v1` prefix belongs to the client, not to this value, so
    // pointing at another environment is a host swap and nothing more.
    MAP_BASE_URL:
      process.env.MAP_BASE_URL || "https://mview-dev-api.mineralview.com",

    // Contact form endpoint. A different host to BASE_URL, so it gets its own
    // entry rather than a path appended to that one. Override in .env.local to
    // point at another environment.
    //
    // Same host as MAP_BASE_URL today, but kept separate and carrying its full
    // path: the two are owned by different services and are free to diverge, and
    // deriving one from the other would tie the contact form to a variable named
    // for the map.
    //
    // Note: `env` values are inlined into the client bundle, so this URL is
    // public — which is fine, the form POSTs to it straight from the browser.
    // Never put a key or token here.
    // Auth API — registration and sign-in, per the backend team's contract
    // (2026-08-13). A DIFFERENT HOST AND PATH to BASE_URL, which still serves
    // blog, news and glossary: the `/api/v1` prefix belongs to this value, so
    // pointing at another environment is a host swap and nothing more.
    //
    // Same host as MAP_BASE_URL today but kept separate and carrying its full
    // path — the two are owned by different services and free to diverge.
    AUTH_API_URL:
      process.env.AUTH_API_URL ||
      "https://mview-dev-api.mineralview.com/api/v1",

    // Google sign-in client id. PUBLIC by design — it identifies the app to
    // Google and travels in every OAuth request, which is why the live repo also
    // ships it in plain config as NEXT_PUBLIC_GOOGLE_CLIENT_ID.
    //
    // THIS VALUE MUST MATCH THE AUTH API'S OWN `GOOGLE_CLIENT_ID`. The backend
    // validates the ID token's `aud` claim against its own configured id, so a
    // token minted for any other client comes back
    //   "google token is not valid Error: Wrong recipient, payload audience !=
    //    requiredAudience"
    // Confirmed 2026-08-18: mview-dev-api.mineralview.com is configured with
    // 299057428673-… (this one), which lives in Google Cloud project
    // composed-night-403209. The live repo's older pairing — 838706864455-… for
    // testing-paymentapi.mineralview.com, 911653129924-… for
    // mview-info.mineralview.com — does NOT describe this API, and those clients
    // sit in a project we have no access to. Changing BASE_URL no longer implies
    // changing this; matching AUTH_API_URL's backend is what matters.
    //
    // EVERY ORIGIN THAT SERVES THIS APP MUST BE LISTED under the client's
    // "Authorized JavaScript origins", or the button fails before a token even
    // exists with "Error 400: origin_mismatch". Google accepts no wildcards, so a
    // Vercel per-deployment URL (…-i3ameuhal-…) cannot be registered — it changes
    // every push. Register and test on the stable domain only:
    //   http://localhost:3000
    //   https://m-view-presentation-test.vercel.app
    //
    // There is NO client secret here, and there must never be: sign-in uses
    // Google Identity Services in the browser, which returns a signed ID token
    // from the public id alone. A secret would be inlined into the client bundle
    // by this `env` block and published to every visitor.
    NEXT_PUBLIC_GOOGLE_CLIENT_ID:
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
      "299057428673-6v40523g3m874hu4tvlm1ak2m85di30k.apps.googleusercontent.com",

    CONTACT_API_URL:
      process.env.CONTACT_API_URL ||
      "https://mview-dev-api.mineralview.com/api/v1/contact-us",
    // Mineral View operator API host — `/api/v1/operators/*`. Declared here, next
    // to BASE_URL, so the domain lives in exactly one place; `lib/operator-api.ts`
    // is the only module that reads it.
    //
    // Deliberately NOT `NEXT_PUBLIC_`: the operator endpoints send no
    // `Access-Control-Allow-Origin`, so a browser fetch is blocked by CORS and
    // every call has to be server-side anyway. Keeping the name unprefixed means
    // the host is never inlined into the client bundle.
    OPERATOR_API_BASE_URL:
      process.env.OPERATOR_API_BASE_URL ||
      "https://mview-dev-api.mineralview.com",

    // Same host, exposed to the browser so the client can call the operator API
    // directly rather than through a same-origin forwarder. `NEXT_PUBLIC_` is
    // required for a value the client bundle reads; it means the API host is
    // visible in shipped JavaScript, which is the trade of calling it from the
    // browser. Kept pointing at the same default so the two never disagree.
    NEXT_PUBLIC_OPERATOR_API_BASE_URL:
      process.env.NEXT_PUBLIC_OPERATOR_API_BASE_URL ||
      process.env.OPERATOR_API_BASE_URL ||
      "https://mview-dev-api.mineralview.com",

    // Find Your Record (`/claim`) API host — the backend's `/api/v1/owners/*`
    // endpoints (shipped 2026-08-25; contract in `lib/claim-search/types.ts`).
    // The path prefix belongs to `lib/claim-search/api.ts`, so pointing at
    // another environment is a host swap and nothing more. `NEXT_PUBLIC_`
    // because these endpoints send CORS and the browser calls them directly.
    // The same-origin stand-ins and `public/owners/` index this replaced are
    // gone — an empty value no longer means anything.
    NEXT_PUBLIC_CLAIM_API_BASE_URL:
      process.env.NEXT_PUBLIC_CLAIM_API_BASE_URL ||
      "https://mview-dev-api.mineralview.com",

    /*
     * WHERE THIS DEPLOYMENT LIVES. Two jobs:
     *
     *   · `metadataBase` in `app/layout.tsx` resolves canonical and Open Graph
     *     URLs against it. Unset, it fell back to `https://www.mineralview.com`,
     *     so this preview advertised PRODUCTION as its own canonical.
     *   · It is the base sent on the password-reset request, so the emailed link
     *     can point back here instead of at production (Ryan, 2026-08-19).
     *     See `requestPasswordReset` for the large caveat on that.
     *
     * Defaults to the test deployment rather than production, deliberately: this
     * repo IS the test deployment, and a wrong default that points at prod is the
     * one that goes unnoticed. Production sets this explicitly.
     *
     * `VERCEL_URL` is not used as the fallback on purpose — it is the
     * per-deployment hostname (…-i3ameuhal-….vercel.app), which changes on every
     * push and would put a dead link in an email within a day.
     */
    NEXT_PUBLIC_SITE_URL:
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://m-view-presentation-test.vercel.app",
  },
  images: {
    // Cloudinary serves both the Mineral View logo and every article/news
    // header image. Do not swap the logo for a hand-drawn SVG.
    //
    // Scoped to the host, not to one cloud name: the CMS corpus already spans
    // `mview`, `mineralview` and `bold-pm`, and an unconfigured cloud name makes
    // `next/image` throw. `lib/image-host.ts` mirrors this list and must be
    // updated alongside it.
    remotePatterns: [new URL("https://res.cloudinary.com/**")],
  },
  /**
   * The contact page moved from `/contact` to `/contact-us`, matching the live
   * site. Anything already pointing at the old path — the Vercel preview links
   * shared for review, a bookmark, a search result — would 404 without this.
   *
   * `permanent: true` is a 308, which also tells search engines the page moved
   * rather than that it is temporarily elsewhere.
   */
  redirects() {
    return [{ source: "/contact", destination: "/contact-us", permanent: true }];
  },
};

export default nextConfig;

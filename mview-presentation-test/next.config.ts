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
    // THIS VALUE IS PAIRED WITH `BASE_URL` ABOVE AND MUST MOVE WITH IT. The
    // backend validates the ID token's `aud` claim against its OWN client id, so
    // a token minted for the wrong one is rejected with
    //   "google token is not valid Error: Wrong recipient, payload audience !=
    //    requiredAudience"
    // which is exactly what shipping the production client against the testing
    // host produced. The live repo's two env blocks pair them:
    //   testing-paymentapi.mineralview.com → 838706864455-… (this one)
    //   mview-info.mineralview.com         → 911653129924-…
    // Change BASE_URL to production and this has to change with it.
    //
    // There is NO client secret here, and there must never be: sign-in uses
    // Google Identity Services in the browser, which returns a signed ID token
    // from the public id alone. A secret would be inlined into the client bundle
    // by this `env` block and published to every visitor.
    NEXT_PUBLIC_GOOGLE_CLIENT_ID:
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
      "838706864455-kgp7idu8786fv765u4gsbaepcg9kus9n.apps.googleusercontent.com",

    CONTACT_API_URL:
      process.env.CONTACT_API_URL ||
      "https://mview-dev-api.mineralview.com/api/v1/contact-us",
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

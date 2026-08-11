import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // NewsFramework API host for the blog/news endpoints. Same default as the
    // production repo's next.config.ts; override in .env.local to point at
    // another environment (prod is https://mview-info.mineralview.com).
    BASE_URL: process.env.BASE_URL || "https://testing-paymentapi.mineralview.com",

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
};

export default nextConfig;

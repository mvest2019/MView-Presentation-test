import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // NewsFramework API host for the blog/news endpoints. Same default as the
    // production repo's next.config.ts; override in .env.local to point at
    // another environment (prod is https://mview-info.mineralview.com).
    BASE_URL: process.env.BASE_URL || "https://testing-paymentapi.mineralview.com",

    // Contact form endpoint. A different host to BASE_URL, so it gets its own
    // entry rather than a path appended to that one. Override in .env.local to
    // point at another environment.
    //
    // Note: `env` values are inlined into the client bundle, so this URL is
    // public — which is fine, the form POSTs to it straight from the browser.
    // Never put a key or token here.
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
};

export default nextConfig;

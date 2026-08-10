import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // The Mineral View logo is served from Cloudinary — the canonical asset the
    // live site uses. Do not swap it for a hand-drawn SVG.
    remotePatterns: [new URL("https://res.cloudinary.com/mview/**")],
  },
};

export default nextConfig;

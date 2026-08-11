/**
 * Whether `next/image` is allowed to load a URL.
 *
 * `next/image` throws — and takes the whole page down with a 500 — when handed a
 * src whose hostname is not in `images.remotePatterns`. Article header images
 * are CMS-authored, so that hostname is not ours to guarantee: the live corpus
 * already spans three Cloudinary cloud names (`mview`, `mineralview`,
 * `bold-pm`), which is how a single unconfigured URL first broke the listing.
 *
 * So the host is checked before the URL reaches `next/image`, and anything
 * unrecognised falls back to the branded placeholder. One odd image in a CMS
 * record should cost that one card, not the page.
 *
 * Keep this list in step with `images.remotePatterns` in `next.config.ts`.
 */
const ALLOWED_IMAGE_HOSTS = new Set(["res.cloudinary.com"]);

export function isOptimizableImage(
  src: string | null | undefined,
): src is string {
  if (!src) return false;
  try {
    const url = new URL(src);
    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      ALLOWED_IMAGE_HOSTS.has(url.hostname)
    );
  } catch {
    // Relative paths are served from our own /public and are always fine.
    return src.startsWith("/");
  }
}

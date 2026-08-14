/**
 * The five share targets, their URLs and their brand icons.
 *
 * Taken from the production repo's `app/blogs/_components/ShareDialog.tsx` and
 * its `public/icon-images/`, so a reader sees the same options and the same
 * artwork as on the live site. Icons are real brand marks, so they are IMAGES,
 * never hand-drawn SVG or emoji — the same rule the logo follows.
 *
 * Shared by the two share surfaces (the header dialog and the inline row at the
 * end of the article) so the pair cannot drift apart.
 */

/** `label` doubles as the accessible name and the alt text. */
export const NETWORKS = [
  {
    label: "Facebook",
    icon: "/icon-images/facebook-icon.png",
    href: (url: string) => `https://www.facebook.com/sharer/sharer.php?u=${url}`,
  },
  {
    label: "X",
    icon: "/icon-images/twitter-icon.png",
    href: (url: string, text: string) =>
      `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
  },
  {
    label: "LinkedIn",
    icon: "/icon-images/linkedin-icon.png",
    href: (url: string) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
  },
  {
    label: "Reddit",
    icon: "/icon-images/reddit-icon.png",
    href: (url: string, text: string) =>
      `https://www.reddit.com/submit?url=${url}&title=${text}`,
  },
  {
    label: "WhatsApp",
    // WhatsApp takes one text field, so the title and the link go together.
    icon: "/icon-images/whatsapp-icon.png",
    href: (url: string, text: string) => `https://wa.me/?text=${text}%20${url}`,
  },
] as const;

/**
 * Opens a network's share page for the CURRENT url.
 *
 * The address is read from the browser at click time rather than reconstructed
 * from an env var, so it is correct on localhost, on a preview deploy and in
 * production without configuration. That is also why the callers are buttons
 * rather than `<a href>`: an href would have to be built during render, where
 * the final URL is not yet known.
 */
export function openShare(
  build: (url: string, text: string) => string,
  title: string,
) {
  const url = encodeURIComponent(window.location.href);
  const text = encodeURIComponent(title);
  window.open(build(url, text), "_blank", "noopener,noreferrer");
}

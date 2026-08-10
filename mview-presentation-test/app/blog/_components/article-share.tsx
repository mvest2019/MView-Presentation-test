"use client";

import { useState } from "react";

/**
 * Share row from the design (`v33ShareCopy` / `v33ShareVia`). The URL is read
 * from the browser at click time rather than reconstructed from an env var, so
 * it is right on every host the app runs on.
 */

const btn =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-mv-line bg-white px-3 py-[6px] text-[13px] font-semibold text-mv-slate hover:bg-mv-bg";

export function ArticleShare({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  function shareVia(target: "email" | "x" | "facebook") {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(title);
    const targets = {
      email: `mailto:?subject=${text}&body=${url}`,
      x: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
    };
    window.open(targets[target], "_blank", "noopener,noreferrer");
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied; leave the label alone rather than
      // claiming a copy that did not happen.
    }
  }

  return (
    <div
      aria-label="Share this article"
      className="mt-[18px] flex flex-wrap items-center gap-2"
    >
      <span className="text-xs font-bold text-mv-muted">Share:</span>
      <button type="button" className={btn} onClick={copyLink}>
        🔗 {copied ? "Link copied ✓" : "Copy link"}
      </button>
      <button type="button" className={btn} onClick={() => shareVia("email")}>
        ✉ Email
      </button>
      <button type="button" className={btn} onClick={() => shareVia("x")}>
        𝕏 Post
      </button>
      <button type="button" className={btn} onClick={() => shareVia("facebook")}>
        ⓕ Facebook
      </button>
    </div>
  );
}

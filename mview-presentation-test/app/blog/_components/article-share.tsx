"use client";

import { useState } from "react";

import { Button } from "@/app/_components/button";

/**
 * Share row from the design (`v33ShareCopy` / `v33ShareVia`). The URL is read
 * from the browser at click time rather than reconstructed from an env var, so
 * it is right on every host the app runs on.
 */

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
      <Button size="sm" onClick={copyLink}>
        🔗 {copied ? "Link copied ✓" : "Copy link"}
      </Button>
      <Button size="sm" onClick={() => shareVia("email")}>
        ✉ Email
      </Button>
      <Button size="sm" onClick={() => shareVia("x")}>
        𝕏 Post
      </Button>
      <Button size="sm" onClick={() => shareVia("facebook")}>
        ⓕ Facebook
      </Button>
    </div>
  );
}

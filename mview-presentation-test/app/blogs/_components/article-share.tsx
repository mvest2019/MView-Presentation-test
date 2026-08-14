"use client";

import Image from "next/image";
import { useState } from "react";

import { Button } from "@/app/_components/button";

import { NETWORKS, openShare } from "./share-networks";

/**
 * Share row: Facebook, X, LinkedIn, Reddit, WhatsApp, plus a copy-link button.
 *
 * The five networks, their share URLs and the icon PNGs are all taken from the
 * production repo's `app/blogs/_components/ShareDialog.tsx` and its
 * `public/icon-images/` — same targets, same artwork, so a reader sees the same
 * options here as on the live site. The design's own row (copy link / email /
 * X / Facebook) is replaced; copy link survives because nothing else covers
 * "paste it somewhere the list does not offer".
 *
 * Icons are real brand marks, so they are IMAGES, not hand-drawn SVG or emoji —
 * the same rule the logo follows.
 *
 * The URL is read from the browser at click time rather than reconstructed from
 * an env var, so it is right on every host the app runs on. That is also why
 * these are buttons and not `<a href>`: the href would have to be built during
 * render, where the final URL is not known.
 */

export function ArticleShare({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

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
      className="mt-[18px] flex flex-wrap items-center gap-3"
    >
      <span className="text-xs font-bold text-mv-muted">Share:</span>

      {NETWORKS.map((network) => (
        <button
          key={network.label}
          type="button"
          onClick={() => openShare(network.href, title)}
          aria-label={`Share on ${network.label}`}
          title={`Share on ${network.label}`}
          className="cursor-pointer rounded-lg border-0 bg-transparent p-0 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
        >
          <Image
            src={network.icon}
            alt={network.label}
            width={50}
            height={50}
            className="h-9 w-9"
          />
        </button>
      ))}

      <Button size="sm" onClick={copyLink}>
        🔗 {copied ? "Link copied ✓" : "Copy link"}
      </Button>
    </div>
  );
}

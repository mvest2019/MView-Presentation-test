"use client";

import Image from "next/image";
import { Copy, Share2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { NETWORKS, openShare } from "./share-networks";

/**
 * "Share Blog" / "Share News" in the article header, and the popup it opens.
 *
 * Mirrors the live site's `ShareDialog`: a trigger beside the byline, and a
 * modal carrying the five networks, the article's address, and Copy Link.
 *
 * BUILT ON THE NATIVE `<dialog>`, not a hand-rolled overlay. `showModal()` gives
 * focus containment, Escape-to-close, inertness of the page behind and the
 * `::backdrop` pseudo-element for free — all things a `div` overlay has to
 * reimplement, usually incompletely. The only behaviour added here is
 * click-outside, which the element does not do on its own.
 *
 * The URL is captured when the dialog OPENS rather than during render: it comes
 * from `window.location`, which does not exist on the server, and rendering it
 * would not match what the server sent.
 */
export function ShareDialog({
  title,
  /** "Blog" or "News" — the live site labels the control by section. */
  section,
}: {
  title: string;
  section: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  // Reset the confirmation whenever the dialog closes, so re-opening it does not
  // show a stale "Copied" from last time.
  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    const onClose = () => setCopied(false);
    el.addEventListener("close", onClose);
    return () => el.removeEventListener("close", onClose);
  }, []);

  function open() {
    setUrl(window.location.href);
    dialog.current?.showModal();
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
    <>
      <button
        type="button"
        onClick={open}
        className="inline-flex cursor-pointer items-center gap-[6px] rounded-lg border-0 bg-transparent p-0 font-sans text-xs font-semibold text-mv-green-deep underline underline-offset-2 hover:text-mv-green-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
      >
        <Share2 aria-hidden="true" className="h-[14px] w-[14px]" />
        Share {section}
      </button>

      {/*
       * `p-0` and `open:flex` matter: a `<dialog>` is `display:none` until it is
       * opened, so any layout utility has to be applied through the `open:`
       * variant or it fights that default. `m-auto` is what centres it — the UA
       * stylesheet gives a modal dialog `margin:auto` in both axes.
       */}
      <dialog
        ref={dialog}
        aria-labelledby="share-dialog-title"
        onClick={(event) => {
          // Click-outside. The backdrop is part of the dialog's own box, so a
          // click that lands on the element ITSELF (not a child) is outside the
          // panel. Comparing against `currentTarget` is what distinguishes them.
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
        className="m-auto w-[min(420px,calc(100vw-32px))] rounded-[14px] border border-mv-line bg-white p-0 shadow-[0_18px_50px_rgba(13,14,23,.28)] backdrop:bg-black/55 backdrop:backdrop-blur-[2px] open:block"
      >
        <div className="p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <h2
              id="share-dialog-title"
              className="font-sans text-[17px] font-bold tracking-[-.01em] text-mv-ink"
            >
              Share this {section}
            </h2>
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              aria-label="Close"
              className="-mr-1 -mt-1 inline-flex cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent p-1 text-mv-muted hover:text-mv-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
            >
              <X aria-hidden="true" className="h-[18px] w-[18px]" />
            </button>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
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
                  className="h-11 w-11"
                />
              </button>
            ))}
          </div>

          {/* `readOnly` rather than disabled: the address still has to be
              selectable and copyable by hand for anyone who prefers that to the
              button, and a disabled input is neither. */}
          <input
            readOnly
            value={url}
            aria-label="Link to this page"
            onFocus={(event) => event.currentTarget.select()}
            className="mt-5 w-full rounded-[10px] border border-mv-line bg-mv-bg px-3 py-[10px] text-[13px] text-mv-slate focus:outline-2 focus:outline-offset-2 focus:outline-mv-green-deep"
          />

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={copyLink}
              className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] border-0 bg-mv-green-deep px-4 py-[9px] font-sans text-[13px] font-bold text-white hover:brightness-[1.06] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
            >
              <Copy aria-hidden="true" className="h-4 w-4" />
              {copied ? "Link copied" : "Copy Link"}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}

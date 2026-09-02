"use client";

import { useEffect, useRef, useState } from "react";

/**
 * "MOBILE PREVIEW" — the current page at 375px, in a modal.
 *
 * ── A REVIEW TOOL, NOT A PRODUCT FEATURE ──
 *
 * It sits in the account menu beside the density switch and the demo-state
 * dropdown, and it belongs to the same family: things that exist so a reviewer
 * can audit this prototype without a device lab. No owner needs it. It ships
 * because the design ships it, and because "does this page survive a phone" is
 * the question that gets asked about every screen here.
 *
 * The prototype builds it by hand — `document.createElement`, a string of
 * `innerHTML`, an iframe whose `src` is set on first open. Same idea, three
 * differences that matter:
 *
 * ── `<dialog>`, NOT A DIV WITH A CLICK HANDLER ──
 *
 * `showModal()` gives Escape-to-close, a focus trap, `aria-modal`, inert
 * background content and the `::backdrop` pseudo-element — all of which the
 * prototype's div lacks. Its only dismissal is a click that lands exactly on the
 * backdrop element, so a keyboard user who opened it could not close it.
 *
 * ── THE IFRAME LOADS ON FIRST OPEN, AND KEEPS ITS URL ──
 *
 * `src` is set when the dialog first opens rather than at mount, so a page that
 * nobody previews never pays for a second render of itself. It points at the
 * CURRENT path including its query — so previewing `?state=claimed&view=pro`
 * previews that state, which is the whole point of the tool.
 *
 * ── AND IT SUPPRESSES ITS OWN NESTING ──
 *
 * `?preview=1` is appended, and the account menu hides this control when that
 * parameter is present. Otherwise the preview contains a Mobile preview button
 * that opens a preview inside the preview, which the prototype happily does.
 */
export function MobilePreview({ onOpen }: { onOpen?: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [src, setSrc] = useState<string | null>(null);

  /* Bound only while open, and `close` fires for Escape as well as the button,
     so there is one path back to a clean state. */
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onClose = () => setSrc(null);
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, []);

  function open() {
    const url = new URL(window.location.href);
    url.searchParams.set("preview", "1");
    setSrc(url.pathname + url.search);
    dialogRef.current?.showModal();
    onOpen?.();
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="cursor-pointer border-0 bg-transparent p-0 text-left text-[12px] font-bold text-mv-green-deep"
      >
        <span aria-hidden="true">📱 </span>Mobile preview
      </button>

      <dialog
        ref={dialogRef}
        aria-label="Mobile preview of this page"
        className="m-auto rounded-mv border border-mv-line bg-mv-ink p-3 backdrop:bg-mv-ink/70"
      >
        <div className="flex items-center justify-between gap-2.5 pb-2">
          <span className="text-[11px] font-extrabold text-mv-on-deep-accent">
            <span aria-hidden="true">📱 </span>Mobile preview — 375px
          </span>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="cursor-pointer rounded-[8px] border border-mv-line bg-mv-card px-2.5 py-1 text-[12px] font-semibold text-mv-slate"
          >
            ✕ Close
          </button>
        </div>

        {/* 375 x 720 is the design's own frame. `block` because an iframe is
            inline by default and would sit on a text baseline, leaving a gap
            under it inside the dark frame. */}
        {src && (
          <iframe
            title="Mobile preview of the owner portal"
            src={src}
            width={375}
            height={720}
            className="block max-h-[70vh] rounded-[8px] border-0 bg-mv-card"
          />
        )}

        <p className="pt-2 text-[10px] text-mv-on-deep-soft">
          Live copy of this page at phone width — audit any screen here.
        </p>
      </dialog>
    </>
  );
}

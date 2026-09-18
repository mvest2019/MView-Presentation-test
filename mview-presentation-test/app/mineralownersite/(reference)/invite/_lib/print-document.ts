/**
 * HAND A DOCUMENT TO THE PRINTER, WITHOUT LEAVING THE PAGE.
 *
 * ── AN IFRAME AND NOT `window.open` ──
 *
 * The obvious version opens a tab, writes the letters into it and calls print.
 * Three things are wrong with it: a popup blocker can refuse the tab outright,
 * the reader is left with a stray tab of raw letters to close afterwards, and
 * on the way back the invite page has lost their place in it. A hidden iframe
 * prints the same document with none of that.
 *
 * `srcdoc` RATHER THAN `document.write`: the document is same-origin either
 * way, but `srcdoc` fires a real `load` event, which is the only reliable
 * moment at which the stylesheet is applied and the sheet is ready to print.
 * Printing before that gives an unstyled page, and there is no second chance —
 * the dialog is already open.
 *
 * ── TWO THINGS THAT MADE THE FIRST VERSION PRINT A BLANK PAGE ──
 *
 * Both were observed in the real dialog: it opened on one empty sheet carrying
 * the INVITE PAGE's own title and URL, meaning the browser had fallen back to
 * printing the parent document.
 *
 * THE FRAME MUST HAVE A REAL SIZE. It was 1px by 1px, which is enough to load
 * a document and not enough to lay one out — a viewport that small paginates to
 * nothing, so the printer was handed blank paper. It is a full sheet now,
 * parked off-screen at a negative offset rather than shrunk. `left:-10000px`
 * and NOT `display:none`, `visibility:hidden` or `opacity:0`: a frame that is
 * not rendered has no layout either, which is the same bug by another route.
 *
 * THE FRAME MUST NOT BE REMOVED WHILE THE DIALOG IS UP. Removing it was tied
 * to `afterprint`, and `afterprint` was measured firing on this frame when no
 * print had happened at all — pulling the document out from under a dialog
 * that was still opening, which is exactly when a browser gives up and prints
 * the parent instead.
 *
 * So nothing is removed on a timer or an event. ONE frame is created, kept,
 * and re-filled on each print. It costs one hidden element for the life of the
 * page and it cannot race a dialog, because the only thing that ever replaces
 * its contents is the reader pressing Print again.
 */
let frame: HTMLIFrameElement | null = null;

function printFrame(): HTMLIFrameElement {
  /* `isConnected` rather than a bare null check: a client-side navigation can
     take the old body with it, and a detached frame prints nothing. */
  if (frame?.isConnected) return frame;
  const created = document.createElement("iframe");
  created.setAttribute("aria-hidden", "true");
  created.setAttribute("tabindex", "-1");
  /* Named for anything that enumerates frames — a nameless one is a puzzle. */
  created.title = "Printable invitation";
  created.style.cssText =
    "position:fixed;left:-10000px;top:0;width:8.5in;height:11in;border:0";
  document.body.appendChild(created);
  frame = created;
  return created;
}

export function printDocument(html: string): void {
  const el = printFrame();
  el.onload = () => {
    const win = el.contentWindow;
    if (!win) return;
    /* A frame after `load` on the same tick can still be mid-layout, and the
       dialog snapshots the document as it finds it. One frame of breathing
       room is the difference between a laid-out sheet and an empty one. */
    requestAnimationFrame(() => {
      /* WebKit will not open the dialog for a frame that does not hold focus. */
      win.focus();
      win.print();
    });
  };
  el.srcdoc = html;
}

/** The date the letters were prepared, as the printed sheet says it. */
export function preparedOn(): string {
  return new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

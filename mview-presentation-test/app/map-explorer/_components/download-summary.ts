/*
 * One element, saved as a PDF file.
 *
 * The file is the summary as it looks on screen — same classes, same fonts,
 * same greens — because that is what is captured: the element itself, rendered
 * by the page's own CSS, photographed and laid into pages. Nothing here draws
 * a summary of its own, so the PDF cannot drift from the page.
 *
 * A file, not a print dialog. `window.print()` is the cheaper route and it
 * keeps text selectable, but it asks the reader to choose a destination and
 * press Save — which is not what Export means. So the pages are composed here
 * and handed over as a download.
 *
 * The cost of that is a picture: the text in the PDF is not selectable. It is
 * the trade for the file coming out looking exactly like the card.
 *
 * Both libraries load on demand — together they are larger than this whole
 * route, and nobody who never exports should pay for them.
 */

/**
 * The width the summary is composed at before it is captured.
 *
 * Tailwind's `xl:` rules start at 1280px and the summary's three-across rows
 * are written at that breakpoint, so a narrower capture would stack every card
 * into one column — legible, but not the page the reader was looking at.
 */
const SHEET_WIDTH = 1280;

/** A4 landscape, in millimetres. Wide, because the layout is. */
const PAGE = { width: 297, height: 210 };

/** The margin around the sheet on every page, in millimetres. */
const MARGIN = 8;

/**
 * How much bigger than CSS pixels to capture.
 *
 * 2 is the difference between type that reads as print and type that reads as
 * a screenshot. Beyond that the file grows faster than it sharpens.
 */
const CAPTURE_SCALE = 2;

export async function downloadSummaryPdf(
  node: HTMLElement | null,
  fileName: string,
): Promise<void> {
  if (!node) return;

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas-pro"),
    import("jspdf"),
  ]);

  /*
   * A copy, laid out at the full width, off to the side.
   *
   * The summary on screen is inside a panel a third of the window wide and
   * scrolled to wherever the reader left it; capturing that gives a narrow
   * column with its middle cut out. The clone is the same markup at the width
   * the layout was designed for, with nothing clipping it.
   */
  const stage = document.createElement("div");
  stage.setAttribute("aria-hidden", "true");
  stage.style.cssText = [
    "position:fixed",
    "top:0",
    // Off to the left rather than hidden: html2canvas has nothing to read from
    // an element that was never laid out.
    "left:-20000px",
    `width:${SHEET_WIDTH}px`,
    "padding:16px",
    "background:var(--color-mv-bg,#f7f8f8)",
    "z-index:-1",
  ].join(";");

  const copy = node.cloneNode(true) as HTMLElement;
  /* The veil's blur and the panel's own scroll offset belong to the screen. */
  copy.classList.remove("blur-[2px]", "select-none", "pointer-events-none");

  /*
   * Controls do not belong in a document.
   *
   * Anything marked `data-screen-only` is a thing to press — Regenerate, so
   * far — and in a PDF it is a picture of a button that does nothing. Removed
   * from the copy rather than hidden, so it takes its space with it.
   */
  copy
    .querySelectorAll("[data-screen-only]")
    .forEach((control) => control.remove());
  stage.appendChild(copy);
  document.body.appendChild(stage);

  try {
    /* The face has to be there before the picture is taken. */
    await document.fonts?.ready;

    const canvas = await html2canvas(stage, {
      scale: CAPTURE_SCALE,
      backgroundColor: "#ffffff",
      useCORS: true,
      /* The clone is off-screen; without this the capture is of empty space. */
      windowWidth: SHEET_WIDTH,
      scrollX: 0,
      scrollY: 0,
    });

    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    /* The sheet fills the page's width; its height follows from its shape. */
    const sheetWidth = PAGE.width - MARGIN * 2;
    const sheetHeight = (canvas.height / canvas.width) * sheetWidth;
    const pageHeight = PAGE.height - MARGIN * 2;

    /*
     * Long summaries run over several pages, so the image is placed once per
     * page and shifted up each time — the page's own clipping shows the band
     * that belongs to it. Slicing the canvas into separate images would land a
     * cut through the middle of a row of figures; this way the break falls
     * where the page ends and the next page carries on from exactly there.
     */
    const pages = Math.max(1, Math.ceil(sheetHeight / pageHeight));
    const image = canvas.toDataURL("image/jpeg", 0.95);

    for (let page = 0; page < pages; page += 1) {
      if (page > 0) pdf.addPage();
      pdf.addImage(
        image,
        "JPEG",
        MARGIN,
        MARGIN - page * pageHeight,
        sheetWidth,
        sheetHeight,
      );
    }

    pdf.save(`${fileName}.pdf`);
  } finally {
    stage.remove();
  }
}

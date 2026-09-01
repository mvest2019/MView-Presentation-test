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

  /*
   * And the notes those buttons opened are written out in full.
   *
   * On screen a service note is clamped to two or three lines with Read more
   * under it. In a document there is nothing to press, so the clamp would cut
   * the sentence and keep the rest to itself.
   */
  copy.querySelectorAll(".line-clamp-2, .line-clamp-3").forEach((note) => {
    note.classList.remove("line-clamp-2", "line-clamp-3");
  });
  stage.appendChild(copy);
  document.body.appendChild(stage);

  try {
    /* The face has to be there before the picture is taken. */
    await document.fonts?.ready;

    /*
     * Where a page may end: the foot of every card, and of every row of
     * cards.
     *
     * Measured off the staged copy before it is photographed, in its own
     * pixels, and turned into canvas pixels below. `:scope > *` is the
     * stack of sections; one level further in is each card inside a row, so
     * a row that runs over a page can still break between its cards.
     */
    const stageTop = stage.getBoundingClientRect().top;
    const blocks = [
      ...copy.querySelectorAll(":scope > *, :scope > * > *, [data-page-block]"),
    ];
    const breaks = [
      ...new Set(
        blocks
          .map((block) => block.getBoundingClientRect().bottom - stageTop)
          .filter((edge) => edge > 0)
          .map((edge) => Math.round(edge)),
      ),
    ].sort((a, b) => a - b);

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
     * One image per page, cut where a card ends.
     *
     * The whole picture placed once per page and shifted up by a page each
     * time was simpler, but it put the break wherever 190mm happened to fall
     * — through the middle of the production chart, among others. Each page
     * now takes the last card edge that fits inside it, and the next page
     * starts from exactly there.
     */
    const perPage = (pageHeight / sheetHeight) * canvas.height;
    /* Canvas pixels, as the measurements above are in CSS pixels. */
    const cuts = breaks.map((edge) => edge * CAPTURE_SCALE);

    let start = 0;
    let first = true;

    while (start < canvas.height - 1) {
      const limit = start + perPage;

      /* The last card edge inside this page — but not one so close to the top
         that the page would hold almost nothing. */
      const fitted = cuts.filter(
        (cut) => cut > start + perPage * 0.15 && cut <= limit,
      );
      const end = Math.min(
        fitted.length > 0 ? fitted[fitted.length - 1] : limit,
        canvas.height,
      );

      const band = document.createElement("canvas");
      band.width = canvas.width;
      band.height = Math.max(1, Math.round(end - start));
      band
        .getContext("2d")
        ?.drawImage(
          canvas,
          0,
          Math.round(start),
          canvas.width,
          band.height,
          0,
          0,
          canvas.width,
          band.height,
        );

      if (!first) pdf.addPage();
      first = false;

      pdf.addImage(
        band.toDataURL("image/jpeg", 0.95),
        "JPEG",
        MARGIN,
        MARGIN,
        sheetWidth,
        (band.height / canvas.width) * sheetWidth,
      );

      start = end;
    }

    pdf.save(`${fileName}.pdf`);
  } finally {
    stage.remove();
  }
}

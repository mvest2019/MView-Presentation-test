/*
 * One PAST weekly issue, saved as a PDF file.
 *
 * The archive's Download control fetches the issue as the service renders it —
 * `/api/weekly?format=html&week_ending=…`, which the route hands to
 * `GET /api/v1/weekly?member_id=…&week_ending=…&format=html` with the
 * member id resolved from the session on the server (`currentMemberTarget`),
 * never posted by the browser — and turns that one document into a PDF here.
 *
 * THE DOCUMENT IS THE SERVICE'S DOCUMENT, laid out by its own stylesheet in a
 * hidden same-origin iframe, photographed, and cut into pages. Nothing here
 * draws a report of its own, so the file cannot drift from what the service
 * publishes for that week — the same argument `/api/weekly/route.ts` makes for
 * the HTML download.
 *
 * ONE SECTION IS REMOVED BEFORE THE PICTURE IS TAKEN: the archive. A saved
 * issue that carries the list of every other issue inside it is a report that
 * never stops referring to itself — and it is the one section of the document
 * whose subject is the reader's history rather than the week being saved. See
 * `stripArchive` for how it is recognised in both markups the service could
 * send.
 *
 * The capture-and-page mechanics follow `map/_components/download-summary.ts`,
 * which established the pattern (and the trade: the PDF's text is a picture,
 * in exchange for the file looking exactly like the document). Both libraries
 * load on demand for the same reason as there — nobody who never downloads
 * should pay for them.
 */

/**
 * The width the document is laid out at before capture. The report's own
 * `.wrap` is `max-width:860px` plus 20px of padding a side, so 900 shows the
 * sheet at its designed width with nothing clipped.
 */
const SHEET_WIDTH = 900;

/** A4 portrait, in millimetres — the size the report's own `@page` declares. */
const PAGE = { width: 210, height: 297 };

/** The margin around the sheet on every page, in millimetres. */
const MARGIN = 10;

/** See download-summary.ts: 2 reads as print; beyond it the file only grows. */
const CAPTURE_SCALE = 2;

/**
 * The archive, removed wherever it appears and however it is marked up.
 *
 * The live service's document carries it as
 * `<section class="sheet"><p class="kicker">Archive</p>…<ul class="arch">` —
 * measured, not assumed. The screen's own markup calls it `#wrArchive` with a
 * "Past briefings — your archive" label. Both spellings are matched, plus the
 * `ul.arch` list itself, so a renamed heading alone cannot smuggle the section
 * back into the file.
 */
function stripArchive(doc: Document): void {
  doc.querySelectorAll('#wrArchive, [data-archive]').forEach((el) => el.remove());
  for (const sec of [...doc.querySelectorAll('section, .sheet, .wr-page')]) {
    if (sec.querySelector('ul.arch')) { sec.remove(); continue; }
    const label = sec.querySelector('.kicker, .section-label, h1, h2, h3');
    const t = label?.textContent?.trim().toLowerCase() ?? '';
    if (t === 'archive' || t.includes('past briefings') || t.includes('every issue kept')) {
      sec.remove();
    }
  }
}

export async function downloadWeeklyReportPdf(
  url: string,
  fileName: string,
): Promise<void> {
  const res = await fetch(url, { headers: { accept: 'text/html' } });
  if (!res.ok) {
    /* the route answers failures as JSON with the service's own sentence in
       `detail` — keep it, for the same reason the email toast does */
    let detail = '';
    try {
      const d = (await res.json()) as { detail?: string; error?: string };
      detail = d?.detail || d?.error || '';
    } catch { /* an HTML 502 from a proxy — the status carries it */ }
    throw new Error(detail || `The report service answered ${res.status}.`);
  }
  const issueHtml = await res.text();

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas-pro'),
    import('jspdf'),
  ]);

  /*
   * A same-origin iframe, not a div in this page. The issue is a standalone
   * document with its own `<style>` block writing to `body`, `h1`, `table` —
   * inlined into this page those rules would restyle the portal, and the
   * portal's rules would restyle the report. Its own browsing context is the
   * only place both stylesheets stay whole. Off to the left rather than
   * hidden, because html2canvas has nothing to read from an element that was
   * never laid out.
   */
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = [
    'position:fixed',
    'top:0',
    'left:-20000px',
    `width:${SHEET_WIDTH}px`,
    'height:1200px',
    'border:0',
    'z-index:-1',
  ].join(';');
  document.body.appendChild(frame);

  try {
    const doc = frame.contentDocument;
    if (!doc) throw new Error('The download frame could not be created.');
    /* document.write is synchronous: when it returns, the inline styles are
       parsed and the tree is laid out — there is no network for `srcdoc`'s
       load event to wait on, every style travels inside the document. */
    doc.open();
    doc.write(issueHtml);
    doc.close();

    stripArchive(doc);
    /* controls and rails, should the service ever send the screen's markup —
       a PDF has nothing to press */
    doc.querySelectorAll('.wr-noprint, [data-screen-only]').forEach((el) => el.remove());

    const body = doc.body;
    /* the frame must be as tall as the document, or the capture is of the
       first 1200px with the rest clipped away */
    frame.style.height = `${Math.max(body.scrollHeight, 1200)}px`;

    /* the face has to be there before the picture is taken */
    await doc.fonts?.ready;

    /*
     * Where a page may end: the foot of every sheet, and of every block
     * inside one, so a sheet that runs over a page can still break between
     * its tables rather than through one. Measured in the frame's own CSS
     * pixels and turned into canvas pixels below — the same arrangement as
     * download-summary.ts.
     */
    const bodyTop = body.getBoundingClientRect().top;
    const blocks = [
      ...body.querySelectorAll('.sheet, .wr-page, .sheet > *, .wr-page > *'),
    ];
    const breaks = [
      ...new Set(
        blocks
          .map((block) => Math.round(block.getBoundingClientRect().bottom - bodyTop))
          .filter((edge) => edge > 0),
      ),
    ].sort((a, b) => a - b);

    const canvas = await html2canvas(body, {
      scale: CAPTURE_SCALE,
      /* the document's own page ground, behind the white sheets */
      backgroundColor: '#f4f6f5',
      useCORS: true,
      windowWidth: SHEET_WIDTH,
      scrollX: 0,
      scrollY: 0,
    });

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const sheetWidth = PAGE.width - MARGIN * 2;
    const sheetHeight = (canvas.height / canvas.width) * sheetWidth;
    const pageHeight = PAGE.height - MARGIN * 2;

    /* one image per page, cut where a sheet or block ends — never wherever
       277mm happens to fall */
    const perPage = (pageHeight / sheetHeight) * canvas.height;
    const cuts = breaks.map((edge) => edge * CAPTURE_SCALE);

    let start = 0;
    let first = true;

    while (start < canvas.height - 1) {
      const limit = start + perPage;
      /* the last block edge inside this page — but not one so close to the
         top that the page would hold almost nothing */
      const fitted = cuts.filter(
        (cut) => cut > start + perPage * 0.15 && cut <= limit,
      );
      const end = Math.min(
        fitted.length > 0 ? fitted[fitted.length - 1] : limit,
        canvas.height,
      );

      const band = document.createElement('canvas');
      band.width = canvas.width;
      band.height = Math.max(1, Math.round(end - start));
      band
        .getContext('2d')
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
        band.toDataURL('image/jpeg', 0.95),
        'JPEG',
        MARGIN,
        MARGIN,
        sheetWidth,
        (band.height / canvas.width) * sheetWidth,
      );

      start = end;
    }

    pdf.save(`${fileName}.pdf`);
  } finally {
    frame.remove();
  }
}

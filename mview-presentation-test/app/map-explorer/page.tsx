"use client";

import { useEffect, useRef } from "react";

/*
 * Map — the "Map" slot in the header bar (`site-nav.ts`) points here.
 *
 * The prototype's Map Explorer is not a page that can be lifted out: it is a
 * whole document (`public/mineralview-map.html`, the map-only build) carrying
 * its own stylesheet, its own hash router, and the Texas Well Map itself as a
 * shadow root attached to `#txmRoot`. It is therefore served verbatim from
 * `public/` and framed here, unmodified, rather than ported.
 *
 * The frame is same-origin, so the one adjustment happens after mount: the
 * prototype ships the site header and footer in the same file, and this route
 * already renders inside the ported SiteHeader/SiteFooter, so the document's
 * own chrome is hidden to avoid a second header and footer inside the frame.
 *
 * The injection runs from an effect rather than `onLoad`: the frame is in the
 * server-rendered HTML, so a fast load fires its `load` event before this
 * component hydrates and no React handler would ever see it.
 *
 * Height is the viewport less the header (h-16 + its 1px bottom border), so
 * the map fills the screen and the site footer sits just below the fold.
 */

/** Applied inside the frame — the prototype file itself is left untouched. */
const hidePrototypeChrome =
  ".mv-skip,.mk-header,.mk-footer{display:none!important}";

export default function MapExplorerPage() {
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const hideChrome = () => {
      const doc = frame.contentDocument;
      // No head yet means the document is still parsing; the load event follows.
      if (!doc?.head || doc.getElementById("mvFrameChrome")) return;
      const style = doc.createElement("style");
      style.id = "mvFrameChrome";
      style.textContent = hidePrototypeChrome;
      doc.head.append(style);
    };

    hideChrome();
    frame.addEventListener("load", hideChrome);
    return () => frame.removeEventListener("load", hideChrome);
  }, []);

  return (
    <iframe
      ref={frameRef}
      src="/mineralview-map.html#/map-explorer"
      title="Mineral View map explorer"
      className="block h-[calc(100dvh-65px)] w-full border-0"
    />
  );
}

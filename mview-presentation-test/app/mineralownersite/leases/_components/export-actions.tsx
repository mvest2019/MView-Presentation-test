"use client";

import { useState } from "react";

import { PortalButton } from "../../_components/ui/button";

/**
 * PORTFOLIO CSV AND PDF EXPORT — the page header's two buttons.
 *
 * A CLIENT COMPONENT FOR ONE REASON: these do not work yet, and saying so has to
 * happen in the browser. The prototype's CSV button rewrote its own label to
 * "Exported ✓ (prototype)" on click and its PDF button opened a print preview;
 * both are the same honest admission that no file is produced.
 *
 * WHY A LABEL SWAP AND NOT A DISABLED BUTTON. A disabled export reads as "your
 * plan does not include this", which is false — export is a Premium feature this
 * account has. The button being live and telling the reader it is a prototype is
 * the accurate signal, and it is the design's own choice.
 *
 * WHEN THE EXPORTS LAND, this component is what they replace: the click handlers
 * become the real download calls and the header does not change. `pending`/reset
 * is deliberately absent — there is no request to be pending on yet, and
 * inventing a spinner would make a stub look like a feature.
 */
export function ExportActions() {
  const [exported, setExported] = useState<"csv" | "pdf" | null>(null);

  return (
    <div className="flex flex-wrap gap-2">
      <PortalButton
        size="sm"
        onClick={() => setExported("csv")}
        title="Exports all 10 leases as a spreadsheet. Not connected yet."
      >
        {exported === "csv" ? "Exported ✓ (prototype)" : "Portfolio CSV export"}
      </PortalButton>
      <PortalButton
        size="sm"
        onClick={() => setExported("pdf")}
        title="Produces a printable portfolio report. Not connected yet."
      >
        {exported === "pdf" ? "Prepared ✓ (prototype)" : "PDF export"}
      </PortalButton>
    </div>
  );
}

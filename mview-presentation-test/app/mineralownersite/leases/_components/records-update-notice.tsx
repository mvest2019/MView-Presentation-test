"use client";

import { useState } from "react";

import { Badge } from "../../_components/ui/badge";
import { PortalButton } from "../../_components/ui/button";
import { Notice } from "../../_components/ui/notice";
import { recordsUpdate } from "../_lib/lease-activity";
import { formatDollars } from "../_lib/lease-format";
import { mvestimateTotal } from "../_lib/lease-totals";

/**
 * THE RECORDS-UPDATE NOTICE — three possible matches from the 2026 roll.
 *
 * THREE STATES, NOT TWO, and the third is the reason this is a component rather
 * than a dismissible banner: open → accepted (a one-line chip that can be
 * reopened) → dismissed for good. "Accept" is not "close". Someone who has
 * registered that three leases might be theirs has not decided they are not, and
 * collapsing to a chip keeps the finding reachable without the card holding the
 * top of the page hostage on every visit.
 *
 * THE COPY IS DOING CAREFUL WORK AND IS PORTED WORD FOR WORD:
 *   · a matching name is NOT proof — they stay "possible matches" until verified
 *     by address, and saying so prevents a false claim;
 *   · they are NOT in the MVestimate total, so the number above cannot be read
 *     as already including them;
 *   · the names are masked behind a second click, because they are other
 *     people's until proven otherwise.
 *
 * WHY LOCAL STATE AND NOT A COOKIE. The prototype's dismissal "sticks — no
 * re-nagging every visit", which needs a server-side per-owner record. There is
 * none yet, and faking persistence in `localStorage` would half-work: the notice
 * would stay dismissed on one browser and reappear on another, which is worse
 * than resetting predictably on reload. The state here is honest about being
 * session-only; the persistence hook goes in when there is somewhere to persist.
 */

type NoticeState = "open" | "accepted" | "dismissed";

export function RecordsUpdateNotice() {
  const [state, setState] = useState<NoticeState>("open");
  const [namesShown, setNamesShown] = useState(false);

  if (state === "dismissed") return null;

  if (state === "accepted") {
    return (
      <div className="mb-2">
        <button
          type="button"
          onClick={() => setState("open")}
          className="cursor-pointer border-0 bg-transparent p-0"
        >
          <Badge tone="mint">
            ✓ {recordsUpdate.year} records update accepted ·{" "}
            {recordsUpdate.matchCount} possible matches parked — reopen
          </Badge>
        </button>
      </div>
    );
  }

  return (
    <Notice glyph="✚" className="mb-2">
      <strong>
        We updated the {recordsUpdate.year} mineral-owner records —{" "}
        {recordsUpdate.matchCount} new possible matches in your name.
      </strong>{" "}
      The refresh matched <strong>{recordsUpdate.nameVariant}</strong> variants on{" "}
      {recordsUpdate.matchCount} leases in{" "}
      <strong>{recordsUpdate.counties}</strong> that aren&apos;t on this record. A
      matching name isn&apos;t proof — they stay <em>possible matches</em> until
      you verify by address, and they&apos;re{" "}
      <strong>not included in your {formatDollars(mvestimateTotal)}</strong> until
      then.
      <div className="mt-2 flex flex-wrap gap-2">
        <PortalButton
          variant="primary"
          size="sm"
          onClick={() => setState("accepted")}
        >
          Accept ✓ — got it
        </PortalButton>
        {/*
          THE MIDDLE BUTTON REVEALS IN PLACE rather than navigating.

          The prototype's version links to a dashboard panel
          (`#/app?panel=matches3`) which this build does not have — but the panel's
          CONTENT is just the three masked names and a one-line summary, and there
          is no reason a reader should change page for three strings. So it expands
          here, which also means the notice stays dismissible in the same breath.
        */}
        <PortalButton
          size="sm"
          aria-expanded={namesShown}
          onClick={() => setNamesShown((shown) => !shown)}
        >
          {namesShown ? "Hide the names" : `See the ${recordsUpdate.matchCount} masked names`}
        </PortalButton>
        <PortalButton size="sm" onClick={() => setState("dismissed")}>
          ✕ Close — not mine
        </PortalButton>
      </div>

      {namesShown && (
        <div className="mt-2 rounded-[9px] border border-mv-mint-line bg-mv-card p-3">
          <p className="text-[12.5px]">
            <strong>{recordsUpdate.matchCount} matched records</strong>:{" "}
            {recordsUpdate.matchSummary}.
          </p>
          <p className="mt-1.5 text-[12.5px]">
            Matched on name variants:{" "}
            {recordsUpdate.maskedNames.map((name, index) => (
              <span key={name}>
                {index > 0 && " · "}
                <span className="font-semibold tabular-nums">{name}</span>
              </span>
            ))}
          </p>
          <p className="mt-1.5 text-[10px] text-mv-muted">
            Masked here so a shoulder-surfer learns nothing. Full names, lease
            numbers and addresses unmask inside the claim flow after an identity
            check — and none of these count toward your total until you verify by
            the address on file.
          </p>
        </div>
      )}
      <span className="mt-1.5 block text-[10px] text-mv-muted">
        This card appears only when the owner records refresh (this one: the{" "}
        {recordsUpdate.year} roll) — never as a standing nag.
      </span>
    </Notice>
  );
}

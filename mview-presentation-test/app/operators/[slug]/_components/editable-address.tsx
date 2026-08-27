"use client";

import { Check, Pencil, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

/**
 * The Address row, with an Edit control.
 *
 * WHY THIS IS A COMPONENT AND NOT A `PanelRow`. Every other row in that panel is
 * server-rendered text; this one holds state and needs an event handler, so it is the
 * one client island in the panel. It reproduces `PanelRow`'s markup exactly — same
 * border, same baseline, same right-aligned value — so the row it replaces looks
 * unchanged until the pencil is pressed.
 *
 * THE ADDRESS ON SCREEN NEVER CHANGES HERE. This control sends a correction REQUEST
 * and nothing more: `/operators/address-correction` queues it for review, and the P-5
 * address `/operators/details` reports is untouched until somebody accepts it. So the
 * row keeps showing the filed address through a submission, a success and a failure
 * alike, and `address` — the server's value — is the only thing it ever renders.
 *
 * THAT IS A CORRECTNESS RULE, NOT A STYLE CHOICE. A version of this file did update
 * the row to the submitted text, which put the new address directly above the
 * sentence saying it would appear once the correction was reviewed — the page
 * contradicting itself, and claiming a change no system had accepted. It also meant a
 * reload silently reverted the row, which reads as the edit having been lost. Do not
 * reintroduce a local copy of the address to write into.
 *
 * WHAT DOES RESPOND IMMEDIATELY is the editor: it closes on the click rather than
 * blocking on the round trip, and the request reports itself on its own line beneath
 * the row — sending, then sent, then gone.
 */

/** How long the confirmation stays before the row settles back. */
const SENT_MS = 6000;

/**
 * File an address correction.
 *
 * THROUGH THIS SITE'S OWN ORIGIN, NOT STRAIGHT AT THE OPERATOR API — for two
 * reasons, both hard. The operator endpoints send no `Access-Control-Allow-Origin`,
 * so a browser `POST` at one is blocked by CORS before it leaves; and two of the
 * fields the endpoint requires, `member_id` and `visitorId`, come from cookies this
 * code deliberately cannot read. The route handler behind this URL attaches both.
 * See `app/api/operators/address-correction/route.ts`.
 *
 * The message it throws is one already written for a reader — the handler answers a
 * failure with a short `message` and never passes an upstream error string through.
 */
async function sendAddressCorrection(payload: {
  operator_number: string;
  operator_name: string;
  county: string;
  old_address: string;
  new_address: string;
}): Promise<void> {
  let response: Response;
  try {
    response = await fetch("/api/operators/address-correction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // A dropped connection, not a rejection. Said as such, because "could not be
    // sent" invites a retry and "was rejected" does not.
    throw new Error(
      "That address could not be sent — check your connection and try again.",
    );
  }

  if (!response.ok) {
    // The handler's own wording when it sent any; a bare status otherwise, since
    // there is nothing useful to show for a response that is not from it.
    const message = await response
      .json()
      .then((body: { message?: unknown }) =>
        typeof body?.message === "string" ? body.message : "",
      )
      .catch(() => "");
    throw new Error(message || "That address could not be sent just now.");
  }
}

export function EditableAddress({
  operatorNumber,
  operatorName,
  county,
  address,
}: {
  operatorNumber: string;
  /** The operator's name, which the correction endpoint requires. */
  operatorName: string;
  /**
   * The county the correction is filed against — the operator's most-active one,
   * or "" when the page has none. Not required by the endpoint, so an operator with
   * no county on record can still submit rather than being blocked by a field the
   * reader has no way to supply.
   */
  county: string;
  /**
   * The address as `/operators/details` filed it, and the ONLY address this row
   * displays. There is deliberately no state mirroring it — see the note at the top
   * of the file.
   */
  address: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(address);
  /** A request is in flight. Nothing on the row waits for it; the note below does. */
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const inputId = useId();
  const sentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* The confirmation's timer outlives the component if the reader navigates away
     while it is running, and firing `setSent` after unmount is a leak React warns
     about. Cleared on unmount; `commit` clears it before setting a new one. */
  useEffect(() => {
    return () => {
      if (sentTimer.current) clearTimeout(sentTimer.current);
    };
  }, []);

  function open() {
    // Always reopened on the FILED address, never on a pending submission — the
    // editor edits the record, and the record has not moved.
    setDraft(address);
    setError("");
    setEditing(true);
  }

  function cancel() {
    setEditing(false);
    setError("");
    setDraft(address);
  }

  async function commit() {
    const next = draft.trim();
    // An address is the only field here a reader could blank by accident, and an empty
    // one is not an edit — it is a deletion of filed data with no way to undo it.
    if (next === "") {
      setError("An address cannot be empty.");
      return;
    }
    if (next === address) {
      cancel();
      return;
    }
    // A second Enter while the first request is still out would file the same
    // correction twice. The Edit control is disabled while `pending`; the keyboard
    // path into this function needs saying explicitly.
    if (pending) return;

    /*
     * THE EDITOR CLOSES ON THE CLICK, NOT ON THE RESPONSE — and that is the whole of
     * the immediate feedback, because the address itself must not move. Awaiting
     * first left the editor sitting on "Saving…" for the round trip, measured at
     * 1.1s and over 2.6s on a slower call, which read as the button doing nothing.
     */
    setEditing(false);
    setError("");
    setSent(false);
    setPending(true);

    try {
      await sendAddressCorrection({
        operator_number: operatorNumber,
        operator_name: operatorName,
        county,
        // Always the filed address: it is the "from" side of the correction, and it
        // is what the reviewer compares against.
        old_address: address,
        new_address: next,
      });
      setSent(true);
      if (sentTimer.current) clearTimeout(sentTimer.current);
      sentTimer.current = setTimeout(() => setSent(false), SENT_MS);
    } catch (failure) {
      /* Nothing to roll back — the row never moved. The editor reopens on what the
         reader typed so a fault that was not theirs does not cost them the text. */
      setDraft(next);
      setEditing(true);
      setError(
        failure instanceof Error
          ? failure.message
          : "That address could not be sent just now.",
      );
    } finally {
      setPending(false);
    }
  }

  /* ---- reading ---- */
  if (!editing) {
    return (
      /*
       * THE CONTROL SITS WITH THE LABEL, NOT THE VALUE. Put beside the address it
       * landed in the middle of a three-line wrap, pushing the text around it and
       * breaking the one line this panel is held together by — every value right-
       * aligned to the same edge. The left column is empty on this row anyway, so the
       * control goes there and the address wraps exactly as `PanelRow` renders it.
       */
      <div className="border-b border-mv-line-soft py-[10px] last:border-b-0">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="flex shrink-0 items-center gap-[7px] text-[12.5px] text-mv-muted">
            Address
            {/* The Edit control is not swapped out for the confirmation. It used to
                be, and the row then had no way back into the editor for six seconds
                after a submission — the one moment a reader is most likely to spot a
                typo in what they just sent. The confirmation gets its own line below
                instead, so the control never moves.

                It IS disabled while a request is out, so the same correction cannot
                be filed twice by an impatient second press. */}
            <button
              type="button"
              onClick={open}
              disabled={pending}
              aria-label="Edit address"
              title="Edit address"
              className="inline-flex cursor-pointer items-center gap-[4px] rounded-md border-0 bg-transparent px-[5px] py-[2px] text-[11.5px] font-semibold text-mv-muted transition-colors hover:bg-mv-hover hover:text-mv-green-deep disabled:cursor-default disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-mv-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
            >
              <Pencil
                aria-hidden="true"
                className="h-[11px] w-[11px]"
                strokeWidth={2.2}
              />
              Edit
            </button>
          </dt>
          {/* `address`, always. Not a draft, not a pending submission. */}
          <dd className="m-0 whitespace-normal text-right text-[13px] font-semibold text-mv-ink">
            {address}
          </dd>
        </div>

        {/* THE REQUEST REPORTS ITSELF HERE, on its own line, so the address above is
            never the thing carrying the status. Both states occupy no height when
            absent, so nothing below shifts as they come and go. */}
        {pending ? (
          /* `aria-live="polite"` rather than `role="status"` so this does not compete
             with the confirmation that replaces it a moment later. */
          <p
            aria-live="polite"
            className="mt-[7px] text-[11.5px] font-semibold leading-snug text-mv-muted"
          >
            Sending address edit request…
          </p>
        ) : sent ? (
          /* `role="status"` announces it to a screen reader without taking focus,
             which matters because focus is wherever the Save button was. `mv-fade` is
             the site's existing entrance — already held still under
             `prefers-reduced-motion` — so the line settles rather than flashing. */
          <p
            role="status"
            className="mv-fade mt-[7px] flex items-start gap-[6px] text-[11.5px] font-semibold leading-snug text-mv-green-deep"
          >
            <Check
              aria-hidden="true"
              className="mt-[2px] h-3 w-3 shrink-0"
              strokeWidth={2.6}
            />
            <span>
              Address edit request sent successfully.
              <span className="font-normal text-mv-muted">
                {" "}
                The address above will change once the correction is reviewed.
              </span>
            </span>
          </p>
        ) : null}
      </div>
    );
  }

  /* ---- editing ---- */
  return (
    <div className="border-b border-mv-line-soft py-[10px] last:border-b-0">
      <label
        htmlFor={inputId}
        className="block pb-[6px] text-[12.5px] text-mv-muted"
      >
        Address
      </label>

      <textarea
        id={inputId}
        rows={3}
        value={draft}
        autoFocus
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          // Escape cancels; Enter sends. Shift+Enter stays a newline, because an
          // address is genuinely multi-line.
          if (event.key === "Escape") cancel();
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            void commit();
          }
        }}
        className="w-full resize-y rounded-[10px] border border-mv-line bg-white px-[11px] py-2 text-[13px] leading-[1.5] text-mv-ink outline-none transition-[border-color,box-shadow] focus-visible:border-mv-green focus-visible:ring-[3px] focus-visible:ring-[rgba(84,191,150,.15)] disabled:opacity-60"
      />

      {/* Says what the button will do, because "Save" on its own reads as "change
          this record" and that is not what happens. */}
      <p className="mt-[6px] text-[11.5px] leading-snug text-mv-muted">
        This sends a correction request for review. The filed address stays as it is
        until it is accepted.
      </p>

      {error ? (
        <p role="alert" className="mt-[6px] text-[12px] leading-snug text-mv-red">
          {error}
        </p>
      ) : null}

      <div className="mt-2 flex justify-end gap-2">
        <button
          type="button"
          onClick={cancel}
          className="inline-flex cursor-pointer items-center gap-1 rounded-[9px] border border-mv-line bg-white px-[11px] py-[6px] text-[12.5px] font-semibold text-mv-slate transition-colors hover:border-mv-line-strong hover:bg-mv-hover disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
        >
          <X aria-hidden="true" className="h-3 w-3" strokeWidth={2.4} />
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void commit()}
          className="inline-flex cursor-pointer items-center gap-1 rounded-[9px] border border-mv-green-deep bg-mv-green-deep px-[11px] py-[6px] text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
        >
          <Check aria-hidden="true" className="h-3 w-3" strokeWidth={2.6} />
          {/* No "Saving…" state: the editor closes on the click, so that label never
              had a moment to be read. */}
          Save
        </button>
      </div>
    </div>
  );
}

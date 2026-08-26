"use client";

import { Check, Pencil, X } from "lucide-react";
import { useId, useRef, useState } from "react";

/**
 * The Address row, with an Edit control.
 *
 * WHY THIS IS A COMPONENT AND NOT A `PanelRow`. Every other row in that panel is
 * server-rendered text; this one holds state and needs an event handler, so it is the
 * one client island in the panel. It reproduces `PanelRow`'s markup exactly — same
 * border, same baseline, same right-aligned value — so the row it replaces looks
 * unchanged until the pencil is pressed.
 *
 * THE SAVE IS NOT WIRED YET, AND THAT IS DELIBERATE. This app has no write endpoint —
 * no PUT, PATCH or update route exists anywhere in it, and `/operators/details` is a
 * read. Rather than guess a URL and a payload and POST them at a live API, `saveAddress`
 * below is the single place that needs the real contract; everything around it — the
 * form, validation, the saving and error states — is finished and reviewable now.
 *
 * THE FILED VALUE IS NEVER LOST. `filed` is what the endpoint returned and is kept
 * separately from the edit, so Cancel restores it exactly and a failed save leaves the
 * record on screen untouched.
 */

/** How long the "Saved" tick stays before the row settles back. */
const SAVED_MS = 2200;

/**
 * Persist an edited address.
 *
 * THE ONE PLACE TO WIRE. When the endpoint exists, this becomes a `fetch` to a
 * same-origin route handler — the pattern every other write-shaped call on this site
 * would use, so the upstream host and any credential stay server-side, exactly as
 * `/api/operators/<no>/what-changed` does for its service.
 *
 * It throws until then. A silent success would be worse than an error: the row would
 * show an address that nothing had stored, and the next page load would quietly revert
 * it with no explanation.
 */
async function saveAddress(operatorNumber: string, address: string) {
  // Logged rather than swallowed: while this is unwired it is the only way to see
  // what a save WOULD have sent, which is exactly what is needed to confirm the
  // payload against the endpoint once there is one.
  console.warn("[operator-address] not wired — would save", {
    operatorNumber,
    address,
  });
  throw new Error(
    "Address updates are not connected to a backend yet, so this change was not saved.",
  );
}

export function EditableAddress({
  operatorNumber,
  address,
}: {
  operatorNumber: string;
  /** The address as `/operators/details` filed it. */
  address: string;
}) {
  const [filed, setFiled] = useState(address);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(address);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const inputId = useId();
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function open() {
    setDraft(filed);
    setError("");
    setEditing(true);
  }

  function cancel() {
    setEditing(false);
    setError("");
    setDraft(filed);
  }

  async function commit() {
    const next = draft.trim();
    // An address is the only field here a reader could blank by accident, and an empty
    // one is not an edit — it is a deletion of filed data with no way to undo it.
    if (next === "") {
      setError("An address cannot be empty.");
      return;
    }
    if (next === filed) {
      cancel();
      return;
    }

    setBusy(true);
    setError("");
    try {
      await saveAddress(operatorNumber, next);
      setFiled(next);
      setEditing(false);
      setSaved(true);
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaved(false), SAVED_MS);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "That address could not be saved.",
      );
    } finally {
      setBusy(false);
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
      <div className="flex items-baseline justify-between gap-4 border-b border-mv-line-soft py-[10px] last:border-b-0">
        <dt className="flex shrink-0 items-center gap-[7px] text-[12.5px] text-mv-muted">
          Address
          {saved ? (
            <span
              role="status"
              className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-mv-green-deep"
            >
              <Check aria-hidden="true" className="h-3 w-3" strokeWidth={2.6} />
              Saved
            </span>
          ) : (
            <button
              type="button"
              onClick={open}
              aria-label="Edit address"
              title="Edit address"
              className="inline-flex cursor-pointer items-center gap-[4px] rounded-md border-0 bg-transparent px-[5px] py-[2px] text-[11.5px] font-semibold text-mv-muted transition-colors hover:bg-mv-hover hover:text-mv-green-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
            >
              <Pencil
                aria-hidden="true"
                className="h-[11px] w-[11px]"
                strokeWidth={2.2}
              />
              Edit
            </button>
          )}
        </dt>
        <dd className="m-0 whitespace-normal text-right text-[13px] font-semibold text-mv-ink">
          {filed}
        </dd>
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
        disabled={busy}
        autoFocus
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          // Escape cancels; Enter saves. Shift+Enter stays a newline, because an
          // address is genuinely multi-line.
          if (event.key === "Escape") cancel();
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            void commit();
          }
        }}
        className="w-full resize-y rounded-[10px] border border-mv-line bg-white px-[11px] py-2 text-[13px] leading-[1.5] text-mv-ink outline-none transition-[border-color,box-shadow] focus-visible:border-mv-green focus-visible:ring-[3px] focus-visible:ring-[rgba(84,191,150,.15)] disabled:opacity-60"
      />

      {error ? (
        <p role="alert" className="mt-[6px] text-[12px] leading-snug text-mv-red">
          {error}
        </p>
      ) : null}

      <div className="mt-2 flex justify-end gap-2">
        <button
          type="button"
          onClick={cancel}
          disabled={busy}
          className="inline-flex cursor-pointer items-center gap-1 rounded-[9px] border border-mv-line bg-white px-[11px] py-[6px] text-[12.5px] font-semibold text-mv-slate transition-colors hover:border-mv-line-strong hover:bg-mv-hover disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
        >
          <X aria-hidden="true" className="h-3 w-3" strokeWidth={2.4} />
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void commit()}
          disabled={busy}
          className="inline-flex cursor-pointer items-center gap-1 rounded-[9px] border border-mv-green-deep bg-mv-green-deep px-[11px] py-[6px] text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
        >
          <Check aria-hidden="true" className="h-3 w-3" strokeWidth={2.6} />
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

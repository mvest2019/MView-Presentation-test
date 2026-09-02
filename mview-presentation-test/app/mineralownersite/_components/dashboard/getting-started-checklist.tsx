"use client";

import { useSyncExternalStore } from "react";

import { STORAGE_KEYS } from "../../_lib/portal-state";

/**
 * The getting-started checklist — v37 · C8.
 *
 * "Moved BELOW the changing numbers and labeled for what it's for (your first
 * Lease Audit). Dismissible; persists in localStorage `mv_checklist_hide`."
 *
 * THREE STEPS THAT END AT THE LEASE AUDIT, which is the point of the card: the
 * audit is the payment check the whole service is built around, so the
 * onboarding path is named after its destination rather than being a generic
 * "complete your profile" nag. Step 1 is already struck through — the reader
 * claimed their record to get here.
 *
 * CLIENT, for the dismiss alone. `localStorage` is an external store, so
 * `useSyncExternalStore` reads it rather than an effect that calls `setState` —
 * the same pattern the portal's density preference uses, and it keeps
 * `react-hooks/set-state-in-effect` satisfied.
 *
 * IT PAINTS BEFORE IT HIDES, on a first load where the reader has previously
 * dismissed it. The server cannot read `localStorage`, so the card renders and
 * then goes on hydration. The reference behaves identically — its inline
 * `onclick` sets the key and the page hides the card on the next load — and the
 * alternative is a cookie, which is a bigger change than this card is worth.
 */

/* ---------------------------------------------------------------------------
   The dismissal, as an external store.

   Module-level so the subscriber set and the callbacks keep a stable identity
   across renders. `storage` covers other tabs; `notify` covers this one, since
   a same-tab write fires no `storage` event.
   --------------------------------------------------------------------------- */
const listeners = new Set<() => void>();

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** A primitive, so React's `===` check is stable and cannot loop. */
function readHidden(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEYS.checklistHidden);
  } catch {
    // Private mode, blocked site data, or a browser that throws on access.
    return null;
  }
}

function readHiddenOnServer(): string | null {
  return null;
}

function dismiss(): void {
  try {
    window.localStorage.setItem(STORAGE_KEYS.checklistHidden, "1");
  } catch {
    // Storage is unavailable, so the choice cannot persist past this render —
    // but the notify below still hides the card for the rest of the visit.
  }
  listeners.forEach((listener) => listener());
}

/** The numbered disc in front of each step: done, next, or not yet. */
function StepMark({ state, n }: { state: "done" | "next" | "later"; n: number }) {
  const base = {
    width: 20,
    height: 20,
    borderRadius: "50%",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    flex: "none",
  } as const;

  if (state === "done") {
    return (
      <span
        aria-hidden="true"
        style={{
          ...base,
          background: "var(--mint)",
          color: "var(--green-deep)",
          fontSize: 12,
        }}
      >
        ✓
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      style={{
        ...base,
        border: `2px solid ${state === "next" ? "var(--green)" : "#dfe3e9"}`,
        color: state === "next" ? "var(--green-deep)" : "var(--muted)",
        fontSize: 11,
      }}
    >
      {n}
    </span>
  );
}

export function GettingStartedChecklist() {
  const hidden = useSyncExternalStore(
    subscribe,
    readHidden,
    readHiddenOnServer,
  );

  if (hidden) return null;

  const row = {
    display: "flex",
    alignItems: "center",
    gap: 7,
  } as const;

  return (
    <div id="mvChecklist" className="card" style={{ margin: "10px 0", padding: "12px 16px" }}>
      <div className="between" style={{ flexWrap: "wrap", gap: 8 }}>
        <strong className="small">
          Getting started — your first Lease Audit · 1 of 3 done
        </strong>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={dismiss}
          aria-label="Hide the checklist"
          title="Hide — you can finish these anytime"
        >
          Hide ✕
        </button>
      </div>

      <div
        className="flex"
        style={{ flexWrap: "wrap", gap: 14, marginTop: 8 }}
      >
        <span className="small" style={row}>
          <StepMark state="done" n={1} />
          <s className="muted">1. Claim your record</s>
        </span>

        {/* Steps 2 and 3 land on My Profile and Lease Audit, neither of which is
            built — so they are labelled, not linked, the same way every unbuilt
            destination in this portal is. They become links when those pages
            land, with no other change here. */}
        <span className="small" style={{ ...row, fontWeight: 700 }}>
          <StepMark state="next" n={2} />
          Upload a check stub →
        </span>
        <span
          className="small"
          style={{ ...row, fontWeight: 700, color: "var(--muted)" }}
        >
          <StepMark state="later" n={3} />
          Run your first audit
        </span>
      </div>

      <p className="tiny muted" style={{ margin: "7px 0 0" }}>
        These three steps end at your included Lease Audit — the payment check
        the service is built around. Next: <strong>upload a check stub</strong>.
      </p>
    </div>
  );
}

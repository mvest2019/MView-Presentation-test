"use client";

import { useSyncExternalStore } from "react";

import { DEFAULT_COLUMNS, type OperatorColumns } from "@/lib/operator-types";

/**
 * The table's column choices, persisted to `localStorage` under the key the
 * prototype uses (`mv_kyo_cols`).
 *
 * `localStorage` is an external store, so it is read through
 * `useSyncExternalStore` rather than copied into state inside an effect. That
 * matters for two reasons: the server has no `localStorage`, so the server
 * snapshot has to be the defaults for the markup to hydrate cleanly; and
 * setting state from an effect body triggers a second render pass on every
 * mount, which is what `react-hooks/set-state-in-effect` is there to catch.
 *
 * The in-memory `current` is the source of truth and is handed out by
 * reference, which is what keeps `getSnapshot` stable — returning a freshly
 * parsed object each call would re-render forever. It also means a browser with
 * storage blocked still toggles columns for the session; the choice just does
 * not outlive the tab.
 */

const STORAGE_KEY = "mv_kyo_cols";

let current: OperatorColumns | null = null;
const listeners = new Set<() => void>();

function parse(raw: string | null): OperatorColumns {
  if (!raw) return DEFAULT_COLUMNS;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && "oil" in parsed) {
      // Spread over the defaults so a stored blob written by an older shape
      // cannot leave a column undefined.
      return { ...DEFAULT_COLUMNS, ...(parsed as Partial<OperatorColumns>) };
    }
  } catch {
    // Corrupt value — fall through to the defaults.
  }
  return DEFAULT_COLUMNS;
}

function readStorage(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function getSnapshot(): OperatorColumns {
  current ??= parse(readStorage());
  return current;
}

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);

  // Keeps two tabs in step. Does not fire in the tab that wrote the value,
  // hence the explicit notify in `setColumns`.
  function onStorage(event: StorageEvent) {
    if (event.key !== STORAGE_KEY) return;
    current = parse(readStorage());
    onStoreChange();
  }

  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener("storage", onStorage);
  };
}

function setColumns(next: OperatorColumns): void {
  current = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable — the in-memory value still drives the UI.
  }
  for (const listener of listeners) listener();
}

export function useColumnPreferences(): [
  OperatorColumns,
  (next: OperatorColumns) => void,
] {
  const columns = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => DEFAULT_COLUMNS,
  );
  return [columns, setColumns];
}

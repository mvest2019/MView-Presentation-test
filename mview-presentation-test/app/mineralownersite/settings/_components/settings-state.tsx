"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  RECOMMENDED_ALERT_IDS,
  RECOMMENDED_TOGGLE_IDS,
  initialChannelState,
  initialToggleState,
  settingsMeta,
} from "../_lib/settings-data";
import type { AlertChannel, ChannelSet } from "../_lib/settings-types";

/**
 * THE ONE PIECE OF STATE THE SETTINGS PAGE SHARES, AND THE TOAST THAT REPORTS IT.
 *
 * ── WHY THERE IS A PROVIDER AT ALL, ON A PAGE OF INDEPENDENT SWITCHES ──
 *
 * Because of one button. "Use Recommended Settings" appears TWICE — once in the
 * page head and once in the Ultra card — and each press has to turn on three
 * rows in the Notifications card and every channel on three rows in the Alert
 * preferences card. Those are four different components. Without shared state
 * the button cannot reach them.
 *
 * The prototype solved this by walking the DOM: `querySelectorAll('.setrow')`,
 * read the label text, add a class. That is not available here and would not be
 * wanted if it were — it puts the source of truth in the rendered markup, where
 * a copy edit can silently change behaviour. See the note in `settings-data.ts`
 * on why "recommended" is a flag on the data instead.
 *
 * ── EVERY CHANGE CONFIRMS ITSELF  (v36 · #10) ──
 *
 * The design's rule is that no settings change is silent: each one raises a
 * "Saved ✓" pill, bottom-centre, which fades on its own. That is what makes the
 * absence of a Save button honest — the page says it saved, so the reader does
 * not have to wonder. `announce()` is therefore called by every control on the
 * page, and the toast lives here rather than in each card so there is only ever
 * one of it.
 *
 * `role="status"` and `aria-live="polite"` so a screen reader gets the same
 * confirmation a sighted reader gets from the pill.
 *
 * ── WHAT THIS IS NOT ──
 *
 * It is not persistence. Nothing here reaches a server or `localStorage`: the
 * portal is a design build and this page's job is to show what the settings
 * surface looks like and how it behaves. When it is wired,
 * `PG.user_notification_settings` is the store, the writes are per-change (the
 * cadence the route's data contract states), and this provider becomes the
 * optimistic layer over them rather than the source of truth.
 */

interface SettingsStateValue {
  /** Switch positions by `ToggleSetting.id`. */
  toggles: Record<string, boolean>;
  setToggle: (id: string, on: boolean) => void;
  /** Channel positions by `AlertPreference.id`. */
  channels: Record<string, ChannelSet>;
  setChannel: (id: string, channel: AlertChannel, on: boolean) => void;
  /** v36 · #11 — the alerts that protect an owner's money, in one press. */
  applyRecommended: () => void;
  /** Raise the "Saved ✓" pill. Defaults to that wording. */
  announce: (message?: string) => void;
}

const SettingsStateContext = createContext<SettingsStateValue | null>(null);

/** How long the pill stays up. The prototype's own 1800ms. */
const TOAST_MS = 1800;

export function SettingsStateProvider({ children }: { children: ReactNode }) {
  /*
   * `useState(fn)` — THE LAZY FORM MATTERS. Both initialisers build a fresh
   * object graph, and the channel one clones a nested record per alert type.
   * Passing the CALL rather than the function would rebuild all of it on every
   * render and throw the result away.
   */
  const [toggles, setToggles] = useState(initialToggleState);
  const [channels, setChannels] = useState<Record<string, ChannelSet>>(
    initialChannelState,
  );
  const [toast, setToast] = useState<string | null>(null);

  /* The pill's dismissal timer, held so a second change restarts it rather than
     letting the first one's timeout close the second one's message early. */
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const announce = useCallback((message?: string) => {
    setToast(message ?? settingsMeta.savedToast);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), TOAST_MS);
  }, []);

  const setToggle = useCallback(
    (id: string, on: boolean) => {
      setToggles((current) => ({ ...current, [id]: on }));
      announce();
    },
    [announce],
  );

  const setChannel = useCallback(
    (id: string, channel: AlertChannel, on: boolean) => {
      setChannels((current) => ({
        ...current,
        [id]: { ...current[id], [channel]: on },
      }));
      announce();
    },
    [announce],
  );

  const applyRecommended = useCallback(() => {
    setToggles((current) => {
      const next = { ...current };
      for (const id of RECOMMENDED_TOGGLE_IDS) next[id] = true;
      return next;
    });
    setChannels((current) => {
      const next = { ...current };
      for (const id of RECOMMENDED_ALERT_IDS) {
        next[id] = { email: true, push: true, inApp: true };
      }
      return next;
    });
    announce(settingsMeta.recommendedToast);
  }, [announce]);

  const value = useMemo(
    () => ({
      toggles,
      setToggle,
      channels,
      setChannel,
      applyRecommended,
      announce,
    }),
    [toggles, setToggle, channels, setChannel, applyRecommended, announce],
  );

  return (
    <SettingsStateContext.Provider value={value}>
      {children}
      {/*
        THE PILL IS ALWAYS IN THE DOM, and only its opacity changes. Mounting it
        on demand would give a screen reader a live region that appears at the
        same moment its content does, which is the one case where announcements
        are unreliable — the region has to exist before the text lands in it.

        `pointer-events-none` because it sits over the page's bottom edge, where
        the demo ribbon and the mobile tab bar also live.
      */}
      <div
        role="status"
        aria-live="polite"
        className={`pointer-events-none fixed bottom-[26px] left-1/2 z-[261] -translate-x-1/2 rounded-full bg-mv-portal-toast px-[18px] py-[9px] text-[13px] font-bold text-white shadow-[0_8px_22px_rgba(4,35,26,.35)] transition-opacity duration-150 ${
          toast ? "opacity-100" : "opacity-0"
        }`}
      >
        {toast}
      </div>
    </SettingsStateContext.Provider>
  );
}

/**
 * Read the shared settings state.
 *
 * THROWS RATHER THAN FALLING BACK. A control rendered outside the provider
 * would otherwise look fine and quietly do nothing — it would flip its own
 * label and never be reachable by "Use Recommended Settings", which is exactly
 * the class of defect the provider exists to prevent.
 */
export function useSettingsState(): SettingsStateValue {
  const value = useContext(SettingsStateContext);
  if (!value) {
    throw new Error(
      "useSettingsState must be used inside <SettingsStateProvider>.",
    );
  }
  return value;
}

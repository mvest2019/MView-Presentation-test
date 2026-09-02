"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";

import { ContextDrawer } from "../../_components/ui/context-drawer";

/**
 * THE ALERT EXPLAINER DRAWER — `mvCtxOpen('axPaidCheck')`, as React.
 *
 * ── ONE DRAWER FOR NINE ALERTS ──
 *
 * The reference has exactly one `#ctxDrawer` in the document and swaps its
 * contents; there is never more than one open, and building nine panels each
 * with their own scrim would put nine copies of the same chrome on the page.
 * So this provider owns the open id, renders ONE `ContextDrawer`, and picks the
 * panel out of the `panels` prop.
 *
 * ── THE PANELS ARE SERVER-RENDERED, AND THAT IS THE WHOLE POINT OF THE PROP ──
 *
 * Nine four-heading explainers are most of this page's text. They arrive here as
 * finished nodes from `page.tsx`, so opening a drawer is a state change over
 * markup that already exists — nothing is fetched, nothing is built in the
 * browser, and none of that prose is in the client bundle. The same arrangement
 * `leases-tabs.tsx` uses for its tab panels.
 *
 * ALL NINE ARE RENDERED INTO THE DRAWER'S BODY and eight are hidden, exactly as
 * the reference does it (`body.children.forEach(c => c.style.display = 'none')`
 * then show one). The alternative — mounting only the open one — would throw
 * away the reader's scroll position inside a long panel every time, and would
 * make an already-rendered node re-enter the tree for no gain.
 *
 * ── THE ROW IS THE TRIGGER, AS ASKED ──
 *
 * `AlertRowTrigger` reproduces the reference's own row behaviour: the whole row
 * is a `role="button"` that opens the drawer on click, Enter or Space, and a
 * click landing on a link or button inside it is left alone.
 *
 * That guard is the reference's `if(!event.target.closest('a,button,.gloss'))`
 * and it is not optional — without it, "Run your included Lease Audit" would
 * open an explainer instead of navigating. It is also the honest cost of this
 * pattern: a `role="button"` containing its own buttons is not a shape a screen
 * reader can describe well, and the guard exists because the browser cannot tell
 * which control was meant either. Ported as the design has it.
 */

interface AlertDrawerState {
  openId: string | null;
  open: (id: string) => void;
  close: () => void;
}

const AlertDrawerContext = createContext<AlertDrawerState | null>(null);

export interface AlertDrawerPanel {
  id: string;
  title: ReactNode;
  subtitle?: ReactNode;
  /** The four-heading body, rendered on the server. */
  body: ReactNode;
}

export function AlertDrawerProvider({
  panels,
  children,
}: {
  panels: AlertDrawerPanel[];
  children: ReactNode;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  const close = useCallback(() => setOpenId(null), []);
  const value = useMemo(
    () => ({ openId, open: setOpenId, close }),
    [openId, close],
  );

  const active = panels.find((panel) => panel.id === openId);

  return (
    <AlertDrawerContext.Provider value={value}>
      {children}

      <ContextDrawer
        open={openId !== null}
        onClose={close}
        /* The title and subtitle come from the active panel. Kept as
           fragments when nothing is open so the header does not flash empty
           strings during the slide-out — the panel stays mounted through the
           280ms transition and only the id has been cleared. */
        title={active?.title ?? ""}
        subtitle={active?.subtitle}
      >
        {panels.map((panel) => (
          <div key={panel.id} hidden={panel.id !== openId}>
            {panel.body}
          </div>
        ))}
      </ContextDrawer>
    </AlertDrawerContext.Provider>
  );
}

/**
 * Throws outside the provider rather than returning a no-op.
 *
 * A silent fallback would leave every row looking clickable and doing nothing,
 * which is the one failure worth crashing in development to catch.
 */
export function useAlertDrawer(): AlertDrawerState {
  const state = useContext(AlertDrawerContext);
  if (!state) {
    throw new Error("useAlertDrawer must be used inside <AlertDrawerProvider>");
  }
  return state;
}

/**
 * The clickable wrapper around one server-rendered row.
 *
 * `hidden` is passed through rather than applied by a parent, so the trigger and
 * the row it wraps are the same element the inbox filter shows and hides — one
 * node per alert, not a wrapper around a wrapper.
 */
export function AlertRowTrigger({
  alertId,
  hidden,
  hasExplainer,
  children,
}: {
  alertId: string;
  hidden: boolean;
  /** Rows without an explainer stay plain — nothing to open. */
  hasExplainer: boolean;
  children: ReactNode;
}) {
  const { open } = useAlertDrawer();

  if (!hasExplainer) return <div hidden={hidden}>{children}</div>;

  /* The reference's guard, verbatim in intent: a click that landed on a control
     inside the row belongs to that control. `.gloss` is in its selector list
     too; here the `why?` gloss IS a `<button>`, so `button` already covers it. */
  function fromInnerControl(target: EventTarget | null): boolean {
    return target instanceof Element && target.closest("a, button") !== null;
  }

  function onClick(event: MouseEvent<HTMLDivElement>) {
    if (fromInnerControl(event.target)) return;
    open(alertId);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (fromInnerControl(event.target)) return;
    /* Space scrolls the page by default; Enter on a `role="button"` does not,
       but preventing both keeps the two identical. */
    event.preventDefault();
    open(alertId);
  }

  return (
    <div
      hidden={hidden}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={onKeyDown}
      title="Tap — this alert explains itself in a side panel"
      className="cursor-pointer rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
    >
      {children}
    </div>
  );
}

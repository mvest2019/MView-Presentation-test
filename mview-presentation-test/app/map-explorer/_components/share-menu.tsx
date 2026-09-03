"use client";

import { Check, Download, Printer, X } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";

/*
 * The Share dropdown that opens under the toolbar's Share button.
 *
 * Presentational like the basemap gallery and the tools panel — no open/close
 * state and no positioning of its own. The one exception is Copy, which is
 * self-contained: it needs nothing from the map, so wiring it here rather than
 * pushing a callback up would only add ceremony.
 *
 * "Save image (PNG)" and "Print map" do need the view — a PNG means
 * `view.takeScreenshot()` — so they stay callbacks for whoever mounts this.
 */

type ShareMenuProps = {
  /** Link shown in the field. Defaults to the current URL once mounted. */
  url?: string;
  onSaveImage?: () => void;
  onPrint?: () => void;
  /** Shuts the menu. Without it the only way out was a click elsewhere. */
  onClose?: () => void;
  className?: string;
  style?: CSSProperties;
};

/** How long the Copy button stays confirmed, in milliseconds. */
const COPIED_FOR = 1600;

function subscribeToLocation(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener("hashchange", onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener("hashchange", onChange);
  };
}

export function ShareMenu({
  url,
  onSaveImage,
  onPrint,
  onClose,
  className = "",
  style,
}: ShareMenuProps) {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // `location` is browser-only, and reading it in an effect to push into state
  // would cost a second render. `useSyncExternalStore` is the sanctioned way in:
  // empty string on the server, the live URL on the client, and it re-reads if
  // history changes under it.
  const currentUrl = useSyncExternalStore(
    subscribeToLocation,
    () => window.location.href,
    () => "",
  );
  const link = url ?? currentUrl;

  useEffect(
    () => () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    },
    [],
  );

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      if (resetTimer.current) clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setCopied(false), COPIED_FOR);
    } catch {
      // The clipboard can refuse — insecure origin, denied permission, or no
      // user activation behind the call. Select the link instead so the user
      // still has a one-keystroke way out rather than a button that does
      // nothing.
      inputRef.current?.select();
    }
  }

  return (
    <div
      className={`w-[284px] rounded-xl border border-mv-line bg-white p-[14px] shadow-mv-lg ${className}`}
      style={style}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-[10px] font-extrabold uppercase leading-none tracking-[.14em] text-mv-muted">
          Link to this view
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            title="Close"
            className="-mr-1 -mt-1 grid h-[22px] w-[22px] shrink-0 cursor-pointer place-items-center rounded-md text-mv-muted hover:bg-mv-red-bg hover:text-mv-red focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-mv-green-deep"
          >
            <X size={14} strokeWidth={2.5} aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="mt-[10px] flex items-center gap-2">
        <label htmlFor="share-link" className="sr-only">
          Link to this view
        </label>
        <input
          ref={inputRef}
          id="share-link"
          type="text"
          readOnly
          value={link}
          onFocus={(event) => event.currentTarget.select()}
          className="min-w-0 flex-1 rounded-lg border border-mv-line bg-white px-[10px] py-[5px] text-[12px] leading-tight text-mv-slate outline-none focus:border-mv-green-deep"
        />
        <button
          type="button"
          onClick={copyLink}
          className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-lg bg-mv-green-deep px-[13px] py-[6px] text-[12.5px] font-semibold leading-tight text-white transition-[filter] hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
        >
          {copied && <Check size={12} strokeWidth={3} aria-hidden="true" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <div className="mt-[14px] flex flex-col">
        <MenuItem icon={Download} label="Save image (PNG)" onClick={onSaveImage} />
        <MenuItem icon={Printer} label="Print map" onClick={onPrint} />
      </div>

      {/* Announces the copy without moving focus off the button. */}
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? "Link copied to clipboard" : ""}
      </span>
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Download;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex cursor-pointer items-center gap-[10px] rounded-lg px-1 py-[6px] text-left text-[13.5px] font-medium leading-tight text-mv-ink transition-colors hover:bg-[#f2f8f5] hover:text-mv-green-deep focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-mv-green-deep"
    >
      <Icon size={15} strokeWidth={1.9} className="shrink-0 text-mv-slate" aria-hidden="true" />
      {label}
    </button>
  );
}

"use client";

import { ChevronDown, Check, Search } from "lucide-react";
import { createPortal } from "react-dom";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  CONTROL_CARET,
  CONTROL_TINT,
  SELECT_CLASS,
} from "@/app/_components/control-styles";

/**
 * The one dropdown control, shared by every operator page.
 *
 * IT WAS A NATIVE `<select>`, AND IT IS NOT ANY MORE — DEFECTS 160, 181.
 *
 * The trade the old note recorded finally came due: "THE POPUP IS THE OPERATING
 * SYSTEM'S… it cannot be styled, and a long list runs the height of the viewport."
 * Two defects ring exactly that. 160: "dropdown goes out of the page and need to
 * decrease the height of the dropdown", against the County filter — 255 options.
 * 181: the same control running off the edge on mobile and iPad. Neither is fixable
 * on a native popup from a web page, at any breakpoint, by any amount of CSS.
 *
 * So this is a real listbox now: a `<button>` trigger and a panel this file owns and
 * can therefore size. `max-h-[280px]` with its own scroll is the "decrease the height"
 * half; the positioning below is the "goes out of the page" half.
 *
 * THE CALL SITES DID NOT CHANGE. Children are still `<option>` elements and are read
 * for their `value` and their text — eight call sites across the listing, the detail
 * page, the two comparison tools and the presentations picker keep the markup they
 * had. That is deliberate: swapping the element under them was already the risky part,
 * and rewriting each caller at the same time would have made it impossible to tell
 * which change broke what.
 *
 * PORTALLED TO `document.body`, AND POSITIONED `fixed` FROM THE TRIGGER'S OWN RECT.
 * These controls sit inside cards that clip — `overflow-hidden` on the listing's
 * workspace, `overflow-x-auto` on the lease card — so a panel left in place is cut off
 * by an ancestor rather than by the viewport, which is half of what 160 and 181
 * describe. `fixed` alone would usually escape that, but only usually: any ancestor
 * with a `transform`, `filter` or `will-change` becomes the containing block for fixed
 * descendants and the clipping comes straight back. A portal cannot be caught out that
 * way, and these panels sit under cards that already animate on hover.
 *
 * The rect maths then keeps it inside the viewport on all four sides: it flips above
 * the trigger when there is more room up than down, and it is clamped to the left and
 * right edges with an 8px margin, which is the mobile half of 181.
 *
 * A FILTER FIELD APPEARS PAST `FILTER_THRESHOLD` OPTIONS. 255 counties cannot be found
 * by scrolling, and the native control at least had type-ahead. This gives that back —
 * and gives it to a phone, which never had it.
 *
 * WHAT WAS KEPT FROM THE NATIVE ELEMENT, DELIBERATELY. Full keyboard control (arrows,
 * Home/End, Enter, Escape, typing to jump), `role="listbox"`/`role="option"` with
 * `aria-selected`, focus returned to the trigger on close, and a trigger that reads as
 * the same control as before — `SELECT_CLASS` is unchanged and was already written to
 * suit a `<button>` as well as a `<select>`.
 *
 * SINGLE-SELECT ONLY, as before. A filter that needs several values at once needs a
 * different control, not this one with a flag.
 */

/** Beyond this many options the panel grows a filter field. */
const FILTER_THRESHOLD = 12;

/** The panel's own cap — the "decrease the height" half of defect 160. */
const PANEL_MAX_HEIGHT = 280;

/**
 * The least height the panel is ever given, whatever the measurements say.
 *
 * Roughly three options plus the filter field. It exists so a squeezed or unreported
 * viewport produces a small scrolling menu rather than a zero-height one — a menu with
 * no height is indistinguishable from a control that did nothing.
 */
const MIN_PANEL_HEIGHT = 120;

/** Space kept between the panel and the viewport edge. */
const VIEWPORT_MARGIN = 8;

type Choice = { value: string; label: string; disabled: boolean };

/**
 * An option's text, flattened.
 *
 * `String(children)` IS NOT ENOUGH, and getting this wrong is silent. JSX splits
 * `<option>{name} County</option>` into the array `["MIDLAND", " County"]`, and
 * `String(["MIDLAND", " County"])` is `"MIDLAND, County"` — a comma the reader never
 * typed, in the label of a control that used to render this correctly because the
 * browser did the flattening. Three call sites write their options that way (the
 * directory's counties, the comparison page's counties, its play types).
 *
 * Numbers are kept because an option may legitimately be one; anything else — an
 * element, a boolean, a null — contributes nothing rather than its `[object Object]`.
 */
function optionText(node: React.ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(optionText).join("");
  return "";
}

/**
 * The `<option>` children, read as data.
 *
 * Anything that is not an `<option>` is ignored rather than thrown on: a caller
 * mapping over an empty list renders `false`/`null`, and that is not an error.
 */
function readChoices(children: React.ReactNode): Choice[] {
  const out: Choice[] = [];

  const walk = (node: React.ReactNode) => {
    if (node === null || node === undefined || typeof node === "boolean")
      return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (typeof node !== "object" || !("type" in node)) return;

    const element = node as React.ReactElement<{
      value?: string | number;
      disabled?: boolean;
      children?: React.ReactNode;
    }>;
    if (element.type !== "option") return;

    const label = optionText(element.props.children);

    out.push({
      value: String(element.props.value ?? ""),
      label,
      disabled: element.props.disabled === true,
    });
  };

  walk(children as React.ReactNode);
  return out;
}

export function SelectControl({
  label,
  value,
  onChange,
  className = "",
  children,
}: {
  /** The accessible name. These controls carry no visible `<label>`. */
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Sizing from the caller — these live in flex rows and grids of different shapes. */
  className?: string;
  children: React.ReactNode;
}) {
  const choices = useMemo(() => readChoices(children), [children]);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const filterRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const showFilter = choices.length > FILTER_THRESHOLD;

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle === "") return choices;
    return choices.filter((choice) =>
      choice.label.toLowerCase().includes(needle),
    );
  }, [choices, query]);

  /* The trigger's text. Falls back to the raw value, then to the first option — a
     value with no matching option (a filter whose options failed to load) must still
     name something rather than rendering an empty button. */
  const selected = choices.find((choice) => choice.value === value);
  const triggerText = selected?.label || value || choices[0]?.label || "";

  /**
   * Place the panel against the trigger, in viewport coordinates.
   *
   * Runs on open and again on scroll/resize, because `fixed` does not follow the
   * trigger the way an absolutely-positioned child would. Cheap — one rect read and
   * one state write per event, and only while the panel is open.
   */
  const place = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    /*
     * EVERY MEASUREMENT IS CLAMPED, because none of them is guaranteed sane. A viewport
     * can report 0×0 (a hidden or background tab), and a trigger can be scrolled out of
     * view between the press and this running. Left to itself the arithmetic then puts
     * the panel somewhere impossible — a NEGATIVE `bottom` pushes it below the fold, so
     * the reader presses a control and no menu appears anywhere on screen.
     *
     * The clamps are the whole defence: a floor under the height so the panel is never
     * sized to nothing, and a floor under the offset so it can never be positioned
     * outside the viewport it is supposed to stay inside. This is the same failure 160
     * and 181 describe, arrived at from the other direction.
     */
    const viewportH = Math.max(1, window.innerHeight);
    const viewportW = Math.max(1, window.innerWidth);

    const below = viewportH - rect.bottom - VIEWPORT_MARGIN;
    const above = rect.top - VIEWPORT_MARGIN;
    // Open upwards only when it genuinely helps: below is too short AND above is
    // roomier. Flipping on the first pixel of shortfall makes the control jitter.
    const dropUp = below < Math.min(PANEL_MAX_HEIGHT, above) && above > below;
    const maxHeight = Math.max(
      MIN_PANEL_HEIGHT,
      Math.min(PANEL_MAX_HEIGHT, dropUp ? above : below),
    );

    // Never narrower than the trigger, never wider than the viewport allows.
    const width = Math.max(
      120,
      Math.min(Math.max(rect.width, 200), viewportW - VIEWPORT_MARGIN * 2),
    );
    const left = Math.min(
      Math.max(VIEWPORT_MARGIN, rect.left),
      Math.max(VIEWPORT_MARGIN, viewportW - width - VIEWPORT_MARGIN),
    );

    setPanelStyle({
      position: "fixed",
      width,
      left,
      maxHeight,
      ...(dropUp
        ? { bottom: Math.max(VIEWPORT_MARGIN, viewportH - rect.top + 4) }
        : {
            top: Math.max(
              VIEWPORT_MARGIN,
              Math.min(rect.bottom + 4, viewportH - MIN_PANEL_HEIGHT),
            ),
          }),
    });
  }, []);

  // Before paint, so the panel never appears at 0,0 for a frame.
  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        panelRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }

    // `true` on scroll so it fires for any scrolling ancestor, not just the window —
    // these controls sit inside cards that scroll independently.
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open, place]);

  /* Focus the filter as it appears. An effect because it touches the DOM, which is what
     effects are for — the active index is set in `openPanel` rather than here, so
     opening costs one render rather than two. */
  useEffect(() => {
    if (open && showFilter) filterRef.current?.focus();
  }, [open, showFilter]);

  /* Keep the active option in view as the arrows move through it. */
  useEffect(() => {
    if (!open) return;
    const node = listRef.current?.children[activeIndex];
    if (node instanceof HTMLElement) node.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  /**
   * Open, starting on the current selection.
   *
   * The index is set HERE rather than in an effect keyed on `open`: the choice is
   * knowable at the moment of opening, and computing it afterwards costs a second
   * render in which the panel is on screen with the wrong option highlighted.
   */
  function openPanel() {
    const index = choices.findIndex((choice) => choice.value === value);
    setActiveIndex(index >= 0 ? index : 0);
    setOpen(true);
  }

  function close(focusTrigger = true) {
    setOpen(false);
    setQuery("");
    if (focusTrigger) triggerRef.current?.focus();
  }

  function commit(choice: Choice | undefined) {
    if (!choice || choice.disabled) return;
    onChange(choice.value);
    close();
  }

  function step(delta: number) {
    if (visible.length === 0) return;
    setActiveIndex((current) => {
      const next = current + delta;
      if (next < 0) return 0;
      if (next > visible.length - 1) return visible.length - 1;
      return next;
    });
  }

  function onKeyDown(event: React.KeyboardEvent) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!open) openPanel();
        else step(1);
        break;
      case "ArrowUp":
        event.preventDefault();
        if (!open) openPanel();
        else step(-1);
        break;
      case "Home":
        if (!open) break;
        event.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        if (!open) break;
        event.preventDefault();
        setActiveIndex(visible.length - 1);
        break;
      case "Enter":
        if (!open) break;
        event.preventDefault();
        commit(visible[activeIndex]);
        break;
      case " ":
        // Only when the panel is shut — inside the filter field a space is a space.
        if (open) break;
        event.preventDefault();
        openPanel();
        break;
      case "Escape":
        if (!open) break;
        event.preventDefault();
        close();
        break;
      case "Tab":
        if (open) close(false);
        break;
      default:
        break;
    }
  }

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => (open ? close(false) : openPanel())}
        onKeyDown={onKeyDown}
        /* `text-left` because a button centres its text and a select does not, and
           `truncate` so a long county name cannot widen the control. Everything else
           is `SELECT_CLASS`, unchanged, so this reads as the same control it replaced. */
        className={`${SELECT_CLASS} ${CONTROL_TINT} min-h-[44px] truncate text-left`}
      >
        {triggerText}
      </button>

      <ChevronDown
        aria-hidden="true"
        className={`${CONTROL_CARET} transition-transform ${open ? "rotate-180" : ""}`}
        strokeWidth={1.8}
      />

      {open &&
        createPortal(
          <div
            ref={panelRef}
            style={panelStyle}
            className="z-50 flex flex-col overflow-hidden rounded-xl border border-mv-line bg-white shadow-[0_12px_30px_rgba(13,14,23,.16)]"
          >
            {showFilter && (
              <div className="relative shrink-0 border-b border-mv-line-soft p-2">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-[18px] top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-mv-muted"
                  strokeWidth={1.9}
                />
                <input
                  ref={filterRef}
                  type="text"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setActiveIndex(0);
                  }}
                  onKeyDown={onKeyDown}
                  aria-label={`Filter ${label.toLowerCase()}`}
                  placeholder="Type to filter…"
                  /* DEFECT 193 — 16px on a phone. Safari zooms the page in on any focused
                   field below 16px, and this one is inside a floating panel, so the zoom
                   also drags the panel off screen. */
                  className="w-full rounded-[9px] border border-mv-line bg-white py-[7px] pl-[26px] pr-2 text-base text-mv-ink outline-none focus-visible:border-mv-green sm:text-[13px]"
                />
              </div>
            )}

            <ul
              ref={listRef}
              id={listId}
              role="listbox"
              aria-label={label}
              aria-activedescendant={
                visible[activeIndex] ? `${listId}-${activeIndex}` : undefined
              }
              tabIndex={-1}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1"
            >
              {visible.length === 0 ? (
                <li className="px-3 py-2 text-[13px] text-mv-muted">
                  Nothing matches that.
                </li>
              ) : (
                visible.map((choice, index) => {
                  const isSelected = choice.value === value;
                  return (
                    <li
                      key={`${choice.value}-${index}`}
                      id={`${listId}-${index}`}
                      role="option"
                      aria-selected={isSelected}
                      aria-disabled={choice.disabled || undefined}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => commit(choice)}
                      className={`flex cursor-pointer items-center gap-2 px-3 py-[7px] text-[13.5px] ${
                        choice.disabled
                          ? "cursor-not-allowed text-mv-placeholder"
                          : index === activeIndex
                            ? "bg-mv-tint text-mv-green-deep"
                            : "text-mv-ink"
                      }`}
                    >
                      <Check
                        aria-hidden="true"
                        className={`h-[14px] w-[14px] shrink-0 ${
                          isSelected ? "text-mv-green-deep" : "invisible"
                        }`}
                        strokeWidth={2.6}
                      />
                      <span className="min-w-0 flex-1 truncate">
                        {choice.label}
                      </span>
                    </li>
                  );
                })
              )}
            </ul>
          </div>,
          document.body,
        )}
    </div>
  );
}

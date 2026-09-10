"use client";

import { Check, ChevronDown, MapPin } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import type { CountyIndex } from "../_lib/claim-types";
import type { Async } from "./claim-wizard";
import { FIELD_BASE, FieldClear, FieldFrame } from "./claim-field";

/**
 * THE COUNTY PICKER — type to filter, 204 counties.
 *
 * ── WHY THIS IS NOT A `<select>` ──
 *
 * It was one, and a native select with 204 options is a scroll. The list is
 * drawn by the operating system, so it cannot be styled, cannot be searched
 * beyond the browser's own first-letter jump, and renders its highlight in the
 * OS accent colour — a blue bar in the middle of a green page. Finding "Palo
 * Pinto" meant dragging a scrollbar past a hundred names.
 *
 * Typing "pal" now leaves one row.
 *
 * ── IT IS A REAL COMBOBOX, NOT AN INPUT NEXT TO A LIST ──
 *
 * `role="combobox"` with `aria-expanded`, `aria-controls` and
 * `aria-activedescendant`, and the options are real `role="option"` nodes. The
 * arrow keys move a highlight WITHOUT moving focus — focus stays in the text
 * box so you can keep typing — which is the whole reason the active option is
 * pointed at by id rather than by being focused.
 *
 * ── THE TYPED TEXT AND THE CHOSEN COUNTY ARE DIFFERENT THINGS ──
 *
 * The box shows the selection when it is closed and the search text when it is
 * open, and opening clears the search so the full list is there. Escape closes
 * without changing the selection — a filter half-typed and then abandoned must
 * not silently become a county nobody picked.
 *
 * ── THE COUNTS ARE THE BACKEND'S, AND THEY GO MISSING ON A COLD START ──
 *
 * `/owners/counties` answers with zeroed counts while it warms up. Printing
 * "Andrews (0)" would read as an empty county, so on a pending index the names
 * are shown alone — the same rule the select used.
 */
export function CountyCombobox({
  counties,
  value,
  onChange,
}: {
  counties: Async<CountyIndex>;
  /** The chosen county's name, or "" for "Any Texas county". */
  value: string;
  onChange: (county: string) => void;
}) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const index = counties.data;
  const all = index?.counties ?? [];
  const showCounts = index !== null && !index.pending;
  const disabled = counties.loading || all.length === 0;

  /** A county is set AND the box is showing it rather than a typed filter. */
  const chosen = value !== "" && !open && !disabled;

  const needle = query.trim().toLowerCase();
  const matches = needle
    ? all.filter((c) => c.name.toLowerCase().includes(needle))
    : all;

  /* "Any Texas county" is the way back to no filter, so it heads the unfiltered
     list — but not a filtered one, where it matches nothing that was typed. */
  const options: { name: string; label: string; owners: number | null }[] = [
    ...(needle ? [] : [{ name: "", label: "Any Texas county", owners: null }]),
    ...matches.map((c) => ({ name: c.name, label: c.name, owners: c.owners })),
  ];

  /* Keep the highlight on a row that exists as the filter narrows. */
  const activeIndex = Math.min(active, Math.max(options.length - 1, 0));

  /* Follow the highlight with the scroll — arrow keys move it past the fold
     long before the list itself would scroll. */
  useEffect(() => {
    if (!open) return;
    listRef.current?.children[activeIndex]?.scrollIntoView({
      block: "nearest",
    });
  }, [open, activeIndex]);

  /* A click anywhere else is a dismissal. `pointerdown` rather than `click` so
     it closes on the way down, before the thing underneath reacts. */
  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  function show() {
    if (disabled || open) return;
    setQuery("");
    setActive(
      Math.max(
        options.findIndex((o) => o.name === value),
        0,
      ),
    );
    setOpen(true);
  }

  function choose(name: string) {
    onChange(name);
    setOpen(false);
    setQuery("");
    inputRef.current?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) return show();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive(
        (activeIndex + step + options.length) % Math.max(options.length, 1),
      );
      return;
    }
    if (event.key === "Home" && open) {
      event.preventDefault();
      return setActive(0);
    }
    if (event.key === "End" && open) {
      event.preventDefault();
      return setActive(options.length - 1);
    }
    if (event.key === "Enter" && open) {
      event.preventDefault();
      const picked = options[activeIndex];
      if (picked) choose(picked.name);
      return;
    }
    if (event.key === "Escape" && open) {
      /* Closes WITHOUT selecting — the typed filter is discarded and the
         county that was already chosen stays chosen. */
      event.preventDefault();
      setOpen(false);
      setQuery("");
    }
  }

  return (
    <FieldFrame
      label="County"
      qualifier="narrow it down if you know it"
      htmlFor={id}
    >
      <MapPin
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 z-10 h-[14px] w-[14px] -translate-y-1/2 text-mv-muted"
      />

      <div ref={rootRef}>
        <input
          id={id}
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-activedescendant={
            open && options[activeIndex]
              ? `${id}-opt-${activeIndex}`
              : undefined
          }
          autoComplete="off"
          disabled={disabled}
          value={open ? query : value}
          placeholder={
            counties.loading
              ? "Loading counties…"
              : all.length === 0
                ? "County list unavailable"
                : "Any Texas county"
          }
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            if (!open) setOpen(true);
          }}
          onFocus={show}
          onClick={show}
          onKeyDown={onKeyDown}
          className={`${FIELD_BASE} cursor-pointer font-medium ${
            chosen ? "!pr-[52px]" : "!pr-9"
          }`}
        />

        {/* CLEARING A COUNTY IS "ANY TEXAS COUNTY" AGAIN, and until now the only
            way to say that was to open 204 options and find the first row. The
            X sits inboard of the chevron because the chevron is still the way
            in — this removes a filter, it does not replace the picker.

            It is hidden while the list is open: the box then holds what is
            being TYPED, not the county that is chosen, and an X over a search
            term that clears something else is a trap. */}
        {chosen && (
          <FieldClear
            className="right-[30px]"
            label="Clear the county filter"
            onClick={() => {
              onChange("");
              setOpen(false);
              setQuery("");
            }}
          />
        )}

        <ChevronDown
          aria-hidden="true"
          className={`pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-mv-muted transition-transform ${open ? "rotate-180" : ""}`}
        />

        {open && (
          <ul
            id={`${id}-list`}
            ref={listRef}
            role="listbox"
            aria-label="Texas counties"
            /* NARROWER THAN THE FIELD, and capped rather than fixed. The
               longest row is "San Augustine" against a five-digit count, which
               is nowhere near the width of a half-card form field — stretching
               to the input's full width left the counts marooned on the far
               right, a whole column of empty space away from the names they
               belong to.

               `w-full max-w-[280px]` and NOT `w-[min(100%,280px)]`: the comma
               stops Tailwind extracting the candidate, so no rule is emitted
               and the panel silently falls back to shrink-to-fit — 191px, and
               narrower still on a short list. These two utilities mean the
               same thing and actually compile. The cap is what keeps it inside
               the field on a narrow viewport. */
            className="absolute top-[calc(100%+4px)] left-0 z-50 max-h-[264px] w-full max-w-[280px] overflow-y-auto overscroll-contain rounded-[9px] border border-mv-line bg-mv-card py-1 shadow-mv-lg"
          >
            {options.map((option, i) => {
              const isActive = i === activeIndex;
              const isChosen = option.name === value;
              return (
                <li
                  key={option.name || "__any"}
                  id={`${id}-opt-${i}`}
                  role="option"
                  aria-selected={isChosen}
                  /* `pointerdown`, not `click`: the input's blur would
                     otherwise close the list before the click landed. */
                  onPointerDown={(e) => {
                    e.preventDefault();
                    choose(option.name);
                  }}
                  onPointerEnter={() => setActive(i)}
                  className={`flex cursor-pointer items-center gap-2 px-3 py-[7px] text-[13px] ${
                    isActive ? "bg-mv-mint/50" : ""
                  } ${isChosen ? "font-bold text-mv-ink" : "text-mv-slate"}`}
                >
                  <Check
                    aria-hidden="true"
                    className={`h-[13px] w-[13px] flex-none text-mv-green-deep ${isChosen ? "" : "invisible"}`}
                  />
                  <span className="min-w-0 flex-1 truncate">
                    <Marked text={option.label} needle={needle} />
                  </span>
                  {option.owners !== null && showCounts && (
                    <span className="flex-none text-[11.5px] text-mv-muted tabular-nums">
                      {option.owners.toLocaleString("en-US")}
                    </span>
                  )}
                </li>
              );
            })}

            {options.length === 0 && (
              <li className="px-3 py-[10px] text-[12.5px] text-mv-muted">
                No county matches “{query.trim()}”.
              </li>
            )}
          </ul>
        )}
      </div>
    </FieldFrame>
  );
}

/**
 * The typed part of a county name, in bold. It is what makes a filtered list
 * scannable — "Palo Pinto" and "Lampasas" both match "pa", and the bold says
 * where.
 */
function Marked({ text, needle }: { text: string; needle: string }) {
  const at = needle ? text.toLowerCase().indexOf(needle) : -1;
  if (at === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <b className="font-bold text-mv-ink">
        {text.slice(at, at + needle.length)}
      </b>
      {text.slice(at + needle.length)}
    </>
  );
}

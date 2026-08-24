"use client";

import { useEffect } from "react";

/**
 * Drives the prototype's hero rotators inside the injected markup.
 *
 * The markup is the document's own HTML, and injected HTML never executes its own
 * `<script>` — so without this, `/` and `/professionals` would show slide one for
 * ever. This is the prototype's script reimplemented against its own DOM and its
 * own class names, so the CSS keeps working untouched:
 *
 *   `.hx7-stage > .hx7-slide`   the slides; the visible one carries `.on`
 *   `.hx7-dots`                 empty in the markup — the script builds the dots
 *   `.hx7-dot` / `.hx7-dot.on`  a dot, and the current one
 *   `.hx7-pause`                the pause toggle
 *
 * BEHAVIOUR CONTRACT IS THE PROTOTYPE'S, quoted from its source: "6s auto-advance,
 * dots, pause on hover/focus, explicit pause, reduced-motion = no autoplay". All
 * five are here.
 *
 * WHY DOM MANIPULATION RATHER THAN REACT STATE. Normally this would be a React
 * component holding an index — that is what the earlier Tailwind rebuild did. It
 * cannot be, here: React does not own these nodes. They arrive as one HTML string,
 * so the only handle on them is the DOM itself. Confining that to this file is the
 * trade for keeping the markup byte-identical to the design.
 */

const INTERVAL_MS = 6000;

export function ProtoRotator() {
  useEffect(() => {
    const stages = Array.from(
      document.querySelectorAll<HTMLElement>(".mv-proto .hx7-stage"),
    );
    if (!stages.length) return;

    /* The prototype marks hero slide one's headline as the page `h1` and every
       other slide's as a plain div. That only reads correctly while slide one is
       showing; once the rotation moves on, the `h1` goes `visibility: hidden`
       with its slide and the document is left with no heading level 1. Demoting
       it keeps the page to exactly one `h1` — the always-present, visually
       hidden one `ProtoPage` renders — without touching a pixel, since `role`
       has no rendering effect and the headline is styled by `.hx7-h`. */
    for (const inSlide of document.querySelectorAll<HTMLElement>(
      ".mv-proto .hx7-slide h1",
    )) {
      inSlide.setAttribute("role", "presentation");
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    /* One cleanup list rather than per-stage bookkeeping: a page has at most one
       rotator today, but the markup does not promise that and a leaked interval
       on a route change is invisible until it is not. */
    const teardown: Array<() => void> = [];

    for (const stage of stages) {
      const slides = Array.from(
        stage.querySelectorAll<HTMLElement>(".hx7-slide"),
      );
      if (slides.length < 2) continue;

      /* The hero wraps the stage AND the bar, so the dots and the pause button are
         siblings of the stage, not children of it. */
      const hero = stage.closest<HTMLElement>(".hx7") ?? stage.parentElement;
      const dotsWrap = hero?.querySelector<HTMLElement>(".hx7-dots") ?? null;
      const pauseBtn = hero?.querySelector<HTMLButtonElement>(".hx7-pause") ?? null;

      let index = Math.max(
        0,
        slides.findIndex((s) => s.classList.contains("on")),
      );
      let paused = false;
      let hovering = false;
      let timer: ReturnType<typeof setInterval> | null = null;

      const dots: HTMLButtonElement[] = [];
      const show = (next: number) => {
        index = (next + slides.length) % slides.length;
        slides.forEach((slide, i) => {
          const active = i === index;
          slide.classList.toggle("on", active);
          /* Strictly redundant — the prototype's own `visibility: hidden` already
             takes an inactive slide out of the accessibility tree — but kept
             explicit, because that removal is a side effect of a *visual* rule.
             Anyone swapping it for an opacity or transform fade would silently
             hand a screen reader all seven headlines as one run of text. */
          slide.setAttribute("aria-hidden", active ? "false" : "true");
        });
        dots.forEach((dot, i) => {
          dot.classList.toggle("on", i === index);
          dot.setAttribute("aria-selected", i === index ? "true" : "false");
        });
      };

      const stop = () => {
        if (timer) clearInterval(timer);
        timer = null;
      };
      const start = () => {
        stop();
        if (paused || hovering || reduce) return;
        timer = setInterval(() => show(index + 1), INTERVAL_MS);
      };

      if (dotsWrap) {
        dotsWrap.replaceChildren();
        dotsWrap.setAttribute("role", "tablist");
        slides.forEach((slide, i) => {
          const dot = document.createElement("button");
          dot.type = "button";
          dot.className = "hx7-dot" + (i === index ? " on" : "");
          dot.setAttribute("role", "tab");
          dot.setAttribute("aria-selected", i === index ? "true" : "false");
          /* The dot is a bare circle, so its name has to come from the slide it
             selects — otherwise it announces as "button" seven times. */
          const headline =
            slide.querySelector(".hx7-h")?.textContent?.trim() ?? `${i + 1}`;
          dot.setAttribute("aria-label", `Banner ${i + 1}: ${headline}`);
          dot.addEventListener("click", () => {
            show(i);
            start();
          });
          dotsWrap.appendChild(dot);
          dots.push(dot);
        });
      }

      if (pauseBtn) {
        const sync = () => {
          pauseBtn.setAttribute("aria-pressed", paused ? "true" : "false");
          pauseBtn.setAttribute(
            "aria-label",
            paused ? "Resume the banner rotation" : "Pause the banner rotation",
          );
          pauseBtn.title = paused ? "Play" : "Pause";
          pauseBtn.textContent = paused ? "▶" : "❙❙";
        };
        const onPause = () => {
          paused = !paused;
          sync();
          start();
        };
        pauseBtn.addEventListener("click", onPause);
        sync();
        teardown.push(() => pauseBtn.removeEventListener("click", onPause));
      }

      /* Hover and focus are kept separate from the explicit pause: hovering must
         recover by itself, the button must latch. One flag for both would un-latch
         the button as soon as the pointer left. */
      const enter = () => {
        hovering = true;
        start();
      };
      const leave = () => {
        hovering = false;
        start();
      };
      stage.addEventListener("mouseenter", enter);
      stage.addEventListener("mouseleave", leave);
      stage.addEventListener("focusin", enter);
      stage.addEventListener("focusout", leave);

      show(index);
      start();

      teardown.push(() => {
        stop();
        stage.removeEventListener("mouseenter", enter);
        stage.removeEventListener("mouseleave", leave);
        stage.removeEventListener("focusin", enter);
        stage.removeEventListener("focusout", leave);
      });
    }

    return () => teardown.forEach((fn) => fn());
  }, []);

  return null;
}

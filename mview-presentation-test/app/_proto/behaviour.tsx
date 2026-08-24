"use client";

import { useEffect } from "react";

/**
 * Drives the interactive controls inside the injected prototype markup.
 *
 * Same reason `rotator.tsx` exists: injected HTML never runs its own `<script>`,
 * so the prototype's `onclick="mvProEx('op')"` attributes reference functions that
 * do not exist here. Left alone every one of them throws a ReferenceError on click
 * and the control does nothing — which is how the professionals page's example
 * console switcher and the home page's sources disclosure shipped in the first
 * version of these pages. This file binds real listeners and strips the inline
 * attributes so nothing can throw.
 *
 * WHAT IS AND IS NOT PORTABLE. A prototype handler is only reimplemented here when
 * everything it touches is inside our own markup:
 *
 *   mvProEx          ported — toggles `#proExStack > .aud-face`, all present
 *   mvClaimSources   ported — fills `.claim-src-panel`, present (see CLAIMS below)
 *   mvProExOpen      NOT portable — opens `#proExScrim`, a lightbox that lives in
 *                    the prototype's shell, not in the page section. Scrolls to the
 *                    on-page examples instead; see the note at the call site.
 *   mvLive           NOT portable — swaps the `src` of `#mvLiveFrame`, an iframe
 *                    pointing at the prototype's own `index.html` demo build. There
 *                    is no equivalent, so the anchor keeps its `href` and behaves
 *                    like every other prototype link to a route we do not serve.
 */

/**
 * The four records the sources disclosure lists, lifted from the prototype's
 * `window.PUBLIC_CLAIMS` registry, whose own comment reads: "Every public statistic
 * on this site renders from this registry with a definition, source, and as-of date
 * … Do not add a public number to the site without adding it here first."
 *
 * THESE ARE HARDCODED AND SHOULD NOT STAY THAT WAY. They are figures with as-of
 * dates, so they go stale on their own — they belong behind the content API next to
 * the other page content. They are inlined here only because the disclosure is
 * unreachable without them, and because the numbers and the Railroad Commission
 * attribution are already in the page's own visible copy above the button.
 */
const CLAIMS = [
  {
    value: "1,071,401",
    definition:
      "Texas well records on file (county-roll well records; a well crossing county rolls can appear once per roll, so this is higher than the unique-well count)",
    source: "Mineral View records — Railroad Commission well data load",
    asOf: "2026-07-07",
  },
  {
    value: "68,979",
    definition:
      "Directional surveys on file for the horizontal well population",
    source: "Mineral View records — Railroad Commission well data load",
    asOf: "2026-07-07",
  },
  {
    value: "7.4M",
    definition:
      "Survey stations across the 68,979 directional surveys (7.4 million points)",
    source: "Mineral View records — Railroad Commission well data load",
    asOf: "2026-07-07",
  },
  {
    value: "160 of 254",
    definition:
      "Texas counties in the 2024 county appraisal-roll mineral-owner load (161 of the 254 Texas counties — the only partial layer, growing as county rolls publish; 2025/2026 rolls not yet loaded)",
    source: "Mineral View records — county appraisal rolls, by county",
    asOf: "2026-07-14",
  },
];

export function ProtoBehaviour() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".mv-proto");
    if (!root) return;
    const teardown: Array<() => void> = [];

    /** Bind `fn` to `el`, dropping the inline attribute that would throw first. */
    const bind = (el: Element, fn: (event: Event) => void) => {
      el.removeAttribute("onclick");
      el.addEventListener("click", fn);
      teardown.push(() => el.removeEventListener("click", fn));
    };

    /* ---- professionals: the "Choose an example console" switcher ---------- */
    const faces = Array.from(
      root.querySelectorAll<HTMLElement>("#proExStack > .aud-face"),
    );
    const tabs = Array.from(
      root.querySelectorAll<HTMLButtonElement>("button[data-proex]"),
    );
    if (faces.length && tabs.length) {
      const select = (key: string) => {
        for (const face of faces) {
          face.classList.toggle("on", face.classList.contains(`proex-${key}`));
        }
        for (const tab of tabs) {
          const on = tab.dataset.proex === key;
          tab.classList.toggle("on", on);
          tab.setAttribute("aria-pressed", on ? "true" : "false");
        }
      };
      for (const tab of tabs) {
        bind(tab, () => {
          if (tab.dataset.proex) select(tab.dataset.proex);
        });
      }
    }

    /* ---- professionals: "Explore live examples" --------------------------- */
    const openExamples = root.querySelector('[onclick*="mvProExOpen"]');
    const stack = root.querySelector("#proExStack");
    if (openExamples) {
      if (stack) {
        /* SUBSTITUTED BEHAVIOUR, flagged rather than hidden: the prototype opens a
           full-screen lightpanel that does not exist outside its shell. The button
           says "Explore live examples" and the examples are further down this same
           page, so it scrolls to them. If that is the wrong call, this is the line
           to change — the alternative is a real destination for the demo. */
        bind(openExamples, (event) => {
          event.preventDefault();
          stack.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      } else {
        openExamples.removeAttribute("onclick");
      }
    }

    /* ---- home: the "Sources & as-of dates" disclosure --------------------- */
    const srcBtn = root.querySelector<HTMLElement>(".claim-src-btn");
    const srcPanel = root.querySelector<HTMLElement>(".claim-src-panel");
    if (srcBtn && srcPanel) {
      /* The markup ships the panel hidden with `style="display:none"` and empty,
         because the prototype fills it on first open. Same here, minus the
         `innerHTML`: the rows are built as nodes so the panel cannot become an
         injection point if these strings ever come from the API. */
      if (!srcPanel.childElementCount) {
        for (const claim of CLAIMS) {
          const row = document.createElement("div");
          const strong = document.createElement("strong");
          strong.textContent = claim.value;
          row.append(
            strong,
            document.createTextNode(
              ` — ${claim.definition}. Source: ${claim.source} · as of ${claim.asOf}`,
            ),
          );
          srcPanel.append(row);
        }
      }
      const label = srcBtn.textContent?.replace(/[▾▴]\s*$/, "").trim() ?? "";
      const sync = (open: boolean) => {
        srcPanel.style.display = open ? "" : "none";
        srcBtn.textContent = `${label} ${open ? "▴" : "▾"}`;
        srcBtn.setAttribute("aria-expanded", open ? "true" : "false");
      };
      srcPanel.id ||= "mv-claim-sources";
      srcBtn.setAttribute("aria-controls", srcPanel.id);
      sync(false);
      bind(srcBtn, (event) => {
        event.preventDefault();
        sync(srcPanel.style.display === "none");
      });
    }

    /* ---- anything left over ---------------------------------------------- */
    /* Every remaining inline handler calls a stripped global, so it can only
       throw. Dropping the attribute leaves the control inert instead of noisy —
       `mvLive`'s anchor still follows its `href`, like the rest of the prototype's
       links to routes this app does not serve. */
    for (const el of root.querySelectorAll("[onclick]")) {
      const code = el.getAttribute("onclick") ?? "";
      if (/\bmv[A-Z]\w*\s*\(/.test(code)) el.removeAttribute("onclick");
    }

    return () => teardown.forEach((fn) => fn());
  }, []);

  return null;
}

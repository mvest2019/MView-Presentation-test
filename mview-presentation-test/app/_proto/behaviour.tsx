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
 *   mvPricingSeg     ported — owner/professional plan ladders, minus its hash hop
 *   toggleBilling    ported — monthly/yearly prices
 *   prc2Tip          ported — the 58 tooltips on the pricing table
 *   mvProExOpen      NOT portable — opens `#proExScrim`, a lightbox that lives in
 *                    the prototype's shell, not in the page section. Scrolls to the
 *                    on-page examples instead; see the note at the call site.
 *   mvLive           NOT portable — swaps the `src` of `#mvLiveFrame`, an iframe
 *                    pointing at the prototype's own `index.html` demo build. There
 *                    is no equivalent, so the anchor keeps its `href` and behaves
 *                    like every other prototype link to a route we do not serve.
 *
 * The pricing page renders correctly with none of this: the markup ships the owner
 * ladder visible, `#proPlans` `hidden`, the monthly button `.on` and every yearly
 * price inline-`display:none`. These handlers only move it off that default.
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

    /* ---- pricing: owner / professional plan ladders ----------------------- */
    const segOwner = root.querySelector<HTMLElement>("#prSegOwner");
    const segPro = root.querySelector<HTMLElement>("#prSegPro");
    const ladderOwner = root.querySelector<HTMLElement>("#prLadderOwner");
    const ladderPro = root.querySelector<HTMLElement>("#proPlans");
    if (segOwner && segPro) {
      /* The prototype's own equal-height pass. The plan cards sit in a grid but
         each is its own stacking box, so without this the shortest card's CTA
         floats up and the row of buttons stops being a row. */
      const equaliseCards = () => {
        const cards = Array.from(
          root.querySelectorAll<HTMLElement>(".pr-ladstack .plan"),
        );
        if (!cards.length) return;
        for (const card of cards) card.style.minHeight = "0px";
        const tallest = cards.reduce((max, c) => Math.max(max, c.offsetHeight), 0);
        for (const card of cards) card.style.minHeight = `${tallest}px`;
      };

      const showSegment = (pro: boolean) => {
        segOwner.classList.toggle("on", !pro);
        segPro.classList.toggle("on", pro);
        segOwner.setAttribute("aria-pressed", String(!pro));
        segPro.setAttribute("aria-pressed", String(pro));
        /* `hidden` rather than a class, because that is what the markup ships
           on `#proPlans` — matching it keeps one mechanism instead of two. */
        if (ladderOwner) ladderOwner.hidden = pro;
        if (ladderPro) ladderPro.hidden = !pro;
        equaliseCards();
      };

      /* The prototype navigates to `#/pricing?seg=pro` and lets its router call
         the sync function back. We switch in place: the hash means nothing to our
         router, and writing one would leave a stray fragment in the URL that
         survives into shared links. The visible result is identical.

         WHAT IS DROPPED with the hash hop: the prototype also rewrites
         `document.title` per segment ("Owner pricing" / "Professional pricing").
         Next owns the title through `metadata`, so fighting it from a click
         handler would desynchronise the two. The page keeps one stable title. */
      bind(segOwner, () => showSegment(false));
      bind(segPro, () => showSegment(true));

      equaliseCards();
      const onResize = () => equaliseCards();
      window.addEventListener("resize", onResize);
      teardown.push(() => window.removeEventListener("resize", onResize));
    }

    /* ---- pricing: monthly / yearly ---------------------------------------- */
    const billingButtons = Array.from(
      root.querySelectorAll<HTMLButtonElement>(".pricing-tgl button[data-mode]"),
    );
    if (billingButtons.length) {
      const showMode = (mode: string) => {
        for (const button of billingButtons) {
          const on = button.dataset.mode === mode;
          button.classList.toggle("on", on);
          /* The markup gives these no `aria-pressed`, so the only signal that a
             period is selected is the fill colour. Adding it is the one thing
             here that is not a straight port. */
          button.setAttribute("aria-pressed", on ? "true" : "false");
        }
        for (const price of root.querySelectorAll<HTMLElement>(".pricing-price")) {
          for (const part of price.querySelectorAll<HTMLElement>("[data-show]")) {
            part.style.display = part.dataset.show === mode ? "" : "none";
          }
        }
      };
      for (const button of billingButtons) {
        bind(button, () => {
          if (button.dataset.mode) showMode(button.dataset.mode);
        });
      }
      const current = billingButtons.find((b) => b.classList.contains("on"));
      if (current?.dataset.mode) showMode(current.dataset.mode);
    }

    /* ---- pricing: the feature tooltips ------------------------------------ */
    const tips = Array.from(root.querySelectorAll<HTMLElement>(".prc2-tip"));
    if (tips.length) {
      const closeAll = () => {
        for (const tip of tips) {
          tip.classList.remove("open");
          tip.querySelector(".prc2-i")?.setAttribute("aria-expanded", "false");
        }
      };
      for (const tip of tips) {
        const button = tip.querySelector<HTMLElement>(".prc2-i");
        if (!button) continue;
        button.setAttribute("aria-expanded", "false");
        /* Two of these tooltips sit INSIDE the segment buttons ("Mineral owners
           (i)" / "Professionals (i)"). The prototype stops propagation on every
           tooltip, which turns that 17x17 icon into a dead zone in the middle of
           a tab — a click lands on it, the tooltip opens and the tab does not
           switch. It reads as a broken tab, and it is only 2.4% of the pill, so
           it is easy to hit by accident and hard to diagnose.

           So propagation is only stopped when the tooltip is standalone. Inside a
           button the click continues to that button's own handler: the tab
           switches AND the explanation opens, which is what someone clicking an
           info icon labelled "Who professional plans are for" wants. */
        /* Starting from the PARENT: a feature tooltip's own `.prc2-i` is itself a
           `<button>`, so `closest` from the element would always match and every
           tooltip would leak its click. The segment ones are a `<span>` nested in
           the tab button, which is the case this is looking for. */
        const insideControl =
          button.parentElement?.closest("button") != null;
        bind(button, (event) => {
          event.preventDefault();
          if (!insideControl) event.stopPropagation();
          const wasOpen = tip.classList.contains("open");
          closeAll(); // one at a time, as the prototype does
          if (!wasOpen) {
            tip.classList.add("open");
            button.setAttribute("aria-expanded", "true");
          }
        });
      }
      /* Dismissal the prototype leaves to a document click. Escape is added:
         these open on a keyboard-reachable button, so there has to be a way back
         out without a pointer. */
      const onDocClick = (event: Event) => {
        if (!(event.target as Element | null)?.closest?.(".prc2-tip")) closeAll();
      };
      const onKey = (event: KeyboardEvent) => {
        if (event.key === "Escape") closeAll();
      };
      document.addEventListener("click", onDocClick);
      document.addEventListener("keydown", onKey);
      teardown.push(() => {
        document.removeEventListener("click", onDocClick);
        document.removeEventListener("keydown", onKey);
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

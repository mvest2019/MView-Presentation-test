'use client';
/**
 * ARRIVE AT THE CARD THAT WAS ASKED FOR, NOT AT THE TOP OF THE PAGE.
 *
 * ── THE JOURNEY THIS IS FOR ──
 *
 * The Alerts header's "Alert preferences" points at
 * `/mineralownersite/settings#settings-alert-preferences`, and the Alert
 * preferences card is about 2,400px down a long two-column page. Arriving at
 * the top of Settings instead of at that card is indistinguishable, to the
 * reader, from the card not being there — which is how defect #27's second
 * half reads: "on alerts preference needed to show preference card properly".
 *
 * ── WHY IT CAN MISS, AND WHY THIS FILE APPEARED WITH `loading.tsx` ──
 *
 * A FULL PAGE LOAD is fine: the HTML carries the card, the browser resolves
 * the fragment itself, and it lands (measured: scrollY 2442, card top 2539).
 *
 * A CLIENT NAVIGATION is the one at risk, and it got riskier the moment this
 * route group grew a `loading.tsx`. That file adds a Suspense boundary so the
 * navigation can commit immediately and show a skeleton — which is the fix for
 * the FIRST half of #27 — but it also means the router runs its scroll
 * restoration while the fallback is on screen and `#settings-alert-preferences`
 * does not exist yet. There is nothing to scroll to, so nothing scrolls, and
 * when the content streams in the reader is at the top.
 *
 * ── WHAT IT DOES ──
 *
 * Waits for the element the URL names and scrolls to it once it exists. It
 * does NOT fight a scroll that already worked: if the page is already anywhere
 * but the very top, the browser or the router has handled it and this stands
 * down. That check is what keeps it from stealing a reader's position when
 * they navigate within Settings, or when they come back to it.
 *
 * It WATCHES for the element with a `MutationObserver` rather than polling on
 * a frame budget: this route can take the better part of twenty seconds to
 * stream on a cold read, and a two-second poll gave up long before the card
 * arrived. A thirty-second ceiling is the backstop for a fragment that names
 * nothing at all, not the normal path.
 *
 * `scroll-margin-top` on the card (96px, from `scroll-mt-24` plus the route's
 * own rule) is what keeps the heading clear of the sticky top bar, so this only
 * has to ask for the element and the stylesheet places it.
 */
import { useEffect } from 'react';

/**
 * How long to keep waiting for the named section before giving up.
 *
 * MEASURED, and the first version got it wrong: it polled for 120 animation
 * frames — about two seconds — which is a sensible budget for a page that is
 * already rendered and a useless one here. This route awaits the owner record
 * and, on a cold read, the card did not exist for the better part of twenty
 * seconds; the poll had long since given up and the reader was left at the top
 * with the fragment still in the URL.
 *
 * So it WATCHES rather than polls on a frame budget, and the ceiling is sized
 * for the SLOWEST honest case rather than the typical one: a cold development
 * read of this route was measured at just over thirty seconds, which a
 * thirty-second ceiling lost by a hair. A minute is not a promise that the page
 * will take a minute — the watcher stops the instant the card lands, and on a
 * warm production read that is immediate. It is only the point past which a
 * fragment is treated as naming nothing, so the interval cannot run forever.
 */
const GIVE_UP_MS = 60_000;

/** the backstop tick — see the observer set-up below for why there is one */
const POLL_MS = 250;

export function SettingsHashTarget() {
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id) return;

    let done = false;
    let obs: MutationObserver | null = null;
    let timer = 0;
    let poll = 0;

    const stop = () => {
      done = true;
      obs?.disconnect();
      window.clearTimeout(timer);
      window.clearInterval(poll);
      window.removeEventListener('scroll', onScroll);
    };

    /* THE READER'S OWN SCROLL WINS. Once they have moved the page themselves,
       jumping them to a fragment they have visibly scrolled away from is worse
       than never having jumped at all. */
    function onScroll() {
      if (window.scrollY > 4) stop();
    }

    const tryScroll = () => {
      if (done) return;
      /* somebody already got there — the browser on a full load, the router on
         a navigation where the element happened to exist */
      if (window.scrollY > 4) { stop(); return; }

      const el = document.getElementById(id);
      if (!el) return;

      /* THE ELEMENT EXISTS BEFORE IT HAS A POSITION, and that caught this out.
         While the route is streaming, the real tree is in the document with a
         `display: none` parent — so `getElementById` finds the card, its box is
         0x0 at (0, 0), `scrollIntoView` scrolls to the top (a no-op, the page
         is already there) and this stood down believing it had arrived. The
         reader then watched the content appear beneath them, at the top.

         A zero box means "not laid out yet", not "at the top of the page": the
         card is 885px tall once it is real. So keep watching until it has a
         height, and the observer will fire again the moment the swap lands. */
      if (!el.getBoundingClientRect().height) return;

      /* `instant`, AND THAT KEYWORD SPECIFICALLY.
         `behavior: 'auto'` does not mean "jump" — it means "defer to CSS", and
         this app sets `scroll-smooth` on <html>. Measured on the real page: the
         card 886px tall, `scrollIntoView({behavior:'auto'})`, and `scrollY`
         still 0 a second and a half later — the smooth scroll never landed,
         because the page is still streaming under it and the animation is
         abandoned. The same call with `instant` put `scrollY` at 2446 and the
         card's top at exactly 96px, which is its `scroll-margin-top` clearing
         the sticky bar.

         An arrival should not animate anyway: the reader asked for a section,
         not for 2,400px of scenery. */
      el.scrollIntoView({ behavior: 'instant', block: 'start' });
      stop();
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    tryScroll();

    if (!done) {
      /* BOTH, AND THE POLL IS THE ONE THAT ACTUALLY FIRES. A `MutationObserver`
         is the right instrument for content being inserted, and it catches the
         streamed tree arriving. It does NOT catch the last step: Next reveals
         the finished route by clearing `display:none` on a wrapper, which is an
         attribute change on an element this observer's `childList` never looks
         at — measured, the card went from a 0x0 box to 888px tall and nothing
         fired. `attributes` closes that gap and the interval is the backstop
         for whatever the next framework version does instead.

         A quarter-second tick for at most thirty seconds, stopped the moment it
         lands, is not a cost worth optimising against a jump that silently
         fails to happen. */
      obs = new MutationObserver(tryScroll);
      obs.observe(document.body, {
        childList: true, subtree: true, attributes: true,
        attributeFilter: ['style', 'hidden', 'class'],
      });
      poll = window.setInterval(tryScroll, POLL_MS);
      timer = window.setTimeout(stop, GIVE_UP_MS);
    }

    return stop;
  }, []);

  return null;
}

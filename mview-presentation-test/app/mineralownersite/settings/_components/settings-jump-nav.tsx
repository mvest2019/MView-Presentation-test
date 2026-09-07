import { portalButtonClass } from "../../_components/ui/button";
import { JUMP_ORDER, SETTINGS_SECTIONS } from "../_lib/settings-data";

/**
 * THE SECTION MAP  (v33 · H18/H19)
 *
 * Settings is one long page, and the design's answer to that is a row of chips
 * across the top that jump to each group rather than a second column of
 * navigation or a set of accordions. The reader keeps one scrollable page — so
 * ⌘F still finds everything — and gets a way to skip to the part they came for.
 *
 * ── PLAIN ANCHOR LINKS, AND NO JAVASCRIPT AT ALL ──
 *
 * The prototype's chips were buttons calling `v33SettingsJump('Your view')`,
 * which searched every card heading for that substring and scrolled to the
 * first match. Here they are `<a href="#settings-view">` and the browser does
 * it: no client component, no text matching, no chip that silently stops
 * working when its heading is reworded. `SettingsCard` draws the design's
 * arrival outline with the CSS `:target` selector.
 *
 * ── IT IS A `<nav>`, WITH A NAME ──
 *
 * Seven links that move within the page are navigation, and labelling the
 * landmark is what lets a screen-reader user jump to it or skip past it. The
 * design's own markup said `role="navigation" aria-label="Settings sections"`;
 * a real `<nav>` element carries that role natively.
 *
 * `hide-u`: at Ultra the page is one card, so a map of eleven sections would be
 * a map of a page that is not there.
 */
export function SettingsJumpNav() {
  return (
    <nav
      aria-label="Settings sections"
      className="hide-u mb-3.5 flex flex-wrap items-center gap-[7px]"
    >
      <span className="self-center text-[11px] font-bold text-mv-muted">
        Jump to:
      </span>
      {JUMP_ORDER.map((key) => {
        const section = SETTINGS_SECTIONS[key];
        return (
          <a
            key={section.id}
            href={`#${section.id}`}
            className={portalButtonClass({ variant: "ghost", size: "sm" })}
          >
            {section.chip}
          </a>
        );
      })}
    </nav>
  );
}

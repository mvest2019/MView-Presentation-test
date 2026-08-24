import "./proto.css";

import { ProtoBehaviour } from "./behaviour";
import { ProtoRotator } from "./rotator";

/**
 * Renders one of the prototype's marketing pages as the document wrote it.
 *
 * USED BY `/`, `/owners` AND `/professionals` ONLY, and deliberately not the
 * pattern for anything else. Every other page in this app is composed from
 * `mv-*` utilities and real components; these three carry the prototype's own HTML
 * and CSS because the design was to be taken "as it is". Read `markup.ts` for what
 * that trades away.
 *
 * `dangerouslySetInnerHTML` IS SAFE HERE, and it is worth being precise about why
 * rather than waving at it: the string is a build-time constant compiled into the
 * bundle from a file in the repo. No request, no user input and no CMS touches it,
 * so there is no injection path — the markup is exactly as trustworthy as the JSX
 * beside it. It would NOT be safe the moment any of it came from an API.
 *
 * WHAT IS LOST, so nobody discovers it later: no `next/image` (the prototype's
 * `<img>` tags stand, with its own Cloudinary transforms and `loading="lazy"`), and
 * no `next/link` (plain `<a href>`, so in-app navigation is a full page load rather
 * than a client transition). Both follow from holding the markup as a string.
 */
export function ProtoPage({
  markup,
  heading,
}: {
  markup: string;
  /**
   * The page's level-one heading, rendered for assistive tech only — omit it on
   * a page whose own markup already has a real one.
   *
   * NOT a design change; it has no visual effect whatsoever. It exists because
   * two of these three pages have no usable `h1`. `/owners` has none at all. On
   * `/` the only `h1` is the headline of hero slide one, so the rotator hides it
   * (`visibility: hidden`) the moment it advances and five sixths of the time the
   * document offered no heading level 1 — a rotating banner headline cannot be
   * the page heading, since it is neither stable nor always present, so it is
   * demoted to presentational in `rotator.tsx` and stated here instead.
   *
   * `/professionals` passes nothing: its `h1` is a standalone `.hero-h1` in the
   * block *below* the hero, always visible, and already correct.
   */
  heading?: string;
}) {
  return (
    <>
      {heading ? <h1 className="sr-only">{heading}</h1> : null}
      {/*
        `.mv-proto` is the scope every extracted rule hangs off — see the header in
        `proto.css`. Without this class on the wrapper the page renders unstyled,
        which is the first thing to check if one of these pages ever looks like raw
        HTML.
      */}
      <div className="mv-proto" dangerouslySetInnerHTML={{ __html: markup }} />
      <ProtoRotator />
      <ProtoBehaviour />
    </>
  );
}

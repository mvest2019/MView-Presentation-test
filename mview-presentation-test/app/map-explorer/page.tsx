import type { Metadata } from "next";

import { MapFeatureGuide } from "./_components/map-feature-guide";

/*
 * THE MAP'S LANDING PAGE — `/map-explorer`.
 *
 * What the map holds and what you can do with it, ending on the ask to
 * register. This address used to serve two pages off one session check: the
 * guide when signed out, the map itself when signed in. The map moved to
 * `/mineralownersite/map`, where the owner site's sidebar and phone tab bar
 * already had a row waiting for it, and this route kept the guide — for
 * everyone, signed in or not.
 *
 * SO THERE IS NO SESSION READ LEFT HERE, and that is the point of the change:
 * one URL is one page. It also means this page is static and public, which the
 * marketing links pointing at it have always assumed — every "About the Map"
 * CTA in `_proto/markup.ts` and the `Map` slot in the top bar come here, and
 * none of them wanted to land a visitor on a map.
 *
 * `MapFeatureGuide` and the CTA blocks it renders stay in this route's
 * `_components/`: they are this page, not part of the map. Everything the map
 * itself needs moved to `/mineralownersite/map/_components/`.
 */

export const metadata: Metadata = {
  title: "The Map — Mineral View",
  description:
    "See what the Mineral View map shows — wells, permits, ownership and production, on one interactive map.",
};

export default function MapLanding() {
  /* No `onBack`: there is no map behind this one to return to. */
  return <MapFeatureGuide />;
}

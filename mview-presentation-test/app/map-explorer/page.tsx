import type { Metadata } from "next";

import { getSessionUser } from "@/lib/session";

import { MapExplorerView } from "./_components/map-explorer-view";
import { MapFeatureGuide } from "./_components/map-feature-guide";

/*
 * The map explorer, built to the mock: Esri terrain basemap, well-count
 * bubbles, and the toolbar / edge tabs / readout floating over it.
 *
 * One URL, two pages. Signed in, it is the map itself, sized to the viewport
 * minus the 64px sticky header so it fills the screen the way an app surface
 * should. Signed out, the same address serves the feature guide — what the map
 * holds and what you can do with it — which ends on the ask to register.
 *
 * The check is here rather than in middleware or on the client: the session
 * cookie is httpOnly and only readable on the server, and deciding it in the
 * page means the right one is rendered on the first response instead of the
 * map flashing up and being replaced.
 */

export const metadata: Metadata = {
  title: "Map — Mineral View",
  description:
    "Explore mineral ownership, wells and permits on the Mineral View map.",
};

export default async function MapExplorer() {
  const user = await getSessionUser();

  /* No `onBack`: there is no map behind this one to return to. */
  if (!user) return <MapFeatureGuide />;

  return (
    <div className="h-[calc(100dvh-64px)] w-full">
      <MapExplorerView />
    </div>
  );
}

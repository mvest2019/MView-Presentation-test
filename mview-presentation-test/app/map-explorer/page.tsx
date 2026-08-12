import type { Metadata } from "next";

import { MapExplorerView } from "./_components/map-explorer-view";

/*
 * The map explorer, built to the mock: Esri terrain basemap, well-count
 * bubbles, and the toolbar / edge tabs / readout floating over it.
 *
 * The height is the viewport minus the 64px sticky header, so the map fills the
 * screen the way an app surface should rather than sitting in the marketing
 * page's content column.
 */

export const metadata: Metadata = {
  title: "Map — Mineral View",
  description:
    "Explore mineral ownership, wells and permits on the Mineral View map.",
};

export default function MapExplorer() {
  return (
    <div className="h-[calc(100dvh-64px)] w-full">
      <MapExplorerView />
    </div>
  );
}

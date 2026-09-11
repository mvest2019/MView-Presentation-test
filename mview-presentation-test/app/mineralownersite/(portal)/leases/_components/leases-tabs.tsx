"use client";

import type { ReactNode } from "react";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../_components/ui/tabs";

/**
 * THE THREE-TAB STRIP — My Leases, Financials, Monthly Reports.
 *
 * A CLIENT SHELL THAT TAKES ITS PANELS AS NODES. Only the strip itself needs to
 * be interactive; the panels are built by the server page and handed in as
 * children, so putting a `"use client"` boundary here does not drag their
 * markup into the bundle. Rendering them inside this file instead would.
 *
 * WHICH TAB IS OPEN IS A URL FACT, not component state — `?ltab=fin` opens the
 * Financials. The page resolves it and passes `defaultTab`, which makes a tab
 * linkable from elsewhere in the portal and survives a reload.
 *
 * See `ui/tabs.tsx` for why this is Radix rather than three buttons and a
 * `useState`, and why every panel stays mounted.
 */

export type LeaseTab = "main" | "fin" | "mon";

export function LeasesTabs({
  defaultTab,
  leases,
  financials,
  statements,
}: {
  defaultTab: LeaseTab;
  leases: ReactNode;
  financials: ReactNode;
  statements: ReactNode;
}) {
  return (
    <Tabs defaultValue={defaultTab}>
      <TabsList className="mb-3.5">
        <TabsTrigger value="main">My Leases</TabsTrigger>
        <TabsTrigger value="fin">Financials</TabsTrigger>
        <TabsTrigger value="mon">Monthly Reports</TabsTrigger>
      </TabsList>

      <TabsContent value="main">{leases}</TabsContent>
      <TabsContent value="fin">{financials}</TabsContent>
      <TabsContent value="mon">{statements}</TabsContent>
    </Tabs>
  );
}

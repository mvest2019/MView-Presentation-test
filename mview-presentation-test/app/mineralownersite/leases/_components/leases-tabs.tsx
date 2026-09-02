"use client";

import type { ReactNode } from "react";

import { gates } from "../../_components/ui/portal-gating";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../_components/ui/tabs";
import type { LeaseRecord } from "../_lib/lease-types";
import { LeaseListPanel } from "./list/lease-list-panel";

/**
 * THE THREE TABS — My Leases · Financials · Monthly Reports.
 *
 * ── WHY THE PANELS ARE PASSED AS CHILDREN, NOT IMPORTED BY THE PAGE ──
 *
 * `FinancialsPanel` and `StatementsPanel` are server components; this file is a
 * client component because Radix Tabs needs state. A client component may
 * RENDER a server component's output when it arrives as a prop or a child, but
 * it may not import one — the import would drag both into the client bundle.
 *
 * So the two static panels come through as `financials` and `statements` props
 * (rendered on the server, handed here as ready-made trees), while
 * `LeaseListPanel` is itself a client component and can be imported directly.
 * The result is that the tab mechanism ships to the browser and the two panels
 * of tables and SVG do not.
 *
 * ── DEEP LINKS ──
 *
 * `defaultTab` comes from the page's `?ltab=` search param, so a link to
 * `?ltab=fin` opens on Financials — the contract the prototype's own deep links
 * used. `defaultValue` and not `value`: the URL seeds the first render and the
 * reader's clicks take over from there, which is what makes switching instant
 * instead of a navigation.
 *
 * ── THE STRIP IS `hide-s` ──
 *
 * Essentials shows the plain-English card instead of any of this, so the tab
 * strip would be three buttons leading to three empty pages in that tier.
 */

export type LeaseTab = "main" | "fin" | "mon";

export const leaseTabs: { value: LeaseTab; label: string }[] = [
  { value: "main", label: "My Leases" },
  { value: "fin", label: "Financials" },
  { value: "mon", label: "Monthly Reports" },
];

export function LeasesTabs({
  leases,
  defaultTab,
  financials,
  statements,
}: {
  leases: LeaseRecord[];
  defaultTab: LeaseTab;
  financials: ReactNode;
  statements: ReactNode;
}) {
  return (
    <Tabs defaultValue={defaultTab}>
      <TabsList className={`mb-[18px] ${gates("hideInEssentials")}`}>
        {leaseTabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {/* The list panel keeps its own `hide-s` internally rather than taking it
          here: its toolbar and table are Essentials-hidden, but the panel is the
          tab that Essentials readers land on, so the panel element itself must
          not disappear. */}
      <TabsContent value="main">
        <LeaseListPanel leases={leases} />
      </TabsContent>

      <TabsContent value="fin" className={gates("hideInEssentials")}>
        {financials}
      </TabsContent>

      <TabsContent value="mon" className={gates("hideInEssentials")}>
        {statements}
      </TabsContent>
    </Tabs>
  );
}

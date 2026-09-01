"use client";

import { Fragment } from "react";

import { PortalNavRow } from "./portal-nav-row";
import {
  isNavItemActive,
  navSections,
  type PortalNavSection,
} from "../_lib/portal-nav";

/**
 * The labelled nav sections, shared by the sidebar and the mobile drawer.
 *
 * SHARED RATHER THAN REPEATED because the drawer MIRRORS the sidebar (v33 ·
 * A/mobile) — same sections, same labels, same order. It was one
 * undifferentiated list before that pass, and two copies of this list would let
 * the two drift back apart. The drawer's extra Account section is passed in
 * rather than special-cased here.
 *
 * `.navsec` is the design's heading class: 10.5px, uppercase, wide tracking,
 * with the padding that gives the sidebar its hierarchy — the headings are what
 * turn eleven rows into three groups a reader can scan.
 */
export function PortalSectionList({
  pathname,
  sections = navSections,
  onNavigate,
}: {
  pathname: string;
  sections?: PortalNavSection[];
  /** The drawer closes on navigation; the sidebar passes nothing. */
  onNavigate?: () => void;
}) {
  return (
    <>
      {sections.map((section) => (
        // A Fragment, not a wrapper element: the sidebar and drawer are flex
        // columns whose `gap` has to apply between the ROWS. A real element
        // here would collapse each section into one flex item.
        <Fragment key={section.heading}>
          <div className="navsec">{section.heading}</div>
          {section.items.map((item) => (
            <PortalNavRow
              key={item.navKey}
              item={item}
              active={isNavItemActive(item.href, pathname)}
              onNavigate={onNavigate}
            />
          ))}
        </Fragment>
      ))}
    </>
  );
}

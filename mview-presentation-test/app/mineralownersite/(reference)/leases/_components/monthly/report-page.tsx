import type { ReactNode } from "react";

import { Badge } from "../../../../_components/ui/badge";
import { Card } from "../../../../_components/ui/card";

/**
 * ONE PAGE OF THE MONTHLY REPORT.
 *
 * Twelve sections share this frame — the page number, the title, an optional
 * chip stating the page's scope, a rule, and a one-line lead that says what the
 * page is for before any figure appears. It is a component rather than a
 * pattern repeated twelve times because the report reads as a document, and a
 * document whose headings drift in size or spacing stops reading as one.
 *
 * `id` IS THE JUMP TARGET for the chips at the top, and `scroll-mt` is why a
 * jump does not land under the portal's sticky bars — without it the heading
 * the reader asked for is the one thing hidden behind the chrome.
 */
export function ReportPageCard({
  number,
  id,
  title,
  chip,
  lead,
  children,
}: {
  number: number;
  id: string;
  title: string;
  /** The page's scope — "10 leases", "published settlements". */
  chip?: string;
  lead: string;
  children: ReactNode;
}) {
  return (
    <Card
      id={id}
      padded={false}
      className="mt-4 scroll-mt-28 px-[22px] py-[18px]"
    >
      <div className="flex flex-wrap items-center gap-3 border-b border-mv-line pb-3">
        <span className="text-[10.5px] font-bold tracking-[0.12em] text-mv-muted uppercase">
          Page {number}
        </span>
        <h3 className="text-[19px] font-bold">{title}</h3>
        {chip && (
          <Badge tone="slate" size="xs">
            {chip}
          </Badge>
        )}
      </div>

      <p className="mt-3 text-[13px] text-mv-slate">{lead}</p>

      {children}
    </Card>
  );
}

/**
 * The small-caps green heading the report uses inside a page — "PORTFOLIO",
 * "THIS MONTH", "What the month says".
 */
export function ReportHeading({ children }: { children: ReactNode }) {
  return (
    <h4 className="text-[11px] font-bold tracking-[0.1em] text-mv-green-deep uppercase">
      {children}
    </h4>
  );
}

/**
 * The report's bullet list. 13px, generous leading, and no marker colour of its
 * own — these carry sentences, not labels, and a coloured bullet in front of a
 * three-line sentence reads as emphasis the sentence has not earned.
 */
export function ReportList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="mt-2 list-disc space-y-2 pl-5 text-[13px] leading-[1.6] text-mv-slate">
      {items.map((item, position) => (
        <li key={position}>{item}</li>
      ))}
    </ul>
  );
}

/**
 * The caveat line each page ends on. Smaller and grey: it qualifies the page
 * without competing with it, which is the whole job of a footnote.
 */
export function ReportFootnote({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 text-[11.5px] leading-[1.55] text-mv-muted">{children}</p>
  );
}

/**
 * The label/value table the report uses inside a lease or an operator block.
 *
 * A `<dl>` rather than a `<table>`: these are properties of one thing, not rows
 * of comparable records, and a screen reader announces the pairing correctly.
 */
export function ReportFacts({
  rows,
}: {
  rows: { label: string; value: ReactNode }[];
}) {
  return (
    <dl className="overflow-hidden rounded-[10px] border border-mv-line">
      {rows.map((row, position) => (
        <div
          key={row.label}
          className={`grid grid-cols-[minmax(120px,38%)_1fr] gap-3 px-3 py-2 text-[12.5px] ${
            position % 2 === 0 ? "bg-mv-portal-wash/40" : "bg-mv-card"
          }`}
        >
          <dt className="font-bold tracking-[0.05em] text-mv-muted uppercase">
            {row.label}
          </dt>
          <dd className="text-mv-slate">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

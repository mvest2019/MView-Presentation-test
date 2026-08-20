/**
 * The wire shape for the presentation library.
 *
 * A types-only module so both halves can share it: `operator-presentations-api.ts`
 * is `server-only` and must never reach the browser, while the page that renders
 * these records is a client component.
 */
export interface PresentationRecord {
  id: string;
  /** The regulator's filed name, upper case, as the endpoint sends it. */
  operatorName: string;
  operatorNumber: string;
  /** Same-origin logo path, or null when the record has none. */
  logoUrl: string | null;
  /** The operator's investor-relations page, or null. */
  website: string | null;
  title: string;
  /** `MM/DD/YYYY`, exactly as filed. */
  publishedDate: string;
  summary: string;
  /** Where the deck itself lives, or null. */
  presentationUrl: string | null;
}

export interface PresentationsResult {
  records: PresentationRecord[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

/**
 * The pager's button layout — `1 … 4 5 6 … 32`.
 *
 * ITS OWN MODULE BECAUSE THE CLIENT NEEDS IT. The identical function lives in
 * `operator-presentations.ts`, but that module imports the fixture library, so a
 * client component importing it would pull every fixture record into the browser
 * bundle to use twenty lines of arithmetic. This file has no imports at all.
 *
 * `null` marks an ellipsis. Seven pages or fewer are listed in full; beyond that the
 * first, last and the current page's neighbours are shown, which keeps the control a
 * fixed width however deep the library gets.
 */
export function pageButtons(
  page: number,
  totalPages: number,
): (number | null)[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const buttons: (number | null)[] = [1];
  if (page > 3) buttons.push(null);
  for (
    let candidate = Math.max(2, page - 1);
    candidate <= Math.min(totalPages - 1, page + 1);
    candidate += 1
  ) {
    buttons.push(candidate);
  }
  if (page < totalPages - 2) buttons.push(null);
  buttons.push(totalPages);
  return buttons;
}

/**
 * `11/06/2025` → `Q4 2025`.
 *
 * DERIVED, NOT INVENTED. The endpoint sends a published date and no reporting
 * period, and the quarter follows arithmetically from the month — unlike the
 * document type and county list the old fixture carried, which have no source in
 * this response and are simply not rendered any more.
 */
export function quarterLabel(publishedDate: string): string {
  const match = /^(\d{2})\/\d{2}\/(\d{4})$/.exec(publishedDate.trim());
  if (!match) return "";
  const month = Number(match[1]);
  if (month < 1 || month > 12) return "";
  return `Q${Math.floor((month - 1) / 3) + 1} ${match[2]}`;
}

/** `11/06/2025` → `Nov 6, 2025`. Falls back to the raw string it was given. */
export function publishedLabel(publishedDate: string): string {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(publishedDate.trim());
  if (!match) return publishedDate;
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const name = months[Number(match[1]) - 1];
  if (!name) return publishedDate;
  return `${name} ${Number(match[2])}, ${match[3]}`;
}

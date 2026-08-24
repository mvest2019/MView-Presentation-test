/**
 * Display casing for values that arrive SHOUTING from the operator API.
 *
 * County and lease names come back upper-cased (`DE WITT`, `TOM GREEN`), which is how
 * the RRC stores them and not how the design prints them. This lives on its own, with
 * no imports, for one reason: the client components that need it must not pull a
 * server-side module in behind it. `lib/operator-detail.ts` re-exports this so the
 * existing server-side callers keep working unchanged, but anything marked
 * `"use client"` should import from here — importing it from `operator-detail` drags
 * that module's fixture tables into the browser bundle for the sake of four lines.
 */
export function titleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b[a-z]/g, (character) => character.toUpperCase());
}

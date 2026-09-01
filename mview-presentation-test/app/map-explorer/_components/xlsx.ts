/*
 * A formatted spreadsheet, written by hand.
 *
 * CSV cannot carry a column width, a bold heading or a thousands separator,
 * so a file of six-figure well counts opened as a wall of narrow columns and
 * raw digits — and Excel warned about losing what little was there every time
 * it was saved. This writes the real thing instead: one sheet, a frozen
 * heading, columns wide enough for what is under them, and numbers formatted
 * as numbers.
 *
 * Only the parts a single-sheet workbook needs. Strings are written inline
 * rather than pooled — a shared-strings table saves bytes on a file nobody is
 * emailing, at the cost of a second part to keep in step.
 */

import { zip, type ZipEntry } from "./zip";

/** How a column's cells are written, which decides their format. */
export type ColumnFormat =
  /** Left as text, whatever it looks like. */
  | "text"
  /** A whole number, with thousands separators. */
  | "integer"
  /** A coordinate: five decimals, always shown. */
  | "coordinate";

export type SheetColumn = {
  head: string;
  /** Width in characters. Roughly the number of digits that fit. */
  width: number;
  format?: ColumnFormat;
  /** Wraps long text instead of letting it run under the next column. */
  wrap?: boolean;
};

export type CellValue = string | number | null | undefined;

/* The style ids written into `styles.xml` below, in the order they appear
   there. Kept as names so the sheet writer does not deal in indices. */
const STYLE = {
  text: 0,
  head: 1,
  integer: 2,
  coordinate: 3,
  wrapped: 4,
} as const;

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** The A1-style reference for a cell, given its zero-based position. */
function ref(row: number, column: number): string {
  let name = "";
  let index = column;
  do {
    name = String.fromCharCode(65 + (index % 26)) + name;
    index = Math.floor(index / 26) - 1;
  } while (index >= 0);
  return `${name}${row + 1}`;
}

function bodyStyle(column: SheetColumn): number {
  if (column.format === "integer") return STYLE.integer;
  if (column.format === "coordinate") return STYLE.coordinate;
  return column.wrap ? STYLE.wrapped : STYLE.text;
}

function cellXml(
  address: string,
  value: CellValue,
  style: number,
  numeric: boolean,
): string {
  if (value === null || value === undefined || value === "") {
    return `<c r="${address}" s="${style}"/>`;
  }

  /* A number that arrived as a string stays a string: the well counts are
     numbers and should sort and total as numbers, but an API number like
     42-003-01234 must not be coerced into anything. */
  if (numeric && typeof value === "number" && Number.isFinite(value)) {
    return `<c r="${address}" s="${style}"><v>${value}</v></c>`;
  }

  return `<c r="${address}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(
    String(value),
  )}</t></is></c>`;
}

function sheetXml(columns: SheetColumn[], rows: CellValue[][]): string {
  const widths = columns
    .map(
      (column, index) =>
        `<col min="${index + 1}" max="${index + 1}" width="${
          column.width
        }" customWidth="1"/>`,
    )
    .join("");

  const head = `<row r="1" ht="20" customHeight="1">${columns
    .map((column, index) =>
      cellXml(ref(0, index), column.head, STYLE.head, false),
    )
    .join("")}</row>`;

  const body = rows
    .map((row, rowIndex) => {
      const cells = columns
        .map((column, index) =>
          cellXml(
            ref(rowIndex + 1, index),
            row[index],
            bodyStyle(column),
            column.format === "integer" || column.format === "coordinate",
          ),
        )
        .join("");
      return `<row r="${rowIndex + 2}">${cells}</row>`;
    })
    .join("");

  const last = ref(rows.length, Math.max(columns.length - 1, 0));

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetPr><outlinePr summaryBelow="0"/></sheetPr><dimension ref="A1:${last}"/><sheetViews><sheetView workbookViewId="0" showGridLines="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols>${widths}</cols><sheetData>${head}${body}</sheetData><autoFilter ref="A1:${last}"/></worksheet>`;
}

/* The five formats every sheet here uses. 164 is the first id a file may
   define for itself; 165 is the thousands separator, pinned to en-US because
   Excel's own "#,##0" groups by the reader's locale — on an Indian one that
   turned 192,955 wells into 1,92,955. */
const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="2"><numFmt numFmtId="164" formatCode="0.00000"/><numFmt numFmtId="165" formatCode="[$-en-US]#,##0"/></numFmts><fonts count="2"><font><sz val="11"/><color theme="1"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FF14532D"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE7F3EC"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left/><right/><top/><bottom style="thin"><color rgb="FFB9D6C6"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="5"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles><dxfs count="0"/></styleSheet>`;

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;

const WORKBOOK_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;

function workbookXml(sheetName: string): string {
  /* Excel's own limits on a sheet name: 31 characters, and none of \ / ? * [ ]. */
  const safe = escapeXml(sheetName.replace(/[\\/?*[\]]/g, " ").slice(0, 31));
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${safe}" sheetId="1" r:id="rId1"/></sheets></workbook>`;
}

/** Builds the workbook as a blob, without touching the page. */
export function buildSheet(
  sheetName: string,
  columns: SheetColumn[],
  rows: CellValue[][],
): Blob {
  const encoder = new TextEncoder();
  const part = (path: string, xml: string): ZipEntry => ({
    path,
    bytes: encoder.encode(xml),
  });

  return zip([
    part("[Content_Types].xml", CONTENT_TYPES),
    part("_rels/.rels", ROOT_RELS),
    part("xl/workbook.xml", workbookXml(sheetName)),
    part("xl/_rels/workbook.xml.rels", WORKBOOK_RELS),
    part("xl/styles.xml", STYLES_XML),
    part("xl/worksheets/sheet1.xml", sheetXml(columns, rows)),
  ]);
}

/** Builds the workbook and hands it to the browser to save. */
export function downloadSheet(
  filename: string,
  sheetName: string,
  columns: SheetColumn[],
  rows: CellValue[][],
): void {
  const url = URL.createObjectURL(buildSheet(sheetName, columns, rows));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

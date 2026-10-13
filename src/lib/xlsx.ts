// Copied from AbdullahRathoreVA/al-amin-al-tajir-crm (packages/server/src/core/xlsx.ts):
// a zero-dependency XLSX writer we own, used here for the admin account exports.

/**
 * A small XLSX writer, with colour.
 *
 * There is no spreadsheet library here for the same reason there is no web
 * framework: this server has zero runtime dependencies, and a system holding
 * children's records is better off with 400 lines we own than a transitive tree
 * we have to keep patched. An .xlsx file is a ZIP of XML documents, and Node
 * ships both `zlib` and enough string handling to write one.
 *
 * Two kinds of sheet come out of here. A `Sheet` is a table: headers, freeze
 * panes, column widths, zebra striping, currency and date formats, one accent
 * colour per tab. A `FormSheet` is a printed document — the expense
 * reimbursement form — where cells sit at fixed positions inside ruled boxes
 * under a logo, and the layout is the point rather than the data.
 *
 * The form is why this writer now does merged cells and one embedded image.
 * Both were on the "deliberately not doing" list until a form had to come out
 * of it looking like the paper it replaces: a title spanning the page and the
 * nursery's logo at the top are not decoration on a document somebody signs.
 *
 * Still deliberately absent: formulas, charts, and multiple fonts within one
 * cell. Those are where a hand-rolled writer stops being cheaper than a
 * library, and nothing here needs them.
 */
import { deflateRawSync } from 'node:zlib';

// --------------------------------------------------------------------- types

export type CellValue = string | number | null | undefined;

/** Which of the built-in formats a column is rendered with. */
export type ColumnFormat = 'text' | 'number' | 'money' | 'date' | 'integer';

export interface Column {
  header: string;
  /** Key into each row object. */
  key: string;
  format?: ColumnFormat;
  /** Character width. Sensible defaults per format when omitted. */
  width?: number;
}

/** The accent a sheet's header row is filled with. */
export type Accent = 'violet' | 'ember' | 'teal' | 'amber' | 'rose' | 'slate';

export interface Sheet {
  name: string;
  accent: Accent;
  columns: Column[];
  rows: Record<string, CellValue>[];
  /** Rendered bold under a rule, for sums. Keys must match the columns. */
  totals?: Record<string, CellValue>;
  /** Shown above the table in a muted italic. One line. */
  caption?: string;
}

// ------------------------------------------------------------------- the form

/**
 * The looks a cell on a printed form can have. Named for what the cell IS on
 * the page, not for how it is drawn, so the layout below reads as a document
 * rather than as a list of borders and fills.
 */
export type FormStyle =
  | 'title' | 'subtitle' | 'label' | 'labelRight' | 'writeIn'
  | 'head' | 'cell' | 'cellCenter' | 'cellMoney' | 'cellDate'
  | 'totalLabel' | 'totalMoney' | 'tick' | 'box' | 'note';

export interface FormCell {
  /** 1-based, like Excel's own row numbers. */
  row: number;
  /** 0-based; 0 is column A. */
  col: number;
  value?: CellValue;
  style: FormStyle;
  /** Merged across this many columns. 1 (the default) is not merged. */
  colSpan?: number;
  rowSpan?: number;
  /**
   * A real Excel formula, without the leading `=`, so the sheet keeps adding up
   * after somebody types into it. `value` is written alongside as the cached
   * result, which is what a reader shows before it has recalculated.
   */
  formula?: string;
}

/** A PNG placed at a fixed spot, sized in pixels. */
export interface FormImage {
  png: Buffer;
  row: number;
  col: number;
  width: number;
  height: number;
}

/**
 * A sheet that is a document rather than a table.
 *
 * No frozen pane and no filter: both are for reading a long list on screen,
 * and this is meant to be printed, signed and handed to whoever pays.
 */
export interface FormSheet {
  form: true;
  name: string;
  cells: FormCell[];
  /** Column widths in characters, by 0-based column index. */
  widths: number[];
  /** Row heights in points, keyed by 1-based row number. */
  heights?: Record<number, number>;
  image?: FormImage;
}

export type AnySheet = Sheet | FormSheet;

const isForm = (s: AnySheet): s is FormSheet => 'form' in s && s.form === true;

// ------------------------------------------------------------------ escaping

const XML_ESCAPES: Record<string, string> = {
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
};

/**
 * Escapes XML and strips the control characters XML 1.0 cannot represent.
 *
 * Stripping matters more than it looks: a parent's note pasted from a phone can
 * carry a stray 0x0B, and Excel refuses to open the entire workbook rather than
 * skipping the cell. Tab, newline and carriage return are kept.
 */
/**
 * Excel treats a leading =, +, - or @ as a formula, so a child called
 * "-Ana" or a note pasted from elsewhere becomes executable when the file is
 * opened. Every text cell that leaves this system goes through here.
 *
 * The tab and carriage return are in the pattern because Excel strips leading
 * whitespace before deciding, so "\t=cmd" is still a formula.
 */
export function deFormula(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v);
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
}

export function xmlEscape(value: string): string {
  let out = '';
  for (const ch of value) {
    const code = ch.codePointAt(0)!;
    if (code < 0x20 && ch !== '\t' && ch !== '\n' && ch !== '\r') continue;
    if (code === 0xfffe || code === 0xffff) continue;
    out += XML_ESCAPES[ch] ?? ch;
  }
  return out;
}

// ------------------------------------------------------------------- geometry

/** 0 -> A, 25 -> Z, 26 -> AA. Excel's column names are base-26 with no zero. */
export function columnName(index: number): string {
  let n = index + 1;
  let name = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    name = String.fromCharCode(65 + rem) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}

/** Excel counts days from 1899-12-30. Dates are stored as that number. */
export function excelSerialDate(iso: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  const ms = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Math.floor(ms / 86_400_000) + 25_569;
}

// --------------------------------------------------------------------- styles

/**
 * Accent colours, one per sheet, plus the pale tint its rows are striped with.
 * Chosen to stay legible in Excel's default light theme rather than to match
 * the CRM's dark UI, because this file is opened in Excel, not in the CRM.
 */
const ACCENTS: Record<Accent, { head: string; stripe: string }> = {
  violet: { head: 'FF5B3B8C', stripe: 'FFF2ECFA' },
  ember:  { head: 'FFC2410C', stripe: 'FFFDEEE7' },
  teal:   { head: 'FF0F766E', stripe: 'FFE6F4F2' },
  amber:  { head: 'FF92600A', stripe: 'FFFDF3DF' },
  rose:   { head: 'FF9F1239', stripe: 'FFFCE9EE' },
  slate:  { head: 'FF334155', stripe: 'FFEEF1F5' },
};

const ACCENT_ORDER: Accent[] = ['violet', 'ember', 'teal', 'amber', 'rose', 'slate'];

/**
 * The form's own colours: Tiny Stars purple, taken from the logo, and a pale
 * tint of it. A reimbursement form carries the nursery's name and gets printed,
 * so it uses the brand rather than a per-tab accent — and the rule colour is
 * dark enough to survive a photocopier, which pale grey does not.
 */
const BRAND = { head: 'FF402070', soft: 'FFF3EFFA', rule: 'FF44403C' };

/** numFmt ids above 163 are custom; Excel reserves the ones below. */
const FMT_MONEY = 164;
const FMT_DATE = 165;

const FORMAT_TO_NUMFMT: Record<ColumnFormat, number> = {
  text: 0, number: 2, integer: 1, money: FMT_MONEY, date: FMT_DATE,
};

const DEFAULT_WIDTH: Record<ColumnFormat, number> = {
  text: 22, number: 12, integer: 10, money: 14, date: 12,
};

// Fonts, borders and fills are referenced by position. Naming the positions
// once beats counting them at each use site.
const FONT_BODY = 0, FONT_HEAD = 1, FONT_BOLD = 2, FONT_CAPTION = 3;
const FONT_TITLE = 4, FONT_MUTED = 5;
const BORDER_NONE = 0, BORDER_UNDER = 1, BORDER_BOX = 3;
const FILL_NONE = 0;
const FILL_BRAND = 2 + ACCENT_ORDER.length * 2;
const FILL_SOFT = FILL_BRAND + 1;

const CENTRED = '<alignment horizontal="center" vertical="center" wrapText="1"/>';
const LEFT_BOTTOM = '<alignment horizontal="left" vertical="bottom"/>';
const RIGHT_BOTTOM = '<alignment horizontal="right" vertical="bottom"/>';

/**
 * Every look a form cell can have, as one list.
 *
 * The styles written into the file and the index looked up when writing a cell
 * both come from here. Keeping them as two hand-counted lists is exactly how a
 * workbook ends up opening with every cell rendered as a date.
 */
const FORM_XFS: {
  name: FormStyle; fmt: ColumnFormat; font: number; fill: number; border: number; align: string;
}[] = [
  { name: 'title', fmt: 'text', font: FONT_TITLE, fill: FILL_NONE, border: BORDER_NONE, align: CENTRED },
  { name: 'subtitle', fmt: 'text', font: FONT_MUTED, fill: FILL_NONE, border: BORDER_NONE, align: CENTRED },
  { name: 'label', fmt: 'text', font: FONT_BODY, fill: FILL_NONE, border: BORDER_NONE, align: LEFT_BOTTOM },
  { name: 'labelRight', fmt: 'text', font: FONT_BODY, fill: FILL_NONE, border: BORDER_NONE, align: RIGHT_BOTTOM },
  // The line somebody signs or writes a name on: ruled underneath, open above.
  { name: 'writeIn', fmt: 'text', font: FONT_BODY, fill: FILL_NONE, border: BORDER_UNDER, align: LEFT_BOTTOM },
  { name: 'head', fmt: 'text', font: FONT_HEAD, fill: FILL_BRAND, border: BORDER_BOX, align: CENTRED },
  { name: 'cell', fmt: 'text', font: FONT_BODY, fill: FILL_NONE, border: BORDER_BOX, align: '<alignment horizontal="left" vertical="center" wrapText="1"/>' },
  { name: 'cellCenter', fmt: 'text', font: FONT_BODY, fill: FILL_NONE, border: BORDER_BOX, align: CENTRED },
  { name: 'cellMoney', fmt: 'money', font: FONT_BODY, fill: FILL_NONE, border: BORDER_BOX, align: '<alignment horizontal="right" vertical="center"/>' },
  { name: 'cellDate', fmt: 'date', font: FONT_BODY, fill: FILL_NONE, border: BORDER_BOX, align: CENTRED },
  { name: 'totalLabel', fmt: 'text', font: FONT_BOLD, fill: FILL_SOFT, border: BORDER_BOX, align: RIGHT_BOTTOM },
  { name: 'totalMoney', fmt: 'money', font: FONT_BOLD, fill: FILL_SOFT, border: BORDER_BOX, align: '<alignment horizontal="right" vertical="center"/>' },
  { name: 'tick', fmt: 'text', font: FONT_BOLD, fill: FILL_NONE, border: BORDER_BOX, align: CENTRED },
  // The summary box: one tall ruled area, text starting at the top of it.
  { name: 'box', fmt: 'text', font: FONT_BODY, fill: FILL_NONE, border: BORDER_BOX, align: '<alignment horizontal="left" vertical="top" wrapText="1"/>' },
  { name: 'note', fmt: 'text', font: FONT_CAPTION, fill: FILL_NONE, border: BORDER_NONE, align: LEFT_BOTTOM },
];

/**
 * Style indices are positional, so this builds them in a fixed order and the
 * lookup helpers below must agree with it. Getting these out of step produces a
 * file that opens but renders every cell as a date, which is a memorable
 * afternoon.
 */
function stylesXml(): string {
  const fills: string[] = [
    '<fill><patternFill patternType="none"/></fill>',
    '<fill><patternFill patternType="gray125"/></fill>',
  ];
  for (const a of ACCENT_ORDER) {
    fills.push(`<fill><patternFill patternType="solid"><fgColor rgb="${ACCENTS[a].head}"/><bgColor indexed="64"/></patternFill></fill>`);
  }
  for (const a of ACCENT_ORDER) {
    fills.push(`<fill><patternFill patternType="solid"><fgColor rgb="${ACCENTS[a].stripe}"/><bgColor indexed="64"/></patternFill></fill>`);
  }
  // The form's two, at FILL_BRAND and FILL_SOFT.
  fills.push(`<fill><patternFill patternType="solid"><fgColor rgb="${BRAND.head}"/><bgColor indexed="64"/></patternFill></fill>`);
  fills.push(`<fill><patternFill patternType="solid"><fgColor rgb="${BRAND.soft}"/><bgColor indexed="64"/></patternFill></fill>`);

  const xfs: string[] = [];
  // 0: default
  xfs.push('<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>');
  // 1..6: headers, one per accent
  for (let i = 0; i < ACCENT_ORDER.length; i++) {
    xfs.push(`<xf numFmtId="0" fontId="1" fillId="${2 + i}" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>`);
  }
  // Body cells: for each format, a plain and a striped variant.
  const formats: ColumnFormat[] = ['text', 'number', 'integer', 'money', 'date'];
  for (const f of formats) {
    xfs.push(`<xf numFmtId="${FORMAT_TO_NUMFMT[f]}" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>`);
  }
  for (let a = 0; a < ACCENT_ORDER.length; a++) {
    for (const f of formats) {
      xfs.push(`<xf numFmtId="${FORMAT_TO_NUMFMT[f]}" fontId="0" fillId="${2 + ACCENT_ORDER.length + a}" borderId="0" xfId="0" applyNumberFormat="1" applyFill="1"/>`);
    }
  }
  // Totals: bold, ruled above.
  for (const f of formats) {
    xfs.push(`<xf numFmtId="${FORMAT_TO_NUMFMT[f]}" fontId="2" fillId="0" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1"/>`);
  }
  // Caption: muted italic.
  xfs.push('<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>');

  // The form's styles, in FORM_XFS order.
  for (const s of FORM_XFS) {
    xfs.push(`<xf numFmtId="${FORMAT_TO_NUMFMT[s.fmt]}" fontId="${s.font}" fillId="${s.fill}"`
      + ` borderId="${s.border}" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1"`
      + ` applyBorder="1" applyAlignment="1">${s.align}</xf>`);
  }

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="2">
<numFmt numFmtId="${FMT_MONEY}" formatCode="&quot;$&quot;#,##0.00"/>
<numFmt numFmtId="${FMT_DATE}" formatCode="yyyy\\-mm\\-dd"/>
</numFmts>
<fonts count="6">
<font><sz val="11"/><name val="Calibri"/><color theme="1"/></font>
<font><b/><sz val="11"/><name val="Calibri"/><color rgb="FFFFFFFF"/></font>
<font><b/><sz val="11"/><name val="Calibri"/><color theme="1"/></font>
<font><i/><sz val="10"/><name val="Calibri"/><color rgb="FF6B7280"/></font>
<font><b/><sz val="16"/><name val="Calibri"/><color rgb="${BRAND.head}"/></font>
<font><sz val="10"/><name val="Calibri"/><color rgb="FF475569"/></font>
</fonts>
<fills count="${fills.length}">${fills.join('')}</fills>
<borders count="4">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border><left/><right/><top/><bottom style="thin"><color rgb="FF000000"/></bottom><diagonal/></border>
<border><left/><right/><top style="thin"><color rgb="FF9CA3AF"/></top><bottom/><diagonal/></border>
<border><left style="thin"><color rgb="${BRAND.rule}"/></left><right style="thin"><color rgb="${BRAND.rule}"/></right><top style="thin"><color rgb="${BRAND.rule}"/></top><bottom style="thin"><color rgb="${BRAND.rule}"/></bottom><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="${xfs.length}">${xfs.join('')}</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
}

const FORMAT_INDEX: Record<ColumnFormat, number> = {
  text: 0, number: 1, integer: 2, money: 3, date: 4,
};
const HEADER_XF = (accent: Accent) => 1 + ACCENT_ORDER.indexOf(accent);
const BODY_BASE = 1 + ACCENT_ORDER.length;
const PLAIN_XF = (f: ColumnFormat) => BODY_BASE + FORMAT_INDEX[f];
const STRIPE_XF = (accent: Accent, f: ColumnFormat) =>
  BODY_BASE + 5 + ACCENT_ORDER.indexOf(accent) * 5 + FORMAT_INDEX[f];
const TOTAL_XF = (f: ColumnFormat) => BODY_BASE + 5 + ACCENT_ORDER.length * 5 + FORMAT_INDEX[f];
const CAPTION_XF = BODY_BASE + 5 + ACCENT_ORDER.length * 5 + 5;
const FORM_BASE = CAPTION_XF + 1;

const FORM_XF_INDEX = new Map<FormStyle, number>(
  FORM_XFS.map((s, i) => [s.name, FORM_BASE + i]));
const FORM_FORMAT = new Map<FormStyle, ColumnFormat>(FORM_XFS.map((s) => [s.name, s.fmt]));

// ------------------------------------------------------------------ worksheet

/**
 * A formula cell. The cached result goes in beside it so a reader that has not
 * recalculated yet still shows the right number rather than a zero; a formula
 * returning text caches nothing, which readers handle by recalculating.
 */
function formulaCell(ref: string, formula: string, value: CellValue, xf: number): string {
  const cached = typeof value === 'number' && Number.isFinite(value)
    ? `<v>${value}</v>` : '';
  return `<c r="${ref}" s="${xf}"><f>${xmlEscape(formula)}</f>${cached}</c>`;
}

function cell(ref: string, value: CellValue, format: ColumnFormat, xf: number): string {
  if (value === null || value === undefined || value === '') {
    return `<c r="${ref}" s="${xf}"/>`;
  }
  if (format === 'date' && typeof value === 'string') {
    const serial = excelSerialDate(value);
    // A date we cannot parse is written as the text it actually is, rather than
    // being dropped or turned into 1899. A wrong date is worse than a string.
    if (serial === null) {
      return `<c r="${ref}" s="${PLAIN_XF('text')}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`;
    }
    return `<c r="${ref}" s="${xf}"><v>${serial}</v></c>`;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<c r="${ref}" s="${xf}"><v>${value}</v></c>`;
  }
  return `<c r="${ref}" s="${xf}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(String(value))}</t></is></c>`;
}

function sheetXml(sheet: Sheet): string {
  const cols = sheet.columns;
  const widths = cols.map((c, i) => {
    const fmt = c.format ?? 'text';
    const width = c.width ?? Math.max(DEFAULT_WIDTH[fmt], Math.min(42, c.header.length + 4));
    return `<col min="${i + 1}" max="${i + 1}" width="${width}" customWidth="1"/>`;
  }).join('');

  const rows: string[] = [];
  let r = 1;

  if (sheet.caption) {
    rows.push(`<row r="${r}"><c r="A${r}" s="${CAPTION_XF}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(sheet.caption)}</t></is></c></row>`);
    r++;
    rows.push(`<row r="${r}"/>`); // a blank line, so the caption is not mistaken for a header
    r++;
  }

  const headerRow = r;
  rows.push(`<row r="${r}" ht="22" customHeight="1">` + cols.map((c, i) =>
    `<c r="${columnName(i)}${r}" s="${HEADER_XF(sheet.accent)}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(c.header)}</t></is></c>`,
  ).join('') + '</row>');
  r++;

  for (const [n, row] of sheet.rows.entries()) {
    const striped = n % 2 === 1;
    rows.push(`<row r="${r}">` + cols.map((c, i) => {
      const fmt = c.format ?? 'text';
      const xf = striped ? STRIPE_XF(sheet.accent, fmt) : PLAIN_XF(fmt);
      return cell(`${columnName(i)}${r}`, row[c.key], fmt, xf);
    }).join('') + '</row>');
    r++;
  }

  if (sheet.totals) {
    rows.push(`<row r="${r}">` + cols.map((c, i) => {
      const fmt = c.format ?? 'text';
      return cell(`${columnName(i)}${r}`, sheet.totals![c.key], fmt, TOTAL_XF(fmt));
    }).join('') + '</row>');
    r++;
  }

  const lastCol = columnName(Math.max(cols.length - 1, 0));
  const lastRow = Math.max(r - 1, headerRow);

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetPr><outlinePr summaryBelow="1" summaryRight="1"/></sheetPr>
<dimension ref="A1:${lastCol}${lastRow}"/>
<sheetViews><sheetView workbookViewId="0"><pane ySplit="${headerRow}" topLeftCell="A${headerRow + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
<cols>${widths}</cols>
<sheetData>${rows.join('')}</sheetData>
<autoFilter ref="A${headerRow}:${lastCol}${lastRow}"/>
<pageMargins left="0.5" right="0.5" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>
</worksheet>`;
}

/**
 * A form sheet: cells at fixed positions, boxes, merges and a logo.
 *
 * The one subtlety is merged ranges. Excel draws a merged range's border from
 * the cells underneath it, not from the range, so a box set only on the
 * top-left corner prints as one short line and nothing else. Every position a
 * merge covers therefore gets the style; only the corner gets the value.
 */
function formSheetXml(sheet: FormSheet): string {
  const widths = sheet.widths.map((w, i) =>
    `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('');

  type Placed = { value: CellValue; style: FormStyle; formula?: string };
  const grid = new Map<number, Map<number, Placed>>();
  const merges: string[] = [];
  let maxRow = 1;
  let maxCol = 0;

  for (const c of sheet.cells) {
    const colSpan = Math.max(1, c.colSpan ?? 1);
    const rowSpan = Math.max(1, c.rowSpan ?? 1);
    for (let dr = 0; dr < rowSpan; dr++) {
      for (let dc = 0; dc < colSpan; dc++) {
        const row = c.row + dr;
        const col = c.col + dc;
        const corner = dr === 0 && dc === 0;
        let line = grid.get(row);
        if (!line) { line = new Map(); grid.set(row, line); }
        line.set(col, {
          value: corner ? c.value : null,
          style: c.style,
          formula: corner ? c.formula : undefined,
        });
        if (row > maxRow) maxRow = row;
        if (col > maxCol) maxCol = col;
      }
    }
    if (colSpan > 1 || rowSpan > 1) {
      merges.push(`<mergeCell ref="${columnName(c.col)}${c.row}:`
        + `${columnName(c.col + colSpan - 1)}${c.row + rowSpan - 1}"/>`);
    }
  }

  const rows = [...grid.keys()].sort((a, b) => a - b).map((r) => {
    const line = grid.get(r)!;
    const height = sheet.heights?.[r];
    const body = [...line.keys()].sort((a, b) => a - b).map((col) => {
      const { value, style, formula } = line.get(col)!;
      const ref = `${columnName(col)}${r}`;
      const xf = FORM_XF_INDEX.get(style)!;
      return formula
        ? formulaCell(ref, formula, value, xf)
        : cell(ref, value, FORM_FORMAT.get(style)!, xf);
    }).join('');
    return `<row r="${r}"${height ? ` ht="${height}" customHeight="1"` : ''}>${body}</row>`;
  });

  // Element order inside a worksheet is fixed by the schema, and Excel refuses
  // the file rather than reordering it: mergeCells after sheetData, the drawing
  // last of all.
  const mergeXml = merges.length
    ? `<mergeCells count="${merges.length}">${merges.join('')}</mergeCells>` : '';
  const drawingXml = sheet.image ? '<drawing r:id="rId1"/>' : '';

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetPr><outlinePr summaryBelow="1" summaryRight="1"/><pageSetUpPr fitToPage="1"/></sheetPr>
<dimension ref="A1:${columnName(maxCol)}${maxRow}"/>
<sheetViews><sheetView showGridLines="0" workbookViewId="0"/></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
<cols>${widths}</cols>
<sheetData>${rows.join('')}</sheetData>
${mergeXml}
<pageMargins left="0.5" right="0.5" top="0.5" bottom="0.5" header="0.3" footer="0.3"/>
<pageSetup paperSize="9" orientation="portrait" fitToWidth="1" fitToHeight="0"/>
${drawingXml}
</worksheet>`;
}

/** The logo, anchored to one cell and sized in pixels. 1 px is 9525 EMU. */
function drawingXml(image: FormImage): string {
  const emu = (px: number) => Math.round(px * 9525);
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
<xdr:oneCellAnchor>
<xdr:from><xdr:col>${image.col}</xdr:col><xdr:colOff>${emu(6)}</xdr:colOff><xdr:row>${image.row - 1}</xdr:row><xdr:rowOff>${emu(4)}</xdr:rowOff></xdr:from>
<xdr:ext cx="${emu(image.width)}" cy="${emu(image.height)}"/>
<xdr:pic>
<xdr:nvPicPr><xdr:cNvPr id="1" name="Tiny Stars"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr>
<xdr:blipFill><a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>
<xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${emu(image.width)}" cy="${emu(image.height)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr>
</xdr:pic>
<xdr:clientData/>
</xdr:oneCellAnchor>
</xdr:wsDr>`;
}

/** Excel rejects these characters in a tab name, and 31 is its hard limit. */
export function safeSheetName(name: string, taken: Set<string>): string {
  let base = name.replace(/[\\/*?:[\]]/g, ' ').trim().slice(0, 31) || 'Sheet';
  let candidate = base;
  let n = 2;
  while (taken.has(candidate.toLowerCase())) {
    const suffix = ` ${n++}`;
    candidate = base.slice(0, 31 - suffix.length) + suffix;
  }
  taken.add(candidate.toLowerCase());
  return candidate;
}

// ------------------------------------------------------------------------ zip

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

interface Entry { name: string; data: Buffer; deflated: Buffer; crc: number; offset: number }

/**
 * A minimal ZIP, deflated, with no data descriptors and no ZIP64.
 *
 * ZIP64 is the one real limit: past 4 GB or 65,535 entries this would need it.
 * A daycare's logbook is neither, and refusing to write a broken file is better
 * than silently producing one, so the caller is told rather than guessed at.
 */
export function zip(files: { name: string; content: string | Buffer }[]): Buffer {
  const entries: Entry[] = [];
  const chunks: Buffer[] = [];
  let offset = 0;

  for (const f of files) {
    // A PNG arrives as bytes; everything else is XML text.
    const data = Buffer.isBuffer(f.content) ? f.content : Buffer.from(f.content, 'utf8');
    const deflated = deflateRawSync(data, { level: 9 });
    const crc = crc32(data);
    const nameBuf = Buffer.from(f.name, 'utf8');

    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);      // version needed
    header.writeUInt16LE(0, 6);       // flags
    header.writeUInt16LE(8, 8);       // deflate
    header.writeUInt16LE(0, 10);      // mod time
    header.writeUInt16LE(0x0021, 12); // mod date: 1980-01-01, so the file is byte-identical run to run
    header.writeUInt32LE(crc, 14);
    header.writeUInt32LE(deflated.length, 18);
    header.writeUInt32LE(data.length, 22);
    header.writeUInt16LE(nameBuf.length, 26);
    header.writeUInt16LE(0, 28);

    entries.push({ name: f.name, data, deflated, crc, offset });
    chunks.push(header, nameBuf, deflated);
    offset += header.length + nameBuf.length + deflated.length;
  }

  const cdStart = offset;
  for (const e of entries) {
    const nameBuf = Buffer.from(e.name, 'utf8');
    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);          // version made by
    cd.writeUInt16LE(20, 6);          // version needed
    cd.writeUInt16LE(0, 8);
    cd.writeUInt16LE(8, 10);
    cd.writeUInt16LE(0, 12);
    cd.writeUInt16LE(0x0021, 14);
    cd.writeUInt32LE(e.crc, 16);
    cd.writeUInt32LE(e.deflated.length, 20);
    cd.writeUInt32LE(e.data.length, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt16LE(0, 30);
    cd.writeUInt16LE(0, 32);
    cd.writeUInt16LE(0, 34);
    cd.writeUInt16LE(0, 36);
    cd.writeUInt32LE(0, 38);
    cd.writeUInt32LE(e.offset, 42);
    chunks.push(cd, nameBuf);
    offset += cd.length + nameBuf.length;
  }

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(offset - cdStart, 12);
  eocd.writeUInt32LE(cdStart, 16);
  eocd.writeUInt16LE(0, 20);
  chunks.push(eocd);

  return Buffer.concat(chunks);
}

// ---------------------------------------------------------------- the workbook

export function buildWorkbook(sheets: AnySheet[]): Buffer {
  if (!sheets.length) throw new Error('A workbook needs at least one sheet');
  if (sheets.length > 200) throw new Error('Too many sheets for this writer');

  const taken = new Set<string>();
  const named = sheets.map((s) => ({ ...s, name: safeSheetName(s.name, taken) }) as AnySheet);

  const sheetEntries = named.map((s, i) => ({
    name: `xl/worksheets/sheet${i + 1}.xml`,
    content: isForm(s) ? formSheetXml(s) : sheetXml(s),
  }));

  // A sheet carrying a logo needs three more parts and a relationship of its
  // own: the picture, the drawing that places it, and the link between them.
  const extras: { name: string; content: string | Buffer }[] = [];
  const drawingOverrides: string[] = [];
  let images = 0;

  named.forEach((s, i) => {
    if (!isForm(s) || !s.image) return;
    const n = ++images;
    extras.push(
      { name: `xl/media/image${n}.png`, content: s.image.png },
      { name: `xl/drawings/drawing${n}.xml`, content: drawingXml(s.image) },
      {
        name: `xl/drawings/_rels/drawing${n}.xml.rels`,
        content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image${n}.png"/>
</Relationships>`,
      },
      {
        name: `xl/worksheets/_rels/sheet${i + 1}.xml.rels`,
        content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${n}.xml"/>
</Relationships>`,
      },
    );
    drawingOverrides.push(`<Override PartName="/xl/drawings/drawing${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`);
  });

  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>${named.map((s, i) =>
    `<sheet name="${xmlEscape(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets>
<calcPr calcId="0" fullCalcOnLoad="1"/>
</workbook>`;

  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${named.map((_, i) =>
    `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}
<Relationship Id="rId${named.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Default Extension="png" ContentType="image/png"/>
${drawingOverrides.join('')}
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
${named.map((_, i) =>
    `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}
</Types>`;

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  return zip([
    { name: '[Content_Types].xml', content: contentTypes },
    { name: '_rels/.rels', content: rootRels },
    { name: 'xl/workbook.xml', content: workbook },
    { name: 'xl/_rels/workbook.xml.rels', content: workbookRels },
    { name: 'xl/styles.xml', content: stylesXml() },
    ...sheetEntries,
    ...extras,
  ]);
}

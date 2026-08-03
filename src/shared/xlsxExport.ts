/**
 * WienerCalc — Generador de .xlsx "bonito", isomorfo (escritorio Y navegador).
 *
 * Por qué existe este archivo: la librería `xlsx` (SheetJS Community
 * Edition) instalada SÍ permite fijar anchos de columna, formatos de número
 * (`cell.z`) y autofiltro al escribir un libro — eso se comprobó de forma
 * empírica escribiendo un archivo de prueba y desempaquetándolo. Pero NO
 * escribe fuentes en negrita, colores de relleno ni bordes al guardar
 * (`cell.s` se ignora en silencio): eso es exclusivo de la versión de pago
 * ("Pro"), fácil de comprobar inspeccionando el `styles.xml` resultante
 * (sólo aparecen las dos entradas por defecto "none"/"gray125", nunca el
 * relleno o la fuente que uno pida).
 *
 * En vez de añadir una dependencia nueva, este módulo construye el .xlsx
 * directamente: es un .zip con archivos XML (formato OOXML), más sencillo
 * de lo que parece para un caso de uso como este (una sola hoja, sin
 * fórmulas, sin fechas).
 *
 * Este archivo NO usa `Buffer` ni `node:zlib` a propósito: usa sólo
 * `Uint8Array`/`DataView`/`TextEncoder`, disponibles tanto en Node como en
 * el navegador, y recibe la función de compresión como parámetro
 * (`deflate`). Así el mismo código genera el libro en los dos modos de la
 * app:
 *   - Escritorio (Electron/Node): `zlib.deflateRawSync` (ver
 *     `src/main/xlsxWriter.ts`).
 *   - Navegador: `CompressionStream('deflate-raw')`, disponible en todos
 *     los navegadores modernos desde mediados de 2023 (ver
 *     `src/renderer/src/main.tsx`).
 * Antes el modo navegador ni siquiera lo intentaba: el botón "Excel"
 * simplemente descargaba el mismo CSV con un aviso. Ahora produce un .xlsx
 * real en ambos modos, con el mismo aspecto.
 */

export type DeflateFn = (data: Uint8Array) => Uint8Array | Promise<Uint8Array>;

/* ------------------------------------------------------------------ */
/* CRC32 (necesario para el formato ZIP)                               */
/* ------------------------------------------------------------------ */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/* ------------------------------------------------------------------ */
/* Utilidades binarias mínimas (sin Buffer)                             */
/* ------------------------------------------------------------------ */

const textEncoder = new TextEncoder();

function concatBytes(chunks: Uint8Array[]): Uint8Array {
  let total = 0;
  for (const c of chunks) total += c.length;
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) { out.set(c, offset); offset += c.length; }
  return out;
}

/** Construye un bloque de bytes de tamaño fijo escribiendo enteros little-endian por posición. */
class ByteWriter {
  private view: DataView;
  bytes: Uint8Array;
  constructor(size: number) {
    this.bytes = new Uint8Array(size);
    this.view = new DataView(this.bytes.buffer);
  }
  u16(offset: number, value: number): void { this.view.setUint16(offset, value, true); }
  u32(offset: number, value: number): void { this.view.setUint32(offset, value, true); }
}

/* ------------------------------------------------------------------ */
/* Constructor de ZIP mínimo (sin cifrado, sin zip64: de sobra para un   */
/* libro de una sola hoja con datos de texto/números).                  */
/* ------------------------------------------------------------------ */

interface ZipEntry {
  name: string;
  data: Uint8Array;
}

function dosDateTime(date: Date): { time: number; dosDate: number } {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, dosDate };
}

export async function buildZip(entries: ZipEntry[], deflate: DeflateFn): Promise<Uint8Array> {
  const { time, dosDate } = dosDateTime(new Date());
  const localChunks: Uint8Array[] = [];
  const centralChunks: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuf = textEncoder.encode(entry.name);
    const raw = entry.data;
    const compressed = await deflate(raw);
    const crc = crc32(raw);

    const localHeader = new ByteWriter(30);
    localHeader.u32(0, 0x04034b50);
    localHeader.u16(4, 20); // version needed
    localHeader.u16(6, 0); // flags
    localHeader.u16(8, 8); // method: deflate
    localHeader.u16(10, time);
    localHeader.u16(12, dosDate);
    localHeader.u32(14, crc);
    localHeader.u32(18, compressed.length);
    localHeader.u32(22, raw.length);
    localHeader.u16(26, nameBuf.length);
    localHeader.u16(28, 0); // extra field length

    localChunks.push(localHeader.bytes, nameBuf, compressed);

    const centralHeader = new ByteWriter(46);
    centralHeader.u32(0, 0x02014b50);
    centralHeader.u16(4, 20); // version made by
    centralHeader.u16(6, 20); // version needed
    centralHeader.u16(8, 0); // flags
    centralHeader.u16(10, 8); // method
    centralHeader.u16(12, time);
    centralHeader.u16(14, dosDate);
    centralHeader.u32(16, crc);
    centralHeader.u32(20, compressed.length);
    centralHeader.u32(24, raw.length);
    centralHeader.u16(28, nameBuf.length);
    centralHeader.u16(30, 0); // extra length
    centralHeader.u16(32, 0); // comment length
    centralHeader.u16(34, 0); // disk number start
    centralHeader.u16(36, 0); // internal attrs
    centralHeader.u32(38, 0); // external attrs
    centralHeader.u32(42, offset); // offset of local header

    centralChunks.push(centralHeader.bytes, nameBuf);

    offset += localHeader.bytes.length + nameBuf.length + compressed.length;
  }

  const centralDirectory = concatBytes(centralChunks);
  const centralOffset = offset;

  const end = new ByteWriter(22);
  end.u32(0, 0x06054b50);
  end.u16(4, 0); // disk number
  end.u16(6, 0); // disk with central dir
  end.u16(8, entries.length); // entries on this disk
  end.u16(10, entries.length); // total entries
  end.u32(12, centralDirectory.length); // central dir size
  end.u32(16, centralOffset); // central dir offset
  end.u16(20, 0); // comment length

  return concatBytes([...localChunks, centralDirectory, end.bytes]);
}

/* ------------------------------------------------------------------ */
/* Utilidades XML                                                      */
/* ------------------------------------------------------------------ */

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    // Excel rechaza el archivo si hay ciertos caracteres de control (0x00-0x08, 0x0B-0x0C, 0x0E-0x1F).
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');
}

/** Convierte un índice de columna (0-based) en letras de Excel: 0→A, 25→Z, 26→AA... */
export function colLetter(index: number): string {
  let n = index + 1;
  let letters = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

/* ------------------------------------------------------------------ */
/* Construcción del libro                                              */
/* ------------------------------------------------------------------ */

export interface XlsxOptions {
  sheetName?: string;
}

const COLOR_HEADER_FILL = '3B0A6B'; // morado oscuro (paleta Umbrella Corp de la app)
const COLOR_HEADER_FONT = 'FFFFFF';
const COLOR_ZEBRA_FILL = 'F1E9FA'; // lavanda muy claro
const COLOR_BORDER = 'C9BEDA';
const COLOR_TAB = '9D4EDD';

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

/** Decide si una columna es numérica y si además todos sus valores son enteros. */
function analyzeColumn(rows: Record<string, unknown>[], key: string): { numeric: boolean; integer: boolean } {
  let sawAny = false;
  let allNumeric = true;
  let allInteger = true;
  for (const row of rows) {
    const v = row[key];
    if (v === undefined || v === null || v === '') continue;
    sawAny = true;
    if (isFiniteNumber(v)) {
      if (!Number.isInteger(v)) allInteger = false;
    } else {
      allNumeric = false;
      allInteger = false;
    }
  }
  return { numeric: sawAny && allNumeric, integer: sawAny && allInteger };
}

function displayWidth(value: unknown): number {
  if (value === undefined || value === null) return 0;
  return String(value).length;
}

/**
 * Construye un .xlsx con encabezado en negrita/color, bordes finos, franjas
 * "cebra" en filas alternas, ancho de columna ajustado al contenido,
 * formato numérico consistente por columna, fila de encabezado congelada y
 * autofiltro — todo lo que la versión gratuita de la librería instalada no
 * escribe por sí sola.
 */
export async function buildPrettyXlsx(
  rows: Record<string, unknown>[],
  headers: string[],
  options: XlsxOptions = {},
  deflate: DeflateFn
): Promise<Uint8Array> {
  const sheetName = (options.sheetName ?? 'WienerCalc').slice(0, 31);
  const colInfo = headers.map((h) => analyzeColumn(rows, h));
  const colWidths = headers.map((h, i) => {
    let max = h.length;
    for (const row of rows) max = Math.max(max, displayWidth(row[h]));
    return Math.min(Math.max(max + 2, 8), 45);
  });

  const lastColLetter = colLetter(Math.max(headers.length - 1, 0));
  const lastRow = rows.length + 1;

  /* ---- styles.xml ------------------------------------------------- */
  // Índices de cellXfs (deben coincidir exactamente con el orden en que se
  // escriben más abajo):
  //   0 normal (obligatorio, estilo base)
  //   1 encabezado
  //   2 texto, fila normal      3 texto, fila cebra
  //   4 número decimal, normal  5 número decimal, cebra
  //   6 número entero, normal  7 número entero, cebra
  const NUMFMT_DECIMAL = 164;
  const NUMFMT_INTEGER = 165;

  const XF_HEADER = 1;
  const XF_TEXT = 2;
  const XF_TEXT_ZEBRA = 3;
  const XF_DEC = 4;
  const XF_DEC_ZEBRA = 5;
  const XF_INT = 6;
  const XF_INT_ZEBRA = 7;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="2">
    <numFmt numFmtId="${NUMFMT_DECIMAL}" formatCode="#,##0.0000;-#,##0.0000"/>
    <numFmt numFmtId="${NUMFMT_INTEGER}" formatCode="#,##0;-#,##0"/>
  </numFmts>
  <fonts count="2">
    <font><sz val="11"/><color rgb="FF000000"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FF${COLOR_HEADER_FONT}"/><name val="Calibri"/></font>
  </fonts>
  <fills count="4">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF${COLOR_HEADER_FILL}"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF${COLOR_ZEBRA_FILL}"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FF${COLOR_BORDER}"/></left>
      <right style="thin"><color rgb="FF${COLOR_BORDER}"/></right>
      <top style="thin"><color rgb="FF${COLOR_BORDER}"/></top>
      <bottom style="thin"><color rgb="FF${COLOR_BORDER}"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="8">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
    <xf numFmtId="${NUMFMT_DECIMAL}" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="${NUMFMT_DECIMAL}" fontId="0" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="${NUMFMT_INTEGER}" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="${NUMFMT_INTEGER}" fontId="0" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

  /* ---- sheet1.xml --------------------------------------------------- */
  const rowXmlParts: string[] = [];

  // Fila de encabezado.
  {
    const cells = headers
      .map((h, i) => `<c r="${colLetter(i)}1" s="${XF_HEADER}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(h)}</t></is></c>`)
      .join('');
    rowXmlParts.push(`<row r="1" ht="20" customHeight="1">${cells}</row>`);
  }

  rows.forEach((row, rIdx) => {
    const r = rIdx + 2; // fila 1 es encabezado
    const zebra = rIdx % 2 === 1;
    const cells = headers
      .map((h, cIdx) => {
        const ref = `${colLetter(cIdx)}${r}`;
        const value = row[h];
        const info = colInfo[cIdx];
        if (value === undefined || value === null || value === '') {
          const s = zebra ? (info.numeric ? XF_DEC_ZEBRA : XF_TEXT_ZEBRA) : info.numeric ? XF_DEC : XF_TEXT;
          return `<c r="${ref}" s="${s}"/>`;
        }
        if (isFiniteNumber(value)) {
          const s = info.integer ? (zebra ? XF_INT_ZEBRA : XF_INT) : zebra ? XF_DEC_ZEBRA : XF_DEC;
          return `<c r="${ref}" s="${s}"><v>${value}</v></c>`;
        }
        const s = zebra ? XF_TEXT_ZEBRA : XF_TEXT;
        return `<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(String(value))}</t></is></c>`;
      })
      .join('');
    rowXmlParts.push(`<row r="${r}">${cells}</row>`);
  });

  const colsXml = headers
    .map((_h, i) => `<col min="${i + 1}" max="${i + 1}" width="${colWidths[i]}" customWidth="1"/>`)
    .join('');

  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheetPr><tabColor rgb="FF${COLOR_TAB}"/></sheetPr>
  <dimension ref="A1:${lastColLetter}${lastRow}"/>
  <sheetViews>
    <sheetView workbookViewId="0" showGridLines="0">
      <pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>
      <selection pane="bottomLeft" activeCell="A2" sqref="A2"/>
    </sheetView>
  </sheetViews>
  <cols>${colsXml}</cols>
  <sheetData>${rowXmlParts.join('')}</sheetData>
  <autoFilter ref="A1:${lastColLetter}${lastRow}"/>
  <pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>
</worksheet>`;

  /* ---- resto de partes fijas del paquete OOXML ----------------------- */
  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="${escapeXml(sheetName)}" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;

  const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  const entries: ZipEntry[] = [
    { name: '[Content_Types].xml', data: textEncoder.encode(contentTypesXml) },
    { name: '_rels/.rels', data: textEncoder.encode(rootRelsXml) },
    { name: 'xl/workbook.xml', data: textEncoder.encode(workbookXml) },
    { name: 'xl/_rels/workbook.xml.rels', data: textEncoder.encode(workbookRelsXml) },
    { name: 'xl/styles.xml', data: textEncoder.encode(stylesXml) },
    { name: 'xl/worksheets/sheet1.xml', data: textEncoder.encode(sheetXml) }
  ];

  return buildZip(entries, deflate);
}

/**
 * WienerCalc — Utilidades CSV isomorfas (Node + navegador).
 *
 * Este módulo NO depende de `fs` ni de ninguna librería externa: recibe y
 * devuelve texto. Así el mismo código corre en el proceso principal de
 * Electron y en el navegador, garantizando resultados idénticos.
 *
 * Cubre los casos que rompían la versión anterior:
 *  - BOM UTF-8 (el "CSV UTF-8" que exporta Excel)
 *  - Delimitadores `,` `;` tabulador y `|` (Excel en configuración regional ES)
 *  - Campos entrecomillados que contienen el delimitador o saltos de línea
 *  - Comillas escapadas ("")
 *  - Finales de línea CRLF / LF / CR
 *  - Coma decimal latina y separadores de miles
 */

export type Delimiter = ',' | ';' | '\t' | '|';

export interface CsvTable {
  headers: string[];
  rows: Record<string, string>[];
  delimiter: Delimiter;
  /** Filas cuyo número de campos no coincide con el de la cabecera. */
  malformedRows: number;
}

const DELIMITERS: Delimiter[] = [',', ';', '\t', '|'];

/** Elimina el BOM UTF-8 inicial si está presente. */
export function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/**
 * Detecta el delimitador contando ocurrencias fuera de comillas en las
 * primeras líneas y eligiendo el que produce un número de campos constante.
 */
export function detectDelimiter(text: string): Delimiter {
  const sample = stripBom(text).split(/\r\n|\n|\r/).slice(0, 20).join('\n');
  if (!sample.trim()) return ',';

  let best: Delimiter = ',';
  let bestScore = 0;

  for (const delimiter of DELIMITERS) {
    const counts: number[] = [];
    let inQuotes = false;
    let count = 0;
    let lineHasContent = false;

    const endLine = (): void => {
      if (lineHasContent) counts.push(count);
      count = 0;
      lineHasContent = false;
    };

    for (let i = 0; i < sample.length; i++) {
      const ch = sample[i];
      if (ch === '"') {
        lineHasContent = true;
        if (inQuotes && sample[i + 1] === '"') { i++; continue; }
        inQuotes = !inQuotes;
      } else if (!inQuotes && ch === delimiter) {
        count++;
        lineHasContent = true;
      } else if (!inQuotes && ch === '\n') {
        endLine();
      } else if (ch.trim() !== '' || inQuotes) {
        lineHasContent = true;
      }
    }
    endLine();

    // El delimitador TIENE que aparecer en la cabecera; si no, se descarta.
    // (Evita que una coma decimal en los datos gane a un `;` real.)
    if (counts.length === 0 || counts[0] === 0) continue;

    const expected = counts[0];
    const consistent = counts.filter((c) => c === expected).length / counts.length;
    const score = expected * consistent;

    if (score > bestScore) { bestScore = score; best = delimiter; }
  }

  return best;
}

/** Parser CSV conforme a RFC 4180 (con tolerancia a comillas sueltas). */
export function parseCsv(text: string, forcedDelimiter?: Delimiter): CsvTable {
  const clean = stripBom(text ?? '');
  const delimiter = forcedDelimiter ?? detectDelimiter(clean);

  const records: string[][] = [];
  let field = '';
  let record: string[] = [];
  let inQuotes = false;
  let fieldWasQuoted = false;

  const pushField = (): void => {
    record.push(fieldWasQuoted ? field : field.trim());
    field = '';
    fieldWasQuoted = false;
  };

  const pushRecord = (): void => {
    pushField();
    // Descartar líneas totalmente vacías
    if (!(record.length === 1 && record[0] === '')) records.push(record);
    record = [];
  };

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];

    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"' && field.trim() === '') {
      inQuotes = true;
      fieldWasQuoted = true;
      field = '';
    } else if (ch === delimiter) {
      pushField();
    } else if (ch === '\n') {
      pushRecord();
    } else if (ch === '\r') {
      if (clean[i + 1] === '\n') i++;
      pushRecord();
    } else {
      field += ch;
    }
  }

  if (field !== '' || record.length > 0) pushRecord();

  if (records.length === 0) {
    return { headers: [], rows: [], delimiter, malformedRows: 0 };
  }

  const headers = dedupeHeaders(records[0].map((h) => h.trim()));
  const rows: Record<string, string>[] = [];
  let malformedRows = 0;

  for (let r = 1; r < records.length; r++) {
    const cells = records[r];
    if (cells.length !== headers.length) malformedRows++;
    const obj: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) obj[headers[c]] = cells[c] ?? '';
    rows.push(obj);
  }

  return { headers, rows, delimiter, malformedRows };
}

/** Lee sólo la cabecera. Mucho más rápido para poblar los desplegables. */
export function parseCsvHeaders(text: string, forcedDelimiter?: Delimiter): { headers: string[]; delimiter: Delimiter } {
  const clean = stripBom(text ?? '');
  const delimiter = forcedDelimiter ?? detectDelimiter(clean);
  // Se parsea sólo hasta el primer salto de línea fuera de comillas.
  let end = 0;
  let inQuotes = false;
  for (; end < clean.length; end++) {
    const ch = clean[end];
    if (ch === '"') {
      if (inQuotes && clean[end + 1] === '"') { end++; continue; }
      inQuotes = !inQuotes;
    } else if (!inQuotes && (ch === '\n' || ch === '\r')) break;
  }
  const table = parseCsv(clean.slice(0, end), delimiter);
  return { headers: table.headers, delimiter };
}

/** Evita que dos columnas con el mismo nombre se pisen silenciosamente. */
function dedupeHeaders(headers: string[]): string[] {
  const seen = new Map<string, number>();
  return headers.map((h, i) => {
    const name = h === '' ? `columna_${i + 1}` : h;
    const n = seen.get(name) ?? 0;
    seen.set(name, n + 1);
    return n === 0 ? name : `${name}_${n + 1}`;
  });
}

/**
 * Convierte texto a número tolerando formatos latinos.
 *
 *   "1.234,56" -> 1234.56    (miles con punto, decimal con coma)
 *   "1,234.56" -> 1234.56    (miles con coma, decimal con punto)
 *   "31,5"     -> 31.5       (decimal con coma)
 *   "1.234"    -> 1.234      (un solo punto = decimal, criterio conservador)
 *   ""/"NA"    -> null
 */
export function parseSafeNumber(val: unknown): number | null {
  if (typeof val === 'number') return Number.isFinite(val) ? val : null;
  if (val === null || val === undefined) return null;

  let str = String(val).trim().replace(/\s| /g, '');
  if (str === '') return null;

  // Símbolos de moneda y porcentaje al inicio/final
  str = str.replace(/^[$€£]/, '').replace(/%$/, '');
  if (str === '') return null;

  const hasDot = str.includes('.');
  const hasComma = str.includes(',');

  if (hasDot && hasComma) {
    // El separador decimal es el que aparece más a la derecha.
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      str = str.replace(/,/g, '');
    }
  } else if (hasComma) {
    const parts = str.split(',');
    // Varias comas => separador de miles (1,234,567)
    if (parts.length > 2) str = parts.join('');
    else str = parts.join('.');
  } else if (hasDot) {
    const parts = str.split('.');
    if (parts.length > 2) str = parts.join('');
  }

  if (!/^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/.test(str)) return null;

  const num = Number(str);
  return Number.isFinite(num) ? num : null;
}

/** Serializa a CSV usando la UNIÓN de claves de todas las filas. */
export function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows || rows.length === 0) return '';

  const headers: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) { seen.add(key); headers.push(key); }
    }
  }

  const escape = (value: unknown): string => {
    const raw = value === null || value === undefined ? '' : String(value);
    return `"${raw.replace(/"/g, '""')}"`;
  };

  const lines = [headers.map(escape).join(',')];
  for (const row of rows) lines.push(headers.map((h) => escape(row[h])).join(','));
  return lines.join('\n');
}

/** Valores distintos de una columna (para el desplegable de métodos de cocción). */
export function uniqueValues(text: string, columnName: string): string[] {
  const { rows } = parseCsv(text);
  const set = new Set<string>();
  for (const row of rows) {
    const val = row[columnName];
    if (val !== undefined && String(val).trim() !== '') set.add(String(val).trim());
  }
  return Array.from(set);
}

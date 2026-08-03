/**
 * WienerCalc — Adaptador de Node/Electron para el generador de .xlsx.
 *
 * La construcción real del libro (XML + ZIP) vive en
 * `src/shared/xlsxExport.ts`, escrita sin `Buffer` para que el mismo código
 * también funcione en el navegador (ver `src/renderer/src/main.tsx`). Este
 * archivo sólo aporta la pieza que sí depende de Node: la compresión
 * `deflate` vía `zlib.deflateRawSync`.
 */

import { deflateRawSync } from 'node:zlib';
import {
  buildPrettyXlsx as buildPrettyXlsxCore,
  crc32 as crc32Core,
  colLetter,
  escapeXml,
  type XlsxOptions
} from '../shared/xlsxExport.ts';

export { colLetter, escapeXml };
export type { XlsxOptions };

/** Igual que `crc32` de xlsxExport, re-exportado para las pruebas. */
export function crc32(data: Uint8Array): number {
  return crc32Core(data);
}

function nodeDeflateRaw(data: Uint8Array): Uint8Array {
  const buf = deflateRawSync(Buffer.from(data.buffer, data.byteOffset, data.byteLength));
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

/**
 * Construye un .xlsx con encabezado en negrita/color, bordes finos, franjas
 * "cebra", ancho de columna ajustado al contenido, formato numérico
 * consistente por columna, fila de encabezado congelada y autofiltro.
 * Devuelve un `Buffer` de Node listo para `fs.writeFileSync`.
 */
export async function buildPrettyXlsx(
  rows: Record<string, unknown>[],
  headers: string[],
  options: XlsxOptions = {}
): Promise<Buffer> {
  const bytes = await buildPrettyXlsxCore(rows, headers, options, nodeDeflateRaw);
  return Buffer.from(bytes);
}

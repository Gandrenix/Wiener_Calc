/**
 * Contrato del puente `window.wienerApi`.
 *
 * Lo implementan dos veces con la MISMA firma:
 *  - `src/preload/preload.ts`      → Electron (IPC contra el proceso principal)
 *  - `src/renderer/src/main.tsx`   → navegador (File API + descargas)
 *
 * Sólo cambia la entrada/salida de archivos: el cálculo es idéntico en ambos
 * casos porque los dos llaman a `runEngine` de `src/shared/engine.ts`.
 */

import type { WienerWarning, NotFoundEntry, EngineStats } from './engine.ts';

export interface CalculationResponse {
  success: boolean;
  data?: Record<string, unknown>[];
  warnings?: WienerWarning[];
  notFound?: NotFoundEntry[];
  stats?: EngineStats;
  error?: string;
}

export interface CsvInspection {
  success: boolean;
  headers: string[];
  delimiter?: string;
  rowCount?: number;
  /** Primera fila de datos, para la vista previa en vivo de las fórmulas. */
  sampleRow?: Record<string, string>;
  error?: string;
}

export interface FileOpResponse {
  success: boolean;
  filePath?: string;
  canceled?: boolean;
  error?: string;
}

export interface LoadConfigResponse {
  success: boolean;
  data?: unknown;
  canceled?: boolean;
  error?: string;
}

export interface WienerApi {
  runCalculations: (configData: unknown) => Promise<CalculationResponse>;
  selectFile: () => Promise<string | null>;
  getCsvHeaders: (filePath: string) => Promise<string[]>;
  inspectCsv: (filePath: string) => Promise<CsvInspection>;
  scanUniqueValues: (filePath: string, columnName: string) => Promise<string[]>;
  saveCsv: (data: unknown[]) => Promise<FileOpResponse>;
  saveExcel: (data: unknown[]) => Promise<FileOpResponse>;
  saveReport: (text: string) => Promise<FileOpResponse>;
  saveConfig: (configData: unknown) => Promise<FileOpResponse>;
  loadConfig: () => Promise<LoadConfigResponse>;
  readFile: (filePath: string) => Promise<{ success: boolean; content?: string; error?: string }>;
  writeFile: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>;
}

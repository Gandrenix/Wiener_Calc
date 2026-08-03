/**
 * ⚠️ MÓDULO DE COMPATIBILIDAD — no añadir lógica aquí.
 *
 * El motor real vive ahora en `src/shared/engine.ts` y es isomorfo
 * (mismo código en Electron y en el navegador). Este archivo sólo mantiene
 * la firma anterior basada en rutas de archivo para no romper scripts
 * o perfiles antiguos.
 *
 * Motivo del cambio: existían dos motores independientes (éste y una copia
 * dentro de `src/renderer/src/main.tsx`) que habían divergido y devolvían
 * resultados distintos para los mismos archivos.
 */

import * as fs from 'fs';
import { runEngine, type WienerConfig, type EngineResult } from '../../shared/engine.ts';

export type {
  WienerConfig,
  EngineResult,
  CalculationRule,
  CookRule,
  ColumnAlias,
  WienerWarning,
  NotFoundEntry
} from '../../shared/engine.ts';

function readIfPresent(filePath?: string): string | undefined {
  if (!filePath) return undefined;
  return fs.readFileSync(filePath, 'utf8');
}

/** Ejecuta el motor leyendo los CSV desde disco. */
export function executeFoodCalcDetailed(config: WienerConfig): EngineResult {
  return runEngine(
    {
      foodsText: readIfPresent(config.foodsFilePath) ?? '',
      inputText: readIfPresent(config.inputFilePath) ?? '',
      recipesText: readIfPresent(config.recipesFilePath)
    },
    config
  );
}

/** @deprecated Devuelve sólo las filas; usa `executeFoodCalcDetailed` para ver avisos. */
export async function executeFoodCalc(config: WienerConfig): Promise<Record<string, unknown>[]> {
  return executeFoodCalcDetailed(config).rows;
}

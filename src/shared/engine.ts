/**
 * WienerCalc — Motor de cálculo unificado (isomorfo Node + navegador).
 *
 * ANTES existían DOS motores independientes: `src/main/engine/wienerEngine.ts`
 * (escritorio) y una copia a mano dentro de `src/renderer/src/main.tsx` (web).
 * Habían divergido y devolvían resultados distintos para los mismos archivos
 * (hasta un 123 % de diferencia en grasa total). Este módulo es ahora la ÚNICA
 * implementación: recibe TEXTO CSV, no rutas, así que corre igual en ambos lados.
 *
 * Cambios de comportamiento frente a la versión anterior:
 *  - Política de colisión de códigos explícita y reportada (antes: silenciosa
 *    y contradictoria entre web y escritorio).
 *  - Modo de tabla de recetas explícito (antes: heurística que confundía el
 *    id del sujeto con el id de la receta).
 *  - Los alimentos no encontrados se reportan siempre (antes: desaparecían al
 *    agrupar, subestimando la ingesta sin ningún aviso).
 *  - La columna de cantidad ya no se concatena como texto ("30030015").
 *  - Agrupación por varias columnas (sujeto + día).
 *  - Sin nombres de columna cableados en el código.
 *  - Fórmulas con evaluador seguro; los errores se reportan, no devuelven 0.
 */

import { parseCsv, parseSafeNumber, type CsvTable } from './csv.ts';
import { compileFormula, type CompiledFormula } from './formula.ts';

/* ------------------------------------------------------------------ */
/* Tipos                                                               */
/* ------------------------------------------------------------------ */

export interface CalculationRule { outputField: string; expression: string; }
export interface CookRule { method: string; reduceField: string; targetNutrients: string[]; }
export interface ColumnAlias { recipeCol: string; foodCol: string; }

/** Cómo interpretar el tercer archivo. */
export type RecipeMode =
  | 'auto'        // heurística, pero informando qué se decidió
  | 'merge'       // tabla de preparaciones ya calculadas (se fusiona con alimentos)
  | 'dictionary'; // diccionario receta -> ingredientes (se descompone)

/** Qué gana cuando un código existe en la tabla de alimentos y en la de recetas. */
export type CollisionPolicy = 'foods' | 'recipes';

/** Cómo está expresada la parte no comestible. */
export type NonEdibleUnit = 'fraction' | 'percent';

export interface WienerConfig {
  foodIdCol: string;
  inputIdCol: string;
  amountCol: string;
  inputScale: number;

  cookMethodCol?: string;
  nonEdibleCol?: string;
  nonEdibleUnit?: NonEdibleUnit;

  /** Agrupación por una o varias columnas (p. ej. ['id', 'dia']). */
  groupByCols?: string[];
  /** Columnas que nunca se suman (identificadores, orden, día, nombres…). */
  descriptiveCols?: string[];

  recipeMode?: RecipeMode;
  recipeIdCol?: string;
  recipeIngredientCol?: string;
  recipeAmountCol?: string;
  collisionPolicy?: CollisionPolicy;

  calculations: CalculationRule[];
  cookRules: CookRule[];
  columnAliases: ColumnAlias[];

  /** Rutas: sólo informativas para la interfaz, el motor no las usa. */
  foodsFilePath?: string;
  inputFilePath?: string;
  recipesFilePath?: string;

  /** @deprecated usar groupByCols. Se migra automáticamente. */
  groupByCol?: string;
}

export interface EngineInput {
  foodsText: string;
  inputText: string;
  recipesText?: string;
}

export type WarningLevel = 'info' | 'warn' | 'error';

export interface WienerWarning {
  level: WarningLevel;
  code: string;
  message: string;
  detail?: string;
}

export interface NotFoundEntry {
  id: string;
  records: number;
  totalAmount: number;
}

export interface EngineStats {
  foodsLoaded: number;
  recipesLoaded: number;
  mergedItems: number;
  inputRecords: number;
  processedRecords: number;
  skippedRecords: number;
  outputRows: number;
  collisions: number;
  recipeModeUsed: RecipeMode;
  delimiters: { foods: string; input: string; recipes?: string };
}

export interface EngineResult {
  rows: Record<string, unknown>[];
  warnings: WienerWarning[];
  notFound: NotFoundEntry[];
  stats: EngineStats;
}

/* ------------------------------------------------------------------ */
/* Normalización de configuración (compatibilidad con perfiles viejos) */
/* ------------------------------------------------------------------ */

export function normalizeConfig(input: unknown): WienerConfig {
  const raw = ((input ?? {}) as Record<string, any>);
  const groupByCols = Array.isArray(raw.groupByCols)
    ? raw.groupByCols.filter((c): c is string => typeof c === 'string' && c !== '')
    : typeof raw.groupByCol === 'string' && raw.groupByCol !== ''
      ? [raw.groupByCol]
      : [];

  const rawScale: unknown = raw.inputScale;

  return {
    foodIdCol: String(raw.foodIdCol ?? ''),
    inputIdCol: String(raw.inputIdCol ?? ''),
    amountCol: String(raw.amountCol ?? ''),
    // Si falta, se asume el valor habitual (gramos -> porciones de 100 g).
    // Si está presente pero es inválido, se conserva tal cual para que el
    // motor lo rechace con un mensaje claro en vez de calcular en silencio.
    inputScale: rawScale === undefined || rawScale === null || rawScale === '' ? 0.01 : Number(rawScale),
    cookMethodCol: raw.cookMethodCol ? String(raw.cookMethodCol) : '',
    nonEdibleCol: raw.nonEdibleCol ? String(raw.nonEdibleCol) : '',
    nonEdibleUnit: raw.nonEdibleUnit === 'percent' ? 'percent' : 'fraction',
    groupByCols,
    descriptiveCols: Array.isArray(raw.descriptiveCols)
      ? raw.descriptiveCols.filter((c): c is string => typeof c === 'string')
      : [],
    recipeMode: raw.recipeMode === 'merge' || raw.recipeMode === 'dictionary' ? raw.recipeMode : 'auto',
    recipeIdCol: raw.recipeIdCol ? String(raw.recipeIdCol) : '',
    recipeIngredientCol: raw.recipeIngredientCol ? String(raw.recipeIngredientCol) : '',
    recipeAmountCol: raw.recipeAmountCol ? String(raw.recipeAmountCol) : '',
    collisionPolicy: raw.collisionPolicy === 'recipes' ? 'recipes' : 'foods',
    calculations: Array.isArray(raw.calculations) ? (raw.calculations as CalculationRule[]) : [],
    cookRules: Array.isArray(raw.cookRules) ? (raw.cookRules as CookRule[]) : [],
    columnAliases: Array.isArray(raw.columnAliases) ? (raw.columnAliases as ColumnAlias[]) : [],
    foodsFilePath: raw.foodsFilePath ? String(raw.foodsFilePath) : '',
    inputFilePath: raw.inputFilePath ? String(raw.inputFilePath) : '',
    recipesFilePath: raw.recipesFilePath ? String(raw.recipesFilePath) : ''
  };
}

/** Nombres habituales de columnas descriptivas, sugeridos a la interfaz. */
export const COMMON_DESCRIPTIVE_COLUMNS = [
  'name', 'nombre', 'descripcion', 'descripción', 'description', 'alimento', 'food',
  'orden', 'order', 'dia', 'día', 'day', 'fecha', 'date',
  'tipocomi', 'tiempo_comida', 'comida', 'meal', 'grupo', 'group'
];

/* ------------------------------------------------------------------ */
/* Motor                                                               */
/* ------------------------------------------------------------------ */

const INTERNAL_FIELDS = ['_codigo', '_error', '_porcion', '_cantidad_total', '_registros', '_origen'];

export function runEngine(input: EngineInput, rawConfig: Partial<WienerConfig>): EngineResult {
  const config = normalizeConfig(rawConfig);
  const warnings: WienerWarning[] = [];

  const warn = (level: WarningLevel, code: string, message: string, detail?: string): void => {
    warnings.push({ level, code, message, detail });
  };

  /* --- 1. Validación de configuración --------------------------------- */

  if (!config.foodIdCol) warn('error', 'config', 'No se ha elegido la columna ID de la tabla de alimentos.');
  if (!config.inputIdCol) warn('error', 'config', 'No se ha elegido la columna ID de la tabla de consumo.');
  if (!config.amountCol) warn('error', 'config', 'No se ha elegido la columna de cantidad.');
  if (!Number.isFinite(config.inputScale) || config.inputScale <= 0) {
    warn('error', 'config', `La escala de entrada («${config.inputScale}») debe ser un número mayor que 0.`);
  }
  if (warnings.some((w) => w.level === 'error')) {
    throw new EngineConfigError(warnings.map((w) => w.message).join(' '), warnings);
  }

  /* --- 2. Tabla de alimentos ------------------------------------------ */

  const foodsTable = parseCsv(input.foodsText ?? '');
  if (foodsTable.headers.length === 0) {
    throw new EngineConfigError('La tabla de alimentos está vacía o no se pudo leer.', warnings);
  }
  if (!foodsTable.headers.includes(config.foodIdCol)) {
    throw new EngineConfigError(
      `La columna «${config.foodIdCol}» no existe en la tabla de alimentos. ` +
      `Columnas disponibles: ${foodsTable.headers.join(', ')}.`,
      warnings
    );
  }
  if (foodsTable.malformedRows > 0) {
    warn('warn', 'csv', `Tabla de alimentos: ${foodsTable.malformedRows} fila(s) con un número de campos distinto al de la cabecera.`);
  }

  const foodTable = new Map<string, Record<string, string>>();
  let duplicateFoods = 0;
  for (const row of foodsTable.rows) {
    const id = normalizeId(row[config.foodIdCol]);
    if (id === '') continue;
    if (foodTable.has(id)) duplicateFoods++;
    foodTable.set(id, row);
  }
  if (duplicateFoods > 0) {
    warn('warn', 'duplicados', `La tabla de alimentos tiene ${duplicateFoods} código(s) repetido(s); se usó la última aparición de cada uno.`);
  }
  if (foodTable.size === 0) {
    throw new EngineConfigError(
      `No se cargó ningún alimento. Revisa que «${config.foodIdCol}» sea realmente la columna de códigos.`,
      warnings
    );
  }

  /* --- 3. Tabla de recetas -------------------------------------------- */

  const recipeTable = new Map<string, { ingredientId: string; amount: number }[]>();
  let recipeModeUsed: RecipeMode = 'merge';
  let mergedItems = 0;
  let collisions = 0;
  let recipesTable: CsvTable | null = null;

  const hasRecipes = typeof input.recipesText === 'string' && input.recipesText.trim() !== '';

  if (hasRecipes) {
    recipesTable = parseCsv(input.recipesText as string);
    if (recipesTable.headers.length === 0) {
      warn('warn', 'recetas', 'El archivo de recetas está vacío; se ignoró.');
      recipesTable = null;
    }
  }

  if (recipesTable) {
    const resolved = resolveRecipeMode(config, recipesTable, warn);
    recipeModeUsed = resolved.mode;

    if (resolved.mode === 'dictionary') {
      const { idCol, ingredientCol, amountCol } = resolved;
      for (const row of recipesTable.rows) {
        const recipeId = normalizeId(row[idCol]);
        const ingredientId = normalizeId(row[ingredientCol]);
        const amount = parseSafeNumber(row[amountCol]) ?? 0;
        if (recipeId === '' || ingredientId === '') continue;
        if (!recipeTable.has(recipeId)) recipeTable.set(recipeId, []);
        recipeTable.get(recipeId)!.push({ ingredientId, amount });
      }

      // Recetas cuyos ingredientes suman 0: no se pueden escalar.
      let zeroSum = 0;
      for (const [, ingredients] of recipeTable) {
        if (ingredients.reduce((s, i) => s + i.amount, 0) <= 0) zeroSum++;
      }
      if (zeroSum > 0) {
        warn('warn', 'recetas', `${zeroSum} receta(s) tienen cantidades de ingredientes que suman 0; sus ingredientes se usarán sin escalar.`);
      }

      // Ingredientes que no existen en la tabla de alimentos.
      const orphan = new Set<string>();
      for (const [, ingredients] of recipeTable) {
        for (const ing of ingredients) {
          if (!foodTable.has(ing.ingredientId) && !recipeTable.has(ing.ingredientId)) orphan.add(ing.ingredientId);
        }
      }
      if (orphan.size > 0) {
        warn('warn', 'recetas', `${orphan.size} ingrediente(s) de las recetas no existen en la tabla de alimentos.`, Array.from(orphan).slice(0, 25).join(', '));
      }

      // Un código que es a la vez receta y alimento: la receta tiene prioridad
      // al expandir, así que hay que decirlo explícitamente.
      const shadowed: string[] = [];
      for (const [recipeId] of recipeTable) if (foodTable.has(recipeId)) shadowed.push(recipeId);
      if (shadowed.length > 0) {
        warn(
          'warn',
          'colision',
          `${shadowed.length} código(s) son a la vez receta y alimento; se descompusieron como RECETA.`,
          shadowed.slice(0, 25).join(', ')
        );
      }

      warn('info', 'recetas', `Modo diccionario: ${recipeTable.size} receta(s) cargada(s) desde «${idCol}» → «${ingredientCol}» (cantidad: «${amountCol}»).`);
    } else {
      // Modo fusión: traducir alias e insertar respetando la política de colisión.
      const aliasMap: Record<string, string> = {};
      for (const alias of config.columnAliases) {
        if (alias.recipeCol && alias.foodCol) aliasMap[alias.recipeCol] = alias.foodCol;
      }

      const collidingIds: string[] = [];
      for (const rawRow of recipesTable.rows) {
        const translated: Record<string, string> = {};
        for (const key of Object.keys(rawRow)) translated[aliasMap[key] ?? key] = rawRow[key];

        const id = normalizeId(translated[config.foodIdCol]);
        if (id === '') continue;

        if (foodTable.has(id)) {
          collisions++;
          if (collidingIds.length < 25) collidingIds.push(id);
          if (config.collisionPolicy === 'foods') continue; // gana la tabla de alimentos
        }
        foodTable.set(id, translated);
        mergedItems++;
      }

      if (collisions > 0) {
        const winner = config.collisionPolicy === 'foods' ? 'la TABLA DE ALIMENTOS' : 'la TABLA DE RECETAS';
        warn(
          'warn',
          'colision',
          `${collisions} código(s) existen en ambas tablas. Se aplicó la política elegida: gana ${winner}.`,
          collidingIds.join(', ') + (collisions > collidingIds.length ? ', …' : '')
        );
      }
      warn('info', 'recetas', `Modo fusión: ${mergedItems} preparación(es) incorporada(s) a la tabla de alimentos.`);

      if (config.columnAliases.length === 0 && recipesTable.headers.some((h) => !foodsTable.headers.includes(h))) {
        warn('warn', 'alias', 'La tabla de recetas tiene columnas con nombres distintos a la tabla de alimentos y no se definió ningún alias: esos nutrientes no se sumarán.');
      }
    }
  }

  /* --- 4. Tabla de consumo -------------------------------------------- */

  const inputTable = parseCsv(input.inputText ?? '');
  if (inputTable.headers.length === 0) {
    throw new EngineConfigError('La tabla de consumo está vacía o no se pudo leer.', warnings);
  }
  if (!inputTable.headers.includes(config.inputIdCol)) {
    throw new EngineConfigError(
      `La columna «${config.inputIdCol}» no existe en la tabla de consumo. ` +
      `Columnas disponibles: ${inputTable.headers.join(', ')}.`,
      warnings
    );
  }
  if (!inputTable.headers.includes(config.amountCol)) {
    throw new EngineConfigError(
      `La columna de cantidad «${config.amountCol}» no existe en la tabla de consumo. ` +
      `Columnas disponibles: ${inputTable.headers.join(', ')}.`,
      warnings
    );
  }
  if (inputTable.malformedRows > 0) {
    warn('warn', 'csv', `Tabla de consumo: ${inputTable.malformedRows} fila(s) con un número de campos distinto al de la cabecera.`);
  }

  for (const col of config.groupByCols ?? []) {
    if (!inputTable.headers.includes(col) && !foodsTable.headers.includes(col)) {
      warn('warn', 'agrupacion', `La columna de agrupación «${col}» no existe en ninguna de las tablas cargadas.`);
    }
  }

  /* --- 5. Universo de columnas y campos que no se escalan -------------- */

  const nutrientUniverse = collectNumericColumns(foodTable);
  const factorFields = buildFactorFields(config, inputTable.headers);

  /* --- 6. Compilar las fórmulas UNA sola vez --------------------------- */

  const formulaUniverse = Array.from(new Set([...nutrientUniverse, ...foodsTable.headers, ...inputTable.headers]));
  const compiled: { rule: CalculationRule; formula: CompiledFormula }[] = [];
  for (const rule of config.calculations) {
    if (!rule.outputField || rule.outputField.trim() === '') {
      warn('warn', 'formula', 'Hay una regla sin nombre de campo de salida; se ignoró.');
      continue;
    }
    const formula = compileFormula(rule.expression, formulaUniverse);
    if (formula.error) {
      warn('error', 'formula', `Regla «${rule.outputField}»: ${formula.error}`, rule.expression);
      continue;
    }
    compiled.push({ rule, formula });
  }

  /* --- 7. Reglas de cocción ------------------------------------------- */

  if (config.cookRules.length > 0 && !config.cookMethodCol) {
    warn('warn', 'coccion', 'Hay reglas de cocción definidas pero no se eligió la columna de método de cocción; no se aplicarán.');
  }
  for (const rule of config.cookRules) {
    if (rule.reduceField && !foodsTable.headers.includes(rule.reduceField)) {
      warn('warn', 'coccion', `La columna de reducción «${rule.reduceField}» no existe en la tabla de alimentos.`);
    }
    if (rule.targetNutrients.length === 0) {
      warn('warn', 'coccion', `La regla de cocción «${rule.method}» no tiene nutrientes objetivo marcados; no hará nada.`);
    }
  }

  /* --- 8. Procesar cada registro de consumo --------------------------- */

  const notFoundMap = new Map<string, NotFoundEntry>();
  const rows: Record<string, unknown>[] = [];
  const formulaRuntimeErrors = new Map<string, number>();
  const formulaMissingCols = new Map<string, Set<string>>();
  let processedRecords = 0;
  let skippedRecords = 0;
  let invalidAmounts = 0;

  for (const inputRow of inputTable.rows) {
    const itemId = normalizeId(inputRow[config.inputIdCol]);
    if (itemId === '') { skippedRecords++; continue; }

    const rawAmount = parseSafeNumber(inputRow[config.amountCol]);
    if (rawAmount === null) invalidAmounts++;
    const amount = rawAmount ?? 0;

    const cookMethod = config.cookMethodCol && inputRow[config.cookMethodCol]
      ? String(inputRow[config.cookMethodCol])
      : undefined;

    const expanded = expandItem(itemId, amount, cookMethod, 0);

    for (const item of expanded) {
      if (item._error) {
        const id = String(item._codigo);
        const entry = notFoundMap.get(id) ?? { id, records: 0, totalAmount: 0 };
        entry.records++;
        entry.totalAmount += Number(item._porcion ?? 0);
        notFoundMap.set(id, entry);
        // La fila se conserva SIN agrupar para que el usuario la vea;
        // al agrupar se excluye y se reporta aparte.
      }
      rows.push({ ...inputRow, ...item });
      processedRecords++;
    }
  }

  if (invalidAmounts > 0) {
    warn('warn', 'cantidad', `${invalidAmounts} registro(s) tienen una cantidad vacía o no numérica en «${config.amountCol}»; se tomaron como 0.`);
  }

  if (notFoundMap.size > 0) {
    const list = Array.from(notFoundMap.values()).sort((a, b) => b.records - a.records);
    const totalRecords = list.reduce((s, e) => s + e.records, 0);
    warn(
      'warn',
      'no_encontrado',
      `${list.length} código(s) no existen en la tabla de alimentos: ${totalRecords} registro(s) quedaron fuera del cálculo.`,
      list.slice(0, 25).map((e) => `${e.id} (${e.records})`).join(', ')
    );
  }

  /* --- 9. Agrupación --------------------------------------------------- */

  const groupByCols = (config.groupByCols ?? []).filter((c) => c !== '');
  let outputRows: Record<string, unknown>[];

  if (groupByCols.length > 0) {
    outputRows = groupRows(rows, groupByCols, factorFields, config, warn);
  } else {
    outputRows = rows;
  }

  /* --- 10. Aplicar fórmulas ------------------------------------------- */

  for (const row of outputRows) {
    // En las filas de error no hay nutrientes: aplicar la fórmula daría un 0
    // engañoso. Se dejan vacías.
    if (row._error) {
      for (const { rule } of compiled) row[rule.outputField] = null;
      continue;
    }
    for (const { rule, formula } of compiled) {
      const result = formula.evaluate(row);
      row[rule.outputField] = result.value;
      if (result.error) {
        formulaRuntimeErrors.set(rule.outputField, (formulaRuntimeErrors.get(rule.outputField) ?? 0) + 1);
      }
      if (result.missing) {
        if (!formulaMissingCols.has(rule.outputField)) formulaMissingCols.set(rule.outputField, new Set());
        for (const m of result.missing) formulaMissingCols.get(rule.outputField)!.add(m);
      }
    }
  }

  for (const [field, count] of formulaRuntimeErrors) {
    warn('warn', 'formula', `La regla «${field}» no se pudo calcular en ${count} fila(s); esas celdas quedaron vacías (no en 0).`);
  }
  for (const [field, cols] of formulaMissingCols) {
    warn('warn', 'formula', `La regla «${field}» usa columnas ausentes en algunas filas (se tomaron como 0): ${Array.from(cols).join(', ')}.`);
  }

  /* --- 11. Resultado --------------------------------------------------- */

  return {
    rows: outputRows,
    warnings,
    notFound: Array.from(notFoundMap.values()).sort((a, b) => b.records - a.records),
    stats: {
      foodsLoaded: foodTable.size,
      recipesLoaded: recipeTable.size,
      mergedItems,
      inputRecords: inputTable.rows.length,
      processedRecords,
      skippedRecords,
      outputRows: outputRows.length,
      collisions,
      recipeModeUsed: recipesTable ? recipeModeUsed : 'auto',
      delimiters: {
        foods: describeDelimiter(foodsTable.delimiter),
        input: describeDelimiter(inputTable.delimiter),
        recipes: recipesTable ? describeDelimiter(recipesTable.delimiter) : undefined
      }
    }
  };

  /* ---------------- funciones internas ---------------- */

  /** Expande un ítem: si es receta, se descompone en ingredientes. */
  function expandItem(
    itemId: string,
    amount: number,
    cookMethod: string | undefined,
    depth: number
  ): Record<string, unknown>[] {
    if (depth > 10) {
      return [{ _codigo: itemId, _porcion: amount, _error: `Receta circular detectada en el código ${itemId}.` }];
    }

    const recipe = recipeTable.get(itemId);
    if (recipe) {
      const recipeSum = recipe.reduce((sum, ing) => sum + (ing.amount || 0), 0);
      const out: Record<string, unknown>[] = [];
      for (const ing of recipe) {
        const share = recipeSum > 0 ? (ing.amount / recipeSum) * amount : ing.amount * amount;
        out.push(...expandItem(ing.ingredientId, share, cookMethod, depth + 1));
      }
      if (out.length === 0) {
        return [{ _codigo: itemId, _porcion: amount, _error: `La receta ${itemId} no tiene ingredientes válidos.` }];
      }
      return out;
    }

    const foodData = foodTable.get(itemId);
    if (!foodData) {
      return [{ _codigo: itemId, _porcion: amount, _error: `El código ${itemId} no existe en la tabla de alimentos ni en las recetas.` }];
    }

    // Parte no comestible
    let edibleFactor = 1;
    if (config.nonEdibleCol) {
      const raw = parseSafeNumber(foodData[config.nonEdibleCol]);
      if (raw !== null) {
        const fraction = config.nonEdibleUnit === 'percent' ? raw / 100 : raw;
        if (fraction < 0 || fraction >= 1) {
          warnOnce(
            'no_comestible',
            `La columna de parte no comestible «${config.nonEdibleCol}» tiene valores fuera de rango (ej. ${raw}). ` +
            `¿Está expresada en ${config.nonEdibleUnit === 'percent' ? 'fracción (0–1)' : 'porcentaje (0–100)'}? Se ignoró para no anular los nutrientes.`
          );
        } else {
          edibleFactor = 1 - fraction;
        }
      }
    }

    const portion = amount * config.inputScale * edibleFactor;
    const row: Record<string, unknown> = { _codigo: itemId, _porcion: round4(portion), _origen: 'alimento' };

    for (const key of Object.keys(foodData)) {
      const value = foodData[key];
      if (factorFields.has(key)) { row[key] = value; continue; }
      const num = parseSafeNumber(value);
      row[key] = num === null ? value : round4(num * portion);
    }

    // Reducción por cocción
    if (cookMethod) {
      const method = cookMethod.trim().toLowerCase();
      const rule = config.cookRules.find((r) => r.method.trim().toLowerCase() === method);
      if (rule && rule.reduceField) {
        const loss = parseSafeNumber(foodData[rule.reduceField]);
        if (loss !== null) {
          const retention = Math.max(0, 1 - (loss > 1 ? loss / 100 : loss));
          for (const nutrient of rule.targetNutrients) {
            const key = nutrient.trim();
            if (typeof row[key] === 'number') row[key] = round4((row[key] as number) * retention);
          }
        }
      }
    }

    return [row];
  }

  function warnOnce(code: string, message: string): void {
    if (warnings.some((w) => w.code === code && w.message === message)) return;
    warn('warn', code, message);
  }
}

/* ------------------------------------------------------------------ */
/* Auxiliares                                                          */
/* ------------------------------------------------------------------ */

export class EngineConfigError extends Error {
  warnings: WienerWarning[];
  constructor(message: string, warnings: WienerWarning[]) {
    super(message);
    this.name = 'EngineConfigError';
    this.warnings = warnings;
  }
}

/** Normaliza un código: quita espacios y el `.0` que añaden algunas hojas de cálculo. */
function normalizeId(value: unknown): string {
  if (value === null || value === undefined) return '';
  let str = String(value).trim();
  if (str === '' || str.toLowerCase() === 'undefined' || str.toLowerCase() === 'null') return '';
  if (/^-?\d+\.0+$/.test(str)) str = str.replace(/\.0+$/, '');
  return str;
}

function round4(value: number): number {
  return Number(value.toFixed(4));
}

function describeDelimiter(d: string): string {
  if (d === '\t') return 'tabulador';
  return d;
}

/** Columnas de la tabla de alimentos con al menos un valor numérico. */
function collectNumericColumns(foodTable: Map<string, Record<string, string>>): string[] {
  const numeric = new Set<string>();
  let inspected = 0;
  for (const [, row] of foodTable) {
    for (const key of Object.keys(row)) {
      if (parseSafeNumber(row[key]) !== null) numeric.add(key);
    }
    if (++inspected >= 200) break;
  }
  return Array.from(numeric);
}

/**
 * Campos que NO se multiplican por la porción ni se suman al agrupar.
 * Se derivan del mapeo del usuario: ya no hay nombres cableados en el motor.
 */
function buildFactorFields(config: WienerConfig, inputHeaders: string[]): Set<string> {
  const fields = new Set<string>(INTERNAL_FIELDS);
  fields.add(config.foodIdCol);
  fields.add(config.inputIdCol);
  fields.add(config.amountCol);
  if (config.cookMethodCol) fields.add(config.cookMethodCol);
  if (config.nonEdibleCol) fields.add(config.nonEdibleCol);
  for (const col of config.groupByCols ?? []) fields.add(col);
  for (const col of config.descriptiveCols ?? []) fields.add(col);
  for (const rule of config.cookRules) if (rule.reduceField) fields.add(rule.reduceField);
  // La columna de cantidad y los identificadores del consumo nunca se suman.
  if (inputHeaders.includes(config.amountCol)) fields.add(config.amountCol);
  fields.delete('');
  return fields;
}

/** Agrupa por una o varias columnas sumando estrictamente lo numérico. */
function groupRows(
  rows: Record<string, unknown>[],
  groupByCols: string[],
  factorFields: Set<string>,
  config: WienerConfig,
  warn: (level: WarningLevel, code: string, message: string, detail?: string) => void
): Record<string, unknown>[] {
  const KEY_SEP = '\u0001';
  const groups = new Map<string, Record<string, unknown>>();
  /** Por grupo: columnas descriptivas cuyo valor NO es constante dentro del grupo. */
  const varying = new Map<string, Set<string>>();
  let excludedErrors = 0;
  let missingKey = 0;

  for (const row of rows) {
    if (row._error) { excludedErrors++; continue; }

    const keyParts = groupByCols.map((c) => (row[c] === undefined || row[c] === null ? '' : String(row[c])));
    if (keyParts.every((p) => p === '')) { missingKey++; continue; }
    const key = keyParts.join(KEY_SEP);

    let group = groups.get(key);
    if (!group) {
      group = {};
      for (const col of groupByCols) group[col] = row[col];
      group._registros = 0;
      group._cantidad_total = 0;
      groups.set(key, group);
      varying.set(key, new Set<string>());
    }
    const groupVarying = varying.get(key) as Set<string>;

    group._registros = (group._registros as number) + 1;

    const amountValue = parseSafeNumber(row[config.amountCol]);
    if (amountValue !== null) group._cantidad_total = (group._cantidad_total as number) + amountValue;

    const portion = parseSafeNumber(row._porcion);
    if (portion !== null) group._porcion = (parseSafeNumber(group._porcion) ?? 0) + portion;

    for (const column of Object.keys(row)) {
      if (groupByCols.includes(column)) continue;
      if (column === '_porcion') continue;

      const value = row[column];

      // Campos descriptivos / de control: NO se suman. Se conserva el primer
      // valor; si dentro del grupo aparecen valores distintos, la columna se
      // renombra a `primer_<col>` para no dar a entender que describe a todo
      // el grupo (antes ponía `name: "Raw Potato"` en una fila que agregaba
      // papa + aceite de oliva).
      if (factorFields.has(column) || INTERNAL_FIELDS.includes(column)) {
        if (group[column] === undefined) group[column] = value;
        else if (String(group[column]) !== String(value)) groupVarying.add(column);
        continue;
      }

      const num = parseSafeNumber(value);
      if (num !== null) {
        // Coerción explícita: antes `("300" || 0) + 15` producía "30015".
        const previous = parseSafeNumber(group[column]) ?? 0;
        group[column] = previous + num;
      } else if (group[column] === undefined) {
        group[column] = value;
      }
    }
  }

  if (excludedErrors > 0) {
    warn('warn', 'no_encontrado', `${excludedErrors} registro(s) con código no encontrado se excluyeron de los totales agrupados.`);
  }
  if (missingKey > 0) {
    warn('warn', 'agrupacion', `${missingKey} registro(s) no tienen valor en las columnas de agrupación y quedaron fuera.`);
  }

  const output: Record<string, unknown>[] = [];
  for (const [key, group] of groups) {
    const groupVarying = varying.get(key) ?? new Set<string>();
    const final: Record<string, unknown> = {};
    for (const column of Object.keys(group)) {
      const value = typeof group[column] === 'number' ? round4(group[column] as number) : group[column];
      if (groupVarying.has(column)) {
        final[column.startsWith('_') ? `primer${column}` : `primer_${column}`] = value;
      } else {
        final[column] = value;
      }
    }
    output.push(final);
  }
  return output;
}

/** Decide el modo de la tabla de recetas y qué columnas usar. */
function resolveRecipeMode(
  config: WienerConfig,
  recipes: CsvTable,
  warn: (level: WarningLevel, code: string, message: string, detail?: string) => void
): { mode: 'merge' } | { mode: 'dictionary'; idCol: string; ingredientCol: string; amountCol: string } {
  const headers = recipes.headers;
  const pick = (candidates: string[]): string =>
    headers.find((h) => candidates.some((c) => h.toLowerCase() === c)) ?? '';

  if (config.recipeMode === 'merge') return { mode: 'merge' };

  if (config.recipeMode === 'dictionary') {
    const idCol = config.recipeIdCol || pick(['recipe_id', 'id_receta', 'cod_receta', 'receta']);
    const ingredientCol = config.recipeIngredientCol || pick(['ingredient_id', 'cod_b', 'ingrediente', 'codalim']);
    const amountCol = config.recipeAmountCol || pick(['amount', 'cantiprep', 'cantidad', 'peso']);

    const missing: string[] = [];
    if (!idCol || !headers.includes(idCol)) missing.push('columna de receta');
    if (!ingredientCol || !headers.includes(ingredientCol)) missing.push('columna de ingrediente');
    if (!amountCol || !headers.includes(amountCol)) missing.push('columna de cantidad');

    if (missing.length > 0) {
      warn(
        'warn',
        'recetas',
        `Modo diccionario seleccionado pero falta ${missing.join(', ')}. Se usará el modo fusión.`,
        `Columnas del archivo: ${headers.join(', ')}`
      );
      return { mode: 'merge' };
    }
    return { mode: 'dictionary', idCol, ingredientCol, amountCol };
  }

  /* --- auto --- */
  const idCol = pick(['recipe_id', 'id_receta', 'cod_receta']);
  const ingredientCol = pick(['ingredient_id']);
  const amountCol = pick(['amount', 'cantiprep', 'cantidad']);

  if (idCol && ingredientCol && amountCol) {
    warn('info', 'recetas', `Detección automática: diccionario de ingredientes («${idCol}» → «${ingredientCol}»).`);
    return { mode: 'dictionary', idCol, ingredientCol, amountCol };
  }

  // La heurística anterior confundía la columna `id` (que en `ejemreceta.csv`
  // es el sujeto) con el identificador de la receta. Ya no se asume: se avisa.
  if (headers.includes('cod_b') && headers.includes('id') && amountCol) {
    warn(
      'warn',
      'recetas',
      'El archivo de recetas tiene columnas «id» y «cod_b». Puede ser un diccionario de ingredientes, ' +
      'pero «id» también suele ser el identificador del sujeto. Se usó el modo FUSIÓN; ' +
      'si querías descomponer por ingredientes, elige el modo «Diccionario» en la pestaña 1.',
      `Columnas: ${headers.join(', ')}`
    );
    return { mode: 'merge' };
  }

  warn('info', 'recetas', 'Detección automática: tabla de preparaciones precalculadas (modo fusión).');
  return { mode: 'merge' };
}

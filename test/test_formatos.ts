/**
 * WienerCalc — Pruebas de detección de formato y de casos de uso.
 *
 * Ejecutar con:  npm run test:formatos   (o `npm test`, que corre ambas suites)
 *
 * Comprueba que el mismo contenido, guardado en formatos distintos (los que
 * genera Excel según la configuración regional), produce EXACTAMENTE el mismo
 * resultado; y que el cálculo funciona igual con recetas y sin recetas.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { runEngine, type WienerConfig } from '../src/shared/engine.ts';
import { parseCsvHeaders } from '../src/shared/csv.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const read = (name: string): string => fs.readFileSync(path.join(HERE, name), 'utf8');

let passed = 0;
const failures: string[] = [];

function test(name: string, fn: () => true | string): void {
  try {
    const outcome = fn();
    if (outcome === true) { passed++; console.log('  ok  ' + name); }
    else { failures.push(`${name} — ${outcome}`); console.log('  XX  ' + name + ' -> ' + outcome); }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    failures.push(`${name} — excepción: ${message}`);
    console.log('  XX  ' + name + ' -> excepción: ' + message);
  }
}

/* ================================================================== */
/* A. El mismo contenido en formatos distintos                         */
/* ================================================================== */

console.log('\n[A] El mismo dataset guardado en formatos distintos');

const foodRows = [['food_id', 'protein', 'fat'], ['101', '31', '3.6'], ['102', '2', '0.1']];
const inputRows = [['person_id', 'food_id', 'amount_grams'], ['P1', '101', '200'], ['P1', '102', '300']];

interface BuildOptions { bom?: boolean; crlf?: boolean; quote?: boolean; decimalComma?: boolean }

function build(table: string[][], delimiter: string, options: BuildOptions = {}): string {
  const newline = options.crlf ? '\r\n' : '\n';
  const body = table
    .map((row) => row.map((cell) => {
      let value = cell;
      if (options.decimalComma && /^\d+\.\d+$/.test(value)) value = value.replace('.', ',');
      return options.quote ? `"${value}"` : value;
    }).join(delimiter))
    .join(newline);
  return (options.bom ? '﻿' : '') + body + newline;
}

const baseConfig: Partial<WienerConfig> = {
  foodIdCol: 'food_id', inputIdCol: 'food_id', amountCol: 'amount_grams', inputScale: 0.01,
  groupByCols: ['person_id'], calculations: [], cookRules: [], columnAliases: []
};

const reference = runEngine(
  { foodsText: build(foodRows, ','), inputText: build(inputRows, ',') },
  baseConfig
).rows[0];

const variants: Record<string, [string, string]> = {
  'separador coma': [build(foodRows, ','), build(inputRows, ',')],
  'separador punto y coma': [build(foodRows, ';'), build(inputRows, ';')],
  'separador tabulador': [build(foodRows, '\t'), build(inputRows, '\t')],
  'separador barra vertical': [build(foodRows, '|'), build(inputRows, '|')],
  'BOM + finales CRLF': [build(foodRows, ',', { bom: true, crlf: true }), build(inputRows, ',', { bom: true, crlf: true })],
  'todo entrecomillado': [build(foodRows, ',', { quote: true }), build(inputRows, ',', { quote: true })],
  'punto y coma + coma decimal': [build(foodRows, ';', { decimalComma: true }), build(inputRows, ';')],
  'archivos con formatos distintos entre sí': [build(foodRows, ';', { decimalComma: true, bom: true }), build(inputRows, ',')]
};

for (const [name, [foodsText, inputText]] of Object.entries(variants)) {
  test(name, () => {
    const row = runEngine({ foodsText, inputText }, baseConfig).rows[0];
    return (row.protein === reference.protein && row.fat === reference.fat)
      || `protein=${row.protein} fat=${row.fat} (referencia ${reference.protein}/${reference.fat})`;
  });
}

/* ================================================================== */
/* B. Rarezas habituales de los archivos reales                        */
/* ================================================================== */

console.log('\n[B] Rarezas habituales de los archivos');

const simpleInput = 'person_id,food_id,amount_grams\nP1,101,100\n';

test('cabecera con espacios sobrantes', () => {
  const row = runEngine({ foodsText: ' food_id , protein \n101,31\n', inputText: simpleInput }, baseConfig).rows[0];
  return row.protein === 31 || JSON.stringify(row);
});

test('ID exportado por Excel como 101.0', () => {
  const row = runEngine({ foodsText: 'food_id,protein\n101.0,31\n', inputText: simpleInput }, baseConfig).rows[0];
  return row.protein === 31 || JSON.stringify(row);
});

test('ID con ceros a la izquierda', () => {
  const row = runEngine({ foodsText: 'food_id,protein\n0012,31\n', inputText: 'person_id,food_id,amount_grams\nP1,0012,100\n' }, baseConfig).rows[0];
  return row.protein === 31 || JSON.stringify(row);
});

test('cantidad vacía se toma como 0 y se avisa', () => {
  const result = runEngine({ foodsText: 'food_id,protein\n101,31\n', inputText: 'person_id,food_id,amount_grams\nP1,101,\n' }, baseConfig);
  return (result.rows[0].protein === 0 && result.warnings.some((w) => w.code === 'cantidad')) || JSON.stringify(result.warnings);
});

test('celda de nutriente vacía no rompe la fila', () => {
  const row = runEngine({ foodsText: 'food_id,protein,fat\n101,31,\n', inputText: simpleInput }, baseConfig).rows[0];
  return row.protein === 31 || JSON.stringify(row);
});

test('nutriente con texto (n/d) no rompe la fila', () => {
  const row = runEngine({ foodsText: 'food_id,protein,fat\n101,31,n/d\n', inputText: simpleInput }, baseConfig).rows[0];
  return row.protein === 31 || JSON.stringify(row);
});

test('fila con campos de más genera aviso', () => {
  const result = runEngine({ foodsText: 'food_id,protein\n101,31,99\n', inputText: simpleInput }, baseConfig);
  return result.warnings.some((w) => w.code === 'csv') || 'no se avisó';
});

test('código duplicado en la tabla de alimentos genera aviso', () => {
  const result = runEngine({ foodsText: 'food_id,protein\n101,31\n101,40\n', inputText: simpleInput }, baseConfig);
  return result.warnings.some((w) => w.code === 'duplicados') || 'no se avisó';
});

test('cabeceras repetidas se desambiguan', () => {
  const headers = parseCsvHeaders('a,a,b\n').headers;
  return JSON.stringify(headers) === '["a","a_2","b"]' || JSON.stringify(headers);
});

test('archivo con una sola columna', () => {
  const result = runEngine({ foodsText: 'food_id\n101\n', inputText: simpleInput }, baseConfig);
  return result.rows.length === 1 || JSON.stringify(result.rows);
});

/* ================================================================== */
/* C. Datasets reales: con recetas y sin recetas                       */
/* ================================================================== */

console.log('\n[C] Datasets reales: con recetas y sin recetas');

const realConfig: Partial<WienerConfig> = {
  foodIdCol: 'codalim', inputIdCol: 'codalim', amountCol: 'cantidad', inputScale: 0.01,
  groupByCols: ['id'], descriptiveCols: ['orden', 'dia', 'tipocomi'],
  calculations: [{ outputField: 'cal_from_fat', expression: 'grasatot_g * 9' }],
  cookRules: [],
  columnAliases: [
    { recipeCol: 'cod_b', foodCol: 'codalim' },
    { recipeCol: 'Kcal', foodCol: 'kcal' },
    { recipeCol: 'Pro. g.', foodCol: 'proteina_g' },
    { recipeCol: 'GT. g.', foodCol: 'grasatot_g' },
    { recipeCol: 'CHO. g.', foodCol: 'Carboh_g' }
  ]
};

const tpaisa = read('tpaisa.csv');
const ingesta = read('ejemingre.csv');
const recetas = read('trecetas.csv');

test('SIN archivo de recetas', () => {
  const r = runEngine({ foodsText: tpaisa, inputText: ingesta }, realConfig);
  return (r.rows.length === 1 && typeof r.rows[0].kcal === 'number' && r.stats.recipesLoaded === 0) || JSON.stringify(r.stats);
});

test('CON recetas en modo fusión', () => {
  const r = runEngine({ foodsText: tpaisa, inputText: ingesta, recipesText: recetas }, { ...realConfig, recipeMode: 'merge' });
  return (r.rows.length === 1 && r.stats.mergedItems > 0) || JSON.stringify(r.stats);
});

test('CON recetas en modo automático', () => {
  const r = runEngine({ foodsText: tpaisa, inputText: ingesta, recipesText: recetas }, { ...realConfig, recipeMode: 'auto' });
  return r.stats.recipeModeUsed === 'merge' || String(r.stats.recipeModeUsed);
});

test('archivo de recetas vacío se ignora sin romper nada', () => {
  const r = runEngine({ foodsText: tpaisa, inputText: ingesta, recipesText: '   ' }, realConfig);
  return r.rows.length === 1 || JSON.stringify(r.stats);
});

test('sin agrupar devuelve una fila por registro', () => {
  const r = runEngine({ foodsText: tpaisa, inputText: ingesta }, { ...realConfig, groupByCols: [] });
  return r.rows.length === 127 || `filas=${r.rows.length}`;
});

test('agrupado por sujeto y día', () => {
  const r = runEngine({ foodsText: tpaisa, inputText: ingesta }, { ...realConfig, groupByCols: ['id', 'dia'] });
  return r.rows.length === 2 || `filas=${r.rows.length}`;
});

test('agrupado por tiempo de comida', () => {
  const r = runEngine({ foodsText: tpaisa, inputText: ingesta }, { ...realConfig, groupByCols: ['tipocomi'], descriptiveCols: ['orden', 'dia'] });
  return r.rows.length > 1 || `filas=${r.rows.length}`;
});

test('ejemreceta.csv como diccionario explícito', () => {
  const r = runEngine(
    { foodsText: tpaisa, inputText: ingesta, recipesText: read('ejemreceta.csv') },
    { ...realConfig, recipeMode: 'dictionary', recipeIdCol: 'id', recipeIngredientCol: 'cod_b', recipeAmountCol: 'cantiprep' }
  );
  return r.stats.recipesLoaded > 0 || JSON.stringify(r.stats);
});

test('modo diccionario sin columnas válidas avisa y usa fusión', () => {
  const r = runEngine({ foodsText: tpaisa, inputText: ingesta, recipesText: recetas }, { ...realConfig, recipeMode: 'dictionary' });
  return r.warnings.some((w) => w.message.includes('modo fusión')) || JSON.stringify(r.warnings.map((w) => w.message));
});

test('reglas de cocción sobre el dataset real', () => {
  const r = runEngine({ foodsText: tpaisa, inputText: ingesta }, {
    ...realConfig, cookMethodCol: 'tipocomi',
    cookRules: [{ method: '2', reduceField: 'Agua_g', targetNutrients: ['vitaC'] }]
  });
  return typeof r.rows[0].vitaC === 'number' || JSON.stringify(r.rows[0].vitaC);
});

/* ================================================================== */
/* D. Rendimiento                                                      */
/* ================================================================== */

console.log('\n[D] Rendimiento');

test('50.000 registros x 60 nutrientes en menos de 10 s', () => {
  const foodsText = 'food_id,' + Array.from({ length: 60 }, (_, i) => 'n' + i).join(',') + '\n'
    + Array.from({ length: 2000 }, (_, i) => i + ',' + Array.from({ length: 60 }, () => '1.5').join(',')).join('\n');
  const inputText = 'pid,food_id,amt\n'
    + Array.from({ length: 50000 }, (_, i) => `P${i % 500},${i % 2000},100`).join('\n');

  const started = Date.now();
  const r = runEngine({ foodsText, inputText }, {
    foodIdCol: 'food_id', inputIdCol: 'food_id', amountCol: 'amt', inputScale: 0.01,
    groupByCols: ['pid'], calculations: [{ outputField: 'e', expression: 'n0 * 4 + n1 * 9' }],
    cookRules: [], columnAliases: []
  });
  const elapsed = Date.now() - started;
  console.log(`      (${elapsed} ms, ${r.rows.length} grupos)`);
  return (elapsed < 10000 && r.rows.length === 500) || `ms=${elapsed} filas=${r.rows.length}`;
});

/* ================================================================== */

console.log('\n' + '='.repeat(62));
if (failures.length === 0) {
  console.log(`FORMATOS Y CASOS DE USO: TODO OK (${passed})`);
} else {
  console.log(`${failures.length} FALLO(S) de ${passed + failures.length}\n`);
  for (const f of failures) console.log('   - ' + f);
  process.exit(1);
}

/**
 * WienerCalc — Suite de pruebas del motor.
 *
 * Ejecutar con:   npm test
 * (equivale a:    node --experimental-strip-types test/test_engine.ts)
 *
 * La versión anterior sólo comprobaba que ciertos campos no fueran `undefined`,
 * así que pasaba incluso con los resultados mal. Ahora se afirman valores
 * exactos calculables a mano y se cubren los fallos detectados en la auditoría.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { runEngine, normalizeConfig, EngineConfigError, type WienerConfig } from '../src/shared/engine.ts';
import { parseCsv, parseSafeNumber, toCsv } from '../src/shared/csv.ts';
import { compileFormula, evaluateFormula, validateFormula } from '../src/shared/formula.ts';
import { analyzeParens, parensAreBalanced } from '../src/shared/parenHighlight.ts';
import { executeFoodCalcDetailed } from '../src/main/engine/wienerEngine.ts';
import { crc32, colLetter, escapeXml, buildPrettyXlsx } from '../src/main/xlsxWriter.ts';
import * as xlsxReader from 'xlsx';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const read = (name: string): string => fs.readFileSync(path.join(HERE, name), 'utf8');

let passed = 0;
const failures: string[] = [];

function check(name: string, condition: boolean, detail = ''): void {
  if (condition) { passed++; return; }
  failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
}

function near(name: string, actual: unknown, expected: number, tolerance = 0.01): void {
  const value = Number(actual);
  check(name, Number.isFinite(value) && Math.abs(value - expected) <= tolerance, `esperado ${expected}, obtenido ${String(actual)}`);
}

function equal(name: string, actual: unknown, expected: unknown): void {
  check(name, JSON.stringify(actual) === JSON.stringify(expected), `esperado ${JSON.stringify(expected)}, obtenido ${JSON.stringify(actual)}`);
}

function section(title: string): void {
  console.log(`\n── ${title}`);
}

const row0 = (r: { rows: Record<string, unknown>[] }): Record<string, unknown> => r.rows[0] ?? {};

/* ================================================================== */
/* 1. Caso base sin recetas (equivale a la Prueba 1 de verificacion.md) */
/* ================================================================== */

section('Prueba 1: sin recetas, con cocción y agrupación por persona');

const base1: Partial<WienerConfig> = {
  foodIdCol: 'food_id',
  inputIdCol: 'food_id',
  amountCol: 'amount_grams',
  inputScale: 0.01,
  cookMethodCol: 'prep_method',
  groupByCols: ['person_id'],
  descriptiveCols: ['name'],
  calculations: [{ outputField: 'total_energy', expression: '17 * protein + 38 * fat + 17 * carbs' }],
  cookRules: [{ method: 'boil', reduceField: 'boil_loss', targetNutrients: ['vit_c'] }],
  columnAliases: []
};

const r1 = runEngine({ foodsText: read('foods.csv'), inputText: read('input.csv') }, base1);
const p001 = r1.rows.find((r) => r.person_id === 'P001') as Record<string, unknown>;
const p002 = r1.rows.find((r) => r.person_id === 'P002') as Record<string, unknown>;

check('se generan 2 grupos', r1.rows.length === 2, `obtenidos ${r1.rows.length}`);
near('P001 protein = 31 g x 2 porciones', p001.protein, 62);
near('P001 fat', p001.fat, 7.2);
near('P001 total_energy = 17*62 + 38*7.2', p001.total_energy, 17 * 62 + 38 * 7.2);
near('P002 protein (papa 2x3)', p002.protein, 6);
near('P002 fat (papa 0.3 + aceite 15)', p002.fat, 15.3);
near('P002 carbs', p002.carbs, 51);
near('P002 vit_c con 40 % de perdida por hervido', p002.vit_c, 36);
near('P002 total_energy = 17*6 + 38*15.3 + 17*51', p002.total_energy, 17 * 6 + 38 * 15.3 + 17 * 51);

// El fallo estrella de la auditoria: la cantidad se concatenaba como texto.
check(
  'la cantidad NO se concatena como texto',
  typeof p002._cantidad_total === 'number',
  `_cantidad_total = ${JSON.stringify(p002._cantidad_total)}`
);
near('P002 cantidad total = 300 + 15 g', p002._cantidad_total, 315);
near('P001 cantidad total', p001._cantidad_total, 200);
equal('P001 registros agregados', p001._registros, 1);
equal('P002 registros agregados', p002._registros, 2);
check('no hay valores de texto numerico pegado', !JSON.stringify(r1.rows).includes('30015'));

// El nombre del alimento ya no finge describir a todo el grupo.
check('metadatos variables se renombran a primer_*', p002.primer_name !== undefined,
  `name = ${JSON.stringify(p002.name)} / primer_name = ${JSON.stringify(p002.primer_name)}`);
check('P001 conserva el nombre porque es constante', p001.name === 'Chicken Breast', String(p001.name));

/* ================================================================== */
/* 2. Sin agrupar                                                      */
/* ================================================================== */

section('Sin agrupacion');

const r1b = runEngine({ foodsText: read('foods.csv'), inputText: read('input.csv') }, { ...base1, groupByCols: [] });
check('devuelve una fila por registro', r1b.rows.length === 3, `obtenidas ${r1b.rows.length}`);
near('fila de la papa hervida: vit_c reducido', r1b.rows[1].vit_c, 36);
near('total_energy tambien se calcula sin agrupar', r1b.rows[0].total_energy, 17 * 62 + 38 * 7.2);

/* ================================================================== */
/* 3. Dataset real con recetas precalculadas (modo fusion)             */
/* ================================================================== */

section('Prueba 2: tpaisa + ejemingre + trecetas (modo fusion)');

const base2: Partial<WienerConfig> = {
  foodIdCol: 'codalim',
  inputIdCol: 'codalim',
  amountCol: 'cantidad',
  inputScale: 0.01,
  groupByCols: ['id'],
  descriptiveCols: ['orden', 'dia', 'tipocomi'],
  recipeMode: 'merge',
  columnAliases: [
    { recipeCol: 'cod_b', foodCol: 'codalim' },
    { recipeCol: 'Kcal', foodCol: 'kcal' },
    { recipeCol: 'Pro. g.', foodCol: 'proteina_g' },
    { recipeCol: 'GT. g.', foodCol: 'grasatot_g' },
    { recipeCol: 'CHO. g.', foodCol: 'Carboh_g' },
    { recipeCol: 'VA (UI)', foodCol: 'vitaA(UI)' },
    { recipeCol: 'VA (ER)', foodCol: 'vitaA(ER)' }
  ],
  calculations: [
    { outputField: 'cal_from_fat', expression: 'grasatot_g * 9' },
    { outputField: 'vitA_sum', expression: 'vitaA(UI) + vitaA(ER)' }
  ],
  cookRules: []
};

const foodsText = read('tpaisa.csv');
const inputText = read('ejemingre.csv');
const recipesText = read('trecetas.csv');

const rFoodsWin = runEngine({ foodsText, inputText, recipesText }, { ...base2, collisionPolicy: 'foods' });
const rRecipesWin = runEngine({ foodsText, inputText, recipesText }, { ...base2, collisionPolicy: 'recipes' });

const gF = row0(rFoodsWin);
const gR = row0(rRecipesWin);

check('un grupo por sujeto', rFoodsWin.rows.length === 1, `obtenidos ${rFoodsWin.rows.length}`);
equal('el sujeto es 100532', gF.id, '100532');
check('las colisiones se reportan', rFoodsWin.stats.collisions === 52, `colisiones = ${rFoodsWin.stats.collisions}`);
check(
  'hay un aviso explicito de colision',
  rFoodsWin.warnings.some((w) => w.code === 'colision'),
  JSON.stringify(rFoodsWin.warnings.map((w) => w.code))
);

// La politica cambia el resultado, y ahora el usuario sabe cual se aplico.
check('las dos politicas dan resultados distintos', Number(gF.kcal) !== Number(gR.kcal),
  `foods=${gF.kcal} recipes=${gR.kcal}`);
near('politica "gana alimentos" reproduce el total sin fusionar', gF.kcal, 8619.48, 0.5);
near('politica "gana recetas" reproduce el total anterior de escritorio', gR.kcal, 7670.08, 0.5);

// Coherencia interna de las formulas sobre el resultado agrupado.
near('cal_from_fat = grasatot_g * 9', gF.cal_from_fat, Number(gF.grasatot_g) * 9, 0.05);
near('vitA_sum = UI + ER', gF.vitA_sum, Number(gF['vitaA(UI)']) + Number(gF['vitaA(ER)']), 0.05);
check('la cantidad total es numerica', typeof gF._cantidad_total === 'number', JSON.stringify(gF._cantidad_total));

/* ================================================================== */
/* 4. Sin recetas sobre el mismo dataset                               */
/* ================================================================== */

section('Mismo dataset SIN archivo de recetas');

const rNoRecipes = runEngine({ foodsText, inputText }, base2);
const gN = row0(rNoRecipes);
check('funciona sin tercer archivo', rNoRecipes.rows.length === 1);
near('coincide con la politica "gana alimentos"', gN.kcal, Number(gF.kcal), 0.5);
equal('no se reportan colisiones', rNoRecipes.stats.collisions, 0);

/* ================================================================== */
/* 5. Recetas como diccionario de ingredientes                         */
/* ================================================================== */

section('Modo diccionario de ingredientes');

const dictFoods = 'codalim,kcal,proteina_g\n1,100,10\n2,200,20\n';
const dictRecipes = 'recipe_id,ingredient_id,amount\n900,1,300\n900,2,100\n';
const dictInput = 'id,codalim,cantidad\nS1,900,200\n';

const rDict = runEngine(
  { foodsText: dictFoods, inputText: dictInput, recipesText: dictRecipes },
  {
    foodIdCol: 'codalim', inputIdCol: 'codalim', amountCol: 'cantidad', inputScale: 0.01,
    groupByCols: ['id'], recipeMode: 'dictionary', calculations: [], cookRules: [], columnAliases: []
  }
);

// 200 g de receta: 75 % ingrediente 1 (150 g) + 25 % ingrediente 2 (50 g)
// kcal = 100*1.5 + 200*0.5 = 150 + 100 = 250
const gD = row0(rDict);
equal('la receta se descompone en 1 grupo', rDict.rows.length, 1);
equal('se cargo 1 receta', rDict.stats.recipesLoaded, 1);
near('escalado proporcional de la receta (kcal)', gD.kcal, 250);
near('escalado proporcional de la receta (proteina)', gD.proteina_g, 10 * 1.5 + 20 * 0.5);

// Receta anidada dentro de otra receta
const nestedRecipes = 'recipe_id,ingredient_id,amount\n900,1,300\n900,2,100\n800,900,500\n800,1,500\n';
const rNested = runEngine(
  { foodsText: dictFoods, inputText: 'id,codalim,cantidad\nS1,800,200\n', recipesText: nestedRecipes },
  {
    foodIdCol: 'codalim', inputIdCol: 'codalim', amountCol: 'cantidad', inputScale: 0.01,
    groupByCols: ['id'], recipeMode: 'dictionary', calculations: [], cookRules: [], columnAliases: []
  }
);
// 200 g de 800 -> 100 g de receta 900 (=75 g ing1 + 25 g ing2) + 100 g de ing1
// kcal = 100*1.75 + 200*0.25 = 175 + 50 = 225
near('recetas anidadas', row0(rNested).kcal, 225);

// Receta circular: no debe colgar la aplicacion
const circular = 'recipe_id,ingredient_id,amount\nA,B,100\nB,A,100\n';
const rCircular = runEngine(
  { foodsText: dictFoods, inputText: 'id,codalim,cantidad\nS1,A,100\n', recipesText: circular },
  {
    foodIdCol: 'codalim', inputIdCol: 'codalim', amountCol: 'cantidad', inputScale: 0.01,
    groupByCols: [], recipeMode: 'dictionary', calculations: [], cookRules: [], columnAliases: []
  }
);
check('receta circular detectada sin colgarse',
  rCircular.rows.some((r) => String(r._error ?? '').includes('circular')),
  JSON.stringify(rCircular.rows[0]));

/* ================================================================== */
/* 6. La heuristica ya no confunde el id del sujeto con el de receta   */
/* ================================================================== */

section('ejemreceta.csv en modo automatico');

const rAuto = runEngine(
  { foodsText, inputText, recipesText: read('ejemreceta.csv') },
  { ...base2, recipeMode: 'auto' }
);
check(
  'avisa de la ambiguedad de id/cod_b en vez de inventar una receta',
  rAuto.warnings.some((w) => w.code === 'recetas' && w.message.includes('Diccionario')),
  JSON.stringify(rAuto.warnings.filter((w) => w.code === 'recetas').map((w) => w.message))
);
equal('no se carga ninguna receta fantasma', rAuto.stats.recipesLoaded, 0);

// Con el modo explicito, si se descompone
const rAutoDict = runEngine(
  { foodsText, inputText, recipesText: read('ejemreceta.csv') },
  { ...base2, recipeMode: 'dictionary', recipeIdCol: 'cod_b', recipeIngredientCol: 'cod_b', recipeAmountCol: 'cantiprep' }
);
check('el modo explicito manda sobre la heuristica', rAutoDict.stats.recipesLoaded > 0,
  `recetas = ${rAutoDict.stats.recipesLoaded}`);

/* ================================================================== */
/* 7. Codigos no encontrados: siempre reportados                       */
/* ================================================================== */

section('Alimentos no encontrados');

const nfFoods = 'food_id,protein\n101,31\n';
const nfInput = 'person_id,food_id,amount_grams\nP001,101,100\nP001,999,500\nP001,888,300\n';
const rNf = runEngine({ foodsText: nfFoods, inputText: nfInput }, {
  foodIdCol: 'food_id', inputIdCol: 'food_id', amountCol: 'amount_grams', inputScale: 0.01,
  groupByCols: ['person_id'], calculations: [], cookRules: [], columnAliases: []
});

equal('se listan los 2 codigos ausentes', rNf.notFound.length, 2);
equal('con su numero de registros', rNf.notFound.map((n) => n.id).sort(), ['888', '999']);
check('hay aviso de codigos no encontrados', rNf.warnings.some((w) => w.code === 'no_encontrado'));
near('el grupo solo suma lo encontrado', row0(rNf).protein, 31);
near('la cantidad total refleja solo lo calculado', row0(rNf)._cantidad_total, 100);

/* ================================================================== */
/* 8. Robustez de lectura del CSV                                      */
/* ================================================================== */

section('Deteccion de formato del CSV');

// BOM (el "CSV UTF-8" de Excel): antes cargaba 0 alimentos y todo fallaba.
const bomFoods = '﻿food_id,protein\n101,31\n';
const rBom = runEngine({ foodsText: bomFoods, inputText: 'person_id,food_id,amount_grams\nP001,101,200\n' }, {
  foodIdCol: 'food_id', inputIdCol: 'food_id', amountCol: 'amount_grams', inputScale: 0.01,
  groupByCols: [], calculations: [], cookRules: [], columnAliases: []
});
equal('BOM: se cargan los alimentos', rBom.stats.foodsLoaded, 1);
near('BOM: el calculo es correcto', row0(rBom).protein, 62);

// Punto y coma + coma decimal (Excel en configuracion regional espanola)
const semiFoods = '﻿food_id;protein;fat\n101;31,5;3,6\n';
const semiInput = 'person_id;food_id;amount_grams\nP001;101;200\n';
const rSemi = runEngine({ foodsText: semiFoods, inputText: semiInput }, {
  foodIdCol: 'food_id', inputIdCol: 'food_id', amountCol: 'amount_grams', inputScale: 0.01,
  groupByCols: [], calculations: [{ outputField: 'kcal', expression: 'protein * 4 + fat * 9' }],
  cookRules: [], columnAliases: []
});
equal('delimitador detectado', rSemi.stats.delimiters.foods, ';');
near('punto y coma + coma decimal: proteina', row0(rSemi).protein, 63);
near('punto y coma + coma decimal: formula', row0(rSemi).kcal, 63 * 4 + 7.2 * 9);

// Nombres con comas dentro de comillas
const quotedFoods = 'food_id,name,protein\n101,"Arroz, blanco, cocido",2.5\n';
const rQuoted = runEngine({ foodsText: quotedFoods, inputText: 'person_id,food_id,amount_grams\nP001,101,200\n' }, {
  foodIdCol: 'food_id', inputIdCol: 'food_id', amountCol: 'amount_grams', inputScale: 0.01,
  groupByCols: [], descriptiveCols: ['name'], calculations: [], cookRules: [], columnAliases: []
});
equal('campo entrecomillado con comas', row0(rQuoted).name, 'Arroz, blanco, cocido');
near('el nutriente de esa fila es correcto', row0(rQuoted).protein, 5);

// CRLF
const rCrlf = runEngine({ foodsText: 'food_id,protein\r\n101,31\r\n', inputText: 'person_id,food_id,amount_grams\r\nP001,101,100\r\n' }, {
  foodIdCol: 'food_id', inputIdCol: 'food_id', amountCol: 'amount_grams', inputScale: 0.01,
  groupByCols: [], calculations: [], cookRules: [], columnAliases: []
});
near('finales de linea CRLF', row0(rCrlf).protein, 31);

/* ================================================================== */
/* 9. Parte no comestible                                              */
/* ================================================================== */

section('Parte no comestible');

const neFoods = 'food_id,protein,desecho\n101,10,0.25\n';
const neInput = 'person_id,food_id,amount_grams\nP001,101,200\n';
const rFraction = runEngine({ foodsText: neFoods, inputText: neInput }, {
  foodIdCol: 'food_id', inputIdCol: 'food_id', amountCol: 'amount_grams', inputScale: 0.01,
  nonEdibleCol: 'desecho', nonEdibleUnit: 'fraction', groupByCols: [],
  calculations: [], cookRules: [], columnAliases: []
});
near('descuenta el 25 % no comestible', row0(rFraction).protein, 10 * 2 * 0.75);

const rPercent = runEngine({ foodsText: 'food_id,protein,desecho\n101,10,25\n', inputText: neInput }, {
  foodIdCol: 'food_id', inputIdCol: 'food_id', amountCol: 'amount_grams', inputScale: 0.01,
  nonEdibleCol: 'desecho', nonEdibleUnit: 'percent', groupByCols: [],
  calculations: [], cookRules: [], columnAliases: []
});
near('acepta el desecho en porcentaje', row0(rPercent).protein, 15);

// Unidad equivocada: avisa en vez de poner todo a cero
const rWrongUnit = runEngine({ foodsText: 'food_id,protein,desecho\n101,10,25\n', inputText: neInput }, {
  foodIdCol: 'food_id', inputIdCol: 'food_id', amountCol: 'amount_grams', inputScale: 0.01,
  nonEdibleCol: 'desecho', nonEdibleUnit: 'fraction', groupByCols: [],
  calculations: [], cookRules: [], columnAliases: []
});
near('unidad equivocada NO anula los nutrientes', row0(rWrongUnit).protein, 20);
check('unidad equivocada avisa', rWrongUnit.warnings.some((w) => w.code === 'no_comestible'));

/* ================================================================== */
/* 10. Agrupacion por varias columnas                                  */
/* ================================================================== */

section('Agrupacion sujeto + dia');

const multiInput = 'id,dia,codalim,cantidad\nS1,1,101,100\nS1,1,101,100\nS1,2,101,100\nS2,1,101,100\n';
const rMulti = runEngine({ foodsText: 'codalim,protein\n101,10\n', inputText: multiInput }, {
  foodIdCol: 'codalim', inputIdCol: 'codalim', amountCol: 'cantidad', inputScale: 0.01,
  groupByCols: ['id', 'dia'], descriptiveCols: [], calculations: [], cookRules: [], columnAliases: []
});
equal('3 combinaciones sujeto-dia', rMulti.rows.length, 3);
near('S1 dia 1 suma dos registros', (rMulti.rows.find((r) => r.id === 'S1' && r.dia === '1') ?? {}).protein, 20);
near('S1 dia 2', (rMulti.rows.find((r) => r.id === 'S1' && r.dia === '2') ?? {}).protein, 10);

/* ================================================================== */
/* 11. Formulas: errores visibles, no ceros silenciosos                */
/* ================================================================== */

section('Formulas');

const rTypo = runEngine({ foodsText: 'food_id,protein\n101,31\n', inputText: 'person_id,food_id,amount_grams\nP001,101,100\n' }, {
  foodIdCol: 'food_id', inputIdCol: 'food_id', amountCol: 'amount_grams', inputScale: 0.01,
  groupByCols: [], calculations: [{ outputField: 'x', expression: 'proteina * 4' }],
  cookRules: [], columnAliases: []
});
check('el typo NO produce una columna de ceros', row0(rTypo).x !== 0, `x = ${JSON.stringify(row0(rTypo).x)}`);
check('el typo genera un error visible', rTypo.warnings.some((w) => w.level === 'error' && w.code === 'formula'));
check('el error sugiere la columna correcta',
  rTypo.warnings.some((w) => w.message.includes('protein')),
  JSON.stringify(rTypo.warnings.map((w) => w.message)));

// Formulas complejas: parentesis anidados, funciones, logica.
const ctxFormulas = { protein: 31, fat: 3.6, carbs: 10, kcal: 200, 'vitaA(UI)': 150, 'vitaA(ER)': 36, 'Pro. g.': 2, 'GT. g.': 5 };
near('parentesis simple de agrupacion', evaluateFormula('(protein + fat) * 2', ctxFormulas).value ?? NaN, (31 + 3.6) * 2);
near('parentesis anidados varios niveles', evaluateFormula('((protein + fat) * 2 - carbs) / 2', ctxFormulas).value ?? NaN, (((31 + 3.6) * 2 - 10) / 2));
near('funcion anidada dentro de parentesis', evaluateFormula('round((protein*4/kcal)*100, 2)', ctxFormulas).value ?? NaN, Number(((31 * 4 / 200) * 100).toFixed(2)));
near('variable con parentesis propios + parentesis de agrupacion', evaluateFormula('(vitaA(UI) + vitaA(ER)) / 2', ctxFormulas).value ?? NaN, (150 + 36) / 2);
near('variable con espacios y puntos dentro de parentesis', evaluateFormula('(Pro. g. * 4 + GT. g. * 9) / 10', ctxFormulas).value ?? NaN, (2 * 4 + 5 * 9) / 10);
near('logica y comparacion combinadas', evaluateFormula('if(protein > 30 && fat < 10, 1, 0)', ctxFormulas).value ?? NaN, 1);
near('funciones anidadas multiples', evaluateFormula('round(sqrt(protein) + pow(fat,2), 3)', ctxFormulas).value ?? NaN, Number((Math.sqrt(31) + Math.pow(3.6, 2)).toFixed(3)));
near('formula anidada a 5 niveles', evaluateFormula('((((protein + 1) * 2) - 3) / 2) + fat', ctxFormulas).value ?? NaN, ((((31 + 1) * 2) - 3) / 2) + 3.6);
check('parentesis sin cerrar da error legible, no NaN silencioso', (() => {
  const r = evaluateFormula('(protein + fat', ctxFormulas);
  return r.value === null && (r.error ?? '').includes('paréntesis');
})());

// Mensajes ESPECIFICOS de paréntesis (antes decia "sobran simbolos", sin explicar por que).
check('falta cerrar 1 parentesis: mensaje especifico', (() => {
  const r = evaluateFormula('((protein + fat)', ctxFormulas);
  return r.value === null && (r.error ?? '').includes('Falta cerrar un paréntesis');
})());
check('faltan cerrar 2 parentesis: cuenta cuantos', (() => {
  const r = evaluateFormula('((protein + fat', ctxFormulas);
  return r.value === null && (r.error ?? '').includes('Faltan cerrar 2 paréntesis');
})());
check('sobra un cierre: mensaje especifico (no "sobran simbolos")', (() => {
  const r = evaluateFormula('protein + fat)', ctxFormulas);
  return r.value === null && (r.error ?? '').includes('de más') && !(r.error ?? '').includes('Sobran símbolos');
})());
check('parentesis anidados profundos con la variable vitaA(UI) siguen funcionando', (() => {
  const r = evaluateFormula('((vitaA(UI) + vitaA(ER)) / 2) * 1.5', ctxFormulas);
  return Math.abs((r.value ?? NaN) - ((150 + 36) / 2) * 1.5) < 0.01;
})());

equal('validateFormula acepta una formula correcta', validateFormula('protein * 4', ['protein']), null);
check('validateFormula rechaza un typo', validateFormula('proteina * 4', ['protein']) !== null);
equal('evaluador seguro: sin acceso al entorno', evaluateFormula('process.exit(1)', { protein: 1 }).value, null);
near('nombres con parentesis', evaluateFormula('vitaA(UI) + vitaA(ER)', { 'vitaA(UI)': 150, 'vitaA(ER)': 36 }).value ?? NaN, 186);
near('formula compilada reutilizable', compileFormula('protein * 2', ['protein']).evaluate({ protein: 21 }).value ?? NaN, 42);

/* ================================================================== */
/* 12. Validacion de configuracion                                     */
/* ================================================================== */

section('Errores de configuracion');

function expectThrow(name: string, fn: () => unknown, fragment: string): void {
  try {
    fn();
    check(name, false, 'no lanzo error');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    check(name, err instanceof EngineConfigError && message.includes(fragment), message);
  }
}

expectThrow('escala invalida', () => runEngine(
  { foodsText: 'food_id,protein\n101,31\n', inputText: 'person_id,food_id,amount_grams\nP001,101,100\n' },
  { foodIdCol: 'food_id', inputIdCol: 'food_id', amountCol: 'amount_grams', inputScale: NaN, calculations: [], cookRules: [], columnAliases: [] }
), 'escala');

expectThrow('columna ID inexistente', () => runEngine(
  { foodsText: 'food_id,protein\n101,31\n', inputText: 'person_id,food_id,amount_grams\nP001,101,100\n' },
  { foodIdCol: 'codigo', inputIdCol: 'food_id', amountCol: 'amount_grams', inputScale: 0.01, calculations: [], cookRules: [], columnAliases: [] }
), 'no existe en la tabla de alimentos');

expectThrow('columna de cantidad inexistente', () => runEngine(
  { foodsText: 'food_id,protein\n101,31\n', inputText: 'person_id,food_id,amount_grams\nP001,101,100\n' },
  { foodIdCol: 'food_id', inputIdCol: 'food_id', amountCol: 'gramos', inputScale: 0.01, calculations: [], cookRules: [], columnAliases: [] }
), 'no existe en la tabla de consumo');

/* ================================================================== */
/* 13. Compatibilidad con perfiles antiguos                            */
/* ================================================================== */

section('Perfiles antiguos');

const legacy = normalizeConfig({ groupByCol: 'person_id', foodIdCol: 'food_id', inputIdCol: 'food_id', amountCol: 'amount_grams', inputScale: 0.01 });
equal('groupByCol se migra a groupByCols', legacy.groupByCols, ['person_id']);
equal('la politica por defecto es "gana alimentos"', legacy.collisionPolicy, 'foods');
equal('el modo de receta por defecto es automatico', legacy.recipeMode, 'auto');

if (fs.existsSync(path.join(HERE, 'nodefault.json'))) {
  const migrated = normalizeConfig(JSON.parse(read('nodefault.json')));
  check('nodefault.json se migra sin romperse', Array.isArray(migrated.groupByCols));
}

/* ================================================================== */
/* 13.b PARIDAD escritorio <-> web                                     */
/* ================================================================== */

section('Paridad entre la ruta de escritorio y la del navegador');

// Ruta de ESCRITORIO: lee los archivos del disco (lo que hace Electron).
const desktop = executeFoodCalcDetailed({
  ...normalizeConfig(base2),
  foodsFilePath: path.join(HERE, 'tpaisa.csv'),
  inputFilePath: path.join(HERE, 'ejemingre.csv'),
  recipesFilePath: path.join(HERE, 'trecetas.csv')
});

// Ruta del NAVEGADOR: recibe el texto ya leído por el FileReader.
const web = runEngine({ foodsText, inputText, recipesText }, base2);

equal('mismo numero de filas', desktop.rows.length, web.rows.length);
equal('resultados IDENTICOS byte a byte', JSON.stringify(desktop.rows), JSON.stringify(web.rows));
equal('mismos avisos', JSON.stringify(desktop.warnings), JSON.stringify(web.warnings));
equal('mismas estadisticas', JSON.stringify(desktop.stats), JSON.stringify(web.stats));

// Y con el caso sencillo, incluyendo cocción y agrupación.
const desktop1 = executeFoodCalcDetailed({
  ...normalizeConfig(base1),
  foodsFilePath: path.join(HERE, 'foods.csv'),
  inputFilePath: path.join(HERE, 'input.csv')
});
equal('paridad tambien en el caso base', JSON.stringify(desktop1.rows), JSON.stringify(r1.rows));

/* ================================================================== */
/* 14. Exportacion                                                     */
/* ================================================================== */

section('Exportacion');

const mixed = [{ a: 1, b: 2 }, { a: 3, b: 4, vitaC: 9 }];
equal('el CSV usa la union de columnas', toCsv(mixed).split('\n')[0], 'a,b,vitaC');
equal('las filas incompletas quedan vacias', toCsv(mixed).split('\n')[1], '1,2,');

// Comillas MINIMAS: solo cuando el valor realmente las necesita (coma,
// comillas o salto de linea), no siempre -- asi es como lo producen Excel,
// R y pandas por defecto, y el archivo pesa menos con datasets grandes.
const withComma = toCsv([{ nombre: 'Arroz, blanco', kcal: 130 }]);
equal('solo se entrecomilla lo que trae coma', withComma.split('\n')[1], '"Arroz, blanco",130');
equal('un numero simple no lleva comillas', withComma.split('\n')[1].split(',').pop(), '130');

const withQuote = toCsv([{ nombre: 'Papa "criolla"' }]);
equal('las comillas internas se duplican', withQuote.split('\n')[1], '"Papa ""criolla"""');

// Nombres internos (con "_") se limpian SOLO al exportar, para que R no los
// convierta en X_registros al leerlos con read.csv().
const withInternal = toCsv([{ _registros: 3, _cantidad_total: 150, _codigo: '101', _origen: 'alimento', kcal: 90 }]);
equal('las cabeceras internas se renombran al exportar', withInternal.split('\n')[0], 'registros,cantidad_total,codigo,origen,kcal');
equal('los valores siguen en el mismo orden', withInternal.split('\n')[1], '3,150,101,alimento,90');

// Proteccion basica contra "CSV injection": un valor de texto que empiece
// con = + - @ se antepone con una comilla simple para que Excel/Sheets no
// lo interprete como formula si el archivo se abre sin revisar.
const withFormulaLike = toCsv([{ nombre: '=SUM(A1:A9)', cantidad: -5.2 }]);
equal('texto que empieza con = se neutraliza con comilla simple', withFormulaLike.split('\n')[1], "'=SUM(A1:A9),-5.2");
equal('un numero negativo real NO se toca', String(-5.2), '-5.2');

// Si ademas trae una coma, el valor neutralizado SI queda entre comillas
// (porque la coma lo exige), y la comilla simple sigue delante para la
// proteccion contra formulas.
const withFormulaAndComma = toCsv([{ nombre: '=SUM(A1,A9)' }]);
equal('formula con coma queda entrecomillada y neutralizada', withFormulaAndComma.split('\n')[1], "\"'=SUM(A1,A9)\"");

/* ================================================================== */
/* 15. Utilidades                                                      */
/* ================================================================== */

section('Utilidades CSV');

equal('parseSafeNumber con formato latino', parseSafeNumber('1.234,56'), 1234.56);
equal('parseSafeNumber con texto', parseSafeNumber('n/d'), null);
equal('parseCsv omite lineas vacias', parseCsv('a,b\n\n1,2\n\n').rows.length, 1);

/* ================================================================== */
/* 16. Coloreado de paréntesis del editor de fórmulas                   */
/* ================================================================== */

section('Analisis de parentesis para el editor visual');

equal('balanceado simple', parensAreBalanced('(a+b)'), true);
equal('falta cerrar -> desbalanceado', parensAreBalanced('(a+b'), false);
equal('sobra un cierre -> desbalanceado', parensAreBalanced('a+b)'), false);

const nestedSiblings = analyzeParens('((a)(b))');
equal('externo abre en nivel 0', nestedSiblings.find((t) => t.index === 0), { index: 0, char: '(', matched: true, depth: 0 });
equal('externo cierra en nivel 0', nestedSiblings.find((t) => t.index === 7), { index: 7, char: ')', matched: true, depth: 0 });
equal('(a) abre en nivel 1', nestedSiblings.find((t) => t.index === 1), { index: 1, char: '(', matched: true, depth: 1 });
equal('(b) abre en nivel 1 (hermano, no mas profundo)', nestedSiblings.find((t) => t.index === 4), { index: 4, char: '(', matched: true, depth: 1 });

const deeplyNested = analyzeParens('(((x)))');
equal('nivel 0', deeplyNested.find((t) => t.index === 0)?.depth, 0);
equal('nivel 1', deeplyNested.find((t) => t.index === 1)?.depth, 1);
equal('nivel 2 (el mas anidado)', deeplyNested.find((t) => t.index === 2)?.depth, 2);
equal('cierre simetrico nivel 2', deeplyNested.find((t) => t.index === 4)?.depth, 2);
equal('cierre simetrico nivel 0', deeplyNested.find((t) => t.index === 6)?.depth, 0);

check('apertura sin cierre se marca matched=false', analyzeParens('(a+b').find((t) => t.char === '(')?.matched === false);
check('cierre sin apertura se marca matched=false', analyzeParens('a+b)').find((t) => t.char === ')')?.matched === false);

const mixedParens = analyzeParens('(a))'); // '(' en 0, ')' bien emparejado en 2, ')' suelto en 3
check('mixto: el bien emparejado queda matched=true', mixedParens.find((t) => t.index === 2)?.matched === true);
check('mixto: el paréntesis suelto queda matched=false', mixedParens.find((t) => t.index === 3)?.matched === false);

/* ================================================================== */
/* 17. Exportacion a Excel "bonita" (xlsxWriter)                       */
/* ================================================================== */

section('Exportacion a Excel');

// CRC32 es la pieza mas facil de arruinar al construir un ZIP a mano: se
// compara contra el vector de prueba estandar del algoritmo.
equal('crc32 contra el vector de prueba estandar', crc32(Buffer.from('123456789')), 0xcbf43926);

equal('colLetter(0) es A', colLetter(0), 'A');
equal('colLetter(25) es Z', colLetter(25), 'Z');
equal('colLetter(26) es AA', colLetter(26), 'AA');
equal('colLetter(701) es ZZ', colLetter(701), 'ZZ');
equal('colLetter(702) es AAA', colLetter(702), 'AAA');

equal('escapeXml escapa & < > " \'', escapeXml('a&b<c>"d"\'e\''), 'a&amp;b&lt;c&gt;&quot;d&quot;&apos;e&apos;');
equal('escapeXml quita caracteres de control', escapeXml('a\x01b\x1fc'), 'abc');
equal('escapeXml conserva acentos', escapeXml('ñ á canción'), 'ñ á canción');

// El archivo se vuelve a leer con la libreria `xlsx` (ya en devDependencies,
// solo para verificar en las pruebas) para confirmar que abre sin errores y
// que los datos -- incluyendo casos raros como & < > y el valor 0 -- llegan
// intactos.
const xlsxHeaders = ['id', 'nombre', 'kcal', '_registros'];
const xlsxRows = [
  { id: 100532, nombre: 'Sujeto A & B <raro>', kcal: 8619.4821, _registros: 127 },
  { id: 100533, nombre: 'Sujeto Ñoño', kcal: 0, _registros: 3 }
];
const xlsxBuffer = await buildPrettyXlsx(xlsxRows, xlsxHeaders, { sheetName: 'Resultados' });
const wbCheck = xlsxReader.read(xlsxBuffer, { type: 'buffer' });
const wsCheck = wbCheck.Sheets[wbCheck.SheetNames[0]];
const parsedXlsx = xlsxReader.utils.sheet_to_json(wsCheck, { defval: null }) as Record<string, unknown>[];

equal('la hoja se llama Resultados', wbCheck.SheetNames[0], 'Resultados');
equal('se leen las 2 filas', parsedXlsx.length, 2);
equal('texto con & y <> se preserva', parsedXlsx[0].nombre, 'Sujeto A & B <raro>');
equal('acentos se preservan', parsedXlsx[1].nombre, 'Sujeto Ñoño');
equal('decimales se preservan', parsedXlsx[0].kcal, 8619.4821);
equal('el valor 0 no se confunde con vacio', parsedXlsx[1].kcal, 0);
equal('columna interna _registros se conserva tal cual (solo el CSV la renombra)', parsedXlsx[0]._registros, 127);

const emptyBook = await buildPrettyXlsx([], ['a', 'b']);
check('un libro sin filas no truena', xlsxReader.read(emptyBook, { type: 'buffer' }).SheetNames.length === 1);

// La pieza que de verdad comparten escritorio y navegador es
// shared/xlsxExport.ts: el escritorio le pasa zlib.deflateRawSync (via
// xlsxWriter.ts) y el navegador le pasa CompressionStream('deflate-raw')
// (via main.tsx). Aqui se llama DIRECTO al modulo compartido con una
// funcion deflate equivalente a la de Node, para probar ese codigo tal cual
// lo va a ejecutar el navegador -- no solo el envoltorio de Electron.
{
  const { buildPrettyXlsx: buildIsomorphic } = await import('../src/shared/xlsxExport.ts');
  const { deflateRawSync } = await import('node:zlib');
  const nodeStyleDeflate = (bytes: Uint8Array): Uint8Array => {
    const out = deflateRawSync(Buffer.from(bytes));
    return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
  };
  const isoBytes = await buildIsomorphic(xlsxRows, xlsxHeaders, { sheetName: 'Resultados' }, nodeStyleDeflate);
  const isoWb = xlsxReader.read(Buffer.from(isoBytes), { type: 'buffer' });
  const isoParsed = xlsxReader.utils.sheet_to_json(isoWb.Sheets[isoWb.SheetNames[0]], { defval: null }) as Record<string, unknown>[];
  equal('modulo compartido (mismo camino que usa el navegador): hoja correcta', isoWb.SheetNames[0], 'Resultados');
  equal('modulo compartido: datos correctos', isoParsed[0].nombre, 'Sujeto A & B <raro>');
  equal('modulo compartido: decimales correctos', isoParsed[0].kcal, 8619.4821);
}

/* ================================================================== */

console.log('\n' + '='.repeat(62));
if (failures.length === 0) {
  console.log(`TODAS LAS PRUEBAS PASARON (${passed})`);
} else {
  console.log(`${failures.length} FALLO(S) de ${passed + failures.length}\n`);
  for (const f of failures) console.log('   - ' + f);
  process.exit(1);
}

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  UploadCloud, Database, Settings, TableProperties, Download, Play, Plus, Trash2, CheckCircle2,
  FileSpreadsheet, Save, FolderOpen, Globe, TerminalSquare, X, Maximize2, Minimize2, RotateCcw,
  Search, ChevronUp, ChevronDown, Replace as ReplaceIcon, ReplaceAll, AlertTriangle, Info, XCircle,
  FileText
} from 'lucide-react';

import logoImg from './assets/logo.png';
import logoAnim from './assets/logoanim.mp4';

import {
  normalizeConfig, COMMON_DESCRIPTIVE_COLUMNS,
  type WienerConfig, type WienerWarning, type NotFoundEntry, type EngineStats
} from '../../shared/engine.ts';
import { validateFormula, compileFormula } from '../../shared/formula.ts';
import { analyzeParens } from '../../shared/parenHighlight.ts';

/* ================================================================== */
/* Textos                                                              */
/* ================================================================== */

const uiText = {
  en: {
    tab1: '1. Data Sources', tab2: '2. Field Mapping', tab3: '3. Rules & Cooking', tab4: '4. Calculate',
    profiles: 'Profiles', saveCfg: 'Save Profile', loadCfg: 'Load Profile', lang: 'Español',
    s1Title: '1. Upload Data Sources', s1Desc: 'Select your CSV files. Delimiter, BOM and quoted fields are detected automatically.',
    s1Box1: 'Food Table (Nutrients)', s1Click1: 'Click to select foods.csv',
    s1Box2: 'Consumed Amounts (Input)', s1Click2: 'Click to select input.csv',
    s1Box3: 'Recipe Table (Optional)', s1Click3: 'Click to select recipes.csv',
    s1Remove: 'Remove this file', s1Change: 'Click to replace',
    s1RecipeMode: 'How should the recipe table be read?',
    s1ModeAuto: 'Detect automatically', s1ModeMerge: 'Pre-calculated dishes (merge)', s1ModeDict: 'Ingredient dictionary (break down)',
    s1ModeAutoHint: 'WienerCalc decides and tells you what it chose.',
    s1ModeMergeHint: 'Each row is a ready dish that joins the food table.',
    s1ModeDictHint: 'Each row is one ingredient of a recipe; portions are scaled proportionally.',
    s1RecipeIdCol: 'Recipe ID column', s1RecipeIngCol: 'Ingredient ID column', s1RecipeAmtCol: 'Ingredient amount column',
    s1Collision: 'If a code exists in BOTH tables',
    s1CollFoods: 'Food table wins', s1CollRecipes: 'Recipe table wins',
    s1CollHint: 'This choice changes your results. WienerCalc reports how many codes collided.',
    s1Rows: 'rows', s1Cols: 'columns', s1Delim: 'delimiter',
    s2Title: '2. Map Your Fields', s2Desc: 'Tell WienerCalc which columns are IDs, amounts and groups.',
    s2FoodId: 'ID Column (Food Table)', s2InputId: 'ID Column (Consumption)', s2Select: 'Select a column...',
    s2Amount: 'Amount Column', s2Scale: 'Input Scale (Multiplier)', s2ScaleHint: 'E.g. 0.01 converts grams into 100 g portions.',
    s2ScaleBad: 'Must be a number greater than 0.',
    s2CookCol: 'Cooking Method Column (Optional)', s2NoneCook: 'None (no cooking rules)',
    s2NonEdible: 'Non-edible Part Column (Optional)', s2NoneNonEdible: 'None',
    s2NonEdibleUnit: 'Expressed as', s2Fraction: 'Fraction (0–1)', s2Percent: 'Percentage (0–100)',
    s2Group: 'Group Results By (Optional)', s2GroupHint: 'Pick one or more. E.g. subject + day for a multi-day survey.',
    s2GroupNone: 'No grouping: one row per record.',
    s2Descriptive: 'Descriptive Columns (never summed)',
    s2DescriptiveHint: 'Order, day, meal, names… If a numeric column is not a nutrient, mark it here.',
    s2AliasTitle: 'Column Aliases (Merge Recipes & Foods)', s2AliasDesc: 'Match recipe columns to food columns so they add up correctly.',
    s2AddAlias: 'Add Alias', s2RecipeCol: 'Recipe Col.', s2FoodCol: 'Food Col.',
    s2NoAlias: 'No aliases set. Identically named columns merge automatically.',
    s3Title: '3. Calculation Rules & Cooking',
    s3Math: 'Mathematical Rules', s3AddRule: 'Add Rule', s3Vars: 'Available variables — click to insert at the cursor:',
    s3InsertHint: 'Click to insert into the highlighted formula',
    s3ParenHint: 'Wraps the selected text in parentheses, or inserts an empty pair with the cursor in the middle',
    s3OperatorsTitle: 'Operators',
    s3TplTitle: 'Common nutrition formulas',
    s3TplHint: 'Click to insert a ready-made formula, then double-click a placeholder word and click your real column to replace it.',
    s3PreviewLabel: 'Preview with your first food row',
    s3PreviewMissing: 'missing',
    s3NewField: 'New field name', s3Paste: 'Formula, e.g. (protein * 4 + fat * 9) / kcal * 100',
    s3Funcs: 'Parentheses of any depth are supported. Functions: min, max, abs, round, sqrt, pow, ln, log, exp, if. Comparisons: < > <= >= == != && ||',
    s3CookRed: 'Cooking Reductions', s3AddCook: 'Add Cooking Rule',
    s3Method: 'Method', s3SelMethod: 'Select method...', s3Reduce: 'Reduction Field', s3Target: 'Target Nutrients',
    s3SelFirst: 'Select the food file first...',
    s4Title: '4. Calculate & Results', s4Crunching: 'Crunching the numbers...', s4Complete: 'Calculation complete',
    s4Ready: 'Ready to calculate', s4Desc: 'WienerCalc joins your files, applies scaling, cooking losses and formulas.',
    s4Processing: 'Processing...', s4Run: 'Run Calculation', s4ExportCSV: 'CSV', s4ExportExcel: 'Excel', s4Report: 'Report',
    s4Preview: 'Preview (first 5 rows — scroll sideways)',
    s4Warnings: 'Run report', s4NoWarnings: 'No warnings: every record was processed.',
    s4NotFound: 'Codes not found in the food table',
    s4Stats: 'Foods loaded', s4StatsRecipes: 'Recipes', s4StatsRecords: 'Records read', s4StatsRows: 'Result rows',
    s4Collisions: 'Code collisions'
  },
  es: {
    tab1: '1. Fuentes de Datos', tab2: '2. Mapeo de Campos', tab3: '3. Reglas y Cocción', tab4: '4. Calcular',
    profiles: 'Perfiles', saveCfg: 'Guardar Perfil', loadCfg: 'Cargar Perfil', lang: 'English',
    s1Title: '1. Subir Fuentes de Datos', s1Desc: 'Selecciona tus archivos CSV. El delimitador, el BOM y los campos entrecomillados se detectan solos.',
    s1Box1: 'Tabla de Alimentos (Nutrientes)', s1Click1: 'Clic para seleccionar foods.csv',
    s1Box2: 'Cantidades Consumidas (Entrada)', s1Click2: 'Clic para seleccionar input.csv',
    s1Box3: 'Tabla de Recetas (Opcional)', s1Click3: 'Clic para seleccionar recipes.csv',
    s1Remove: 'Quitar este archivo', s1Change: 'Clic para reemplazar',
    s1RecipeMode: '¿Cómo se debe leer la tabla de recetas?',
    s1ModeAuto: 'Detectar automáticamente', s1ModeMerge: 'Preparaciones precalculadas (fusionar)', s1ModeDict: 'Diccionario de ingredientes (descomponer)',
    s1ModeAutoHint: 'WienerCalc decide y te dice qué eligió.',
    s1ModeMergeHint: 'Cada fila es un plato ya calculado que se une a la tabla de alimentos.',
    s1ModeDictHint: 'Cada fila es un ingrediente de una receta; las porciones se escalan proporcionalmente.',
    s1RecipeIdCol: 'Columna ID de la receta', s1RecipeIngCol: 'Columna ID del ingrediente', s1RecipeAmtCol: 'Columna de cantidad del ingrediente',
    s1Collision: 'Si un código existe en AMBAS tablas',
    s1CollFoods: 'Gana la tabla de alimentos', s1CollRecipes: 'Gana la tabla de recetas',
    s1CollHint: 'Esta elección cambia tus resultados. WienerCalc te informa cuántos códigos colisionaron.',
    s1Rows: 'filas', s1Cols: 'columnas', s1Delim: 'delimitador',
    s2Title: '2. Mapear tus Campos', s2Desc: 'Dile a WienerCalc qué columnas son los IDs, las cantidades y los grupos.',
    s2FoodId: 'Columna ID (Tabla Alimentos)', s2InputId: 'Columna ID (Consumo Entrada)', s2Select: 'Selecciona una columna...',
    s2Amount: 'Columna de Cantidad', s2Scale: 'Escala de Entrada (Multiplicador)', s2ScaleHint: 'Ej. 0.01 convierte gramos a porciones de 100 g.',
    s2ScaleBad: 'Debe ser un número mayor que 0.',
    s2CookCol: 'Columna de Método de Cocción (Opcional)', s2NoneCook: 'Ninguna (sin reglas de cocción)',
    s2NonEdible: 'Columna de Parte No Comestible (Opcional)', s2NoneNonEdible: 'Ninguna',
    s2NonEdibleUnit: 'Expresada como', s2Fraction: 'Fracción (0–1)', s2Percent: 'Porcentaje (0–100)',
    s2Group: 'Agrupar Resultados Por (Opcional)', s2GroupHint: 'Puedes elegir varias. Ej. sujeto + día en una encuesta de varios días.',
    s2GroupNone: 'Sin agrupar: una fila por registro.',
    s2Descriptive: 'Columnas Descriptivas (nunca se suman)',
    s2DescriptiveHint: 'Orden, día, tiempo de comida, nombres… Si una columna numérica no es un nutriente, márcala aquí.',
    s2AliasTitle: 'Alias de Columnas (Unir Recetas y Alimentos)', s2AliasDesc: 'Empareja las columnas de recetas con las de alimentos para que se sumen bien.',
    s2AddAlias: 'Añadir Alias', s2RecipeCol: 'Col. Recetas', s2FoodCol: 'Col. Alimentos',
    s2NoAlias: 'No hay alias. Las columnas que se llamen igual se fusionan automáticamente.',
    s3Title: '3. Reglas de Cálculo y Cocción',
    s3Math: 'Reglas Matemáticas', s3AddRule: 'Añadir Regla', s3Vars: 'Variables disponibles — clic para insertar en el cursor:',
    s3InsertHint: 'Clic para insertar en la fórmula resaltada',
    s3ParenHint: 'Envuelve el texto seleccionado entre paréntesis, o inserta un par vacío con el cursor en medio',
    s3OperatorsTitle: 'Operadores',
    s3TplTitle: 'Fórmulas nutricionales comunes',
    s3TplHint: 'Haz clic para insertar una fórmula lista, luego selecciona con doble clic una palabra marcador y haz clic en tu columna real para reemplazarla.',
    s3PreviewLabel: 'Vista previa con tu primera fila de alimentos',
    s3PreviewMissing: 'faltan',
    s3NewField: 'Nuevo nombre de campo', s3Paste: 'Fórmula, ej. (proteina_g * 4 + grasatot_g * 9) / kcal * 100',
    s3Funcs: 'Se admiten paréntesis de cualquier profundidad. Funciones: min, max, abs, round, sqrt, pow, ln, log, exp, if. Comparaciones: < > <= >= == != && ||',
    s3CookRed: 'Reducciones por Cocción', s3AddCook: 'Añadir Regla de Cocción',
    s3Method: 'Método', s3SelMethod: 'Seleccionar método...', s3Reduce: 'Campo de Reducción', s3Target: 'Nutrientes Objetivo',
    s3SelFirst: 'Selecciona primero el archivo de alimentos...',
    s4Title: '4. Calcular y Resultados', s4Crunching: 'Procesando los números...', s4Complete: 'Cálculo completo',
    s4Ready: 'Listo para calcular', s4Desc: 'WienerCalc unirá tus archivos, aplicará escalas, pérdidas por cocción y fórmulas.',
    s4Processing: 'Procesando...', s4Run: 'Ejecutar Cálculo', s4ExportCSV: 'CSV', s4ExportExcel: 'Excel', s4Report: 'Informe',
    s4Preview: 'Vista previa (primeras 5 filas — desplázate horizontalmente)',
    s4Warnings: 'Informe de la ejecución', s4NoWarnings: 'Sin advertencias: todos los registros se procesaron.',
    s4NotFound: 'Códigos que no existen en la tabla de alimentos',
    s4Stats: 'Alimentos cargados', s4StatsRecipes: 'Recetas', s4StatsRecords: 'Registros leídos', s4StatsRows: 'Filas de resultado',
    s4Collisions: 'Colisiones de códigos'
  }
};

type Lang = 'en' | 'es';
type Texts = typeof uiText.es;

/* ================================================================== */
/* Estado inicial                                                      */
/* ================================================================== */

const emptyConfig: WienerConfig = normalizeConfig({
  foodsFilePath: '', inputFilePath: '', recipesFilePath: '',
  foodIdCol: '', inputIdCol: '', amountCol: '',
  inputScale: 0.01,
  cookMethodCol: '', nonEdibleCol: '', nonEdibleUnit: 'fraction',
  groupByCols: [], descriptiveCols: [],
  recipeMode: 'auto', recipeIdCol: '', recipeIngredientCol: '', recipeAmountCol: '',
  collisionPolicy: 'foods',
  calculations: [], cookRules: [], columnAliases: []
});

interface FileMeta { headers: string[]; delimiter?: string; rowCount?: number; sampleRow?: Record<string, string> }
const emptyMeta: FileMeta = { headers: [] };

type FileKind = 'foods' | 'input' | 'recipes';

/* ================================================================== */
/* Componente principal                                                */
/* ================================================================== */

export default function App() {
  const [activeTab, setActiveTab] = useState<'sources' | 'mapping' | 'rules' | 'calc'>('sources');
  const [isCalculating, setIsCalculating] = useState(false);
  const [results, setResults] = useState<Record<string, unknown>[] | null>(null);
  const [warnings, setWarnings] = useState<WienerWarning[]>([]);
  const [notFound, setNotFound] = useState<NotFoundEntry[]>([]);
  const [stats, setStats] = useState<EngineStats | null>(null);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>('es');
  const t: Texts = uiText[lang];

  const [foodMeta, setFoodMeta] = useState<FileMeta>(emptyMeta);
  const [inputMeta, setInputMeta] = useState<FileMeta>(emptyMeta);
  const [recipeMeta, setRecipeMeta] = useState<FileMeta>(emptyMeta);
  const [uniqueMethods, setUniqueMethods] = useState<string[]>([]);

  const [isIdeOpen, setIsIdeOpen] = useState(false);
  const [ideWidth, setIdeWidth] = useState<'normal' | 'wide'>('normal');
  const [isPlayingLogo, setIsPlayingLogo] = useState(false);

  const [config, setConfig] = useState<WienerConfig>(emptyConfig);

  const foodHeaders = foodMeta.headers;
  const inputHeaders = inputMeta.headers;
  const recipeHeaders = recipeMeta.headers;

  /** Universo de columnas para fórmulas y para marcar descriptivas. */
  const allHeaders = useMemo(
    () => Array.from(new Set([...foodHeaders, ...inputHeaders])),
    [foodHeaders, inputHeaders]
  );

  const setMeta = (kind: FileKind, meta: FileMeta): void => {
    if (kind === 'foods') setFoodMeta(meta);
    else if (kind === 'input') setInputMeta(meta);
    else setRecipeMeta(meta);
  };

  const inspect = async (filePath: string, kind: FileKind): Promise<string[]> => {
    try {
      const info = await window.wienerApi.inspectCsv(filePath);
      const meta: FileMeta = { headers: info.headers ?? [], delimiter: info.delimiter, rowCount: info.rowCount, sampleRow: info.sampleRow };
      setMeta(kind, meta);
      return meta.headers;
    } catch {
      setMeta(kind, emptyMeta);
      return [];
    }
  };

  /* --- Selección de archivo ---------------------------------------- */

  const handleSelectFile = async (kind: FileKind): Promise<void> => {
    const filePath = await window.wienerApi.selectFile();
    if (!filePath) return;

    const key = kind === 'foods' ? 'foodsFilePath' : kind === 'input' ? 'inputFilePath' : 'recipesFilePath';
    const headers = await inspect(filePath, kind);

    setConfig((prev) => {
      const next: WienerConfig = { ...prev, [key]: filePath };

      // Al cambiar de archivo, se descartan las selecciones que ya no existen.
      if (kind === 'foods') {
        if (!headers.includes(next.foodIdCol)) next.foodIdCol = guessColumn(headers, ['codalim', 'food_id', 'codigo', 'id']);
        if (next.nonEdibleCol && !headers.includes(next.nonEdibleCol)) next.nonEdibleCol = '';
        next.cookRules = next.cookRules.map((r) => ({
          ...r,
          reduceField: headers.includes(r.reduceField) ? r.reduceField : '',
          targetNutrients: r.targetNutrients.filter((n) => headers.includes(n))
        }));
        next.columnAliases = next.columnAliases.map((a) => ({
          ...a, foodCol: headers.includes(a.foodCol) ? a.foodCol : ''
        }));
      }
      if (kind === 'input') {
        if (!headers.includes(next.inputIdCol)) next.inputIdCol = guessColumn(headers, ['codalim', 'food_id', 'codigo']);
        if (!headers.includes(next.amountCol)) next.amountCol = guessColumn(headers, ['cantidad', 'amount_grams', 'amount', 'gramos', 'peso']);
        if (next.cookMethodCol && !headers.includes(next.cookMethodCol)) next.cookMethodCol = '';
        next.groupByCols = (next.groupByCols ?? []).filter((c) => headers.includes(c));
        // Sugerencia de columnas descriptivas habituales presentes en el archivo.
        const suggested = headers.filter((h) => COMMON_DESCRIPTIVE_COLUMNS.includes(h.toLowerCase()));
        next.descriptiveCols = Array.from(new Set([...(next.descriptiveCols ?? []), ...suggested]));
      }
      if (kind === 'recipes') {
        next.columnAliases = next.columnAliases.map((a) => ({
          ...a, recipeCol: headers.includes(a.recipeCol) ? a.recipeCol : ''
        }));
        if (next.recipeIdCol && !headers.includes(next.recipeIdCol)) next.recipeIdCol = '';
        if (next.recipeIngredientCol && !headers.includes(next.recipeIngredientCol)) next.recipeIngredientCol = '';
        if (next.recipeAmountCol && !headers.includes(next.recipeAmountCol)) next.recipeAmountCol = '';
      }
      return next;
    });
  };

  /* --- Quitar archivo (petición del usuario) ----------------------- */

  const handleRemoveFile = (kind: FileKind): void => {
    setMeta(kind, emptyMeta);
    if (kind === 'input') setUniqueMethods([]);

    setConfig((prev) => {
      const next: WienerConfig = { ...prev };

      if (kind === 'foods') {
        next.foodsFilePath = '';
        next.foodIdCol = '';
        next.nonEdibleCol = '';
        // Se conservan las reglas de cocción pero se vacían los campos que
        // apuntaban a columnas del archivo retirado.
        next.cookRules = next.cookRules.map((r) => ({ ...r, reduceField: '', targetNutrients: [] }));
        next.columnAliases = next.columnAliases.map((a) => ({ ...a, foodCol: '' }));
      }
      if (kind === 'input') {
        next.inputFilePath = '';
        next.inputIdCol = '';
        next.amountCol = '';
        next.cookMethodCol = '';
        next.groupByCols = [];
        next.descriptiveCols = (next.descriptiveCols ?? []).filter((c) => foodHeaders.includes(c));
      }
      if (kind === 'recipes') {
        next.recipesFilePath = '';
        next.columnAliases = [];
        next.recipeMode = 'auto';
        next.recipeIdCol = '';
        next.recipeIngredientCol = '';
        next.recipeAmountCol = '';
      }
      return next;
    });

    // Los resultados dejan de corresponder a la configuración actual.
    setResults(null);
    setWarnings([]);
    setNotFound([]);
    setStats(null);
    setFatalError(null);
  };

  /* --- Ejecución ---------------------------------------------------- */

  const scaleIsValid = Number.isFinite(config.inputScale) && config.inputScale > 0;

  const formulaErrors = useMemo(() => {
    const map: Record<number, string> = {};
    config.calculations.forEach((calc, index) => {
      if (!calc.expression || allHeaders.length === 0) return;
      const error = validateFormula(calc.expression, allHeaders);
      if (error) map[index] = error;
    });
    return map;
  }, [config.calculations, allHeaders]);

  const handleRunCalculation = async (): Promise<void> => {
    if (!config.foodsFilePath || !config.inputFilePath) {
      setFatalError(lang === 'es'
        ? 'Selecciona al menos la tabla de alimentos y la tabla de consumo en la pestaña 1.'
        : 'Select at least the food table and the consumption table in tab 1.');
      setActiveTab('sources');
      return;
    }
    if (!scaleIsValid) {
      setFatalError(t.s2ScaleBad);
      setActiveTab('mapping');
      return;
    }

    setIsCalculating(true);
    setFatalError(null);
    try {
      const response = await window.wienerApi.runCalculations(config);
      if (response.success) {
        setResults(response.data ?? []);
        setWarnings(response.warnings ?? []);
        setNotFound(response.notFound ?? []);
        setStats(response.stats ?? null);
      } else {
        setResults(null);
        setWarnings(response.warnings ?? []);
        setNotFound([]);
        setStats(null);
        setFatalError(response.error ?? 'Error desconocido.');
      }
    } catch (err) {
      setFatalError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsCalculating(false);
    }
  };

  /* --- Exportación --------------------------------------------------- */

  const [toast, setToast] = useState<string | null>(null);
  const notify = (message: string): void => {
    setToast(message);
    setTimeout(() => setToast(null), 5000);
  };

  const handleExportCsv = async (): Promise<void> => {
    if (!results || results.length === 0) return;
    const response = await window.wienerApi.saveCsv(results);
    if (response.success) notify(`CSV exportado: ${response.filePath}`);
    else if (!response.canceled) notify(`Error: ${response.error}`);
  };

  const handleExportExcel = async (): Promise<void> => {
    if (!results || results.length === 0) return;
    const response = await window.wienerApi.saveExcel(results);
    if (response.success) notify(response.error ?? `Excel exportado: ${response.filePath}`);
    else if (!response.canceled) notify(`Error: ${response.error}`);
  };

  const handleExportReport = async (): Promise<void> => {
    const lines: string[] = [
      'INFORME DE EJECUCIÓN — WienerCalc',
      new Date().toLocaleString(),
      '',
      `Tabla de alimentos: ${config.foodsFilePath}`,
      `Tabla de consumo:   ${config.inputFilePath}`,
      `Tabla de recetas:   ${config.recipesFilePath || '(ninguna)'}`,
      `Escala de entrada:  ${config.inputScale}`,
      `Agrupado por:       ${(config.groupByCols ?? []).join(', ') || '(sin agrupar)'}`,
      `Política colisión:  ${config.collisionPolicy === 'foods' ? 'gana tabla de alimentos' : 'gana tabla de recetas'}`,
      ''
    ];
    if (stats) {
      lines.push('ESTADÍSTICAS');
      lines.push(`  Alimentos cargados: ${stats.foodsLoaded}`);
      lines.push(`  Recetas cargadas:   ${stats.recipesLoaded}`);
      lines.push(`  Registros leídos:   ${stats.inputRecords}`);
      lines.push(`  Filas de resultado: ${stats.outputRows}`);
      lines.push(`  Colisiones:         ${stats.collisions}`);
      lines.push('');
    }
    lines.push('AVISOS');
    if (warnings.length === 0) lines.push('  (ninguno)');
    for (const w of warnings) {
      lines.push(`  [${w.level.toUpperCase()}] ${w.message}`);
      if (w.detail) lines.push(`         ${w.detail}`);
    }
    if (notFound.length > 0) {
      lines.push('');
      lines.push('CÓDIGOS NO ENCONTRADOS (código; registros; cantidad total)');
      for (const n of notFound) lines.push(`  ${n.id}; ${n.records}; ${n.totalAmount}`);
    }
    const response = await window.wienerApi.saveReport(lines.join('\n'));
    if (response.success) notify(`Informe guardado: ${response.filePath}`);
  };

  /* --- Perfiles ------------------------------------------------------ */

  const handleSaveProfile = async (): Promise<void> => {
    const response = await window.wienerApi.saveConfig(config);
    if (response.success) notify(`Perfil guardado: ${response.filePath}`);
  };

  const handleLoadProfile = async (): Promise<void> => {
    const response = await window.wienerApi.loadConfig();
    if (!response.success || !response.data) return;

    // normalizeConfig migra perfiles antiguos (groupByCol -> groupByCols, etc.).
    const migrated = normalizeConfig(response.data as Record<string, unknown>);
    setConfig(migrated);
    notify(lang === 'es' ? 'Perfil cargado.' : 'Profile loaded.');

    if (migrated.foodsFilePath) await inspect(migrated.foodsFilePath, 'foods');
    if (migrated.inputFilePath) {
      await inspect(migrated.inputFilePath, 'input');
      if (migrated.cookMethodCol) {
        setUniqueMethods(await window.wienerApi.scanUniqueValues(migrated.inputFilePath, migrated.cookMethodCol));
      }
    }
    if (migrated.recipesFilePath) await inspect(migrated.recipesFilePath, 'recipes');
  };

  const updateConfig = (key: string, value: unknown): void =>
    setConfig((prev) => ({ ...prev, [key]: value } as WienerConfig));

  const handleIdeSaveComplete = async (kind: FileKind): Promise<void> => {
    const path = kind === 'foods' ? config.foodsFilePath : kind === 'input' ? config.inputFilePath : config.recipesFilePath;
    if (path) await inspect(path, kind);
  };

  const errorWarnings = warnings.filter((w) => w.level === 'error');

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-umbrella-deep font-sans relative">
      {/* -------- Barra lateral -------- */}
      <div className="w-64 glass-sidebar flex flex-col z-20 shrink-0">
        <div className="p-5 border-b border-umbrella-mid/80 flex items-center space-x-3">
          <div
            className="w-14 h-14 shrink-0 rounded-full overflow-hidden cursor-pointer shadow-[0_0_15px_rgba(157,78,221,0.4)] hover:shadow-[0_0_25px_rgba(157,78,221,0.8)] transition-all border-2 border-umbrella-accent/40 bg-black flex items-center justify-center"
            onClick={() => setIsPlayingLogo(true)}
            title="Inicializar secuencia visual"
          >
            {isPlayingLogo
              ? <video src={logoAnim} autoPlay muted onEnded={() => setIsPlayingLogo(false)} className="w-full h-full object-cover" />
              : <img src={logoImg} alt="WienerCalc" className="w-full h-full object-cover" />}
          </div>
          <a href="https://wienerhoundstudios.netlify.app/" target="_blank" rel="noopener noreferrer"
            className="text-xl font-extrabold text-umbrella-bright tracking-widest uppercase hover:text-white hover:scale-105 transition-all">
            WienerCalc
          </a>
        </div>

        <nav className="flex-1 p-4 space-y-2 mt-2">
          <NavItem icon={<Database size={18} />} label={t.tab1} isActive={activeTab === 'sources'} onClick={() => setActiveTab('sources')} />
          <NavItem icon={<TableProperties size={18} />} label={t.tab2} isActive={activeTab === 'mapping'} onClick={() => setActiveTab('mapping')} />
          <NavItem icon={<Settings size={18} />} label={t.tab3} isActive={activeTab === 'rules'} onClick={() => setActiveTab('rules')} />
          <NavItem icon={<Play size={18} />} label={t.tab4} isActive={activeTab === 'calc'} onClick={() => setActiveTab('calc')} />
        </nav>

        <div className="p-4 border-t border-umbrella-mid/80">
          <p className="text-xs font-bold text-neutral-500 uppercase mb-3 px-2 tracking-widest">{t.profiles}</p>
          <div className="space-y-2 mb-4">
            <button onClick={handleSaveProfile} className="w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-all font-medium text-left text-sm text-neutral-400 hover:bg-umbrella-dark hover:text-umbrella-bright">
              <Save size={16} className="text-umbrella-accent" /><span>{t.saveCfg}</span>
            </button>
            <button onClick={handleLoadProfile} className="w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-all font-medium text-left text-sm text-neutral-400 hover:bg-umbrella-dark hover:text-umbrella-bright">
              <FolderOpen size={16} className="text-umbrella-accent" /><span>{t.loadCfg}</span>
            </button>
          </div>
          <button onClick={() => setLang(lang === 'en' ? 'es' : 'en')} className="w-full flex items-center justify-center space-x-2 px-4 py-2 glass-inner hover:bg-umbrella-mid/60 hover:text-umbrella-bright rounded-lg text-xs font-bold text-neutral-300 transition-all border-umbrella-mid/50">
            <Globe size={14} className="text-umbrella-bright" /><span>{t.lang}</span>
          </button>
          <div className="mt-6 text-center">
            <a href="https://github.com/Gandrenix" target="_blank" rel="noopener noreferrer" className="text-[10px] font-mono text-neutral-500 hover:text-umbrella-accent transition-colors block">
              © Created by WienerHoundStudios
            </a>
          </div>
        </div>
      </div>

      {/* -------- Panel principal -------- */}
      <div className="flex-1 p-8 overflow-y-auto relative">
        <div className="absolute top-6 right-8 z-10">
          <button onClick={() => setIsIdeOpen(true)} className="flex items-center space-x-2 bg-umbrella-dark border border-umbrella-accent hover:bg-umbrella-accent/20 text-umbrella-bright px-4 py-2 rounded-md font-mono text-xs tracking-widest transition-all shadow-[0_0_15px_rgba(157,78,221,0.2)]">
            <TerminalSquare size={16} /> <span>OPEN TERMINAL</span>
          </button>
        </div>

        <div className="max-w-4xl mx-auto mt-8">
          {fatalError && (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-500/60 bg-red-950/40 p-4">
              <XCircle size={20} className="text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-red-300 text-sm uppercase tracking-wide mb-1">Error</p>
                <p className="text-sm text-red-100 font-mono leading-relaxed">{fatalError}</p>
              </div>
              <button onClick={() => setFatalError(null)} className="text-red-400 hover:text-red-200"><X size={16} /></button>
            </div>
          )}

          {activeTab === 'sources' && (
            <StepSources
              config={config} meta={{ foods: foodMeta, input: inputMeta, recipes: recipeMeta }}
              onSelectFile={handleSelectFile} onRemoveFile={handleRemoveFile}
              updateConfig={updateConfig} recipeHeaders={recipeHeaders} t={t}
            />
          )}
          {activeTab === 'mapping' && (
            <StepMapping
              config={config} setConfig={setConfig} updateConfig={updateConfig}
              foodHeaders={foodHeaders} inputHeaders={inputHeaders} recipeHeaders={recipeHeaders}
              allHeaders={allHeaders} setUniqueMethods={setUniqueMethods}
              scaleIsValid={scaleIsValid} t={t}
            />
          )}
          {activeTab === 'rules' && (
            <StepRules
              config={config} setConfig={setConfig} foodHeaders={foodHeaders}
              allHeaders={allHeaders} uniqueMethods={uniqueMethods}
              formulaErrors={formulaErrors} foodSample={foodMeta.sampleRow} t={t} lang={lang}
            />
          )}
          {activeTab === 'calc' && (
            <StepCalculate
              isCalculating={isCalculating} results={results} warnings={warnings}
              notFound={notFound} stats={stats} errorWarnings={errorWarnings}
              onRun={handleRunCalculation} onExport={handleExportCsv}
              onExportExcel={handleExportExcel} onExportReport={handleExportReport} t={t}
            />
          )}
        </div>
      </div>

      {/* -------- Aviso flotante -------- */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] glass-panel border border-umbrella-accent px-6 py-3 rounded-lg text-sm font-mono text-umbrella-bright shadow-[0_0_30px_rgba(157,78,221,0.35)] max-w-xl text-center">
          {toast}
        </div>
      )}

      {/* -------- Terminal CSV -------- */}
      <div className={`fixed right-0 top-0 h-full bg-[#05010a] shadow-[-20px_0_50px_rgba(0,0,0,0.8)] z-50 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] border-l border-umbrella-mid/80 flex flex-col ${isIdeOpen ? 'translate-x-0' : 'translate-x-[110%]'} ${ideWidth === 'wide' ? 'w-[800px]' : 'w-[500px]'}`}>
        {isIdeOpen && (
          <CsvTerminal
            config={config}
            onClose={() => setIsIdeOpen(false)}
            onToggleWidth={() => setIdeWidth((w) => (w === 'normal' ? 'wide' : 'normal'))}
            isWide={ideWidth === 'wide'}
            onFileSaved={handleIdeSaveComplete}
          />
        )}
      </div>
    </div>
  );
}

/** Elige la primera columna cuyo nombre coincida con alguna sugerencia. */
function guessColumn(headers: string[], candidates: string[]): string {
  for (const candidate of candidates) {
    const found = headers.find((h) => h.toLowerCase() === candidate);
    if (found) return found;
  }
  return '';
}

/* ================================================================== */
/* Paso 1 — Fuentes de datos                                           */
/* ================================================================== */

function StepSources({ config, meta, onSelectFile, onRemoveFile, updateConfig, recipeHeaders, t }: any) {
  return (
    <div className="animate-step-reveal pb-10">
      <h2 className="text-3xl font-extrabold mb-2 tracking-wide text-white">{t.s1Title}</h2>
      <p className="text-neutral-400 mb-8 font-mono text-sm">{t.s1Desc}</p>

      <div className="grid grid-cols-3 gap-4">
        <FileDropzone
          title={t.s1Box1} filePath={config.foodsFilePath} placeholder={t.s1Click1} meta={meta.foods}
          onClick={() => onSelectFile('foods')} onRemove={() => onRemoveFile('foods')} t={t}
        />
        <FileDropzone
          title={t.s1Box2} filePath={config.inputFilePath} placeholder={t.s1Click2} meta={meta.input}
          onClick={() => onSelectFile('input')} onRemove={() => onRemoveFile('input')} t={t}
        />
        <FileDropzone
          title={t.s1Box3} filePath={config.recipesFilePath} placeholder={t.s1Click3} meta={meta.recipes}
          onClick={() => onSelectFile('recipes')} onRemove={() => onRemoveFile('recipes')} t={t}
        />
      </div>

      {config.recipesFilePath && (
        <div className="glass-panel p-6 mt-6 space-y-6">
          <div>
            <h3 className="font-bold text-lg text-white uppercase tracking-wide mb-1">{t.s1RecipeMode}</h3>
            <div className="grid grid-cols-3 gap-3 mt-4">
              {([
                ['auto', t.s1ModeAuto, t.s1ModeAutoHint],
                ['merge', t.s1ModeMerge, t.s1ModeMergeHint],
                ['dictionary', t.s1ModeDict, t.s1ModeDictHint]
              ] as const).map(([value, label, hint]) => (
                <button
                  key={value}
                  onClick={() => updateConfig('recipeMode', value)}
                  className={`text-left p-4 rounded-lg border transition-all ${config.recipeMode === value
                    ? 'border-umbrella-accent bg-umbrella-accent/15 shadow-[0_0_15px_rgba(157,78,221,0.25)]'
                    : 'border-umbrella-mid hover:border-umbrella-bright/60 bg-umbrella-dark/30'}`}
                >
                  <span className={`block font-bold text-sm mb-1 ${config.recipeMode === value ? 'text-umbrella-bright' : 'text-neutral-200'}`}>{label}</span>
                  <span className="block text-xs text-neutral-500 font-mono leading-snug">{hint}</span>
                </button>
              ))}
            </div>
          </div>

          {config.recipeMode === 'dictionary' && (
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-umbrella-mid/50">
              <SelectField label={t.s1RecipeIdCol} value={config.recipeIdCol} options={recipeHeaders}
                placeholder={t.s2Select} onChange={(v: string) => updateConfig('recipeIdCol', v)} />
              <SelectField label={t.s1RecipeIngCol} value={config.recipeIngredientCol} options={recipeHeaders}
                placeholder={t.s2Select} onChange={(v: string) => updateConfig('recipeIngredientCol', v)} />
              <SelectField label={t.s1RecipeAmtCol} value={config.recipeAmountCol} options={recipeHeaders}
                placeholder={t.s2Select} onChange={(v: string) => updateConfig('recipeAmountCol', v)} />
            </div>
          )}

          {config.recipeMode !== 'dictionary' && (
            <div className="pt-4 border-t border-umbrella-mid/50">
              <label className="block text-sm font-semibold mb-3 text-neutral-300 uppercase tracking-wide">{t.s1Collision}</label>
              <div className="grid grid-cols-2 gap-3">
                {([['foods', t.s1CollFoods], ['recipes', t.s1CollRecipes]] as const).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => updateConfig('collisionPolicy', value)}
                    className={`p-3 rounded-lg border text-sm font-bold transition-all ${config.collisionPolicy === value
                      ? 'border-umbrella-accent bg-umbrella-accent/15 text-umbrella-bright'
                      : 'border-umbrella-mid hover:border-umbrella-bright/60 text-neutral-300 bg-umbrella-dark/30'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-amber-400/80 mt-3 font-mono flex items-start gap-2">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />{t.s1CollHint}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FileDropzone({ title, filePath, placeholder, meta, onClick, onRemove, t }: any) {
  const isActive = !!filePath;
  const fileName = isActive ? String(filePath).split(/[\\/]/).pop() : '';

  return (
    <div
      onClick={onClick}
      className={`relative border-2 border-dashed rounded-xl p-6 transition-all cursor-pointer text-center group bg-umbrella-dark/20 ${isActive
        ? 'border-umbrella-accent bg-umbrella-accent/10 shadow-[inset_0_0_20px_rgba(157,78,221,0.1)]'
        : 'border-umbrella-mid hover:border-umbrella-bright/50 hover:bg-umbrella-dark/40'}`}
    >
      {isActive && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          title={t.s1Remove}
          aria-label={t.s1Remove}
          className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full flex items-center justify-center bg-umbrella-deep/90 border border-umbrella-mid text-neutral-400 hover:bg-red-500/20 hover:border-red-500 hover:text-red-400 transition-all"
        >
          <X size={14} />
        </button>
      )}

      <div className={`flex justify-center mb-3 transition-colors ${isActive ? 'text-umbrella-accent' : 'text-neutral-600 group-hover:text-umbrella-bright'}`}>
        {isActive ? <CheckCircle2 size={36} /> : <UploadCloud size={36} />}
      </div>

      <h4 className="font-bold text-white mb-2 tracking-wide uppercase text-xs">{title}</h4>

      {isActive ? (
        <>
          <p className="text-sm break-all font-mono text-umbrella-bright leading-snug" title={filePath}>{fileName}</p>
          <p className="text-[11px] font-mono text-neutral-500 mt-2">
            {meta?.rowCount !== undefined && <>{meta.rowCount} {t.s1Rows} · </>}
            {meta?.headers?.length ?? 0} {t.s1Cols}
            {meta?.delimiter && <> · {t.s1Delim} «{meta.delimiter === '\t' ? 'tab' : meta.delimiter}»</>}
          </p>
          <p className="text-[10px] font-mono text-neutral-600 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">{t.s1Change}</p>
        </>
      ) : (
        <p className="text-sm break-all font-mono text-neutral-500">{placeholder}</p>
      )}
    </div>
  );
}

/* ================================================================== */
/* Paso 2 — Mapeo                                                      */
/* ================================================================== */

function StepMapping({
  config, setConfig, updateConfig, foodHeaders, inputHeaders, recipeHeaders,
  allHeaders, setUniqueMethods, scaleIsValid, t
}: any) {

  const toggleInArray = (key: 'groupByCols' | 'descriptiveCols', value: string): void => {
    setConfig((prev: WienerConfig) => {
      const current = prev[key] ?? [];
      return {
        ...prev,
        [key]: current.includes(value) ? current.filter((c) => c !== value) : [...current, value]
      };
    });
  };

  return (
    <div className="animate-step-reveal pb-10">
      <h2 className="text-3xl font-extrabold mb-2 tracking-wide text-white">{t.s2Title}</h2>
      <p className="text-neutral-400 mb-8 font-mono text-sm">{t.s2Desc}</p>

      <div className="glass-panel p-6 space-y-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-umbrella-mid/50"><div className="w-1/3 h-full bg-umbrella-accent animate-pulse" /></div>

        <div className="grid grid-cols-2 gap-6 mt-2">
          <SelectField label={t.s2FoodId} value={config.foodIdCol} options={foodHeaders}
            placeholder={t.s2Select} onChange={(v: string) => updateConfig('foodIdCol', v)} />
          <SelectField label={t.s2InputId} value={config.inputIdCol} options={inputHeaders}
            placeholder={t.s2Select} onChange={(v: string) => updateConfig('inputIdCol', v)} />
          <SelectField label={t.s2Amount} value={config.amountCol} options={inputHeaders}
            placeholder={t.s2Select} onChange={(v: string) => updateConfig('amountCol', v)} />

          <div>
            <label className="block text-sm font-semibold mb-2 text-neutral-300 uppercase tracking-wide">{t.s2Scale}</label>
            <input
              type="number" step="any" value={Number.isFinite(config.inputScale) ? config.inputScale : ''}
              onChange={(e) => updateConfig('inputScale', e.target.value === '' ? NaN : parseFloat(e.target.value))}
              className={`w-full p-2.5 border rounded bg-umbrella-deep font-mono text-sm text-neutral-200 focus:outline-none transition-all ${scaleIsValid ? 'border-umbrella-mid focus:border-umbrella-bright' : 'border-red-500 focus:border-red-400'}`}
            />
            <p className={`text-xs mt-2 font-mono ${scaleIsValid ? 'text-neutral-500' : 'text-red-400'}`}>
              {scaleIsValid ? t.s2ScaleHint : t.s2ScaleBad}
            </p>
          </div>

          <SelectField
            label={t.s2CookCol} value={config.cookMethodCol} options={inputHeaders} placeholder={t.s2NoneCook}
            onChange={async (v: string) => {
              updateConfig('cookMethodCol', v);
              if (v && config.inputFilePath) setUniqueMethods(await window.wienerApi.scanUniqueValues(config.inputFilePath, v));
              else setUniqueMethods([]);
            }}
          />

          <div>
            <SelectField label={t.s2NonEdible} value={config.nonEdibleCol} options={foodHeaders}
              placeholder={t.s2NoneNonEdible} onChange={(v: string) => updateConfig('nonEdibleCol', v)} />
            {config.nonEdibleCol && (
              <div className="flex gap-2 mt-2">
                {([['fraction', t.s2Fraction], ['percent', t.s2Percent]] as const).map(([value, label]) => (
                  <button key={value} onClick={() => updateConfig('nonEdibleUnit', value)}
                    className={`flex-1 px-2 py-1.5 rounded text-xs font-bold border transition-all ${config.nonEdibleUnit === value
                      ? 'border-umbrella-accent bg-umbrella-accent/15 text-umbrella-bright'
                      : 'border-umbrella-mid text-neutral-400 hover:text-neutral-200'}`}>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* --- Agrupación múltiple --- */}
        <div className="pt-6 border-t border-umbrella-mid/50">
          <label className="block text-sm font-semibold mb-1 text-neutral-300 uppercase tracking-wide">{t.s2Group}</label>
          <p className="text-xs text-neutral-500 mb-3 font-mono">{t.s2GroupHint}</p>
          <ChipSelector
            options={inputHeaders} selected={config.groupByCols ?? []}
            onToggle={(v: string) => toggleInArray('groupByCols', v)} emptyLabel={t.s3SelFirst}
          />
          {(config.groupByCols ?? []).length === 0 && (
            <p className="text-xs text-neutral-500 mt-2 font-mono">{t.s2GroupNone}</p>
          )}
        </div>

        {/* --- Columnas descriptivas --- */}
        <div className="pt-6 border-t border-umbrella-mid/50">
          <label className="block text-sm font-semibold mb-1 text-neutral-300 uppercase tracking-wide">{t.s2Descriptive}</label>
          <p className="text-xs text-neutral-500 mb-3 font-mono">{t.s2DescriptiveHint}</p>
          <ChipSelector
            options={allHeaders} selected={config.descriptiveCols ?? []}
            onToggle={(v: string) => toggleInArray('descriptiveCols', v)} emptyLabel={t.s3SelFirst}
          />
        </div>

        {/* --- Alias --- */}
        {config.recipesFilePath && recipeHeaders.length > 0 && config.recipeMode !== 'dictionary' && (
          <div className="pt-6 border-t border-umbrella-mid/50">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-bold text-lg text-white uppercase tracking-wide">{t.s2AliasTitle}</h3>
                <p className="text-neutral-400 font-mono text-sm">{t.s2AliasDesc}</p>
              </div>
              <button
                onClick={() => setConfig({ ...config, columnAliases: [...config.columnAliases, { recipeCol: '', foodCol: '' }] })}
                className="flex items-center text-sm text-umbrella-bright font-bold hover:bg-umbrella-light/40 px-3 py-1.5 rounded transition"
              >
                <Plus size={16} className="mr-1" /> {t.s2AddAlias}
              </button>
            </div>
            <div className="space-y-3">
              {config.columnAliases.map((alias: any, idx: number) => (
                <div key={idx} className="flex items-center space-x-4 glass-inner p-3">
                  <div className="w-5/12">
                    <span className="text-xs font-bold uppercase text-neutral-400 tracking-wider block mb-1">{t.s2RecipeCol}</span>
                    <select value={alias.recipeCol}
                      onChange={(e) => { const a = [...config.columnAliases]; a[idx] = { ...a[idx], recipeCol: e.target.value }; setConfig({ ...config, columnAliases: a }); }}
                      className="w-full p-2 border border-umbrella-mid rounded bg-umbrella-deep font-mono text-sm text-neutral-200 focus:outline-none focus:border-umbrella-bright">
                      <option value="">{t.s2Select}</option>
                      {recipeHeaders.map((h: string) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div className="w-2 flex justify-center text-umbrella-accent font-bold mt-5">=</div>
                  <div className="w-5/12">
                    <span className="text-xs font-bold uppercase text-neutral-400 tracking-wider block mb-1">{t.s2FoodCol}</span>
                    <select value={alias.foodCol}
                      onChange={(e) => { const a = [...config.columnAliases]; a[idx] = { ...a[idx], foodCol: e.target.value }; setConfig({ ...config, columnAliases: a }); }}
                      className="w-full p-2 border border-umbrella-mid rounded bg-umbrella-deep font-mono text-sm text-neutral-200 focus:outline-none focus:border-umbrella-bright">
                      <option value="">{t.s2Select}</option>
                      {foodHeaders.map((h: string) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div className="w-2/12 pt-5 text-right">
                    <button onClick={() => setConfig({ ...config, columnAliases: config.columnAliases.filter((_: any, i: number) => i !== idx) })}
                      className="text-neutral-500 hover:text-red-400 p-2 transition"><Trash2 size={18} /></button>
                  </div>
                </div>
              ))}
              {config.columnAliases.length === 0 && (
                <div className="text-center p-4 border border-dashed border-umbrella-mid rounded-lg text-neutral-500 font-mono text-sm">{t.s2NoAlias}</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ================================================================== */
/* Paso 3 — Reglas                                                     */
/* ================================================================== */

/** Nivel de anidamiento -> color. Se repite en ciclo para fórmulas muy anidadas. */
const PAREN_DEPTH_COLORS = ['text-blue-300', 'text-emerald-300', 'text-amber-300', 'text-pink-300', 'text-cyan-300'];

/**
 * Colorea los paréntesis por profundidad ("rainbow parens", como en los
 * editores de código) y marca en rojo los que no tienen pareja. Responde
 * directamente a "¿qué pasa si hay paréntesis dentro de paréntesis?": ahora
 * se ve — cada nivel tiene su color, y un paréntesis suelto se nota al
 * instante en rojo, antes incluso de ejecutar el cálculo.
 */
function renderColoredFormula(text: string): React.ReactNode[] {
  // El análisis de anidamiento/emparejado vive en `src/shared/parenHighlight.ts`,
  // como función pura y con pruebas propias (18/18) — aquí sólo se traduce
  // a color. Así, si el algoritmo tuviera un error, se detecta con datos,
  // no mirando la pantalla.
  const parens = analyzeParens(text);
  const byIndex = new Map(parens.map((p) => [p.index, p]));

  const parts: React.ReactNode[] = [];
  let buffer = '';
  const flushBuffer = (): void => {
    if (buffer) { parts.push(<span key={parts.length}>{buffer}</span>); buffer = ''; }
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const token = byIndex.get(i);

    if (token && (ch === '(' || ch === ')')) {
      flushBuffer();
      if (!token.matched) {
        parts.push(<span key={parts.length} className="text-red-400 font-bold bg-red-500/20 rounded-sm">{ch}</span>);
      } else {
        const color = PAREN_DEPTH_COLORS[token.depth % PAREN_DEPTH_COLORS.length];
        parts.push(<span key={parts.length} className={`${color} font-bold`}>{ch}</span>);
      }
    } else {
      buffer += ch;
    }
  }
  flushBuffer();

  return parts;
}

/**
 * Campo de fórmula con paréntesis coloreados por profundidad, autocompletado
 * del paréntesis de cierre y salto sobre él si ya existe (igual que en un
 * editor de código). El texto real del <input> es invisible; lo que se ve
 * es la capa coloreada de debajo, sincronizada carácter a carácter.
 */
function FormulaEditor({ value, onChange, onFocus, placeholder, hasError, inputRef }: {
  value: string;
  onChange: (next: string) => void;
  onFocus: () => void;
  placeholder: string;
  hasError: boolean;
  inputRef: (el: HTMLInputElement | null) => void;
}): React.JSX.Element {
  const overlayRef = useRef<HTMLDivElement | null>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    const el = e.currentTarget;
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;

    if (e.key === '(') {
      e.preventDefault();
      const selected = value.slice(start, end);
      const next = value.slice(0, start) + '(' + selected + ')' + value.slice(end);
      const caret = selected.length > 0 ? start + selected.length + 2 : start + 1;
      onChange(next);
      requestAnimationFrame(() => el.setSelectionRange(caret, caret));
      return;
    }

    if (e.key === ')' && start === end && value[start] === ')') {
      // Ya hay un ")" justo ahí: saltamos sobre él en vez de duplicarlo.
      e.preventDefault();
      requestAnimationFrame(() => el.setSelectionRange(start + 1, start + 1));
      return;
    }

    if (e.key === 'Backspace' && start === end && start > 0 && value[start - 1] === '(' && value[start] === ')') {
      // Borra el par vacío "()" de una sola vez.
      e.preventDefault();
      const next = value.slice(0, start - 1) + value.slice(start + 1);
      onChange(next);
      requestAnimationFrame(() => el.setSelectionRange(start - 1, start - 1));
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLInputElement>): void => {
    if (overlayRef.current) overlayRef.current.scrollLeft = e.currentTarget.scrollLeft;
  };

  return (
    <div className={`relative flex-1 border rounded bg-umbrella-deep transition-colors ${hasError ? 'border-red-500' : 'border-umbrella-mid focus-within:border-umbrella-bright'}`}>
      <div ref={overlayRef} aria-hidden className="absolute inset-0 flex items-center px-2 overflow-hidden pointer-events-none whitespace-pre font-mono text-sm">
        {value ? renderColoredFormula(value) : <span className="text-neutral-600">{placeholder}</span>}
      </div>
      <input
        type="text"
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onKeyDown={handleKeyDown}
        onScroll={handleScroll}
        spellCheck={false}
        className={`relative w-full bg-transparent p-2 font-mono text-sm text-transparent caret-white outline-none selection:bg-umbrella-accent/40 ${hasError ? 'selection:bg-red-500/30' : ''}`}
      />
    </div>
  );
}

/**
 * Fórmulas nutricionales frecuentes, listas para insertar y ajustar.
 * Las variables (`protein`, `fat`, `kcal`…) son marcadores: casi nunca
 * coincidirán exactamente con las columnas del usuario, así que la fórmula
 * insertada saldrá en rojo — es intencional. El flujo esperado es: insertar
 * la plantilla, seleccionar el marcador con doble clic y sustituirlo por la
 * columna real haciendo clic en la lista de variables.
 */
const FORMULA_TEMPLATES = [
  { field: 'energia_kcal', expr: 'protein * 4 + fat * 9 + carbs * 4', label_es: 'Energía de Atwater (kcal)', label_en: 'Atwater energy (kcal)' },
  { field: 'energia_kJ', expr: 'protein * 17 + fat * 38 + carbs * 17', label_es: 'Energía de Atwater (kJ)', label_en: 'Atwater energy (kJ)' },
  { field: 'pct_grasa', expr: '(fat * 9 / kcal) * 100', label_es: '% Energía de grasa', label_en: '% Energy from fat' },
  { field: 'pct_proteina', expr: '(protein * 4 / kcal) * 100', label_es: '% Energía de proteína', label_en: '% Energy from protein' },
  { field: 'pct_carbohidratos', expr: '(carbs * 4 / kcal) * 100', label_es: '% Energía de carbohidratos', label_en: '% Energy from carbs' },
  { field: 'densidad_nutriente', expr: '(nutriente / kcal) * 1000', label_es: 'Densidad de nutriente / 1000 kcal', label_en: 'Nutrient density / 1000 kcal' },
  { field: 'relacion_na_k', expr: 'sodio_mg / potasio_mg', label_es: 'Relación sodio/potasio', label_en: 'Sodium/potassium ratio' }
] as const;

function StepRules({ config, setConfig, foodHeaders, allHeaders, uniqueMethods, formulaErrors, foodSample, t, lang }: any) {
  // --- Insertar variables, operadores y plantillas en el cursor --------
  //
  // Antes, hacer clic en una variable la copiaba al portapapeles y el
  // usuario tenía que pegarla a mano. Ahora todo (variables, operadores,
  // paréntesis, plantillas) se inserta directamente en la posición del
  // cursor de la fórmula que esté enfocada, o crea una regla nueva si
  // todavía no hay ninguna. Esto no cambia el motor de fórmulas: los
  // paréntesis, funciones y operadores ya funcionaban (ver
  // `src/shared/formula.ts`); es una mejora de interacción.
  const [activeFormulaIndex, setActiveFormulaIndex] = useState<number | null>(null);
  const formulaInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const pendingCaret = useRef<{ index: number; position: number } | null>(null);

  useEffect(() => {
    const pending = pendingCaret.current;
    if (!pending) return;
    pendingCaret.current = null;
    const el = formulaInputRefs.current[pending.index];
    if (!el) return;
    el.focus();
    el.setSelectionRange(pending.position, pending.position);
  }, [config.calculations]);

  const addCalcRule = (): void => {
    const rules = [...config.calculations, { outputField: '', expression: '' }];
    const newIndex = rules.length - 1;
    setActiveFormulaIndex(newIndex);
    pendingCaret.current = { index: newIndex, position: 0 };
    setConfig({ ...config, calculations: rules });
  };

  const removeCalcRule = (idx: number): void => {
    setConfig({ ...config, calculations: config.calculations.filter((_: any, i: number) => i !== idx) });
    setActiveFormulaIndex(null);
  };

  const useTemplate = (field: string, expr: string): void => {
    const rules = [...config.calculations, { outputField: field, expression: expr }];
    const newIndex = rules.length - 1;
    setActiveFormulaIndex(newIndex);
    pendingCaret.current = { index: newIndex, position: expr.length };
    setConfig({ ...config, calculations: rules });
  };

  /**
   * Núcleo compartido de inserción: dado el texto de "antes" y "después"
   * del cursor de la fórmula activa, `build` decide qué insertar y dónde
   * queda el cursor tras la inserción. Si no hay ninguna fórmula activa,
   * crea una regla nueva y aplica `build('', '')` sobre ella.
   */
  const performInsertion = (build: (before: string, after: string) => { insertText: string; caretOffsetWithinInsert: number }): void => {
    const rules = [...config.calculations];

    if (activeFormulaIndex === null || activeFormulaIndex >= rules.length) {
      const { insertText, caretOffsetWithinInsert } = build('', '');
      rules.push({ outputField: '', expression: insertText });
      const newIndex = rules.length - 1;
      setActiveFormulaIndex(newIndex);
      pendingCaret.current = { index: newIndex, position: caretOffsetWithinInsert };
      setConfig({ ...config, calculations: rules });
      return;
    }

    const idx = activeFormulaIndex;
    const rule = rules[idx];
    const el = formulaInputRefs.current[idx];
    const start = el?.selectionStart ?? rule.expression.length;
    const end = el?.selectionEnd ?? rule.expression.length;
    const before = rule.expression.slice(0, start);
    const after = rule.expression.slice(end);
    const { insertText, caretOffsetWithinInsert } = build(before, after);

    rules[idx] = { ...rule, expression: before + insertText + after };
    pendingCaret.current = { index: idx, position: before.length + caretOffsetWithinInsert };
    setConfig({ ...config, calculations: rules });
  };

  /** Inserta el nombre de una columna en el cursor de la fórmula activa. */
  const insertVariableAtCursor = (name: string): void => {
    performInsertion((before, after) => {
      // Evita pegar dos identificadores sin separación (p. ej. "proteinfat"):
      // si el carácter contiguo es alfanumérico, se antepone/añade un espacio.
      const needsLeadingSpace = before.length > 0 && /[A-Za-zÀ-ÿ0-9_)]$/.test(before);
      const needsTrailingSpace = after.length > 0 && /^[A-Za-zÀ-ÿ0-9_(]/.test(after);
      const insertText = (needsLeadingSpace ? ' ' : '') + name + (needsTrailingSpace ? ' ' : '');
      return { insertText, caretOffsetWithinInsert: insertText.length };
    });
  };

  /** Inserta un operador con espacios propios, sin duplicar los que ya haya. */
  const insertOperator = (symbol: string): void => {
    performInsertion((before, after) => {
      const leadingSpace = before === '' || /\s$/.test(before) ? '' : ' ';
      const trailingSpace = after === '' || /^\s/.test(after) ? '' : ' ';
      const insertText = `${leadingSpace}${symbol}${trailingSpace}`;
      return { insertText, caretOffsetWithinInsert: insertText.length };
    });
  };

  /** Botón "( )": envuelve la selección entre paréntesis, o inserta un par vacío con el cursor en medio. */
  const insertParenPair = (): void => {
    const rules = [...config.calculations];
    if (activeFormulaIndex === null || activeFormulaIndex >= rules.length) {
      rules.push({ outputField: '', expression: '()' });
      const newIndex = rules.length - 1;
      setActiveFormulaIndex(newIndex);
      pendingCaret.current = { index: newIndex, position: 1 };
      setConfig({ ...config, calculations: rules });
      return;
    }
    const idx = activeFormulaIndex;
    const rule = rules[idx];
    const el = formulaInputRefs.current[idx];
    const start = el?.selectionStart ?? rule.expression.length;
    const end = el?.selectionEnd ?? rule.expression.length;
    const before = rule.expression.slice(0, start);
    const selected = rule.expression.slice(start, end);
    const after = rule.expression.slice(end);

    rules[idx] = { ...rule, expression: `${before}(${selected})${after}` };
    const caretPos = selected.length > 0 ? before.length + selected.length + 2 : before.length + 1;
    pendingCaret.current = { index: idx, position: caretPos };
    setConfig({ ...config, calculations: rules });
  };

  const addCookRule = (): void => setConfig({ ...config, cookRules: [...config.cookRules, { method: '', reduceField: '', targetNutrients: [] }] });

  return (
    <div className="animate-step-reveal pb-10">
      <h2 className="text-3xl font-extrabold mb-6 tracking-wide text-white">{t.s3Title}</h2>

      <div className="glass-panel p-6 mb-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-umbrella-mid/50"><div className="w-1/2 h-full bg-umbrella-bright animate-pulse" style={{ animationDelay: '0.5s' }} /></div>
        <div className="flex justify-between items-center mb-4 border-b border-umbrella-mid pb-3 mt-2">
          <h3 className="font-bold text-lg text-white uppercase tracking-wide">{t.s3Math}</h3>
          <button onClick={addCalcRule} className="flex items-center text-sm text-umbrella-bright font-bold hover:bg-umbrella-light/40 px-3 py-1.5 rounded transition">
            <Plus size={16} className="mr-1" /> {t.s3AddRule}
          </button>
        </div>

        {/* --- Plantillas de fórmulas nutricionales comunes --- */}
        <div className="mb-5 p-4 bg-umbrella-deep/50 border border-umbrella-mid rounded-lg">
          <p className="text-xs text-umbrella-bright font-bold uppercase mb-1 tracking-widest">{t.s3TplTitle}</p>
          <p className="text-[11px] text-neutral-500 font-mono mb-3">{t.s3TplHint}</p>
          <div className="flex flex-wrap gap-2">
            {FORMULA_TEMPLATES.map((tpl) => (
              <button key={tpl.field} onClick={() => useTemplate(tpl.field, tpl.expr)}
                title={tpl.expr}
                className="px-2.5 py-1.5 bg-umbrella-dark border border-umbrella-mid/80 text-neutral-200 text-xs font-semibold rounded hover:bg-umbrella-light hover:border-umbrella-bright hover:text-umbrella-bright transition">
                {lang === 'es' ? tpl.label_es : tpl.label_en}
              </button>
            ))}
          </div>
        </div>

        {allHeaders.length > 0 && (
          <div className="mb-5 p-4 bg-umbrella-deep/50 border border-umbrella-mid rounded-lg space-y-3">
            <div>
              <p className="text-xs text-umbrella-bright font-bold uppercase mb-3 tracking-widest">{t.s3Vars}</p>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {allHeaders.map((h: string) => (
                  <button key={h} onClick={() => insertVariableAtCursor(h)} title={t.s3InsertHint}
                    className="px-2 py-1 bg-umbrella-dark border border-umbrella-mid text-umbrella-bright text-xs font-mono rounded hover:bg-umbrella-light hover:border-umbrella-bright transition">{h}</button>
                ))}
              </div>
            </div>
            <div className="pt-3 border-t border-umbrella-mid/40">
              <p className="text-xs text-neutral-400 font-bold uppercase mb-2 tracking-widest">{t.s3OperatorsTitle}</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={insertParenPair} title={t.s3ParenHint}
                  className="px-3 py-1 bg-umbrella-dark border border-umbrella-accent/60 text-umbrella-bright text-sm font-mono font-bold rounded hover:bg-umbrella-accent/20 transition">( )</button>
                {['+', '−', '×', '÷', '^', ','].map((symbol) => {
                  const engineSymbol = symbol === '−' ? '-' : symbol === '×' ? '*' : symbol === '÷' ? '/' : symbol;
                  return (
                    <button key={symbol} onClick={() => insertOperator(engineSymbol)}
                      className="w-9 py-1 bg-umbrella-dark border border-umbrella-mid text-neutral-200 text-sm font-mono font-bold rounded hover:bg-umbrella-light hover:border-umbrella-bright hover:text-umbrella-bright transition">{symbol}</button>
                  );
                })}
              </div>
            </div>
            <p className="text-[11px] text-neutral-500 font-mono pt-1">{t.s3Funcs}</p>
          </div>
        )}

        {config.calculations.map((calc: any, idx: number) => {
          const preview = !formulaErrors[idx] && calc.expression?.trim() && foodSample
            ? (() => {
                const compiled = compileFormula(calc.expression, allHeaders);
                if (compiled.error) return null;
                const result = compiled.evaluate(foodSample);
                return result.value === null ? null : result;
              })()
            : null;

          return (
            <div key={idx} className={`glass-inner p-3 mb-3 rounded transition-all ${activeFormulaIndex === idx ? 'ring-1 ring-umbrella-accent' : ''}`}>
              <div className="flex items-center space-x-3">
                <input type="text" value={calc.outputField} placeholder={t.s3NewField}
                  onChange={(e) => { const c = [...config.calculations]; c[idx] = { ...c[idx], outputField: e.target.value }; setConfig({ ...config, calculations: c }); }}
                  className="p-2 border border-umbrella-mid rounded bg-umbrella-deep w-1/4 font-mono text-sm text-neutral-200 focus:outline-none focus:border-umbrella-bright" />
                <span className="text-umbrella-accent font-bold">=</span>
                <FormulaEditor
                  value={calc.expression}
                  placeholder={t.s3Paste}
                  hasError={!!formulaErrors[idx]}
                  inputRef={(el) => { formulaInputRefs.current[idx] = el; }}
                  onFocus={() => setActiveFormulaIndex(idx)}
                  onChange={(next) => { const c = [...config.calculations]; c[idx] = { ...c[idx], expression: next }; setConfig({ ...config, calculations: c }); }}
                />
                <button onClick={() => removeCalcRule(idx)}
                  className="text-neutral-500 hover:text-red-400 p-2 transition"><Trash2 size={18} /></button>
              </div>
              {formulaErrors[idx] && (
                <p className="text-xs text-red-400 font-mono mt-2 flex items-start gap-2 pl-1">
                  <AlertTriangle size={13} className="shrink-0 mt-0.5" />{formulaErrors[idx]}
                </p>
              )}
              {preview && (
                <p className="text-xs font-mono mt-2 pl-1 flex items-center gap-2 text-emerald-400/90">
                  <CheckCircle2 size={13} className="shrink-0" />
                  {t.s3PreviewLabel}: <span className="font-bold">{preview.value}</span>
                  {preview.missing && preview.missing.length > 0 && (
                    <span className="text-neutral-500">({t.s3PreviewMissing}: {preview.missing.join(', ')})</span>
                  )}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="glass-panel p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-umbrella-mid/50"><div className="w-1/4 h-full bg-umbrella-accent animate-pulse" style={{ animationDelay: '1s' }} /></div>
        <div className="flex justify-between items-center mb-4 border-b border-umbrella-mid pb-3 mt-2">
          <h3 className="font-bold text-lg text-white uppercase tracking-wide">{t.s3CookRed}</h3>
          <button onClick={addCookRule} className="flex items-center text-sm text-umbrella-bright font-bold hover:bg-umbrella-light/40 px-3 py-1.5 rounded transition">
            <Plus size={16} className="mr-1" /> {t.s3AddCook}
          </button>
        </div>

        {config.cookRules.map((rule: any, idx: number) => (
          <div key={idx} className="flex items-start space-x-4 glass-inner p-4 mb-3">
            <div className="w-1/4">
              <span className="text-xs font-bold uppercase text-neutral-400 tracking-wider">{t.s3Method}</span>
              {uniqueMethods.length > 0 ? (
                <select value={rule.method}
                  onChange={(e) => { const r = [...config.cookRules]; r[idx] = { ...r[idx], method: e.target.value }; setConfig({ ...config, cookRules: r }); }}
                  className="p-2 border border-umbrella-mid rounded bg-umbrella-deep w-full font-mono text-sm mt-2 text-neutral-200 focus:outline-none focus:border-umbrella-bright">
                  <option value="">{t.s3SelMethod}</option>
                  {uniqueMethods.map((m: string) => <option key={m} value={m}>{m}</option>)}
                </select>
              ) : (
                <input type="text" value={rule.method} placeholder="ej. boil"
                  onChange={(e) => { const r = [...config.cookRules]; r[idx] = { ...r[idx], method: e.target.value }; setConfig({ ...config, cookRules: r }); }}
                  className="p-2 border border-umbrella-mid rounded bg-umbrella-deep w-full font-mono text-sm mt-2 text-neutral-200 focus:outline-none focus:border-umbrella-bright" />
              )}
            </div>

            <div className="w-1/4">
              <span className="text-xs font-bold uppercase text-neutral-400 tracking-wider">{t.s3Reduce}</span>
              <select value={rule.reduceField}
                onChange={(e) => { const r = [...config.cookRules]; r[idx] = { ...r[idx], reduceField: e.target.value }; setConfig({ ...config, cookRules: r }); }}
                className="p-2 border border-umbrella-mid rounded bg-umbrella-deep w-full font-mono text-sm mt-2 text-neutral-200 focus:outline-none focus:border-umbrella-bright">
                <option value="">{t.s2Select}</option>
                {foodHeaders.map((h: string) => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>

            <div className="flex-1">
              <span className="text-xs font-bold uppercase text-neutral-400 tracking-wider">{t.s3Target}</span>
              <div className="mt-2 h-28 overflow-y-auto border border-umbrella-mid rounded bg-umbrella-deep/50 p-2 space-y-1">
                {foodHeaders.length === 0
                  ? <span className="text-sm text-neutral-500 italic font-mono">{t.s3SelFirst}</span>
                  : foodHeaders.map((h: string) => (
                    <label key={h} className="flex items-center space-x-2 text-sm cursor-pointer hover:bg-umbrella-dark p-1.5 rounded transition">
                      <input type="checkbox" checked={rule.targetNutrients.includes(h)}
                        onChange={(e) => {
                          const r = [...config.cookRules];
                          const targets = e.target.checked
                            ? [...r[idx].targetNutrients, h]
                            : r[idx].targetNutrients.filter((n: string) => n !== h);
                          r[idx] = { ...r[idx], targetNutrients: targets };
                          setConfig({ ...config, cookRules: r });
                        }}
                        className="rounded bg-umbrella-deep border-umbrella-mid text-umbrella-accent focus:ring-umbrella-accent focus:ring-offset-umbrella-deep" />
                      <span className="font-mono text-neutral-300">{h}</span>
                    </label>
                  ))}
              </div>
            </div>

            <div className="pt-6">
              <button onClick={() => setConfig({ ...config, cookRules: config.cookRules.filter((_: any, i: number) => i !== idx) })}
                className="text-neutral-500 hover:text-red-400 p-2"><Trash2 size={18} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================================================================== */
/* Paso 4 — Calcular                                                   */
/* ================================================================== */

function StepCalculate({
  isCalculating, results, warnings, notFound, stats, errorWarnings,
  onRun, onExport, onExportExcel, onExportReport, t
}: any) {

  // Unión de columnas de todas las filas mostradas, no sólo de la primera.
  const allKeys = useMemo(() => {
    if (!results || results.length === 0) return [];
    const keys = new Set<string>();
    results.slice(0, 200).forEach((row: Record<string, unknown>) => Object.keys(row).forEach((k) => keys.add(k)));
    return Array.from(keys);
  }, [results]);

  return (
    <div className="animate-step-reveal pb-10">
      <h2 className="text-3xl font-extrabold mb-6 tracking-wide text-white">{t.s4Title}</h2>

      <div className="glass-panel p-10 text-center mb-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-umbrella-mid/50"><div className="w-full h-full bg-umbrella-accent animate-pulse" style={{ animationDelay: '0.2s' }} /></div>
        <div className="mb-6 flex justify-center mt-4">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(157,78,221,0.2)] ${results ? 'bg-umbrella-light text-umbrella-bright' : 'bg-umbrella-deep border border-umbrella-mid text-umbrella-accent'}`}>
            {results ? <CheckCircle2 size={48} /> : <Play size={48} className="ml-2" />}
          </div>
        </div>

        <h3 className="text-2xl font-bold mb-3 text-white tracking-wide">
          {isCalculating ? t.s4Crunching : results ? t.s4Complete : t.s4Ready}
        </h3>
        <p className="text-neutral-400 mb-8 max-w-md mx-auto font-mono text-sm">
          {results ? `${results.length} ${t.s4StatsRows.toLowerCase()}` : t.s4Desc}
        </p>

        <div className="flex justify-center flex-wrap gap-4">
          <button onClick={onRun} disabled={isCalculating}
            className={`px-10 py-3.5 rounded-lg font-extrabold uppercase tracking-widest transition-all flex items-center ${isCalculating ? 'glass-inner text-neutral-500 cursor-not-allowed' : 'btn-calculate bg-umbrella-accent text-white'}`}>
            {isCalculating ? t.s4Processing : <><Play size={18} className="mr-2" /> {t.s4Run}</>}
          </button>
          {results && (
            <>
              <button onClick={onExport} className="glass-inner hover:bg-umbrella-light/50 text-neutral-200 px-6 py-3.5 rounded-lg font-bold border-umbrella-mid transition flex items-center">
                <Download size={18} className="mr-2 text-umbrella-bright" /> {t.s4ExportCSV}
              </button>
              <button onClick={onExportExcel} className="glass-inner hover:bg-umbrella-light/50 text-neutral-200 px-6 py-3.5 rounded-lg font-bold border-umbrella-mid transition flex items-center">
                <FileSpreadsheet size={18} className="mr-2 text-green-400" /> {t.s4ExportExcel}
              </button>
              <button onClick={onExportReport} className="glass-inner hover:bg-umbrella-light/50 text-neutral-200 px-6 py-3.5 rounded-lg font-bold border-umbrella-mid transition flex items-center">
                <FileText size={18} className="mr-2 text-umbrella-accent" /> {t.s4Report}
              </button>
            </>
          )}
        </div>
      </div>

      {/* --- Estadísticas --- */}
      {stats && (
        <div className="grid grid-cols-5 gap-3 mb-6">
          <StatCard label={t.s4Stats} value={stats.foodsLoaded} />
          <StatCard label={t.s4StatsRecipes} value={stats.recipesLoaded} />
          <StatCard label={t.s4StatsRecords} value={stats.inputRecords} />
          <StatCard label={t.s4StatsRows} value={stats.outputRows} />
          <StatCard label={t.s4Collisions} value={stats.collisions} highlight={stats.collisions > 0} />
        </div>
      )}

      {/* --- Informe de avisos --- */}
      {(warnings.length > 0 || results) && (
        <div className="glass-panel p-5 mb-6">
          <h4 className="font-bold text-umbrella-bright tracking-widest uppercase text-xs mb-4">{t.s4Warnings}</h4>
          {warnings.length === 0 ? (
            <p className="text-sm font-mono text-green-400 flex items-center gap-2"><CheckCircle2 size={16} /> {t.s4NoWarnings}</p>
          ) : (
            <div className="space-y-2">
              {errorWarnings.length > 0 && (
                <p className="text-xs font-mono text-red-400 mb-3">
                  {errorWarnings.length} problema(s) impidieron calcular alguna regla.
                </p>
              )}
              {warnings.map((w: WienerWarning, i: number) => <WarningRow key={i} warning={w} />)}
            </div>
          )}
        </div>
      )}

      {/* --- Códigos no encontrados --- */}
      {notFound.length > 0 && (
        <div className="glass-panel p-5 mb-6 border border-amber-500/40">
          <h4 className="font-bold text-amber-400 tracking-widest uppercase text-xs mb-3 flex items-center gap-2">
            <AlertTriangle size={14} /> {t.s4NotFound} ({notFound.length})
          </h4>
          <div className="max-h-48 overflow-y-auto">
            <table className="w-full text-xs font-mono">
              <thead className="text-neutral-500 uppercase">
                <tr><th className="text-left py-1">Código</th><th className="text-right py-1">Registros</th><th className="text-right py-1">Cantidad total</th></tr>
              </thead>
              <tbody className="text-neutral-300">
                {notFound.map((n: NotFoundEntry) => (
                  <tr key={n.id} className="border-t border-umbrella-mid/40">
                    <td className="py-1">{n.id}</td>
                    <td className="py-1 text-right">{n.records}</td>
                    <td className="py-1 text-right">{n.totalAmount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- Vista previa --- */}
      {results && results.length > 0 && (
        <div className="glass-panel p-1 border border-umbrella-mid overflow-hidden">
          <div className="bg-umbrella-deep/80 p-3 flex justify-between items-center border-b border-umbrella-mid">
            <h4 className="font-bold text-umbrella-bright tracking-widest uppercase text-xs">{t.s4Preview}</h4>
            <span className="text-xs font-mono text-neutral-500">{allKeys.length} col.</span>
          </div>
          <div className="overflow-x-auto w-full">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="text-xs text-umbrella-bright uppercase bg-umbrella-dark/50">
                <tr>{allKeys.map((key) => <th key={key} className="px-5 py-3 border-b border-umbrella-mid font-mono">{key}</th>)}</tr>
              </thead>
              <tbody className="font-mono text-neutral-300">
                {results.slice(0, 5).map((row: Record<string, unknown>, i: number) => (
                  <tr key={i} className="border-b border-umbrella-mid/50 hover:bg-umbrella-light/20 transition-colors">
                    {allKeys.map((key) => (
                      <td key={key} className="px-5 py-3">
                        {row[key] === undefined || row[key] === null
                          ? <span className="text-neutral-600 italic">—</span>
                          : String(row[key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function WarningRow({ warning }: { warning: WienerWarning }) {
  const styles = {
    error: { border: 'border-red-500/50', bg: 'bg-red-950/30', text: 'text-red-300', icon: <XCircle size={15} className="text-red-400" /> },
    warn: { border: 'border-amber-500/40', bg: 'bg-amber-950/20', text: 'text-amber-200', icon: <AlertTriangle size={15} className="text-amber-400" /> },
    info: { border: 'border-umbrella-mid', bg: 'bg-umbrella-dark/30', text: 'text-neutral-300', icon: <Info size={15} className="text-umbrella-bright" /> }
  }[warning.level];

  return (
    <div className={`flex items-start gap-3 rounded border ${styles.border} ${styles.bg} p-3`}>
      <span className="shrink-0 mt-0.5">{styles.icon}</span>
      <div className="min-w-0">
        <p className={`text-sm font-mono leading-snug ${styles.text}`}>{warning.message}</p>
        {warning.detail && <p className="text-xs font-mono text-neutral-500 mt-1 break-all">{warning.detail}</p>}
      </div>
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`glass-inner p-3 text-center rounded-lg border ${highlight ? 'border-amber-500/50' : 'border-umbrella-mid/60'}`}>
      <p className={`text-2xl font-extrabold font-mono ${highlight ? 'text-amber-400' : 'text-umbrella-bright'}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-widest text-neutral-500 mt-1">{label}</p>
    </div>
  );
}

/* ================================================================== */
/* Componentes reutilizables                                           */
/* ================================================================== */

function SelectField({ label, value, options, placeholder, onChange }: any) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-2 text-neutral-300 uppercase tracking-wide">{label}</label>
      <select value={value || ''} onChange={(e) => onChange(e.target.value)}
        className="w-full p-2.5 border border-umbrella-mid rounded bg-umbrella-deep font-mono text-sm text-neutral-200 focus:outline-none focus:border-umbrella-bright focus:ring-1 focus:ring-umbrella-bright transition-all">
        <option value="">{placeholder}</option>
        {options.map((h: string) => <option key={h} value={h}>{h}</option>)}
      </select>
    </div>
  );
}

function ChipSelector({ options, selected, onToggle, emptyLabel }: any) {
  if (!options || options.length === 0) {
    return <p className="text-sm text-neutral-500 italic font-mono">{emptyLabel}</p>;
  }
  return (
    <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1">
      {options.map((option: string) => {
        const isOn = selected.includes(option);
        return (
          <button key={option} onClick={() => onToggle(option)}
            className={`px-3 py-1.5 rounded-full text-xs font-mono border transition-all ${isOn
              ? 'bg-umbrella-accent/25 border-umbrella-accent text-umbrella-bright font-bold'
              : 'bg-umbrella-dark/40 border-umbrella-mid text-neutral-400 hover:border-umbrella-bright/60 hover:text-neutral-200'}`}>
            {isOn && <span className="mr-1">✓</span>}{option}
          </button>
        );
      })}
    </div>
  );
}

function NavItem({ icon, label, isActive, onClick }: any) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-lg transition-all font-bold text-left tracking-wide ${isActive ? 'bg-umbrella-accent text-white shadow-[0_0_15px_rgba(157,78,221,0.4)]' : 'hover:bg-umbrella-dark/60 text-neutral-400 hover:text-umbrella-bright'}`}>
      <span className={isActive ? 'text-white' : 'text-umbrella-accent'}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

/* ================================================================== */
/* Terminal / editor CSV                                               */
/* ================================================================== */

const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const LINE_HEIGHT = 20;

function CsvTerminal({ config, onClose, onToggleWidth, isWide, onFileSaved }: any) {
  const [activeFile, setActiveFile] = useState<FileKind>('foods');
  const [content, setContent] = useState('');
  const [savedContent, setSavedContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('SYS_READY');

  const [searchMode, setSearchMode] = useState<'none' | 'search' | 'replace'>('none');
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [activeMatch, setActiveMatch] = useState(0);
  const [scrollIndex, setScrollIndex] = useState(0);

  const currentPath = activeFile === 'foods' ? config.foodsFilePath : activeFile === 'input' ? config.inputFilePath : config.recipesFilePath;

  const highlightRef = useRef<HTMLPreElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  const isModified = content !== savedContent && content !== '';
  const parsedLines = useMemo(() => content.split('\n'), [content]);

  const matchMap = useMemo(() => {
    if (!searchQuery || searchMode === 'none') return { positions: [] as { lineIndex: number; colIndex: number; subIndex: number }[], count: 0 };
    const positions: { lineIndex: number; colIndex: number; subIndex: number }[] = [];
    const queryLower = searchQuery.toLowerCase();
    const regex = new RegExp(`(${escapeRegex(searchQuery)})`, 'gi');

    for (let i = 1; i < parsedLines.length; i++) {
      if (parsedLines[i].toLowerCase().indexOf(queryLower) === -1) continue;
      const cells = parsedLines[i].split(',');
      for (let j = 0; j < cells.length; j++) {
        if (cells[j].toLowerCase().indexOf(queryLower) === -1) continue;
        const matches = cells[j].match(regex);
        if (!matches) continue;
        for (let k = 0; k < matches.length; k++) positions.push({ lineIndex: i, colIndex: j, subIndex: k });
      }
    }
    return { positions, count: positions.length };
  }, [parsedLines, searchQuery, searchMode]);

  const fetchFileContent = (): void => {
    if (!currentPath) {
      const message = '// NO_FILE_LINKED\n// Selecciona el archivo en la pestaña 1.';
      setContent(message); setSavedContent(message); setStatusMsg('IDLE');
      return;
    }
    setStatusMsg('FETCHING_DATA...');
    setSearchMode('none'); setSearchQuery(''); setReplaceQuery('');
    window.wienerApi.readFile(currentPath).then((res) => {
      if (res.success) {
        setContent(res.content || ''); setSavedContent(res.content || ''); setStatusMsg('SYS_SYNCED');
      } else {
        const message = `// ERROR_DE_LECTURA:\n${res.error}`;
        setContent(message); setSavedContent(message); setStatusMsg('SYS_ERROR');
      }
    });
  };

  useEffect(fetchFileContent, [currentPath, activeFile]);

  const handleSave = async (): Promise<void> => {
    if (!currentPath || !isModified) return;
    setIsSaving(true);
    setStatusMsg('WRITING_TO_DISK...');
    const res = await window.wienerApi.writeFile(currentPath, content);
    if (res.success) {
      setStatusMsg('SYS_SYNCED'); setSavedContent(content); if (onFileSaved) onFileSaved(activeFile);
    } else setStatusMsg('SAVE_ERROR');
    setIsSaving(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>): void => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); handleSave(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') { e.preventDefault(); setSearchMode('search'); setTimeout(() => searchInputRef.current?.focus(), 50); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'h') { e.preventDefault(); setSearchMode('replace'); setTimeout(() => searchInputRef.current?.focus(), 50); }
    if (e.key === 'Escape' && searchMode !== 'none') { e.preventDefault(); setSearchMode('none'); textareaRef.current?.focus(); }
  };

  const navigateMatch = (direction: 'next' | 'prev'): void => {
    if (matchMap.count === 0) return;
    setActiveMatch(direction === 'next'
      ? (activeMatch + 1) % matchMap.count
      : (activeMatch - 1 + matchMap.count) % matchMap.count);
  };

  useEffect(() => {
    if (matchMap.count > 0 && searchMode !== 'none') {
      if (activeMatch >= matchMap.count) setActiveMatch(0);
      const target = matchMap.positions[Math.min(activeMatch, matchMap.count - 1)];
      if (target && textareaRef.current) {
        textareaRef.current.scrollTop = Math.max(0, (target.lineIndex - 1) * LINE_HEIGHT - 100);
      }
    }
  }, [activeMatch, matchMap.count, searchMode]);

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>): void => {
    const target = e.currentTarget;
    if (highlightRef.current) { highlightRef.current.scrollTop = target.scrollTop; highlightRef.current.scrollLeft = target.scrollLeft; }
    if (headerScrollRef.current) headerScrollRef.current.scrollLeft = target.scrollLeft;
    const currentLine = Math.floor(target.scrollTop / LINE_HEIGHT);
    if (Math.abs(currentLine - scrollIndex) > 10) setScrollIndex(currentLine);
  };

  const executeReplaceCurrent = (): void => {
    if (!searchQuery || matchMap.count === 0) return;
    const target = matchMap.positions[activeMatch];
    const newLines = [...parsedLines];
    const cells = newLines[target.lineIndex].split(',');
    let counter = 0;
    cells[target.colIndex] = cells[target.colIndex].replace(new RegExp(escapeRegex(searchQuery), 'gi'), (match) => {
      const replacement = counter === target.subIndex ? replaceQuery : match;
      counter++;
      return replacement;
    });
    newLines[target.lineIndex] = cells.join(',');
    setContent(newLines.join('\n'));
    if (activeMatch >= matchMap.count - 1) setActiveMatch(Math.max(0, matchMap.count - 2));
  };

  const executeReplaceAll = (): void => {
    if (!searchQuery) return;
    setContent(content.replace(new RegExp(escapeRegex(searchQuery), 'gi'), replaceQuery));
    setActiveMatch(0);
  };

  const columnColors = ['text-blue-400', 'text-green-400', 'text-yellow-400', 'text-purple-400', 'text-pink-400', 'text-orange-400'];

  const renderVirtualHighlights = () => {
    const bodyLines = parsedLines.slice(1);
    const start = Math.max(0, scrollIndex - 20);
    const end = Math.min(bodyLines.length, scrollIndex + 60);

    return bodyLines.slice(start, end).map((line, i) => {
      const lineIndex = start + i + 1;
      const cells = line.split(',');
      return (
        <div key={lineIndex} className="hover:bg-white/5 transition-colors flex" style={{ height: `${LINE_HEIGHT}px` }}>
          {cells.map((cell, j) => {
            const colorClass = columnColors[j % columnColors.length];
            let cellContent: React.ReactNode = cell;

            if (searchMode !== 'none' && searchQuery && cell.toLowerCase().includes(searchQuery.toLowerCase())) {
              const parts = cell.split(new RegExp(`(${escapeRegex(searchQuery)})`, 'gi'));
              let subIndexCounter = 0;
              cellContent = parts.map((part, k) => {
                if (part.toLowerCase() === searchQuery.toLowerCase()) {
                  const activePos = matchMap.positions[activeMatch];
                  const isActive = activePos && activePos.lineIndex === lineIndex && activePos.colIndex === j && activePos.subIndex === subIndexCounter;
                  subIndexCounter++;
                  return <span key={k} className={`${isActive ? 'bg-orange-500 text-white' : 'bg-yellow-400 text-black'} font-bold px-0.5 rounded-sm`}>{part}</span>;
                }
                return part;
              });
            }

            return (
              <React.Fragment key={j}>
                <span className={colorClass}>{cellContent}</span>
                {j < cells.length - 1 ? <span className="text-neutral-600 font-bold">,</span> : ''}
              </React.Fragment>
            );
          })}
        </div>
      );
    });
  };

  return (
    <div className="w-full h-full flex flex-col relative animate-boot">
      <div className="crt-overlay pointer-events-none z-40" />

      <div className="h-12 border-b border-umbrella-mid/50 flex items-center justify-between px-4 bg-umbrella-deep/90 z-50 flex-shrink-0">
        <div className="flex space-x-2">
          <button onClick={onClose} className="w-3.5 h-3.5 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center group transition-colors cursor-pointer"><X size={10} className="text-red-900 opacity-0 group-hover:opacity-100" /></button>
          <button onClick={onToggleWidth} className="w-3.5 h-3.5 rounded-full bg-yellow-500 hover:bg-yellow-400 flex items-center justify-center group transition-colors cursor-pointer">
            {isWide ? <Minimize2 size={10} className="text-yellow-900 opacity-0 group-hover:opacity-100" /> : <Maximize2 size={10} className="text-yellow-900 opacity-0 group-hover:opacity-100" />}
          </button>
          <button onClick={() => { setContent(savedContent); setStatusMsg('SYS_SYNCED'); }} disabled={!isModified || isSaving}
            className="w-3.5 h-3.5 rounded-full bg-green-500 hover:bg-green-400 flex items-center justify-center group transition-colors cursor-pointer disabled:opacity-50">
            <RotateCcw size={10} className="text-green-900 opacity-0 group-hover:opacity-100" />
          </button>
        </div>
        <span className="text-[10px] font-mono text-umbrella-accent tracking-[0.2em] font-bold">W.C.U.C.I_TERMINAL_v5.1</span>
      </div>

      <div className="flex border-b border-umbrella-mid/30 bg-[#030105] text-xs font-mono z-30 flex-shrink-0">
        {(['foods', 'input', 'recipes'] as FileKind[]).map((kind) => (
          <button key={kind} onClick={() => setActiveFile(kind)}
            className={`flex-1 py-2.5 px-4 transition-all border-l border-umbrella-mid/30 first:border-l-0 ${activeFile === kind ? 'bg-[#08020d] text-umbrella-bright shadow-[inset_0_-2px_0_#9d4edd]' : 'text-neutral-600 hover:text-neutral-400'}`}>
            [ {kind}.csv ]
          </button>
        ))}
      </div>

      <div className="flex-1 relative bg-[#06020A] z-10 flex flex-col overflow-hidden">
        {searchMode !== 'none' && (
          <div className="absolute top-4 right-6 z-50 flex flex-col bg-[#0a040f] border border-umbrella-accent/50 rounded-lg shadow-2xl overflow-hidden animate-boot">
            <div className="flex items-center p-2 border-b border-umbrella-mid/30">
              <div className="px-2 text-umbrella-accent"><Search size={14} /></div>
              <input ref={searchInputRef} type="text" value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setActiveMatch(0); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); navigateMatch(e.shiftKey ? 'prev' : 'next'); } }}
                placeholder="Buscar..." className="bg-transparent border-none text-sm font-mono text-white p-1 w-40 focus:outline-none placeholder-neutral-600" />
              <span className="text-[10px] font-mono text-neutral-500 mr-2 w-16 text-center">{matchMap.count > 0 ? `${activeMatch + 1} de ${matchMap.count}` : '0 de 0'}</span>
              <div className="flex border-l border-umbrella-mid/30 pl-1">
                <button onClick={() => navigateMatch('prev')} className="p-1 text-neutral-400 hover:text-white hover:bg-white/10 rounded transition"><ChevronUp size={16} /></button>
                <button onClick={() => navigateMatch('next')} className="p-1 text-neutral-400 hover:text-white hover:bg-white/10 rounded transition"><ChevronDown size={16} /></button>
                <button onClick={() => { setSearchMode('none'); setSearchQuery(''); }} className="p-1 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded ml-1 transition"><X size={14} /></button>
              </div>
            </div>
            {searchMode === 'replace' && (
              <div className="flex items-center p-2 bg-[#06020A]">
                <div className="px-2 text-umbrella-accent"><ReplaceIcon size={14} /></div>
                <input ref={replaceInputRef} type="text" value={replaceQuery} onChange={(e) => setReplaceQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') executeReplaceCurrent(); }}
                  placeholder="Reemplazar por..." className="bg-transparent border-none text-sm font-mono text-white p-1 w-32 focus:outline-none placeholder-neutral-600" />
                <div className="flex ml-auto space-x-1">
                  <button onClick={executeReplaceCurrent} title="Reemplazar actual" className="p-1 text-neutral-400 hover:text-white hover:bg-white/10 rounded transition"><ReplaceIcon size={14} /></button>
                  <button onClick={executeReplaceAll} title="Reemplazar todo" className="p-1 text-neutral-400 hover:text-white hover:bg-white/10 rounded transition"><ReplaceAll size={14} /></button>
                </div>
              </div>
            )}
          </div>
        )}

        <div ref={headerScrollRef} className="overflow-hidden bg-[#06020A] border-b border-umbrella-mid/50 z-30 flex-shrink-0 pt-3 shadow-md" style={{ paddingLeft: '16px', paddingRight: '16px', paddingBottom: '6px' }}>
          <div className="whitespace-pre font-mono text-[13px] w-max" style={{ lineHeight: `${LINE_HEIGHT}px` }}>
            {parsedLines.length > 0 && parsedLines[0].split(',').map((cell, j, arr) => (
              <span key={`h-${j}`} className={`${columnColors[j % columnColors.length]} font-extrabold tracking-widest uppercase`}>
                {cell}{j < arr.length - 1 ? <span className="text-neutral-600">,</span> : ''}
              </span>
            ))}
          </div>
        </div>

        <div className="flex-1 relative overflow-hidden">
          <pre ref={highlightRef} className="absolute inset-0 font-mono text-[13px] whitespace-pre overflow-hidden pointer-events-none z-0 m-0" style={{ lineHeight: `${LINE_HEIGHT}px`, padding: '10px 16px' }}>
            <div style={{ height: `${Math.max(0, parsedLines.length - 1) * LINE_HEIGHT}px`, position: 'relative' }}>
              <div style={{ position: 'absolute', top: `${Math.max(0, scrollIndex - 20) * LINE_HEIGHT}px`, left: 0, right: 0 }}>
                {renderVirtualHighlights()}
              </div>
            </div>
          </pre>

          <textarea
            ref={textareaRef}
            value={parsedLines.slice(1).join('\n')}
            onChange={(e) => setContent(parsedLines[0] + '\n' + e.target.value)}
            onKeyDown={handleKeyDown}
            onScroll={handleScroll}
            spellCheck={false}
            disabled={!currentPath}
            className="absolute inset-0 w-full h-full bg-transparent text-transparent caret-white outline-none resize-none font-mono text-[13px] z-50 whitespace-pre selection:bg-umbrella-accent/40"
            style={{ lineHeight: `${LINE_HEIGHT}px`, padding: '10px 16px', margin: 0, border: 'none', paddingBottom: '3rem' }}
          />
        </div>
      </div>

      <div className="h-12 border-t border-umbrella-mid/50 bg-[#030105] flex items-center justify-between px-4 z-30 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className={`w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] ${statusMsg === 'SYS_ERROR' ? 'bg-red-500 text-red-500 animate-pulse' : isModified ? 'bg-yellow-400 text-yellow-400 animate-pulse' : statusMsg === 'SYS_SYNCED' ? 'bg-green-500 text-green-500' : 'bg-blue-500 text-blue-500'}`} />
          <span className={`text-[11px] font-mono font-bold tracking-wider ${isModified ? 'text-yellow-400' : statusMsg === 'SYS_ERROR' ? 'text-red-500' : 'text-green-500'}`}>
            {isModified ? 'MODIFIED (UNSAVED)' : statusMsg}
          </span>
        </div>
        <button onClick={handleSave} disabled={!currentPath || !isModified || isSaving}
          className={`text-[11px] font-mono font-bold px-4 py-1.5 rounded transition-all flex items-center z-50 ${!isModified ? 'bg-neutral-900 text-neutral-600 border border-neutral-800 cursor-not-allowed' : 'bg-umbrella-accent text-white shadow-[0_0_15px_rgba(157,78,221,0.5)] hover:bg-umbrella-bright hover:scale-105'}`}>
          <Save size={12} className="mr-2" /> {isSaving ? 'OVERWRITING...' : isModified ? 'COMMIT_CHANGES' : 'UP_TO_DATE'}
        </button>
      </div>
    </div>
  );
}

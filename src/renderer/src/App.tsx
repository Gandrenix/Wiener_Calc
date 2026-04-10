import React, { useState } from 'react';
import { UploadCloud, Database, Settings, TableProperties, Download, Play, Plus, Trash2, CheckCircle2, FileSpreadsheet, Save, FolderOpen, Globe } from 'lucide-react';

declare global {
  interface Window {
    wienerApi: {
      runCalculations: (configData: any) => Promise<{success: boolean, data?: any[], error?: string}>;
      selectFile: () => Promise<string | null>;
      getCsvHeaders: (filePath: string) => Promise<string[]>;
      scanUniqueValues: (filePath: string, columnName: string) => Promise<string[]>;
      saveCsv: (data: any[]) => Promise<{success: boolean, filePath?: string, canceled?: boolean, error?: string}>;
      saveExcel: (data: any[]) => Promise<{success: boolean, filePath?: string, canceled?: boolean, error?: string}>;
      saveConfig: (configData: any) => Promise<{success: boolean, filePath?: string, canceled?: boolean, error?: string}>;
      loadConfig: () => Promise<{success: boolean, data?: any, canceled?: boolean, error?: string}>;
    }
  }
}

// ==========================================
// 🐕 DICCIONARIO DE IDIOMAS (SOLO INTERFAZ VISUAL)
// ==========================================
const uiText = {
  en: {
    // Sidebar
    tab1: "1. Data Sources", tab2: "2. Field Mapping", tab3: "3. Rules & Cooking", tab4: "4. Calculate",
    profiles: "Profiles", saveCfg: "Save Config.", loadCfg: "Load Config.", lang: "Español",
    // Step 1
    s1Title: "1. Upload Data Sources", s1Desc: "Select your CSV files to load them into the WienerCalc engine.",
    s1Box1: "Food Table (Nutrients)", s1Click1: "Click to select foods.csv",
    s1Box2: "Consumed Amounts (Input)", s1Click2: "Click to select input.csv",
    // Step 2
    s2Title: "2. Map Your Fields", s2Desc: "Tell WienerCalc which columns represent IDs and amounts in your CSVs.",
    s2FoodId: "Food ID Column Name", s2Select: "Select a column...",
    s2Amount: "Amount Column Name", 
    s2Scale: "Input Scale (Multiplier)", s2ScaleHint: "E.g., 0.01 converts grams to 100g portions.",
    s2CookCol: "Cooking Method Column (Optional)", s2NoneCook: "None (No cooking rules)",
    s2Group: "Group Results By (Optional)", s2NoneGroup: "None (Show individual rows)", s2GroupHint: "E.g., select person_id to sum up their total daily intake.",
    // Step 3
    s3Title: "3. Calculation Rules & Cooking",
    s3Math: "Mathematical Rules (Sets)", s3AddRule: "Add Rule", s3Vars: "Available Variables (Click to copy name):",
    s3NewField: "New Field Name", s3Paste: "Paste variables here",
    s3CookRed: "Cooking Reductions", s3AddCook: "Add Cooking Rule",
    s3Method: "Method", s3SelMethod: "Select method...", s3Reduce: "Reduce Field", s3Target: "Target Nutrients",
    s3SelFirst: "Select food file first...",
    // Step 4
    s4Title: "4. Calculate & Results", s4Crunching: "Crunching the numbers...", s4Complete: "Calculation Complete!", s4Ready: "Ready to crunch the numbers!",
    s4Desc: "WienerCalc will join your input files, apply scaling, cooking reductions, and math rules.",
    s4Processing: "Processing...", s4Run: "Run Calculation", s4ExportCSV: "CSV", s4ExportExcel: "Excel",
    s4Preview: "Preview (First 5 Rows - Scroll Horizontally 👉)"
  },
  es: {
    // Sidebar
    tab1: "1. Fuentes de Datos", tab2: "2. Mapeo de Campos", tab3: "3. Reglas y Cocción", tab4: "4. Calcular",
    profiles: "Perfiles", saveCfg: "Guardar Config.", loadCfg: "Cargar Config.", lang: "English",
    // Step 1
    s1Title: "1. Subir Fuentes de Datos", s1Desc: "Selecciona tus archivos CSV para cargarlos en el motor WienerCalc.",
    s1Box1: "Tabla de Alimentos (Nutrientes)", s1Click1: "Clic para seleccionar foods.csv",
    s1Box2: "Cantidades Consumidas (Entrada)", s1Click2: "Clic para seleccionar input.csv",
    // Step 2
    s2Title: "2. Mapear tus Campos", s2Desc: "Dile a WienerCalc qué columnas representan los IDs y cantidades.",
    s2FoodId: "Nombre de Columna de ID de Alimento", s2Select: "Selecciona una columna...",
    s2Amount: "Nombre de Columna de Cantidad", 
    s2Scale: "Escala de Entrada (Multiplicador)", s2ScaleHint: "Ej., 0.01 convierte gramos a porciones de 100g.",
    s2CookCol: "Columna de Método de Cocción (Opcional)", s2NoneCook: "Ninguna (Sin reglas de cocción)",
    s2Group: "Agrupar Resultados Por (Opcional)", s2NoneGroup: "Ninguno (Mostrar filas individuales)", s2GroupHint: "Ej., selecciona person_id para sumar su ingesta total.",
    // Step 3
    s3Title: "3. Reglas de Cálculo y Cocción",
    s3Math: "Reglas Matemáticas (Conjuntos)", s3AddRule: "Añadir Regla", s3Vars: "Variables Disponibles (Clic para copiar):",
    s3NewField: "Nuevo Nombre de Campo", s3Paste: "Pega variables aquí",
    s3CookRed: "Reducciones por Cocción", s3AddCook: "Añadir Regla de Cocción",
    s3Method: "Método", s3SelMethod: "Seleccionar método...", s3Reduce: "Campo de Reducción", s3Target: "Nutrientes Objetivo",
    s3SelFirst: "Selecciona el archivo de alimentos primero...",
    // Step 4
    s4Title: "4. Calcular y Resultados", s4Crunching: "Procesando los números...", s4Complete: "¡Cálculo Completo!", s4Ready: "¡Listo para calcular!",
    s4Desc: "WienerCalc unirá tus archivos, aplicará escalas, reducciones de cocción y matemáticas.",
    s4Processing: "Procesando...", s4Run: "Ejecutar Cálculo", s4ExportCSV: "CSV", s4ExportExcel: "Excel",
    s4Preview: "Vista Previa (Primeras 5 Filas - Desplázate Horizontálmente 👉)"
  }
};

// --- Type Definitions (Mirroring our backend) ---
interface CalculationRule {
  outputField: string;
  expression: string;
}

interface CookRule {
  method: string;
  reduceField: string;
  targetNutrients: string[];
}

interface WienerConfig {
  foodsFilePath: string;
  inputFilePath: string;
  foodIdCol: string;
  amountCol: string;
  inputScale: number;
  cookMethodCol: string;
  calculations: CalculationRule[];
  cookRules: CookRule[];
  groupByCol: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState('sources');
  const [isCalculating, setIsCalculating] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);
  
  // 👇 ESTADO DE IDIOMA 👇
  const [lang, setLang] = useState<'en'|'es'>('en');
  const t = uiText[lang];
  
  const [foodHeaders, setFoodHeaders] = useState<string[]>([]);
  const [inputHeaders, setInputHeaders] = useState<string[]>([]);
  const [uniqueMethods, setUniqueMethods] = useState<string[]>([]);
  
  const [config, setConfig] = useState<WienerConfig>({
    foodsFilePath: '',
    inputFilePath: '',
    foodIdCol: 'food_id',
    amountCol: 'amount',
    inputScale: 0.01,
    cookMethodCol: 'cooking_method',
    groupByCol: '',
    calculations: [
      { outputField: 'total_energy', expression: '17 * protein_tot + 38 * fat_tot + 17 * carbohyd_tot' }
    ],
    cookRules: [
      { method: 'boil', reduceField: 'vit_a_boil', targetNutrients: ['vit_a', 'sodium'] }
    ]
  });

  // --- Handlers ---
  const handleSelectFile = async (key: 'foodsFilePath' | 'inputFilePath') => {
    const filePath = await window.wienerApi.selectFile();
    if (filePath) {
      setConfig({ ...config, [key]: filePath });
      try {
        const headers = await window.wienerApi.getCsvHeaders(filePath);
        if (key === 'foodsFilePath') setFoodHeaders(headers);
        else setInputHeaders(headers);
      } catch (err) {
        console.error("Bark! Failed to read headers", err);
      }
    }
  };

  const handleRunCalculation = async () => {
    if (!config.foodsFilePath || !config.inputFilePath) {
      alert(lang === 'en' ? 'Woof! Please select both a Foods file and an Input file first.' : '¡Guau! Por favor selecciona ambos archivos.');
      return;
    }

    setIsCalculating(true);
    try {
      const response = await window.wienerApi.runCalculations(config);
      if (response.success) {
        setResults(response.data || null);
      } else {
        alert((lang === 'en' ? 'Bark! Error: ' : '¡Ladrido! Error: ') + response.error);
      }
    } catch (err: any) {
      alert('System error: ' + err.message);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleExportCsv = async () => {
    if (!results || results.length === 0) return;
    try {
      const response = await window.wienerApi.saveCsv(results);
      if (response.success) {
        alert(lang === 'en' ? `Successfully exported to:\n${response.filePath}` : `Exportado exitosamente a:\n${response.filePath}`);
      } else if (!response.canceled) {
        alert(`Failed to save CSV: ${response.error}`);
      }
    } catch (err: any) {
      alert(`System error: ${err.message}`);
    }
  };

  const handleExportExcel = async () => {
    if (!results || results.length === 0) return;
    try {
      const response = await window.wienerApi.saveExcel(results);
      if (response.success) {
        alert(lang === 'en' ? `Successfully exported Excel to:\n${response.filePath}` : `Excel exportado exitosamente a:\n${response.filePath}`);
      } else if (!response.canceled) {
        alert(`Failed to save Excel file: ${response.error}`);
      }
    } catch (err: any) {
      alert(`System error: ${err.message}`);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const response = await window.wienerApi.saveConfig(config);
      if (response.success) {
        alert(lang === 'en' ? `Profile saved to:\n${response.filePath}` : `Perfil guardado exitosamente en:\n${response.filePath}`);
      } else if (!response.canceled) {
        alert(`Error: ${response.error}`);
      }
    } catch (err: any) {
      alert(`System error: ${err.message}`);
    }
  };

  const handleLoadProfile = async () => {
    try {
      const response = await window.wienerApi.loadConfig();
      if (response.success && response.data) {
        setConfig(response.data);
        alert(lang === 'en' ? 'Profile loaded perfectly!' : '¡Perfil cargado perfectamente!');
      } else if (!response.canceled) {
        alert(`Error: ${response.error}`);
      }
    } catch (err: any) {
      alert(`System error: ${err.message}`);
    }
  };

  const updateConfig = (key: keyof WienerConfig, value: any) => {
    setConfig({ ...config, [key]: value });
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex text-neutral-800 font-sans">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-neutral-200 shadow-sm flex flex-col">
        <div className="p-6 border-b border-neutral-100 flex items-center space-x-3">
          <span className="text-3xl">🐕</span>
          <h1 className="text-xl font-bold text-orange-600 tracking-tight">WienerCalc</h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <NavItem icon={<Database size={18}/>} label={t.tab1} isActive={activeTab === 'sources'} onClick={() => setActiveTab('sources')} />
          <NavItem icon={<TableProperties size={18}/>} label={t.tab2} isActive={activeTab === 'mapping'} onClick={() => setActiveTab('mapping')} />
          <NavItem icon={<Settings size={18}/>} label={t.tab3} isActive={activeTab === 'rules'} onClick={() => setActiveTab('rules')} />
          <NavItem icon={<Play size={18}/>} label={t.tab4} isActive={activeTab === 'calc'} onClick={() => setActiveTab('calc')} />
        </nav>

        {/* 👇 SECCIÓN DE PERFILES E IDIOMA 👇 */}
        <div className="p-4 border-t border-neutral-100 bg-neutral-50">
          <p className="text-xs font-bold text-neutral-400 uppercase mb-3 px-2">{t.profiles}</p>
          <div className="space-y-2 mb-4">
            <button onClick={handleSaveProfile} className="w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-colors font-medium text-left text-sm text-neutral-600 hover:bg-white border border-transparent hover:border-neutral-200 shadow-sm">
              <Save size={16} className="text-blue-500" />
              <span>{t.saveCfg}</span>
            </button>
            <button onClick={handleLoadProfile} className="w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-colors font-medium text-left text-sm text-neutral-600 hover:bg-white border border-transparent hover:border-neutral-200 shadow-sm">
              <FolderOpen size={16} className="text-orange-500" />
              <span>{t.loadCfg}</span>
            </button>
          </div>
          {/* BOTÓN DE IDIOMA */}
          <button onClick={() => setLang(lang === 'en' ? 'es' : 'en')} className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-neutral-200 hover:bg-neutral-300 rounded-lg text-xs font-bold text-neutral-600 transition">
            <Globe size={14} /><span>{t.lang}</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-8 overflow-y-auto">
        {activeTab === 'sources' && (
          <StepSources config={config} onSelectFile={handleSelectFile} t={t} />
        )}
        {activeTab === 'mapping' && (
          <StepMapping config={config} updateConfig={updateConfig} foodHeaders={foodHeaders} inputHeaders={inputHeaders} setUniqueMethods={setUniqueMethods} t={t} />
        )}
        {activeTab === 'rules' && (
          <StepRules config={config} setConfig={setConfig} foodHeaders={foodHeaders} uniqueMethods={uniqueMethods} t={t} />
        )}
        {activeTab === 'calc' && (
          <StepCalculate 
            config={config} 
            isCalculating={isCalculating} 
            results={results} 
            onRun={handleRunCalculation} 
            onExport={handleExportCsv} 
            onExportExcel={handleExportExcel}
            t={t}
          />
        )}
      </div>
    </div>
  );
}

// ==========================================
// 🐕 SUB-COMPONENTS (THE 4 STEPS)
// ==========================================

function StepSources({ config, onSelectFile, t }: any) {
  return (
    <div className="max-w-4xl animate-in fade-in duration-300">
      <h2 className="text-2xl font-bold mb-6 text-neutral-800">{t.s1Title}</h2>
      <p className="text-neutral-500 mb-8">{t.s1Desc}</p>
      
      <div className="grid grid-cols-2 gap-6">
        <FileDropzone 
          title={t.s1Box1} 
          description={config.foodsFilePath || t.s1Click1} 
          isActive={!!config.foodsFilePath}
          onClick={() => onSelectFile('foodsFilePath')} 
        />
        <FileDropzone 
          title={t.s1Box2} 
          description={config.inputFilePath || t.s1Click2} 
          isActive={!!config.inputFilePath}
          onClick={() => onSelectFile('inputFilePath')} 
        />
      </div>
    </div>
  );
}

function StepMapping({ config, updateConfig, foodHeaders, inputHeaders, setUniqueMethods, t }: any) {
  return (
    <div className="max-w-4xl animate-in fade-in duration-300">
      <h2 className="text-2xl font-bold mb-6">{t.s2Title}</h2>
      <p className="text-neutral-500 mb-8">{t.s2Desc}</p>
      
      <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-1 text-neutral-600">{t.s2FoodId}</label>
            <select 
              value={config.foodIdCol} 
              onChange={e => updateConfig('foodIdCol', e.target.value)}
              className="w-full p-2 border rounded bg-neutral-50 font-mono text-sm" 
            >
              <option value="">{t.s2Select}</option>
              {foodHeaders.map((h: string) => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-neutral-600">{t.s2Amount}</label>
            <select 
              value={config.amountCol} 
              onChange={e => updateConfig('amountCol', e.target.value)}
              className="w-full p-2 border rounded bg-neutral-50 font-mono text-sm" 
            >
              <option value="">{t.s2Select}</option>
              {inputHeaders.map((h: string) => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-neutral-600">{t.s2Scale}</label>
            <input 
              type="number" 
              value={config.inputScale} 
              onChange={e => updateConfig('inputScale', parseFloat(e.target.value))}
              className="w-full p-2 border rounded bg-neutral-50 font-mono text-sm" 
            />
            <p className="text-xs text-neutral-400 mt-1">{t.s2ScaleHint}</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-neutral-600">{t.s2CookCol}</label>
            <select 
              value={config.cookMethodCol} 
              onChange={async (e) => {
                const colName = e.target.value;
                updateConfig('cookMethodCol', colName);
                if (colName && config.inputFilePath) {
                  const methods = await window.wienerApi.scanUniqueValues(config.inputFilePath, colName);
                  setUniqueMethods(methods);
                } else {
                  setUniqueMethods([]);
                }
              }}
              className="w-full p-2 border rounded bg-neutral-50 font-mono text-sm" 
            >
              <option value="">{t.s2NoneCook}</option>
              {inputHeaders.map((h: string) => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-neutral-600">{t.s2Group}</label>
            <select 
              value={config.groupByCol || ''} 
              onChange={e => updateConfig('groupByCol', e.target.value)}
              className="w-full p-2 border rounded bg-neutral-50 font-mono text-sm" 
            >
              <option value="">{t.s2NoneGroup}</option>
              {inputHeaders.map((h: string) => <option key={h} value={h}>{h}</option>)}
            </select>
            <p className="text-xs text-neutral-400 mt-1">{t.s2GroupHint}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepRules({ config, setConfig, foodHeaders, uniqueMethods, t }: any) {
  const addCalcRule = () => setConfig({ ...config, calculations: [...config.calculations, { outputField: '', expression: '' }] });
  const addCookRule = () => setConfig({ ...config, cookRules: [...config.cookRules, { method: '', reduceField: '', targetNutrients: [] }] });

  const removeCalcRule = (indexToRemove: number) => {
    const newCalcs = config.calculations.filter((_: any, idx: number) => idx !== indexToRemove);
    setConfig({ ...config, calculations: newCalcs });
  };
  const removeCookRule = (indexToRemove: number) => {
    const newRules = config.cookRules.filter((_: any, idx: number) => idx !== indexToRemove);
    setConfig({ ...config, cookRules: newRules });
  };

  return (
    <div className="max-w-4xl animate-in fade-in duration-300">
      <h2 className="text-2xl font-bold mb-6">{t.s3Title}</h2>
      
      <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm mb-6">
        <div className="flex justify-between items-center mb-4 border-b pb-2">
          <h3 className="font-semibold text-lg">{t.s3Math}</h3>
          <button onClick={addCalcRule} className="flex items-center text-sm text-orange-600 font-medium hover:bg-orange-50 px-3 py-1 rounded transition">
            <Plus size={16} className="mr-1" /> {t.s3AddRule}
          </button>
        </div>

        {foodHeaders.length > 0 && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
            <p className="text-xs text-blue-600 font-bold uppercase mb-2">{t.s3Vars}</p>
            <div className="flex flex-wrap gap-2">
              {foodHeaders.map((header: string) => (
                <button 
                  key={header}
                  onClick={() => navigator.clipboard.writeText(header)}
                  className="px-2 py-1 bg-white border border-blue-200 text-blue-700 text-xs font-mono rounded hover:bg-blue-100 transition"
                  title="Click to copy to clipboard!"
                >
                  {header}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {config.calculations.map((calc: any, idx: number) => (
          <div key={idx} className="flex items-center space-x-3 bg-neutral-50 p-3 rounded border border-neutral-200 mb-2">
            <input 
              type="text" value={calc.outputField} placeholder={t.s3NewField}
              onChange={(e) => {
                const newCalcs = [...config.calculations];
                newCalcs[idx].outputField = e.target.value;
                setConfig({...config, calculations: newCalcs});
              }}
              className="p-1.5 border rounded w-1/4 font-mono text-sm" 
            />
            <span>=</span>
            <input 
              type="text" value={calc.expression} placeholder={t.s3Paste}
              onChange={(e) => {
                const newCalcs = [...config.calculations];
                newCalcs[idx].expression = e.target.value;
                setConfig({...config, calculations: newCalcs});
              }}
              className="p-1.5 border rounded flex-1 font-mono text-sm" 
            />
            <button onClick={() => removeCalcRule(idx)} className="text-neutral-400 hover:text-red-500 p-2"><Trash2 size={18} /></button>
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
        <div className="flex justify-between items-center mb-4 border-b pb-2">
          <h3 className="font-semibold text-lg">{t.s3CookRed}</h3>
          <button onClick={addCookRule} className="flex items-center text-sm text-orange-600 font-medium hover:bg-orange-50 px-3 py-1 rounded transition">
            <Plus size={16} className="mr-1" /> {t.s3AddCook}
          </button>
        </div>
        
        {config.cookRules.map((rule: any, idx: number) => (
          <div key={idx} className="flex items-start space-x-3 bg-neutral-50 p-3 rounded border border-neutral-200 mb-2">
            <div className="w-1/4">
              <span className="text-xs font-semibold uppercase text-neutral-500">{t.s3Method}</span>
              {uniqueMethods.length > 0 ? (
                <select 
                  value={rule.method} 
                  onChange={(e) => {
                    const newRules = [...config.cookRules];
                    newRules[idx].method = e.target.value;
                    setConfig({...config, cookRules: newRules});
                  }}
                  className="p-1.5 border rounded w-full font-mono text-sm mt-1 bg-white" 
                >
                  <option value="">{t.s3SelMethod}</option>
                  {uniqueMethods.map((m: string) => <option key={m} value={m}>{m}</option>)}
                </select>
              ) : (
                <input 
                  type="text" value={rule.method} placeholder="e.g., boil"
                  onChange={(e) => {
                    const newRules = [...config.cookRules];
                    newRules[idx].method = e.target.value;
                    setConfig({...config, cookRules: newRules});
                  }}
                  className="p-1.5 border rounded w-full font-mono text-sm mt-1" 
                />
              )}
            </div>
            
            <div className="w-1/4">
              <span className="text-xs font-semibold uppercase text-neutral-500">{t.s3Reduce}</span>
              <select 
                value={rule.reduceField} 
                onChange={(e) => {
                  const newRules = [...config.cookRules];
                  newRules[idx].reduceField = e.target.value;
                  setConfig({...config, cookRules: newRules});
                }}
                className="p-1.5 border rounded w-full font-mono text-sm mt-1 bg-white" 
              >
                <option value="">{t.s2Select}</option>
                {foodHeaders.map((h: string) => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>

            <div className="flex-1">
              <span className="text-xs font-semibold uppercase text-neutral-500">{t.s3Target}</span>
              <div className="mt-1 h-24 overflow-y-auto border rounded bg-white p-2 space-y-1">
                {foodHeaders.length === 0 ? <span className="text-sm text-neutral-400 italic">{t.s3SelFirst}</span> : 
                  foodHeaders.map((header: string) => (
                    <label key={header} className="flex items-center space-x-2 text-sm cursor-pointer hover:bg-neutral-50 p-1 rounded">
                      <input 
                        type="checkbox" 
                        checked={rule.targetNutrients.includes(header)}
                        onChange={(e) => {
                          const newRules = [...config.cookRules];
                          if (e.target.checked) newRules[idx].targetNutrients.push(header);
                          else newRules[idx].targetNutrients = newRules[idx].targetNutrients.filter((n: string) => n !== header);
                          setConfig({...config, cookRules: newRules});
                        }}
                        className="rounded text-orange-600 focus:ring-orange-500"
                      />
                      <span className="font-mono">{header}</span>
                    </label>
                  ))
                }
              </div>
            </div>
            <div className="pt-5">
              <button onClick={() => removeCookRule(idx)} className="text-neutral-400 hover:text-red-500 p-2 transition-colors"><Trash2 size={18} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepCalculate({ config, isCalculating, results, onRun, onExport, onExportExcel, t }: any) {
  return (
    <div className="max-w-4xl animate-in fade-in duration-300">
      <h2 className="text-2xl font-bold mb-6">{t.s4Title}</h2>
      
      <div className="bg-white p-8 rounded-xl border border-neutral-200 shadow-sm text-center mb-6">
        <div className="mb-6 flex justify-center">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center ${results ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
            {results ? <CheckCircle2 size={48} /> : <Play size={48} className="ml-2" />}
          </div>
        </div>
        <h3 className="text-xl font-bold mb-2">
          {isCalculating ? t.s4Crunching : results ? t.s4Complete : t.s4Ready}
        </h3>
        <p className="text-neutral-500 mb-8 max-w-md mx-auto">
          {results ? `✅ ${results.length} records.` : t.s4Desc}
        </p>
        
        <div className="flex justify-center space-x-4">
          <button 
            onClick={onRun}
            disabled={isCalculating}
            className={`px-8 py-3 rounded-lg font-bold shadow-md transition flex items-center text-white
              ${isCalculating ? 'bg-orange-400 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700'}`}
          >
            {isCalculating ? t.s4Processing : <><Play size={20} className="mr-2" /> {t.s4Run}</>}
          </button>
          
          {results && (
            <>
              {/* CSV Button */}
              <button onClick={onExport} className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 px-6 py-3 rounded-lg font-bold border border-neutral-300 transition flex items-center">
                <Download size={20} className="mr-2" /> {t.s4ExportCSV}
              </button>
              
              {/* Excel Button */}
              <button onClick={onExportExcel} className="bg-green-50 hover:bg-green-100 text-green-700 px-6 py-3 rounded-lg font-bold border border-green-200 transition flex items-center">
                <FileSpreadsheet size={20} className="mr-2" /> {t.s4ExportExcel}
              </button>
            </>
          )}
        </div>
      </div>

      {results && results.length > 0 && (
        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm overflow-x-auto w-full">
          <h4 className="font-bold mb-4">{t.s4Preview}</h4>
          <table className="w-full text-sm text-left text-neutral-500 whitespace-nowrap">
            <thead className="text-xs text-neutral-700 uppercase bg-neutral-50">
              <tr>
                {Object.keys(results[0]).map(key => (
                  <th key={key} className="px-4 py-2 border-b font-mono text-blue-700">{key}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.slice(0, 5).map((row: any, i: number) => (
                <tr key={i} className="border-b hover:bg-neutral-50">
                  {Object.keys(row).map(key => (
                    <td key={key} className="px-4 py-2">{String(row[key])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// --- Small Reusable Components ---

function NavItem({ icon, label, isActive, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors font-medium text-left
        ${isActive ? 'bg-orange-50 text-orange-700' : 'hover:bg-neutral-100 text-neutral-600'}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function FileDropzone({ title, description, isActive, onClick }: any) {
  return (
    <div 
      onClick={onClick}
      className={`border-2 border-dashed rounded-xl p-6 transition cursor-pointer text-center group
        ${isActive ? 'border-orange-500 bg-orange-50/50' : 'border-neutral-300 hover:border-orange-400 hover:bg-orange-50/20'}`}
    >
      <div className={`flex justify-center mb-3 transition ${isActive ? 'text-orange-500' : 'text-neutral-400 group-hover:text-orange-400'}`}>
        <UploadCloud size={32} />
      </div>
      <h4 className="font-bold text-neutral-700 mb-1">{title}</h4>
      <p className={`text-sm break-all ${isActive ? 'text-orange-600 font-mono text-xs' : 'text-neutral-500'}`}>
        {description}
      </p>
    </div>
  );
}
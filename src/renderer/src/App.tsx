import React, { useState, useEffect, useRef } from 'react';
import { UploadCloud, Database, Settings, TableProperties, Download, Play, Plus, Trash2, CheckCircle2, FileSpreadsheet, Save, FolderOpen, Globe, TerminalSquare, X, Maximize2, Minimize2, RotateCcw } from 'lucide-react';

import logoImg from './assets/logo.png';
import logoAnim from './assets/logoanim.mp4';

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
      readFile: (filePath: string) => Promise<{success: boolean, content?: string, error?: string}>;
      writeFile: (filePath: string, content: string) => Promise<{success: boolean, error?: string}>;
    }
  }
}

// ==========================================
// 🐕 DICCIONARIO DE IDIOMAS 
// ==========================================
const uiText = {
  en: {
    tab1: "1. Data Sources", tab2: "2. Field Mapping", tab3: "3. Rules & Cooking", tab4: "4. Calculate",
    profiles: "Profiles", saveCfg: "Save Config.", loadCfg: "Load Config.", lang: "Español",
    s1Title: "1. Upload Data Sources", s1Desc: "Select your CSV files to load them into the WienerCalc engine.",
    s1Box1: "Food Table (Nutrients)", s1Click1: "Click to select foods.csv",
    s1Box2: "Consumed Amounts (Input)", s1Click2: "Click to select input.csv",
    s2Title: "2. Map Your Fields", s2Desc: "Tell WienerCalc which columns represent IDs and amounts in your CSVs.",
    s2FoodId: "Food ID Column Name", s2Select: "Select a column...",
    s2Amount: "Amount Column Name", 
    s2Scale: "Input Scale (Multiplier)", s2ScaleHint: "E.g., 0.01 converts grams to 100g portions.",
    s2CookCol: "Cooking Method Column (Optional)", s2NoneCook: "None (No cooking rules)",
    s2Group: "Group Results By (Optional)", s2NoneGroup: "None (Show individual rows)", s2GroupHint: "E.g., select person_id to sum up their total daily intake.",
    s3Title: "3. Calculation Rules & Cooking",
    s3Math: "Mathematical Rules (Sets)", s3AddRule: "Add Rule", s3Vars: "Available Variables (Click to copy name):",
    s3NewField: "New Field Name", s3Paste: "Paste variables here",
    s3CookRed: "Cooking Reductions", s3AddCook: "Add Cooking Rule",
    s3Method: "Method", s3SelMethod: "Select method...", s3Reduce: "Reduce Field", s3Target: "Target Nutrients",
    s3SelFirst: "Select food file first...",
    s4Title: "4. Calculate & Results", s4Crunching: "Crunching the numbers...", s4Complete: "Calculation Complete!", s4Ready: "Ready to crunch the numbers!",
    s4Desc: "WienerCalc will join your input files, apply scaling, cooking reductions, and math rules.",
    s4Processing: "Processing...", s4Run: "Run Calculation", s4ExportCSV: "CSV", s4ExportExcel: "Excel",
    s4Preview: "Preview (First 5 Rows - Scroll Horizontally 👉)"
  },
  es: {
    tab1: "1. Fuentes de Datos", tab2: "2. Mapeo de Campos", tab3: "3. Reglas y Cocción", tab4: "4. Calcular",
    profiles: "Perfiles", saveCfg: "Guardar Config.", loadCfg: "Cargar Config.", lang: "English",
    s1Title: "1. Subir Fuentes de Datos", s1Desc: "Selecciona tus archivos CSV para cargarlos en el motor WienerCalc.",
    s1Box1: "Tabla de Alimentos (Nutrientes)", s1Click1: "Clic para seleccionar foods.csv",
    s1Box2: "Cantidades Consumidas (Entrada)", s1Click2: "Clic para seleccionar input.csv",
    s2Title: "2. Mapear tus Campos", s2Desc: "Dile a WienerCalc qué columnas representan los IDs y cantidades.",
    s2FoodId: "Nombre de Columna de ID de Alimento", s2Select: "Selecciona una columna...",
    s2Amount: "Nombre de Columna de Cantidad", 
    s2Scale: "Escala de Entrada (Multiplicador)", s2ScaleHint: "Ej., 0.01 convierte gramos a porciones de 100g.",
    s2CookCol: "Columna de Método de Cocción (Opcional)", s2NoneCook: "Ninguna (Sin reglas de cocción)",
    s2Group: "Agrupar Resultados Por (Opcional)", s2NoneGroup: "Ninguno (Mostrar filas individuales)", s2GroupHint: "Ej., selecciona person_id para sumar su ingesta total.",
    s3Title: "3. Reglas de Cálculo y Cocción",
    s3Math: "Reglas Matemáticas (Conjuntos)", s3AddRule: "Añadir Regla", s3Vars: "Variables Disponibles (Clic para copiar):",
    s3NewField: "Nuevo Nombre de Campo", s3Paste: "Pega variables aquí",
    s3CookRed: "Reducciones por Cocción", s3AddCook: "Añadir Regla de Cocción",
    s3Method: "Método", s3SelMethod: "Seleccionar método...", s3Reduce: "Campo de Reducción", s3Target: "Nutrientes Objetivo",
    s3SelFirst: "Selecciona el archivo de alimentos primero...",
    s4Title: "4. Calcular y Resultados", s4Crunching: "Procesando los números...", s4Complete: "¡Cálculo Completo!", s4Ready: "¡Listo para calcular!",
    s4Desc: "WienerCalc unirá tus archivos, aplicará escalas, reducciones de cocción y matemáticas.",
    s4Processing: "Procesando...", s4Run: "Ejecutar Cálculo", s4ExportCSV: "CSV", s4ExportExcel: "Excel",
    s4Preview: "Vista Previa (Primeras 5 Filas - Desplázate Horizontálmente 👉)"
  }
};

interface CalculationRule { outputField: string; expression: string; }
interface CookRule { method: string; reduceField: string; targetNutrients: string[]; }
interface WienerConfig {
  foodsFilePath: string; inputFilePath: string; foodIdCol: string; amountCol: string;
  inputScale: number; cookMethodCol: string; calculations: CalculationRule[];
  cookRules: CookRule[]; groupByCol: string;
}

// ==========================================
// COMPONENTE PRINCIPAL APP
// ==========================================
export default function App() {
  const [activeTab, setActiveTab] = useState('sources');
  const [isCalculating, setIsCalculating] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);
  
  const [lang, setLang] = useState<'en'|'es'>('en');
  const t = uiText[lang];
  
  const [foodHeaders, setFoodHeaders] = useState<string[]>([]);
  const [inputHeaders, setInputHeaders] = useState<string[]>([]);
  const [uniqueMethods, setUniqueMethods] = useState<string[]>([]);
  
  // Estados del IDE Retráctil
  const [isIdeOpen, setIsIdeOpen] = useState(false);
  const [ideWidth, setIdeWidth] = useState<'normal' | 'wide'>('normal');
  const [isPlayingLogo, setIsPlayingLogo] = useState(false);

  const [config, setConfig] = useState<WienerConfig>({
    foodsFilePath: '', inputFilePath: '', foodIdCol: 'food_id', amountCol: 'amount',
    inputScale: 0.01, cookMethodCol: 'cooking_method', groupByCol: '',
    calculations: [{ outputField: 'total_energy', expression: '17 * protein_tot + 38 * fat_tot + 17 * carbohyd_tot' }],
    cookRules: [{ method: 'boil', reduceField: 'vit_a_boil', targetNutrients: ['vit_a', 'sodium'] }]
  });

  const refreshFileHeaders = async (filePath: string, type: 'foods' | 'input') => {
    try {
      const headers = await window.wienerApi.getCsvHeaders(filePath);
      if (type === 'foods') setFoodHeaders(headers);
      else setInputHeaders(headers);
      
      if (type === 'input' && config.cookMethodCol) {
         const methods = await window.wienerApi.scanUniqueValues(filePath, config.cookMethodCol);
         setUniqueMethods(methods);
      }
    } catch (err) { console.error("Bark! Failed to re-scan headers", err); }
  };

  const handleSelectFile = async (key: 'foodsFilePath' | 'inputFilePath') => {
    const filePath = await window.wienerApi.selectFile();
    if (filePath) {
      setConfig({ ...config, [key]: filePath });
      refreshFileHeaders(filePath, key === 'foodsFilePath' ? 'foods' : 'input');
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
      if (response.success) setResults(response.data || null);
      else alert((lang === 'en' ? 'Bark! Error: ' : '¡Ladrido! Error: ') + response.error);
    } catch (err: any) { alert('System error: ' + err.message); } 
    finally { setIsCalculating(false); }
  };

  const handleExportCsv = async () => {
    if (!results || results.length === 0) return;
    try {
      const response = await window.wienerApi.saveCsv(results);
      if (response.success) alert(lang === 'en' ? `Successfully exported to:\n${response.filePath}` : `Exportado exitosamente a:\n${response.filePath}`);
    } catch (err: any) { alert(`System error: ${err.message}`); }
  };

  const handleExportExcel = async () => {
    if (!results || results.length === 0) return;
    try {
      const response = await window.wienerApi.saveExcel(results);
      if (response.success) alert(lang === 'en' ? `Successfully exported Excel to:\n${response.filePath}` : `Excel exportado exitosamente a:\n${response.filePath}`);
    } catch (err: any) { alert(`System error: ${err.message}`); }
  };

  const handleSaveProfile = async () => {
    try {
      const response = await window.wienerApi.saveConfig(config);
      if (response.success) alert(lang === 'en' ? `Profile saved to:\n${response.filePath}` : `Perfil guardado exitosamente en:\n${response.filePath}`);
    } catch (err: any) { alert(`System error: ${err.message}`); }
  };

  const handleLoadProfile = async () => {
    try {
      const response = await window.wienerApi.loadConfig();
      if (response.success && response.data) {
        setConfig(response.data);
        alert(lang === 'en' ? 'Profile loaded perfectly!' : '¡Perfil cargado perfectamente!');
        if(response.data.foodsFilePath) refreshFileHeaders(response.data.foodsFilePath, 'foods');
        if(response.data.inputFilePath) refreshFileHeaders(response.data.inputFilePath, 'input');
      }
    } catch (err: any) { alert(`System error: ${err.message}`); }
  };

  const updateConfig = (key: keyof WienerConfig, value: any) => setConfig({ ...config, [key]: value });

  const handleIdeSaveComplete = (savedFileType: 'foods' | 'input') => {
      const path = savedFileType === 'foods' ? config.foodsFilePath : config.inputFilePath;
      if(path) refreshFileHeaders(path, savedFileType);
  }

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-umbrella-deep font-sans relative">
      
      {/* 1. Sidebar (Izquierda) */}
      <div className="w-64 glass-sidebar flex flex-col z-20 shrink-0">
        
        {/* 👇 HEADER CON LOGO CIRCULAR GRANDE Y TÍTULO CLICKABLE 👇 */}
        <div className="p-5 border-b border-umbrella-mid/80 flex items-center space-x-3">
          <div 
            className="w-14 h-14 shrink-0 rounded-full overflow-hidden cursor-pointer shadow-[0_0_15px_rgba(157,78,221,0.4)] hover:shadow-[0_0_25px_rgba(157,78,221,0.8)] transition-all border-2 border-umbrella-accent/40 bg-black flex items-center justify-center"
            onClick={() => setIsPlayingLogo(true)}
            title="Inicializar secuencia visual"
          >
            {isPlayingLogo ? (
              <video src={logoAnim} autoPlay muted onEnded={() => setIsPlayingLogo(false)} className="w-full h-full object-cover" />
            ) : (
              <img src={logoImg} alt="WienerCalc Logo" className="w-full h-full object-cover" />
            )}
          </div>
          <a 
            href="https://wienerhoundstudios.netlify.app/" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-xl font-extrabold text-umbrella-bright tracking-widest uppercase hover:text-white hover:scale-105 transition-all"
            title="Visit WienerHoundStudios"
          >
            WienerCalc
          </a>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 mt-2">
          <NavItem icon={<Database size={18}/>} label={t.tab1} isActive={activeTab === 'sources'} onClick={() => setActiveTab('sources')} />
          <NavItem icon={<TableProperties size={18}/>} label={t.tab2} isActive={activeTab === 'mapping'} onClick={() => setActiveTab('mapping')} />
          <NavItem icon={<Settings size={18}/>} label={t.tab3} isActive={activeTab === 'rules'} onClick={() => setActiveTab('rules')} />
          <NavItem icon={<Play size={18}/>} label={t.tab4} isActive={activeTab === 'calc'} onClick={() => setActiveTab('calc')} />
        </nav>

        {/* Sección inferior con botón de idioma y COPYRIGHT */}
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

          {/* 👇 SELLO DE COPYRIGHT 👇 */}
          <div className="mt-6 text-center">
            <a 
              href="https://github.com/Gandrenix" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-[10px] font-mono text-neutral-500 hover:text-umbrella-accent transition-colors block"
            >
              © Created by WienerHoundStudios
            </a>
          </div>
        </div>
      </div>

      {/* 2. Main Content Area (Centro) */}
      <div className="flex-1 p-8 overflow-y-auto relative">
        <div className="absolute top-6 right-8 z-10">
          <button 
            onClick={() => setIsIdeOpen(true)}
            className="flex items-center space-x-2 bg-umbrella-dark border border-umbrella-accent hover:bg-umbrella-accent/20 text-umbrella-bright px-4 py-2 rounded-md font-mono text-xs tracking-widest transition-all shadow-[0_0_15px_rgba(157,78,221,0.2)]"
          >
            <TerminalSquare size={16} /> <span>OPEN TERMINAL</span>
          </button>
        </div>

        <div className="max-w-3xl mx-auto mt-8">
          {activeTab === 'sources' && <StepSources config={config} onSelectFile={handleSelectFile} t={t} />}
          {activeTab === 'mapping' && <StepMapping config={config} updateConfig={updateConfig} foodHeaders={foodHeaders} inputHeaders={inputHeaders} setUniqueMethods={setUniqueMethods} t={t} />}
          {activeTab === 'rules' && <StepRules config={config} setConfig={setConfig} foodHeaders={foodHeaders} uniqueMethods={uniqueMethods} t={t} />}
          {activeTab === 'calc' && <StepCalculate config={config} isCalculating={isCalculating} results={results} onRun={handleRunCalculation} onExport={handleExportCsv} onExportExcel={handleExportExcel} t={t} />}
        </div>
      </div>

      {/* 3. IDE RETRACTIL ANIMADO */}
      <div 
        className={`fixed right-0 top-0 h-full bg-[#05010a] shadow-[-20px_0_50px_rgba(0,0,0,0.8)] z-50 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] border-l border-umbrella-mid/80 flex flex-col 
        ${isIdeOpen ? 'translate-x-0' : 'translate-x-[110%]'} 
        ${ideWidth === 'wide' ? 'w-[800px]' : 'w-[500px]'}`}
      >
        {isIdeOpen && <CsvTerminal config={config} onClose={() => setIsIdeOpen(false)} onToggleWidth={() => setIdeWidth(w => w === 'normal' ? 'wide' : 'normal')} isWide={ideWidth === 'wide'} onFileSaved={handleIdeSaveComplete} />}
      </div>

    </div>
  );
}

// ==========================================
// 🐕 SUB-COMPONENTS (THE 4 STEPS)
// ==========================================

function StepSources({ config, onSelectFile, t }: any) {
  return (
    <div className="max-w-4xl animate-step-reveal">
      <h2 className="text-3xl font-extrabold mb-2 tracking-wide text-white">{t.s1Title}</h2>
      <p className="text-neutral-400 mb-8 font-mono text-sm">{t.s1Desc}</p>
      <div className="grid grid-cols-2 gap-6">
        <FileDropzone title={t.s1Box1} description={config.foodsFilePath || t.s1Click1} isActive={!!config.foodsFilePath} onClick={() => onSelectFile('foodsFilePath')} />
        <FileDropzone title={t.s1Box2} description={config.inputFilePath || t.s1Click2} isActive={!!config.inputFilePath} onClick={() => onSelectFile('inputFilePath')} />
      </div>
    </div>
  );
}

function StepMapping({ config, updateConfig, foodHeaders, inputHeaders, setUniqueMethods, t }: any) {
  return (
    <div className="max-w-4xl animate-step-reveal">
      <h2 className="text-3xl font-extrabold mb-2 tracking-wide text-white">{t.s2Title}</h2>
      <p className="text-neutral-400 mb-8 font-mono text-sm">{t.s2Desc}</p>
      <div className="glass-panel p-6 space-y-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-umbrella-mid/50"><div className="w-1/3 h-full bg-umbrella-accent animate-pulse"></div></div>
        <div className="grid grid-cols-2 gap-6 mt-2">
          {['foodIdCol', 'amountCol', 'cookMethodCol', 'groupByCol'].map((colKey, i) => (
            <div key={colKey}>
              <label className="block text-sm font-semibold mb-2 text-neutral-300 uppercase tracking-wide">
                {colKey === 'foodIdCol' ? t.s2FoodId : colKey === 'amountCol' ? t.s2Amount : colKey === 'cookMethodCol' ? t.s2CookCol : t.s2Group}
              </label>
              <select value={config[colKey] || ''} onChange={async (e) => {
                  const val = e.target.value;
                  updateConfig(colKey as keyof WienerConfig, val);
                  if (colKey === 'cookMethodCol') {
                    if (val && config.inputFilePath) setUniqueMethods(await window.wienerApi.scanUniqueValues(config.inputFilePath, val));
                    else setUniqueMethods([]);
                  }
                }}
                className="w-full p-2.5 border border-umbrella-mid rounded bg-umbrella-deep font-mono text-sm text-neutral-200 focus:outline-none focus:border-umbrella-bright focus:ring-1 focus:ring-umbrella-bright transition-all" 
              >
                <option value="">{colKey === 'cookMethodCol' ? t.s2NoneCook : colKey === 'groupByCol' ? t.s2NoneGroup : t.s2Select}</option>
                {(colKey === 'foodIdCol' ? foodHeaders : inputHeaders).map((h: string) => <option key={h} value={h}>{h}</option>)}
              </select>
              {colKey === 'groupByCol' && <p className="text-xs text-neutral-500 mt-2 font-mono">{t.s2GroupHint}</p>}
            </div>
          ))}
          <div>
            <label className="block text-sm font-semibold mb-2 text-neutral-300 uppercase tracking-wide">{t.s2Scale}</label>
            <input type="number" value={config.inputScale} onChange={e => updateConfig('inputScale', parseFloat(e.target.value))}
              className="w-full p-2.5 border border-umbrella-mid rounded bg-umbrella-deep font-mono text-sm text-neutral-200 focus:outline-none focus:border-umbrella-bright focus:ring-1 focus:ring-umbrella-bright transition-all" 
            />
            <p className="text-xs text-neutral-500 mt-2 font-mono">{t.s2ScaleHint}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepRules({ config, setConfig, foodHeaders, uniqueMethods, t }: any) {
  const addCalcRule = () => setConfig({ ...config, calculations: [...config.calculations, { outputField: '', expression: '' }] });
  const addCookRule = () => setConfig({ ...config, cookRules: [...config.cookRules, { method: '', reduceField: '', targetNutrients: [] }] });
  const removeCalcRule = (idxRm: number) => setConfig({ ...config, calculations: config.calculations.filter((_: any, i: number) => i !== idxRm) });
  const removeCookRule = (idxRm: number) => setConfig({ ...config, cookRules: config.cookRules.filter((_: any, i: number) => i !== idxRm) });

  return (
    <div className="max-w-4xl animate-step-reveal">
      <h2 className="text-3xl font-extrabold mb-6 tracking-wide text-white">{t.s3Title}</h2>
      
      <div className="glass-panel p-6 mb-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-umbrella-mid/50"><div className="w-1/2 h-full bg-umbrella-bright animate-pulse" style={{ animationDelay: '0.5s' }}></div></div>
        
        <div className="flex justify-between items-center mb-4 border-b border-umbrella-mid pb-3 mt-2">
          <h3 className="font-bold text-lg text-white uppercase tracking-wide">{t.s3Math}</h3>
          <button onClick={addCalcRule} className="flex items-center text-sm text-umbrella-bright font-bold hover:bg-umbrella-light/40 px-3 py-1.5 rounded transition">
            <Plus size={16} className="mr-1" /> {t.s3AddRule}
          </button>
        </div>

        {foodHeaders.length > 0 && (
          <div className="mb-5 p-4 bg-umbrella-deep/50 border border-umbrella-mid rounded-lg">
            <p className="text-xs text-umbrella-bright font-bold uppercase mb-3 tracking-widest">{t.s3Vars}</p>
            <div className="flex flex-wrap gap-2">
              {foodHeaders.map((h: string) => (
                <button key={h} onClick={() => navigator.clipboard.writeText(h)} className="px-2 py-1 bg-umbrella-dark border border-umbrella-mid text-umbrella-bright text-xs font-mono rounded hover:bg-umbrella-light hover:border-umbrella-bright transition">{h}</button>
              ))}
            </div>
          </div>
        )}
        
        {config.calculations.map((calc: any, idx: number) => (
          <div key={idx} className="flex items-center space-x-3 glass-inner p-3 mb-3">
            <input type="text" value={calc.outputField} placeholder={t.s3NewField} onChange={(e) => {
                const newCalcs = [...config.calculations]; newCalcs[idx].outputField = e.target.value; setConfig({...config, calculations: newCalcs});
              }} className="p-2 border border-umbrella-mid rounded bg-umbrella-deep w-1/4 font-mono text-sm text-neutral-200 focus:outline-none focus:border-umbrella-bright" />
            <span className="text-umbrella-accent font-bold">=</span>
            <input type="text" value={calc.expression} placeholder={t.s3Paste} onChange={(e) => {
                const newCalcs = [...config.calculations]; newCalcs[idx].expression = e.target.value; setConfig({...config, calculations: newCalcs});
              }} className="p-2 border border-umbrella-mid rounded bg-umbrella-deep flex-1 font-mono text-sm text-umbrella-bright focus:outline-none focus:border-umbrella-bright" />
            <button onClick={() => removeCalcRule(idx)} className="text-neutral-500 hover:text-red-400 p-2 transition"><Trash2 size={18} /></button>
          </div>
        ))}
      </div>

      <div className="glass-panel p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-umbrella-mid/50"><div className="w-1/4 h-full bg-umbrella-accent animate-pulse" style={{ animationDelay: '1s' }}></div></div>
        
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
                <select value={rule.method} onChange={(e) => {
                    const newRules = [...config.cookRules]; newRules[idx].method = e.target.value; setConfig({...config, cookRules: newRules});
                  }} className="p-2 border border-umbrella-mid rounded bg-umbrella-deep w-full font-mono text-sm mt-2 text-neutral-200 focus:outline-none focus:border-umbrella-bright">
                  <option value="">{t.s3SelMethod}</option>
                  {uniqueMethods.map((m: string) => <option key={m} value={m}>{m}</option>)}
                </select>
              ) : (
                <input type="text" value={rule.method} placeholder="e.g., boil" onChange={(e) => {
                    const newRules = [...config.cookRules]; newRules[idx].method = e.target.value; setConfig({...config, cookRules: newRules});
                  }} className="p-2 border border-umbrella-mid rounded bg-umbrella-deep w-full font-mono text-sm mt-2 text-neutral-200 focus:outline-none focus:border-umbrella-bright" />
              )}
            </div>
            <div className="w-1/4">
              <span className="text-xs font-bold uppercase text-neutral-400 tracking-wider">{t.s3Reduce}</span>
              <select value={rule.reduceField} onChange={(e) => {
                  const newRules = [...config.cookRules]; newRules[idx].reduceField = e.target.value; setConfig({...config, cookRules: newRules});
                }} className="p-2 border border-umbrella-mid rounded bg-umbrella-deep w-full font-mono text-sm mt-2 text-neutral-200 focus:outline-none focus:border-umbrella-bright">
                <option value="">{t.s2Select}</option>
                {foodHeaders.map((h: string) => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <span className="text-xs font-bold uppercase text-neutral-400 tracking-wider">{t.s3Target}</span>
              <div className="mt-2 h-28 overflow-y-auto border border-umbrella-mid rounded bg-umbrella-deep/50 p-2 space-y-1">
                {foodHeaders.length === 0 ? <span className="text-sm text-neutral-500 italic font-mono">{t.s3SelFirst}</span> : 
                  foodHeaders.map((h: string) => (
                    <label key={h} className="flex items-center space-x-2 text-sm cursor-pointer hover:bg-umbrella-dark p-1.5 rounded transition">
                      <input type="checkbox" checked={rule.targetNutrients.includes(h)} onChange={(e) => {
                          const newRules = [...config.cookRules];
                          if (e.target.checked) newRules[idx].targetNutrients.push(h);
                          else newRules[idx].targetNutrients = newRules[idx].targetNutrients.filter((n: string) => n !== h);
                          setConfig({...config, cookRules: newRules});
                        }} className="rounded bg-umbrella-deep border-umbrella-mid text-umbrella-accent focus:ring-umbrella-accent focus:ring-offset-umbrella-deep" />
                      <span className="font-mono text-neutral-300">{h}</span>
                    </label>
                  ))
                }
              </div>
            </div>
            <div className="pt-6"><button onClick={() => removeCookRule(idx)} className="text-neutral-500 hover:text-red-400 p-2"><Trash2 size={18} /></button></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepCalculate({ config, isCalculating, results, onRun, onExport, onExportExcel, t }: any) {
  return (
    <div className="max-w-4xl animate-step-reveal">
      <h2 className="text-3xl font-extrabold mb-6 tracking-wide text-white">{t.s4Title}</h2>
       <div className="glass-panel p-10 text-center mb-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-umbrella-mid/50"><div className="w-full h-full bg-umbrella-accent animate-pulse" style={{ animationDelay: '0.2s' }}></div></div>
        <div className="mb-6 flex justify-center mt-4">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(157,78,221,0.2)] ${results ? 'bg-umbrella-light text-umbrella-bright' : 'bg-umbrella-deep border border-umbrella-mid text-umbrella-accent'}`}>
            {results ? <CheckCircle2 size={48} /> : <Play size={48} className="ml-2" />}
          </div>
        </div>
        <h3 className="text-2xl font-bold mb-3 text-white tracking-wide">
          {isCalculating ? t.s4Crunching : results ? t.s4Complete : t.s4Ready}
        </h3>
        <p className="text-neutral-400 mb-8 max-w-md mx-auto font-mono text-sm">
          {results ? `STATUS: SUCCESS. ${results.length} databanks processed.` : t.s4Desc}
        </p>
        <div className="flex justify-center space-x-4">
          <button onClick={onRun} disabled={isCalculating} className={`px-10 py-3.5 rounded-lg font-extrabold uppercase tracking-widest transition-all flex items-center ${isCalculating ? 'glass-inner text-neutral-500 cursor-not-allowed' : 'btn-calculate bg-umbrella-accent text-white'}`}>
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
            </>
          )}
        </div>
      </div>
      {results && results.length > 0 && (
        <div className="glass-panel p-1 border border-umbrella-mid overflow-hidden">
          <div className="bg-umbrella-deep/80 p-3 flex justify-between items-center border-b border-umbrella-mid">
             <h4 className="font-bold text-umbrella-bright tracking-widest uppercase text-xs">{t.s4Preview}</h4>
             <span className="text-xs font-mono text-neutral-500">SYS_OUT // ROWS: 5</span>
          </div>
          <div className="overflow-x-auto w-full">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="text-xs text-umbrella-bright uppercase bg-umbrella-dark/50">
                <tr>{Object.keys(results[0]).map(key => <th key={key} className="px-5 py-3 border-b border-umbrella-mid font-mono">{key}</th>)}</tr>
              </thead>
              <tbody className="font-mono text-neutral-300">
                {results.slice(0, 5).map((row: any, i: number) => (
                  <tr key={i} className="border-b border-umbrella-mid/50 hover:bg-umbrella-light/20 transition-colors">
                    {Object.keys(row).map(key => <td key={key} className="px-5 py-3">{String(row[key])}</td>)}
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

function NavItem({ icon, label, isActive, onClick }: any) {
  return (
    <button onClick={onClick} className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-lg transition-all font-bold text-left tracking-wide ${isActive ? 'bg-umbrella-accent text-white shadow-[0_0_15px_rgba(157,78,221,0.4)]' : 'hover:bg-umbrella-dark/60 text-neutral-400 hover:text-umbrella-bright'}`}>
      <span className={isActive ? 'text-white' : 'text-umbrella-accent'}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function FileDropzone({ title, description, isActive, onClick }: any) {
  return (
    <div onClick={onClick} className={`border-2 border-dashed rounded-xl p-8 transition-all cursor-pointer text-center group bg-umbrella-dark/20 ${isActive ? 'border-umbrella-accent bg-umbrella-accent/10 shadow-[inset_0_0_20px_rgba(157,78,221,0.1)]' : 'border-umbrella-mid hover:border-umbrella-bright/50 hover:bg-umbrella-dark/40'}`}>
      <div className={`flex justify-center mb-4 transition-colors ${isActive ? 'text-umbrella-accent' : 'text-neutral-600 group-hover:text-umbrella-bright'}`}>
        <UploadCloud size={40} />
      </div>
      <h4 className="font-bold text-white mb-2 tracking-wide uppercase text-sm">{title}</h4>
      <p className={`text-sm break-all font-mono ${isActive ? 'text-umbrella-bright' : 'text-neutral-500'}`}>{description}</p>
    </div>
  );
}

// ==========================================
// NUEVO COMPONENTE: IDE TERMINAL CSV
// ==========================================
function CsvTerminal({ config, onClose, onToggleWidth, isWide, onFileSaved }: any) {
  const [activeFile, setActiveFile] = useState<'foods' | 'input'>('foods');
  const [content, setContent] = useState<string>('');
  const [savedContent, setSavedContent] = useState<string>(''); 
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string>('SYS_READY');
  
  const currentPath = activeFile === 'foods' ? config.foodsFilePath : config.inputFilePath;
  const highlightRef = useRef<HTMLPreElement>(null);
  const isModified = content !== savedContent && content !== '';

  const fetchFileContent = () => {
    if (!currentPath) {
      setContent('// NO_FILE_LINKED\n// Require config link on Step 1.');
      setSavedContent('// NO_FILE_LINKED\n// Require config link on Step 1.');
      setStatusMsg('IDLE');
      return;
    }
    setStatusMsg('FETCHING_DATA...');
    window.wienerApi.readFile(currentPath).then(res => {
      if (res.success) {
        setContent(res.content || '');
        setSavedContent(res.content || '');
        setStatusMsg('SYS_SYNCED');
      } else {
        setContent(`// ERROR_DE_LECTURA:\n${res.error}`);
        setSavedContent(`// ERROR_DE_LECTURA:\n${res.error}`);
        setStatusMsg('SYS_ERROR');
      }
    });
  };

  useEffect(() => {
    fetchFileContent();
  }, [currentPath, activeFile]);

  const handleSave = async () => {
    if (!currentPath || !isModified) return;
    setIsSaving(true);
    setStatusMsg('WRITING_TO_DISK...');
    const res = await window.wienerApi.writeFile(currentPath, content);
    if (res.success) {
      setStatusMsg('SYS_SYNCED');
      setSavedContent(content); 
      if(onFileSaved) onFileSaved(activeFile);
    } else {
      setStatusMsg('SAVE_ERROR');
    }
    setIsSaving(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      handleSave();
    }
  };

  const handleRevert = () => {
    setContent(savedContent);
    setStatusMsg('SYS_SYNCED');
  };

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (highlightRef.current) {
      highlightRef.current.scrollTop = e.currentTarget.scrollTop;
      highlightRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  const renderHighlightedText = () => {
    const lines = content.split('\n');
    const columnColors = ['text-blue-400', 'text-green-400', 'text-yellow-400', 'text-purple-400', 'text-pink-400', 'text-orange-400'];
    
    const maxHighlighted = 150;
    const renderLines = lines.slice(0, maxHighlighted);
    const remainingText = lines.length > maxHighlighted ? lines.slice(maxHighlighted).join('\n') : '';

    return (
      <>
        {renderLines.map((line, i) => (
          <div key={i} className="min-h-[1.5em]">
            {line.split(',').map((cell, j, arr) => (
              <span key={j} className={columnColors[j % columnColors.length]}>
                {cell}{j < arr.length - 1 ? <span className="text-neutral-600 font-bold">,</span> : ''}
              </span>
            ))}
          </div>
        ))}
        {remainingText && <div className="text-neutral-500 whitespace-pre">{'\n' + remainingText}</div>}
      </>
    );
  };

  return (
    <div className="w-full h-full flex flex-col relative animate-boot">
      <div className="crt-overlay pointer-events-none z-40"></div>

      <div className="h-12 border-b border-umbrella-mid/50 flex items-center justify-between px-4 bg-umbrella-deep/90 z-50">
        <div className="flex space-x-2">
          <button onClick={onClose} className="w-3.5 h-3.5 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center group transition-colors cursor-pointer" title="Cerrar IDE">
            <X size={10} className="text-red-900 opacity-0 group-hover:opacity-100" />
          </button>
          <button onClick={onToggleWidth} className="w-3.5 h-3.5 rounded-full bg-yellow-500 hover:bg-yellow-400 flex items-center justify-center group transition-colors cursor-pointer" title="Redimensionar Ventana">
            {isWide ? <Minimize2 size={10} className="text-yellow-900 opacity-0 group-hover:opacity-100"/> : <Maximize2 size={10} className="text-yellow-900 opacity-0 group-hover:opacity-100"/>}
          </button>
          <button onClick={handleRevert} disabled={!isModified || isSaving} className="w-3.5 h-3.5 rounded-full bg-green-500 hover:bg-green-400 flex items-center justify-center group transition-colors cursor-pointer disabled:opacity-50" title="Descartar cambios no guardados (Undo)">
             <RotateCcw size={10} className="text-green-900 opacity-0 group-hover:opacity-100"/>
          </button>
        </div>
        <span className="text-[10px] font-mono text-umbrella-accent tracking-[0.2em] font-bold">W.C.U.C.I_TERMINAL_v1.0</span>
      </div>

      <div className="flex border-b border-umbrella-mid/30 bg-[#030105] text-xs font-mono z-30">
        <button onClick={() => setActiveFile('foods')} className={`flex-1 py-2.5 px-4 transition-all ${activeFile === 'foods' ? 'bg-[#08020d] text-umbrella-bright shadow-[inset_0_-2px_0_#9d4edd]' : 'text-neutral-600 hover:text-neutral-400'}`}>
          [ foods.csv ]
        </button>
        <button onClick={() => setActiveFile('input')} className={`flex-1 py-2.5 px-4 transition-all border-l border-umbrella-mid/30 ${activeFile === 'input' ? 'bg-[#08020d] text-umbrella-bright shadow-[inset_0_-2px_0_#9d4edd]' : 'text-neutral-600 hover:text-neutral-400'}`}>
          [ input.csv ]
        </button>
      </div>

      <div className="flex-1 relative bg-[#06020A] z-10 overflow-hidden">
        <pre 
          ref={highlightRef} 
          className="absolute inset-0 p-4 font-mono text-[13px] leading-relaxed whitespace-pre overflow-hidden pointer-events-none z-0"
        >
          {renderHighlightedText()}
        </pre>
        
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          spellCheck={false}
          disabled={!currentPath}
          className="absolute inset-0 w-full h-full p-4 bg-transparent text-transparent caret-white outline-none resize-none font-mono text-[13px] leading-relaxed z-50 sync-scroll whitespace-pre selection:bg-umbrella-accent/40"
        />
      </div>

      <div className="h-12 border-t border-umbrella-mid/50 bg-[#030105] flex items-center justify-between px-4 z-30">
        <div className="flex items-center space-x-3">
          <div className={`w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] 
            ${statusMsg === 'SYS_ERROR' ? 'bg-red-500 text-red-500 animate-pulse' : 
              isModified ? 'bg-yellow-400 text-yellow-400 animate-pulse' : 
              statusMsg === 'SYS_SYNCED' ? 'bg-green-500 text-green-500' : 'bg-blue-500 text-blue-500'}`}
          ></div>
          <span className={`text-[11px] font-mono font-bold tracking-wider ${isModified ? 'text-yellow-400' : statusMsg === 'SYS_ERROR' ? 'text-red-500' : 'text-green-500'}`}>
            {isModified ? 'MODIFIED (UNSAVED)' : statusMsg}
          </span>
        </div>
        
        <button 
          onClick={handleSave}
          disabled={!currentPath || !isModified || isSaving}
          className={`text-[11px] font-mono font-bold px-4 py-1.5 rounded transition-all flex items-center z-50
            ${!isModified ? 'bg-neutral-900 text-neutral-600 border border-neutral-800 cursor-not-allowed' : 
              'bg-umbrella-accent text-white shadow-[0_0_15px_rgba(157,78,221,0.5)] hover:bg-umbrella-bright hover:scale-105'}`}
        >
          <Save size={12} className="mr-2" /> 
          {isSaving ? 'OVERWRITING...' : isModified ? 'COMMIT_CHANGES' : 'UP_TO_DATE'}
        </button>
      </div>

    </div>
  );
}
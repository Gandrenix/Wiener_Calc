import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

import './styles.scss'

// Almacén de archivos en memoria para modo Navegador Web (Chrome)
const fileCache = new Map<string, { name: string; content: string; headers: string[] }>();

if (typeof window !== 'undefined' && !(window as any).wienerApi) {
  (window as any).wienerApi = {
    // 📂 Selector de archivos REAL para navegador web
    selectFile: async () => {
      return new Promise<string | null>((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv,.txt';
        input.onchange = (e: any) => {
          const file = e.target.files?.[0];
          if (!file) {
            resolve(null);
            return;
          }
          const reader = new FileReader();
          reader.onload = (evt) => {
            const content = (evt.target?.result as string) || '';
            const lines = content.split('\n').filter((l) => l.trim().length > 0);
            const headers = lines.length > 0 ? lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, '')) : [];
            const pseudoPath = file.name;
            fileCache.set(pseudoPath, { name: file.name, content, headers });
            console.log(`🌐 [Browser File Loader] Archivo real cargado: ${file.name} (${headers.length} columnas)`);
            resolve(pseudoPath);
          };
          reader.readAsText(file);
        };
        input.click();
      });
    },

    getCsvHeaders: async (filePath: string) => {
      if (fileCache.has(filePath)) {
        return fileCache.get(filePath)!.headers;
      }
      return [];
    },

    scanUniqueValues: async (filePath: string, columnName: string) => {
      if (fileCache.has(filePath)) {
        const data = fileCache.get(filePath)!;
        const lines = data.content.split('\n').filter((l) => l.trim().length > 0);
        if (lines.length <= 1) return [];
        const headers = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));
        const colIdx = headers.indexOf(columnName);
        if (colIdx === -1) return [];
        const unique = new Set<string>();
        for (let i = 1; i < lines.length; i++) {
          const cells = lines[i].split(',');
          if (cells[colIdx]) unique.add(cells[colIdx].trim().replace(/^["']|["']$/g, ''));
        }
        return Array.from(unique);
      }
      return [];
    },

    readFile: async (filePath: string) => {
      if (fileCache.has(filePath)) {
        return { success: true, content: fileCache.get(filePath)!.content };
      }
      return { success: false, error: "Archivo no encontrado en la memoria del navegador" };
    },

    writeFile: async (filePath: string, content: string) => {
      if (fileCache.has(filePath)) {
        const item = fileCache.get(filePath)!;
        item.content = content;
        item.headers = content.split('\n')[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));
        return { success: true };
      }
      return { success: false, error: "Archivo no encontrado" };
    },

    runCalculations: async (configData: any) => {
      console.log("🌐 [Browser Engine] Procesando cálculo dinámico con archivos reales cargados...");
      const foodsFile = fileCache.get(configData.foodsFilePath);
      const inputFile = fileCache.get(configData.inputFilePath);
      const recipesFile = configData.recipesFilePath ? fileCache.get(configData.recipesFilePath) : null;

      if (!foodsFile || !inputFile) {
        return { success: false, error: "Archivos no encontrados en la memoria. Por favor selecciónalos de nuevo en el selector." };
      }

      const evalFormula = (expression: string, context: Record<string, any>): number => {
        if (!expression || typeof expression !== 'string') return 0;

        const keys = Object.keys(context).filter((k) => typeof context[k] === 'number' && !isNaN(context[k]));
        const sortedKeys = [...keys].sort((a, b) => b.length - a.length);
        
        const paramNames: string[] = [];
        const paramValues: number[] = [];
        const replacements: { pattern: RegExp; safeName: string }[] = [];

        sortedKeys.forEach((key, idx) => {
          const safeName = `_v${idx}_`;
          paramNames.push(safeName);
          paramValues.push(Number(context[key]));

          const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const isPureIdentifier = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key);
          const pattern = isPureIdentifier ? new RegExp(`\\b${escapedKey}\\b`, 'g') : new RegExp(escapedKey, 'g');
          replacements.push({ pattern, safeName });
        });

        let sanitizedExpr = expression;
        replacements.forEach(({ pattern, safeName }) => {
          sanitizedExpr = sanitizedExpr.replace(pattern, safeName);
        });

        try {
          const func = new Function(...paramNames, `return ${sanitizedExpr};`);
          const result = func(...paramValues);
          return isNaN(result) ? 0 : Number(result.toFixed(4));
        } catch (e) {
          return 0;
        }
      };


      const factorFields = new Set<string>([
        configData.foodIdCol, configData.inputIdCol, 'name', 'descripcion', 'orden', 'dia', 'tipocomi', '_id', '_error', '_calculatedAmount', 'prep_method',
        ...(configData.groupByCol ? [configData.groupByCol] : []),
        ...(configData.cookMethodCol ? [configData.cookMethodCol] : []),
        ...((configData.cookRules || []).map((r: any) => r.reduceField))
      ]);

      // Procesar tabla de alimentos principal
      const foodLines = foodsFile.content.split('\n').filter((l) => l.trim());
      const foodHeaders = foodLines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));
      const foodIdIdx = foodHeaders.indexOf(configData.foodIdCol);

      const foodMap = new Map<string, Record<string, any>>();
      for (let i = 1; i < foodLines.length; i++) {
        const cells = foodLines[i].split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
        const rowObj: Record<string, any> = {};
        foodHeaders.forEach((h, idx) => {
          const num = Number(cells[idx]);
          rowObj[h] = isNaN(num) ? cells[idx] : num;
        });
        const fid = String(cells[foodIdIdx]);
        if (fid) foodMap.set(fid, rowObj);
      }

      // Si hay tabla de recetas/alimentos secundarios, fusionarla
      if (recipesFile) {
        const recLines = recipesFile.content.split('\n').filter((l) => l.trim());
        const recHeaders = recLines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));
        
        const aliasMap: Record<string, string> = {};
        if (configData.columnAliases) {
          configData.columnAliases.forEach((alias: any) => {
            if (alias.recipeCol && alias.foodCol) aliasMap[alias.recipeCol] = alias.foodCol;
          });
        }

        const recIdCol = aliasMap['cod_b'] || aliasMap['id'] || configData.foodIdCol;
        const recIdIdx = recHeaders.indexOf(recIdCol);

        for (let i = 1; i < recLines.length; i++) {
          const cells = recLines[i].split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
          const rowObj: Record<string, any> = {};
          recHeaders.forEach((h, idx) => {
            const mappedHeader = aliasMap[h] || h;
            const num = Number(cells[idx]);
            rowObj[mappedHeader] = isNaN(num) ? cells[idx] : num;
          });
          const rfid = String(rowObj[configData.foodIdCol] || cells[recIdIdx]);
          if (rfid && !foodMap.has(rfid)) foodMap.set(rfid, rowObj);
        }
      }

      // Procesar tabla de consumo / entrada
      const inputLines = inputFile.content.split('\n').filter((l) => l.trim());
      const inputHeaders = inputLines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));
      const inputIdIdx = inputHeaders.indexOf(configData.inputIdCol);
      const amountIdx = inputHeaders.indexOf(configData.amountCol);

      const results: any[] = [];
      const scale = Number(configData.inputScale) || 0.01;

      for (let i = 1; i < inputLines.length; i++) {
        const cells = inputLines[i].split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
        const rowObj: Record<string, any> = {};
        inputHeaders.forEach((h, idx) => {
          rowObj[h] = cells[idx];
        });

        const iid = String(cells[inputIdIdx]);
        const amt = Number(cells[amountIdx]) || 0;
        const foodData = foodMap.get(iid);

        if (foodData) {
          const scaledAmount = amt * scale;
          const calcRow: Record<string, any> = { ...rowObj, ...foodData, _calculatedAmount: scaledAmount };

          for (const [k, v] of Object.entries(foodData)) {
            if (factorFields.has(k)) {
              calcRow[k] = v;
              continue;
            }
            if (typeof v === 'number') {
              calcRow[k] = Number((v * scaledAmount).toFixed(4));
            }
          }

          // Aplicar reducción por cocción
          const cookMethod = configData.cookMethodCol && rowObj[configData.cookMethodCol] ? String(rowObj[configData.cookMethodCol]) : undefined;
          if (cookMethod) {
            const method = cookMethod.toLowerCase();
            const rule = (configData.cookRules || []).find((r: any) => r.method.toLowerCase() === method);
            if (rule) {
              const reductionFactor = Number(foodData[rule.reduceField]) || 0;
              const retentionFactor = Math.max(0, 1.0 - reductionFactor);
              (rule.targetNutrients || []).forEach((nutrient: string) => {
                const nutrientKey = nutrient.trim();
                if (typeof calcRow[nutrientKey] === 'number') {
                  calcRow[nutrientKey] = Number((calcRow[nutrientKey] * retentionFactor).toFixed(4));
                }
              });
            }
          }

          // Aplicar reglas matemáticas
          (configData.calculations || []).forEach((calc: any) => {
            calcRow[calc.outputField] = evalFormula(calc.expression, calcRow);
          });

          results.push(calcRow);
        }
      }

      // Agrupar si está especificado
      if (configData.groupByCol && results.length > 0) {
        const grouped = new Map<string, any>();
        for (const row of results) {
          const gkey = row[configData.groupByCol];
          if (!gkey) continue;
          if (!grouped.has(gkey)) {
            const baseObj: Record<string, any> = {};
            for (const [k, v] of Object.entries(row)) {
              if (factorFields.has(k) || typeof v === 'string') {
                baseObj[k] = v;
              }
            }
            baseObj[configData.groupByCol] = gkey;
            grouped.set(gkey, baseObj);
          }
          const grp = grouped.get(gkey);
          for (const [k, v] of Object.entries(row)) {
            if (factorFields.has(k) || k === configData.groupByCol) continue;
            if (typeof v === 'number') {
              grp[k] = Number(((grp[k] || 0) + v).toFixed(4));
            } else if (grp[k] === undefined) {
              grp[k] = v;
            }
          }
        }

        const groupedResults = Array.from(grouped.values()).map((groupObj) => {
          (configData.calculations || []).forEach((calc: any) => {
            groupObj[calc.outputField] = evalFormula(calc.expression, groupObj);
          });
          return groupObj;
        });

        return { success: true, data: groupedResults };
      }

      return { success: true, data: results };
    },


    saveCsv: async (data: any[]) => {
      const headers = Object.keys(data[0] || {});
      const csv = [headers.join(','), ...data.map((r) => headers.map((h) => `"${r[h] ?? ''}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'wiener_results.csv';
      a.click();
      return { success: true, filePath: 'wiener_results.csv' };
    },

    saveExcel: async (data: any[]) => {
      return (window as any).wienerApi.saveCsv(data);
    },

    saveConfig: async (cfg: any) => {
      const json = JSON.stringify(cfg, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'wiener_profile.json';
      a.click();
      return { success: true, filePath: 'wiener_profile.json' };
    },

    loadConfig: async () => {
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e: any) => {
          const file = e.target.files?.[0];
          if (!file) {
            resolve({ success: false });
            return;
          }
          const reader = new FileReader();
          reader.onload = (evt) => {
            try {
              const parsed = JSON.parse(evt.target?.result as string);
              resolve({ success: true, data: parsed });
            } catch (err) {
              resolve({ success: false, error: "JSON inválido" });
            }
          };
          reader.readAsText(file);
        };
        input.click();
      });
    }
  };
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)



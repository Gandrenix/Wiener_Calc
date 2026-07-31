import * as fs from 'fs';
import { parse } from 'csv-parse';

export interface CalculationRule {
    outputField: string;
    expression: string;
}

export interface CookRule {
    method: string;
    reduceField: string;
    targetNutrients: string[];
}

export interface RecipeIngredient {
    ingredientId: string;
    amount: number;
}

export interface ColumnAlias {
    recipeCol: string;
    foodCol: string;
}

export interface WienerConfig {
    foodsFilePath: string;
    inputFilePath: string;
    recipesFilePath?: string; 
    foodIdCol: string;
    inputIdCol: string; 
    amountCol: string;
    inputScale: number;
    cookMethodCol?: string;
    groupByCol?: string; 
    calculations: CalculationRule[];
    cookRules: CookRule[];
    columnAliases: ColumnAlias[];
}

// 🔥 NUEVO: Escáner a prueba de balas para forzar textos a números (Maneja comas latinas y espacios)
const parseSafeNumber = (val: any): number | null => {
    if (typeof val === 'number') return isNaN(val) ? null : val;
    if (val === null || val === undefined || val === '') return null;
    const str = String(val).trim().replace(',', '.'); 
    const num = Number(str);
    return isNaN(num) ? null : num;
};

export class WienerCalcEngine {
    private foodTable: Map<string, Record<string, any>> = new Map();
    private recipeTable: Map<string, RecipeIngredient[]> = new Map();

    public async loadFoods(filePath: string, idCol: string): Promise<void> {
        this.foodTable.clear();
        // Añadido bom: true y trim: true para evitar caracteres fantasma
        const parser = fs.createReadStream(filePath).pipe(
            parse({ columns: true, skip_empty_lines: true, cast: true, bom: true, trim: true })
        );
        for await (const row of parser) {
            const foodId = String(row[idCol]);
            if (foodId && foodId !== 'undefined') {
                this.foodTable.set(foodId, row);
            }
        }
        console.log(`🐕 Woof! Loaded ${this.foodTable.size} primary foods into memory.`);
    }

    public async loadRecipes(filePath: string, config: WienerConfig): Promise<void> {
        this.recipeTable.clear();
        if (!filePath) return; 

        const firstRow = await new Promise<any>((resolve) => {
            const stream = fs.createReadStream(filePath).pipe(parse({ to_line: 2, columns: true, bom: true, trim: true }));
            stream.on('data', (row) => resolve(row));
            stream.on('end', () => resolve(null));
        });

        if (!firstRow) return;

        if ('recipe_id' in firstRow && 'ingredient_id' in firstRow) {
            console.log("🐕 Woof! Detected Recursive Recipe Dictionary.");
            const parser = fs.createReadStream(filePath).pipe(
                parse({ columns: true, skip_empty_lines: true, cast: true, bom: true, trim: true })
            );

            for await (const row of parser) {
                const recipeId = String(row['recipe_id']);
                const ingredientId = String(row['ingredient_id']);
                const amount = Number(row['amount']) || 0;

                if (recipeId && ingredientId) {
                    if (!this.recipeTable.has(recipeId)) {
                        this.recipeTable.set(recipeId, []);
                    }
                    this.recipeTable.get(recipeId)!.push({ ingredientId, amount });
                }
            }
            console.log(`🐕 Woof! Loaded ${this.recipeTable.size} recursive recipes into memory.`);
        } 
        else {
            console.log("🐕 Woof! Detected Pre-calculated Recipe Table. Starting Merge...");
            
            const aliasMap: Record<string, string> = {};
            if (config.columnAliases) {
                config.columnAliases.forEach(alias => {
                    if (alias.recipeCol && alias.foodCol) {
                        aliasMap[alias.recipeCol] = alias.foodCol;
                    }
                });
            }

            const parser = fs.createReadStream(filePath).pipe(
                parse({ columns: true, skip_empty_lines: true, cast: true, bom: true, trim: true })
            );

            let count = 0;
            for await (const rawRow of parser) {
                const translatedRow: Record<string, any> = {};

                for (const [key, value] of Object.entries(rawRow)) {
                    const newKey = aliasMap[key] || key;
                    translatedRow[newKey] = value;
                }

                const foodId = String(translatedRow[config.foodIdCol]);
                
                if (foodId && foodId !== 'undefined') {
                    this.foodTable.set(foodId, translatedRow);
                    count++;
                }
            }
            console.log(`🐕 Woof! Translated and merged ${count} secondary items into main memory.`);
        }
    }

    private processItem(itemId: string, amount: number, cookMethod: string | undefined, config: WienerConfig, depth: number = 0): any[] {
        if (depth > 10) throw new Error(`Circular recipe reference detected at ID: ${itemId}`);

        if (this.recipeTable.has(itemId)) {
            const ingredients = this.recipeTable.get(itemId)!;
            let expandedResults: any[] = [];
            
            for (const ing of ingredients) {
                const ingredientTotalAmount = ing.amount * amount; 
                const subResults = this.processItem(ing.ingredientId, ingredientTotalAmount, cookMethod, config, depth + 1);
                expandedResults = expandedResults.concat(subResults);
            }
            return expandedResults;
        }

        const foodData = this.foodTable.get(itemId);
        if (!foodData) {
            return [{ _id: itemId, _calculatedAmount: amount, _error: `ID ${itemId} not found in database or recipes` }];
        }

        const scaledAmount = amount * config.inputScale;
        const resultRow: Record<string, any> = { _id: itemId, ...foodData, _calculatedAmount: scaledAmount };

        // 🔥 CORRECCIÓN: Usamos parseSafeNumber para garantizar que nada se quede sin calcular
        for (const [key, value] of Object.entries(foodData)) {
            if (key === config.foodIdCol || key === 'name' || key === 'descripcion') continue;

            const numVal = parseSafeNumber(value);
            if (numVal !== null) {
                resultRow[key] = parseFloat((numVal * scaledAmount).toFixed(4));
            } else {
                resultRow[key] = value; // Si es texto puro, lo conserva
            }
        }

        if (cookMethod) {
            const method = cookMethod.toLowerCase();
            const rule = config.cookRules.find(r => r.method.toLowerCase() === method);
            if (rule) {
                const reductionFactor = parseSafeNumber(foodData[rule.reduceField]) || 0;
                const retentionFactor = 1.0 - reductionFactor;
                rule.targetNutrients.forEach(nutrient => {
                    const nutrientKey = nutrient.trim();
                    if (typeof resultRow[nutrientKey] === 'number') {
                        resultRow[nutrientKey] = parseFloat((resultRow[nutrientKey] * retentionFactor).toFixed(4));
                    }
                });
            }
        }

        config.calculations.forEach(calc => {
            resultRow[calc.outputField] = this.evaluateFormula(calc.expression, resultRow);
        });

        return [resultRow]; 
    }

    private evaluateFormula(expression: string, context: Record<string, any>): number {
        const keys = Object.keys(context).filter(k => typeof context[k] === 'number' && !isNaN(context[k]));
        const values = keys.map(k => context[k]);
        try {
            const func = new Function(...keys, `return ${expression};`);
            const result = func(...values);
            return isNaN(result) ? 0 : Number(result.toFixed(4));
        } catch (e) {
            return 0;
        }
    }

    public async processCalculations(config: WienerConfig): Promise<any[]> {
        await this.loadFoods(config.foodsFilePath, config.foodIdCol);
        
        if (config.recipesFilePath) {
            await this.loadRecipes(config.recipesFilePath, config);
        }
        
        let results: any[] = []; 
        
        const parser = fs.createReadStream(config.inputFilePath).pipe(
            parse({ columns: true, skip_empty_lines: true, bom: true, trim: true })
        );
        
        for await (const row of parser) {
            const itemId = String(row[config.inputIdCol]);
            const amount = parseSafeNumber(row[config.amountCol]) || 0;
            const cookMethod = config.cookMethodCol && row[config.cookMethodCol] ? String(row[config.cookMethodCol]) : undefined;
            
            const processedItems = this.processItem(itemId, amount, cookMethod, config);
            const finalItems = processedItems.map(item => ({ ...row, ...item }));
            results = results.concat(finalItems);
        }

        if (config.groupByCol && results.length > 0) {
            console.log(`Squashing results by group: ${config.groupByCol}...`);
            const groupedMap = new Map<string, any>();

            for (const row of results) {
                const groupKey = row[config.groupByCol];
                if (!groupKey) continue; 

                if (!groupedMap.has(groupKey)) {
                    groupedMap.set(groupKey, { [config.groupByCol]: groupKey });
                }

                const currentGroup = groupedMap.get(groupKey);

                for (const key of Object.keys(row)) {
                    if (key === config.groupByCol || key === config.foodIdCol || key === config.inputIdCol || key === 'name' || key === config.cookMethodCol || key === '_id' || key === '_error') {
                        continue; 
                    }

                    const numVal = parseSafeNumber(row[key]);
                    if (numVal !== null) {
                        currentGroup[key] = (currentGroup[key] || 0) + numVal;
                    } else if (!currentGroup[key]) {
                        currentGroup[key] = row[key]; // Guarda los textos agrupados si no existían
                    }
                }
            }

            results = Array.from(groupedMap.values()).map(groupObj => {
                for (const key in groupObj) {
                    if (typeof groupObj[key] === 'number') {
                         groupObj[key] = Number(groupObj[key].toFixed(4));
                    }
                }
                return groupObj;
            });
            console.log(`Squash complete! Reduced to ${results.length} grouped rows.`);
        }

        return results;
    }
}

export async function executeFoodCalc(configData: WienerConfig): Promise<any[]> {
    const engine = new WienerCalcEngine();
    return await engine.processCalculations(configData);
}
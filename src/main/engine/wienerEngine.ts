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

export interface WienerConfig {
    foodsFilePath: string;
    inputFilePath: string;
    foodIdCol: string;
    amountCol: string;
    inputScale: number;
    cookMethodCol?: string;
    // 👇 ADDED GROUP BY TO INTERFACE 👇
    groupByCol?: string; 
    calculations: CalculationRule[];
    cookRules: CookRule[];
}

export class WienerCalcEngine {
    private foodTable: Map<string, Record<string, number>> = new Map();

    public async loadFoods(filePath: string, idCol: string): Promise<void> {
        this.foodTable.clear();
        const parser = fs.createReadStream(filePath).pipe(
            parse({ columns: true, skip_empty_lines: true, cast: true })
        );
        for await (const row of parser) {
            const foodId = String(row[idCol]);
            if (foodId && foodId !== 'undefined') {
                this.foodTable.set(foodId, row);
            }
        }
        console.log(`🐕 Woof! Loaded ${this.foodTable.size} foods into memory.`);
    }

    private processSingleFood(inputRow: any, config: WienerConfig): any {
        const foodId = String(inputRow[config.foodIdCol]);
        const foodData = this.foodTable.get(foodId);
        if (!foodData) return { ...inputRow, _error: 'Food ID not found in database' };

        const amount = Number(inputRow[config.amountCol]) || 0;
        const scaledAmount = amount * config.inputScale;
        const resultRow: Record<string, any> = { ...inputRow, ...foodData, _calculatedAmount: scaledAmount };

        for (const [key, value] of Object.entries(foodData)) {
            if (typeof value === 'number' && key !== config.foodIdCol) {
                resultRow[key] = parseFloat((value * scaledAmount).toFixed(4));
            }
        }

        if (config.cookMethodCol && inputRow[config.cookMethodCol]) {
            const method = String(inputRow[config.cookMethodCol]).toLowerCase();
            const rule = config.cookRules.find(r => r.method.toLowerCase() === method);
            if (rule) {
                const reductionFactor = Number(foodData[rule.reduceField]) || 0;
                const retentionFactor = 1.0 - reductionFactor;
                rule.targetNutrients.forEach(nutrient => {
                    const nutrientKey = nutrient.trim();
                    if (resultRow[nutrientKey] !== undefined) {
                        resultRow[nutrientKey] *= retentionFactor;
                    }
                });
            }
        }

        config.calculations.forEach(calc => {
            resultRow[calc.outputField] = this.evaluateFormula(calc.expression, resultRow);
        });

        return resultRow;
    }

    private evaluateFormula(expression: string, context: Record<string, any>): number {
        const keys = Object.keys(context).filter(k => typeof context[k] === 'number');
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
        
        // 👇 Changed 'const' to 'let' so we can overwrite it with grouped data
        let results: any[] = []; 
        
        const parser = fs.createReadStream(config.inputFilePath).pipe(
            parse({ columns: true, skip_empty_lines: true })
        );
        for await (const row of parser) {
            const processedRow = this.processSingleFood(row, config);
            results.push(processedRow);
        }

        // ==========================================================
        // 🐕 THE SUMMARIZER (GROUP BY LOGIC)
        // ==========================================================
        if (config.groupByCol && results.length > 0) {
            console.log(`Squashing results by group: ${config.groupByCol}...`);
            const groupedMap = new Map<string, any>();

            for (const row of results) {
                const groupKey = row[config.groupByCol];
                if (!groupKey) continue; 

                // If this is a new person/group, start a fresh object
                if (!groupedMap.has(groupKey)) {
                    groupedMap.set(groupKey, { [config.groupByCol]: groupKey });
                }

                const currentGroup = groupedMap.get(groupKey);

                // Loop through the row and ADD all the numbers together
                for (const key of Object.keys(row)) {
                    // Skip text columns so we don't try to do math on words!
                    if (key === config.groupByCol || key === config.foodIdCol || key === 'name' || key === config.cookMethodCol) {
                        continue; 
                    }

                    const val = parseFloat(row[key]);
                    if (!isNaN(val)) {
                        // Add the nutrient/calculation to the running total for this group
                        currentGroup[key] = (currentGroup[key] || 0) + val;
                    }
                }
            }

            // Convert our Map back into a flat array of rounded results!
            results = Array.from(groupedMap.values()).map(groupObj => {
                for (const key in groupObj) {
                    if (typeof groupObj[key] === 'number') {
                         // Keep the numbers clean by rounding to 4 decimals
                         groupObj[key] = Number(groupObj[key].toFixed(4));
                    }
                }
                return groupObj;
            });
            console.log(`Squash complete! Reduced to ${results.length} grouped rows.`);
        }
        // ==========================================================

        return results;
    }
}

export async function executeFoodCalc(configData: WienerConfig): Promise<any[]> {
    const engine = new WienerCalcEngine();
    return await engine.processCalculations(configData);
}
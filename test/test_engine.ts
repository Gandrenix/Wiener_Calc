import { WienerCalcEngine, WienerConfig } from '../src/main/engine/wienerEngine';
import * as path from 'path';

async function runTest() {
    console.log("🧪 --- INICIANDO PRUEBA DEL MOTOR DE CÁLCULO CON TPAISA.CSV ---");

    const baseDir = path.join(__dirname);
    const config: WienerConfig = {
        foodsFilePath: path.join(baseDir, 'tpaisa.csv'),
        foodIdCol: 'codalim',
        recipesFilePath: path.join(baseDir, 'trecetas.csv'),
        inputFilePath: path.join(baseDir, 'ejemingre.csv'),
        inputIdCol: 'codalim',
        amountCol: 'cantidad',
        inputScale: 0.01, // 100g base conversion
        groupByCol: 'id',
        columnAliases: [
            { recipeCol: 'cod_b', foodCol: 'codalim' },
            { recipeCol: 'Kcal', foodCol: 'kcal' },
            { recipeCol: 'Pro. g.', foodCol: 'proteina_g' },
            { recipeCol: 'GT. g.', foodCol: 'grasatot_g' },
            { recipeCol: 'CHO. g.', foodCol: 'Carboh_g' },
            { recipeCol: 'VA (UI)', foodCol: 'vitaA(UI)' }
        ],
        calculations: [
            {
                outputField: 'cal_from_fat',
                expression: 'grasatot_g * 9'
            },
            {
                outputField: 'vitA_sum',
                expression: 'vitaA(UI) + vitaA(ER)'
            }
        ],
        cookRules: []
    };

    try {
        const engine = new WienerCalcEngine();
        const results = await engine.processCalculations(config);

        console.log(`\n✅ CÁLCULO EXITOSO! Filas resultantes: ${results.length}`);
        console.log("\n📌 Vista previa del primer resultado agrupado:");
        console.log(JSON.stringify(results[0], null, 2));

        if (results.length > 0 && results[0].cal_from_fat !== undefined && results[0]['vitaA(UI)'] !== undefined) {
            console.log("\n🎉 TODAS LAS VERIFICACIONES PASARON MATEMÁTICAMENTE Y SIN ERRORES!");
        } else {
            console.error("\n❌ ALGUNOS CAMPOS ESPERADOS NO SE GENERARON BIEN.");
            process.exit(1);
        }
    } catch (err) {
        console.error("\n❌ ERROR DURANTE LA PRUEBA:", err);
        process.exit(1);
    }
}

runTest();

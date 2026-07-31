# 📌 WienerCalc: Session Resume & Project Status

**Fecha de Estado:** 30 de Julio, 2026  
**Proyecto:** WienerCalc 2.0 (Motor de Cálculo Nutrencial Moderno - Traducción de FoodCalc C)  
**Ubicación del Workspace:** `c:\Users\Asus\Desktop\💻 Development Projects\WienerCalc`

---

## ✅ Resumen de Trabajo Completado

### 1. Auditoría y Correcciones Lógicas en el Motor ([wienerEngine.ts](file:///c:/Users/Asus/Desktop/%F0%9F%92%BB%20Development%20Projects/WienerCalc/src/main/engine/wienerEngine.ts))
- **Escalado de Recetas Composicionales:** Se ajustó la fórmula en `processItem` para dividir por la suma del peso total del lote de la receta (`recipeSum`), escalando proporcionalmente las porciones sin inflar los nutrientes.
- **Evaluador de Fórmulas Sanitizado:** Se corrigió `evaluateFormula` para procesar encabezados de columna con paréntesis, espacios o guiones (ej. `vitaA(UI)`, `vitaA(ER)`), mapeándolos a identificadores válidos de JavaScript para evitar `SyntaxError` y retornos en `0`.
- **Protección de Factores y Metadatos:** Se implementó el conjunto `factorFields` para proteger columnas de control (`foodIdCol`, `inputIdCol`, `orden`, `dia`, `boil_loss`, `nonEdibleCol`) para que no se multipliquen por la porción consumida ni se sumen erróneamente durante la agrupación por persona.
- **Soporte para Parte No Comestible (`nonEdibleCol`):** Se añadió el parámetro opcional para descontar porciones no comestibles (ej. cáscaras, huesos).
- **Agrupamiento Robusto (`groupByCol`):** Se corrigió el aplastado de resultados por grupo para preservar metadatos de los alimentos y sumar estrictamente columnas de nutrientes.

### 2. Validación Matemática con `tpaisa.csv` y Dataset Real
- Se creó y ejecutó el script de pruebas automatizadas [test_engine.ts](file:///c:/Users/Asus/Desktop/%F0%9F%92%BB%20Development%20Projects/WienerCalc/test/test_engine.ts).
- **Resultados de la Ingesta (Sujeto 100532 - Encuesta de 2 Días):**
  - **Calorías Totales:** `7,670.08 kcal` (Promedio: `3,835 kcal/día`)
  - **Proteínas:** `266.82 g` (Promedio: `133.4 g/día`)
  - **Grasas:** `103.29 g` (Promedio: `51.6 g/día`)
  - **Carbohidratos:** `1407.90 g` (Promedio: `703.9 g/día`)
  - **Calorías de Grasas (`cal_from_fat`):** `929.601 kcal` (`grasatot_g * 9`)
  - **Suma Vitamina A (`vitA_sum`):** `75,631.13` (`vitaA(UI) + vitaA(ER)`)
- **Balance Energético de Atwater:** Coincidencia matemática del **99.5%** entre las calorías calculadas por macronutrientes ($7,628.49\,\text{kcal}$) y el total de la base de datos ($7,670.08\,\text{kcal}$).

### 3. Verificación de UI y Compilación de Producción
- **Integración Web Browser / Chrome:** Se añadió soporte dinámico multicaso en [main.tsx](file:///c:/Users/Asus/Desktop/%F0%9F%92%BB%20Development%20Projects/WienerCalc/src/renderer/src/main.tsx) para permitir pruebas sin romper el IPC de Electron.
- **Build:** `npm run build` ejecutado exitosamente con 0 errores de TypeScript.

---

## 🎯 Estado para la Próxima Sesión

1. **Compilación y Motor:** Listos y funcionando a la perfección.
2. **Archivos Principales a Revisar si se Requiere:**
   - Motor: [src/main/engine/wienerEngine.ts](file:///c:/Users/Asus/Desktop/%F0%9F%92%BB%20Development%20Projects/WienerCalc/src/main/engine/wienerEngine.ts)
   - Pruebas Automatizadas: [test/test_engine.ts](file:///c:/Users/Asus/Desktop/%F0%9F%92%BB%20Development%20Projects/WienerCalc/test/test_engine.ts)
   - Proceso Principal de Electron: [src/main/main.ts](file:///c:/Users/Asus/Desktop/%F0%9F%92%BB%20Development%20Projects/WienerCalc/src/main/main.ts)
   - Componentes UI React: [src/renderer/src/App.tsx](file:///c:/Users/Asus/Desktop/%F0%9F%92%BB%20Development%20Projects/WienerCalc/src/renderer/src/App.tsx)
3. **Comandos Útiles:**
   - `npm run dev`: Iniciar la aplicación en modo desarrollo Electron + Vite.
   - `npx tsx test/test_engine.ts`: Ejecutar prueba matemática con dataset `tpaisa.csv`.
   - `npm run build:win`: Generar el empaquetado ejecutable instalador para Windows.

# WienerCalc — Resumen del Proyecto

## Qué es

WienerCalc es una aplicación de escritorio (Electron + React + TypeScript), desarrollada por Wiener Hound Studios, que reimplementa y moderniza **FoodCalc**, un motor clásico de cálculo nutricional escrito originalmente en C (incluido en el repo como referencia en `Codigo original foodcalc.md`). El objetivo es ofrecer a nutricionistas, investigadores y epidemiólogos una herramienta gratuita y de código abierto para procesar encuestas alimentarias y calcular la ingesta de nutrientes a partir de tablas de composición de alimentos, sin depender de bases de datos propietarias ni de formatos de columna fijos.

El autor la está desarrollando como proyecto personal/académico (Nutrición y Dietética, UIS — según el borrador de correo dirigido a un docente para pedir retroalimentación).

## Qué permite hacer

A partir de archivos CSV, WienerCalc:

1. **Carga tres fuentes de datos**: una tabla de composición de alimentos (nutrientes por 100 g), un registro de consumo/ingesta (qué comió cada persona y cuánto), y opcionalmente una tabla de recetas.
2. **Mapea columnas dinámicamente**: el usuario indica cuál columna es el ID de alimento, cuál la cantidad, la escala de conversión (gramos, kg, porciones de 100 g), el método de cocción y la columna de agrupación (por paciente, día, tipo de comida, etc.). No exige nombres de columna fijos, por lo que funciona con cualquier tabla nutricional (USDA, tpaisa, LATINFOODS, tablas personalizadas, etc.).
3. **Resuelve recetas de dos formas**: uniendo una tabla de preparaciones ya calculadas mediante alias de columnas, o descomponiendo recursivamente una receta en sus ingredientes crudos y escalando proporcionalmente las cantidades (con protección contra referencias circulares).
4. **Aplica fórmulas matemáticas personalizadas**: el usuario define reglas tipo `nombre = expresión` (p. ej. `cal_from_fat = grasatot_g * 9`) que se evalúan de forma segura sobre cualquier combinación de columnas numéricas, incluso con nombres con paréntesis o espacios (`vitaA(UI)`).
5. **Aplica factores de cocción**: retenciones/pérdidas de nutrientes sensibles según el método de preparación (hervido, frito, etc.), y factores de porción no comestible (cáscaras, huesos).
6. **Agrupa y suma resultados** por paciente, día u otra columna, produciendo una fila resumen por grupo.
7. **Exporta** los resultados a CSV o Excel (.xlsx), y permite guardar/cargar "perfiles" de configuración en JSON para reutilizar mapeos y fórmulas entre sesiones.
8. Incluye un editor/inspector de CSV integrado en la propia app para revisar y editar los archivos cargados sin salir del programa.

## Estructura técnica

- **Motor de cálculo** (`src/main/engine/wienerEngine.ts`, ~340 líneas): toda la lógica de carga de CSV, resolución de recetas, evaluación de fórmulas y agregación. Es el corazón traducido de la lógica de FoodCalc en C.
- **Proceso principal de Electron** (`src/main/main.ts`): expone vía IPC el motor de cálculo, diálogos de selección de archivo, lectura de encabezados/valores únicos de CSV, exportación a CSV/Excel y guardado/carga de perfiles JSON.
- **Interfaz** (`src/renderer/src/App.tsx`, ~740 líneas): UI en React organizada en 4 pestañas secuenciales — Fuentes de Datos → Mapeo de Campos → Reglas y Cocción → Calcular/Exportar.
- **Empaquetado**: `electron-builder` genera instaladores de escritorio (Windows/macOS); también se puede compilar como build web (`build:web`) para uso desde navegador sin instalación, y hay configuración de despliegue en Netlify (`netlify.toml`).
- **Datos de prueba** (`test/`): varios CSV de ejemplo (`foods.csv`, `input.csv`, `tpaisa.csv`, `trecetas.csv`, etc.) y un script (`test_engine.ts`) que valida matemáticamente el motor contra un dataset real, con un balance energético de Atwater del 99.5% de coincidencia.
- **Documentación**: `Guia de uso/` contiene la guía oficial de usuario (Markdown, LaTeX y PDF); `SESSION_RESUME.md` y `verificacion.md` documentan el estado de desarrollo y los procedimientos de verificación manual más recientes.

## Nota sobre `my-wiener-calc/`

Dentro del repo existe una segunda carpeta, `my-wiener-calc/`, que es un boilerplate nuevo de Electron + Vite + React (generado con `electron-vite`, versiones de dependencias más recientes: React 19, Electron 39). Actualmente no contiene lógica de negocio propia (README y `src` por defecto del template), por lo que parece ser el punto de partida para una futura migración o reescritura del proyecto, aún sin desarrollar.

## Estado actual (según `SESSION_RESUME.md`, 30 jul 2026)

El motor y la compilación están funcionando correctamente: se corrigieron el escalado proporcional de recetas, el saneamiento del evaluador de fórmulas, la protección de columnas de metadatos frente a la multiplicación por porciones, el soporte de parte no comestible y la agrupación por persona. El build de producción (`npm run build`) corre sin errores de TypeScript, y las pruebas contra `tpaisa.csv` confirman la precisión matemática del motor.

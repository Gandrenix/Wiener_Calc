# Auditoría técnica de WienerCalc

> ## ✅ ESTADO: TODOS LOS HALLAZGOS CORREGIDOS (3 de agosto de 2026)
>
> El plan de acción de este documento se implementó por completo. Resumen de la verificación:
>
> - **116 pruebas automáticas** en verde (`npm test`), incluida la de **paridad byte a byte** entre la versión web y la de escritorio.
> - **`tsc --noEmit` sin errores** en todo el proyecto (que además destapó un problema latente: `src/preload/preload.d.ts` nunca se incluía en la compilación, así que `window.wienerApi` estaba sin tipar en toda la interfaz).
> - Matriz de **8 formatos de CSV** distintos con resultado idéntico, y **10 casos de uso** con y sin recetas.
>
> | Hallazgo | Estado | Dónde se corrigió |
> |---|---|---|
> | C1 · Web ≠ Escritorio | ✅ | Motor unificado en `src/shared/engine.ts`; se eliminaron ~200 líneas duplicadas de `main.tsx` |
> | C1b · Colisión de códigos silenciosa | ✅ | Selector de política en la pestaña 1 + aviso con el recuento |
> | C2 · BOM UTF-8 rompía la app | ✅ | `src/shared/csv.ts` retira el BOM en todas las rutas; guarda contra «0 alimentos cargados» |
> | C3 · No encontrados desaparecían | ✅ | `EngineResult.notFound` + panel en la interfaz + informe `.txt` |
> | A1 · Cantidad concatenada como texto | ✅ | Coerción explícita al agrupar; nueva columna `_cantidad_total` |
> | A2 · Fórmula errónea → ceros | ✅ | `src/shared/formula.ts`: validación en vivo con sugerencia; celda vacía, nunca 0 |
> | A3 · CSV y Excel con columnas distintas | ✅ | Unión de claves en ambos exportadores |
> | A4 · Heurística de recetas frágil | ✅ | Modo explícito (auto / fusión / diccionario) + mapeo manual de columnas |
> | M1 · `nonEdibleCol` inalcanzable | ✅ | Expuesto en la pestaña 2 con selector fracción/porcentaje y aviso de unidad |
> | M2 · Nombres de columna cableados | ✅ | Lista de «columnas descriptivas» elegida por el usuario, con sugerencias |
> | M3 · Sin agrupación multi-columna | ✅ | `groupByCols: string[]` (sujeto + día) |
> | M4 · Metadatos engañosos | ✅ | Renombrado a `primer_<col>` sólo cuando el valor varía dentro del grupo |
> | M5 · Parser CSV del navegador | ✅ | Parser RFC 4180 compartido: comillas, delimitadores, CRLF, coma decimal |
> | M6 · Web sin recetas recursivas | ✅ | Mismo motor: la web tiene todas las capacidades |
> | M7 · Botón «Excel» exportaba CSV | ✅ | La web avisa de que exporta CSV en vez de mentir en el nombre |
> | M8 · `inputScale` sin validar | ✅ | Validación en la interfaz y en el motor |
> | S1 · Ejecución de código desde `.json` | ✅ | `new Function` sustituido por un parser propio de gramática cerrada |
> | Doc · Valores esperados erróneos | ✅ | `verificacion.md` reescrito con valores comprobados |
>
> **Único punto pendiente (S2):** actualizar `electron@28` → 39 y `xlsx@0.18.5`, que requiere `npm install` y volver a probar el empaquetado del instalador.
>
> **Extra solicitado:** botón **×** para quitar el archivo de cualquiera de las tres celdas, que además limpia las selecciones dependientes y los resultados obsoletos.
>
> Lo que sigue es el informe original, conservado como registro de lo que se encontró y por qué.

---

**Fecha:** 3 de agosto de 2026
**Alcance:** `src/main/engine/wienerEngine.ts`, `src/main/main.ts`, `src/preload/preload.ts`, `src/renderer/src/App.tsx`, `src/renderer/src/main.tsx` (motor web), configuración de build y datasets de `test/`.
**Método:** lectura de código + ejecución real del motor contra `foods.csv`/`input.csv` y `tpaisa.csv`/`ejemingre.csv`/`trecetas.csv`, más casos sintéticos para aislar cada fallo.

---

## Veredicto

**Sí hay errores de cálculo y de funcionamiento.** El motor compila y corre, y la aritmética base (escalado por porción, factores de cocción, fórmulas, suma por persona) es correcta en el caso feliz. Pero encontré **3 fallos críticos** que producen resultados incorrectos o incompletos **sin ningún aviso al usuario**, más 4 de severidad alta.

El más grave: **la versión web y la versión de escritorio devuelven números distintos con los mismos archivos y la misma configuración.** En una herramienta destinada a investigación nutricional, eso invalida cualquier resultado hasta corregirlo.

---

## 🔴 Críticos

### C1. La app web y la de escritorio dan resultados diferentes

Ejecuté ambos motores con `tpaisa.csv` + `ejemingre.csv` + `trecetas.csv` y los 7 alias de `verificacion.md`, sujeto `100532`:

| Campo | Escritorio (Electron) | Web (navegador) | Diferencia |
|---|---:|---:|---:|
| `kcal` | 7 670.08 | 8 619.48 | +12.4 % |
| `proteina_g` | 266.82 | 237.43 | −11.0 % |
| `grasatot_g` | 103.29 | 230.30 | **+123 %** |
| `Carboh_g` | 1 407.90 | 1 395.84 | −0.9 % |
| `cal_from_fat` | 929.60 | 2 072.69 | +123 % |
| `vitA_sum` | 75 658.93 | 75 910.33 | +0.3 % |

**Causa raíz:** hay **dos implementaciones independientes del motor**. La de escritorio está en `wienerEngine.ts`; la web está copiada a mano dentro de `src/renderer/src/main.tsx` (líneas ~100-300) y ha divergido. Cuando un código existe tanto en la tabla de alimentos como en la de recetas:

- `wienerEngine.ts:132` → `this.foodTable.set(foodId, translatedRow)` → **la receta sobrescribe al alimento**.
- `main.tsx` → `if (rfid && !foodMap.has(rfid)) foodMap.set(...)` → **la receta se ignora**.

En tus datos hay **52 códigos de `trecetas.csv` que ya existen en `tpaisa.csv`**, y **8 de los 127 consumos** del sujeto usan uno de esos códigos. Esos 8 registros son los que producen una diferencia de 123 % en grasa total.

Nota: en `verificacion.md` ya aparecen ambos números ("7670.08 **o ~8619** si incluye alimentos de recetas combinadas") registrados como si fueran dos resultados igualmente válidos. No lo son: uno de los dos está mal, y la app nunca dice cuál está aplicando.

### C2. Cualquier CSV con BOM (el "CSV UTF-8" de Excel) rompe la app en silencio

`main.ts` lee los encabezados para los desplegables **sin** `bom: true`:

```ts
// main.ts:53  — handler 'get-csv-headers'
const parser = fs.createReadStream(filePath).pipe(parse({ to_line: 1 }));
```

...mientras que el motor sí usa `bom: true` (`wienerEngine.ts:57`). Resultado medido:

- Lo que la UI ofrece en el desplegable: `"﻿food_id"`
- Lo que el motor conoce: `"food_id"`

El usuario selecciona la primera columna del desplegable, el motor no la encuentra, y `loadFoods` registra **`Loaded 0 primary foods into memory`**. Todas las filas salen así:

```json
{"_error":"ID 101 not found in database or recipes"}
```

Excel guarda con BOM por defecto al elegir "CSV UTF-8 (delimitado por comas)", que es exactamente lo que haría un nutricionista con acentos en los nombres de alimentos. El mismo defecto está en el handler `scan-unique-values` (`main.ts:64`).

### C3. Los alimentos no encontrados desaparecen sin dejar rastro al agrupar

Prueba controlada: 3 consumos, solo 1 con código válido.

- Sin agrupar: 2 filas con `_error` visible. ✔
- Agrupando por persona:

```json
[{"person_id":"P001","food_id":101,"_calculatedAmount":1,"protein":31}]
```

Una fila limpia, sin errores, sin advertencias. **800 g de alimento consumido se descartaron y no hay forma de saberlo.** El campo `_error` está en `factorFields`, así que solo sobrevive si el fallo ocurre en la *primera* fila del grupo.

En una encuesta poblacional con códigos desactualizados esto produce una **subestimación sistemática y silenciosa de la ingesta** — el peor tipo de error posible en esta herramienta. El motor web es aún peor: descarta las filas sin ni siquiera generar `_error` (`if (foodData)` en `main.tsx`).

---

## 🟠 Altos

### A1. La columna de cantidad se concatena como texto en lugar de sumarse

Salida real de la Prueba 1 de `verificacion.md`:

```json
"amount_grams": "30030015"   // debería ser 315
```

Y con `ejemingre.csv`:

```json
"cantidad": "606020201270120670300152503012930015150201212615101001515801220920150701..."
```

**Causa:** en `processCalculations`, las filas del CSV de entrada se parsean **sin** `cast`, así que todos sus valores son cadenas. La semilla del grupo copia cualquier cadena:

```ts
// wienerEngine.ts:292
if (factorFields.has(k) || typeof v === 'string') baseObj[k] = v;
```

y luego acumula sin coerción:

```ts
// wienerEngine.ts:309
currentGroup[key] = (currentGroup[key] || 0) + numVal;   // "300" + 15 → "30015"
```

`amountCol` no está en `factorFields`, así que entra en el bucle. La columna aparece corrupta en la vista previa y en los exports a CSV y Excel. No contamina los nutrientes (esos ya son números), pero sí es visible para el usuario final y destruye la confianza en la salida.

### A2. Una fórmula mal escrita devuelve una columna de ceros, sin error

```
Fórmula: proteina*4        (la columna real se llama "protein")
Resultado: x = 0
```

`evaluateFormula` atrapa el `ReferenceError` y devuelve `0` (`wienerEngine.ts:244-246`). Un tilde de más, una mayúscula distinta o un espacio, y el investigador obtiene una columna entera de ceros que parece un dato legítimo. En un motor de fórmulas libres, esto **tiene** que fallar de forma ruidosa.

### A3. El export a CSV y el export a Excel producen columnas distintas

`main.ts:86` toma los encabezados solo de la primera fila:

```ts
const headers = Object.keys(data[0]);
```

Si las filas tienen claves distintas (que es justo lo que ocurre cuando hay recetas, errores o alimentos con esquemas diferentes — el propio `App.tsx:368` ya lo compensa en la vista previa recorriendo 50 filas), **el CSV pierde columnas**. Verificado: con `[{a,b},{a,b,vitaC}]` el CSV exporta `a,b` y el Excel exporta `a,b,vitaC`. Dos archivos distintos desde el mismo botón de resultados.

### A4. La detección del tipo de tabla de recetas es una heurística frágil

```ts
// wienerEngine.ts:81
const isRecipeDict = ('recipe_id' in firstRow && 'ingredient_id' in firstRow) ||
                     ('id' in firstRow && 'cod_b' in firstRow);
```

`ejemreceta.csv` tiene columnas `id, orden, dia, cod_b, cantiprep`, donde `id` es **el identificador de la persona**, no de la receta. La heurística da positivo y el motor carga:

```
🐕 Woof! Loaded 1 recursive recipes into memory.
```

Una sola "receta" con ID `100532` (el sujeto) y 60+ ingredientes. Como ningún `codalim` de la entrada vale `100532`, **las recetas nunca se expanden**: el archivo se carga, no da error, y no hace absolutamente nada. `verificacion.md` presenta `trecetas.csv` y `ejemreceta.csv` como intercambiables ("o `ejemreceta.csv`") cuando se comportan de forma completamente distinta.

---

## 🟡 Medios

| # | Hallazgo | Detalle |
|---|---|---|
| M1 | **`nonEdibleCol` es código muerto** | Implementado en el motor (`wienerEngine.ts:163`) pero **no existe en `App.tsx` ni en el motor web**. La Guía lo anuncia como capacidad #5 ("Deducción de Porciones No Comestibles"). Es inalcanzable desde la interfaz. Además, si la tabla expresa el desecho como porcentaje (25) en vez de fracción (0.25), `Math.max(0, 1 - 25)` = 0 y **todos los nutrientes de ese alimento se vuelven cero**. |
| M2 | **Nombres de columna hardcodeados** | `factorFields` incluye literales `'name'`, `'descripcion'`, `'orden'`, `'dia'`, `'tipocomi'` (`wienerEngine.ts:171` y `:264`). Con una tabla internacional donde un nutriente se llame así, no se sumará. Contradice la promesa de "compatibilidad universal". |
| M3 | **No se puede agrupar por dos columnas** | `groupByCol` es un único `string`. En una encuesta de 2 días no se puede obtener "por sujeto **y** por día" — justo el caso de uso de `ejemingre.csv`. El promedio diario de `SESSION_RESUME.md` se calculó dividiendo a mano entre 2. |
| M4 | **Metadatos engañosos en la fila agrupada** | La fila resumida hereda `name`, `_id` y `boil_loss` del **primer** alimento del grupo. En la Prueba 1, la fila de P002 dice `name: "Raw Potato"` aunque agrega papa + aceite de oliva. |
| M5 | **El motor web parsea CSV con `split(',')`** | Sin manejo de comillas: cualquier nombre de alimento con coma (`"Arroz, blanco, cocido"`) desalinea toda la fila. También ignora BOM y comas decimales. |
| M6 | **El motor web no soporta recetas recursivas** | Solo hace el merge de tablas precalculadas. La descomposición por ingredientes (capacidad #3 de la Guía) no existe en navegador. |
| M7 | **El botón "Excel" de la web exporta un CSV** | `saveExcel: async (data) => window.wienerApi.saveCsv(data)` (`main.tsx`). Descarga `wiener_results.csv`. |
| M8 | **Sin validación de `inputScale`** | `parseFloat(e.target.value)` sin guarda: dejar el campo vacío da `NaN` y todos los nutrientes salen `NaN`. |

---

## 🔒 Seguridad

- **S1 — Ejecución de código arbitrario vía perfil `.json`.** `evaluateFormula` usa `new Function(...)` (`wienerEngine.ts:241`) dentro del **proceso principal de Electron**, con acceso completo a Node (`fs`, `child_process`). Un archivo de perfil compartido por un tercero con una "fórmula" maliciosa ejecuta código con los permisos del usuario. Dado que el plan es distribuir perfiles a docentes y estudiantes, es un riesgo concreto.
- **S2 — Dependencias sin soporte.** `electron@28.3.3` (rama fuera de soporte; la actual es 39.x, ya usada en `my-wiener-calc/`) y `xlsx@0.18.5`, la última publicada en el registro npm público y con avisos de seguridad conocidos posteriores. Conviene revisarlas antes de distribuir el instalador.

---

## 📄 Discrepancias en la documentación

- **`verificacion.md`, Prueba 1, P002:** dice `total_energy: 1648.5`. El motor calcula **1550.4**, y el motor tiene razón: `17×6 + 38×15.3 + 17×51 = 102 + 581.4 + 867 = 1550.4`. El valor esperado en el documento está desactualizado. (P001 = 1327.6 ✔ y `vit_c` = 36 ✔ coinciden.)
- **`SESSION_RESUME.md`:** `vitA_sum = 75 631.13`. Con los 7 alias de `verificacion.md` el motor da **75 658.93**; el valor del resumen viene de `test_engine.ts`, que omite el alias `VA (ER)` → `vitaA(ER)`.
- **El "99.5 % de coincidencia de Atwater" no valida el motor.** Comparar `4P+9G+4C` contra la columna `kcal` de la misma tabla solo demuestra que `tpaisa.csv` es internamente coherente; da el mismo 99.5 % aunque el escalado por porción esté mal. De hecho la versión web da 99.8 % con números completamente distintos. Para validar de verdad hace falta un caso de prueba con resultados calculados a mano (como la Prueba 1) y comparación contra FoodCalc original.

---

## Plan de acción

### Fase 1 — Bloqueantes antes de mostrar la herramienta a nadie

**1. Unificar los dos motores en uno solo.** *(resuelve C1, M5, M6, M7 de raíz)*
Es el arreglo estructural que hace innecesarios los demás parches duplicados. Mantener dos implementaciones garantiza que vuelvan a divergir.

- Extraer `wienerEngine.ts` a un módulo isomorfo `src/shared/engine.ts` que reciba **texto CSV** en vez de rutas de archivo (quitar la dependencia directa de `fs`).
- Usar `csv-parse/browser/esm/sync` (ya viene en el paquete) o `papaparse` para que el mismo parser corra en Node y en el navegador.
- `main.ts` lee el archivo con `fs` y le pasa el texto al motor; `main.tsx` le pasa el texto del `FileReader`.
- **Borrar** todo el bloque `runCalculations` de `main.tsx` (~200 líneas) y dejar solo el shim de E/S del navegador.
- Test de regresión: los mismos 3 archivos deben dar cifras idénticas en escritorio y en web.

**2. Decidir y exponer la política de colisión de códigos.** *(C1)*
Añadir en la pestaña 2 un selector: *"Si un código existe en ambas tablas: ① usar la tabla de alimentos (predeterminado) · ② usar la tabla de recetas"*. Al terminar la carga, mostrar el conteo: `⚠ 52 códigos de la tabla de recetas ya existían en la tabla de alimentos`. Nunca resolverlo en silencio.

**3. Añadir `bom: true` a los dos handlers de `main.ts`.** *(C2)*

```ts
// main.ts:53
parse({ to_line: 1, bom: true, trim: true })
// main.ts:64
parse({ columns: true, skip_empty_lines: true, bom: true, trim: true })
```

Complementar con una guarda defensiva en `loadFoods`: si `foodTable.size === 0`, lanzar `Error("No se cargó ningún alimento: revisa la columna ID seleccionada")` en vez de continuar.

**4. Reportar alimentos no encontrados.** *(C3)*
Cambiar la firma a `Promise<{ rows: any[]; notFound: { id: string; count: number }[] }>`, acumular los IDs fallidos antes de agrupar, y mostrar en la pestaña 4 un banner: *"⚠ 3 códigos no encontrados (999, 888, 1042) — 14 registros excluidos del total."* Ofrecer descargar la lista. El motor web debe dejar de descartar filas en silencio.

### Fase 2 — Corrección de resultados visibles

**5. Arreglar la concatenación de la columna de cantidad.** *(A1)*
Dos cambios en `wienerEngine.ts`:

```ts
// :292  — sembrar el grupo solo con lo que NO es numérico
if (factorFields.has(k) || parseSafeNumber(v) === null) baseObj[k] = v;

// :309  — coerción explícita al acumular
const prev = parseSafeNumber(currentGroup[key]) ?? 0;
currentGroup[key] = prev + numVal;
```

Y añadir `config.amountCol` al conjunto `factorFields` en ambos sitios (`:171` y `:264`), o exponerla como `_cantidadTotal` sumada correctamente si se quiere conservar el dato.

**6. Hacer que las fórmulas inválidas fallen de forma visible.** *(A2)*
Antes de evaluar, extraer los identificadores de la expresión y comprobar que existen en el contexto. Si falta alguno, devolver `null` y propagar un mensaje a la UI: *"Regla `x`: la variable `proteina` no existe. ¿Querías decir `protein`?"* (sugerencia por distancia de Levenshtein sobre los encabezados). Nunca devolver `0`.

**7. Unificar los encabezados del export.** *(A3)*

```ts
const headers = Array.from(new Set(data.flatMap(Object.keys)));
```

Aplicarlo en `save-csv` (`main.ts:86`) y en el `saveCsv` del navegador.

**8. Modo de recetas explícito.** *(A4)*
Sustituir la heurística por un selector en la pestaña 1 al cargar el tercer archivo: *"Esta tabla es: ① preparaciones precalculadas · ② diccionario de ingredientes"*, y en el modo ② permitir elegir manualmente las columnas `recipe_id`, `ingredient_id` y `cantidad`. Mostrar cuántas recetas y cuántos ingredientes se cargaron.

### Fase 3 — Coherencia y alcance

9. **Exponer `nonEdibleCol` en la pestaña 2** con una nota explícita sobre si el valor es fracción (0.25) o porcentaje (25), e implementarlo en el motor unificado. Si un factor sale > 1, avisar en vez de devolver cero. *(M1)*
10. **Eliminar los nombres de columna hardcodeados** de `factorFields`; derivarlos únicamente del mapeo del usuario, y añadir en la pestaña 2 una lista de "columnas descriptivas (no sumar)" que el usuario marque. *(M2)*
11. **Permitir agrupación por varias columnas** (`groupByCol: string[]`, clave compuesta `id|dia`). Desbloquea el análisis por sujeto-día de encuestas multi-día. *(M3)*
12. **Prefijar los metadatos heredados** en la fila agrupada (`_primer_alimento_name`) o suprimirlos, para que nadie los lea como si describieran el grupo. *(M4)*
13. **Validar `inputScale`**: rechazar `NaN`, `0` y negativos en el `onChange`. *(M8)*

### Fase 4 — Seguridad y mantenimiento

14. **Sustituir `new Function`** por un evaluador de expresiones acotado (`expr-eval`, o `mathjs` con `limitedEvaluate`), que solo permita números, los identificadores del contexto y los operadores aritméticos. Elimina la ejecución arbitraria desde perfiles `.json`. *(S1)*
15. **Actualizar dependencias**: migrar a Electron 39 (la carpeta `my-wiener-calc/` ya está en esa base) y mover `xlsx` a la distribución oficial de SheetJS. Ejecutar `npm audit` antes de publicar el instalador. *(S2)*
16. **Convertir `verificacion.md` en pruebas automatizadas.** `test_engine.ts` hoy solo comprueba que ciertos campos no sean `undefined`. Reemplazarlo por aserciones sobre los valores exactos de la Prueba 1 (calculables a mano) más un test que ejecute los dos motores sobre los mismos archivos y exija igualdad. Corregir de paso el valor esperado de P002 (1550.4) y el alias `VA (ER)` faltante.
17. **Retirar la afirmación del 99.5 % de Atwater** como evidencia de validación, y sustituirla por una comparación real contra la salida de FoodCalc original sobre un dataset común.

### Sugerencia de orden

Fase 1 completa antes de enviar el correo al docente — C1 y C3 en particular producirían números erróneos en manos de un revisor. Fase 2 antes de cualquier uso real con pacientes o datos de investigación. Fases 3 y 4 antes de anunciarla como herramienta pública.

---

## Lo que sí está bien

Para no perder la perspectiva: la aritmética del núcleo es correcta y varias decisiones son acertadas.

- El escalado por porción, los factores de retención por cocción y la agregación de nutrientes dan los valores esperados en la Prueba 1 (P001: `protein` 62, `fat` 7.2, `total_energy` 1327.6; P002: `vit_c` 36 tras aplicar 40 % de pérdida por hervido). ✔
- `parseSafeNumber` maneja bien la coma decimal latina — verificado: `"31,5"` × 2 porciones = 63. ✔
- El saneamiento de nombres de columna con paréntesis y espacios (`vitaA(UI)`, `Pro. g.`) funciona correctamente en las fórmulas. ✔
- Las fórmulas se recalculan **después** de agregar por grupo, que es lo correcto para expresiones no lineales (porcentajes, ratios). ✔
- La protección contra recetas circulares (`depth > 10`) está bien planteada. ✔
- El escalado proporcional de recetas por `recipeSum` es la interpretación correcta de un lote (con la salvedad de que no modela el rendimiento/pérdida de peso en la cocción — vale la pena documentarlo).
- El aislamiento del proceso principal vía `contextBridge` con una superficie de API mínima está bien hecho.
- La UI de 4 pestañas, los perfiles `.json` y el editor CSV integrado son buenas decisiones de producto para el público objetivo.

---

*Auditoría realizada sobre el commit `e403e88` con ejecución real del motor. Todos los valores citados son reproducibles con los archivos de `test/`.*

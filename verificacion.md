# Guía de Verificación Manual de WienerCalc

Estos son los valores que **debe** producir la aplicación. Todos están calculados a mano y comprobados por la suite automática (`npm test`), así que si la pantalla no coincide, hay un fallo real.

> Antes de verificar a mano puedes ejecutar `npm test`: corre 116 comprobaciones, incluida la de que la versión web y la de escritorio devuelven resultados **idénticos**.

---

## PRUEBA 1 — Caso básico (sin recetas)

### Archivos

- **Tabla de alimentos:** `test/foods.csv`
- **Cantidades consumidas:** `test/input.csv`
- **Recetas:** ninguna

### Configuración

**Pestaña 1 · Fuentes de datos**

1. Carga `foods.csv` en la primera celda y `input.csv` en la segunda.
2. Deja vacía la celda de recetas. *(Si te equivocaste de archivo, usa la **×** de la esquina superior derecha de la celda para quitarlo.)*
3. Bajo cada celda debe aparecer un resumen del tipo `3 filas · 7 columnas · delimitador «,»`.

**Pestaña 2 · Mapeo de campos**

| Campo | Valor |
|---|---|
| Columna ID (Tabla Alimentos) | `food_id` |
| Columna ID (Consumo Entrada) | `food_id` |
| Columna de Cantidad | `amount_grams` |
| Escala de Entrada | `0.01` |
| Columna de Método de Cocción | `prep_method` |
| Parte No Comestible | *(ninguna)* |
| Agrupar Resultados Por | `person_id` |
| Columnas Descriptivas | `name` |

**Pestaña 3 · Reglas y cocción**

- Regla matemática: `total_energy` = `17 * protein + 38 * fat + 17 * carbs`
- Regla de cocción: Método `boil` · Campo de reducción `boil_loss` · Nutriente objetivo `vit_c`

**Pestaña 4 · Calcular** → *Ejecutar Cálculo*

### Resultados esperados

Dos filas. El informe de la ejecución debe decir **«Sin advertencias: todos los registros se procesaron.»**

**P001**

| Campo | Valor | De dónde sale |
|---|---:|---|
| `_registros` | 1 | un solo consumo |
| `_cantidad_total` | 200 | 200 g |
| `_porcion` | 2 | 200 g × 0.01 |
| `protein` | 62 | 31 × 2 |
| `fat` | 7.2 | 3.6 × 2 |
| `carbs` | 0 | |
| `vit_c` | 0 | |
| `total_energy` | **1327.6** | 17·62 + 38·7.2 + 17·0 |
| `name` | Chicken Breast | constante en el grupo → conserva el nombre original |

**P002**

| Campo | Valor | De dónde sale |
|---|---:|---|
| `_registros` | 2 | papa + aceite |
| `_cantidad_total` | 315 | 300 + 15 g |
| `protein` | 6 | 2 × 3 |
| `fat` | 15.3 | (0.1 × 3) + (100 × 0.15) |
| `carbs` | 51 | 17 × 3 |
| `vit_c` | **36** | 20 × 3 = 60, menos el 40 % de `boil_loss` |
| `total_energy` | **1550.4** | 17·6 + 38·15.3 + 17·51 |
| `primer_name` | Raw Potato | el grupo mezcla papa y aceite, así que la columna se renombra a `primer_*` |

> **Corrección:** la edición anterior de esta guía daba `1648.5` como `total_energy` de P002. Ese valor estaba mal: 17·6 + 38·15.3 + 17·51 = 102 + 581.4 + 867 = **1550.4**. El motor siempre calculó bien; lo que estaba equivocado era el valor esperado del documento.

---

## PRUEBA 2 — Con tabla de recetas precalculadas

### Archivos

- **Tabla de alimentos:** `test/tpaisa.csv`
- **Cantidades consumidas:** `test/ejemingre.csv`
- **Tabla de recetas:** `test/trecetas.csv`

### Configuración

**Pestaña 1**

1. Carga los tres archivos.
2. **Modo de la tabla de recetas:** `Preparaciones precalculadas (fusionar)`.
3. **Si un código existe en AMBAS tablas:** elige una de las dos opciones. **Cambia el resultado**, por eso hay que decidirlo a conciencia.

**Pestaña 2**

| Campo | Valor |
|---|---|
| Columna ID (Tabla Alimentos) | `codalim` |
| Columna ID (Consumo Entrada) | `codalim` |
| Columna de Cantidad | `cantidad` |
| Escala de Entrada | `0.01` |
| Agrupar Resultados Por | `id` |
| Columnas Descriptivas | `orden`, `dia`, `tipocomi` |

**Alias de columnas** (7 pares):

| Col. Recetas | Col. Alimentos |
|---|---|
| `cod_b` | `codalim` |
| `Kcal` | `kcal` |
| `Pro. g.` | `proteina_g` |
| `GT. g.` | `grasatot_g` |
| `CHO. g.` | `Carboh_g` |
| `VA (UI)` | `vitaA(UI)` |
| `VA (ER)` | `vitaA(ER)` |

**Pestaña 3**

- `cal_from_fat` = `grasatot_g * 9`
- `vitA_sum` = `vitaA(UI) + vitaA(ER)`

### Resultados esperados (sujeto `100532`)

En ambos casos: `_registros` = **127**, `_cantidad_total` = **8207**, códigos no encontrados = **0**, y un aviso ámbar de **52 colisiones de códigos**.

| Campo | Gana la tabla de **alimentos** | Gana la tabla de **recetas** |
|---|---:|---:|
| `kcal` | 8 619.48 | 7 670.08 |
| `proteina_g` | 237.429 | 266.819 |
| `grasatot_g` | 230.299 | 103.289 |
| `Carboh_g` | 1 395.84 | 1 407.90 |
| `cal_from_fat` | 2 072.691 | 929.601 |
| `vitA_sum` | 75 910.33 | 75 658.93 |
| `vitaC` | 415.18 | 414.98 |

> **Esto es lo importante de esta prueba.** Las dos columnas son correctas para su respectiva política, y difieren en un 123 % en grasa total. En la versión anterior de WienerCalc esa elección se hacía **en silencio y de forma distinta en la web que en el escritorio**: por eso aparecían dos números («7670.08 o ~8619») como si ambos fueran válidos. Ahora la eliges tú y la app te dice cuántos códigos colisionaron.

**Comprobación cruzada:** `cal_from_fat` debe ser exactamente `grasatot_g × 9`, y `vitA_sum` exactamente `vitaA(UI) + vitaA(ER)`.

---

## PRUEBA 3 — Sin recetas, agrupando por sujeto y día

Misma configuración de la Prueba 2, pero **sin cargar** `trecetas.csv` y con **Agrupar Resultados Por** = `id` **y** `dia` (se marcan las dos).

### Resultados esperados

Dos filas:

| día | `kcal` | `proteina_g` | `_registros` |
|---:|---:|---:|---:|
| 1 | 4 902.07 | 128.415 | 71 |
| 2 | 3 717.41 | 109.014 | 56 |

La suma de ambos días (8 619.48 kcal) debe coincidir exactamente con el total de la Prueba 2 con la política «gana la tabla de alimentos». El promedio diario del sujeto es **4 309.7 kcal/día**.

---

## PRUEBA 4 — Que los avisos aparezcan de verdad

Estas comprobaciones verifican que la aplicación **no calla los problemas**, que era el defecto más peligroso de la versión anterior.

### 4.1 Códigos inexistentes

Edita `input.csv` desde el terminal integrado (botón `OPEN TERMINAL`) y añade una fila con un código que no exista, por ejemplo `P003,999,500,raw`. Ejecuta el cálculo.

**Debe aparecer:** un panel ámbar **«Códigos que no existen en la tabla de alimentos (1)»** con el código `999`, el número de registros y la cantidad total descartada. El grupo `P003` no aparece en los resultados.

### 4.2 Fórmula mal escrita

En la pestaña 3, escribe una regla `x` = `proteina * 4` sobre `foods.csv` (la columna real se llama `protein`).

**Debe aparecer:** el campo de la fórmula se pone rojo mientras escribes, con el mensaje *«Variable no encontrada: «proteina» (¿querías decir «protein»?)»*. Si ejecutas igualmente, la columna `x` sale **vacía**, nunca en `0`.

### 4.3 CSV exportado por Excel como «CSV UTF-8»

Abre `foods.csv` en Excel y vuelve a guardarlo como **CSV UTF-8 (delimitado por comas)**. Cárgalo y ejecuta.

**Debe funcionar igual.** (En la versión anterior el BOM hacía que se cargaran 0 alimentos y todas las filas salieran con error.)

### 4.4 CSV con punto y coma

Guarda `foods.csv` desde un Excel en español (separador `;`, decimal `,`). Cárgalo.

**Debe funcionar igual**, y bajo la celda del archivo debe leerse `delimitador «;»`.

### 4.5 Quitar un archivo

Con los tres archivos cargados, pulsa la **×** de la celda de recetas.

**Debe:** desaparecer el archivo, ocultarse el bloque de modo de receta y el de alias, borrarse los alias definidos y limpiarse los resultados anteriores (ya no corresponden a la configuración actual).

---

## Registro de resultados

| Prueba | ¿Coincide? | Observaciones |
|---|---|---|
| 1 — Caso básico | | |
| 2 — Con recetas (gana alimentos) | | |
| 2 — Con recetas (gana recetas) | | |
| 3 — Sujeto + día | | |
| 4.1 — Códigos inexistentes | | |
| 4.2 — Fórmula mal escrita | | |
| 4.3 — CSV UTF-8 con BOM | | |
| 4.4 — CSV con punto y coma | | |
| 4.5 — Quitar archivo | | |

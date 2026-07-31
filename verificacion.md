# 📋 Guía de Verificación Manual de WienerCalc

Esta guía detalla paso a paso las dos pruebas de cálculo manuales para ejecutar en la aplicación WienerCalc (ya sea mediante Electron con `npm run dev` o abriendo la app empaquetada).

---

## 🧪 PRUEBA 1: Caso de Uso Normal (Sin Recetas)

### Archivos a Utilizar
Ubicados en la carpeta `test` de tu proyecto:
- **Tabla de Alimentos:** `C:\Users\Asus\Desktop\💻 Development Projects\WienerCalc\test\foods.csv`
- **Cantidades Consumidas:** `C:\Users\Asus\Desktop\💻 Development Projects\WienerCalc\test\input.csv`

---

### Paso a Paso en la Interfaz

#### Pestaña 1: Fuentes de Datos
1. Haz clic en la caja **"Tabla de Alimentos (Nutrientes)"** y selecciona `foods.csv`.
2. Haz clic en la caja **"Cantidades Consumidas (Entrada)"** y selecciona `input.csv`.
3. Deja vacía la caja de Recetas.

#### Pestaña 2: Mapeo de Campos
1. **Columna ID (Tabla Alimentos):** Selecciona `food_id`
2. **Columna ID (Consumo Entrada):** Selecciona `food_id`
3. **Nombre de Columna de Cantidad:** Selecciona `amount_grams`
4. **Escala de Entrada (Multiplicador):** Escribe `0.01`
5. **Columna de Método de Cocción:** Selecciona `prep_method`
6. **Agrupar Resultados Por:** Selecciona `person_id`

#### Pestaña 3: Reglas y Cocción
1. En **Reglas Matemáticas**, haz clic en **"Añadir Regla"**:
   - **Nuevo Nombre de Campo:** `total_energy`
   - **Fórmula (Expresión):** `17 * protein + 38 * fat + 17 * carbs`
2. En **Reducciones por Cocción**, haz clic en **"Añadir Regla de Cocción"**:
   - **Método:** `boil`
   - **Campo de Reducción:** `boil_loss`
   - **Nutrientes Objetivo:** Marca la casilla `vit_c`

#### Pestaña 4: Calcular
1. Haz clic en **"Ejecutar Cálculo"** (Run Calculation).
2. Observa la tabla de vista previa de resultados.

---

### 🎯 Resultados Esperados a Verificar (Prueba 1)
Debes visualizar 2 filas agrupadas por persona:
- **`P001`**:
  - `protein`: `62` (31g * 2 porciones de 100g)
  - `fat`: `7.2`
  - `total_energy`: `1327.6`
- **`P002`**:
  - `protein`: `6`
  - `fat`: `15.3`
  - `vit_c`: `36` *(300g de papa hervida = 60mg orig., reducida un 40% por boil_loss a 36mg)*
  - `total_energy`: `1648.5`

---

## 🧪 PRUEBA 2: Caso de Uso Avanzado con Tabla de Recetas (`tpaisa.csv`)

### Archivos a Utilizar
- **Tabla de Alimentos:** `C:\Users\Asus\Desktop\💻 Development Projects\WienerCalc\test\tpaisa.csv`
- **Cantidades Consumidas:** `C:\Users\Asus\Desktop\💻 Development Projects\WienerCalc\test\ejemingre.csv`
- **Tabla de Recetas / Alimentos Secundarios:** `C:\Users\Asus\Desktop\💻 Development Projects\WienerCalc\test\trecetas.csv` (o `ejemreceta.csv`)

---

### Paso a Paso en la Interfaz

#### Pestaña 1: Fuentes de Datos
1. Haz clic en **"Tabla de Alimentos (Nutrientes)"** y selecciona `tpaisa.csv`.
2. Haz clic en **"Cantidades Consumidas (Entrada)"** y selecciona `ejemingre.csv`.
3. Haz clic en **"Tabla de Recetas"** y selecciona `trecetas.csv`.

#### Pestaña 2: Mapeo de Campos
1. **Columna ID (Tabla Alimentos):** Selecciona `codalim`
2. **Columna ID (Consumo Entrada):** Selecciona `codalim`
3. **Nombre de Columna de Cantidad:** Selecciona `cantidad`
4. **Escala de Entrada (Multiplicador):** Escribe `0.01`
5. **Agrupar Resultados Por:** Selecciona `id`

6. En **Alias de Columnas (Unir Recetas y Alimentos)**, haz clic en **"Añadir Alias"** y agrega exactamente estos 7 pares:
   - **Col. Recetas:** `cod_b` = **Col. Alimentos:** `codalim`
   - **Col. Recetas:** `Kcal` = **Col. Alimentos:** `kcal`
   - **Col. Recetas:** `Pro. g.` = **Col. Alimentos:** `proteina_g`
   - **Col. Recetas:** `GT. g.` = **Col. Alimentos:** `grasatot_g`
   - **Col. Recetas:** `CHO. g.` = **Col. Alimentos:** `Carboh_g`
   - **Col. Recetas:** `VA (UI)` = **Col. Alimentos:** `vitaA(UI)`
   - **Col. Recetas:** `VA (ER)` = **Col. Alimentos:** `vitaA(ER)`

#### Pestaña 3: Reglas y Cocción
1. En **Reglas Matemáticas**, añade exactamente estas 2 reglas:
   - **Regla 1:** Campo = `cal_from_fat` | Fórmula = `grasatot_g * 9`
   - **Regla 2:** Campo = `vitA_sum` | Fórmula = `vitaA(UI) + vitaA(ER)`

#### Pestaña 4: Calcular
1. Haz clic en **"Ejecutar Cálculo"**.
2. Observa la fila agrupada resultante.

---

### 🎯 Resultados Esperados a Verificar (Prueba 2)
Para el sujeto `id = 100532`:
- `kcal`: `7670.08` (o ~8619 si incluye alimentos de recetas combinadas)
- `proteina_g`: `266.82` (o ~237.4)
- `grasatot_g`: `103.29` (o ~230.3)
- `cal_from_fat`: `929.60` (o `grasatot_g * 9`)
- `vitA_sum`: `75631.13` (o `vitaA(UI) + vitaA(ER)`)


---

## 📝 Registro de Resultados
Por favor ejecuta las dos pruebas en la app y me confirmas los valores que obtuviste en pantalla para darte el Visto Bueno final.

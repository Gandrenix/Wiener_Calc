# 🥗 Guía Oficial de Usuario: WienerCalc🐾
### *El motor universal e ilimitado para el análisis nutricional y evaluación de la ingesta*

Bienvenido a la guía completa de **WienerCalc🐾**, el software profesional desarrollado por **WienerHoundStudios** para nutricionistas, epidemiólogos, investigadores, clínicas, universidades y profesionales de la salud. 

WienerCalc🐾 traduce y moderniza la potencia del histórico algoritmo científico *FoodCalc* en una interfaz intuitiva y veloz. Está diseñado para procesar desde pequeñas consultas nutricionales hasta masivas encuestas de salud poblacional con miles de pacientes.

---

## 📌 Índice de Contenidos
1. [Introducción y Filosofía del Software](#1-introducción-y-filosofía-del-software)
2. [Alcance Real y Capacidades del Sistema](#2-alcance-real-y-capacidades-del-sistema)
3. [Los 3 Archivos de Datos (Flexibilidad Total de Formato)](#3-los-3-archivos-de-datos-flexibilidad-total-de-formato)
4. [Guía Paso a Paso por Pestañas](#4-guía-paso-a-paso-por-pestañas)
   - [Pestaña 1: Fuentes de Datos (Cargar CSVs)](#pestaña-1-fuentes-de-datos-cargar-csvs)
   - [Pestaña 2: Mapeo de Campos, Agrupación y Alias](#pestaña-2-mapeo-de-campos-agrupación-y-alias)
   - [Pestaña 3: Reglas Matemáticas e Impacto de Cocción](#pestaña-3-reglas-matemáticas-e-impacto-de-cocción)
   - [Pestaña 4: Calcular, Vista Previa y Exportación](#pestaña-4-calcular-vista-previa-y-exportación)
5. [Gestión de Perfiles Reutilizables (.json)](#5-gestión-de-perfiles-reutilizables-json)
6. [Editor de CSV / Terminal Integrado](#6-editor-de-csv--terminal-integrado)
7. [Preguntas Frecuentes (FAQ) y Casos Prácticos](#7-preguntas-frecuentes-faq-y-casos-prácticos)

---

## 1. Introducción y Filosofía del Software

**WienerCalc🐾** es una plataforma de procesamiento nutricional desarrollada por **WienerHoundStudios**, diseñada para ofrecer una **arquitectura abierta y libre de restricciones**.

A diferencia de los programas tradicionales que encierran al usuario en bases de datos propietarias o fórmulas rígidas, WienerCalc🐾 se fundamenta en la **autonomía de los datos**:
- **Sin bloqueos de formato:** Trabaja directamente con tus propios archivos CSV de cualquier fuente o país.
- **Sin límites de columnas:** Soporta esquemas nutricionales de cualquier extensión o nivel de detalle.
- **Fórmulas dinámicas:** Permite definir reglas matemáticas personalizadas sin modificar el núcleo de la aplicación.


---

## 2. Alcance Real y Capacidades del Sistema

WienerCalc🐾 es un procesador nutricional de alcance universal diseñado para adaptarse a cualquier flujo de trabajo:


### 🌐 1. Compatibilidad Universal con Cualquier Tabla Nutricional
Funciona con cualquier tabla nacional o internacional existente (USDA, REDCA, TCAC, EuroFIR, Souci-Fachmann-Kraut, INCAP, LATINFOODS, `tpaisa.csv`, o tablas personalizadas).
- **Nutrientes ilimitados:** Procesa simultáneamente calorías, macronutrientes, micronutrientes (vitaminas y minerales), ácidos grasos (saturados, mono y poliinsaturados), aminoácidos, fracciones de fibra (cruda, dietética, soluble, insoluble), cenizas, contenido de agua, índice glucémico, carga glucémica, etc.

### 🧮 2. Motor Matemático de Fórmulas Personalizadas Ilimitado
Te permite escribir **cualquier fórmula matemática** que requiera tu investigación o consulta médica usando cualquier combinación de columnas y unidades:
- Cálculo de Energía en Kilocalorías ($\text{kcal}$) o Kilojulios ($\text{kJ}$).
- Porcentajes de distribución de macronutrientes (% de calorías provenientes de grasas, proteínas o carbohidratos).
- Conversiones compuestas de Vitamina A (Retinol, Betacarotenos, UI, ER, RAE).
- Relaciones sodio/potasio, ratios de ácidos grasos (Omega-3/Omega-6), densidad de nutrientes por 1000 kcal, puntajes de calidad proteica, etc.

### 🍲 3. Descomposición y Escalado de Recetas Complejas
Maneja alimentos preparados y recetas compuestas de dos formas:
- **Platos y alimentos fusionados:** Une tablas secundarias de preparaciones pre-calculadas (`trecetas.csv`).
- **Descomposición por ingredientes:** Escala lotes enteros de recetas (`ejemreceta.csv`) recalculando proporcionalmente cada ingrediente bruto según la cantidad consumida.

### 🍳 4. Factores de Retención y Pérdidas por Cocción
Aplica porcentajes reales de retención/pérdida nutricional según el método de preparación (hervido, frito, horneado, asado, al vapor, microondas) aplicados a cualquier nutriente sensible (Vitamina C, Vitaminas del complejo B, potasio, etc.).

### 🍌 5. Deducción de Porciones No Comestibles
Soporta factores de desecho o parte no comestible (cáscaras, semillas, huesos, piel), calculando automáticamente el peso neto comestible real ingerido.

### 📊 6. Agrupación y Agregación Multinivel
Agrupa y suma los resultados automáticamente por:
- Paciente / Sujeto de estudio (`id` / `person_id`)
- Día de encuesta o seguimiento (`dia`)
- Tipo de comida (`desayuno`, `almuerzo`, `cena`, `snack`)
- Grupo poblacional, cohorte o municipio.

---

## 3. Los 3 Archivos de Datos (Flexibilidad Total de Formato)

WienerCalc🐾 utiliza archivos **CSV** (texto separado por comas o punto y coma, el estándar universal compatible con Excel):

### 🥦 1. Tabla de Alimentos (Nutrientes) — *Obligatorio*
Tu base de datos nutricional de referencia con aportes por **100 gramos**. Puede contener desde 3 columnas hasta más de 100 columnas de nutrientes.

### 📝 2. Cantidades Consumidas (Entrada / Ingesta) — *Obligatorio*
El registro o encuesta alimentaria con lo consumido por los usuarios (incluye códigos de alimentos, cantidades consumidas y opcionalmente métodos de cocción o momento del día).

### 🍲 3. Diccionario o Tabla de Recetas — *Opcional*
La lista de recetas compuestas o tabla de preparaciones secundarias que deseas integrar con la tabla principal.

---

## 4. Guía Paso a Paso por Pestañas

WienerCalc🐾 organiza todo el flujo de trabajo en **4 Pestañas secuenciales**:

```mermaid
graph LR
    A["1. Fuentes de Datos"] --> B["2. Mapeo de Campos"]
    B --> C["3. Reglas y Cocción"]
    C --> D["4. Calcular y Exportar"]
```

---

### Pestaña 1: Fuentes de Datos (Cargar CSVs)

1. **Tabla de Alimentos (Nutrientes):** Haz clic en la primera caja morada para abrir tu explorador de archivos y seleccionar tu base de datos nutricional (ej. `tpaisa.csv` o `foods.csv`).
2. **Cantidades Consumidas (Entrada):** Haz clic en la segunda caja para cargar la encuesta o diario de consumo (ej. `ejemingre.csv` u `input.csv`).
3. **Tabla de Recetas (Opcional):** Si tu estudio incluye preparaciones complejas, haz clic en la tercera caja para seleccionarla (ej. `trecetas.csv` o `ejemreceta.csv`).

---

### Pestaña 2: Mapeo de Campos, Agrupación y Alias

En esta pestaña defines la estructura de tus archivos:

1. **Columna ID (Tabla Alimentos):** Selecciona el encabezado que identifica el código de alimento (ej. `codalim` o `food_id`).
2. **Columna ID (Consumo Entrada):** Selecciona el código del alimento consumido en la tabla de ingesta (ej. `codalim` o `food_id`).
3. **Nombre de Columna de Cantidad:** Selecciona la columna de peso o cantidad (ej. `cantidad` o `amount_grams`).
4. **Escala de Entrada (Multiplicador):** 
   - Escribe **`0.01`** si tus datos de consumo están en **gramos** (convierte los gramos a porciones de 100g de la tabla nutricional: $250\,\text{g} \times 0.01 = 2.5\,\text{porciones}$).
   - Escribe **`1.0`** si tus datos de consumo ya están expresados directamente en porciones de 100g.
5. **Columna de Método de Cocción (Opcional):** Selecciona la columna que indica el tipo de cocción (ej. `tipocomi` o `prep_method`).
6. **Agrupar Resultados Por (Opcional):** Selecciona la columna del paciente (ej. `id` o `person_id`) para que WienerCalc🐾 sume todos los consumos del sujeto y entregue **una fila resumida por persona**.

#### 🔗 Alias de Columnas (Fusión Inteligente de Tablas)
Si tu tabla de recetas o segunda base de datos utiliza nombres de columna distintos a la tabla principal, usa el botón **"+ Añadir Alias"** para emparejarlas:
- `cod_b` $\rightarrow$ `codalim` *(Une los códigos de recetas con los de alimentos)*
- `Kcal` $\rightarrow$ `kcal`
- `Pro. g.` $\rightarrow$ `proteina_g`
- `GT. g.` $\rightarrow$ `grasatot_g`
- `CHO. g.` $\rightarrow$ `Carboh_g`
- `VA (UI)` $\rightarrow$ `vitaA(UI)`
- `VA (ER)` $\rightarrow$ `vitaA(ER)`

---

### Pestaña 3: Reglas Matemáticas e Impacto de Cocción

Aquí puedes añadir todo el poder analítico a tu estudio:

#### 🧮 1. Reglas Matemáticas Personalizadas (Fórmulas Ilimitadas)
Haz clic en **"+ Añadir Regla"** para definir cualquier ecuación. Puedes crear cuantas reglas desees:
- **Calorías de Grasas:**  
  Nombre: `cal_from_fat` | Fórmula: `grasatot_g * 9`
- **Suma Total de Vitamina A:**  
  Nombre: `vitA_sum` | Fórmula: `vitaA(UI) + vitaA(ER)`
- **Energía Total en Kilojulios (kJ):**  
  Nombre: `energia_kJ` | Fórmula: `17 * proteina_g + 38 * grasatot_g + 17 * Carboh_g`
- **Porcentaje de Energía de Proteínas:**  
  Nombre: `pct_proteina` | Fórmula: `(proteina_g * 4 / kcal) * 100`

#### 🍳 2. Reducciones y Pérdidas por Cocción
Haz clic en **"+ Añadir Regla de Cocción"** para descontar pérdidas de nutrientes sensibles:
- **Método:** `boil` (hervido) o `fry` (frito)
- **Campo de Reducción:** `boil_loss` (ej. 0.40 representa un 40% de pérdida)
- **Nutrientes Objetivo:** Marca los nutrientes afectados (ej. `vitaC`, `vitaB1`, `potasio_mg`).

---

### Pestaña 4: Calcular, Vista Previa y Exportación

1. Haz clic en el botón **"Ejecutar Cálculo"** (Run Calculation).
2. El motor procesará instantáneamente la combinación de tablas, recetas, agrupaciones por paciente y reglas matemáticas.
3. Revisa la **Vista Previa de Resultados** en pantalla (con desplazamiento horizontal para inspeccionar todas tus columnas).
4. Exporta tu trabajo:
   - 📊 **Exportar a Excel (.xlsx):** Genera un libro estructurado, con encabezados claros y formato limpio.
   - 📄 **Exportar a CSV:** Descarga un archivo listo para importar en programas estadísticos como SPSS, R, Stata, SAS o Python.

---

## 5. Gestión de Perfiles Reutilizables (.json)

Para investigaciones largas o clínicas que atienden pacientes a diario, no necesitas volver a configurar columnas ni escribir fórmulas cada vez:

- 💾 **Guardar Perfil (Save Config):** En la barra lateral, haz clic en este botón para descargar un archivo `.json` con toda tu configuración (mapeos, alias, reglas y factores de cocción).
- 📁 **Cargar Perfil (Load Config):** Al abrir WienerCalc🐾 en cualquier momento, haz clic en Cargar Perfil y selecciona tu archivo `.json`. Toda tu configuración se restaurará en un milisegundo.

---

## 6. Editor de CSV / Terminal Integrado

WienerCalc🐾 incluye un **Editor e Inspector de CSV en vivo** accesible desde cualquier pestaña:

1. Haz clic en el botón **`OPEN TERMINAL`** ubicado en la esquina superior derecha.
2. Se desplegará una consola con pestañas para explorar directamente los archivos que cargaste (`foods.csv`, `input.csv`, `recipes.csv`).
3. Te permite:
   - Verificar encabezados y valores en tiempo real.
   - Buscar términos (`Ctrl + F`) o reemplazar texto (`Ctrl + H`).
   - Guardar ediciones directo en el archivo (`Ctrl + S`).

---

## 7. Preguntas Frecuentes (FAQ) y Casos Prácticos

### ❓ ¿WienerCalc🐾 viene con nutrientes bloqueados o rígidos?
**No.** WienerCalc🐾 es 100% dinámico. Si tu tabla de alimentos tiene 5 nutrientes o 120 nutrientes (incluyendo antioxidantes, polifenoles o minerales traza), el motor procesará y calculará absolutamente todos.

### ❓ ¿Por qué la Escala de Entrada recomendada para gramos es `0.01`?
Las bases de datos nutricionales reportan los nutrientes contenidos en **100 gramos** de alimento.  
Si un paciente consume **150 gramos** de un alimento:
$$\text{Factor de Porción} = 150\,\text{g} \times 0.01 = 1.5\,\text{porciones}$$
El motor multiplicará los nutrientes por $1.5$. Si tus registros están en kilogramos, la escala sería `10`. Si están en porciones de 100g directas, la escala es `1.0`.

### ❓ ¿Cómo calcular el aporte energético en Kilocalorías vs Kilojulios?
- **Para Kilocalorías ($\text{kcal}$):**  
  Usas los factores de Atwater: $4 \times \text{proteínas} + 9 \times \text{grasas} + 4 \times \text{carbohidratos}$.
- **Para Kilojulios ($\text{kJ}$):**  
  Usas los factores internacionales ($1\,\text{kcal} = 4.184\,\text{kJ}$): $17 \times \text{proteínas} + 38 \times \text{grasas} + 17 \times \text{carbohidratos}$.

---

### 🐾 Desarrollado por WienerHoundStudios
*WienerCalc🐾 — La herramienta universal y precisa para potenciar la investigación y el análisis nutricional.*

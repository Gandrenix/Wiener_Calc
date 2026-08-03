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
Agrupa y suma los resultados por **una o varias** columnas a la vez:
- Paciente / Sujeto de estudio (`id` / `person_id`)
- Día de encuesta o seguimiento (`dia`)
- Tipo de comida (`desayuno`, `almuerzo`, `cena`, `snack`)
- Grupo poblacional, cohorte o municipio.
- O combinaciones: **sujeto + día**, **sujeto + tiempo de comida**, etc.

### 🔍 7. Trazabilidad: nada se descarta en silencio
Cada ejecución produce un **informe** con los avisos, las estadísticas y la lista de códigos que no se encontraron. Si un registro no entró en los totales, sabrás cuál, por qué y cuánta cantidad representaba. El informe se puede exportar en `.txt` para archivarlo junto a los resultados.

### 🖨️ 8. Exportación Profesional y Compatible con Cualquier Software Estadístico
Los resultados salen listos tanto para presentar como para analizar en masa:
- **Excel (.xlsx) con formato real:** encabezado en color con texto en negrita, bordes, filas alternadas ("cebra") para leer más fácil, ancho de columna ajustado al contenido, la fila de encabezado siempre visible al desplazarte (congelada) y un filtro automático en cada columna. Funciona igual en la aplicación de escritorio y en la versión web: los dos generan el mismo archivo `.xlsx`.
- **CSV listo para R, Python (pandas), SPSS, Stata o SAS:** sólo se entrecomilla lo que realmente lo necesita (así pesa menos con datasets grandes), y las columnas internas de WienerCalc🐾 (como `_registros` o `_cantidad_total`) se renombran automáticamente al exportar para que R no las confunda con nombres inválidos. También protege contra "CSV injection": si algún valor de texto empezara por `=`, `+`, `-` o `@`, se neutraliza para que Excel o Sheets nunca lo interpreten como una fórmula.

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

Al cargar cada archivo, debajo de la caja aparece un resumen de lo que WienerCalc🐾 detectó: **número de filas, número de columnas y el delimitador**. Conviene mirarlo: si el delimitador no es el que esperabas, probablemente el archivo se guardó con otra configuración regional.

#### ❌ Quitar un archivo
Cada caja con un archivo cargado muestra una **×** en su esquina superior derecha. Al pulsarla se retira el archivo, se limpian las selecciones que dependían de él (columnas, alias, reglas de cocción) y se descartan los resultados anteriores, porque ya no corresponden a la configuración actual. También puedes simplemente hacer clic en la caja para reemplazar el archivo por otro.

#### 🍲 Modo de la Tabla de Recetas
Al cargar el tercer archivo aparece un selector con tres opciones. **Elegir bien esto es importante:** dos archivos con la misma pinta pueden significar cosas distintas.

- **Preparaciones precalculadas (fusionar):** cada fila es un plato ya calculado (con sus nutrientes por 100 g) que se incorpora a la tabla de alimentos. Es el caso de `trecetas.csv`.
- **Diccionario de ingredientes (descomponer):** cada fila es **un ingrediente** de una receta. WienerCalc🐾 descompone la receta y escala cada ingrediente en proporción a la cantidad consumida. En este modo debes indicar las tres columnas: receta, ingrediente y cantidad.
- **Detectar automáticamente:** WienerCalc🐾 decide y **te dice qué eligió** en el informe de la ejecución. Si el archivo es ambiguo (por ejemplo, tiene una columna `id` que puede ser el sujeto o la receta), lo advierte en vez de asumir.

#### ⚠️ Si un código existe en AMBAS tablas
Cuando un mismo código aparece en la tabla de alimentos y en la de preparaciones, hay que decidir cuál manda. WienerCalc🐾 te lo pregunta y **te informa cuántos códigos colisionaron**.

Esta elección **cambia tus resultados**: en el dataset `tpaisa` + `trecetas` colisionan 52 códigos, y la diferencia en grasa total del sujeto de prueba es del 123 %. Ninguna de las dos opciones es «la correcta» en abstracto: depende de si en tu estudio esos códigos representan el alimento crudo o la preparación. Lo que sí es incorrecto es resolverlo sin saberlo.

---

### Pestaña 2: Mapeo de Campos, Agrupación y Alias

En esta pestaña defines la estructura de tus archivos:

1. **Columna ID (Tabla Alimentos):** Selecciona el encabezado que identifica el código de alimento (ej. `codalim` o `food_id`).
2. **Columna ID (Consumo Entrada):** Selecciona el código del alimento consumido en la tabla de ingesta (ej. `codalim` o `food_id`).
3. **Nombre de Columna de Cantidad:** Selecciona la columna de peso o cantidad (ej. `cantidad` o `amount_grams`).
4. **Escala de Entrada (Multiplicador):**
   - Escribe **`0.01`** si tus datos de consumo están en **gramos** (convierte los gramos a porciones de 100g de la tabla nutricional: $250\,\text{g} \times 0.01 = 2.5\,\text{porciones}$).
   - Escribe **`1.0`** si tus datos de consumo ya están expresados directamente en porciones de 100g.
   - El campo se pone rojo si el valor no es un número mayor que 0.
5. **Columna de Método de Cocción (Opcional):** Selecciona la columna que indica el tipo de cocción (ej. `tipocomi` o `prep_method`).
6. **Columna de Parte No Comestible (Opcional):** Selecciona la columna con el factor de desecho (cáscaras, huesos, semillas) e indica si está expresada como **fracción (0–1)** o como **porcentaje (0–100)**. Si el valor no encaja con la unidad elegida, WienerCalc🐾 lo avisa en vez de anular los nutrientes de ese alimento.
7. **Agrupar Resultados Por (Opcional):** Marca **una o varias** columnas. Con `id` obtienes una fila por sujeto; con `id` **y** `dia` obtienes una fila por sujeto y día, que es lo que necesitas en una encuesta de varios días.

#### 🏷️ Columnas Descriptivas (nunca se suman)
Marca aquí las columnas que son numéricas pero **no son nutrientes**: `orden`, `dia`, `tipocomi`, códigos, identificadores. Si no lo haces, al agrupar se sumarían como si fueran nutrientes. WienerCalc🐾 preselecciona automáticamente los nombres más habituales que encuentre en tus archivos, pero conviene revisarlo.

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
Haz clic en **"+ Añadir Regla"** para definir cualquier ecuación. Puedes crear cuantas reglas desees. El editor de fórmulas está pensado para que armar una ecuación compleja no se sienta como escribir código a ciegas:

- **Variables clicables:** debajo del campo de fórmula aparecen todas las columnas disponibles de tu archivo. Haz clic sobre cualquiera y se inserta **directamente en la posición del cursor** dentro de la fórmula (no hay que copiar y pegar).
- **Paréntesis con colores por nivel ("rainbow parens"):** cada nivel de anidamiento se pinta de un color distinto, y si un paréntesis quedó sin su pareja se marca en rojo al instante. Así puedes ver de un vistazo si `((a+b)*(c-d))/(e+f)` está bien armado sin tener que contar paréntesis a mano.
- **Autocompletado de paréntesis:** al escribir `(` se inserta automáticamente su `)` de cierre con el cursor en medio; si el cursor ya está justo antes de un `)` y vuelves a escribir `)`, el editor simplemente pasa por encima en vez de duplicarlo; y si borras con retroceso un paréntesis recién abierto que está vacío, se borra el par completo. Es el mismo comportamiento al que estás acostumbrado en editores de código.
- **Barra de operadores:** botones para insertar `( )`, `+`, `−`, `×`, `÷`, `^` y `,` directamente en el cursor, útil si no quieres escribirlos desde el teclado.
- **Vista previa en vivo:** debajo de la fórmula se muestra el resultado calculado **con la primera fila real** de tu tabla de alimentos ya cargada, para que confirmes que la ecuación da el número esperado antes de ejecutar el cálculo completo sobre todos tus datos.
- **Galería de plantillas:** un panel con fórmulas nutricionales comunes ya armadas (energía Atwater en kcal y kJ, % de energía por macronutriente, densidad de nutrientes por 1000 kcal, relación sodio/potasio) que puedes insertar con un clic y ajustar a los nombres de tus columnas.

Ejemplos de reglas típicas:
- **Calorías de Grasas:**  
  Nombre: `cal_from_fat` | Fórmula: `grasatot_g * 9`
- **Suma Total de Vitamina A:**  
  Nombre: `vitA_sum` | Fórmula: `vitaA(UI) + vitaA(ER)`
- **Energía Total en Kilojulios (kJ):**  
  Nombre: `energia_kJ` | Fórmula: `17 * proteina_g + 38 * grasatot_g + 17 * Carboh_g`
- **Porcentaje de Energía de Proteínas:**  
  Nombre: `pct_proteina` | Fórmula: `(proteina_g * 4 / kcal) * 100`

**Validación en vivo.** Mientras escribes, WienerCalc🐾 comprueba la fórmula contra las columnas de tus archivos. Si te equivocas en un nombre, el campo se pone rojo y te sugiere la columna correcta (*«Variable no encontrada: «proteina» (¿querías decir «protein»?)»*). Si el problema son los paréntesis, el mensaje lo dice de forma específica (*«Falta cerrar un paréntesis»*, *«Hay un paréntesis de cierre de más»*) en vez de un genérico "error de sintaxis". Una fórmula inválida **deja la celda vacía**, nunca en `0`: un cero silencioso se confunde con un dato real.

**Funciones disponibles:** `min`, `max`, `abs`, `round`, `floor`, `ceil`, `sqrt`, `pow`, `ln`, `log`, `exp`, `if`.
Operadores: `+ - * / % ^`, paréntesis anidados sin límite de profundidad, comparaciones (`< > <= >= == !=`) y `&&` / `||`.

Ejemplos con funciones:
- `round(proteina_g * 4 / kcal * 100, 1)` → porcentaje redondeado a un decimal.
- `if(kcal > 0, grasatot_g * 9 / kcal * 100, 0)` → % de energía de grasa, evitando dividir por cero.

#### 🍳 2. Reducciones y Pérdidas por Cocción
Haz clic en **"+ Añadir Regla de Cocción"** para descontar pérdidas de nutrientes sensibles:
- **Método:** `boil` (hervido) o `fry` (frito)
- **Campo de Reducción:** `boil_loss` (se acepta tanto `0.40` como `40` para un 40 % de pérdida)
- **Nutrientes Objetivo:** Marca los nutrientes afectados (ej. `vitaC`, `vitaB1`, `potasio_mg`).

---

### Pestaña 4: Calcular, Vista Previa y Exportación

1. Haz clic en el botón **"Ejecutar Cálculo"** (Run Calculation).
2. El motor procesará la combinación de tablas, recetas, agrupaciones y reglas matemáticas.
3. Revisa los cinco indicadores: **alimentos cargados, recetas, registros leídos, filas de resultado y colisiones de códigos**. Si alguno no cuadra con lo que esperas, ahí está el problema.
4. Lee el **Informe de la ejecución**. Es la parte más importante de esta pestaña:
   - 🔴 **Errores** — algo impidió calcular una regla.
   - 🟡 **Advertencias** — colisiones de códigos, filas mal formadas, cantidades vacías, columnas ausentes en una fórmula.
   - 🔵 **Información** — qué modo de receta se usó, cuántas preparaciones se incorporaron.
   Si todo fue bien, verás en verde *«Sin advertencias: todos los registros se procesaron.»*
5. Revisa el panel **«Códigos que no existen en la tabla de alimentos»**, si aparece. Lista cada código ausente, en cuántos registros aparecía y qué cantidad total quedó fuera del cálculo. **Esos registros no están sumados en tus totales.**
6. Revisa la **Vista Previa de Resultados** (con desplazamiento horizontal).
7. Exporta tu trabajo:
   - 📊 **Excel (.xlsx):** libro con encabezado en color y negrita, bordes, filas en cebra, columnas con ancho ajustado, fila de encabezado congelada y autofiltro — **igual en la aplicación de escritorio y en la versión web**, ambas generan el mismo archivo.
   - 📄 **CSV:** listo para SPSS, R, Stata, SAS o Python (pandas). Incluye BOM para que Excel respete los acentos al abrirlo directo, y sólo entrecomilla lo que realmente lo necesita.
   - 📝 **Informe (.txt):** la configuración usada, las estadísticas, todos los avisos y la lista completa de códigos no encontrados. **Guárdalo junto a tus resultados:** documenta cómo se obtuvieron.

> 💡 Si vas a abrir el CSV con `pandas` en Python, usa `pd.read_csv(archivo, encoding='utf-8-sig')` para que el BOM no se pegue al nombre de la primera columna. Con R (`read.csv` o `readr::read_csv`) no hace falta nada especial.

#### 📐 Columnas que añade WienerCalc🐾 a los resultados

| Columna en pantalla | Nombre al exportar a CSV | Significado |
|---|---|---|
| `_registros` | `registros` | Cuántos registros de consumo se agregaron en esa fila |
| `_cantidad_total` | `cantidad_total` | Suma de las cantidades consumidas, en las unidades de tu archivo |
| `_porcion` | `porcion` | Suma de las porciones aplicadas (cantidad × escala × parte comestible) |
| `primer_<col>` | `primer_<col>` (sin cambio) | Valor de una columna descriptiva que **no es constante** dentro del grupo. Se renombra así para dejar claro que describe al primer registro, no a todo el grupo |

Las columnas que empiezan con `_` sólo se ven así **dentro de la aplicación** (y en el .xlsx). Al exportar a **CSV** se les quita el guion bajo inicial, porque R convierte automáticamente cualquier cabecera que empiece por `_` en algo como `X_registros` al leerla con `read.csv()` — quitarlo de antemano evita esa sorpresa. Las columnas de nutrientes que vienen de tu propia tabla de alimentos nunca se tocan, aunque tengan paréntesis o puntos en el nombre (como `vitaA(UI)`), porque renombrarlas rompería la referencia a tu tabla de composición original.

---

## 5. Gestión de Perfiles Reutilizables (.json)

Para investigaciones largas o clínicas que atienden pacientes a diario, no necesitas volver a configurar columnas ni escribir fórmulas cada vez:

- 💾 **Guardar Perfil (Save Config):** En la barra lateral, haz clic en este botón para descargar un archivo `.json` con toda tu configuración (mapeos, alias, reglas, factores de cocción, agrupaciones, modo de receta y política de colisión).
- 📁 **Cargar Perfil (Load Config):** Al abrir WienerCalc🐾 en cualquier momento, haz clic en Cargar Perfil y selecciona tu archivo `.json`. Toda tu configuración se restaurará al instante.

Los perfiles guardados con versiones anteriores se **migran automáticamente** al cargarlos (por ejemplo, la antigua agrupación por una sola columna pasa a la nueva lista de columnas).

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

### ❓ ¿Qué formatos de CSV acepta?
Todos los habituales, y los detecta solos:
- **Delimitador:** coma, punto y coma, tabulador o barra vertical.
- **BOM UTF-8:** el «CSV UTF-8 (delimitado por comas)» que exporta Excel funciona sin más.
- **Campos entrecomillados:** un nombre como `"Arroz, blanco, cocido"` no rompe la fila.
- **Coma decimal:** `31,5` se interpreta como 31.5. También `1.234,56` y `1,234.56`.
- **Finales de línea:** Windows (CRLF), Unix (LF) o Mac clásico (CR).
- **Códigos:** se toleran los `101.0` que genera Excel al tratar los códigos como números, y los ceros a la izquierda se respetan.

Si dos columnas tienen el mismo nombre, la segunda se renombra (`a`, `a_2`) en vez de sobrescribir a la primera en silencio.

### ❓ ¿Qué pasa si un código de mi encuesta no está en la tabla de alimentos?
Ese registro **no se suma** (no hay datos con los que sumarlo) y WienerCalc🐾 te lo dice explícitamente: aparece en el panel «Códigos que no existen en la tabla de alimentos» con el número de registros y la cantidad total afectada, y queda registrado en el informe `.txt`. Nunca desaparece en silencio.

### ❓ ¿Los resultados de la versión web y la de escritorio son los mismos?
**Sí, exactamente los mismos.** Ambas usan el mismo motor de cálculo; lo único que cambia es cómo se leen los archivos (el explorador del sistema frente al selector del navegador). La suite de pruebas del proyecto verifica esta igualdad en cada cambio, e incluye ambos formatos de exportación (CSV y Excel).

Diferencias que sí existen, y sólo de entrada/salida:
- En la web los archivos viven en la memoria de la pestaña: si recargas la página, hay que volver a seleccionarlos, y las ediciones del terminal integrado no se escriben en tu disco.
- La exportación a Excel de la web usa la compresión propia del navegador (`CompressionStream`); si alguna vez usas un navegador muy antiguo que no la soporte, verás un aviso claro en vez de un archivo dañado.

### ❓ ¿Puedo abrir los resultados en R o Python (pandas) sin problemas?
Sí. El CSV exportado sigue el formato que ambos leen por defecto: separador de coma, comillas sólo donde hacen falta, y el punto siempre como separador decimal (nunca coma), sin importar el idioma de tu computadora. Dos detalles a tener en cuenta:
- Las columnas internas de WienerCalc🐾 (`_registros`, `_cantidad_total`, `_porcion`, `_codigo`, `_origen`) se exportan **sin el guion bajo inicial** (`registros`, `cantidad_total`...) para que R no las renombre solo.
- El archivo incluye BOM (para que Excel muestre bien los acentos al abrirlo directo). Con `pandas.read_csv()` usa `encoding='utf-8-sig'`; con R no necesitas hacer nada especial.

### ❓ ¿Cómo calcular el aporte energético en Kilocalorías vs Kilojulios?
- **Para Kilocalorías ($\text{kcal}$):**  
  Usas los factores de Atwater: $4 \times \text{proteínas} + 9 \times \text{grasas} + 4 \times \text{carbohidratos}$.
- **Para Kilojulios ($\text{kJ}$):**  
  Usas los factores internacionales ($1\,\text{kcal} = 4.184\,\text{kJ}$): $17 \times \text{proteínas} + 38 \times \text{grasas} + 17 \times \text{carbohidratos}$.

---

### 🐾 Desarrollado por WienerHoundStudios
*WienerCalc🐾 — La herramienta universal y precisa para potenciar la investigación y el análisis nutricional.*

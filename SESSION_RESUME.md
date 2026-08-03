# WienerCalc — Estado del proyecto

**Fecha de estado:** 3 de agosto de 2026
**Versión:** 2.1 (motor unificado)
**Workspace:** `C:\Users\Asus\Desktop\💻 Development Projects\WienerCalc`

---

## Qué es

Motor de cálculo nutricional que moderniza el histórico **FoodCalc** (C). Aplicación de escritorio (Electron + React + TypeScript) que también corre como aplicación web. Procesa encuestas alimentarias sobre cualquier tabla de composición de alimentos en CSV.

---

## Cambio principal de esta versión: un solo motor

Antes existían **dos** implementaciones del motor —una en `src/main/engine/wienerEngine.ts` y otra copiada a mano dentro de `src/renderer/src/main.tsx`— que habían divergido y devolvían **resultados distintos con los mismos archivos** (hasta 123 % de diferencia en grasa total).

Ahora el motor vive en `src/shared/` y es isomorfo: recibe **texto CSV**, no rutas. Electron lo alimenta con `fs`, el navegador con `FileReader`. La suite de pruebas incluye una comprobación de **paridad byte a byte** entre ambas rutas.

```
src/shared/
  csv.ts       Parser CSV (BOM, delimitadores, comillas, coma decimal latina)
  formula.ts   Evaluador de fórmulas seguro (sin `new Function`)
  engine.ts    Motor de cálculo — ÚNICA implementación
  api.ts       Contrato de `window.wienerApi`
  global.d.ts  Declaración global de tipos

src/main/main.ts              Proceso principal: E/S de archivos + IPC
src/main/engine/wienerEngine.ts  Envoltorio de compatibilidad (delega en shared)
src/preload/preload.ts        Puente contextBridge
src/renderer/src/main.tsx     Shim de E/S del navegador (sin lógica de cálculo)
src/renderer/src/App.tsx      Interfaz de 4 pestañas
```

---

## Correcciones aplicadas (auditoría del 3 de agosto)

### Críticas

1. **Paridad web/escritorio.** Motor unificado. Verificado con prueba automática de igualdad byte a byte.
2. **Colisión de códigos explícita.** Cuando un código está en la tabla de alimentos y en la de recetas, el usuario elige quién gana y la app reporta cuántos colisionaron (en el dataset de prueba: 52).
3. **BOM UTF-8.** El parser lo retira siempre. Antes el lector de cabeceras de la interfaz no lo hacía y el motor sí, así que con un «CSV UTF-8» de Excel se cargaban **0 alimentos** y todo fallaba en silencio.
4. **Códigos no encontrados.** Ya no desaparecen al agrupar: se listan con su número de registros y la cantidad total descartada.

### Altas

5. **Columna de cantidad.** Ya no se concatena como texto (`"30030015"`); se suma en `_cantidad_total`.
6. **Fórmulas.** Evaluador propio con gramática cerrada. Un typo produce un error con sugerencia («¿querías decir `protein`?»), no una columna de ceros. Elimina además la ejecución de código arbitrario desde un perfil `.json`.
7. **Exportación.** CSV y Excel usan la **unión** de columnas de todas las filas; antes el CSV perdía columnas que el Excel sí incluía.
8. **Modo de recetas explícito.** Fusión o diccionario de ingredientes, elegido por el usuario. La heurística anterior confundía el `id` del sujeto con el de la receta.

### Medias

9. `nonEdibleCol` expuesto en la interfaz, con selector fracción/porcentaje y aviso si la unidad no cuadra.
10. Sin nombres de columna cableados: las columnas que no se suman las marca el usuario (con sugerencias automáticas).
11. Agrupación por **varias** columnas (sujeto + día).
12. Los metadatos que varían dentro de un grupo se renombran a `primer_<col>`.
13. Detección automática de delimitador (`,` `;` tabulador `|`), comillas RFC 4180, CRLF y coma decimal latina.
14. Validación de la escala de entrada.
15. Botón **×** para quitar el archivo de cualquiera de las tres celdas.
16. Informe de la ejecución exportable a `.txt`.

---

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Aplicación en modo desarrollo (Electron + Vite) |
| `npm test` | 116 pruebas: motor, formatos, casos de uso y paridad web/escritorio |
| `npm run typecheck` | `tsc --noEmit` sobre todo el proyecto |
| `npm run build` | Compila main + preload + renderer |
| `npm run build:web` | Compila la versión web a `dist/` (Netlify) |
| `npm run build:win` | Instalador de Windows |

---

## Pendiente

- **Dependencias sin soporte:** `electron@28` (rama fuera de soporte; la actual es 39, ya usada en la carpeta `my-wiener-calc/`) y `xlsx@0.18.5`, con avisos de seguridad conocidos. Requiere `npm install` y probar el empaquetado.
- **Regenerar `Guia de uso/Guia.pdf`** desde `Guia.tex` tras las actualizaciones del texto.
- **Rendimiento:** 50 000 registros × 60 nutrientes tardan ~3 s. Suficiente para encuestas reales, mejorable si alguna vez se procesan cientos de miles de registros.
- **Validación externa:** comparar la salida contra el FoodCalc original sobre un dataset común. El «99,5 % de Atwater» que se citaba antes no valida el motor: sólo prueba que la tabla es internamente coherente (la versión web daba 99,8 % con números completamente distintos).
- La carpeta `my-wiener-calc/` sigue siendo un boilerplate sin lógica; decidir si se migra o se elimina.

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

import './styles.scss'

import { runEngine, EngineConfigError, type WienerConfig } from '../../shared/engine.ts'
import { parseCsvHeaders, parseCsvPreview, parseCsv, toCsv, uniqueValues } from '../../shared/csv.ts'
import { buildPrettyXlsx, type DeflateFn } from '../../shared/xlsxExport.ts'
import type { WienerApi } from '../../shared/api.ts'

/**
 * Shim de entrada/salida para el modo NAVEGADOR.
 *
 * IMPORTANTE: aquí ya NO hay un segundo motor de cálculo. Antes este archivo
 * contenía ~200 líneas con una copia a mano del motor que había divergido de
 * la de Electron y devolvía resultados distintos con los mismos archivos
 * (hasta un 123 % de diferencia en grasa total). Ahora ambos modos llaman
 * exactamente al mismo `runEngine` de `src/shared/engine.ts`; lo único que
 * cambia es cómo se leen y escriben los archivos.
 */

interface CachedFile {
  name: string
  content: string
}

const fileCache = new Map<string, CachedFile>()

function download(content: string, fileName: string, mime: string): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.onchange = (event: Event) => {
      const target = event.target as HTMLInputElement
      resolve(target.files?.[0] ?? null)
    }
    input.click()
  })
}

/**
 * Compresión "deflate" para el .xlsx, usando la Compression Streams API del
 * navegador (soportada en todos los navegadores modernos desde mediados de
 * 2023, incluido el Chromium que trae Electron). Es el equivalente en el
 * navegador de `zlib.deflateRawSync` en el escritorio: mismo formato de
 * bytes, así que el mismo `buildPrettyXlsx` de `shared/xlsxExport.ts`
 * funciona en los dos casos sin cambiar una línea de la lógica del archivo.
 */
// TypeScript 5.7+ hizo genéricos los TypedArray (Uint8Array<ArrayBuffer> vs.
// Uint8Array<ArrayBufferLike>); las firmas de `@types/node` para Uint8Array
// son laxas (ArrayBufferLike, por si acaso viene de un SharedArrayBuffer)
// pero las APIs del navegador (Blob, CompressionStream) piden el tipo
// concreto. En este archivo los bytes SIEMPRE vienen de un ArrayBuffer
// normal, así que se afirma el tipo en este único punto de conversión.
function asBufferBacked(view: Uint8Array): Uint8Array<ArrayBuffer> {
  return new Uint8Array(view) as Uint8Array<ArrayBuffer>
}

const browserDeflateRaw: DeflateFn = async (data: Uint8Array): Promise<Uint8Array> => {
  const stream = new CompressionStream('deflate-raw')
  const writer = stream.writable.getWriter()
  writer.write(asBufferBacked(data))
  writer.close()
  const chunks: Uint8Array[] = []
  const reader = stream.readable.getReader()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }
  let total = 0
  for (const c of chunks) total += c.length
  const out = new Uint8Array(total)
  let offset = 0
  for (const c of chunks) { out.set(c, offset); offset += c.length }
  return out
}

function downloadBytes(bytes: Uint8Array, fileName: string, mime: string): void {
  const blob = new Blob([asBufferBacked(bytes)], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string) ?? '')
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'))
    // UTF-8 explícito: el BOM lo retira el parser compartido.
    reader.readAsText(file, 'UTF-8')
  })
}

const browserApi: WienerApi = {
  selectFile: async () => {
    const file = await pickFile('.csv,.txt,.tsv')
    if (!file) return null
    const content = await readAsText(file)
    // En el navegador no hay rutas reales: el nombre actúa de identificador.
    let key = file.name
    let suffix = 2
    while (fileCache.has(key) && fileCache.get(key)!.content !== content) {
      key = `${file.name} (${suffix++})`
    }
    fileCache.set(key, { name: file.name, content })
    return key
  },

  getCsvHeaders: async (filePath: string) => {
    const cached = fileCache.get(filePath)
    return cached ? parseCsvHeaders(cached.content).headers : []
  },

  inspectCsv: async (filePath: string) => {
    const cached = fileCache.get(filePath)
    if (!cached) return { success: false, headers: [], error: 'El archivo ya no está en memoria.' }
    const { headers, delimiter, sampleRows } = parseCsvPreview(cached.content, undefined, 1)
    return {
      success: true,
      headers,
      delimiter,
      rowCount: parseCsv(cached.content, delimiter).rows.length,
      sampleRow: sampleRows[0]
    }
  },

  scanUniqueValues: async (filePath: string, columnName: string) => {
    const cached = fileCache.get(filePath)
    return cached ? uniqueValues(cached.content, columnName) : []
  },

  runCalculations: async (configData: unknown) => {
    const config = configData as WienerConfig
    const foods = config.foodsFilePath ? fileCache.get(config.foodsFilePath) : undefined
    const consumption = config.inputFilePath ? fileCache.get(config.inputFilePath) : undefined
    const recipes = config.recipesFilePath ? fileCache.get(config.recipesFilePath) : undefined

    if (!foods || !consumption) {
      return {
        success: false,
        error:
          'Los archivos ya no están en la memoria del navegador. Vuelve a seleccionarlos en la pestaña 1. ' +
          '(En modo web los archivos no se guardan entre recargas de la página.)'
      }
    }

    try {
      const result = runEngine(
        { foodsText: foods.content, inputText: consumption.content, recipesText: recipes?.content },
        config
      )
      return {
        success: true,
        data: result.rows,
        warnings: result.warnings,
        notFound: result.notFound,
        stats: result.stats
      }
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Ocurrió un error desconocido.',
        warnings: error instanceof EngineConfigError ? error.warnings : []
      }
    }
  },

  saveCsv: async (data: unknown[]) => {
    if (!data || data.length === 0) return { success: false, error: 'No hay datos que guardar.' }
    // BOM para que Excel respete los acentos.
    download('﻿' + toCsv(data as Record<string, unknown>[]), 'wiener_results.csv', 'text/csv;charset=utf-8')
    return { success: true, filePath: 'wiener_results.csv' }
  },

  saveExcel: async (data: unknown[]) => {
    if (!data || data.length === 0) return { success: false, error: 'No hay datos que guardar.' }
    const rows = data as Record<string, unknown>[]

    // Mismo libro "bonito" (encabezado en color, bordes, cebra, autofiltro,
    // fila congelada) que en la versión de escritorio: la construcción del
    // archivo vive en shared/xlsxExport.ts y aquí sólo cambia cómo se
    // comprime (Compression Streams del navegador en vez de zlib de Node).
    const headers: string[] = []
    const seen = new Set<string>()
    for (const row of rows) {
      for (const key of Object.keys(row)) {
        if (!seen.has(key)) { seen.add(key); headers.push(key) }
      }
    }

    try {
      const bytes = await buildPrettyXlsx(rows, headers, { sheetName: 'WienerCalc' }, browserDeflateRaw)
      downloadBytes(
        bytes,
        'wiener_results.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      )
      return { success: true, filePath: 'wiener_results.xlsx' }
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'No se pudo generar el archivo de Excel.'
      }
    }
  },

  saveReport: async (text: string) => {
    download(text, 'wiener_informe.txt', 'text/plain;charset=utf-8')
    return { success: true, filePath: 'wiener_informe.txt' }
  },

  saveConfig: async (configData: unknown) => {
    download(JSON.stringify(configData, null, 2), 'wiener_perfil.json', 'application/json')
    return { success: true, filePath: 'wiener_perfil.json' }
  },

  loadConfig: async () => {
    const file = await pickFile('.json')
    if (!file) return { success: false, canceled: true }
    try {
      return { success: true, data: JSON.parse(await readAsText(file)) }
    } catch {
      return { success: false, error: 'El archivo no es un JSON válido.' }
    }
  },

  readFile: async (filePath: string) => {
    const cached = fileCache.get(filePath)
    return cached
      ? { success: true, content: cached.content }
      : { success: false, error: 'El archivo no está en la memoria del navegador.' }
  },

  writeFile: async (filePath: string, content: string) => {
    const cached = fileCache.get(filePath)
    if (!cached) return { success: false, error: 'El archivo no está en la memoria del navegador.' }
    // En el navegador la edición sólo afecta a la copia en memoria.
    fileCache.set(filePath, { ...cached, content })
    return { success: true }
  }
}

if (typeof window !== 'undefined' && !window.wienerApi) {
  window.wienerApi = browserApi
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

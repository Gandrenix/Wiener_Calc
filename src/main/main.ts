import { app, BrowserWindow, ipcMain, dialog, IpcMainInvokeEvent } from 'electron'
import { join } from 'path'
import * as fs from 'fs'

import { runEngine, EngineConfigError, type WienerConfig } from '../shared/engine.ts'
import { parseCsvHeaders, parseCsvPreview, parseCsv, toCsv, uniqueValues } from '../shared/csv.ts'
import { buildPrettyXlsx } from './xlsxWriter.ts'

/* ------------------------------------------------------------------ */
/* Ventana                                                             */
/* ------------------------------------------------------------------ */

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1180,
    height: 820,
    autoHideMenuBar: true,
    icon: join(__dirname, '../../resources/logo.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.setMenuBarVisibility(false)
  mainWindow.setMenu(null)

  mainWindow.loadURL(
    process.env['ELECTRON_RENDERER_URL'] || 'file://' + join(__dirname, '../renderer/index.html')
  )
}

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

function readText(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8')
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocurrió un error desconocido.'
}

/* ------------------------------------------------------------------ */

app.whenReady().then(() => {
  createWindow()

  /* --- 1. Motor de cálculo ---------------------------------------- */

  ipcMain.handle('calculate-food', async (_event: IpcMainInvokeEvent, configData: WienerConfig) => {
    try {
      const result = runEngine(
        {
          foodsText: configData.foodsFilePath ? readText(configData.foodsFilePath) : '',
          inputText: configData.inputFilePath ? readText(configData.inputFilePath) : '',
          recipesText: configData.recipesFilePath ? readText(configData.recipesFilePath) : undefined
        },
        configData
      )
      return {
        success: true,
        data: result.rows,
        warnings: result.warnings,
        notFound: result.notFound,
        stats: result.stats
      }
    } catch (error: unknown) {
      const warnings = error instanceof EngineConfigError ? error.warnings : []
      return { success: false, error: errorMessage(error), warnings }
    }
  })

  /* --- 2. Selector de archivos ------------------------------------ */

  ipcMain.handle('select-file', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'Archivos de datos', extensions: ['csv', 'txt', 'tsv'] },
        { name: 'Todos los archivos', extensions: ['*'] }
      ]
    })
    return result.canceled ? null : result.filePaths[0]
  })

  /* --- 3. Cabeceras del CSV --------------------------------------- */
  /* Antes se leía SIN tener en cuenta el BOM, así que la columna que      */
  /* mostraba la interfaz («﻿food_id») no coincidía con la que veía   */
  /* el motor («food_id») y no se cargaba ningún alimento.                */

  ipcMain.handle('get-csv-headers', async (_event: IpcMainInvokeEvent, filePath: string) => {
    try {
      return parseCsvHeaders(readText(filePath)).headers
    } catch {
      return []
    }
  })

  /** Cabeceras + delimitador detectado + nº de filas, para la interfaz. */
  ipcMain.handle('inspect-csv', async (_event: IpcMainInvokeEvent, filePath: string) => {
    try {
      const text = readText(filePath)
      const { headers, delimiter, sampleRows } = parseCsvPreview(text, undefined, 1)
      // Sólo se cuentan filas para archivos manejables; en los enormes se estima.
      const lineCount = text.length < 20_000_000
        ? parseCsv(text, delimiter).rows.length
        : text.split('\n').length - 1
      return { success: true, headers, delimiter, rowCount: lineCount, sampleRow: sampleRows[0] }
    } catch (error: unknown) {
      return { success: false, error: errorMessage(error), headers: [] as string[] }
    }
  })

  /* --- 4. Valores únicos de una columna --------------------------- */

  ipcMain.handle('scan-unique-values', async (_event: IpcMainInvokeEvent, filePath: string, columnName: string) => {
    try {
      return uniqueValues(readText(filePath), columnName)
    } catch {
      return []
    }
  })

  /* --- 5. Exportar a CSV ------------------------------------------ */
  /* Ahora usa la UNIÓN de columnas de todas las filas: antes se tomaban   */
  /* sólo las de la primera fila y el CSV perdía columnas que el Excel sí  */
  /* incluía.                                                             */

  ipcMain.handle('save-csv', async (_event: IpcMainInvokeEvent, data: Record<string, unknown>[]) => {
    if (!data || data.length === 0) return { success: false, error: 'No hay datos que guardar.' }

    const { filePath, canceled } = await dialog.showSaveDialog({
      title: 'Exportar resultados de WienerCalc',
      defaultPath: 'wiener_results.csv',
      filters: [{ name: 'Archivos CSV', extensions: ['csv'] }]
    })
    if (canceled || !filePath) return { success: false, canceled: true }

    try {
      // BOM para que Excel abra los acentos correctamente.
      fs.writeFileSync(filePath, '﻿' + toCsv(data), 'utf8')
      return { success: true, filePath }
    } catch (error: unknown) {
      return { success: false, error: errorMessage(error) }
    }
  })

  /* --- 6. Exportar a Excel ---------------------------------------- */

  ipcMain.handle('save-excel', async (_event: IpcMainInvokeEvent, data: Record<string, unknown>[]) => {
    if (!data || data.length === 0) return { success: false, error: 'No hay datos que guardar.' }

    const { filePath, canceled } = await dialog.showSaveDialog({
      title: 'Exportar resultados de WienerCalc a Excel',
      defaultPath: 'wiener_results.xlsx',
      filters: [{ name: 'Libro de Excel', extensions: ['xlsx'] }]
    })
    if (canceled || !filePath) return { success: false, canceled: true }

    try {
      // Unión de columnas, igual que en el CSV, para que ambos coincidan.
      const headers: string[] = []
      const seen = new Set<string>()
      for (const row of data) {
        for (const key of Object.keys(row)) {
          if (!seen.has(key)) { seen.add(key); headers.push(key) }
        }
      }

      // Libro "bonito": encabezado en negrita con color, bordes, franjas
      // cebra, formato numérico por columna, fila de encabezado congelada
      // y autofiltro. La librería `xlsx` (versión gratuita) sólo escribe
      // datos planos -- ignora en silencio cualquier estilo que se le pida
      // al guardar -- así que el archivo se arma directamente en formato
      // OOXML (ver xlsxWriter.ts para el detalle y las pruebas).
      const buffer = await buildPrettyXlsx(data, headers, { sheetName: 'WienerCalc' })
      fs.writeFileSync(filePath, buffer)
      return { success: true, filePath }
    } catch (error: unknown) {
      return { success: false, error: errorMessage(error) }
    }
  })

  /* --- 7. Exportar el informe de avisos --------------------------- */

  ipcMain.handle('save-report', async (_event: IpcMainInvokeEvent, text: string) => {
    const { filePath, canceled } = await dialog.showSaveDialog({
      title: 'Guardar informe de la ejecución',
      defaultPath: 'wiener_informe.txt',
      filters: [{ name: 'Texto', extensions: ['txt'] }]
    })
    if (canceled || !filePath) return { success: false, canceled: true }
    try {
      fs.writeFileSync(filePath, text, 'utf8')
      return { success: true, filePath }
    } catch (error: unknown) {
      return { success: false, error: errorMessage(error) }
    }
  })

  /* --- 8. Perfiles ------------------------------------------------ */

  ipcMain.handle('save-config', async (_event: IpcMainInvokeEvent, configData: unknown) => {
    const { filePath, canceled } = await dialog.showSaveDialog({
      title: 'Guardar perfil de WienerCalc',
      defaultPath: 'mi_perfil.json',
      filters: [{ name: 'Archivos JSON', extensions: ['json'] }]
    })
    if (canceled || !filePath) return { success: false, canceled: true }
    try {
      fs.writeFileSync(filePath, JSON.stringify(configData, null, 2), 'utf8')
      return { success: true, filePath }
    } catch (error: unknown) {
      return { success: false, error: errorMessage(error) }
    }
  })

  ipcMain.handle('load-config', async () => {
    const { filePaths, canceled } = await dialog.showOpenDialog({
      title: 'Cargar perfil de WienerCalc',
      properties: ['openFile'],
      filters: [{ name: 'Archivos JSON', extensions: ['json'] }]
    })
    if (canceled || filePaths.length === 0) return { success: false, canceled: true }
    try {
      return { success: true, data: JSON.parse(readText(filePaths[0])) }
    } catch (error: unknown) {
      return { success: false, error: errorMessage(error) }
    }
  })

  /* --- 9. Editor CSV integrado ------------------------------------ */

  ipcMain.handle('read-file', async (_event: IpcMainInvokeEvent, filePath: string) => {
    try {
      return { success: true, content: readText(filePath) }
    } catch (error: unknown) {
      return { success: false, error: errorMessage(error) }
    }
  })

  ipcMain.handle('write-file', async (_event: IpcMainInvokeEvent, filePath: string, content: string) => {
    try {
      fs.writeFileSync(filePath, content, 'utf8')
      return { success: true }
    } catch (error: unknown) {
      return { success: false, error: errorMessage(error) }
    }
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

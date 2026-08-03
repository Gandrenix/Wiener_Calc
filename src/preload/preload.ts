import { contextBridge, ipcRenderer } from 'electron'

/**
 * Puente entre el proceso principal y la interfaz.
 * Superficie mínima e intencionada: la interfaz nunca tiene acceso directo
 * a Node ni al sistema de archivos.
 */
contextBridge.exposeInMainWorld('wienerApi', {
  runCalculations: (configData: unknown) => ipcRenderer.invoke('calculate-food', configData),
  selectFile: () => ipcRenderer.invoke('select-file'),
  getCsvHeaders: (filePath: string) => ipcRenderer.invoke('get-csv-headers', filePath),
  inspectCsv: (filePath: string) => ipcRenderer.invoke('inspect-csv', filePath),
  scanUniqueValues: (filePath: string, columnName: string) =>
    ipcRenderer.invoke('scan-unique-values', filePath, columnName),
  saveCsv: (data: unknown[]) => ipcRenderer.invoke('save-csv', data),
  saveExcel: (data: unknown[]) => ipcRenderer.invoke('save-excel', data),
  saveReport: (text: string) => ipcRenderer.invoke('save-report', text),
  saveConfig: (configData: unknown) => ipcRenderer.invoke('save-config', configData),
  loadConfig: () => ipcRenderer.invoke('load-config'),
  readFile: (filePath: string) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath: string, content: string) => ipcRenderer.invoke('write-file', filePath, content)
})

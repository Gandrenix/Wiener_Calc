import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('wienerApi', {
  runCalculations: (configData: any) => ipcRenderer.invoke('calculate-food', configData),
  selectFile: () => ipcRenderer.invoke('select-file'),
  getCsvHeaders: (filePath: string) => ipcRenderer.invoke('get-csv-headers', filePath),
  scanUniqueValues: (filePath: string, columnName: string) => ipcRenderer.invoke('scan-unique-values', filePath, columnName),
  // 👇 NEW BRIDGE CONNECTION 👇
  saveCsv: (data: any[]) => ipcRenderer.invoke('save-csv', data), // 👈 ADDED THE COMMA HERE!
  saveExcel: (data: any[]) => ipcRenderer.invoke('save-excel', data),
  saveConfig: (configData: any) => ipcRenderer.invoke('save-config', configData),
  loadConfig: () => ipcRenderer.invoke('load-config')
})
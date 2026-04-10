// This file makes VS Code autocomplete work in React!
import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    wienerApi: {
      runCalculations: (configData: any) => Promise<{success: boolean, data?: any[], error?: string}>;
      selectFile: () => Promise<string | null>;
      getCsvHeaders: (filePath: string) => Promise<string[]>;
      scanUniqueValues: (filePath: string, columnName: string) => Promise<string[]>;
      saveCsv: (data: any[]) => Promise<{success: boolean, filePath?: string, canceled?: boolean, error?: string}>;
      saveExcel: (data: any[]) => Promise<{success: boolean, filePath?: string, canceled?: boolean, error?: string}>;
      saveConfig: (configData: any) => Promise<{success: boolean, filePath?: string, canceled?: boolean, error?: string}>;
      loadConfig: () => Promise<{success: boolean, data?: any, canceled?: boolean, error?: string}>; 
    }
  }
}
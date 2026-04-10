import { app, BrowserWindow, ipcMain, dialog, IpcMainInvokeEvent } from 'electron'
import { join } from 'path'
import { executeFoodCalc } from './engine/wienerEngine' 
import * as fs from 'fs'
import { parse } from 'csv-parse'
import * as xlsx from 'xlsx'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      sandbox: false 
    }
  })
  mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] || 'file://' + join(__dirname, '../renderer/index.html'))
}

app.whenReady().then(() => {
  createWindow()

  // 1. Core Engine Handler
  ipcMain.handle('calculate-food', async (event: IpcMainInvokeEvent, configData: any) => {
    console.log("Woof! Received config from UI:", configData);
    try {
      const results = await executeFoodCalc(configData);
      return { success: true, data: results };
    } catch (error: unknown) {
      const errMessage = error instanceof Error ? error.message : "Unknown error occurred";
      return { success: false, error: errMessage };
    }
  })

  // 2. File Selector Dialog
  ipcMain.handle('select-file', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openFile'] })
    return result.canceled ? null : result.filePaths[0];
  })

  // 3. Header Scanner
  ipcMain.handle('get-csv-headers', async (event: IpcMainInvokeEvent, filePath: string) => {
    return new Promise((resolve, reject) => {
      const parser = fs.createReadStream(filePath).pipe(parse({ to_line: 1 }));
      parser.on('data', (record) => resolve(record));
      parser.on('error', (err) => reject(err.message));
      parser.on('end', () => resolve([]));
    });
  })

  // 4. Data Scanner for Dropdowns
  ipcMain.handle('scan-unique-values', async (event: IpcMainInvokeEvent, filePath: string, columnName: string) => {
    return new Promise((resolve, reject) => {
      const uniqueValues = new Set<string>();
      const parser = fs.createReadStream(filePath).pipe(parse({ columns: true, skip_empty_lines: true }));
      
      parser.on('data', (row) => {
        const val = row[columnName];
        if (val) uniqueValues.add(String(val).trim());
      });
      
      parser.on('error', (err) => reject(err.message));
      parser.on('end', () => resolve(Array.from(uniqueValues)));
    });
  })

  // 5. Save as CSV
  ipcMain.handle('save-csv', async (event: IpcMainInvokeEvent, data: any[]) => {
    if (!data || data.length === 0) return { success: false, error: "No data to save!" };
    const { filePath, canceled } = await dialog.showSaveDialog({
      title: 'Export WienerCalc Results',
      defaultPath: 'wiener_results.csv',
      filters: [{ name: 'CSV Files', extensions: ['csv'] }]
    });
    if (canceled || !filePath) return { success: false, canceled: true };
    try {
      const headers = Object.keys(data[0]);
      const csvRows = [];
      csvRows.push(headers.join(','));
      for (const row of data) {
        const values = headers.map(header => {
          const rawValue = row[header] !== undefined && row[header] !== null ? String(row[header]) : '';
          const escaped = rawValue.replace(/"/g, '""');
          return `"${escaped}"`;
        });
        csvRows.push(values.join(','));
      }
      fs.writeFileSync(filePath, csvRows.join('\n'), 'utf8');
      return { success: true, filePath };
    } catch (error: unknown) {
      const errMessage = error instanceof Error ? error.message : "Unknown error occurred";
      return { success: false, error: errMessage };
    }
  });

// 6. HEAVY LOGGING EXCEL HANDLER
  ipcMain.handle('save-excel', async (event: IpcMainInvokeEvent, data: any[]) => {
    console.log("\n--- 🟢 EXCEL EXPORT STARTED ---");
    if (!data || data.length === 0) return { success: false, error: "No data to save!" };

    console.log(`📊 Received ${data.length} rows to export.`);
    
    const { filePath, canceled } = await dialog.showSaveDialog({
      title: 'Export WienerCalc Results to Excel',
      defaultPath: 'wiener_results.xlsx',
      filters: [{ name: 'Excel Workbook', extensions: ['xlsx'] }]
    });

    if (canceled || !filePath) return { success: false, canceled: true };

    try {
      console.log("⚙️  Step 1: Converting JSON array to Excel...");
      const worksheet = xlsx.utils.json_to_sheet(data);
      
      console.log("⚙️  Step 2: Creating new Workbook...");
      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, worksheet, "WienerCalc Results");

      console.log("⚙️  Step 3: Calculating column widths...");
      const headers = Object.keys(data[0]);
      worksheet['!cols'] = headers.map(h => ({ wch: Math.max(h.length, 12) }));

      console.log(`💾 Step 4: Bypassing xlsx and writing via native Node.js fs...`);
      // 👇 THE MAGIC FIX 👇
      const excelBuffer = xlsx.write(workbook, { bookType: 'xlsx', type: 'buffer' });
      fs.writeFileSync(filePath, excelBuffer);
      
      console.log("✅ EXCEL EXPORT SUCCESSFUL!\n");
      return { success: true, filePath };

    } catch (error: any) {
      console.log("\n❌ !!! EXCEL EXPORT CRASHED !!!");
      console.log(error);
      return { success: false, error: error.message };
    }
  });

// ==========================================
  // 7. GUARDAR PERFIL (CONFIGURACIÓN)
  // ==========================================
  ipcMain.handle('save-config', async (event: IpcMainInvokeEvent, configData: any) => {
    const { filePath, canceled } = await dialog.showSaveDialog({
      title: 'Guardar Perfil de WienerCalc',
      defaultPath: 'mi_perfil.json',
      filters: [{ name: 'Archivos JSON', extensions: ['json'] }]
    });

    if (canceled || !filePath) return { success: false, canceled: true };

    try {
      // Convertimos todo el objeto 'config' a texto y lo guardamos
      fs.writeFileSync(filePath, JSON.stringify(configData, null, 2), 'utf8');
      return { success: true, filePath };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // ==========================================
  // 8. CARGAR PERFIL (CONFIGURACIÓN)
  // ==========================================
  ipcMain.handle('load-config', async () => {
    const { filePaths, canceled } = await dialog.showOpenDialog({
      title: 'Cargar Perfil de WienerCalc',
      properties: ['openFile'],
      filters: [{ name: 'Archivos JSON', extensions: ['json'] }]
    });

    if (canceled || filePaths.length === 0) return { success: false, canceled: true };

    try {
      // Leemos el archivo y lo convertimos de vuelta a un objeto
      const rawData = fs.readFileSync(filePaths[0], 'utf8');
      const parsedData = JSON.parse(rawData);
      return { success: true, data: parsedData };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });


})
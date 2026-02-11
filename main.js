const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, '/assets/icon.png'), // 可选：应用图标
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // 设置窗口标题
  mainWindow.setTitle('兰空图床批量上传工具');

  // 加载本地网页
  mainWindow.loadFile(path.join(__dirname, 'web/index.html'));

  // 打开开发者工具（仅用于调试）
  // mainWindow.webContents.openDevTools();

  mainWindow.setBackgroundColor('#f8f9fa'); // 匹配网页背景色
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// IPC处理文件选择
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    const dirPath = result.filePaths[0];
    
    // 读取目录中的图片文件
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
    const files = [];
    
    function readDirRecursive(currentPath) {
      const items = fs.readdirSync(currentPath);
      
      for (const item of items) {
        const fullPath = path.join(currentPath, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          // 递归读取子目录
          readDirRecursive(fullPath);
        } else {
          const ext = path.extname(item).toLowerCase();
          if (imageExtensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    }
    
    readDirRecursive(dirPath);
    
    return {
      folderPath: dirPath,
      files: files,
      count: files.length
    };
  }
  
  return null;
});
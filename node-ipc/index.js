/**
 * Lsky Studio Node.js IPC 服务
 *
 * 通信协议：
 * - 接收命令：stdin JSON Lines
 * - 发送响应/事件：stdout JSON Lines
 *
 * 命令格式：
 * {
 *   "id": "cmd_123",
 *   "method": "upload_start",
 *   "params": { ... }
 * }
 *
 * 响应格式：
 * {
 *   "id": "cmd_123",
 *   "success": true,
 *   "data": { ... }
 * }
 *
 * 事件格式：
 * {
 *   "type": "upload_progress",
 *   "payload": { ... }
 * }
 */

const path = require('path');
const IpcHandler = require('./ipc-handler');
const UploadEngine = require('./upload-engine');
const ConfigManager = require('./config-manager');

// 创建 IPC 处理器
const ipcHandler = new IpcHandler();

// 创建上传引擎
const uploadEngine = new UploadEngine(ipcHandler);

// 创建配置管理器
const configManager = new ConfigManager(ipcHandler);

// 注册命令
uploadEngine.registerCommands();
configManager.registerCommands();

// 设置配置文件路径
const configDir = process.env.LSKY_CONFIG_DIR || path.join(process.env.HOME || process.env.USERPROFILE, '.lsky-studio');
const configPath = path.join(configDir, 'config.json');
configManager.setConfigPath(configPath);

// 注册系统命令
ipcHandler.registerCommand('get_version', () => {
  return { version: '0.1.0' };
});

ipcHandler.registerCommand('get_status', () => {
  return {
    status: 'ready',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    tasks: uploadEngine.tasks.size,
    isUploading: uploadEngine.isUploading
  };
});

// 发送就绪事件
ipcHandler.sendEvent('node_ready', {
  version: '0.1.0',
  pid: process.pid,
  configPath
});

// 错误处理
process.on('uncaughtException', (error) => {
  ipcHandler.sendEvent('node_error', {
    code: 'UNCAUGHT_EXCEPTION',
    message: error.message,
    stack: error.stack
  });
});

process.on('unhandledRejection', (reason) => {
  ipcHandler.sendEvent('node_error', {
    code: 'UNHANDLED_REJECTION',
    message: reason?.message || String(reason)
  });
});

// 优雅退出
process.on('SIGTERM', () => {
  ipcHandler.sendEvent('node_exit', { code: 0, signal: 'SIGTERM' });
  process.exit(0);
});

process.on('SIGINT', () => {
  ipcHandler.sendEvent('node_exit', { code: 0, signal: 'SIGINT' });
  process.exit(0);
});

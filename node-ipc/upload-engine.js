/**
 * 上传引擎
 * 处理文件上传逻辑，支持并发控制和进度事件
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const https = require('https');
const http = require('http');

class UploadEngine {
  constructor(ipcHandler) {
    this.ipc = ipcHandler;
    this.isUploading = false;
    this.tasks = new Map();
    this.abortController = null;
  }

  /**
   * 注册上传相关命令
   */
  registerCommands() {
    this.ipc.registerCommand('upload_start', (params) => this.startUpload(params));
    this.ipc.registerCommand('upload_pause', (params) => this.pauseUpload(params));
    this.ipc.registerCommand('upload_resume', (params) => this.resumeUpload(params));
    this.ipc.registerCommand('upload_cancel', (params) => this.cancelUpload(params));
    this.ipc.registerCommand('upload_status', (params) => this.getUploadStatus(params));
  }

  /**
   * 开始上传
   */
  async startUpload(params) {
    const { files, apiUrl, token, storageId, concurrency = 3 } = params;

    if (!files || files.length === 0) {
      throw { code: 'INVALID_PARAMS', message: '文件列表为空' };
    }

    if (!apiUrl || !token) {
      throw { code: 'INVALID_PARAMS', message: 'API 配置不完整' };
    }

    this.isUploading = true;
    this.tasks.clear();

    // 创建上传任务
    const tasks = files.map((file, index) => ({
      id: `task_${Date.now()}_${index}`,
      fileName: path.basename(file.path),
      filePath: file.path,
      fileSize: file.size || 0,
      status: 'pending',
      progress: 0,
      url: null,
      error: null
    }));

    // 初始化任务列表
    tasks.forEach(task => {
      this.tasks.set(task.id, task);
    });

    // 发送任务创建事件
    this.ipc.sendEvent('upload_tasks_created', { tasks });

    // 开始并发上传
    this.processUploadQueue(apiUrl, token, storageId, concurrency);

    return { taskIds: tasks.map(t => t.id) };
  }

  /**
   * 处理上传队列
   */
  async processUploadQueue(apiUrl, token, storageId, concurrency) {
    const pendingTasks = Array.from(this.tasks.values()).filter(t => t.status === 'pending');
    const running = new Set();

    const processNext = async () => {
      if (!this.isUploading) return;

      while (running.size < concurrency && pendingTasks.length > 0) {
        const task = pendingTasks.shift();
        if (task && task.status === 'pending') {
          running.add(task.id);
          this.uploadSingleFile(task, apiUrl, token, storageId)
            .finally(() => {
              running.delete(task.id);
              processNext();
            });
        }
      }
    };

    await processNext();
  }

  /**
   * 上传单个文件
   */
  async uploadSingleFile(task, apiUrl, token, storageId) {
    try {
      // 更新任务状态
      task.status = 'uploading';
      this.tasks.set(task.id, task);
      this.ipc.sendEvent('upload_progress', {
        taskId: task.id,
        fileName: task.fileName,
        progress: 0,
        status: 'uploading'
      });

      // 检查文件是否存在
      if (!fs.existsSync(task.filePath)) {
        throw new Error('文件不存在');
      }

      // 构建上传 URL
      let baseUrl = apiUrl.trim();
      if (baseUrl.endsWith('/')) {
        baseUrl = baseUrl.slice(0, -1);
      }
      if (baseUrl.endsWith('/api/v2')) {
        baseUrl = baseUrl.slice(0, -7);
      }

      const uploadUrl = `${baseUrl}/api/v2/upload`;

      // 读取文件
      const fileBuffer = fs.readFileSync(task.filePath);
      const fileName = path.basename(task.filePath);

      // 构建 FormData
      const formData = new FormData();
      formData.append('file', fileBuffer, {
        filename: fileName,
        contentType: this.getMimeType(fileName)
      });
      formData.append('storage_id', storageId || '1');

      // 发送请求
      const result = await this.httpUpload(uploadUrl, formData, token, task);

      // 上传成功
      task.status = 'success';
      task.progress = 100;
      task.url = result.url;
      this.tasks.set(task.id, task);

      this.ipc.sendEvent('upload_complete', {
        taskId: task.id,
        fileName: task.fileName,
        url: result.url,
        thumbnailUrl: result.thumbnailUrl
      });

    } catch (error) {
      // 上传失败
      task.status = 'failed';
      task.error = error.message;
      this.tasks.set(task.id, task);

      this.ipc.sendEvent('upload_error', {
        taskId: task.id,
        fileName: task.fileName,
        errorCode: 'UPLOAD_FAILED',
        errorMessage: error.message,
        retryable: true
      });
    }
  }

  /**
   * HTTP 上传请求
   */
  httpUpload(url, formData, token, task) {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;

      const request = protocol.request(url, {
        method: 'POST',
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${token}`
        }
      }, (response) => {
        let data = '';

        response.on('data', (chunk) => {
          data += chunk;
        });

        response.on('end', () => {
          try {
            const result = JSON.parse(data);

            if (response.statusCode >= 200 && response.statusCode < 300) {
              if (result.status === 'success' || result.status === true || result.status === 200) {
                resolve({
                  url: result.data?.public_url || result.data?.links?.url || result.url || '',
                  thumbnailUrl: result.data?.thumbnail_url || result.data?.links?.thumbnail || result.thumbnailUrl || ''
                });
              } else {
                reject(new Error(result.message || '上传失败'));
              }
            } else {
              reject(new Error(`HTTP ${response.statusCode}: ${result.message || '请求失败'}`));
            }
          } catch (e) {
            reject(new Error(`解析响应失败: ${e.message}`));
          }
        });
      });

      request.on('error', (error) => {
        reject(new Error(`网络错误: ${error.message}`));
      });

      // 监听上传进度
      let uploadedBytes = 0;
      const totalBytes = formData.getLengthSync ? formData.getLengthSync() : 0;

      formData.on('data', (chunk) => {
        uploadedBytes += chunk.length;
        if (totalBytes > 0) {
          const progress = Math.round((uploadedBytes / totalBytes) * 100);
          task.progress = progress;
          this.tasks.set(task.id, task);

          this.ipc.sendEvent('upload_progress', {
            taskId: task.id,
            fileName: task.fileName,
            progress,
            uploadedBytes,
            totalBytes,
            status: 'uploading'
          });
        }
      });

      formData.pipe(request);
    });
  }

  /**
   * 暂停上传
   */
  async pauseUpload(params) {
    const { taskIds } = params || {};

    if (taskIds && taskIds.length > 0) {
      taskIds.forEach(id => {
        const task = this.tasks.get(id);
        if (task && task.status === 'uploading') {
          task.status = 'paused';
          this.tasks.set(id, task);
        }
      });
    } else {
      // 暂停所有
      this.tasks.forEach((task, id) => {
        if (task.status === 'uploading') {
          task.status = 'paused';
          this.tasks.set(id, task);
        }
      });
    }

    return { paused: taskIds || Array.from(this.tasks.keys()) };
  }

  /**
   * 继续上传
   */
  async resumeUpload(params) {
    const { taskIds } = params || {};
    const resumed = [];

    if (taskIds && taskIds.length > 0) {
      taskIds.forEach(id => {
        const task = this.tasks.get(id);
        if (task && task.status === 'paused') {
          task.status = 'pending';
          this.tasks.set(id, task);
          resumed.push(id);
        }
      });
    } else {
      // 继续所有
      this.tasks.forEach((task, id) => {
        if (task.status === 'paused') {
          task.status = 'pending';
          this.tasks.set(id, task);
          resumed.push(id);
        }
      });
    }

    return { resumed };
  }

  /**
   * 取消上传
   */
  async cancelUpload(params) {
    const { taskIds } = params || {};
    const cancelled = [];

    if (taskIds && taskIds.length > 0) {
      taskIds.forEach(id => {
        const task = this.tasks.get(id);
        if (task && (task.status === 'uploading' || task.status === 'pending' || task.status === 'paused')) {
          task.status = 'cancelled';
          this.tasks.set(id, task);
          cancelled.push(id);
        }
      });
    } else {
      // 取消所有
      this.tasks.forEach((task, id) => {
        if (task.status === 'uploading' || task.status === 'pending' || task.status === 'paused') {
          task.status = 'cancelled';
          this.tasks.set(id, task);
          cancelled.push(id);
        }
      });
      this.isUploading = false;
    }

    return { cancelled };
  }

  /**
   * 获取上传状态
   */
  async getUploadStatus(params) {
    const { taskIds } = params || {};

    let tasks;
    if (taskIds && taskIds.length > 0) {
      tasks = taskIds.map(id => this.tasks.get(id)).filter(Boolean);
    } else {
      tasks = Array.from(this.tasks.values());
    }

    return { tasks };
  }

  /**
   * 获取 MIME 类型
   */
  getMimeType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.bmp': 'image/bmp',
      '.ico': 'image/x-icon'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }
}

module.exports = UploadEngine;

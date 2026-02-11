// 文件选择和预览功能
class FileHandler {
  constructor() {
    this.selectedFiles = [];
    this.uploadType = 'folder'; // 默认为文件夹上传
    this.setupEventListeners();
    this.toggleUploadInputs(); // 初始化显示
  }

  setupEventListeners() {
    // 上传方式切换
    document.querySelectorAll('input[name="uploadType"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.uploadType = e.target.value;
        this.toggleUploadInputs();
      });
    });
    
    // 文件选择事件
    const fileInput = document.getElementById('fileInput');
    fileInput.addEventListener('change', (e) => {
      if (this.uploadType === 'files') {
        this.handleFileSelection(e.target.files);
      }
    });
    
    // 文件夹选择事件
    const folderInput = document.getElementById('folderInput');
    folderInput.addEventListener('change', (e) => {
      if (this.uploadType === 'folder') {
        this.handleFolderSelection(e.target.files);
      }
    });
  }
  
  toggleUploadInputs() {
    const fileInputContainer = document.getElementById('fileInputContainer');
    const folderInputContainer = document.getElementById('folderInputContainer');
    const fileInputHelp = document.getElementById('fileInputHelp');
    
    if (this.uploadType === 'files') {
      fileInputContainer.style.display = 'block';
      folderInputContainer.style.display = 'none';
      fileInputHelp.textContent = '选择要上传的图片文件（支持多选）';
    } else {
      fileInputContainer.style.display = 'none';
      folderInputContainer.style.display = 'block';
      fileInputHelp.textContent = '先选择上传方式为"上传文件"，然后选择图片文件';
    }
  }

  handleFileSelection(fileList) {
    // 过滤出图片文件，支持更多格式
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.avif', '.tif', '.tiff', '.jp2', '.j2k', '.jp2k', '.jpf', '.jpm', '.jpg2', '.j2c', '.jpc', '.jpx', '.heic', '.heif'];
    this.selectedFiles = Array.from(fileList).filter(file => 
      file.type.startsWith('image/') || imageExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
    ).map(file => {
      // 对于单独选择的文件，将其视为来自"根目录"
      file.folderName = '根目录';
      return file;
    });

    this.updateFileInfo();
  }

  handleFolderSelection(fileList) {
    // 过滤出图片文件，支持更多格式
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.avif', '.tif', '.tiff', '.jp2', '.j2k', '.jp2k', '.jpf', '.jpm', '.jpg2', '.j2c', '.jpc', '.jpx', '.heic', '.heif'];
    this.selectedFiles = Array.from(fileList).filter(file => 
      file.type.startsWith('image/') || imageExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
    ).map(file => {
      // 提取文件的相对路径，从中获取文件夹信息
      let folderName = '根目录';
      if (file.webkitRelativePath) {
        const pathParts = file.webkitRelativePath.split('/');
        if (pathParts.length > 1) {
          // 获取最后一级文件夹名称（倒数第二个部分，因为最后一个是文件名）
          folderName = pathParts[pathParts.length - 2];
        }
      }
      // 将文件夹信息附加到文件对象上
      file.folderName = folderName;
      return file;
    });

    this.updateFileInfo();
  }

  updateFileInfo() {
    const fileCountElement = document.getElementById('fileCount');
    const fileListElement = document.getElementById('fileList');
    
    fileCountElement.textContent = this.selectedFiles.length;
    
    // 清空文件列表
    fileListElement.innerHTML = '';
    
    // 显示前20个文件（如果太多的话）
    const displayFiles = this.selectedFiles.slice(0, 20);
    
    displayFiles.forEach(file => {
      const fileItem = document.createElement('div');
      fileItem.className = 'file-item';
      
      const fileName = document.createElement('strong');
      fileName.textContent = file.name;
      
      const fileSize = document.createElement('span');
      fileSize.textContent = ` (${this.formatFileSize(file.size)})`;
      fileSize.style.marginLeft = '10px';
      fileSize.style.color = '#6c757d';
      
      fileItem.appendChild(fileName);
      fileItem.appendChild(fileSize);
      
      fileListElement.appendChild(fileItem);
    });
    
    if (this.selectedFiles.length > 20) {
      const moreItem = document.createElement('div');
      moreItem.className = 'file-item';
      moreItem.textContent = `... 还有 ${this.selectedFiles.length - 20} 个文件`;
      moreItem.style.fontStyle = 'italic';
      fileListElement.appendChild(moreItem);
    }
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getSelectedFiles() {
    return this.selectedFiles;
  }
}

// API客户端，用于与兰空图床API交互
// 
// API URL格式说明：
// - 正确格式: https://your-domain.com (推荐)
// - 或者: https://your-domain.com/api/v2 (如果需要指定API版本)
// - 不要在末尾添加 /upload 路径
// - 示例: https://www.torimg.com/ 或 https://www.torimg.com/api/v2
class ApiClient {
  constructor(apiUrl, token) {
    this.apiUrl = apiUrl;
    this.token = token;
  }

  // 获取存储策略列表
  async getStorageStrategies() {
    try {
      // 构建正确的API URL
      let baseUrl = this.apiUrl.trim();
      
      // 移除末尾的斜杠
      if (baseUrl.endsWith('/')) {
        baseUrl = baseUrl.slice(0, -1);
      }
      
      // 如果URL包含 /api/v2 路径，则不重复添加
      if (baseUrl.endsWith('/api/v2')) {
        baseUrl = baseUrl.slice(0, -7); // 移除 '/api/v2'
      } else if (baseUrl.includes('/api/v2/')) {
        // 如果在中间包含 /api/v2/，则提取基础URL
        const apiIndex = baseUrl.indexOf('/api/v2');
        baseUrl = baseUrl.substring(0, apiIndex);
      }
      
      // 使用专门的策略列表API端点
      const strategiesUrl = `${baseUrl}/api/v1/strategies`;
      
      const response = await fetch(strategiesUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('获取策略列表失败:', response.status, errorText);
        throw new Error(`获取策略列表失败: ${response.status} - ${errorText}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const responseText = await response.text();
        throw new Error(`API响应格式错误: 期望JSON，收到: ${contentType || 'unknown'}\n响应内容: ${responseText.substring(0, 200)}`);
      }

      const result = await response.json();
      
      if (result.status !== true) {
        throw new Error(result.message || '获取策略列表失败');
      }

      // 返回策略列表
      if (result.data && result.data.strategies && Array.isArray(result.data.strategies)) {
        return result.data.strategies.map(strategy => ({
          id: strategy.id,
          name: strategy.name,
          provider: strategy.provider || 'unknown', // 如果没有provider字段，则使用'unknown'
          intro: strategy.intro || ''
        }));
      } else {
        console.warn('API返回的数据格式不符合预期:', result);
        // 如果没有获取到策略列表，至少提供一个默认选项
        return [
          { id: 1, name: '默认存储', provider: 'local', intro: '本地存储策略' }
        ];
      }
    } catch (error) {
      console.error('获取存储策略时发生错误:', error);
      // 发生错误时，返回一个默认的存储策略选项
      return [
        { id: 1, name: '默认存储', provider: 'local', intro: '本地存储策略' }
      ];
    }
  }

  // 检查文件大小是否需要分片上传（5MB以上）
  needsChunkedUpload(file) {
    const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB
    return file.size > CHUNK_SIZE;
  }

  // 分片上传文件
  async uploadImageInChunks(file, options = {}) {
    const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    
    console.log(`开始分片上传文件: ${file.name}, 大小: ${file.size} bytes, 分成 ${totalChunks} 个片段`);
    
    // 由于兰空图床API本身不支持原生分片上传，
    // 我们通过增加超时时间和监控上传进度来改善大文件上传体验
    return new Promise((resolve, reject) => {
      // 创建一个带进度监控的上传请求
      const xhr = new XMLHttpRequest();
      
      // 构建正确的API URL
      let baseUrl = this.apiUrl.trim();
      if (baseUrl.endsWith('/')) {
        baseUrl = baseUrl.slice(0, -1);
      }
      if (baseUrl.endsWith('/api/v2')) {
        baseUrl = baseUrl.slice(0, -7);
      } else if (baseUrl.includes('/api/v2/')) {
        const apiIndex = baseUrl.indexOf('/api/v2');
        baseUrl = baseUrl.substring(0, apiIndex);
      }
      
      const uploadUrl = `${baseUrl}/api/v2/upload`;
      
      // 设置超时时间（大文件需要更长时间）
      xhr.timeout = 30 * 60 * 1000; // 30分钟
      
      xhr.open('POST', uploadUrl);
      xhr.setRequestHeader('Authorization', `Bearer ${this.token}`);
      
      // 监控上传进度
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          console.log(`上传进度: ${percentComplete.toFixed(2)}%`);
          // 可以在这里更新UI进度条
        }
      };
      
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const result = JSON.parse(xhr.responseText);
              // 根据API文档，状态字段可能是字符串类型
              if (result.status !== 'success' && result.status !== 200 && result.status !== true) {
                reject(new Error(result.message || `上传失败: ${JSON.stringify(result)}`));
                return;
              }
              
              // 返回标准化的对象，确保包含必要的URL字段
              resolve({
                data: result.data,
                success: true,
                url: result.data?.public_url || result.data?.links?.url || result.links?.url || result.url || '',
                thumbnailUrl: result.data?.thumbnail_url || result.data?.links?.thumbnail || result.links?.thumbnail || ''
              });
            } catch (e) {
              reject(new Error(`解析响应失败: ${e.message}`));
            }
          } else {
            // 尝试获取错误信息
            let errorMessage = `HTTP错误: ${xhr.status}`;
            try {
              const errorResponse = JSON.parse(xhr.responseText);
              errorMessage = errorResponse.message || errorMessage;
            } catch (e) {
              errorMessage = xhr.responseText || errorMessage;
            }
            reject(new Error(errorMessage));
          }
        }
      };
      
      xhr.onerror = () => {
        reject(new Error('网络错误，上传失败'));
      };
      
      xhr.ontimeout = () => {
        reject(new Error('上传超时'));
      };
      
      const formData = new FormData();
      formData.append('file', file);
      
      // 根据API文档，使用storage_id参数（必需）
      if (options.storage_id) {
        formData.append('storage_id', options.storage_id);
      } else if (options.permission) {
        formData.append('storage_id', options.permission);
      } else {
        formData.append('storage_id', '1');
      }
      
      if (options.albumId) {
        formData.append('album_id', options.albumId.toString());
      }
      
      if (options.expired_at) {
        formData.append('expired_at', options.expired_at);
      }
      
      if (options.intro) {
        formData.append('intro', options.intro);
      }
      
      if (options.is_public !== undefined) {
        formData.append('is_public', options.is_public ? '1' : '0');
      }
      
      if (options.is_remove_exif !== undefined) {
        formData.append('is_remove_exif', options.is_remove_exif ? '1' : '0');
      }
      
      xhr.send(formData);
    });
  }

  async uploadImage(file, options = {}, onProgress = null) {
    try {
      // 构建正确的API URL，处理各种输入格式
      let baseUrl = this.apiUrl.trim();
      
      // 移除末尾的斜杠
      if (baseUrl.endsWith('/')) {
        baseUrl = baseUrl.slice(0, -1);
      }
      
      // 如果URL包含 /api/v2 路径，则不重复添加
      if (baseUrl.endsWith('/api/v2')) {
        baseUrl = baseUrl.slice(0, -7); // 移除 '/api/v2'
      } else if (baseUrl.includes('/api/v2/')) {
        // 如果在中间包含 /api/v2/，则提取基础URL
        const apiIndex = baseUrl.indexOf('/api/v2');
        baseUrl = baseUrl.substring(0, apiIndex);
      }
      
      // 构建最终的上传URL
      const uploadUrl = `${baseUrl}/api/v2/upload`;
      
      console.log('原始API URL:', this.apiUrl);
      console.log('处理后的基础URL:', baseUrl);
      console.log('最终上传URL:', uploadUrl); // 调试信息
      
      // 检查是否需要分片上传（5MB以上）
      if (this.needsChunkedUpload(file)) {
        console.log(`文件 ${file.name} 大小超过5MB，使用分片上传`);
        // 对于分片上传，我们传递进度回调函数
        return this.uploadImageInChunks(file, options);
      }
      
      const formData = new FormData();
      formData.append('file', file);
      
      // 根据API文档，使用storage_id参数（必需）
      if (options.storage_id) {
        formData.append('storage_id', options.storage_id);
      } else if (options.permission) {
        // 向后兼容，如果提供了permission但没有storage_id，则使用permission
        formData.append('storage_id', options.permission);
      } else {
        // 默认使用本地存储
        formData.append('storage_id', '1');
      }
      
      if (options.albumId) {
        formData.append('album_id', options.albumId.toString());
      }
      
      if (options.expired_at) {
        formData.append('expired_at', options.expired_at);
      }
      
      if (options.intro) {
        formData.append('intro', options.intro);
      }
      
      if (options.is_public !== undefined) {
        formData.append('is_public', options.is_public ? '1' : '0');
      }
      
      if (options.is_remove_exif !== undefined) {
        formData.append('is_remove_exif', options.is_remove_exif ? '1' : '0');
      }

      console.log('开始上传文件:', file.name); // 调试信息
      console.log('Authorization header:', `Bearer ${this.token.substring(0, 10)}...`); // 调试信息，只显示token前10位
      console.log('Storage ID:', options.storage_id || options.permission || '1'); // 调试信息
      
      // 使用fetch API，但需要添加上传进度监控
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.open('POST', uploadUrl);
        xhr.setRequestHeader('Authorization', `Bearer ${this.token}`);
        
        // 设置超时时间（大文件需要更长时间）
        xhr.timeout = 30 * 60 * 1000; // 30分钟
        
        // 监控上传进度
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && onProgress) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            onProgress(percentComplete);
          }
        };
        
        xhr.onreadystatechange = () => {
          if (xhr.readyState === 4) {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const result = JSON.parse(xhr.responseText);
                
                console.log('API响应结果:', result); // 调试信息
                
                // 根据API文档，状态字段可能是字符串类型
                if (result.status !== 'success' && result.status !== 200 && result.status !== true) {
                  reject(new Error(result.message || `上传失败: ${JSON.stringify(result)}`));
                  return;
                }
                
                // 返回标准化的对象，确保包含必要的URL字段
                resolve({
                  data: result.data,
                  success: true,
                  url: result.data?.public_url || result.data?.links?.url || result.links?.url || result.url || '',
                  thumbnailUrl: result.data?.thumbnail_url || result.data?.links?.thumbnail || result.links?.thumbnail || ''
                });
              } catch (e) {
                reject(new Error(`解析响应失败: ${e.message}`));
              }
            } else {
              // 尝试获取错误信息
              let errorMessage = `HTTP错误: ${xhr.status}`;
              try {
                const errorResponse = JSON.parse(xhr.responseText);
                errorMessage = errorResponse.message || errorMessage;
              } catch (e) {
                errorMessage = xhr.responseText || errorMessage;
              }
              reject(new Error(errorMessage));
            }
          }
        };
        
        xhr.onerror = () => {
          reject(new Error('网络错误，上传失败'));
        };
        
        xhr.ontimeout = () => {
          reject(new Error('上传超时'));
        };
        
        xhr.send(formData);
      });
    } catch (error) {
      console.error('上传图片时发生错误:', error.message);
      // 重新抛出错误，但提供更具体的错误信息
      if (error.message.includes('500')) {
        throw new Error(`服务器错误: ${error.message}。可能原因：1) API URL格式不正确 2) 服务器内部错误 3) 存储策略ID无效。请确认兰空图床实例正常运行并检查配置。`);
      }
      throw error;
    }
  }
}

// 并发控制器
class ConcurrencyController {
  constructor(limit) {
    this.limit = limit;
    this.running = 0;
    this.queue = [];
  }

  async add(task) {
    return new Promise((resolve, reject) => {
      this.queue.push({
        task,
        resolve,
        reject
      });
      this.process();
    });
  }

  async process() {
    if (this.running >= this.limit || this.queue.length === 0) {
      return;
    }

    this.running++;
    const { task, resolve, reject } = this.queue.shift();

    try {
      const result = await task();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.running--;
      this.process();
    }
  }
}

// 主应用类
class App {
  constructor() {
    this.fileHandler = new FileHandler();
    this.uploadResults = [];
    this.isUploading = false;
    this.currentAbortController = null;
    this.startTime = null;
    this.fileProgressMap = new Map(); // 存储每个文件的进度信息
    
    this.setupEventListeners();
  }

  setupEventListeners() {
    document.getElementById('startUploadBtn').addEventListener('click', () => {
      this.startUpload();
    });
    
    document.getElementById('cancelUploadBtn').addEventListener('click', () => {
      this.cancelUpload();
    });
    
    document.getElementById('retryUploadBtn').addEventListener('click', () => {
      this.retryFailedUploads();
    });
    
    document.getElementById('downloadExcelBtn').addEventListener('click', () => {
      this.downloadExcelReport();
    });
    
    document.getElementById('clearAllResultsBtn').addEventListener('click', () => {
      this.clearAllResults();
    });
    
    document.getElementById('clearSuccessResultsBtn').addEventListener('click', () => {
      this.clearSuccessResults();
    });
    
    // 添加文件进度面板切换功能
    document.getElementById('toggleFileProgress').addEventListener('click', () => {
      const container = document.getElementById('fileProgressContainer');
      if (container.style.display === 'none' || container.style.display === '') {
        container.style.display = 'block';
      } else {
        container.style.display = 'none';
      }
    });
  }
  

  
  cancelUpload() {
    // 取消上传操作
    this.isUploading = false;
    this.updateUploadStatus('上传已取消');
    
    // 更新按钮状态
    document.getElementById('startUploadBtn').disabled = false;
    document.getElementById('cancelUploadBtn').disabled = true;
    document.getElementById('retryUploadBtn').disabled = this.uploadResults.filter(result => result.status.includes('失败')).length === 0; // 允许重试失败的文件
    document.getElementById('clearAllResultsBtn').disabled = this.uploadResults.length === 0;
    document.getElementById('clearSuccessResultsBtn').disabled = this.uploadResults.every(result => result.status.includes('失败'));
  }
  
  retryFailedUploads() {
    // 重试失败的上传
    const failedResults = this.uploadResults.filter(result => result.status.includes('失败'));
    
    if (failedResults.length === 0) {
      this.showSuccess('没有失败的上传需要重试');
      document.getElementById('retryUploadBtn').disabled = true;
      return;
    }
    
    // 重新开始上传，只包括失败的文件
    this.retryUploadWithFailedFiles(failedResults);
  }
  
  async retryUploadWithFailedFiles(failedResults) {
    // 获取配置信息
    const apiUrl = document.getElementById('apiUrl').value.trim();
    const token = document.getElementById('token').value.trim();
    const concurrency = parseInt(document.getElementById('concurrency').value);
    const permission = parseInt(document.getElementById('permission').value);
    
    if (!apiUrl || !token) {
      this.showError('API配置信息不完整');
      return;
    }
    
    // 更新按钮状态
    document.getElementById('startUploadBtn').disabled = true;
    document.getElementById('cancelUploadBtn').disabled = false;
    document.getElementById('retryUploadBtn').disabled = true;
    
    // 重新初始化上传状态
    this.isUploading = true;
    this.startTime = new Date();
    
    // 获取原始文件列表中的失败文件
    const allSelectedFiles = this.fileHandler.getSelectedFiles();
    const failedFileNames = failedResults.map(result => result.originalName);
    const filesToRetry = allSelectedFiles.filter(file => failedFileNames.includes(file.name));
    
    if (filesToRetry.length === 0) {
      this.showSuccess('未找到对应的失败文件进行重试');
      return;
    }
    
    // 获取API客户端
    const apiClient = new ApiClient(apiUrl, token);
    
    // 初始化并发控制器
    const controller = new ConcurrencyController(concurrency);
    
    // 更新UI状态
    this.updateUploadStatus(`重试 ${filesToRetry.length} 个失败的上传...`);
    
    const totalFiles = filesToRetry.length;
    let completedFiles = 0;
    let successCount = 0;
    let errorCount = 0;
    
    // 初始化每文件进度显示（仅针对重试的文件）
    this.initFileProgressDisplay(filesToRetry);
    
    // 为每个需要重试的文件创建上传任务
    const uploadPromises = filesToRetry.map(async (file) => {
      if (!this.isUploading) {
        return null;
      }
      
      // 更新当前文件状态
      this.updateCurrentFileWithProgress(`重试: ${file.name}`);
      this.updateFileProgress(file.name, 0, '准备重试');
      
      try {
        const result = await controller.add(async () => {
          if (!this.isUploading) {
            throw new Error('上传已停止');
          }
          
          // 重试机制
          let attempts = 0;
          const maxAttempts = 3;
          
          while (attempts < maxAttempts) {
            try {
              // 根据API文档，v2版本使用storage_id而不是permission
              return await apiClient.uploadImage(file, { storage_id: permission }, (progress) => {
                // 更新进度显示
                this.updateCurrentFileWithProgress(`重试: ${file.name}`, progress);
                this.updateFileProgress(file.name, progress, '重试中');
              });
            } catch (error) {
              attempts++;
              if (attempts >= maxAttempts) {
                throw error;
              }
              
              // 等待一段时间后重试
              await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
            }
          }
        });
        
        // 成功上传的结果 - 更新现有的结果记录
        const uploadResult = {
          originalName: file.name,
          folderName: file.folderName || '根目录',
          size: this.formatFileSize(file.size),
          status: '成功',
          url: result.url || result.data?.public_url || result.data?.links?.url || result.links?.url || '',
          thumbnailUrl: result.thumbnailUrl || result.data?.thumbnail_url || result.data?.links?.thumbnail || result.links?.thumbnail || ''
        };
        
        // 更新文件进度为完成
        this.updateFileProgress(file.name, 100, '完成');
        
        // 查找原始的索引位置，基于文件名和文件夹名的组合来精确定位
        const originalFileEntry = allSelectedFiles.find(f => f.name === file.name && f.webkitRelativePath === file.webkitRelativePath);
        if (originalFileEntry) {
          // 如果找到了原始文件条目，获取其在原始列表中的索引
          const originalIndex = allSelectedFiles.indexOf(originalFileEntry);
          // 更新对应索引位置的结果
          if (originalIndex >= 0 && originalIndex < this.uploadResults.length) {
            this.uploadResults[originalIndex] = { ...uploadResult, index: originalIndex };
          }
        } else {
          // 如果找不到原始条目，尝试通过文件名查找
          const existingIndex = this.uploadResults.findIndex(r => r.originalName === file.name);
          if (existingIndex !== -1) {
            // 保留原始索引位置
            this.uploadResults[existingIndex] = { ...uploadResult, index: this.uploadResults[existingIndex]?.index };
          } else {
            this.uploadResults.push({ ...uploadResult, index: this.uploadResults.length });
          }
        }
        
        // 重新渲染结果表格
        this.refreshResultsTable();
        
        completedFiles++;
        successCount++;
        const progress = Math.round((completedFiles / totalFiles) * 100);
        this.updateProgress(progress);
        
        const elapsed = new Date() - this.startTime;
        const rate = completedFiles / (elapsed / 1000); // 上传速度（文件/秒）
        const remaining = totalFiles - completedFiles;
        const eta = rate > 0 ? Math.ceil(remaining / rate) : 0;
        
        this.updateUploadStatus(`重试进度: ${completedFiles}/${totalFiles} (成功: ${successCount}, 失败: ${errorCount}) - 预计剩余: ${this.formatTime(eta)}`);
        
        return uploadResult;
      } catch (error) {
        // 失败的结果 - 更新现有的结果记录
        const uploadResult = {
          originalName: file.name,
          folderName: file.folderName || '根目录',
          size: this.formatFileSize(file.size),
          status: `失败: ${error.message}`,
          url: ''
        };
        
        // 更新文件进度为失败
        this.updateFileProgress(file.name, 0, `失败: ${error.message.split(':')[0]}`);
        
        // 查找原始的索引位置，基于文件名和文件夹名的组合来精确定位
        const originalFileEntry = allSelectedFiles.find(f => f.name === file.name && f.webkitRelativePath === file.webkitRelativePath);
        if (originalFileEntry) {
          // 如果找到了原始文件条目，获取其在原始列表中的索引
          const originalIndex = allSelectedFiles.indexOf(originalFileEntry);
          // 更新对应索引位置的结果
          if (originalIndex >= 0 && originalIndex < this.uploadResults.length) {
            this.uploadResults[originalIndex] = { ...uploadResult, index: originalIndex };
          }
        } else {
          // 如果找不到原始条目，尝试通过文件名查找
          const existingIndex = this.uploadResults.findIndex(r => r.originalName === file.name);
          if (existingIndex !== -1) {
            // 保留原始索引位置
            this.uploadResults[existingIndex] = { ...uploadResult, index: this.uploadResults[existingIndex]?.index };
          } else {
            this.uploadResults.push({ ...uploadResult, index: this.uploadResults.length });
          }
        }
        
        // 重新渲染结果表格
        this.refreshResultsTable();
        
        completedFiles++;
        errorCount++;
        const progress = Math.round((completedFiles / totalFiles) * 100);
        this.updateProgress(progress);
        
        const elapsed = new Date() - this.startTime;
        const rate = completedFiles / (elapsed / 1000); // 上传速度（文件/秒）
        const remaining = totalFiles - completedFiles;
        const eta = rate > 0 ? Math.ceil(remaining / rate) : 0;
        
        this.updateUploadStatus(`重试进度: ${completedFiles}/${totalFiles} (成功: ${successCount}, 失败: ${errorCount}) - 预计剩余: ${this.formatTime(eta)}`);
        
        console.error(`重试上传文件 ${file.name} 失败:`, error);
        
        return uploadResult;
      }
    });
    
    try {
      await Promise.all(uploadPromises);
      
      if (this.isUploading) {
        this.updateUploadStatus(`重试完成！成功: ${successCount}, 失败: ${errorCount}, 总耗时: ${this.formatTime((new Date() - this.startTime) / 1000)}`);
        document.getElementById('downloadExcelBtn').disabled = this.uploadResults.length === 0;
      } else {
        this.updateUploadStatus(`重试已停止！成功: ${successCount}, 失败: ${errorCount}`);
      }
    } catch (error) {
      this.updateUploadStatus(`重试过程中发生错误: ${error.message}`);
      console.error('重试过程错误:', error);
    } finally {
      // 更新按钮状态
      document.getElementById('startUploadBtn').disabled = false;
      document.getElementById('cancelUploadBtn').disabled = true;
      document.getElementById('retryUploadBtn').disabled = this.uploadResults.filter(result => result.status.includes('失败')).length === 0;
      document.getElementById('downloadExcelBtn').disabled = this.uploadResults.length === 0;
      document.getElementById('clearAllResultsBtn').disabled = this.uploadResults.length === 0;
      document.getElementById('clearSuccessResultsBtn').disabled = this.uploadResults.every(result => result.status.includes('失败'));
      this.isUploading = false;
    }
  }
  
  refreshResultsTable() {
    // 清空表格
    document.getElementById('resultsBody').innerHTML = '';
    
    // 为了优化性能，只显示最新的结果，或者限制显示数量
    // 对于大量文件，可以选择显示全部或分页显示
    const resultsToShow = this.uploadResults.slice(-500); // 只显示最新的500条
    
    // 批量创建DOM元素以提高性能
    const fragment = document.createDocumentFragment();
    
    resultsToShow.forEach((result, index) => {
      const row = document.createElement('tr');
      
      const indexCell = document.createElement('td');
      indexCell.textContent = index + 1;
      
      const nameCell = document.createElement('td');
      nameCell.textContent = result.folderName || result.originalName || '未知文件';
      nameCell.title = result.originalName || '未知文件'; // 鼠标悬停显示完整文件名
      
      const sizeCell = document.createElement('td');
      sizeCell.textContent = result.size || '未知大小';
      
      const statusCell = document.createElement('td');
      const statusValue = result.status || '未知状态';
      statusCell.className = statusValue.includes('失败') ? 'status-error' : 'status-success';
      statusCell.textContent = statusValue;
      
      const urlCell = document.createElement('td');
      if (result.url) {
        const link = document.createElement('a');
        link.href = result.url;
        link.target = '_blank';
        link.className = 'url-link';
        link.textContent = '查看图片';
        urlCell.appendChild(link);
      } else {
        urlCell.textContent = '-';
      }
      
      row.appendChild(indexCell);
      row.appendChild(nameCell);
      row.appendChild(sizeCell);
      row.appendChild(statusCell);
      row.appendChild(urlCell);
      
      fragment.appendChild(row);
    });
    
    document.getElementById('resultsBody').appendChild(fragment);
    
    // 更新按钮状态
    document.getElementById('downloadExcelBtn').disabled = this.uploadResults.length === 0;
    document.getElementById('clearAllResultsBtn').disabled = this.uploadResults.length === 0;
    document.getElementById('clearSuccessResultsBtn').disabled = this.uploadResults.every(result => result.status.includes('失败'));
  }
  
  clearAllResults() {
    // 清除所有上传结果
    this.uploadResults = [];
    
    // 清空结果表格
    document.getElementById('resultsBody').innerHTML = '';
    
    // 更新按钮状态
    document.getElementById('downloadExcelBtn').disabled = true;
    document.getElementById('clearAllResultsBtn').disabled = true;
    document.getElementById('clearSuccessResultsBtn').disabled = true;
    
    // 更新状态信息
    this.updateUploadStatus('所有上传结果已清空');
  }
  
  clearSuccessResults() {
    // 只清除成功的上传结果
    const failedResults = this.uploadResults.filter(result => result.status.includes('失败'));
    
    // 更新上传结果数组，只保留失败的结果
    this.uploadResults = failedResults;
    
    // 重新渲染结果表格
    this.refreshResultsTable();
    
    // 更新按钮状态
    document.getElementById('downloadExcelBtn').disabled = this.uploadResults.length === 0;
    document.getElementById('clearAllResultsBtn').disabled = this.uploadResults.length === 0;
    document.getElementById('clearSuccessResultsBtn').disabled = this.uploadResults.every(result => result.status.includes('失败'));
    
    // 更新状态信息
    this.updateUploadStatus(`成功上传结果已清空，保留了 ${failedResults.length} 个失败项`);
  }

  async startUpload() {
    // 获取配置信息
    const apiUrl = document.getElementById('apiUrl').value.trim();
    const token = document.getElementById('token').value.trim();
    const concurrency = parseInt(document.getElementById('concurrency').value);
    const permission = parseInt(document.getElementById('permission').value);
    
    if (!apiUrl) {
      this.showError('请输入API地址');
      return;
    }
    
    if (!token) {
      this.showError('请输入API令牌');
      return;
    }
    
    if (this.fileHandler.getSelectedFiles().length === 0) {
      this.showError('请选择要上传的文件');
      return;
    }
    
    // 更新按钮状态
    this.setUploadButtonsState(true);
    
    // 初始化上传状态
    this.isUploading = true;
    this.uploadResults = []; // 初始化为空数组
    this.startTime = new Date();
    
    // 清空结果表格
    document.getElementById('resultsBody').innerHTML = '';
    
    // 获取API客户端
    const apiClient = new ApiClient(apiUrl, token);
    
    // 初始化并发控制器
    const controller = new ConcurrencyController(concurrency);
    
    // 更新UI状态
    this.updateUploadStatus('准备上传...');
    this.updateProgress(0);
    
    const files = this.fileHandler.getSelectedFiles();
    const totalFiles = files.length;
    let completedFiles = 0;
    let successCount = 0;
    let errorCount = 0;
    
    // 初始化每文件进度显示
    this.initFileProgressDisplay(files);
    
    // 预先创建有序的结果数组，保持原始文件顺序
    const orderedResults = new Array(totalFiles);
    
    // 为每个文件创建上传任务
    const uploadPromises = files.map(async (file, index) => {
      if (!this.isUploading) {
        return null;
      }
      
      // 更新当前文件状态
      this.updateCurrentFileWithProgress(file.name);
      this.updateFileProgress(file.name, 0, '准备中');
      
      try {
        const result = await controller.add(async () => {
          if (!this.isUploading) {
            throw new Error('上传已停止');
          }
          
          // 添加重试机制
          let attempts = 0;
          const maxAttempts = 3;
          
          while (attempts < maxAttempts) {
            try {
              // 根据API文档，v2版本使用storage_id而不是permission
              return await apiClient.uploadImage(file, { storage_id: permission }, (progress) => {
                // 更新进度显示
                this.updateCurrentFileWithProgress(file.name, progress);
                this.updateFileProgress(file.name, progress, '上传中');
              });
            } catch (error) {
              attempts++;
              if (attempts >= maxAttempts) {
                throw error;
              }
              
              // 等待一段时间后重试
              await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
            }
          }
        });
        
        // 成功上传的结果，根据兰空图床API文档访问响应数据
        const uploadResult = {
          originalName: file.name,
          folderName: file.folderName || '根目录',
          size: this.formatFileSize(file.size),
          status: '成功',
          url: result.url || result.data?.public_url || result.data?.links?.url || result.links?.url || '',
          thumbnailUrl: result.thumbnailUrl || result.data?.thumbnail_url || result.data?.links?.thumbnail || result.links?.thumbnail || '',
          index: index // 记录原始索引位置
        };
        
        // 更新文件进度为完成
        this.updateFileProgress(file.name, 100, '完成');
        
        // 按原始顺序插入结果
        orderedResults[index] = uploadResult;
        
        // 更新实际的uploadResults数组，保持顺序（仅包含已完成的项目）
        this.uploadResults = orderedResults.filter(item => item !== undefined);
        
        this.addResultToTable(uploadResult);
        
        completedFiles++;
        successCount++;
        const progress = Math.round((completedFiles / totalFiles) * 100);
        this.updateProgress(progress);
        
        const elapsed = new Date() - this.startTime;
        const rate = completedFiles / (elapsed / 1000); // 上传速度（文件/秒）
        const remaining = totalFiles - completedFiles;
        const eta = rate > 0 ? Math.ceil(remaining / rate) : 0;
        
        this.updateUploadStatus(`已上传 ${completedFiles}/${totalFiles} 个文件 (成功: ${successCount}, 失败: ${errorCount}) - 预计剩余: ${this.formatTime(eta)}`);
        
        return uploadResult;
      } catch (error) {
        // 失败的结果
        const uploadResult = {
          originalName: file.name,
          folderName: file.folderName || '根目录',
          size: this.formatFileSize(file.size),
          status: `失败: ${error.message}`,
          url: '',
          index: index // 记录原始索引位置
        };
        
        // 更新文件进度为失败
        this.updateFileProgress(file.name, 0, `失败: ${error.message.split(':')[0]}`);
        
        // 按原始顺序插入结果
        orderedResults[index] = uploadResult;
        
        // 更新实际的uploadResults数组，保持顺序（仅包含已完成的项目）
        this.uploadResults = orderedResults.filter(item => item !== undefined);
        
        this.addResultToTable(uploadResult);
        
        completedFiles++;
        errorCount++;
        const progress = Math.round((completedFiles / totalFiles) * 100);
        this.updateProgress(progress);
        
        const elapsed = new Date() - this.startTime;
        const rate = completedFiles / (elapsed / 1000); // 上传速度（文件/秒）
        const remaining = totalFiles - completedFiles;
        const eta = rate > 0 ? Math.ceil(remaining / rate) : 0;
        
        this.updateUploadStatus(`已上传 ${completedFiles}/${totalFiles} 个文件 (成功: ${successCount}, 失败: ${errorCount}) - 预计剩余: ${this.formatTime(eta)}`);
        
        console.error(`上传文件 ${file.name} 失败:`, error);
        
        return uploadResult;
      }
    });
    
    try {
      await Promise.all(uploadPromises);
      
      // 最后确保uploadResults包含所有结果且按原始顺序排列
      this.uploadResults = orderedResults;
      
      if (this.isUploading) {
        this.updateUploadStatus(`上传完成！成功: ${successCount}, 失败: ${errorCount}, 总耗时: ${this.formatTime((new Date() - this.startTime) / 1000)}`);
        document.getElementById('downloadExcelBtn').disabled = false;
      } else {
        this.updateUploadStatus(`上传已停止！成功: ${successCount}, 失败: ${errorCount}`);
      }
    } catch (error) {
      this.updateUploadStatus(`上传过程中发生错误: ${error.message}`);
      console.error('上传过程错误:', error);
    } finally {
      // 更新按钮状态
      document.getElementById('startUploadBtn').disabled = false;
      document.getElementById('cancelUploadBtn').disabled = true;
      document.getElementById('retryUploadBtn').disabled = this.uploadResults.filter(result => result.status.includes('失败')).length === 0;
      document.getElementById('downloadExcelBtn').disabled = this.uploadResults.length === 0;
      document.getElementById('clearAllResultsBtn').disabled = this.uploadResults.length === 0;
      document.getElementById('clearSuccessResultsBtn').disabled = this.uploadResults.every(result => result.status.includes('失败'));
      this.isUploading = false;
    }
  }

  setUploadButtonsState(uploading) {
    document.getElementById('startUploadBtn').disabled = uploading;
    document.getElementById('cancelUploadBtn').disabled = !uploading;
    document.getElementById('retryUploadBtn').disabled = uploading;
    document.getElementById('downloadExcelBtn').disabled = uploading;
  }

  updateProgress(percent) {
    const progressBar = document.getElementById('uploadProgress');
    progressBar.style.width = percent + '%';
    progressBar.textContent = percent + '%';
  }

  updateUploadStatus(status) {
    document.getElementById('uploadStatus').textContent = status;
  }

  updateCurrentFile(filename) {
    document.getElementById('currentFile').textContent = filename;
  }
  
  updateCurrentFileWithProgress(filename, progress = null) {
    let displayText = filename;
    if (progress !== null) {
      displayText += ` (${progress}%)`;
    }
    document.getElementById('currentFile').textContent = displayText;
  }
  
  // 初始化文件进度显示
  initFileProgressDisplay(files) {
    const fileProgressList = document.getElementById('fileProgressList');
    fileProgressList.innerHTML = ''; // 清空现有内容
    
    files.forEach((file, index) => {
      const row = document.createElement('tr');
      row.id = `file-progress-${index}`;
      
      // 添加文件名单元格
      const nameCell = document.createElement('td');
      nameCell.textContent = file.name.length > 30 ? file.name.substring(0, 30) + '...' : file.name;
      nameCell.title = file.name; // 鼠标悬停显示完整文件名
      
      // 添加进度单元格
      const progressCell = document.createElement('td');
      const progressDiv = document.createElement('div');
      progressDiv.className = 'progress';
      progressDiv.style.height = '20px';
      
      const progressBar = document.createElement('div');
      progressBar.className = 'progress-bar';
      progressBar.role = 'progressbar';
      progressBar.style.width = '0%';
      progressBar.id = `file-progress-bar-${index}`;
      
      progressDiv.appendChild(progressBar);
      progressCell.appendChild(progressDiv);
      
      // 添加状态单元格
      const statusCell = document.createElement('td');
      statusCell.id = `file-status-${index}`;
      statusCell.textContent = '等待';
      statusCell.className = 'text-muted';
      
      row.appendChild(nameCell);
      row.appendChild(progressCell);
      row.appendChild(statusCell);
      fileProgressList.appendChild(row);
      
      // 初始化文件进度数据
      this.fileProgressMap.set(file.name, {
        index: index,
        progress: 0,
        status: '等待'
      });
    });
    
    // 显示文件进度容器
    document.getElementById('fileProgressContainer').style.display = 'block';
  }
  
  // 更新单个文件的进度
  updateFileProgress(filename, progress, status = null) {
    const fileInfo = this.fileProgressMap.get(filename);
    if (fileInfo) {
      const progressBar = document.getElementById(`file-progress-bar-${fileInfo.index}`);
      const statusCell = document.getElementById(`file-status-${fileInfo.index}`);
      
      if (progressBar) {
        progressBar.style.width = `${progress}%`;
        progressBar.textContent = `${progress}%`;
      }
      
      if (statusCell && status) {
        statusCell.textContent = status;
        // 根据状态设置不同的CSS类
        statusCell.className = '';
        if (status === '完成') {
          statusCell.classList.add('text-success');
        } else if (status.includes('失败')) {
          statusCell.classList.add('text-danger');
        } else if (status === '上传中') {
          statusCell.classList.add('text-primary');
        } else {
          statusCell.classList.add('text-muted');
        }
      }
      
      // 更新映射中的数据
      fileInfo.progress = progress;
      if (status) {
        fileInfo.status = status;
      }
      this.fileProgressMap.set(filename, fileInfo);
    }
  }

  addResultToTable(result) {
    const tbody = document.getElementById('resultsBody');
    
    // 为了优化性能，限制表格行数，超过一定数量后滚动显示
    // 只保留最近的500条记录在DOM中，以避免性能问题
    if (tbody.children.length >= 500) {
      // 删除最旧的一半记录
      const rowsToRemove = Math.floor(tbody.children.length / 2);
      for (let i = 0; i < rowsToRemove; i++) {
        tbody.removeChild(tbody.firstChild);
      }
      
      // 重新设置序号
      for (let i = 0; i < tbody.children.length; i++) {
        const firstCell = tbody.children[i].firstChild;
        firstCell.textContent = i + 1;
      }
    }
    
    const row = document.createElement('tr');
    
    const indexCell = document.createElement('td');
    indexCell.textContent = tbody.children.length + 1;
    
    const nameCell = document.createElement('td');
    nameCell.textContent = result.folderName || result.originalName || '未知文件';
    nameCell.title = result.originalName || '未知文件'; // 鼠标悬停显示完整文件名
    
    const sizeCell = document.createElement('td');
    sizeCell.textContent = result.size || '未知大小';
    
    const statusCell = document.createElement('td');
    const statusValue = result.status || '未知状态';
    statusCell.className = statusValue.includes('失败') ? 'status-error' : 'status-success';
    statusCell.textContent = statusValue;
    
    const urlCell = document.createElement('td');
    if (result.url) {
      const link = document.createElement('a');
      link.href = result.url;
      link.target = '_blank';
      link.className = 'url-link';
      link.textContent = '查看图片';
      urlCell.appendChild(link);
    } else {
      urlCell.textContent = '-';
    }
    
    row.appendChild(indexCell);
    row.appendChild(nameCell);
    row.appendChild(sizeCell);
    row.appendChild(statusCell);
    row.appendChild(urlCell);
    
    tbody.appendChild(row);
  }

  async downloadExcelReport() {
    if (this.uploadResults.length > 0) {
      try {
        await ExcelGenerator.generate(this.uploadResults);
      } catch (error) {
        console.warn('Excel生成失败，使用CSV格式:', error);
        // 使用CSV作为备选方案
        ExcelGenerator.generateCSV(this.uploadResults);
      }
    } else {
      this.showError('没有数据可供导出');
    }
  }

  showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger alert-dismissible fade show';
    errorDiv.innerHTML = `
      <strong>错误!</strong> ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.getElementById('alertsContainer').appendChild(errorDiv);
    
    // 5秒后自动移除
    setTimeout(() => {
      errorDiv.remove();
    }, 5000);
  }
  
  showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'alert alert-success alert-dismissible fade show';
    successDiv.innerHTML = `
      <strong>成功!</strong> ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.getElementById('alertsContainer').appendChild(successDiv);
    
    // 3秒后自动移除
    setTimeout(() => {
      successDiv.remove();
    }, 3000);
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    
    if (h > 0) {
      return `${h}小时${m}分钟${s}秒`;
    } else if (m > 0) {
      return `${m}分钟${s}秒`;
    } else {
      return `${s}秒`;
    }
  }
}

// 从本地存储加载配置
function loadConfigFromStorage() {
  const savedConfig = localStorage.getItem('lskyConfig');
  if (savedConfig) {
    try {
      const config = JSON.parse(savedConfig);
      if (config.apiUrl) {
        document.getElementById('apiUrl').value = config.apiUrl;
      }
      if (config.token) {
        document.getElementById('token').value = config.token;
      }
      if (config.concurrency) {
        document.getElementById('concurrency').value = config.concurrency;
      }
      console.log('已从本地存储加载配置');
    } catch (e) {
      console.error('加载配置失败:', e);
    }
  }
}

// 保存配置到本地存储
function saveConfigToStorage() {
  const config = {
    apiUrl: document.getElementById('apiUrl').value.trim(),
    token: document.getElementById('token').value.trim(),
    concurrency: document.getElementById('concurrency').value
  };
  
  try {
    localStorage.setItem('lskyConfig', JSON.stringify(config));
    console.log('配置已保存到本地存储');
  } catch (e) {
    console.error('保存配置失败:', e);
  }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
  // 先从本地存储加载配置
  loadConfigFromStorage();
  
  window.app = new App();
  
  // 当API URL、Token或并发数改变时，保存到本地存储并尝试加载存储策略
  document.getElementById('apiUrl').addEventListener('change', () => {
    saveConfigToStorage();
    loadStorageStrategies();
  });
  
  document.getElementById('token').addEventListener('change', () => {
    saveConfigToStorage();
    loadStorageStrategies();
  });
  
  document.getElementById('concurrency').addEventListener('change', saveConfigToStorage);
});

// 加载存储策略到下拉菜单
async function loadStorageStrategies() {
  const apiUrl = document.getElementById('apiUrl').value.trim();
  const token = document.getElementById('token').value.trim();
  
  if (!apiUrl || !token) {
    console.log('API URL和Token不能为空');
    return;
  }
  
  try {
    const apiClient = new ApiClient(apiUrl, token);
    const strategies = await apiClient.getStorageStrategies();
    
    const selectElement = document.getElementById('permission');
    
    // 清空现有选项
    selectElement.innerHTML = '';
    
    // 添加新选项
    strategies.forEach(strategy => {
      const option = document.createElement('option');
      option.value = strategy.id;
      option.textContent = `${strategy.name} (${strategy.provider})`;
      selectElement.appendChild(option);
    });
    
    // 如果没有可用策略，添加一个默认选项
    if (strategies.length === 0) {
      const option = document.createElement('option');
      option.value = '1';
      option.textContent = '默认存储 (local)';
      selectElement.appendChild(option);
    }
    
    // 设置第一个选项为选中状态
    if (selectElement.options.length > 0) {
      selectElement.options[0].selected = true;
    }
    
    console.log('存储策略加载完成:', strategies);
  } catch (error) {
    console.error('加载存储策略失败:', error);
    
    const selectElement = document.getElementById('permission');
    
    // 出错时提供一些基本选项
    selectElement.innerHTML = '';
    
    const option1 = document.createElement('option');
    option1.value = '1';
    option1.textContent = '本地存储 (local)';
    selectElement.appendChild(option1);
    
    const option2 = document.createElement('option');
    option2.value = '2';
    option2.textContent = '远程存储 (remote)';
    selectElement.appendChild(option2);
    
    selectElement.options[0].selected = true;
  }
}
# Node.js 内部接口

## 1. 概述

本文档定义 Node.js 上传核心的内部接口，这些接口不直接暴露给前端，而是通过 Rust 桥接层调用。

---

## 2. 上传引擎 (UploadEngine)

### 2.1 类定义

```typescript
class UploadEngine extends EventEmitter {
  constructor(options: UploadEngineOptions);
  
  // 核心方法
  start(files: UploadFile[]): Promise<UploadTask[]>;
  pause(taskIds?: string[]): Promise<void>;
  resume(taskIds?: string[]): Promise<void>;
  cancel(taskIds?: string[]): Promise<void>;
  
  // 状态查询
  getTask(taskId: string): UploadTask | undefined;
  getTasks(): UploadTask[];
  getActiveTasks(): UploadTask[];
  getQueuedTasks(): UploadTask[];
  
  // 配置
  updateConfig(config: Partial<UploadConfig>): void;
  
  // 生命周期
  destroy(): void;
}
```

### 2.2 选项

```typescript
interface UploadEngineOptions {
  concurrency: number;        // 并发数，默认 3
  retryCount: number;         // 重试次数，默认 3
  retryDelay: number;         // 重试延迟（ms），默认 1000
  chunkSize: number;          // 分片大小（字节），默认 5MB
  timeout: number;            // 超时时间（ms），默认 30000
  compress: CompressOptions;  // 压缩选项
  proxy: ProxyOptions;        // 代理选项
}
```

### 2.3 文件类型

```typescript
interface UploadFile {
  path: string;               // 文件路径
  name: string;               // 文件名
  size: number;               // 文件大小
  type: string;               // MIME 类型
  hash?: string;              // 文件哈希（可选）
}
```

### 2.4 任务类型

```typescript
interface UploadTask {
  id: string;                 // 任务 ID
  file: UploadFile;           // 文件信息
  status: UploadStatus;       // 任务状态
  progress: number;           // 进度 0-100
  uploadedBytes: number;      // 已上传字节数
  speed: number;              // 上传速度
  error?: string;             // 错误信息
  result?: UploadResult;      // 上传结果
  retryCount: number;         // 已重试次数
  createdAt: Date;            // 创建时间
  startedAt?: Date;           // 开始时间
  completedAt?: Date;         // 完成时间
}
```

### 2.5 状态枚举

```typescript
enum UploadStatus {
  PENDING = 'pending',
  UPLOADING = 'uploading',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  PAUSED = 'paused',
}
```

### 2.6 结果类型

```typescript
interface UploadResult {
  url: string;                // 图片 URL
  thumbUrl?: string;          // 缩略图 URL
  deleteUrl?: string;         // 删除链接
  markdownUrl: string;        // Markdown 格式链接
  htmlUrl: string;            // HTML 格式链接
  bbcodeUrl: string;          // BBCode 格式链接
  width?: number;             // 图片宽度
  height?: number;            // 图片高度
  size: number;               // 文件大小
  mimeType: string;           // MIME 类型
}
```

### 2.7 事件

```typescript
// 进度事件
engine.on('progress', (task: UploadTask) => {
  // 任务进度更新
});

// 完成事件
engine.on('complete', (task: UploadTask) => {
  // 单个任务完成
});

// 错误事件
engine.on('error', (task: UploadTask, error: Error) => {
  // 任务错误
});

// 批量完成事件
engine.on('batchComplete', (stats: BatchStats) => {
  // 批量上传完成
});

// 状态变更事件
engine.on('statusChange', (task: UploadTask, oldStatus: UploadStatus) => {
  // 任务状态变更
});
```

---

## 3. 任务队列 (TaskQueue)

### 3.1 类定义

```typescript
class TaskQueue {
  constructor(options: TaskQueueOptions);
  
  // 核心方法
  add(task: QueuedTask): void;
  addBatch(tasks: QueuedTask[]): void;
  remove(taskId: string): void;
  clear(): void;
  
  // 控制方法
  start(): void;
  pause(): void;
  resume(): void;
  
  // 状态查询
  getTask(taskId: string): QueuedTask | undefined;
  getTasks(): QueuedTask[];
  getPendingTasks(): QueuedTask[];
  getRunningTasks(): QueuedTask[];
  size(): number;
  
  // 优先级
  prioritize(taskId: string): void;
  reorder(taskIds: string[]): void;
}
```

### 3.2 选项

```typescript
interface TaskQueueOptions {
  concurrency: number;        // 最大并发数
  autoStart: boolean;         // 是否自动开始
  priority: boolean;          // 是否启用优先级
}
```

### 3.3 队列任务

```typescript
interface QueuedTask {
  id: string;
  priority: number;           // 优先级，越大越优先
  execute: () => Promise<void>;
  onCancel?: () => void;
}
```

---

## 4. API 客户端 (ApiClient)

### 4.1 类定义

```typescript
class ApiClient {
  constructor(config: ApiClientConfig);
  
  // 认证
  setToken(token: string): void;
  clearToken(): void;
  
  // 连接测试
  testConnection(): Promise<ConnectionInfo>;
  
  // 存储策略
  getStrategies(): Promise<Strategy[]>;
  
  // 上传
  upload(file: UploadFile, options: UploadOptions): Promise<UploadResult>;
  
  // 相册 (v2 API: /api/v2/user/albums)
  getAlbums(): Promise<Album[]>;
  createAlbum(name: string, intro?: string): Promise<Album>;
  deleteAlbum(id: string): Promise<void>;

  // 图片 (v2 API: /api/v2/user/photos)
  getPhotos(params: PhotoListParams): Promise<PaginatedResult<Photo>>;
  deletePhotos(ids: number[]): Promise<void>;
}
```

### 4.2 配置

```typescript
interface ApiClientConfig {
  baseUrl: string;            // API 基础 URL
  token: string;              // API Token
  timeout: number;            // 请求超时
  proxy?: ProxyConfig;        // 代理配置
  retry: RetryConfig;         // 重试配置
}
```

### 4.3 连接信息

```typescript
interface ConnectionInfo {
  version: string;            // 服务端版本
  title: string;              // 站点标题
  description: string;        // 站点描述
  strategies: Strategy[];     // 存储策略
  maxFileSize: number;        // 最大文件大小
  allowedTypes: string[];     // 允许的文件类型
}
```

---

## 5. Token 管理 (TokenManager)

### 5.1 类定义

```typescript
class TokenManager {
  constructor(storage: SecureStorage);
  
  // Token 管理
  setToken(token: string): Promise<void>;
  getToken(): Promise<string | null>;
  clearToken(): Promise<void>;
  
  // 验证
  validateToken(token: string): Promise<boolean>;
  
  // 加密
  encrypt(data: string): Promise<string>;
  decrypt(data: string): Promise<string>;
}
```

### 5.2 安全存储接口

```typescript
interface SecureStorage {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}
```

---

## 6. 相册管理 (AlbumManager)

### 6.1 类定义

```typescript
class AlbumManager {
  constructor(apiClient: ApiClient, db: Database);
  
  // 相册操作
  list(): Promise<Album[]>;
  create(name: string, description?: string): Promise<Album>;
  delete(id: string): Promise<void>;
  
  // 同步
  sync(): Promise<SyncResult>;
  
  // 缓存
  getCached(): Promise<Album[]>;
  clearCache(): Promise<void>;
}
```

### 6.2 同步结果

```typescript
interface SyncResult {
  synced: number;
  created: number;
  updated: number;
  deleted: number;
}
```

---

## 7. 历史记录 (HistoryManager)

### 7.1 类定义

```typescript
class HistoryManager {
  constructor(db: Database);
  
  // 查询
  list(params: HistoryQueryParams): Promise<PaginatedResult<HistoryRecord>>;
  search(query: string, limit?: number): Promise<HistoryRecord[]>;
  getById(id: string): Promise<HistoryRecord | null>;
  
  // 操作
  create(record: CreateHistoryDTO): Promise<HistoryRecord>;
  update(id: string, updates: UpdateHistoryDTO): Promise<HistoryRecord>;
  delete(id: string): Promise<void>;
  clear(params?: ClearHistoryParams): Promise<number>;
  
  // 统计
  count(): Promise<number>;
  getStats(): Promise<HistoryStats>;
  
  // 导出
  export(format: ExportFormat, ids?: string[]): Promise<string>;
}
```

### 7.2 查询参数

```typescript
interface HistoryQueryParams {
  page?: number;
  pageSize?: number;
  status?: UploadStatus;
  keyword?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: 'created_at' | 'file_name' | 'file_size';
  sortOrder?: 'asc' | 'desc';
}
```

### 7.3 统计信息

```typescript
interface HistoryStats {
  total: number;
  success: number;
  failed: number;
  totalSize: number;
  todayCount: number;
  todaySize: number;
}
```

---

## 8. 配置管理 (ConfigManager)

### 8.1 类定义

```typescript
class ConfigManager {
  constructor(db: Database);
  
  // 配置操作
  get(): Promise<AppConfig>;
  update(config: Partial<AppConfig>): Promise<AppConfig>;
  reset(): Promise<void>;
  
  // 单项操作
  getValue<K extends keyof AppConfig>(key: K): Promise<AppConfig[K]>;
  setValue<K extends keyof AppConfig>(key: K, value: AppConfig[K]): Promise<void>;
  
  // 验证
  validate(config: Partial<AppConfig>): ValidationResult;
  
  // 导入导出
  export(): Promise<string>;
  import(data: string): Promise<void>;
}
```

### 8.2 应用配置

```typescript
interface AppConfig {
  // API 配置
  apiUrl: string;
  apiToken: string;
  strategyId: string;
  albumId: string;
  
  // 上传配置
  concurrency: number;
  retryCount: number;
  retryDelay: number;
  compressEnabled: boolean;
  compressQuality: number;
  
  // 代理配置
  proxyEnabled: boolean;
  proxyUrl: string;
  
  // 界面配置
  theme: 'light' | 'dark' | 'system';
  language: string;
  autoCopyUrl: boolean;
  
  // 高级配置
  maxFileSize: number;
  allowedFileTypes: string[];
  chunkSize: number;
  timeout: number;
}
```

---

## 9. 日志系统 (Logger)

### 9.1 类定义

```typescript
class Logger {
  constructor(options: LoggerOptions);
  
  // 日志方法
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
  
  // 子日志器
  child(name: string): Logger;
  
  // 传输器
  addTransport(transport: LogTransport): void;
  removeTransport(transport: LogTransport): void;
}
```

### 9.2 选项

```typescript
interface LoggerOptions {
  level: 'debug' | 'info' | 'warn' | 'error';
  transports: LogTransport[];
  defaultContext?: Record<string, unknown>;
}
```

### 9.3 传输器接口

```typescript
interface LogTransport {
  log(entry: LogEntry): void;
  flush(): Promise<void>;
  destroy(): Promise<void>;
}

interface LogEntry {
  level: string;
  message: string;
  context?: Record<string, unknown>;
  timestamp: Date;
  source?: string;
}
```

---

## 10. 工具函数

### 10.1 文件工具

```typescript
// 文件验证
function validateFile(file: UploadFile, options: FileValidationOptions): ValidationResult;

// 文件哈希
function calculateFileHash(filePath: string, algorithm?: string): Promise<string>;

// 文件类型检测
function detectFileType(filePath: string): Promise<string>;

// 文件大小格式化
function formatFileSize(bytes: number): string;
```

### 10.2 压缩工具

```typescript
// 图片压缩
function compressImage(inputPath: string, options: CompressOptions): Promise<CompressResult>;

interface CompressOptions {
  enabled: boolean;
  quality: number;           // 1-100
  maxWidth?: number;
  maxHeight?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

interface CompressResult {
  outputPath: string;
  originalSize: number;
  compressedSize: number;
  ratio: number;
}
```

### 10.3 格式化工具

```typescript
// 链接格式化
function formatUrl(url: string, format: LinkFormat): string;

type LinkFormat = 'url' | 'markdown' | 'html' | 'bbcode';

// 示例：
// formatUrl('https://example.com/img.jpg', 'markdown')
// => '![image](https://example.com/img.jpg)'
```

### 10.4 重试工具

```typescript
function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T>;

interface RetryOptions {
  count: number;             // 最大重试次数
  delay: number;             // 重试延迟（ms）
  backoff: 'fixed' | 'exponential';  // 退避策略
  onRetry?: (error: Error, attempt: number) => void;
}
```

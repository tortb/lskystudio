# IPC 通信协议

## 1. 概述

### 1.1 通信架构

```
┌─────────────────────────────────────────────────────────────┐
│                      React Frontend                         │
│                                                             │
│  api.upload.start(files)                                    │
│         │                                                   │
│         ▼                                                   │
│  packages/api                                               │
│  invoke('upload_start', { files })                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Tauri IPC (invoke)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Rust Bridge                            │
│                                                             │
│  #[tauri::command]                                          │
│  async fn upload_start(files: Vec<UploadFile>) -> Result<>  │
│         │                                                   │
│         ▼                                                   │
│  node_manager.send_command("upload_start", files)           │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ stdin/stdout (JSON Lines)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Node.js Backend                        │
│                                                             │
│  ipc.handler.on("upload_start", async (files) => {          │
│    const tasks = await uploadEngine.start(files);           │
│    return tasks;                                            │
│  });                                                        │
│                                                             │
│  // 发送进度事件                                            │
│  ipc.sender.emit("upload_progress", { taskId, progress });  │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 通信协议

**请求格式（Rust → Node.js）：**

```json
{
  "id": "cmd_abc123",
  "method": "upload_start",
  "params": {
    "files": [
      {
        "path": "/path/to/image.jpg",
        "name": "image.jpg",
        "size": 1024000
      }
    ]
  }
}
```

**响应格式（Node.js → Rust）：**

```json
{
  "id": "cmd_abc123",
  "success": true,
  "data": {
    "tasks": [
      {
        "id": "task_xyz789",
        "fileName": "image.jpg",
        "status": "pending"
      }
    ]
  }
}
```

**事件格式（Node.js → Rust → React）：**

```json
{
  "type": "upload_progress",
  "payload": {
    "taskId": "task_xyz789",
    "progress": 45.5,
    "uploadedBytes": 465920,
    "speed": 1024000
  }
}
```

---

## 2. 命令列表

### 2.1 上传命令

#### upload_start

开始上传文件

**请求参数：**

```typescript
interface UploadStartParams {
  files: Array<{
    path: string;        // 文件路径
    name: string;        // 文件名
    size: number;        // 文件大小
    type: string;        // MIME 类型
  }>;
  albumId?: string;      // 相册 ID
  strategyId?: string;   // 存储策略 ID
}
```

**响应数据：**

```typescript
interface UploadStartResponse {
  tasks: Array<{
    id: string;          // 任务 ID
    fileName: string;    // 文件名
    status: 'pending';   // 初始状态
  }>;
}
```

**可能的错误：**

| 错误代码 | 说明 |
|----------|------|
| INVALID_FILES | 文件列表为空或格式错误 |
| FILE_NOT_FOUND | 文件不存在 |
| FILE_TOO_LARGE | 文件超过大小限制 |
| INVALID_STRATEGY | 存储策略无效 |

---

#### upload_pause

暂停上传

**请求参数：**

```typescript
interface UploadPauseParams {
  taskIds?: string[];    // 任务 ID 列表，不传则暂停所有
}
```

**响应数据：**

```typescript
interface UploadPauseResponse {
  paused: string[];      // 已暂停的任务 ID
}
```

---

#### upload_resume

继续上传

**请求参数：**

```typescript
interface UploadResumeParams {
  taskIds?: string[];    // 任务 ID 列表，不传则继续所有
}
```

**响应数据：**

```typescript
interface UploadResumeResponse {
  resumed: string[];     // 已继续的任务 ID
}
```

---

#### upload_cancel

取消上传

**请求参数：**

```typescript
interface UploadCancelParams {
  taskIds?: string[];    // 任务 ID 列表，不传则取消所有
}
```

**响应数据：**

```typescript
interface UploadCancelResponse {
  cancelled: string[];   // 已取消的任务 ID
}
```

---

#### upload_get_status

获取上传状态

**请求参数：**

```typescript
interface UploadGetStatusParams {
  taskIds?: string[];    // 任务 ID 列表，不传则获取所有
}
```

**响应数据：**

```typescript
interface UploadGetStatusResponse {
  tasks: Array<{
    id: string;
    fileName: string;
    status: 'pending' | 'uploading' | 'success' | 'failed' | 'cancelled';
    progress: number;
    uploadedBytes: number;
    totalBytes: number;
    speed: number;
    error?: string;
    url?: string;
  }>;
}
```

---

### 2.2 配置命令

#### config_get

获取配置

**请求参数：** 无

**响应数据：**

```typescript
interface ConfigGetResponse {
  apiUrl: string;
  apiToken: string;       // 脱敏后的 Token
  strategyId: string;
  albumId: string;
  concurrency: number;
  retryCount: number;
  retryDelay: number;
  proxyEnabled: boolean;
  proxyUrl: string;
  theme: 'light' | 'dark' | 'system';
  language: string;
  autoCopyUrl: boolean;
  compressEnabled: boolean;
  compressQuality: number;
}
```

---

#### config_update

更新配置

**请求参数：**

```typescript
interface ConfigUpdateParams {
  apiUrl?: string;
  apiToken?: string;
  strategyId?: string;
  albumId?: string;
  concurrency?: number;
  retryCount?: number;
  retryDelay?: number;
  proxyEnabled?: boolean;
  proxyUrl?: string;
  theme?: 'light' | 'dark' | 'system';
  language?: string;
  autoCopyUrl?: boolean;
  compressEnabled?: boolean;
  compressQuality?: number;
}
```

**响应数据：**

```typescript
interface ConfigUpdateResponse {
  success: boolean;
}
```

---

#### config_test_connection

测试 API 连接

**请求参数：**

```typescript
interface ConfigTestConnectionParams {
  apiUrl: string;
  apiToken: string;
}
```

**响应数据：**

```typescript
interface ConfigTestConnectionResponse {
  success: boolean;
  version?: string;
  strategies?: Array<{
    id: string;
    name: string;
  }>;
  error?: string;
}
```

---

#### config_get_strategies

获取存储策略列表

**请求参数：** 无

**响应数据：**

```typescript
interface ConfigGetStrategiesResponse {
  strategies: Array<{
    id: string;
    name: string;
    description: string;
  }>;
}
```

---

### 2.3 历史记录命令

#### history_list

获取历史记录列表

**请求参数：**

```typescript
interface HistoryListParams {
  page?: number;         // 页码，默认 1
  pageSize?: number;     // 每页数量，默认 20
  status?: string;       // 状态筛选
  keyword?: string;      // 关键词搜索
  startDate?: string;    // 开始日期
  endDate?: string;      // 结束日期
  sortBy?: string;       // 排序字段
  sortOrder?: 'asc' | 'desc'; // 排序方向
}
```

**响应数据：**

```typescript
interface HistoryListResponse {
  items: Array<{
    id: string;
    fileName: string;
    fileSize: number;
    fileType: string;
    status: string;
    url?: string;
    thumbUrl?: string;
    createdAt: string;
  }>;
  total: number;
  page: number;
  pageSize: number;
}
```

---

#### history_search

搜索历史记录

**请求参数：**

```typescript
interface HistorySearchParams {
  query: string;         // 搜索关键词
  limit?: number;        // 结果数量限制
}
```

**响应数据：**

```typescript
interface HistorySearchResponse {
  items: Array<{
    id: string;
    fileName: string;
    url?: string;
    createdAt: string;
  }>;
}
```

---

#### history_delete

删除历史记录

**请求参数：**

```typescript
interface HistoryDeleteParams {
  ids: string[];         // 记录 ID 列表
  permanent?: boolean;   // 是否永久删除
}
```

**响应数据：**

```typescript
interface HistoryDeleteResponse {
  deleted: number;       // 删除数量
}
```

---

#### history_clear

清空历史记录

**请求参数：**

```typescript
interface HistoryClearParams {
  before?: string;       // 清除此日期之前的记录
  status?: string;       // 清除特定状态的记录
}
```

**响应数据：**

```typescript
interface HistoryClearResponse {
  cleared: number;       // 清除数量
}
```

---

#### history_export

导出历史记录

**请求参数：**

```typescript
interface HistoryExportParams {
  format: 'csv' | 'excel' | 'json';
  ids?: string[];        // 指定记录 ID，不传则导出全部
}
```

**响应数据：**

```typescript
interface HistoryExportResponse {
  filePath: string;      // 导出文件路径
  count: number;         // 导出数量
}
```

---

### 2.4 相册命令

#### album_list

获取相册列表

**请求参数：** 无

**响应数据：**

```typescript
interface AlbumListResponse {
  albums: Array<{
    id: string;
    remoteId?: string;
    name: string;
    description: string;
    imageCount: number;
    coverUrl?: string;
    createdAt: string;
  }>;
}
```

---

#### album_create

创建相册

**请求参数：**

```typescript
interface AlbumCreateParams {
  name: string;          // 相册名称
  description?: string;  // 相册描述
}
```

**响应数据：**

```typescript
interface AlbumCreateResponse {
  album: {
    id: string;
    name: string;
    description: string;
    createdAt: string;
  };
}
```

---

#### album_delete

删除相册

**请求参数：**

```typescript
interface AlbumDeleteParams {
  id: string;            // 相册 ID
}
```

**响应数据：**

```typescript
interface AlbumDeleteResponse {
  success: boolean;
}
```

---

#### album_sync

同步远程相册

**请求参数：** 无

**响应数据：**

```typescript
interface AlbumSyncResponse {
  synced: number;        // 同步数量
  created: number;       // 新增数量
  updated: number;       // 更新数量
}
```

---

## 3. 事件列表

### 3.1 上传事件

#### upload_progress

上传进度更新

**事件数据：**

```typescript
interface UploadProgressEvent {
  taskId: string;        // 任务 ID
  fileName: string;      // 文件名
  progress: number;      // 进度 0-100
  uploadedBytes: number; // 已上传字节数
  totalBytes: number;    // 总字节数
  speed: number;         // 上传速度（字节/秒）
  remainingTime: number; // 预计剩余时间（秒）
}
```

**触发频率：** 每 100ms 或每 1% 进度更新

---

#### upload_complete

上传完成

**事件数据：**

```typescript
interface UploadCompleteEvent {
  taskId: string;        // 任务 ID
  fileName: string;      // 文件名
  url: string;           // 图片 URL
  thumbUrl?: string;     // 缩略图 URL
  deleteUrl?: string;    // 删除链接
  markdownUrl: string;   // Markdown 格式链接
  htmlUrl: string;       // HTML 格式链接
  bbcodeUrl: string;     // BBCode 格式链接
  fileSize: number;      // 文件大小
  duration: number;      // 上传耗时（毫秒）
}
```

---

#### upload_error

上传错误

**事件数据：**

```typescript
interface UploadErrorEvent {
  taskId: string;        // 任务 ID
  fileName: string;      // 文件名
  errorCode: string;     // 错误代码
  errorMessage: string;  // 错误信息
  retryable: boolean;    // 是否可重试
  retryCount: number;    // 当前重试次数
  maxRetries: number;    // 最大重试次数
}
```

---

#### upload_cancelled

上传取消

**事件数据：**

```typescript
interface UploadCancelledEvent {
  taskIds: string[];     // 已取消的任务 ID
}
```

---

#### upload_batch_complete

批量上传完成

**事件数据：**

```typescript
interface UploadBatchCompleteEvent {
  total: number;         // 总任务数
  success: number;       // 成功数
  failed: number;        // 失败数
  cancelled: number;     // 取消数
  duration: number;      // 总耗时（毫秒）
  totalSize: number;     // 总文件大小
}
```

---

### 3.2 系统事件

#### node_ready

Node.js 就绪

**事件数据：**

```typescript
interface NodeReadyEvent {
  version: string;       // Node.js 版本
  pid: number;           // 进程 ID
}
```

---

#### node_error

Node.js 错误

**事件数据：**

```typescript
interface NodeErrorEvent {
  code: string;          // 错误代码
  message: string;       // 错误信息
  stack?: string;        // 错误堆栈
}
```

---

#### node_exit

Node.js 退出

**事件数据：**

```typescript
interface NodeExitEvent {
  code: number;          // 退出代码
  signal?: string;       // 退出信号
}
```

---

#### log_message

日志消息

**事件数据：**

```typescript
interface LogMessageEvent {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
}
```

---

## 4. 错误代码

### 4.1 通用错误

| 代码 | 说明 | 可重试 |
|------|------|--------|
| UNKNOWN_ERROR | 未知错误 | 否 |
| INVALID_PARAMS | 参数无效 | 否 |
| NOT_FOUND | 资源不存在 | 否 |
| PERMISSION_DENIED | 权限不足 | 否 |
| TIMEOUT | 操作超时 | 是 |
| NETWORK_ERROR | 网络错误 | 是 |

### 4.2 上传错误

| 代码 | 说明 | 可重试 |
|------|------|--------|
| FILE_NOT_FOUND | 文件不存在 | 否 |
| FILE_TOO_LARGE | 文件过大 | 否 |
| FILE_TYPE_NOT_ALLOWED | 文件类型不允许 | 否 |
| UPLOAD_FAILED | 上传失败 | 是 |
| UPLOAD_CANCELLED | 上传已取消 | 否 |
| STORAGE_FULL | 存储空间不足 | 否 |
| QUOTA_EXCEEDED | 配额超限 | 否 |

### 4.3 认证错误

| 代码 | 说明 | 可重试 |
|------|------|--------|
| AUTH_FAILED | 认证失败 | 否 |
| TOKEN_EXPIRED | Token 过期 | 否 |
| TOKEN_INVALID | Token 无效 | 否 |

### 4.4 服务器错误

| 代码 | 说明 | 可重试 |
|------|------|--------|
| SERVER_ERROR | 服务器内部错误 | 是 |
| SERVICE_UNAVAILABLE | 服务不可用 | 是 |
| RATE_LIMITED | 请求过于频繁 | 是 |

---

## 5. 通信流程

### 5.1 上传流程

```
1. React → Rust: upload_start(files)
2. Rust → Node.js: 命令 upload_start
3. Node.js → Rust: 响应 { tasks: [...] }
4. Rust → React: 返回 tasks
5. Node.js 开始上传
6. Node.js → Rust: 事件 upload_progress
7. Rust → React: 事件 upload_progress
8. 重复 6-7 直到完成
9. Node.js → Rust: 事件 upload_complete
10. Rust → React: 事件 upload_complete
```

### 5.2 错误处理流程

```
1. Node.js 发生错误
2. Node.js → Rust: 事件 upload_error
3. Rust → React: 事件 upload_error
4. React 显示错误提示
5. 如果可重试：
   a. Node.js 自动重试
   b. Node.js → Rust: 事件 upload_progress
6. 如果不可重试：
   a. Node.js → Rust: 事件 upload_cancelled
   b. Rust → React: 事件 upload_cancelled
```

### 5.3 暂停/继续流程

```
1. React → Rust: upload_pause(taskIds)
2. Rust → Node.js: 命令 upload_pause
3. Node.js 暂停指定任务
4. Node.js → Rust: 响应 { paused: [...] }
5. Rust → React: 返回 paused
6. React → Rust: upload_resume(taskIds)
7. Rust → Node.js: 命令 upload_resume
8. Node.js 继续指定任务
9. Node.js → Rust: 响应 { resumed: [...] }
10. Rust → React: 返回 resumed
11. Node.js → Rust: 事件 upload_progress
12. Rust → React: 事件 upload_progress
```

---

## 6. 安全考虑

### 6.1 命令白名单

只允许已注册的命令：

```rust
// tauri.conf.json
{
  "app": {
    "security": {
      "dangerousRemoteUrlAccess": [
        {
          "url": "http://localhost:*"
        }
      ]
    }
  }
}
```

### 6.2 输入验证

所有参数在 Rust 层验证：

```rust
#[tauri::command]
async fn upload_start(files: Vec<UploadFile>) -> Result<UploadStartResponse, String> {
    // 验证文件列表
    if files.is_empty() {
        return Err("Files list cannot be empty".to_string());
    }
    
    // 验证文件路径
    for file in &files {
        if !Path::new(&file.path).exists() {
            return Err(format!("File not found: {}", file.path));
        }
    }
    
    // ...
}
```

### 6.3 敏感数据保护

- Token 不通过 IPC 明文传输
- 使用 Tauri 的加密存储
- 日志中脱敏处理

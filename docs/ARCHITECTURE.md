# 整体架构文档

## 1. 架构概述

Lsky Studio 采用 **分层架构** + **IPC 通信** 的设计模式，实现前后端完全解耦。

```
┌─────────────────────────────────────────────────────────────┐
│                      React Frontend                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│  │ Dashboard│ │ Upload  │ │ History │ │ Album   │          │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘          │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  API Layer (packages/api)            │   │
│  │         api.upload.start() / api.config.get()       │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ IPC (invoke / emit)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Rust Bridge (Tauri)                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  IPC Handlers                        │   │
│  │    handle_upload / handle_config / handle_history    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  System Services                     │   │
│  │    Window / Tray / Notification / File Dialog        │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Command::new / Sidecar
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Node.js Backend                        │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│  │ Upload  │ │ Token   │ │ Album   │ │ Config  │          │
│  │ Core    │ │ Manager │ │ Manager │ │ Manager │          │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘          │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  Queue / Logger / SQLite             │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 分层职责

### 2.1 React Frontend (apps/desktop/src)

**职责：** 纯 UI 展示和用户交互

**允许：**
- 调用 `packages/api` 提供的接口
- 使用 TanStack Query 管理数据
- 使用 Zustand 管理 UI 状态
- 使用 shadcn/ui 组件

**禁止：**
- 直接调用 Node.js API
- 直接访问文件系统
- 直接访问数据库
- 包含业务逻辑

---

### 2.2 API Layer (packages/api)

**职责：** 封装 IPC 调用，提供类型安全的接口

```typescript
// 示例：packages/api/src/upload.ts
export const uploadApi = {
  start(files: UploadFile[]): Promise<UploadTask[]> {
    return invoke('upload_start', { files });
  },
  
  pause(taskId: string): Promise<void> {
    return invoke('upload_pause', { taskId });
  },
  
  cancel(taskId: string): Promise<void> {
    return invoke('upload_cancel', { taskId });
  },
  
  onProgress(callback: (progress: UploadProgress) => void) {
    return listen('upload_progress', (event) => callback(event.payload));
  }
};
```

---

### 2.3 Rust Bridge (apps/desktop/src-tauri)

**职责：** 
1. 接收前端 IPC 调用
2. 调用 Node.js 子进程
3. 处理系统级功能（窗口、托盘、通知、文件对话框）
4. 管理 SQLite 数据库

**核心模块：**

```rust
// src-tauri/src/main.rs
mod commands;    // IPC 命令处理
mod node;        // Node.js 子进程管理
mod db;          // SQLite 数据库
mod window;      // 窗口管理
mod tray;        // 系统托盘
mod notification;// 系统通知
```

---

### 2.4 Node.js Backend (apps/uploader)

**职责：** 处理所有上传相关业务逻辑

**核心模块：**

```typescript
// apps/uploader/src/
├── core/
│   ├── upload.ts      // 上传引擎
│   ├── queue.ts       // 任务队列
│   ├── concurrent.ts  // 并发控制
│   └── retry.ts       // 重试策略
├── services/
│   ├── token.ts       // Token 管理
│   ├── album.ts       // 相册管理
│   ├── strategy.ts    // 存储策略
│   └── history.ts     // 历史记录
├── utils/
│   ├── logger.ts      // 日志工具
│   ├── compress.ts    // 图片压缩
│   └── clipboard.ts   // 剪贴板操作
└── index.ts           // 入口文件
```

---

## 3. IPC 通信架构

### 3.1 通信模式

```
React ──invoke──▶ Rust ──stdin/stdout──▶ Node.js
React ◀──emit─── Rust ◀──stdin/stdout─── Node.js
```

### 3.2 命令协议

```typescript
// 命令格式
interface IpcCommand {
  id: string;           // 命令 ID
  method: string;       // 方法名
  params: unknown;      // 参数
}

// 响应格式
interface IpcResponse {
  id: string;           // 命令 ID
  success: boolean;     // 是否成功
  data?: unknown;       // 返回数据
  error?: string;       // 错误信息
}

// 事件格式
interface IpcEvent {
  type: string;         // 事件类型
  payload: unknown;     // 事件数据
}
```

### 3.3 通信流程

```
1. React 调用 api.upload.start(files)
2. packages/api 封装为 invoke('upload_start', { files })
3. Rust 接收命令，转发给 Node.js
4. Node.js 处理上传，通过 stdout 发送进度事件
5. Rust 接收事件，通过 emit 发送给 React
6. React 更新 UI
```

---

## 4. 数据流架构

### 4.1 状态管理

```
┌─────────────────────────────────────────────────┐
│                  React App                       │
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │           TanStack Query                    │ │
│  │  - 服务端状态（上传任务、历史记录）          │ │
│  │  - 自动缓存、重新获取、乐观更新            │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │           Zustand                           │ │
│  │  - 客户端状态（主题、侧边栏、模态框）      │ │
│  │  - 轻量级、无 boilerplate                   │ │
│  └────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### 4.2 数据流示例

```typescript
// 上传流程数据流
1. 用户选择文件
   ↓
2. React 调用 api.upload.start(files)
   ↓
3. TanStack Query 触发 mutation
   ↓
4. IPC 调用到 Rust
   ↓
5. Rust 调用 Node.js
   ↓
6. Node.js 开始上传，返回任务 ID
   ↓
7. Rust 返回任务 ID 给 React
   ↓
8. TanStack Query 更新缓存
   ↓
9. Node.js 通过事件发送进度
   ↓
10. Rust 转发事件给 React
    ↓
11. TanStack Query 更新任务状态
    ↓
12. React 重新渲染 UI
```

---

## 5. 错误处理架构

### 5.1 错误类型

```typescript
// 错误分类
enum ErrorType {
  NETWORK = 'NETWORK',       // 网络错误
  AUTH = 'AUTH',             // 认证错误
  FILE = 'FILE',             // 文件错误
  SERVER = 'SERVER',         // 服务器错误
  TIMEOUT = 'TIMEOUT',       // 超时错误
  UNKNOWN = 'UNKNOWN',       // 未知错误
}

// 错误结构
interface AppError {
  type: ErrorType;
  code: string;
  message: string;
  details?: unknown;
  retryable: boolean;
}
```

### 5.2 错误传播

```
Node.js 错误
    ↓
Rust 捕获，封装为 AppError
    ↓
IPC 返回错误给 React
    ↓
TanStack Query onError 回调
    ↓
Toast 显示错误信息
```

---

## 6. 安全架构

### 6.1 Token 安全

- Token 使用系统 Keychain 存储（Windows Credential Manager / Linux Secret Service）
- 传输时使用 HTTPS
- 内存中使用后立即清除

### 6.2 IPC 安全

- 所有 IPC 调用使用 Tauri 的权限系统
- 白名单机制，只允许已注册的命令
- 输入参数验证

### 6.3 文件安全

- 文件路径验证，防止路径遍历
- 文件大小限制
- 文件类型检查

---

## 7. 性能架构

### 7.1 上传性能

- 并发控制：根据网络状况动态调整
- 分片上传：大文件自动分片
- 连接复用：HTTP/2 或 Keep-Alive

### 7.2 UI 性能

- 虚拟列表：大量历史记录使用虚拟滚动
- 懒加载：相册图片懒加载
- 防抖节流：进度更新防抖

### 7.3 内存管理

- 上传完成后释放文件引用
- 定期清理过期缓存
- 监控内存使用，及时告警

---

## 8. 扩展性设计

### 8.1 插件化（未来）

```
plugins/
├── compressor/     // 压缩插件
├── watermark/      // 水印插件
└── optimizer/      // 优化插件
```

### 8.2 多实例支持（未来）

- 支持多个兰空图床实例
- 实例间配置隔离
- 统一管理界面

---

## 9. 测试架构

### 9.1 测试层次

```
┌─────────────────────────────────┐
│         E2E Tests (Playwright)  │
├─────────────────────────────────┤
│      Integration Tests          │
├─────────────────────────────────┤
│         Unit Tests              │
│  - Node.js (Vitest)            │
│  - Rust (cargo test)           │
│  - React (Vitest + Testing Library) │
└─────────────────────────────────┘
```

### 9.2 测试策略

- 单元测试覆盖率 > 80%
- 集成测试覆盖核心流程
- E2E 测试覆盖关键用户路径

# UI 重构架构文档

## 架构概述

本次重构采用 **"保留后端，重构前端"** 策略，仅对用户界面进行现代化改造，不修改核心业务逻辑。

```
┌─────────────────────────────────────────────────────────────┐
│                      新前端 (React + Tailwind + shadcn)     │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  UI 组件层                           │   │
│  │  - 现代化界面                                        │   │
│  │  - 深色/浅色主题                                     │   │
│  │  - 响应式布局                                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  API 调用层                          │   │
│  │  - 保持现有接口调用方式                              │   │
│  │  - 仅调整返回数据格式（如需要）                      │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ IPC (invoke / emit)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Rust 外壳 (Tauri)                      │
│                                                             │
│  职责：                                                      │
│  ✅ 启动 Node 子进程                                        │
│  ✅ 管理 Node 子进程生命周期                                │
│  ✅ 转发 IPC 命令和事件                                     │
│  ✅ 窗口管理                                                │
│  ✅ 系统托盘（可选）                                        │
│  ✅ 应用打包                                                │
│                                                             │
│  不负责：                                                    │
│  ❌ 业务逻辑                                                │
│  ❌ 数据处理                                                │
│  ❌ 文件操作                                                │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ stdin/stdout (JSON)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      现有 Node.js 后端                      │
│                                                             │
│  保持不变：                                                  │
│  ✅ 上传核心逻辑                                            │
│  ✅ 配置管理                                                │
│  ✅ 历史记录                                                │
│  ✅ 相册管理                                                │
│  ✅ 所有现有功能                                            │
│                                                             │
│  仅添加：                                                    │
│  ➕ IPC 通信层（stdin/stdout）                              │
│  ➕ 上传进度事件                                            │
│  ➕ 日志事件                                                │
│  ➕ 版本号接口                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 组件架构

### 前端组件层次

```
src/
├── app/                          # 应用入口
│   ├── layout.tsx                # 根布局
│   ├── page.tsx                  # 首页
│   └── providers.tsx             # 全局 Provider
│
├── components/                   # 通用组件
│   ├── ui/                       # shadcn 组件（自动生成）
│   └── shared/                   # 业务共享组件
│       ├── file-dropzone.tsx     # 文件拖拽区域
│       ├── progress-card.tsx     # 进度卡片
│       └── status-badge.tsx      # 状态徽章
│
├── features/                     # 功能模块
│   ├── dashboard/                # 仪表盘
│   ├── upload/                   # 上传
│   ├── history/                  # 历史记录
│   ├── album/                    # 相册管理
│   └── settings/                 # 设置
│
├── hooks/                        # 自定义 Hooks
│   ├── use-upload.ts             # 上传 Hook
│   ├── use-history.ts            # 历史记录 Hook
│   └── use-config.ts             # 配置 Hook
│
├── lib/                          # 工具函数
│   ├── api.ts                    # API 调用封装
│   └── utils.ts                  # 通用工具
│
└── styles/                       # 样式文件
    └── globals.css               # 全局样式
```

---

## IPC 通信协议

### 命令格式（React → Rust → Node.js）

```typescript
// 请求
interface IpcRequest {
  id: string;
  method: string;
  params: unknown;
}

// 响应
interface IpcResponse {
  id: string;
  success: boolean;
  data?: unknown;
  error?: string;
}
```

### 事件格式（Node.js → Rust → React）

```typescript
interface IpcEvent {
  type: string;
  payload: unknown;
}
```

### 主要命令

| 命令 | 说明 | 参数 |
|------|------|------|
| `upload_start` | 开始上传 | `{ files: File[] }` |
| `upload_pause` | 暂停上传 | `{ taskIds?: string[] }` |
| `upload_resume` | 继续上传 | `{ taskIds?: string[] }` |
| `upload_cancel` | 取消上传 | `{ taskIds?: string[] }` |
| `config_get` | 获取配置 | - |
| `config_update` | 更新配置 | `{ config: Partial<AppConfig> }` |
| `history_list` | 获取历史 | `{ page, pageSize, status? }` |
| `album_list` | 获取相册 | - |

### 主要事件

| 事件 | 说明 | 数据 |
|------|------|------|
| `upload_progress` | 上传进度 | `{ taskId, progress, speed }` |
| `upload_complete` | 上传完成 | `{ taskId, url, ... }` |
| `upload_error` | 上传错误 | `{ taskId, error }` |
| `node_ready` | Node 就绪 | `{ version }` |
| `node_error` | Node 错误 | `{ error }` |

---

## UI 规范

### 设计风格

- **参考：** VSCode、GitHub Desktop、Linear、Notion
- **风格：** 极简、现代、圆角、留白
- **布局：** 侧边栏 + 内容区域

### 主题配置

```css
/* 浅色主题 */
--background: 0 0% 100%;
--foreground: 222.2 84% 4.9%;
--primary: 222.2 47.4% 11.2%;
--secondary: 210 40% 96.1%;

/* 深色主题 */
--background: 222.2 84% 4.9%;
--foreground: 210 40% 98%;
--primary: 210 40% 98%;
--secondary: 217.2 32.6% 17.5%;
```

### 组件规范

- 使用 shadcn/ui 组件
- 统一使用 Lucide Icons
- 响应式设计（支持侧边栏折叠）

---

## 数据流

### 上传流程

```
1. 用户选择文件（拖拽或点击）
   ↓
2. React 调用 api.upload.start(files)
   ↓
3. IPC 命令发送到 Rust
   ↓
4. Rust 转发到 Node.js
   ↓
5. Node.js 开始上传，返回任务 ID
   ↓
6. Node.js 通过事件发送进度
   ↓
7. Rust 转发事件到 React
   ↓
8. React 更新 UI 显示进度
   ↓
9. 上传完成，显示成功卡片
```

### 配置流程

```
1. React 调用 api.config.get()
   ↓
2. IPC 命令发送到 Rust
   ↓
3. Rust 转发到 Node.js
   ↓
4. Node.js 读取配置并返回
   ↓
5. Rust 返回配置到 React
   ↓
6. React 显示配置表单
   ↓
7. 用户修改配置
   ↓
8. React 调用 api.config.update(config)
   ↓
9. Node.js 保存配置
```

---

## 错误处理

### 错误类型

```typescript
enum ErrorType {
  NETWORK = 'NETWORK',       // 网络错误
  AUTH = 'AUTH',             // 认证错误
  FILE = 'FILE',             // 文件错误
  SERVER = 'SERVER',         // 服务器错误
  TIMEOUT = 'TIMEOUT',       // 超时错误
  UNKNOWN = 'UNKNOWN',       // 未知错误
}
```

### 错误传播

```
Node.js 错误
    ↓
Rust 捕获，封装为 AppError
    ↓
IPC 返回错误给 React
    ↓
Toast 显示错误信息
```

---

## 安全考虑

### Token 安全

- Token 使用 Tauri 的加密存储
- 传输时使用 IPC（不暴露给前端）
- 内存中使用后立即清除

### IPC 安全

- 所有 IPC 调用使用 Tauri 的权限系统
- 白名单机制，只允许已注册的命令
- 输入参数验证

---

## 性能优化

### 前端优化

- 虚拟列表：大量历史记录使用虚拟滚动
- 懒加载：相册图片懒加载
- 防抖节流：进度更新防抖
- 缓存：使用 TanStack Query 缓存数据

### 后端优化

- 并发控制：根据网络状况动态调整
- 连接复用：HTTP/2 或 Keep-Alive
- 内存管理：上传完成后释放文件引用

---

## 测试策略

### 前端测试

- 单元测试：组件测试（Vitest + Testing Library）
- 集成测试：页面测试
- E2E 测试：关键用户路径（Playwright）

### 后端测试

- 保持现有测试
- 添加 IPC 通信测试

### 打包测试

- Windows 安装测试
- Linux 安装测试
- 功能回归测试

---

## 部署流程

### 开发环境

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 启动 Tauri 开发模式
pnpm tauri dev
```

### 生产构建

```bash
# 构建前端
pnpm build

# 打包 Tauri 应用
pnpm tauri build
```

### 打包产物

```
Windows:
- src-tauri/target/release/bundle/msi/*.msi
- src-tauri/target/release/bundle/nsis/*.exe

Linux:
- src-tauri/target/release/bundle/deb/*.deb
- src-tauri/target/release/bundle/appimage/*.AppImage
```

---

## 附录

### A. 现有接口列表

（需要从现有 Node.js 代码中提取）

### B. 配置文件格式

（保持现有格式不变）

### C. 错误代码表

（保持现有错误代码）

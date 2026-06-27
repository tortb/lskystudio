# 项目目录结构

## 1. 顶层结构

```
lsky-studio/
├── apps/                          # 应用程序
│   ├── desktop/                   # Tauri 桌面应用
│   └── uploader/                  # Node.js 上传核心
│
├── packages/                      # 共享包
│   ├── ui/                        # shadcn 组件库
│   ├── api/                       # IPC 接口层
│   ├── types/                     # 共享类型定义
│   └── shared/                    # 共享工具函数
│
├── docs/                          # 项目文档
├── scripts/                       # 构建脚本
├── .github/                       # GitHub Actions
│
├── pnpm-workspace.yaml            # pnpm 工作空间配置
├── package.json                   # 根 package.json
├── tsconfig.json                  # 根 TypeScript 配置
├── .eslintrc.json                 # ESLint 配置
├── .prettierrc                    # Prettier 配置
└── README.md
```

---

## 2. apps/desktop (Tauri 桌面应用)

```
apps/desktop/
├── src/                           # React 前端源码
│   ├── app/                       # 应用入口
│   │   ├── layout.tsx             # 根布局
│   │   ├── page.tsx               # 首页（Dashboard）
│   │   └── providers.tsx          # 全局 Provider
│   │
│   ├── components/                # 通用组件
│   │   ├── ui/                    # shadcn 组件（自动生成）
│   │   ├── layout/                # 布局组件
│   │   │   ├── sidebar.tsx        # 侧边栏
│   │   │   ├── header.tsx         # 顶栏
│   │   │   └── titlebar.tsx       # 自定义标题栏
│   │   └── shared/                # 业务共享组件
│   │       ├── file-dropzone.tsx  # 文件拖拽区域
│   │       ├── progress-card.tsx  # 进度卡片
│   │       └── status-badge.tsx   # 状态徽章
│   │
│   ├── features/                  # 功能模块
│   │   ├── dashboard/             # 仪表盘
│   │   │   ├── index.tsx          # 页面入口
│   │   │   ├── stats.tsx          # 统计卡片
│   │   │   └── recent.tsx         # 最近上传
│   │   │
│   │   ├── upload/                # 上传功能
│   │   │   ├── index.tsx          # 页面入口
│   │   │   ├── file-list.tsx      # 文件列表
│   │   │   ├── upload-controls.tsx # 上传控制
│   │   │   └── upload-item.tsx    # 单个文件项
│   │   │
│   │   ├── history/               # 历史记录
│   │   │   ├── index.tsx          # 页面入口
│   │   │   ├── history-table.tsx  # 历史表格
│   │   │   ├── history-item.tsx   # 单条记录
│   │   │   └── export-dialog.tsx  # 导出对话框
│   │   │
│   │   ├── album/                 # 相册管理
│   │   │   ├── index.tsx          # 页面入口
│   │   │   ├── album-list.tsx     # 相册列表
│   │   │   ├── album-card.tsx     # 相册卡片
│   │   │   └── create-dialog.tsx  # 创建相册对话框
│   │   │
│   │   └── settings/              # 设置页面
│   │       ├── index.tsx          # 页面入口
│   │       ├── api-settings.tsx   # API 配置
│   │       ├── upload-settings.tsx # 上传配置
│   │       ├── proxy-settings.tsx # 代理配置
│   │       └── appearance.tsx     # 外观设置
│   │
│   ├── hooks/                     # 自定义 Hooks
│   │   ├── use-upload.ts          # 上传 Hook
│   │   ├── use-history.ts         # 历史记录 Hook
│   │   ├── use-album.ts           # 相册 Hook
│   │   ├── use-config.ts          # 配置 Hook
│   │   └── use-theme.ts           # 主题 Hook
│   │
│   ├── stores/                    # Zustand 状态
│   │   ├── ui.store.ts            # UI 状态
│   │   └── upload.store.ts        # 上传 UI 状态
│   │
│   ├── lib/                       # 工具函数
│   │   ├── utils.ts               # 通用工具
│   │   └── cn.ts                  # className 工具
│   │
│   └── styles/                    # 样式文件
│       └── globals.css            # 全局样式（Tailwind）
│
├── src-tauri/                     # Rust 源码
│   ├── src/
│   │   ├── main.rs                # 入口文件
│   │   ├── lib.rs                 # 库文件
│   │   ├── commands/              # IPC 命令处理
│   │   │   ├── mod.rs             # 模块导出
│   │   │   ├── upload.rs          # 上传命令
│   │   │   ├── config.rs          # 配置命令
│   │   │   ├── history.rs         # 历史命令
│   │   │   └── album.rs           # 相册命令
│   │   ├── node/                  # Node.js 子进程管理
│   │   │   ├── mod.rs             # 模块导出
│   │   │   ├── process.rs         # 进程管理
│   │   │   └── ipc.rs             # IPC 通信
│   │   ├── db/                    # SQLite 数据库
│   │   │   ├── mod.rs             # 模块导出
│   │   │   ├── connection.rs      # 数据库连接
│   │   │   └── migrations/        # 数据库迁移
│   │   ├── window/                # 窗口管理
│   │   │   ├── mod.rs             # 模块导出
│   │   │   └── manager.rs         # 窗口管理器
│   │   ├── tray/                  # 系统托盘
│   │   │   └── mod.rs             # 托盘模块
│   │   └── utils/                 # 工具函数
│   │       ├── mod.rs
│   │       └── path.rs            # 路径工具
│   │
│   ├── Cargo.toml                 # Rust 依赖配置
│   ├── tauri.conf.json            # Tauri 配置
│   ├── capabilities/              # 权限配置
│   │   └── default.json
│   └── icons/                     # 应用图标
│
├── package.json                   # 前端依赖
├── vite.config.ts                 # Vite 配置
├── tailwind.config.ts             # Tailwind 配置
├── tsconfig.json                  # TypeScript 配置
└── components.json                # shadcn/ui 配置
```

---

## 3. apps/uploader (Node.js 上传核心)

```
apps/uploader/
├── src/
│   ├── index.ts                   # 入口文件
│   │
│   ├── core/                      # 核心模块
│   │   ├── upload.ts              # 上传引擎
│   │   ├── queue.ts               # 任务队列
│   │   ├── concurrent.ts          # 并发控制
│   │   ├── retry.ts               # 重试策略
│   │   └── chunk.ts               # 分片上传
│   │
│   ├── services/                  # 服务层
│   │   ├── token.ts               # Token 管理
│   │   ├── album.ts               # 相册管理
│   │   ├── strategy.ts            # 存储策略
│   │   └── history.ts             # 历史记录
│   │
│   ├── api/                       # API 客户端
│   │   ├── client.ts              # HTTP 客户端
│   │   ├── endpoints.ts           # API 端点
│   │   └── types.ts               # API 类型
│   │
│   ├── utils/                     # 工具函数
│   │   ├── logger.ts              # 日志工具
│   │   ├── compress.ts            # 图片压缩
│   │   ├── clipboard.ts           # 剪贴板操作
│   │   ├── validate.ts            # 数据验证
│   │   └── format.ts              # 格式化工具
│   │
│   └── ipc/                       # IPC 通信
│       ├── handler.ts             # 命令处理器
│       ├── sender.ts              # 事件发送器
│       └── protocol.ts            # 协议定义
│
├── tests/                         # 测试文件
│   ├── unit/                      # 单元测试
│   └── integration/               # 集成测试
│
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

---

## 4. packages/ui (shadcn 组件库)

```
packages/ui/
├── src/
│   ├── components/                # shadcn 组件
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── progress.tsx
│   │   ├── select.tsx
│   │   ├── separator.tsx
│   │   ├── sheet.tsx
│   │   ├── table.tsx
│   │   ├── tabs.tsx
│   │   ├── toast.tsx
│   │   ├── toaster.tsx
│   │   ├── tooltip.tsx
│   │   └── use-toast.ts
│   │
│   ├── hooks/                     # 共享 Hooks
│   │   └── use-media-query.ts
│   │
│   └── lib/                       # 工具函数
│       └── utils.ts
│
├── package.json
├── tsconfig.json
└── tailwind.config.ts
```

---

## 5. packages/api (IPC 接口层)

```
packages/api/
├── src/
│   ├── index.ts                   # 入口文件
│   │
│   ├── upload.ts                  # 上传 API
│   │   - start(files): Promise<Task[]>
│   │   - pause(taskId): Promise<void>
│   │   - resume(taskId): Promise<void>
│   │   - cancel(taskId): Promise<void>
│   │   - onProgress(callback): UnlistenFn
│   │   - onComplete(callback): UnlistenFn
│   │   - onError(callback): UnlistenFn
│   │
│   ├── config.ts                  # 配置 API
│   │   - get(): Promise<Config>
│   │   - update(config): Promise<void>
│   │   - getStrategies(): Promise<Strategy[]>
│   │   - testConnection(): Promise<boolean>
│   │
│   ├── history.ts                 # 历史 API
│   │   - list(params): Promise<History[]>
│   │   - search(query): Promise<History[]>
│   │   - delete(id): Promise<void>
│   │   - clear(): Promise<void>
│   │   - export(format): Promise<Blob>
│   │
│   ├── album.ts                   # 相册 API
│   │   - list(): Promise<Album[]>
│   │   - create(name): Promise<Album>
│   │   - delete(id): Promise<void>
│   │   - refresh(): Promise<void>
│   │
│   └── system.ts                  # 系统 API
│       - minimize(): Promise<void>
│       - maximize(): Promise<void>
│       - close(): Promise<void>
│       - getVersion(): Promise<string>
│       - checkUpdate(): Promise<UpdateInfo>
│
├── package.json
└── tsconfig.json
```

---

## 6. packages/types (共享类型)

```
packages/types/
├── src/
│   ├── index.ts                   # 入口文件
│   │
│   ├── upload.ts                  # 上传相关类型
│   │   - UploadFile
│   │   - UploadTask
│   │   - UploadProgress
│   │   - UploadStatus
│   │   - UploadResult
│   │
│   ├── config.ts                  # 配置相关类型
│   │   - AppConfig
│   │   - ApiConfig
│   │   - ProxyConfig
│   │   - Strategy
│   │
│   ├── history.ts                 # 历史相关类型
│   │   - HistoryRecord
│   │   - HistoryQuery
│   │   - ExportOptions
│   │
│   ├── album.ts                   # 相册相关类型
│   │   - Album
│   │   - AlbumCreateParams
│   │
│   ├── api.ts                     # API 响应类型
│   │   - ApiResponse
│   │   - PaginatedResponse
│   │   - ErrorResponse
│   │
│   └── ipc.ts                     # IPC 协议类型
│       - IpcCommand
│       - IpcResponse
│       - IpcEvent
│
├── package.json
└── tsconfig.json
```

---

## 7. packages/shared (共享工具)

```
packages/shared/
├── src/
│   ├── index.ts                   # 入口文件
│   │
│   ├── constants.ts               # 常量定义
│   │   - APP_NAME
│   │   - APP_VERSION
│   │   - MAX_FILE_SIZE
│   │   - ALLOWED_FILE_TYPES
│   │   - DEFAULT_CONCURRENCY
│   │
│   ├── validators.ts              # 验证函数
│   │   - validateUrl(url)
│   │   - validateToken(token)
│   │   - validateFile(file)
│   │
│   ├── formatters.ts              # 格式化函数
│   │   - formatFileSize(bytes)
│   │   - formatDuration(ms)
│   │   - formatDate(date)
│   │
│   └── helpers.ts                 # 辅助函数
│       - generateId()
│       - debounce(fn, ms)
│       - throttle(fn, ms)
│
├── package.json
└── tsconfig.json
```

---

## 8. docs (项目文档)

```
docs/
├── PRD.md                         # 产品需求文档
├── ARCHITECTURE.md                # 整体架构
├── TECH_STACK.md                  # 技术栈与依赖
├── DIRECTORY_STRUCTURE.md         # 项目目录
├── DATABASE.md                    # SQLite 数据库设计
├── IPC_PROTOCOL.md                # IPC 通信协议
├── API.md                         # Node 内部接口
├── UI_SPEC.md                     # UI/UX 规范
├── COMPONENTS.md                  # 组件设计
├── STATE_MANAGEMENT.md            # 状态管理
├── TASK_QUEUE.md                  # 上传队列设计
├── SECURITY.md                    # 安全规范
├── ERROR_HANDLING.md              # 错误处理
├── TESTING.md                     # 测试规范
├── CODING_STANDARD.md             # 编码规范
└── ROADMAP.md                     # 开发路线图
```

---

## 9. scripts (构建脚本)

```
scripts/
├── build.ts                       # 构建脚本
├── dev.ts                         # 开发脚本
├── clean.ts                       # 清理脚本
└── generate-icons.ts              # 图标生成脚本
```

---

## 10. .github (GitHub Actions)

```
.github/
├── workflows/
│   ├── ci.yml                     # CI 流程
│   ├── release.yml                # 发布流程
│   └── pr-check.yml               # PR 检查
├── ISSUE_TEMPLATE/
│   ├── bug_report.md
│   └── feature_request.md
└── PULL_REQUEST_TEMPLATE.md
```

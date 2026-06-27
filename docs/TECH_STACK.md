# 技术栈与依赖

## 1. 核心框架

| 技术 | 版本 | 用途 | 说明 |
|------|------|------|------|
| Tauri | 2.x | 桌面框架 | 替代 Electron，更轻量 |
| React | 18.x | UI 框架 | 前端核心 |
| TypeScript | 5.x | 类型系统 | 严格模式 |
| Node.js | 18.x | 上传逻辑 | 作为子进程运行 |
| Rust | 1.75+ | 系统桥接 | Tauri 底层 |

---

## 2. 包管理

| 工具 | 版本 | 用途 |
|------|------|------|
| pnpm | 8.x | 包管理器 |
| pnpm workspace | - | Monorepo 管理 |

### 2.1 pnpm-workspace.yaml

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

---

## 3. 前端依赖

### 3.1 UI 框架

| 包名 | 版本 | 用途 |
|------|------|------|
| tailwindcss | 3.x | 原子化 CSS |
| shadcn/ui | latest | UI 组件库 |
| lucide-react | latest | 图标库 |
| class-variance-authority | latest | 组件变体 |
| clsx | latest | 类名合并 |
| tailwind-merge | latest | Tailwind 类名合并 |

### 3.2 状态管理

| 包名 | 版本 | 用途 |
|------|------|------|
| @tanstack/react-query | 5.x | 服务端状态管理 |
| zustand | 4.x | 客户端状态管理 |

### 3.3 表单与验证

| 包名 | 版本 | 用途 |
|------|------|------|
| react-hook-form | 7.x | 表单管理 |
| zod | 3.x | 数据验证 |
| @hookform/resolvers | latest | 表单验证集成 |

### 3.4 工具库

| 包名 | 版本 | 用途 |
|------|------|------|
| dayjs | latest | 日期处理 |
| lodash-es | latest | 工具函数 |
| nanoid | latest | ID 生成 |

### 3.5 表格与列表

| 包名 | 版本 | 用途 |
|------|------|------|
| @tanstack/react-table | 8.x | 表格组件 |
| @tanstack/react-virtual | 3.x | 虚拟滚动 |

---

## 4. Tauri 依赖

### 4.1 Rust 依赖 (Cargo.toml)

```toml
[dependencies]
tauri = { version = "2", features = ["tray-icon", "notification"] }
tauri-plugin-shell = "2"
tauri-plugin-dialog = "2"
tauri-plugin-fs = "2"
tauri-plugin-store = "2"
tauri-plugin-updater = "2"
tauri-plugin-log = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }
rusqlite = { version = "0.31", features = ["bundled"] }
log = "0.4"
```

### 4.2 Tauri 插件

| 插件 | 用途 |
|------|------|
| tauri-plugin-shell | 管理 Node.js 子进程 |
| tauri-plugin-dialog | 文件选择对话框 |
| tauri-plugin-fs | 文件系统操作 |
| tauri-plugin-store | 持久化存储 |
| tauri-plugin-updater | 自动更新 |
| tauri-plugin-log | 日志系统 |

---

## 5. Node.js 依赖

### 5.1 核心依赖

| 包名 | 版本 | 用途 |
|------|------|------|
| axios | 1.x | HTTP 客户端 |
| form-data | 4.x | 文件上传 |
| p-queue | 8.x | 任务队列 |
| p-retry | 6.x | 重试逻辑 |
| sharp | 0.33.x | 图片压缩 |
| better-sqlite3 | 11.x | SQLite 数据库 |
| winston | 3.x | 日志系统 |
| zod | 3.x | 数据验证 |

### 5.2 开发依赖

| 包名 | 版本 | 用途 |
|------|------|------|
| @types/node | 20.x | Node.js 类型 |
| typescript | 5.x | TypeScript |
| vitest | 1.x | 测试框架 |
| tsx | 4.x | TypeScript 执行 |

---

## 6. 开发工具

### 6.1 代码质量

| 工具 | 版本 | 用途 |
|------|------|------|
| eslint | 8.x | 代码检查 |
| prettier | 3.x | 代码格式化 |
| @typescript-eslint | latest | TypeScript ESLint |
| eslint-plugin-react | latest | React ESLint |
| eslint-plugin-react-hooks | latest | Hooks ESLint |

### 6.2 构建工具

| 工具 | 版本 | 用途 |
|------|------|------|
| vite | 5.x | 前端构建 |
| @vitejs/plugin-react | latest | React 插件 |
| rollup | 4.x | 打包工具（Vite 内置） |

### 6.3 测试工具

| 工具 | 版本 | 用途 |
|------|------|------|
| vitest | 1.x | 单元测试 |
| @testing-library/react | latest | React 测试 |
| @testing-library/jest-dom | latest | DOM 断言 |
| playwright | 1.x | E2E 测试 |
| msw | 2.x | API Mock |

---

## 7. 版本锁定

### 7.1 .npmrc

```text
strict-peer-dependencies=false
auto-install-peers=true
```

### 7.2 pnpm-lock.yaml

- 必须提交到 Git
- 禁止手动修改

### 7.3 Cargo.lock

- 必须提交到 Git
- 禁止手动修改

---

## 8. 升级策略

### 8.1 安全更新

- 立即升级安全补丁
- 使用 `pnpm audit` 检查

### 8.2 次要版本

- 每月检查一次
- 在测试分支验证后升级

### 8.3 主要版本

- 每季度评估一次
- 需要完整测试后升级

---

## 9. 依赖管理规则

### 9.1 禁止使用的依赖

| 依赖 | 原因 |
|------|------|
| request | 已废弃 |
| node-fetch | Node 18+ 内置 fetch |
| moment | 体积大，使用 dayjs |
| lodash | 使用 lodash-es |
| axios-mock-adapter | 使用 msw |

### 9.2 推荐替代

| 需求 | 推荐 | 避免 |
|------|------|------|
| HTTP 请求 | axios / 内置 fetch | request |
| 日期处理 | dayjs | moment |
| 工具函数 | lodash-es | lodash |
| 测试 Mock | msw | axios-mock-adapter |
| 状态管理 | zustand | redux, mobx |

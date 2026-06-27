# Lsky Studio 项目文档

## 项目概述

**Lsky Studio** 是一个现代化的兰空图床桌面客户端，采用 Tauri 2 + React + TypeScript 构建。

**项目定位：** 在保持现有 Node.js 业务逻辑基本不变的前提下，对项目进行现代化 UI 重构，并使用 Tauri 封装为跨平台桌面应用。

---

## 文档目录

### 核心文档

| 文档 | 说明 |
|------|------|
| [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md) | **开发计划** - 整体开发阶段和时间估算 |
| [TASK_CHECKLIST.md](TASK_CHECKLIST.md) | **任务清单** - 详细的开发任务列表 |
| [REFACTORING_ARCHITECTURE.md](REFACTORING_ARCHITECTURE.md) | **重构架构** - UI 重构的技术架构 |

### 设计文档

| 文档 | 说明 |
|------|------|
| [PRD.md](PRD.md) | 产品需求文档 |
| [UI_SPEC.md](UI_SPEC.md) | UI/UX 设计规范 |
| [COMPONENTS.md](COMPONENTS.md) | 组件设计文档 |
| [STATE_MANAGEMENT.md](STATE_MANAGEMENT.md) | 状态管理方案 |

### 技术文档

| 文档 | 说明 |
|------|------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | 整体架构设计 |
| [TECH_STACK.md](TECH_STACK.md) | 技术栈与依赖 |
| [DIRECTORY_STRUCTURE.md](DIRECTORY_STRUCTURE.md) | 项目目录结构 |
| [IPC_PROTOCOL.md](IPC_PROTOCOL.md) | IPC 通信协议 |
| [API.md](API.md) | Node.js 内部接口 |
| [DATABASE.md](DATABASE.md) | SQLite 数据库设计 |

### 规范文档

| 文档 | 说明 |
|------|------|
| [SECURITY.md](SECURITY.md) | 安全规范 |
| [ERROR_HANDLING.md](ERROR_HANDLING.md) | 错误处理规范 |
| [TESTING.md](TESTING.md) | 测试规范 |
| [CODING_STANDARD.md](CODING_STANDARD.md) | 编码规范 |

### 规划文档

| 文档 | 说明 |
|------|------|
| [ROADMAP.md](ROADMAP.md) | 开发路线图 |

---

## 快速开始

### 1. 阅读顺序

建议按以下顺序阅读文档：

1. **DEVELOPMENT_PLAN.md** - 了解整体开发计划
2. **TASK_CHECKLIST.md** - 了解具体任务清单
3. **REFACTORING_ARCHITECTURE.md** - 了解技术架构
4. **UI_SPEC.md** - 了解 UI 设计规范
5. **COMPONENTS.md** - 了解组件设计

### 2. 开发阶段

项目分为 10 个阶段：

1. 项目初始化（1-2天）
2. Node.js IPC 适配（2-3天）
3. Rust 桥接层（2-3天）
4. React UI 框架（3-5天）
5. 上传页面重构（3-5天）
6. 历史记录页面（2-3天）
7. 相册管理页面（2天）
8. 设置页面（2天）
9. 仪表盘页面（2天）
10. 打包与测试（3-5天）

**总预计周期：3-5周**

---

## 核心原则

### 保留不变

- ✅ 现有 Node.js 上传逻辑
- ✅ 所有接口和业务流程
- ✅ 现有配置文件格式
- ✅ 现有批量上传能力

### 重构内容

- 🔄 前端 UI（React + Tailwind + shadcn）
- 🔄 桌面封装（Tauri）
- 🔄 用户体验

### 禁止事项

- ❌ 重写整个项目
- ❌ 修改上传核心算法
- ❌ 改变接口调用方式
- ❌ 将 Node.js 业务迁移到 Rust
- ❌ 删除已有功能

---

## 技术栈

### 前端（React）

- React 18
- TypeScript 5
- Vite 5
- Tailwind CSS 3
- shadcn/ui
- React Router 6
- Lucide Icons

### 桌面框架（Tauri）

- Tauri 2
- Rust（最小化使用）

### 后端（Node.js）

- 保持现有实现
- 添加 IPC 通信层

---

## 开发环境要求

- Node.js 18+
- Rust 工具链
- pnpm 8+
- 现有 Node.js 后端可运行

---

## 命令参考

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm dev
pnpm tauri dev

# 构建
pnpm build
pnpm tauri build

# 测试
pnpm test
pnpm lint
```

---

## 项目结构

```
lsky-studio/
├── src/                          # React 前端
├── src-tauri/                    # Rust 外壳
├── uploader/                     # 现有 Node.js 后端
├── docs/                         # 项目文档
├── package.json
└── ...
```

---

## 联系方式

如有问题，请参考相应文档或联系项目负责人。

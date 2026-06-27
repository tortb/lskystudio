# Lsky Studio

现代化的兰空图床桌面客户端，基于 Tauri 2 + React + TypeScript 构建。

## ✨ 特性

- 🚀 **现代化 UI** - 基于 React + Tailwind CSS 自建组件库
- 🎨 **深色/浅色主题** - 支持主题切换（浅色/深色/跟随系统）
- 📁 **拖拽上传** - 支持拖拽文件上传
- ⚡ **批量上传** - 支持并发上传控制、断点续传
- 📊 **进度显示** - 实时显示上传进度
- 📋 **历史记录** - 查看上传历史、导出 CSV
- 🖼️ **图片管理** - 列表/网格视图、搜索筛选、批量编辑/删除、标签管理
- 📁 **相册管理** - 创建/编辑/删除相册、管理相册标签
- 💻 **双模式** - 支持 Tauri 桌面端和浏览器 Web 模式
- 🌐 **跨平台** - 支持 Windows 和 Linux

## 🛠️ 技术栈

- **前端**: React 18 + TypeScript + Vite
- **UI**: Tailwind CSS + 自建组件库（类 shadcn/ui 风格）
- **桌面框架**: Tauri 2
- **图标**: Lucide Icons
- **路由**: React Router 6
- **后端**: Node.js IPC 服务（Tauri 模式）

## 📦 安装

### 前置要求

- Node.js 18+
- Rust 工具链（Tauri 打包需要）
- pnpm

### 安装依赖

```bash
pnpm install
```

## 🚀 开发

### 浏览器模式（Web）

```bash
pnpm dev
```

访问 http://localhost:5173

### Tauri 桌面模式

```bash
pnpm tauri dev
```

## 📦 构建

### 构建前端

```bash
pnpm build
```

### 打包 Tauri 应用

```bash
pnpm tauri build
```

打包产物位于 `src-tauri/target/release/bundle/`。

## 📁 项目结构

```
lsky-studio/
├── src/                          # React 前端
│   ├── components/               # 组件
│   │   ├── layout/               # 布局组件（AppLayout, Sidebar, Titlebar）
│   │   ├── shared/               # 共享业务组件
│   │   └── ui/                   # 基础 UI 组件库
│   ├── features/                 # 功能模块
│   │   ├── dashboard/            # 仪表盘
│   │   ├── upload/               # 上传
│   │   ├── history/              # 历史记录
│   │   ├── photos/               # 图片管理
│   │   ├── album/                # 相册管理
│   │   └── settings/             # 设置
│   ├── hooks/                    # 自定义 Hooks
│   ├── lib/                      # 工具函数、API 封装
│   └── styles/                   # 样式文件
│
├── src-tauri/                    # Tauri 后端
│   ├── src/
│   │   ├── main.rs               # 入口文件
│   │   └── lib.rs                # 核心逻辑
│   ├── Cargo.toml                # Rust 依赖
│   └── tauri.conf.json           # Tauri 配置
│
├── node-ipc/                     # Node.js IPC 后端服务
├── docs/                         # 项目文档
├── package.json
├── vite.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

## 🖼️ 功能模块

### 仪表盘
- 服务状态监控
- 最近上传记录
- 快速操作入口

### 上传
- 拖拽上传
- 批量上传
- 并发控制
- 进度显示
- 断点续传

### 图片管理
- 列表/网格双视图
- 搜索筛选（关键字、公开状态、排序）
- 单图编辑（名称、简介、公开状态、标签）
- 批量编辑/删除
- 图片详情查看（大图预览）
- 复制链接/打开原图

### 相册管理
- 创建/编辑/删除相册
- 相册封面展示
- 相册标签管理

### 历史记录
- 上传历史查看
- 状态筛选（成功/失败）
- 导出 CSV

### 设置
- API 配置
- 存储策略选择
- 上传参数配置
- 主题切换

## 📄 许可证

MIT License

## 👨‍💻 作者

蜀枕清何

## 🔗 链接

- [GitHub 仓库](https://github.com/tortb/lskystudio)
- [兰空图床](https://www.lsky.pro)

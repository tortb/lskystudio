# Lsky Studio

现代化的兰空图床桌面客户端，基于 Tauri 2 + React + TypeScript 构建。

## ✨ 特性

- 🚀 **现代化 UI** - 基于 React + Tailwind CSS + shadcn/ui
- 🎨 **深色/浅色主题** - 支持主题切换
- 📁 **拖拽上传** - 支持拖拽文件上传
- ⚡ **批量上传** - 支持并发上传控制
- 📊 **进度显示** - 实时显示上传进度
- 📋 **历史记录** - 查看上传历史
- 📁 **相册管理** - 管理兰空图床相册
- 💻 **跨平台** - 支持 Windows 和 Linux

## 🛠️ 技术栈

- **前端**: React 18 + TypeScript + Vite
- **UI**: Tailwind CSS + shadcn/ui
- **桌面框架**: Tauri 2
- **图标**: Lucide Icons
- **路由**: React Router 6

## 📦 安装

### 前置要求

- Node.js 18+
- Rust 工具链
- pnpm

### 安装依赖

```bash
pnpm install
```

## 🚀 开发

### 开发模式

```bash
pnpm dev
```

### Tauri 开发模式

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

## 📁 项目结构

```
lsky-studio/
├── src/                          # React 前端
│   ├── app/                      # 应用入口
│   ├── components/               # 组件
│   │   ├── layout/               # 布局组件
│   │   └── ui/                   # shadcn 组件
│   ├── features/                 # 功能模块
│   │   ├── dashboard/            # 仪表盘
│   │   ├── upload/               # 上传
│   │   ├── history/              # 历史记录
│   │   ├── album/                # 相册管理
│   │   └── settings/             # 设置
│   ├── hooks/                    # 自定义 Hooks
│   ├── lib/                      # 工具函数
│   └── styles/                   # 样式文件
│
├── src-tauri/                    # Tauri 后端
│   ├── src/
│   │   ├── main.rs               # 入口文件
│   │   └── lib.rs                # 核心逻辑
│   ├── Cargo.toml                # Rust 依赖
│   └── tauri.conf.json           # Tauri 配置
│
├── web/                          # 现有 Node.js 后端
├── package.json
├── vite.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

## 🎨 UI 组件

项目使用 shadcn/ui 组件库，包含以下组件：

- Button
- Card
- Input
- Label
- Select
- Progress
- Badge
- Toast

## 📝 开发规范

- 使用 TypeScript 严格模式
- 使用 ESLint + Prettier 代码格式化
- 遵循 React Hooks 最佳实践
- 使用 Tailwind CSS 样式
- 组件使用 Function Component

## 📄 许可证

MIT License

## 👨‍💻 作者

蜀枕清何 (QQ: 356755331)

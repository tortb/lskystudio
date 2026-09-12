# Lsky Studio 重构项目 Spec

技术栈：Tauri + Rust（宿主）+ React（前端）+ Node.js（核心上传逻辑）
设计方向：Apple 风格（macOS / iOS 视觉语言）

---

## 1. 项目概述与范围

本次重构包含三项工作，彼此独立但共用同一套视觉系统：

| # | 工作项 | 说明 |
|---|--------|------|
| 1 | UI 重写美化 | 全部页面按 Apple 设计语言重做 |
| 2 | 窗口控制按钮 bug | 右上角最小化/最大化/关闭按钮不显示 |
| 3 | CI/CD 自动构建 | GitHub Actions 全平台全架构自动打包发布 |

---

## 2. 设计系统（Design Tokens）

Apple 的风格核心不是"圆角+毛玻璃"这么简单，而是：**内容优先、克制的装饰、精确的间距节奏、材质分层（材质表达层级而不是阴影）**。以下 token 系统按这个原则制定。

### 2.1 色彩

浅色模式（默认，Apple 系统一贯以浅色为主）：

| 用途 | 颜色 | 说明 |
|------|------|------|
| 背景 - 主 | `#F5F5F7` | macOS 窗口背景色 |
| 背景 - 卡片/面板 | `#FFFFFF` | 配合细微阴影而非边框 |
| 强调色 | `#0071E3` | Apple 经典系统蓝，用于主按钮、进度条、选中态 |
| 文字 - 主 | `#1D1D1F` | 非纯黑，Apple 标准文字色 |
| 文字 - 次 | `#6E6E73` | 说明性文字、时间戳 |
| 分隔线 | `#D2D2D7` | 极细分隔线，1px，透明度控制 |
| 危险/删除 | `#FF3B30` | 系统红 |
| 成功 | `#34C759` | 系统绿，用于上传成功状态 |

深色模式（后续可扩展）：

| 用途 | 颜色 |
|------|------|
| 背景 - 主 | `#1E1E1E` |
| 背景 - 卡片 | `#2C2C2E` |
| 强调色 | `#0A84FF` |
| 文字 - 主 | `#F5F5F7` |
| 文字 - 次 | `#98989D` |

### 2.2 字体

- 系统字体优先：`-apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Microsoft YaHei", sans-serif`
- 不额外引入网络字体，保持系统原生质感与启动速度
- 字号体系（rem 基准 16px）：
  - 大标题 28px / 字重 600
  - 区块标题 17px / 字重 600
  - 正文 14px / 字重 400
  - 辅助文字 12px / 字重 400，颜色用次要文字色
- 行高：正文 1.5，标题 1.2

### 2.3 布局与间距

- 间距节奏采用 4px 基准网格：4 / 8 / 12 / 16 / 24 / 32 / 48
- 圆角：卡片/面板 12px，按钮/输入框 8px，头像/缩略图 6px（不同层级用不同圆角，避免"一刀切"的 SaaS 卡片感）
- 阴影：只在悬浮层（弹窗、下拉菜单）使用阴影，普通卡片用 1px 分隔线代替阴影，保持 Apple 式的"平面材质分层"而非到处投影
- 布局结构：左侧窄导航栏（64-72px，仅图标）+ 右侧主内容区，参考 Finder / 系统偏好设置的结构

```
┌───┬─────────────────────────────┐
│   │  Titlebar (自定义，含交通灯按钮)│
│ N │───────────────────────────── │
│ a │                               │
│ v │        主内容区                │
│   │   (上传区 / 图片网格 / 设置)     │
│   │                               │
└───┴─────────────────────────────┘
```

### 2.4 设计原则

1. **克制**：一个页面只允许一个"焦点"（比如上传区的拖拽高亮），其余元素保持安静
2. **材质分层代替阴影堆叠**：用背景色深浅区分层级，而不是加阴影
3. **动效仅用于状态反馈**：上传进度、拖拽悬浮、成功/失败反馈用动效；不做无意义的入场动画
4. **原生手感**：窗口控制按钮、滚动条、右键菜单都尽量贴近系统原生交互习惯

---

## 3. 窗口控制按钮 Bug 修复方案

### 3.1 根因排查方向

在 Tauri 中"右上角三个按钮不显示"通常是以下几种情况之一：

1. `tauri.conf.json` 中 `decorations` 与自定义标题栏组件冲突（设了 `decorations: false` 却没有自己实现按钮，或者实现了但被其他元素盖住）
2. 自定义标题栏 React 组件的 `z-index` / `position` 设置不当，被内容区遮挡
3. macOS 下使用了 `titleBarStyle: "overlay"` 但没有正确处理红绿灯按钮的偏移量，导致按钮被自定义 UI 覆盖
4. Windows 下缺少对应的最小化/最大化/关闭图标组件，只做了 macOS 分支的适配

### 3.2 推荐方案：完全自定义标题栏（跨平台统一控制，风格可控）

**`tauri.conf.json`**
```json
{
  "tauri": {
    "windows": [
      {
        "decorations": false,
        "titleBarStyle": "overlay",
        "transparent": false,
        "width": 1080,
        "height": 720
      }
    ]
  }
}
```

**`TitleBar.tsx`**
```tsx
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useEffect, useState } from 'react';

const appWindow = getCurrentWindow();

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    appWindow.isMaximized().then(setIsMaximized);
    const unlisten = appWindow.onResized(async () => {
      setIsMaximized(await appWindow.isMaximized());
    });
    return () => { unlisten.then(fn => fn()); };
  }, []);

  return (
    <div
      data-tauri-drag-region
      className="titlebar"
      style={{
        height: 38,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        zIndex: 1000, // 关键：确保始终在内容区之上
      }}
    >
      <span className="titlebar-title">Lsky Studio</span>
      <div className="titlebar-controls">
        <button onClick={() => appWindow.minimize()} aria-label="最小化">
          <MinimizeIcon />
        </button>
        <button
          onClick={() => appWindow.toggleMaximize()}
          aria-label={isMaximized ? '还原' : '最大化'}
        >
          {isMaximized ? <RestoreIcon /> : <MaximizeIcon />}
        </button>
        <button onClick={() => appWindow.close()} aria-label="关闭">
          <CloseIcon />
        </button>
      </div>
    </div>
  );
}
```

要点：
- `data-tauri-drag-region` 让标题栏可拖拽窗口，但按钮本身不要加这个属性，否则点击会被识别成拖拽
- 用 `@tauri-apps/api/window` 的 `getCurrentWindow()` API（Tauri v2 写法；v1 是 `appWindow` 从 `@tauri-apps/api/window` 直接导入）
- `z-index` 必须高于主内容区的滚动容器，这是最常见的"按钮消失"原因
- macOS 也可以选择用系统原生红绿灯（`decorations: true` + `titleBarStyle: "overlay"` 只隐藏标题文字），但既然要统一 Apple 风格的自绘按钮，跨平台自定义是更可控的方案

### 3.3 自查清单

- [ ] 确认 `tauri.conf.json` 里 `decorations` 的值和标题栏实现方式匹配
- [ ] 标题栏组件 `z-index` 高于主内容区
- [ ] 按钮点击区域没有被 `data-tauri-drag-region` 覆盖
- [ ] Windows/macOS/Linux 三端分别手动验证一次（不同平台的窗口行为差异较大）

---

## 4. UI 组件重写清单

| 组件 | 现状 | 目标 |
|------|------|------|
| 标题栏 | 系统默认，按钮丢失 | 自绘标题栏，统一交互，按钮修复 |
| 侧边导航 | 待确认 | 窄图标导航栏，参考系统偏好设置 |
| 上传区 | 已有主体功能 | 拖拽高亮、进度条、批量上传队列可视化 |
| 图片网格 | 待确认 | 卡片式网格，hover 显示操作按钮，材质分层 |
| 设置页 | 待确认 | 分组列表样式，参考 macOS 系统设置 |
| Toast/提示 | 待确认 | 轻量、自动消失、堆叠动画 |
| 深色模式 | 未实现 | 后续扩展，token 已预留 |

---

## 5. CI/CD 全平台自动构建

使用官方 `tauri-apps/tauri-action`，矩阵覆盖 Windows / macOS（Intel + Apple Silicon）/ Linux。

**`.github/workflows/build.yml`**
```yaml
name: Build Lsky Studio

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:

jobs:
  build:
    strategy:
      fail-fast: false
      matrix:
        include:
          - platform: macos-latest
            args: '--target aarch64-apple-darwin'
          - platform: macos-latest
            args: '--target x86_64-apple-darwin'
          - platform: ubuntu-22.04
            args: ''
          - platform: windows-latest
            args: ''

    runs-on: ${{ matrix.platform }}
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Setup Rust
        uses: dtolnay/rust-action@stable
        with:
          targets: ${{ matrix.platform == 'macos-latest' && 'aarch64-apple-darwin,x86_64-apple-darwin' || '' }}

      - name: Install Linux dependencies
        if: matrix.platform == 'ubuntu-22.04'
        run: |
          sudo apt-get update
          sudo apt-get install -y libgtk-3-dev libwebkit2gtk-4.1-dev \
            libappindicator3-dev librsvg2-dev patchelf

      - name: Install frontend dependencies
        run: npm ci

      - name: Build and release
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tagName: ${{ github.ref_name }}
          releaseName: 'Lsky Studio ${{ github.ref_name }}'
          releaseDraft: true
          prerelease: false
          args: ${{ matrix.args }}
```

要点说明：

- **matrix** 覆盖四种构建目标：macOS Apple Silicon（`aarch64-apple-darwin`）、macOS Intel（`x86_64-apple-darwin`）、Linux（`.deb`/`.AppImage`）、Windows（`.msi`/`.exe`）
- macOS 双架构需要 Rust 安装对应 target，用 `rustup target add` 或 `dtolnay/rust-action` 的 `targets` 参数
- Linux 需要额外的系统依赖（webkit2gtk 等），否则编译会失败
- 由于核心上传逻辑用 Node.js 实现，`npm ci` 步骤需确保 Node 端代码也被正确打包进 Tauri 的资源目录（如果是通过 sidecar 进程调用 Node 脚本，需要在 `tauri.conf.json` 的 `bundle.externalBin` 里声明对应二进制/脚本，并为每个平台准备好可执行文件命名后缀）
- 触发方式：推送 `v*` 标签自动构建并创建 Draft Release，也支持手动触发（`workflow_dispatch`）方便调试

### 5.1 Node.js sidecar 的额外注意事项

如果核心上传逻辑是以独立 Node.js 进程运行（而不是编译进 Rust），构建时需要：

1. 用 `pkg` 或 `nexe` 将 Node 脚本打包成各平台的独立可执行文件
2. 在 `tauri.conf.json` 的 `bundle.externalBin` 中声明这些二进制路径，并按平台后缀命名（如 `upload-core-x86_64-pc-windows-msvc.exe`）
3. 在 workflow 中增加一步"构建 Node sidecar 二进制"，放在 `tauri-action` 步骤之前，确保打包时该文件已存在

这一步的具体实现取决于当前 Node 逻辑是如何被 Rust 侧调用的（`Command::new_sidecar` 还是直接 spawn 系统 Node），建议确认现有实现方式后再补全这部分 workflow。

---

## 6. 后续建议的落地顺序

1. 先修复窗口按钮 bug（第 3 节），同时顺手把自定义标题栏做成最终视觉样式，一次到位
2. 按 design tokens（第 2 节）逐个重写组件（第 4 节清单），建议从上传区开始，因为是核心功能页面
3. UI 稳定后接入 CI/CD workflow（第 5 节），先跑通单平台构建，再扩展矩阵

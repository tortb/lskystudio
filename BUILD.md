# Lsky Studio 构建指南

## 前置要求

### 必需软件

- **Node.js** 18+ - https://nodejs.org/
- **Rust** 1.75+ - https://rustup.rs/
- **pnpm** - https://pnpm.io/

### Linux 系统依赖

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y libgtk-3-dev libwebkit2gtk-4.1-dev librsvg2-dev \
  patchelf libssl-dev libglib2.0-dev libayatana-appindicator3-dev \
  build-essential curl wget file libxdo-dev

# Fedora
sudo dnf install -y webkit2gtk4.1-devel openssl-devel curl wget file \
  libappindicator-gtk3-devel librsvg2-devel

# Arch Linux
sudo pacman -S webkit2gtk-4.1 base-devel curl wget file openssl \
  appmenu-gtk-module gtk3 libappindicator-gtk3 librsvg
```

> **说明**: `libayatana-appindicator3-dev` 是系统托盘（trayIcon）功能的必需依赖，缺失会导致打包时报 `Can't detect any appindicator library` 错误。

### Windows 特定要求（在 Windows 上原生构建时）

- **Visual Studio Build Tools** - 勾选"使用 C++ 进行桌面开发"
- **WebView2** - Windows 10/11 通常已预装

## 快速开始

### 1. 安装项目依赖

```bash
pnpm install
cd node-ipc && npm install && cd ..
```

### 2. 开发模式

```bash
# 浏览器模式（Web）
pnpm dev

# Tauri 桌面模式
pnpm tauri dev
```

> **注意**: 浏览器模式下不会显示窗口控制按钮（标题栏），因为 `window.__TAURI__` 仅在 Tauri WebView 中存在。需使用 `pnpm tauri dev` 测试桌面端功能。

### 3. 构建当前平台

> ⚠️ 必须使用 `pnpm tauri build`，不能用 `cargo build`。`pnpm tauri build` 会依次执行：前端构建 → Rust 编译 → 生成安装包。`cargo build` 仅编译二进制，不会生成安装包。

```bash
pnpm tauri build
```

## 交叉编译

### 从 Linux 构建 Windows 版本

Tauri 支持通过 `cargo-xwin` 在 Linux 上交叉编译 Windows 应用。仅生成 NSIS `.exe` 安装包，不支持 `.msi`（WiX 仅限 Windows）。

```bash
# 1. 安装系统依赖（lld 链接器 + llvm + clang-cl 编译器 + makensis）
sudo apt update && sudo apt install -y lld llvm clang nsis

# 2. 安装 Windows Rust 目标
rustup target add x86_64-pc-windows-msvc

# 3. 安装 cargo-xwin
cargo install --locked cargo-xwin

# 4. 构建 Windows 版本
pnpm tauri build --runner cargo-xwin --target x86_64-pc-windows-msvc
```

产物位于 `src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/`。

> **注意**: 首次构建时 cargo-xwin 会自动下载 Windows SDK（约几百 MB），可用 `XWIN_CACHE_DIR` 环境变量指定缓存目录。

### macOS 构建

Tauri 不支持交叉编译到 macOS，必须在 macOS 上构建：

```bash
pnpm tauri build
```

## 构建输出

### Linux 构建

```
src-tauri/target/release/bundle/
├── deb/
│   └── Lsky Studio_1.0.1_amd64.deb        # Debian/Ubuntu 安装包
├── rpm/
│   └── Lsky Studio-1.0.1-1.x86_64.rpm     # Fedora/RHEL 安装包
└── appimage/
    └── Lsky Studio_1.0.1_amd64.AppImage   # Linux 便携版
```

### Windows 构建

```
src-tauri/target/release/bundle/
└── nsis/
    └── Lsky Studio_1.0.1_x64-setup.exe    # Windows EXE 安装包
```

交叉编译产物路径：

```
src-tauri/target/x86_64-pc-windows-msvc/release/bundle/
└── nsis/
    └── Lsky Studio_1.0.1_x64-setup.exe    # Windows EXE 安装包
```

## 图标

确保 `src-tauri/icons/` 目录包含以下文件，且必须为 **RGBA 格式**、像素尺寸**严格匹配文件名**：

| 文件名 | 尺寸 |
|--------|------|
| `32x32.png` | 32×32 |
| `128x128.png` | 128×128 |
| `128x128@2x.png` | 256×256 |
| `icon.png` | 512×512 |
| `icon.ico` | Windows 图标 |
| `icon.icns` | macOS 图标 |

> Tauri 编译时 `generate_context!()` 宏会校验图标格式和尺寸，RGB 格式或尺寸不匹配会报错 `icon ... is not RGBA`。

## 故障排除

### Rust 编译错误

```bash
# 更新 Rust
rustup update

# 清理构建缓存
cd src-tauri && cargo clean && cd ..
```

### 缺少系统依赖

```bash
# 托盘库缺失：Can't detect any appindicator library
sudo apt install -y libayatana-appindicator3-dev

# 其他依赖
sudo apt install -y libgtk-3-dev libwebkit2gtk-4.1-dev librsvg2-dev patchelf libssl-dev
```

### 图标格式错误

```bash
# 检查图标格式
file src-tauri/icons/*.png
# 应显示: ... PNG image data, ... x ..., 8-bit/color RGBA, non-interlaced
```

如需修复，使用 Python Pillow 转换：

```python
from PIL import Image
import os

icons_dir = "src-tauri/icons"
img = Image.open(os.path.join(icons_dir, "icon.png")).convert("RGBA")
sizes = {
    "32x32.png": (32, 32),
    "128x128.png": (128, 128),
    "128x128@2x.png": (256, 256),
    "icon.png": (512, 512),
}
for name, (w, h) in sizes.items():
    img.resize((w, h), Image.LANCZOS).save(os.path.join(icons_dir, name), "PNG")
```

### Node.js 模块错误

```bash
rm -rf node_modules node-ipc/node_modules
pnpm install
cd node-ipc && npm install && cd ..
```

## CI/CD

### GitHub Actions 多平台构建

```yaml
name: Build

on:
  push:
    tags: ['v*']

jobs:
  build-linux:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 11
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - uses: dtolnay/rust-toolchain@stable
      - name: Install Linux dependencies
        run: |
          sudo apt update
          sudo apt install -y libwebkit2gtk-4.1-dev build-essential libssl-dev \
            libayatana-appindicator3-dev librsvg2-dev patchelf lld llvm clang nsis
      - run: pnpm install
      - run: cd node-ipc && npm install && cd ..
      - run: pnpm tauri build
      - uses: actions/upload-artifact@v4
        with:
          name: release-linux
          path: src-tauri/target/release/bundle/

  build-windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 11
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - uses: dtolnay/rust-toolchain@stable
      - run: pnpm install
      - run: cd node-ipc && npm install && cd ..
      - run: pnpm tauri build
      - uses: actions/upload-artifact@v4
        with:
          name: release-windows
          path: src-tauri/target/release/bundle/
```

## 发布

### 1. 更新版本号

以下三个文件中的版本号需保持一致：

- `package.json`
- `src-tauri/Cargo.toml`
- `src-tauri/tauri.conf.json`

### 2. 构建安装包

```bash
# Linux（在 Linux 上）
pnpm tauri build

# Windows（在 Windows 上或使用 cargo-xwin 交叉编译）
pnpm tauri build --runner cargo-xwin --target x86_64-pc-windows-msvc
```

### 3. 创建 GitHub Release

1. 推送代码到 GitHub
2. 创建新的 Tag（如 `v1.0.1`）
3. 上传构建产物

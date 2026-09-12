# Lsky Studio 构建指南

## 前置要求

### 必需软件

- **Node.js** 18+ - https://nodejs.org/
- **Rust** 1.75+ - https://rustup.rs/
- **npm** - https://nodejs.org/

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
npm install
```

### 2. 开发模式

```bash
# 浏览器模式（Web）
npm run dev

# Tauri 桌面模式
npm run tauri dev
```

> **注意**: 浏览器模式下不会显示窗口控制按钮（标题栏），因为 `window.__TAURI__` 仅在 Tauri WebView 中存在。需使用 `npm run tauri dev` 测试桌面端功能。

### 3. 构建当前平台

必须使用 `npm run tauri build`，不能用 `cargo build`。`npm run tauri build` 会依次执行：前端构建 -> Rust 编译 -> 生成安装包。`cargo build` 仅编译二进制，不会生成安装包。

```bash
npm run tauri build
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
npm run tauri build -- --runner cargo-xwin --target x86_64-pc-windows-msvc
```

产物位于 `src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/`。

> **注意**: 首次构建时 cargo-xwin 会自动下载 Windows SDK（约几百 MB），可用 `XWIN_CACHE_DIR` 环境变量指定缓存目录。

### macOS 构建

Tauri 不支持交叉编译到 macOS，必须在 macOS 上构建：

```bash
npm run tauri build
```

## 构建输出

### Linux 构建

```
src-tauri/target/release/bundle/
├── deb/
│   └── Lsky Studio_1.0.3_amd64.deb        # Debian/Ubuntu 安装包
├── rpm/
│   └── Lsky Studio-1.0.3-1.x86_64.rpm     # Fedora/RHEL 安装包
└── appimage/
    └── Lsky Studio_1.0.3_amd64.AppImage   # Linux 便携版
```

### Windows 构建

```
src-tauri/target/release/bundle/
└── nsis/
    └── Lsky Studio_1.0.3_x64-setup.exe    # Windows EXE 安装包
```

### macOS 构建

```
src-tauri/target/release/bundle/
├── macos/
│   └── Lsky Studio.app                    # 应用本体
└── dmg/
    └── Lsky Studio_1.0.3_aarch64.dmg      # 磁盘映像
```

交叉编译产物路径：

```
src-tauri/target/x86_64-pc-windows-msvc/release/bundle/
└── nsis/
    └── Lsky Studio_1.0.3_x64-setup.exe    # Windows EXE 安装包
```

## 图标

图标源图是 `src-tauri/icons/logo.png`（正方形，建议 1024×1024 以上）。替换源图后重新生成整套图标：

```bash
npm run icons
```

等价于 `tauri icon src-tauri/icons/logo.png -o src-tauri/icons`，会覆盖 `src-tauri/icons/` 下的全部图标，包括 Windows 的 `icon.ico` 与 macOS 的 `icon.icns`。

`src-tauri/tauri.conf.json` 中 `bundle.icon` 列出了打包使用的图标，托盘图标由 `trayIcon.iconPath` 指定：

```json
"bundle": {
  "icon": ["icons/32x32.png", "icons/128x128.png", "icons/128x128@2x.png", "icons/icon.icns", "icons/icon.ico", "icons/icon.png"]
},
"trayIcon": {
  "iconPath": "icons/icon.png"
}
```

前端标题栏图标与 `index.html` 的 favicon 直接引用 `src-tauri/icons/` 中的 PNG，替换源图后一并生效。

图标必须为 **RGBA 格式**、像素尺寸严格匹配文件名：

| 文件名 | 尺寸 |
|--------|------|
| `32x32.png` | 32×32 |
| `128x128.png` | 128×128 |
| `128x128@2x.png` | 256×256 |
| `icon.png` | 512×512 |
| `icon.ico` | Windows 图标 |
| `icon.icns` | macOS 图标 |

> Tauri 编译时 `generate_context!()` 宏会校验图标格式和尺寸，RGB 格式或尺寸不匹配会报错 `icon ... is not RGBA`。

Linux 下安装后桌面图标来自 `/usr/share/icons/hicolor/*/apps/lsky-studio.png`，覆盖安装新包即可更新；若仍显示旧图标，刷新缓存并重新登录：

```bash
sudo gtk-update-icon-cache -f -t /usr/share/icons/hicolor
sudo update-desktop-database /usr/share/applications
```

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

### 依赖错误

```bash
rm -rf node_modules
npm install
```

## CI/CD

发布由 GitHub Actions 完成，工作流文件为 [.github/workflows/build.yml](.github/workflows/build.yml)，触发方式为推送 `v*` tag 或手动 `workflow_dispatch`。

构建矩阵覆盖 5 个目标：

| 平台 | Runner | 目标三元组 | 产物 |
|------|--------|-----------|------|
| macOS（arm64 + x86_64） | `macos-latest` | `universal-apple-darwin` | `.dmg` / `.app` |
| Linux x86_64 | `ubuntu-22.04` | `x86_64-unknown-linux-gnu` | `.deb` / `.AppImage` |
| Linux arm64 | `ubuntu-22.04-arm` | `aarch64-unknown-linux-gnu` | `.deb` / `.AppImage` |
| Windows x86_64 | `windows-latest` | `x86_64-pc-windows-msvc` | `.msi` / `.exe` |
| Windows arm64 | `windows-11-arm` | `aarch64-pc-windows-msvc` | `.exe`（arm64 仅支持 NSIS） |

各任务流程：

1. `actions/checkout` 拉取代码，设置 Node.js 22（`cache: npm`）与对应 Rust 目标
2. `swatinem/rust-cache` 缓存 Rust 构建（按目标三元组分 key）
3. Linux 任务安装系统依赖（webkit2gtk-4.1、ayatana-appindicator、`libfuse2` 等）
4. `npm ci` 安装前端依赖
5. `tauri-apps/tauri-action` 执行打包，并把产物上传到该 tag 对应的 Release

> `npm ci` 会校验 `package-lock.json` 与 `package.json` 的一致性，同时校验根包版本号，因此改版本号时必须同步 `package-lock.json`。

## 发布

### 1. 更新版本号

以下文件中的版本号需保持一致：

- `package.json`
- `package-lock.json`（`npm ci` 会校验该版本号）
- `src-tauri/Cargo.toml`
- `src-tauri/Cargo.lock`
- `src-tauri/tauri.conf.json`

### 2. 提交并推送

```bash
git commit -am "release: v1.0.3"
git push
```

### 3. 打 tag 触发构建与发布

```bash
git tag v1.0.3
git push origin v1.0.3
```

推送后 GitHub Actions 自动构建全部平台产物，并发布对应的 Release。也可在 Actions 页面手动触发 `workflow_dispatch`，此时只构建产物、不创建 Release。

### 4. 本地安装（可选）

以 Linux 为例：

```bash
sudo dpkg -i "src-tauri/target/release/bundle/deb/Lsky Studio_1.0.3_amd64.deb"
```

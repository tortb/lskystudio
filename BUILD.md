# Lsky Studio 构建指南

## 前置要求

### 必需软件

- **Node.js** 18+ - https://nodejs.org/
- **Rust** 1.75+ - https://rustup.rs/
- **pnpm** (推荐) 或 npm

### Windows 特定要求

- **Visual Studio Build Tools** - 用于编译原生模块
- **WebView2** - Windows 10/11 通常已预装

### Linux 特定要求

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev

# Fedora
sudo dnf install -y webkit2gtk4.1-devel openssl-devel curl wget file libappindicator-gtk3-devel librsvg2-devel

# Arch Linux
sudo pacman -S webkit2gtk-4.1 base-devel curl wget file openssl appmenu-gtk-module gtk3 libappindicator-gtk3 librsvg
```

## 快速开始

### 1. 检查依赖

```bash
npm run check
```

### 2. 安装依赖

```bash
pnpm install
cd node-ipc && npm install && cd ..
```

### 3. 生成图标

```bash
npm run icons
```

按照 `src-tauri/icons/README.md` 中的说明生成 PNG 图标。

### 4. 开发模式

```bash
npm run dev:app
```

### 5. 构建应用

```bash
# 构建当前平台
npm run build:app

# 构建 Windows 版本
npm run build:win

# 构建 Linux 版本
npm run build:linux
```

## 构建输出

构建完成后，安装包位于：

```
src-tauri/target/release/bundle/
├── msi/
│   └── Lsky Studio_0.1.0_x64.msi          # Windows MSI 安装包
├── nsis/
│   └── Lsky Studio_0.1.0_x64-setup.exe    # Windows EXE 安装包
├── deb/
│   └── lsky-studio_0.1.0_amd64.deb        # Debian/Ubuntu 安装包
└── appimage/
    └── lsky-studio_0.1.0_amd64.AppImage   # Linux 便携版
```

## 开发模式

### 启动前端开发服务器

```bash
npm run dev
```

### 启动 Tauri 开发模式

```bash
npm run tauri dev
```

### 仅启动 Node IPC

```bash
cd node-ipc
npm start
```

## 故障排除

### 1. Rust 编译错误

```bash
# 更新 Rust
rustup update

# 清理构建缓存
cd src-tauri
cargo clean
cd ..
```

### 2. Node.js 模块错误

```bash
# 清理 node_modules
rm -rf node_modules
rm -rf node-ipc/node_modules

# 重新安装
pnpm install
cd node-ipc && npm install && cd ..
```

### 3. Tauri 构建错误

```bash
# 检查 Tauri 配置
cd src-tauri
cargo check
cd ..
```

### 4. 图标问题

确保 `src-tauri/icons/` 目录包含以下文件：

- 32x32.png
- 128x128.png
- 128x128@2x.png
- icon.png
- icon.ico (Windows)
- icon.icns (macOS)

## CI/CD

### GitHub Actions

```yaml
name: Build

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest]
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
    
    - name: Setup Rust
      uses: dtolnay/rust-toolchain@stable
    
    - name: Install dependencies (Linux)
      if: matrix.os == 'ubuntu-latest'
      run: |
        sudo apt update
        sudo apt install -y libwebkit2gtk-4.1-dev build-essential libssl-dev libayatana-appindicator3-dev librsvg2-dev
    
    - name: Install dependencies
      run: |
        npm install
        cd node-ipc && npm install && cd ..
    
    - name: Build
      run: npm run build:app
    
    - name: Upload artifacts
      uses: actions/upload-artifact@v4
      with:
        name: release-${{ matrix.os }}
        path: src-tauri/target/release/bundle/
```

## 发布

### 1. 更新版本号

更新以下文件中的版本号：

- `package.json`
- `src-tauri/Cargo.toml`
- `src-tauri/tauri.conf.json`

### 2. 构建所有平台

```bash
# Windows
npm run build:win

# Linux
npm run build:linux
```

### 3. 创建 GitHub Release

1. 推送代码到 GitHub
2. 创建新的 Tag
3. 上传构建产物

## 高级配置

### 自定义图标

1. 编辑 `src-tauri/icons/icon.svg`
2. 运行 `npm run icons`
3. 按照说明生成 PNG 图标

### 自定义应用信息

编辑 `src-tauri/tauri.conf.json`：

```json
{
  "productName": "Lsky Studio",
  "version": "0.1.0",
  "identifier": "com.tortb.lsky-studio",
  "build": {
    ...
  },
  "app": {
    "windows": [
      {
        "title": "Lsky Studio",
        "width": 1200,
        "height": 800
      }
    ]
  }
}
```

### 自动更新

配置 `tauri.conf.json` 中的 `updater` 部分：

```json
{
  "updater": {
    "active": true,
    "endpoints": [
      "https://releases.example.com/{{target}}/{{arch}}/{{current_version}}"
    ],
    "pubkey": "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIGtleQpXU0d...",
    "windows": {
      "installMode": "both"
    }
  }
}
```

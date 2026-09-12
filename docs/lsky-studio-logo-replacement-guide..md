# Lsky Studio Logo 全面替换指南（供 AI 执行）

> 使用方式：把这份文档连同新 logo 源文件（建议提供 1024x1024 或更大的 PNG/SVG）一起交给 Claude Code 或其他代码 AI，让它按顺序执行。

## 0. 前置准备

- 新 logo 源文件需要一张**高分辨率方形底图**（≥1024x1024），透明背景 PNG 或 SVG 均可
- 如果新 logo 不是方形/没有做圆角处理，先确认是否需要 AI 按 Apple squircle 规范做外框处理，还是保留原始形状直接生成图标集

## 1. 搜索项目中所有旧 logo 引用（第一步必须做，避免漏改）

让 AI 先做一次全项目检索，列出所有命中项再逐一处理：

```bash
# 按文件名搜索
grep -rli "logo\|icon\|favicon" --include="*.json" --include="*.tsx" --include="*.ts" --include="*.html" --include="*.rs" .

# 按常见图标文件扩展名搜索
find . -type f \( -iname "*.icns" -o -iname "*.ico" -o -iname "logo*.png" -o -iname "icon*.png" -o -iname "*.svg" \) -not -path "*/node_modules/*" -not -path "*/target/*"
```

需要重点检查的目录（Tauri + React 项目典型结构）：

- `src-tauri/icons/` — 打包图标源文件
- `src-tauri/tauri.conf.json` — icon 路径配置
- `src/assets/` 或 `public/` — 前端页面内使用的 logo
- `src-tauri/Cargo.toml` / `build.rs` — 部分项目会在构建脚本里硬编码图标路径
- 根目录 `README.md` — 文档里嵌的 logo 图片

## 2. 生成全平台打包图标（最容易漏的一步）

Tauri 官方 CLI 可以从一张源图自动生成所有平台需要的尺寸，**不要手动逐个尺寸切图**，容易漏掉或做出不一致的圆角：

```bash
npx @tauri-apps/cli icon <新logo源文件路径> -o src-tauri/icons
```

这一步会生成/覆盖：

| 平台 | 文件 | 用途 |
|------|------|------|
| macOS | `icon.icns` | App 图标、Dock 图标 |
| Windows | `icon.ico` | 可执行文件图标、任务栏 |
| Linux | `32x32.png` `128x128.png` `128x128@2x.png` 等 | 各桌面环境图标 |
| 通用 | `icon.png` | 兜底/托盘图标（如未单独提供） |

**验证点**：生成后确认 `src-tauri/tauri.conf.json` 的 `bundle.icon` 数组确实指向新生成的这批文件（有些项目是手写的绝对文件名列表，CLI 覆盖文件本身但不会改配置里的清单，需要人工核对一次）。

## 3. 系统托盘图标（如果有托盘功能）

托盘图标通常是**单独一份**小尺寸 PNG，容易被遗漏：

- 搜索代码中 `SystemTray` / `TrayIcon` / `tray_icon` 关键字，找到实际引用的图标路径并替换
- 注意托盘图标在浅色/深色系统主题下可能需要单色版本（macOS 模板图标 `isTemplate: true` 的情况），如果原来做了这个处理，新 logo 也要提供对应的单色剪影版本

## 4. 前端页面内的 logo 使用

按第 3 章节标题栏设计（`TitleBar.tsx`）和其余页面，逐一替换：

- [ ] 自定义标题栏左侧小图标
- [ ] 关于页 / 设置页里的大图标展示
- [ ] 启动页（如果有 splash screen）
- [ ] 空状态插图里如果嵌了品牌标识

替换后建议在 React 组件里用**统一的路径引用**（如 `src/assets/logo.svg`），避免多处各自 import 不同文件导致改一半漏一半。

## 5. 安装包相关的图形资源（容易被完全忽略的部分）

不同平台的安装程序也可能内嵌了 logo，AI 需要单独检查：

- **Windows MSI**：检查 `tauri.conf.json` 里 `bundle.windows.wix` 是否配置了自定义的安装向导横幅图（`bannerPath`）、对话框背景图（`dialogImagePath`）
- **macOS DMG**：检查是否有自定义 DMG 背景图（部分项目会在 `bundle.macOS` 或单独的打包脚本里配置）
- **Linux `.desktop` 文件**：如果项目自己维护了 `.desktop` 文件模板，确认 `Icon=` 字段指向的图标名称和新生成的图标一致

## 6. 清缓存并重新构建验证

图标类资源经常被系统/构建工具缓存，替换后不重新构建干净目录容易"看起来没生效"：

```bash
rm -rf src-tauri/target
npm run tauri build
```

macOS 上如果本地测试发现 Dock 图标还是旧的，额外清一下图标缓存：

```bash
sudo rm -rf /Library/Caches/com.apple.iconservices.store
killall Dock
```

## 7. 最终检查清单

- [ ] `src-tauri/icons/` 全部文件已更新且 `tauri.conf.json` 引用正确
- [ ] 系统托盘图标（如有）已更新，深浅主题下显示正常
- [ ] 应用内标题栏 / 关于页 / 设置页 logo 已更新
- [ ] Windows/macOS/Linux 三端分别打包出来，实际肉眼确认图标（不要只看配置文件，图标缓存问题很常见）
- [ ] README 等文档里的 logo 图片已同步更新
- [ ] 旧 logo 文件（不再被任何配置引用的）已从仓库中删除，避免仓库残留无用资源

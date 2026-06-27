/**
 * 生成应用图标
 * 使用 Node.js Canvas 生成不同尺寸的图标
 */

const fs = require('fs');
const path = require('path');

// 图标尺寸配置
const ICON_SIZES = [
  { size: 32, name: '32x32.png' },
  { size: 128, name: '128x128.png' },
  { size: 256, name: '128x128@2x.png' },
  { size: 512, name: 'icon.png' },
];

// 生成 SVG 图标
function generateSvgIcon(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="64" fill="url(#gradient)"/>
  <text x="256" y="320" font-family="Arial, sans-serif" font-size="200" font-weight="bold" fill="white" text-anchor="middle">LS</text>
  <text x="256" y="420" font-family="Arial, sans-serif" font-size="80" fill="white" text-anchor="middle" opacity="0.8">Studio</text>
</svg>`;
}

// 生成 HTML 文件用于截图
function generateHtmlForScreenshot(size) {
  const svg = generateSvgIcon(size);
  return `<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      margin: 0;
      padding: 0;
      width: ${size}px;
      height: ${size}px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
    }
    svg {
      width: ${size}px;
      height: ${size}px;
    }
  </style>
</head>
<body>
  ${svg}
</body>
</html>`;
}

// 创建图标目录
const iconsDir = path.join(__dirname, '../src-tauri/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// 生成 SVG 图标
const svgIcon = generateSvgIcon(512);
fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svgIcon);

// 生成不同尺寸的 HTML 文件（用于手动截图）
ICON_SIZES.forEach(({ size, name }) => {
  const html = generateHtmlForScreenshot(size);
  const htmlPath = path.join(iconsDir, `${name}.html`);
  fs.writeFileSync(htmlPath, html);
  console.log(`Generated HTML for ${name}: ${htmlPath}`);
});

// 生成 README 说明
const readme = `# 应用图标

## 生成图标

由于 Tauri 需要 PNG 格式的图标，请按以下步骤生成：

1. 打开对应的 HTML 文件：
   - \`32x32.png.html\` - 32x32 图标
   - \`128x128.png.html\` - 128x128 图标
   - \`128x128@2x.png.html\` - 256x256 图标
   - \`icon.png.html\` - 512x512 图标

2. 在浏览器中打开 HTML 文件

3. 截图并保存为对应的 PNG 文件名

## 所需文件

- 32x32.png
- 128x128.png
- 128x128@2x.png
- icon.png
- icon.icns (macOS)
- icon.ico (Windows)

## 在线工具

也可以使用在线工具将 SVG 转换为 PNG：
- https://convertio.co/svg-png/
- https://cloudconvert.com/svg-to-png

上传 icon.svg 文件，然后下载不同尺寸的 PNG。
`;

fs.writeFileSync(path.join(iconsDir, 'README.md'), readme);

console.log('图标文件已生成！');
console.log('请按照 README.md 中的说明生成 PNG 图标。');

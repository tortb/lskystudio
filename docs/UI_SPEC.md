# UI/UX 规范

## 1. 设计原则

### 1.1 核心理念

- **极简：** 去除多余装饰，聚焦核心功能
- **现代：** 使用当代设计语言，符合用户习惯
- **高效：** 减少操作步骤，提升工作效率
- **一致：** 统一的视觉语言和交互模式

### 1.2 参考产品

- **VSCode：** 侧边栏布局、标签页、命令面板
- **GitHub Desktop：** 简洁的列表视图、状态指示
- **Linear：** 极简设计、流畅动画、清晰层次
- **Notion：** 块级编辑、灵活布局
- **Cursor：** 现代感、暗色主题
- **PicGo：** 上传工具的专业功能

---

## 2. 颜色系统

### 2.1 浅色主题

```css
:root {
  /* 背景色 */
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  
  /* 卡片 */
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  
  /* 弹出层 */
  --popover: 0 0% 100%;
  --popover-foreground: 222.2 84% 4.9%;
  
  /* 主色 */
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  
  /* 次要色 */
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  
  /* 强调色 */
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  
  /* 危险色 */
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  
  /* 成功色 */
  --success: 142.1 76.2% 36.3%;
  --success-foreground: 355.7 100% 97.3%;
  
  /* 警告色 */
  --warning: 47.9 95.8% 53.1%;
  --warning-foreground: 26 83.3% 14.1%;
  
  /* 边框 */
  --border: 214.3 31.8% 91.4%;
  
  /* 输入框 */
  --input: 214.3 31.8% 91.4%;
  
  /* 焦点环 */
  --ring: 222.2 84% 4.9%;
  
  /* 圆角 */
  --radius: 0.5rem;
}
```

### 2.2 深色主题

```css
.dark {
  /* 背景色 */
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  
  /* 卡片 */
  --card: 222.2 84% 4.9%;
  --card-foreground: 210 40% 98%;
  
  /* 弹出层 */
  --popover: 222.2 84% 4.9%;
  --popover-foreground: 210 40% 98%;
  
  /* 主色 */
  --primary: 210 40% 98%;
  --primary-foreground: 222.2 47.4% 11.2%;
  
  /* 次要色 */
  --secondary: 217.2 32.6% 17.5%;
  --secondary-foreground: 210 40% 98%;
  
  /* 强调色 */
  --accent: 217.2 32.6% 17.5%;
  --accent-foreground: 210 40% 98%;
  
  /* 危险色 */
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 210 40% 98%;
  
  /* 成功色 */
  --success: 142.1 70.6% 45.3%;
  --success-foreground: 144.9 80.4% 10%;
  
  /* 警告色 */
  --warning: 47.9 95.8% 53.1%;
  --warning-foreground: 26 83.3% 14.1%;
  
  /* 边框 */
  --border: 217.2 32.6% 17.5%;
  
  /* 输入框 */
  --input: 217.2 32.6% 17.5%;
  
  /* 焦点环 */
  --ring: 212.7 26.8% 83.9%;
}
```

---

## 3. 排版系统

### 3.1 字体

```css
/* 无衬线字体 */
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 
             'Helvetica Neue', Arial, 'Noto Sans', sans-serif;

/* 等宽字体 */
--font-mono: 'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', monospace;
```

### 3.2 字号

| 用途 | 字号 | 行高 | 字重 |
|------|------|------|------|
| 标题 H1 | 24px | 32px | 600 |
| 标题 H2 | 20px | 28px | 600 |
| 标题 H3 | 16px | 24px | 600 |
| 正文 | 14px | 20px | 400 |
| 小字 | 12px | 16px | 400 |
| 徽章 | 11px | 16px | 500 |

---

## 4. 间距系统

### 4.1 基础间距

```css
--spacing-1: 4px;
--spacing-2: 8px;
--spacing-3: 12px;
--spacing-4: 16px;
--spacing-5: 20px;
--spacing-6: 24px;
--spacing-8: 32px;
--spacing-10: 40px;
--spacing-12: 48px;
```

### 4.2 使用场景

| 场景 | 间距 |
|------|------|
| 组件内边距 | 12px - 16px |
| 组件间距 | 8px - 12px |
| 区域间距 | 24px - 32px |
| 页面边距 | 24px |

---

## 5. 圆角系统

```css
--radius-sm: 0.25rem;   /* 4px - 小组件 */
--radius-md: 0.375rem;  /* 6px - 按钮、输入框 */
--radius-lg: 0.5rem;    /* 8px - 卡片、对话框 */
--radius-xl: 0.75rem;   /* 12px - 大卡片 */
--radius-full: 9999px;  /* 圆形 */
```

---

## 6. 阴影系统

```css
/* 浅色主题 */
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);

/* 深色主题 */
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.3);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.4), 0 2px 4px -2px rgb(0 0 0 / 0.3);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.4), 0 4px 6px -4px rgb(0 0 0 / 0.3);
```

---

## 7. 图标系统

### 7.1 图标库

使用 **Lucide React** 图标库

### 7.2 图标尺寸

| 用途 | 尺寸 |
|------|------|
| 按钮图标 | 16px |
| 菜单图标 | 16px |
| 状态图标 | 16px |
| 导航图标 | 20px |
| 大图标 | 24px |

### 7.3 常用图标

```typescript
// 导航
import { 
  LayoutDashboard,  // 仪表盘
  Upload,           // 上传
  History,          // 历史
  Image,            // 相册
  Settings,         // 设置
  Info,             // 关于
} from 'lucide-react';

// 操作
import {
  Play,             // 开始
  Pause,            // 暂停
  Square,           // 停止
  RotateCcw,        // 重试
  Copy,             // 复制
  Trash2,           // 删除
  Download,         // 下载
  Search,           // 搜索
  Filter,           // 筛选
  Plus,             // 添加
  X,                // 关闭
  Check,            // 确认
  ChevronDown,      // 下拉
  ChevronRight,     // 展开
  MoreHorizontal,   // 更多
} from 'lucide-react';

// 状态
import {
  CheckCircle,      // 成功
  XCircle,          // 失败
  AlertCircle,      // 警告
  Info,             // 信息
  Loader2,          // 加载
  Clock,            // 等待
} from 'lucide-react';
```

---

## 8. 布局系统

### 8.1 整体布局

```
┌─────────────────────────────────────────────────────────────┐
│                    Titlebar (32px)                          │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  ● ● ●                              Lsky Studio      │ │
│  └───────────────────────────────────────────────────────┘ │
├─────────┬───────────────────────────────────────────────────┤
│         │                                                   │
│ Sidebar │              Content Area                         │
│ (240px) │                                                   │
│         │   ┌───────────────────────────────────────────┐  │
│ ┌─────┐ │   │            Header (48px)                  │  │
│ │     │ │   │  Title                    Actions          │  │
│ │     │ │   └───────────────────────────────────────────┘  │
│ │     │ │                                                   │
│ │     │ │   ┌───────────────────────────────────────────┐  │
│ │     │ │   │                                           │  │
│ │     │ │   │            Content                        │  │
│ │     │ │   │                                           │  │
│ │     │ │   │                                           │  │
│ └─────┘ │   └───────────────────────────────────────────┘  │
│         │                                                   │
└─────────┴───────────────────────────────────────────────────┘
```

### 8.2 侧边栏

```typescript
// 侧边栏宽度
--sidebar-width: 240px;
--sidebar-width-collapsed: 64px;

// 侧边栏结构
sidebar: {
  header: Logo + App Name
  navigation: [
    { icon: LayoutDashboard, label: '仪表盘', path: '/' },
    { icon: Upload, label: '上传', path: '/upload' },
    { icon: History, label: '历史记录', path: '/history' },
    { icon: Image, label: '相册管理', path: '/albums' },
    { icon: Settings, label: '设置', path: '/settings' },
  ]
  footer: Theme Toggle + Version
}
```

### 8.3 内容区域

```typescript
// 内容区域结构
content: {
  header: {
    title: string;
    description?: string;
    actions: React.ReactNode;
  }
  body: {
    // 页面内容
  }
}
```

---

## 9. 组件规范

### 9.1 按钮

```typescript
// 按钮变体
variants: {
  default: 'bg-primary text-primary-foreground hover:bg-primary/90',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  ghost: 'hover:bg-accent hover:text-accent-foreground',
  link: 'text-primary underline-offset-4 hover:underline',
}

// 按钮尺寸
sizes: {
  default: 'h-10 px-4 py-2',
  sm: 'h-9 rounded-md px-3',
  lg: 'h-11 rounded-md px-8',
  icon: 'h-10 w-10',
}
```

### 9.2 输入框

```typescript
// 输入框样式
input: {
  base: 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
  focus: 'ring-2 ring-ring ring-offset-2',
  disabled: 'cursor-not-allowed opacity-50',
  error: 'border-destructive',
}
```

### 9.3 卡片

```typescript
// 卡片样式
card: {
  base: 'rounded-lg border bg-card text-card-foreground shadow-sm',
  header: 'flex flex-col space-y-1.5 p-6',
  title: 'text-2xl font-semibold leading-none tracking-tight',
  description: 'text-sm text-muted-foreground',
  content: 'p-6 pt-0',
  footer: 'flex items-center p-6 pt-0',
}
```

### 9.4 表格

```typescript
// 表格样式
table: {
  base: 'w-full caption-bottom text-sm',
  header: 'border-b',
  headerCell: 'h-12 px-4 text-left align-middle font-medium text-muted-foreground',
  body: '[&_tr:last-child]:border-0',
  row: 'border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted',
  cell: 'p-4 align-middle',
}
```

### 9.5 徽章

```typescript
// 徽章变体
variants: {
  default: 'bg-primary text-primary-foreground hover:bg-primary/80',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/80',
  outline: 'text-foreground',
  success: 'bg-success text-success-foreground',
  warning: 'bg-warning text-warning-foreground',
}
```

### 9.6 进度条

```typescript
// 进度条样式
progress: {
  base: 'relative h-4 w-full overflow-hidden rounded-full bg-secondary',
  indicator: 'h-full w-full flex-1 bg-primary transition-all',
  sizes: {
    sm: 'h-2',
    default: 'h-4',
    lg: 'h-6',
  }
}
```

---

## 10. 动画系统

### 10.1 过渡时间

```css
--duration-fast: 150ms;
--duration-normal: 200ms;
--duration-slow: 300ms;
```

### 10.2 缓动函数

```css
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
```

### 10.3 常用动画

```typescript
// 淡入
fadeIn: {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.2 },
}

// 滑入
slideIn: {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.2 },
}

// 缩放
scale: {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.2 },
}
```

---

## 11. 响应式设计

### 11.1 断点

```css
--screen-sm: 640px;
--screen-md: 768px;
--screen-lg: 1024px;
--screen-xl: 1280px;
--screen-2xl: 1536px;
```

### 11.2 桌面应用适配

由于是桌面应用，主要考虑：

- 最小窗口尺寸：1024x768
- 侧边栏折叠：窗口宽度 < 1280px 时自动折叠
- 内容区域自适应

---

## 12. 状态指示

### 12.1 上传状态

| 状态 | 颜色 | 图标 |
|------|------|------|
| 等待中 | muted | Clock |
| 上传中 | primary | Loader2 (旋转) |
| 成功 | success | CheckCircle |
| 失败 | destructive | XCircle |
| 已暂停 | warning | Pause |
| 已取消 | muted | X |

### 12.2 进度指示

```typescript
// 进度颜色
progress: {
  0-30: 'bg-blue-500',
  30-70: 'bg-blue-600',
  70-100: 'bg-green-500',
}
```

---

## 13. 无障碍设计

### 13.1 键盘导航

- Tab 键切换焦点
- Enter 键确认
- Escape 键关闭
- 方向键导航列表

### 13.2 屏幕阅读器

- 所有交互元素添加 aria-label
- 图标按钮添加描述
- 状态变更通知

### 13.3 颜色对比

- 文本对比度 ≥ 4.5:1
- 大文本对比度 ≥ 3:1
- 交互元素对比度 ≥ 3:1

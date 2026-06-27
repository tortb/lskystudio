# 组件设计文档

## 1. 组件架构

### 1.1 组件层次

```
components/
├── ui/                    # shadcn 基础组件（自动生成）
├── layout/                # 布局组件
├── shared/                # 业务共享组件
└── features/              # 功能模块组件
    ├── dashboard/
    ├── upload/
    ├── history/
    ├── album/
    └── settings/
```

### 1.2 组件原则

- **单一职责：** 每个组件只做一件事
- **可组合：** 组件可以嵌套组合
- **可复用：** 通用组件提取到 shared
- **类型安全：** 所有 props 使用 TypeScript

---

## 2. 布局组件

### 2.1 AppLayout

根布局组件，包含侧边栏和内容区域。

```typescript
// apps/desktop/src/components/layout/app-layout.tsx

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
```

### 2.2 Sidebar

侧边栏导航组件。

```typescript
// apps/desktop/src/components/layout/sidebar.tsx

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

interface NavItem {
  icon: LucideIcon;
  label: string;
  path: string;
  badge?: number;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  
  const navItems: NavItem[] = [
    { icon: LayoutDashboard, label: '仪表盘', path: '/' },
    { icon: Upload, label: '上传', path: '/upload' },
    { icon: History, label: '历史记录', path: '/history' },
    { icon: Image, label: '相册管理', path: '/albums' },
    { icon: Settings, label: '设置', path: '/settings' },
  ];
  
  return (
    <aside className={cn(
      'flex flex-col border-r bg-card transition-all',
      collapsed ? 'w-16' : 'w-60'
    )}>
      {/* Logo */}
      <div className="flex h-14 items-center border-b px-4">
        <Logo collapsed={collapsed} />
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => (
          <NavItem
            key={item.path}
            item={item}
            active={pathname === item.path}
            collapsed={collapsed}
          />
        ))}
      </nav>
      
      {/* Footer */}
      <div className="border-t p-4">
        <ThemeToggle />
        <VersionInfo />
      </div>
    </aside>
  );
}
```

### 2.3 Titlebar

自定义标题栏组件（Tauri 窗口控制）。

```typescript
// apps/desktop/src/components/layout/titlebar.tsx

export function Titlebar() {
  const { minimize, maximize, close } = useWindowControls();
  
  return (
    <div className="flex h-8 items-center justify-between bg-card px-2">
      {/* 拖拽区域 */}
      <div className="flex-1 drag-region">
        <span className="text-xs text-muted-foreground">Lsky Studio</span>
      </div>
      
      {/* 窗口控制按钮 */}
      <div className="flex items-center space-x-1">
        <Button variant="ghost" size="icon" onClick={minimize}>
          <Minus className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={maximize}>
          <Square className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={close}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
```

### 2.4 PageHeader

页面头部组件。

```typescript
// apps/desktop/src/components/layout/page-header.tsx

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between space-y-2">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center space-x-2">{actions}</div>}
    </div>
  );
}
```

---

## 3. 业务共享组件

### 3.1 FileDropzone

文件拖拽区域组件。

```typescript
// apps/desktop/src/components/shared/file-dropzone.tsx

interface FileDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string[];
  maxFiles?: number;
  maxSize?: number;
  disabled?: boolean;
}

export function FileDropzone({
  onFilesSelected,
  accept = ['image/*'],
  maxFiles = 100,
  maxSize = 10 * 1024 * 1024, // 10MB
  disabled,
}: FileDropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  
  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter((file) => {
      if (accept && !accept.some((type) => file.type.match(type))) {
        return false;
      }
      if (file.size > maxSize) {
        return false;
      }
      return true;
    });
    
    onFilesSelected(validFiles.slice(0, maxFiles));
  }, [accept, maxSize, maxFiles, onFilesSelected]);
  
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors',
        isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
        disabled && 'cursor-not-allowed opacity-50'
      )}
      onDragOver={(e) => e.preventDefault()}
      onDragEnter={() => setIsDragActive(true)}
      onDragLeave={() => setIsDragActive(false)}
      onDrop={handleDrop}
    >
      <Upload className="mb-4 h-10 w-10 text-muted-foreground" />
      <p className="mb-2 text-sm font-medium">
        拖拽文件到此处或点击选择
      </p>
      <p className="text-xs text-muted-foreground">
        支持 {accept.join(', ')} 格式，最大 {formatFileSize(maxSize)}
      </p>
    </div>
  );
}
```

### 3.2 ProgressCard

上传进度卡片组件。

```typescript
// apps/desktop/src/components/shared/progress-card.tsx

interface ProgressCardProps {
  task: UploadTask;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
  onRetry?: () => void;
  onCopyUrl?: () => void;
}

export function ProgressCard({
  task,
  onPause,
  onResume,
  onCancel,
  onRetry,
  onCopyUrl,
}: ProgressCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start space-x-4">
          {/* 文件预览 */}
          <div className="h-16 w-16 overflow-hidden rounded bg-muted">
            {task.result?.thumbUrl ? (
              <img src={task.result.thumbUrl} alt={task.file.name} />
            ) : (
              <FileImage className="h-full w-full p-4 text-muted-foreground" />
            )}
          </div>
          
          {/* 文件信息 */}
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium">{task.file.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(task.file.size)}
            </p>
            
            {/* 进度条 */}
            {task.status === 'uploading' && (
              <Progress value={task.progress} className="h-2" />
            )}
            
            {/* 状态信息 */}
            <div className="flex items-center space-x-2">
              <StatusBadge status={task.status} />
              {task.status === 'uploading' && (
                <span className="text-xs text-muted-foreground">
                  {formatSpeed(task.speed)} · {formatRemainingTime(task.remainingTime)}
                </span>
              )}
              {task.error && (
                <span className="text-xs text-destructive">{task.error}</span>
              )}
            </div>
          </div>
          
          {/* 操作按钮 */}
          <div className="flex items-center space-x-1">
            {task.status === 'uploading' && (
              <Button variant="ghost" size="icon" onClick={onPause}>
                <Pause className="h-4 w-4" />
              </Button>
            )}
            {task.status === 'paused' && (
              <Button variant="ghost" size="icon" onClick={onResume}>
                <Play className="h-4 w-4" />
              </Button>
            )}
            {task.status === 'failed' && (
              <Button variant="ghost" size="icon" onClick={onRetry}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
            {task.result?.url && (
              <Button variant="ghost" size="icon" onClick={onCopyUrl}>
                <Copy className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

### 3.3 StatusBadge

状态徽章组件。

```typescript
// apps/desktop/src/components/shared/status-badge.tsx

interface StatusBadgeProps {
  status: UploadStatus;
}

const statusConfig: Record<UploadStatus, { label: string; variant: string; icon: LucideIcon }> = {
  pending: { label: '等待中', variant: 'secondary', icon: Clock },
  uploading: { label: '上传中', variant: 'default', icon: Loader2 },
  success: { label: '成功', variant: 'success', icon: CheckCircle },
  failed: { label: '失败', variant: 'destructive', icon: XCircle },
  paused: { label: '已暂停', variant: 'warning', icon: Pause },
  cancelled: { label: '已取消', variant: 'secondary', icon: X },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  
  return (
    <Badge variant={config.variant as any}>
      <Icon className={cn(
        'mr-1 h-3 w-3',
        status === 'uploading' && 'animate-spin'
      )} />
      {config.label}
    </Badge>
  );
}
```

### 3.4 CopyButton

复制按钮组件。

```typescript
// apps/desktop/src/components/shared/copy-button.tsx

interface CopyButtonProps {
  text: string;
  label?: string;
  variant?: 'default' | 'ghost' | 'outline';
}

export function CopyButton({ text, label, variant = 'ghost' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <Button variant={variant} size="sm" onClick={handleCopy}>
      {copied ? (
        <>
          <Check className="mr-2 h-4 w-4" />
          已复制
        </>
      ) : (
        <>
          <Copy className="mr-2 h-4 w-4" />
          {label || '复制'}
        </>
      )}
    </Button>
  );
}
```

### 3.5 EmptyState

空状态组件。

```typescript
// apps/desktop/src/components/shared/empty-state.tsx

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Icon className="mb-4 h-12 w-12 text-muted-foreground" />
      <h3 className="mb-2 text-lg font-medium">{title}</h3>
      {description && (
        <p className="mb-4 text-sm text-muted-foreground">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick}>{action.label}</Button>
      )}
    </div>
  );
}
```

---

## 4. 功能模块组件

### 4.1 Dashboard 模块

#### StatsCard

统计卡片组件。

```typescript
// apps/desktop/src/features/dashboard/stats-card.tsx

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export function StatsCard({ title, value, description, icon: Icon, trend }: StatsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {trend && (
          <div className={cn(
            'text-xs',
            trend.isPositive ? 'text-green-600' : 'text-red-600'
          )}>
            {trend.isPositive ? '+' : ''}{trend.value}%
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

#### RecentUploads

最近上传组件。

```typescript
// apps/desktop/src/features/dashboard/recent-uploads.tsx

interface RecentUploadsProps {
  limit?: number;
}

export function RecentUploads({ limit = 5 }: RecentUploadsProps) {
  const { data: history } = useHistory({ limit });
  
  if (!history?.items.length) {
    return (
      <EmptyState
        icon={History}
        title="暂无上传记录"
        description="上传图片后将在此显示"
      />
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>最近上传</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {history.items.map((item) => (
            <div key={item.id} className="flex items-center space-x-4">
              <div className="h-10 w-10 overflow-hidden rounded bg-muted">
                {item.thumbUrl && <img src={item.thumbUrl} alt={item.fileName} />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{item.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(item.createdAt)}
                </p>
              </div>
              <CopyButton text={item.url || ''} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

---

### 4.2 Upload 模块

#### UploadPage

上传页面组件。

```typescript
// apps/desktop/src/features/upload/index.tsx

export function UploadPage() {
  const { files, addFiles, removeFiles, clearFiles } = useUploadFiles();
  const { start, pause, resume, cancel, tasks } = useUpload();
  const { config } = useConfig();
  
  return (
    <div className="space-y-6">
      <PageHeader
        title="上传"
        description="上传图片到兰空图床"
        actions={
          <div className="flex space-x-2">
            <Button variant="outline" onClick={clearFiles}>
              清空
            </Button>
            <Button onClick={() => start(files)}>
              开始上传
            </Button>
          </div>
        }
      />
      
      {/* 文件选择区域 */}
      <FileDropzone onFilesSelected={addFiles} />
      
      {/* 文件列表 */}
      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>待上传文件 ({files.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <FileList files={files} onRemove={removeFiles} />
          </CardContent>
        </Card>
      )}
      
      {/* 上传任务列表 */}
      {tasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>上传任务</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tasks.map((task) => (
                <ProgressCard
                  key={task.id}
                  task={task}
                  onPause={() => pause(task.id)}
                  onResume={() => resume(task.id)}
                  onCancel={() => cancel(task.id)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

#### FileList

文件列表组件。

```typescript
// apps/desktop/src/features/upload/file-list.tsx

interface FileListProps {
  files: UploadFile[];
  onRemove: (index: number) => void;
}

export function FileList({ files, onRemove }: FileListProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">预览</TableHead>
          <TableHead>文件名</TableHead>
          <TableHead>大小</TableHead>
          <TableHead>类型</TableHead>
          <TableHead className="w-12">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {files.map((file, index) => (
          <TableRow key={index}>
            <TableCell>
              <div className="h-8 w-8 overflow-hidden rounded bg-muted">
                <FilePreview file={file} />
              </div>
            </TableCell>
            <TableCell>{file.name}</TableCell>
            <TableCell>{formatFileSize(file.size)}</TableCell>
            <TableCell>{file.type}</TableCell>
            <TableCell>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemove(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

---

### 4.3 History 模块

#### HistoryPage

历史记录页面组件。

```typescript
// apps/desktop/src/features/history/index.tsx

export function HistoryPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>();
  const { data, isLoading } = useHistory({ keyword: search, status });
  
  return (
    <div className="space-y-6">
      <PageHeader
        title="历史记录"
        description="查看上传历史"
        actions={
          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              导出
            </Button>
            <Button variant="destructive" onClick={handleClear}>
              <Trash2 className="mr-2 h-4 w-4" />
              清空
            </Button>
          </div>
        }
      />
      
      {/* 筛选栏 */}
      <div className="flex items-center space-x-4">
        <Input
          placeholder="搜索文件名..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="success">成功</SelectItem>
            <SelectItem value="failed">失败</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* 历史表格 */}
      <HistoryTable data={data?.items} isLoading={isLoading} />
    </div>
  );
}
```

#### HistoryTable

历史记录表格组件。

```typescript
// apps/desktop/src/features/history/history-table.tsx

interface HistoryTableProps {
  data?: HistoryRecord[];
  isLoading: boolean;
}

export function HistoryTable({ data, isLoading }: HistoryTableProps) {
  const columns: ColumnDef<HistoryRecord>[] = [
    {
      accessorKey: 'fileName',
      header: '文件名',
      cell: ({ row }) => (
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 overflow-hidden rounded bg-muted">
            {row.original.thumbUrl && (
              <img src={row.original.thumbUrl} alt={row.original.fileName} />
            )}
          </div>
          <span>{row.original.fileName}</span>
        </div>
      ),
    },
    {
      accessorKey: 'fileSize',
      header: '大小',
      cell: ({ row }) => formatFileSize(row.original.fileSize),
    },
    {
      accessorKey: 'status',
      header: '状态',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'createdAt',
      header: '时间',
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex items-center space-x-2">
          {row.original.url && <CopyButton text={row.original.url} />}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDelete(row.original.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];
  
  return (
    <DataTable
      columns={columns}
      data={data || []}
      isLoading={isLoading}
      emptyMessage="暂无上传记录"
    />
  );
}
```

---

### 4.4 Album 模块

#### AlbumPage

相册管理页面组件。

```typescript
// apps/desktop/src/features/album/index.tsx

export function AlbumPage() {
  const { data: albums, isLoading } = useAlbums();
  const createAlbum = useCreateAlbum();
  
  return (
    <div className="space-y-6">
      <PageHeader
        title="相册管理"
        description="管理兰空图床相册"
        actions={
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            创建相册
          </Button>
        }
      />
      
      {/* 相册列表 */}
      {isLoading ? (
        <AlbumSkeleton />
      ) : albums?.length ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {albums.map((album) => (
            <AlbumCard key={album.id} album={album} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Image}
          title="暂无相册"
          description="创建相册来组织你的图片"
          action={{
            label: '创建相册',
            onClick: () => setShowCreateDialog(true),
          }}
        />
      )}
      
      {/* 创建相册对话框 */}
      <CreateAlbumDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={createAlbum.mutate}
      />
    </div>
  );
}
```

#### AlbumCard

相册卡片组件。

```typescript
// apps/desktop/src/features/album/album-card.tsx

interface AlbumCardProps {
  album: Album;
  onClick?: () => void;
}

export function AlbumCard({ album, onClick }: AlbumCardProps) {
  return (
    <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={onClick}>
      <div className="aspect-video overflow-hidden rounded-t-lg bg-muted">
        {album.coverUrl ? (
          <img src={album.coverUrl} alt={album.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Image className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <h3 className="font-medium">{album.name}</h3>
        <p className="text-sm text-muted-foreground">
          {album.imageCount} 张图片
        </p>
      </CardContent>
    </Card>
  );
}
```

---

### 4.5 Settings 模块

#### SettingsPage

设置页面组件。

```typescript
// apps/desktop/src/features/settings/index.tsx

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="设置"
        description="配置应用参数"
      />
      
      <Tabs defaultValue="api">
        <TabsList>
          <TabsTrigger value="api">API 配置</TabsTrigger>
          <TabsTrigger value="upload">上传设置</TabsTrigger>
          <TabsTrigger value="proxy">代理设置</TabsTrigger>
          <TabsTrigger value="appearance">外观</TabsTrigger>
        </TabsList>
        
        <TabsContent value="api">
          <ApiSettings />
        </TabsContent>
        
        <TabsContent value="upload">
          <UploadSettings />
        </TabsContent>
        
        <TabsContent value="proxy">
          <ProxySettings />
        </TabsContent>
        
        <TabsContent value="appearance">
          <AppearanceSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

#### ApiSettings

API 配置组件。

```typescript
// apps/desktop/src/features/settings/api-settings.tsx

export function ApiSettings() {
  const { config, updateConfig } = useConfig();
  const form = useForm<ApiConfig>({
    resolver: zodResolver(apiConfigSchema),
    defaultValues: {
      apiUrl: config?.apiUrl || '',
      apiToken: config?.apiToken || '',
      strategyId: config?.strategyId || '',
    },
  });
  
  const testConnection = useTestConnection();
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>API 配置</CardTitle>
        <CardDescription>配置兰空图床 API 连接</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="apiUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://your-domain.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="apiToken"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API Token</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex space-x-2">
              <Button type="submit">保存</Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => testConnection.mutate(form.getValues())}
              >
                测试连接
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
```

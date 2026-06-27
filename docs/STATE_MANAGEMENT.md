# 状态管理文档

## 1. 状态分类

### 1.1 服务端状态

**定义：** 来自后端（Node.js/Rust）的数据，需要异步获取和缓存。

**管理工具：** TanStack Query

**示例：**
- 上传任务列表
- 历史记录
- 相册列表
- 应用配置
- 存储策略

### 1.2 客户端状态

**定义：** 纯前端的 UI 状态，不涉及后端数据。

**管理工具：** Zustand

**示例：**
- 主题设置
- 侧边栏展开/折叠
- 模态框显示/隐藏
- 表单草稿
- 临时选择状态

---

## 2. TanStack Query 配置

### 2.1 QueryClient 配置

```typescript
// apps/desktop/src/app/providers.tsx

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 缓存时间：5 分钟
      gcTime: 5 * 60 * 1000,
      // 数据新鲜时间：30 秒
      staleTime: 30 * 1000,
      // 窗口聚焦时重新获取
      refetchOnWindowFocus: true,
      // 重试次数
      retry: 3,
      // 重试延迟
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      // 重试次数
      retry: 1,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

### 2.2 Query Keys

```typescript
// apps/desktop/src/lib/query-keys.ts

export const queryKeys = {
  // 配置
  config: {
    all: ['config'] as const,
    detail: () => [...queryKeys.config.all, 'detail'] as const,
    strategies: () => [...queryKeys.config.all, 'strategies'] as const,
  },
  
  // 上传
  upload: {
    all: ['upload'] as const,
    tasks: () => [...queryKeys.upload.all, 'tasks'] as const,
    task: (id: string) => [...queryKeys.upload.tasks(), id] as const,
    status: () => [...queryKeys.upload.all, 'status'] as const,
  },
  
  // 历史记录
  history: {
    all: ['history'] as const,
    list: (params: HistoryQueryParams) => 
      [...queryKeys.history.all, 'list', params] as const,
    detail: (id: string) => [...queryKeys.history.all, 'detail', id] as const,
    stats: () => [...queryKeys.history.all, 'stats'] as const,
  },
  
  // 相册
  album: {
    all: ['album'] as const,
    list: () => [...queryKeys.album.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.album.all, 'detail', id] as const,
  },
} as const;
```

---

## 3. Custom Hooks

### 3.1 useConfig

配置管理 Hook。

```typescript
// apps/desktop/src/hooks/use-config.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { api } from '@/lib/api';

export function useConfig() {
  const queryClient = useQueryClient();
  
  // 获取配置
  const query = useQuery({
    queryKey: queryKeys.config.detail(),
    queryFn: () => api.config.get(),
  });
  
  // 更新配置
  const updateMutation = useMutation({
    mutationFn: (config: Partial<AppConfig>) => api.config.update(config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.config.all });
    },
  });
  
  return {
    config: query.data,
    isLoading: query.isLoading,
    error: query.error,
    updateConfig: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
}

export function useStrategies() {
  return useQuery({
    queryKey: queryKeys.config.strategies(),
    queryFn: () => api.config.getStrategies(),
  });
}

export function useTestConnection() {
  return useMutation({
    mutationFn: (params: { apiUrl: string; apiToken: string }) =>
      api.config.testConnection(params),
  });
}
```

### 3.2 useUpload

上传管理 Hook。

```typescript
// apps/desktop/src/hooks/use-upload.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { api } from '@/lib/api';

export function useUpload() {
  const queryClient = useQueryClient();
  
  // 获取任务列表
  const tasksQuery = useQuery({
    queryKey: queryKeys.upload.tasks(),
    queryFn: () => api.upload.getStatus(),
    refetchInterval: 1000, // 每秒刷新
  });
  
  // 开始上传
  const startMutation = useMutation({
    mutationFn: (files: UploadFile[]) => api.upload.start(files),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.upload.all });
    },
  });
  
  // 暂停上传
  const pauseMutation = useMutation({
    mutationFn: (taskIds?: string[]) => api.upload.pause(taskIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.upload.all });
    },
  });
  
  // 继续上传
  const resumeMutation = useMutation({
    mutationFn: (taskIds?: string[]) => api.upload.resume(taskIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.upload.all });
    },
  });
  
  // 取消上传
  const cancelMutation = useMutation({
    mutationFn: (taskIds?: string[]) => api.upload.cancel(taskIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.upload.all });
    },
  });
  
  return {
    tasks: tasksQuery.data?.tasks || [],
    isLoading: tasksQuery.isLoading,
    start: startMutation.mutate,
    pause: pauseMutation.mutate,
    resume: resumeMutation.mutate,
    cancel: cancelMutation.mutate,
    isStarting: startMutation.isPending,
  };
}

// 监听上传事件
export function useUploadEvents() {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    // 监听进度事件
    const unlistenProgress = api.upload.onProgress((progress) => {
      queryClient.setQueryData(
        queryKeys.upload.tasks(),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            tasks: old.tasks.map((task) =>
              task.id === progress.taskId
                ? { ...task, ...progress }
                : task
            ),
          };
        }
      );
    });
    
    // 监听完成事件
    const unlistenComplete = api.upload.onComplete((result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.upload.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.history.all });
      
      // 自动复制 URL
      if (config?.autoCopyUrl) {
        navigator.clipboard.writeText(result.url);
      }
    });
    
    return () => {
      unlistenProgress.then((fn) => fn());
      unlistenComplete.then((fn) => fn());
    };
  }, [queryClient]);
}
```

### 3.3 useHistory

历史记录 Hook。

```typescript
// apps/desktop/src/hooks/use-history.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { api } from '@/lib/api';

export function useHistory(params: HistoryQueryParams = {}) {
  return useQuery({
    queryKey: queryKeys.history.list(params),
    queryFn: () => api.history.list(params),
  });
}

export function useHistoryDetail(id: string) {
  return useQuery({
    queryKey: queryKeys.history.detail(id),
    queryFn: () => api.history.getById(id),
    enabled: !!id,
  });
}

export function useHistoryStats() {
  return useQuery({
    queryKey: queryKeys.history.stats(),
    queryFn: () => api.history.getStats(),
  });
}

export function useDeleteHistory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (ids: string[]) => api.history.delete(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.history.all });
    },
  });
}

export function useClearHistory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (params?: ClearHistoryParams) => api.history.clear(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.history.all });
    },
  });
}

export function useExportHistory() {
  return useMutation({
    mutationFn: (params: ExportHistoryParams) => api.history.export(params),
  });
}
```

### 3.4 useAlbum

相册管理 Hook。

```typescript
// apps/desktop/src/hooks/use-album.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { api } from '@/lib/api';

export function useAlbums() {
  return useQuery({
    queryKey: queryKeys.album.list(),
    queryFn: () => api.album.list(),
  });
}

export function useAlbumDetail(id: string) {
  return useQuery({
    queryKey: queryKeys.album.detail(id),
    queryFn: () => api.album.getById(id),
    enabled: !!id,
  });
}

export function useCreateAlbum() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (params: CreateAlbumParams) => api.album.create(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.album.all });
    },
  });
}

export function useDeleteAlbum() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => api.album.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.album.all });
    },
  });
}

export function useSyncAlbums() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => api.album.sync(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.album.all });
    },
  });
}
```

---

## 4. Zustand Stores

### 4.1 UI Store

```typescript
// apps/desktop/src/stores/ui.store.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  // 侧边栏
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  
  // 主题
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  
  // 语言
  language: string;
  setLanguage: (language: string) => void;
  
  // 模态框
  activeModal: string | null;
  modalData: unknown;
  openModal: (id: string, data?: unknown) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // 侧边栏
      sidebarCollapsed: false,
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) =>
        set({ sidebarCollapsed: collapsed }),
      
      // 主题
      theme: 'system',
      setTheme: (theme) => set({ theme }),
      
      // 语言
      language: 'zh-CN',
      setLanguage: (language) => set({ language }),
      
      // 模态框
      activeModal: null,
      modalData: null,
      openModal: (id, data) =>
        set({ activeModal: id, modalData: data }),
      closeModal: () =>
        set({ activeModal: null, modalData: null }),
    }),
    {
      name: 'ui-store',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        theme: state.theme,
        language: state.language,
      }),
    }
  )
);
```

### 4.2 Upload UI Store

```typescript
// apps/desktop/src/stores/upload.store.ts

import { create } from 'zustand';

interface UploadUIState {
  // 文件选择
  selectedFiles: UploadFile[];
  addFiles: (files: UploadFile[]) => void;
  removeFile: (index: number) => void;
  clearFiles: () => void;
  
  // 上传配置
  albumId: string | null;
  setAlbumId: (id: string | null) => void;
  
  // UI 状态
  showPreview: boolean;
  previewFile: UploadFile | null;
  setShowPreview: (show: boolean) => void;
  setPreviewFile: (file: UploadFile | null) => void;
}

export const useUploadUIStore = create<UploadUIState>()((set) => ({
  // 文件选择
  selectedFiles: [],
  addFiles: (files) =>
    set((state) => ({
      selectedFiles: [...state.selectedFiles, ...files],
    })),
  removeFile: (index) =>
    set((state) => ({
      selectedFiles: state.selectedFiles.filter((_, i) => i !== index),
    })),
  clearFiles: () => set({ selectedFiles: [] }),
  
  // 上传配置
  albumId: null,
  setAlbumId: (id) => set({ albumId: id }),
  
  // UI 状态
  showPreview: false,
  previewFile: null,
  setShowPreview: (show) => set({ showPreview: show }),
  setPreviewFile: (file) => set({ previewFile: file }),
}));
```

---

## 5. 状态同步

### 5.1 IPC 事件同步

```typescript
// apps/desktop/src/lib/ipc-sync.ts

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { listen } from '@tauri-apps/api/event';
import { queryKeys } from './query-keys';

export function useIPCEvents() {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    const unlisteners: Promise<() => void>[] = [];
    
    // 上传进度事件
    unlisteners.push(
      listen('upload_progress', (event) => {
        const progress = event.payload as UploadProgressEvent;
        queryClient.setQueryData(
          queryKeys.upload.tasks(),
          (old) => {
            if (!old) return old;
            return {
              ...old,
              tasks: old.tasks.map((task) =>
                task.id === progress.taskId
                  ? { ...task, progress: progress.progress, speed: progress.speed }
                  : task
              ),
            };
          }
        );
      })
    );
    
    // 上传完成事件
    unlisteners.push(
      listen('upload_complete', (event) => {
        const result = event.payload as UploadCompleteEvent;
        queryClient.invalidateQueries({ queryKey: queryKeys.upload.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.history.all });
      })
    );
    
    // 上传错误事件
    unlisteners.push(
      listen('upload_error', (event) => {
        const error = event.payload as UploadErrorEvent;
        queryClient.invalidateQueries({ queryKey: queryKeys.upload.all });
      })
    );
    
    return () => {
      unlisteners.forEach((unlisten) => unlisten.then((fn) => fn()));
    };
  }, [queryClient]);
}
```

### 5.2 主题同步

```typescript
// apps/desktop/src/hooks/use-theme.ts

import { useEffect } from 'react';
import { useUIStore } from '@/stores/ui.store';

export function useTheme() {
  const { theme, setTheme } = useUIStore();
  
  useEffect(() => {
    const root = window.document.documentElement;
    
    root.classList.remove('light', 'dark');
    
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
        .matches
        ? 'dark'
        : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme]);
  
  return { theme, setTheme };
}
```

---

## 6. 最佳实践

### 6.1 查询规则

1. **使用语义化的 Query Key**
   ```typescript
   // ✅ 好
   queryKeys.history.list({ page: 1, status: 'success' })
   
   // ❌ 差
   ['history', 1, 'success']
   ```

2. **合理设置 staleTime**
   - 配置数据：30 秒
   - 列表数据：10 秒
   - 实时数据：0 秒（始终新鲜）

3. **使用 gcTime 管理缓存**
   - 频繁访问的数据：5 分钟
   - 偶尔访问的数据：1 分钟

### 6.2 Mutation 规则

1. **乐观更新**
   ```typescript
   useMutation({
     mutationFn: updateTodo,
     onMutate: async (newTodo) => {
       await queryClient.cancelQueries({ queryKey: ['todos'] });
       const previousTodos = queryClient.getQueryData(['todos']);
       queryClient.setQueryData(['todos'], (old) => [...old, newTodo]);
       return { previousTodos };
     },
     onError: (err, newTodo, context) => {
       queryClient.setQueryData(['todos'], context?.previousTodos);
     },
     onSettled: () => {
       queryClient.invalidateQueries({ queryKey: ['todos'] });
     },
   });
   ```

2. **错误处理**
   ```typescript
   useMutation({
     mutationFn: updateConfig,
     onError: (error) => {
       toast.error('更新失败: ' + error.message);
     },
   });
   ```

### 6.3 Zustand 规则

1. **使用 persist 中间件持久化**
   ```typescript
   create(
     persist(
       (set) => ({ ... }),
       { name: 'store-name' }
     )
   );
   ```

2. **选择性持久化**
   ```typescript
   partialize: (state) => ({
     theme: state.theme,
     language: state.language,
   }),
   ```

3. **避免存储大对象**
   - 只存储必要的状态
   - 大数据使用 TanStack Query

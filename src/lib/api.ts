/**
 * API 层
 * 封装 Tauri IPC 调用，提供类型安全的接口
 * 支持浏览器模式（localStorage + WebUploadEngine）和 Tauri 模式
 */

import { WebUploadEngine, type EngineUploadFile } from "./upload-engine";

// 类型定义
export interface AppConfig {
  apiUrl: string;
  apiToken: string;
  strategyId: string;
  concurrency: number;
  theme: string;
}

export interface UploadFile {
  path: string;
  name: string;
  size: number;
}

export interface UploadTask {
  id: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  status: "pending" | "uploading" | "success" | "failed" | "paused" | "cancelled";
  progress: number;
  url: string | null;
  error: string | null;
}

export interface Strategy {
  id: string;
  name: string;
  provider: string;
  description: string;
}

export interface ConnectionTestResult {
  success: boolean;
  version?: string;
  strategies?: Strategy[];
  error?: string;
}

export interface SystemStatus {
  status: string;
  uptime: number;
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
  };
  tasks: number;
  isUploading: boolean;
}

// 检测是否在 Tauri 环境中
const isTauri = window.__TAURI__ !== undefined;

/** 是否为 Web 模式（非 Tauri） */
export const isWebMode = !isTauri;

// 本地存储键名
const CONFIG_STORAGE_KEY = "lsky_studio_config";

// ---------------------------------------------------------------------------
// Web 模式上传引擎（单例）
// ---------------------------------------------------------------------------
let webEngine: WebUploadEngine | null = null;

function getWebEngine(concurrency?: number): WebUploadEngine {
  if (!webEngine) {
    webEngine = new WebUploadEngine(concurrency || 3);
  }
  return webEngine;
}

// Web 模式事件回调存储（模拟 Tauri 事件系统）
type WebEventCallback<T> = (payload: T) => void;
const webEventCallbacks = {
  upload_progress: [] as WebEventCallback<any>[],
  upload_complete: [] as WebEventCallback<any>[],
  upload_error: [] as WebEventCallback<any>[],
  upload_tasks_created: [] as WebEventCallback<any>[],
};

function setupWebEngineListeners(engine: WebUploadEngine) {
  engine.on("progress", (payload) => {
    webEventCallbacks.upload_progress.forEach((cb) => cb(payload));
  });
  engine.on("complete", (payload) => {
    webEventCallbacks.upload_complete.forEach((cb) => cb(payload));
  });
  engine.on("error", (payload) => {
    webEventCallbacks.upload_error.forEach((cb) => cb(payload));
  });
  engine.on("tasksCreated", (payload) => {
    webEventCallbacks.upload_tasks_created.forEach((cb) => cb(payload));
  });
}

// 通用错误处理
class ApiError extends Error {
  code: string;
  details?: unknown;

  constructor(message: string, code: string = "UNKNOWN_ERROR", details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.details = details;
  }
}

// 获取详细错误信息
function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "未知错误";
}

// Tauri IPC 调用（仅在 Tauri 环境中可用）
async function tauriInvoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri) {
    throw new ApiError("Tauri 环境不可用", "TAURI_NOT_AVAILABLE");
  }
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<T>(command, args);
  } catch (error) {
    throw new ApiError(
      getErrorMessage(error),
      "TAURI_INVOKE_ERROR",
      error
    );
  }
}

// IPC 通用调用
async function ipcCall<T>(method: string, params?: Record<string, unknown>): Promise<T> {
  return tauriInvoke<T>("ipc_call", { method, params: params || {} });
}

// 窗口控制 API
export const windowApi = {
  minimize: () => tauriInvoke("minimize_window"),
  maximize: () => tauriInvoke("maximize_window"),
  close: () => tauriInvoke("close_window"),
};

// 应用信息 API
export const appApi = {
  getVersion: async () => {
    try {
      return await tauriInvoke<string>("get_app_version");
    } catch {
      return "0.1.0"; // 浏览器模式返回默认版本
    }
  },
  getName: async () => {
    try {
      return await tauriInvoke<string>("get_app_name");
    } catch {
      return "Lsky Studio";
    }
  },
};

// 系统 API
export const systemApi = {
  getVersion: async () => {
    try {
      return await ipcCall<{ version: string }>("get_version");
    } catch {
      return { version: "unknown" };
    }
  },
  getStatus: async () => {
    try {
      return await ipcCall<SystemStatus>("get_status");
    } catch {
      return {
        status: "unknown",
        uptime: 0,
        memory: { rss: 0, heapTotal: 0, heapUsed: 0 },
        tasks: 0,
        isUploading: false,
      };
    }
  },
};

// 直接调用 Lsky Pro API（不通过 IPC）
async function fetchLskyApi(
  apiUrl: string,
  endpoint: string,
  token: string,
  options: RequestInit = {}
): Promise<Response> {
  // 构建正确的 API URL
  let baseUrl = apiUrl.trim();

  // 移除末尾的斜杠
  if (baseUrl.endsWith("/")) {
    baseUrl = baseUrl.slice(0, -1);
  }

  // 如果 URL 包含 /api/v2 路径，则不重复添加
  if (baseUrl.endsWith("/api/v2")) {
    baseUrl = baseUrl.slice(0, -7);
  } else if (baseUrl.includes("/api/v2/")) {
    const apiIndex = baseUrl.indexOf("/api/v2");
    baseUrl = baseUrl.substring(0, apiIndex);
  }

  const url = `${baseUrl}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...options.headers,
    },
  });

  return response;
}

// 配置 API
export const configApi = {
  get: async (): Promise<AppConfig> => {
    try {
      return await ipcCall<AppConfig>("config_get");
    } catch {
      // 浏览器模式：从 localStorage 加载
      return localConfigApi.loadFromStorage();
    }
  },

  update: async (updates: Partial<AppConfig>): Promise<{ success: boolean; config: AppConfig }> => {
    try {
      return await ipcCall<{ success: boolean; config: AppConfig }>("config_update", updates);
    } catch {
      // 浏览器模式：保存到 localStorage
      const currentConfig = localConfigApi.loadFromStorage();
      const newConfig = { ...currentConfig, ...updates };
      localConfigApi.saveToStorage(newConfig);
      return { success: true, config: newConfig };
    }
  },

  testConnection: async (apiUrl: string, apiToken: string): Promise<ConnectionTestResult> => {
    try {
      // 尝试通过 IPC 调用
      return await ipcCall<ConnectionTestResult>("config_test_connection", { apiUrl, apiToken });
    } catch {
      // 浏览器模式：直接调用 API
      try {
        const response = await fetchLskyApi(apiUrl, "/api/v1/strategies", apiToken);

        if (!response.ok) {
          const errorText = await response.text();
          return {
            success: false,
            error: `连接失败: HTTP ${response.status} - ${errorText.substring(0, 200)}`,
          };
        }

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          return {
            success: false,
            error: `API 响应格式错误: 期望 JSON，收到 ${contentType || "unknown"}`,
          };
        }

        const result = await response.json();

        // 兼容 status 为 true 或 "success"
        if (result.status === true || result.status === "success") {
          return {
            success: true,
            version: result.data?.version || result.data?.api_version || "",
            strategies: result.data?.strategies || [],
          };
        } else {
          return {
            success: false,
            error: result.message || "连接失败",
          };
        }
      } catch (error) {
        return {
          success: false,
          error: `网络错误: ${getErrorMessage(error)}`,
        };
      }
    }
  },

  getStrategies: async (apiUrl?: string, apiToken?: string): Promise<{ strategies: Strategy[] }> => {
    if (!apiUrl || !apiToken) {
      return { strategies: [] };
    }

    try {
      // 尝试通过 IPC 调用
      return await ipcCall<{ strategies: Strategy[] }>("config_get_strategies", { apiUrl, apiToken });
    } catch {
      // 浏览器模式：直接调用 API
      try {
        const response = await fetchLskyApi(apiUrl, "/api/v1/strategies", apiToken);

        if (!response.ok) {
          console.error("获取策略列表失败:", response.status);
          return { strategies: [] };
        }

        const result = await response.json();

        // 兼容 status 为 true 或 "success"
        const isSuccess = result.status === true || result.status === "success";
        const strategyList = result.data?.strategies || result.data?.data || [];

        if (isSuccess && strategyList.length > 0) {
          return {
            strategies: strategyList.map((s: any) => ({
              id: String(s.id),
              name: s.name,
              provider: s.provider || "unknown",
              description: s.intro || "",
            })),
          };
        }

        return { strategies: [] };
      } catch (error) {
        console.error("获取策略失败:", error);
        return { strategies: [] };
      }
    }
  },
};

// 上传 API
export const uploadApi = {
  start: async (files: UploadFile[], apiUrl: string, token: string, storageId: string, concurrency?: number) => {
    if (isTauri) {
      return ipcCall<{ taskIds: string[] }>("upload_start", {
        files,
        apiUrl,
        token,
        storageId,
        concurrency,
      });
    }

    // Web 模式：使用浏览器上传引擎
    const engine = getWebEngine(concurrency);
    setupWebEngineListeners(engine);

    const engineFiles: EngineUploadFile[] = files.map((f) => ({
      file: (f as any).file as File, // 上传页面会附加 file 对象
      name: f.name,
      size: f.size,
    }));

    const taskIds = await engine.start(engineFiles, apiUrl, token, storageId, concurrency || 3);
    return { taskIds };
  },

  pause: async (taskIds?: string[]) => {
    if (isTauri) {
      return ipcCall<{ paused: string[] }>("upload_pause", { taskIds });
    }
    const engine = getWebEngine();
    return engine.pause(taskIds);
  },

  resume: async (taskIds?: string[]) => {
    if (isTauri) {
      return ipcCall<{ resumed: string[] }>("upload_resume", { taskIds });
    }
    const engine = getWebEngine();
    return engine.resume(taskIds);
  },

  cancel: async (taskIds?: string[]) => {
    if (isTauri) {
      return ipcCall<{ cancelled: string[] }>("upload_cancel", { taskIds });
    }
    const engine = getWebEngine();
    return engine.cancel(taskIds);
  },

  getStatus: async (taskIds?: string[]) => {
    if (isTauri) {
      return ipcCall<{ tasks: UploadTask[] }>("upload_status", { taskIds });
    }
    const engine = getWebEngine();
    const allTasks = engine.getTasks();
    if (taskIds && taskIds.length > 0) {
      return { tasks: allTasks.filter((t) => taskIds.includes(t.id)) };
    }
    return { tasks: allTasks };
  },

  /** 获取 Web 引擎实例（用于断点续传等高级操作） */
  getWebEngine: () => webEngine,

  /** 销毁 Web 引擎 */
  destroyWebEngine: () => {
    if (webEngine) {
      webEngine.destroy();
      webEngine = null;
    }
  },
};

// 事件监听 API
export const eventApi = {
  onNodeReady: async (callback: (payload: { version: string; pid: number }) => void) => {
    if (!isTauri) return () => {};
    const { listen } = await import("@tauri-apps/api/event");
    return listen("node_ready", (event) => callback(event.payload as { version: string; pid: number }));
  },

  onNodeError: async (callback: (payload: { code: string; message: string }) => void) => {
    if (!isTauri) return () => {};
    const { listen } = await import("@tauri-apps/api/event");
    return listen("node_error", (event) => callback(event.payload as { code: string; message: string }));
  },

  onUploadProgress: async (callback: (payload: {
    taskId: string;
    fileName: string;
    progress: number;
    uploadedBytes?: number;
    totalBytes?: number;
    status: string;
  }) => void) => {
    if (isTauri) {
      const { listen } = await import("@tauri-apps/api/event");
      return listen("upload_progress", (event) => callback(event.payload as any));
    }
    // Web 模式
    webEventCallbacks.upload_progress.push(callback);
    return () => {
      const idx = webEventCallbacks.upload_progress.indexOf(callback);
      if (idx >= 0) webEventCallbacks.upload_progress.splice(idx, 1);
    };
  },

  onUploadComplete: async (callback: (payload: {
    taskId: string;
    fileName: string;
    url: string;
    thumbnailUrl?: string;
  }) => void) => {
    if (isTauri) {
      const { listen } = await import("@tauri-apps/api/event");
      return listen("upload_complete", (event) => callback(event.payload as any));
    }
    webEventCallbacks.upload_complete.push(callback);
    return () => {
      const idx = webEventCallbacks.upload_complete.indexOf(callback);
      if (idx >= 0) webEventCallbacks.upload_complete.splice(idx, 1);
    };
  },

  onUploadError: async (callback: (payload: {
    taskId: string;
    fileName: string;
    errorCode: string;
    errorMessage: string;
    retryable: boolean;
  }) => void) => {
    if (isTauri) {
      const { listen } = await import("@tauri-apps/api/event");
      return listen("upload_error", (event) => callback(event.payload as any));
    }
    webEventCallbacks.upload_error.push(callback);
    return () => {
      const idx = webEventCallbacks.upload_error.indexOf(callback);
      if (idx >= 0) webEventCallbacks.upload_error.splice(idx, 1);
    };
  },

  onUploadTasksCreated: async (callback: (payload: { tasks: UploadTask[] }) => void) => {
    if (isTauri) {
      const { listen } = await import("@tauri-apps/api/event");
      return listen("upload_tasks_created", (event) => callback(event.payload as { tasks: UploadTask[] }));
    }
    webEventCallbacks.upload_tasks_created.push(callback);
    return () => {
      const idx = webEventCallbacks.upload_tasks_created.indexOf(callback);
      if (idx >= 0) webEventCallbacks.upload_tasks_created.splice(idx, 1);
    };
  },
};

// 本地配置 API（支持 localStorage 和 Tauri 存储）
export const localConfigApi = {
  // 从 localStorage 加载
  loadFromStorage: (): AppConfig => {
    try {
      const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error("从 localStorage 加载配置失败:", error);
    }
    // 返回默认配置
    return {
      apiUrl: "",
      apiToken: "",
      strategyId: "1",
      concurrency: 3,
      theme: "system",
    };
  },

  // 保存到 localStorage
  saveToStorage: (config: AppConfig): void => {
    try {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
    } catch (error) {
      console.error("保存配置到 localStorage 失败:", error);
    }
  },

  // 加载配置（优先使用 Tauri，回退到 localStorage）
  load: async (): Promise<AppConfig> => {
    try {
      return await tauriInvoke<AppConfig>("load_config");
    } catch {
      return localConfigApi.loadFromStorage();
    }
  },

  // 保存配置（优先使用 Tauri，回退到 localStorage）
  save: async (config: AppConfig): Promise<void> => {
    try {
      await tauriInvoke("save_config", { config });
    } catch {
      localConfigApi.saveToStorage(config);
    }
  },
};

// 导出错误处理工具
export { ApiError, getErrorMessage };

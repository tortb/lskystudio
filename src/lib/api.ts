/**
 * API 层
 * 封装 Tauri IPC 调用，提供类型安全的接口
 * 支持浏览器模式（localStorage + WebUploadEngine）和 Tauri 模式
 */

import { WebUploadEngine, type EngineUploadFile } from "./upload-engine";
import { isTauriEnv, isWebMode } from "./env";

export { isWebMode };

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
  /** 仅 Web 模式携带；Tauri 模式由 Rust 侧直接按 path 读取文件 */
  file?: File;
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
  tasks: number;
  isUploading: boolean;
}

// 检测是否在 Tauri 环境中（Tauri v2 不注入 window.__TAURI__，需用 isTauri()）
const isTauri = isTauriEnv;

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
  getStatus: async () => {
    try {
      return await tauriInvoke<SystemStatus>("get_status");
    } catch {
      return {
        status: "unknown",
        uptime: 0,
        tasks: 0,
        isUploading: false,
      };
    }
  },
};

// 文件选择 API（仅 Tauri 模式可用，用于获取真实文件路径）
export const filesApi = {
  /** 打开系统文件选择框，返回所选文件的路径与元信息 */
  select: () => tauriInvoke<UploadFile[]>("select_files"),

  /** 把拖拽得到的路径解析为文件元信息 */
  resolve: (paths: string[]) => tauriInvoke<UploadFile[]>("resolve_files", { paths }),
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
      return await tauriInvoke<AppConfig>("config_get");
    } catch {
      // 浏览器模式：从 localStorage 加载
      return localConfigApi.loadFromStorage();
    }
  },

  update: async (updates: Partial<AppConfig>): Promise<{ success: boolean; config: AppConfig }> => {
    try {
      return await tauriInvoke<{ success: boolean; config: AppConfig }>("config_update", {
        updates,
      });
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
      // 尝试通过 Tauri command 调用
      return await tauriInvoke<ConnectionTestResult>("config_test_connection", {
        apiUrl,
        apiToken,
      });
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
      // 尝试通过 Tauri command 调用
      return await tauriInvoke<{ strategies: Strategy[] }>("config_get_strategies", {
        apiUrl,
        apiToken,
      });
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
      return tauriInvoke<{ taskIds: string[] }>("upload_start", {
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
      file: f.file as File, // Web 模式由选择器附加 File 对象
      name: f.name,
      size: f.size,
    }));

    const taskIds = await engine.start(engineFiles, apiUrl, token, storageId, concurrency || 3);
    return { taskIds };
  },

  pause: async (taskIds?: string[]) => {
    if (!isWebMode()) {
      return tauriInvoke<{ paused: string[] }>("upload_pause", { taskIds });
    }
    const engine = getWebEngine();
    return engine.pause(taskIds);
  },

  resume: async (taskIds?: string[]) => {
    if (!isWebMode()) {
      return tauriInvoke<{ resumed: string[] }>("upload_resume", { taskIds });
    }
    const engine = getWebEngine();
    return engine.resume(taskIds);
  },

  cancel: async (taskIds?: string[]) => {
    if (isTauri) {
      return tauriInvoke<{ cancelled: string[] }>("upload_cancel", { taskIds });
    }
    const engine = getWebEngine();
    return engine.cancel(taskIds);
  },

  getStatus: async (taskIds?: string[]) => {
    if (!isWebMode()) {
      return tauriInvoke<{ tasks: UploadTask[] }>("upload_status", { taskIds });
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
//
// 同时订阅 Tauri 事件与前端引擎事件：浏览器模式由前端引擎产出事件，
// Tauri 模式由 Rust 后端产出，前端无需关心当前走的是哪条链路。
function subscribeUploadEvent<T>(
  eventName: string,
  webListeners: WebEventCallback<T>[],
  callback: WebEventCallback<T>,
) {
  let unlisten: (() => void) | undefined;

  if (isTauriEnv) {
    import("@tauri-apps/api/event")
      .then(({ listen }) => listen(eventName, (event) => callback(event.payload as T)))
      .then((fn) => {
        unlisten = fn;
      })
      .catch(console.error);
  }

  webListeners.push(callback);

  return () => {
    unlisten?.();
    const index = webListeners.indexOf(callback);
    if (index >= 0) webListeners.splice(index, 1);
  };
}

export const eventApi = {
  onNodeError: async (callback: (payload: { code: string; message: string }) => void) => {
    if (!isTauriEnv) return () => {};
    const { listen } = await import("@tauri-apps/api/event");
    return listen("node_error", (event) => callback(event.payload as { code: string; message: string }));
  },

  onUploadProgress: async (
    callback: (payload: {
      taskId: string;
      fileName: string;
      progress: number;
      uploadedBytes?: number;
      totalBytes?: number;
      status: string;
    }) => void,
  ) => subscribeUploadEvent("upload_progress", webEventCallbacks.upload_progress, callback),

  onUploadComplete: async (
    callback: (payload: {
      taskId: string;
      fileName: string;
      url: string;
      thumbnailUrl?: string;
    }) => void,
  ) => subscribeUploadEvent("upload_complete", webEventCallbacks.upload_complete, callback),

  onUploadError: async (
    callback: (payload: {
      taskId: string;
      fileName: string;
      errorCode: string;
      errorMessage: string;
      retryable: boolean;
    }) => void,
  ) => subscribeUploadEvent("upload_error", webEventCallbacks.upload_error, callback),

  onUploadTasksCreated: async (
    callback: (payload: { tasks: UploadTask[] }) => void,
  ) =>
    subscribeUploadEvent(
      "upload_tasks_created",
      webEventCallbacks.upload_tasks_created,
      callback,
    ),
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

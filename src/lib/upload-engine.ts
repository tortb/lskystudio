/**
 * 浏览器端上传引擎
 * 在非 Tauri 环境下提供并发上传、进度跟踪、暂停/恢复、断点续传功能
 */

export interface EngineUploadTask {
  id: string;
  fileName: string;
  fileSize: number;
  status: "pending" | "uploading" | "success" | "failed" | "paused" | "cancelled";
  progress: number;
  url: string | null;
  error: string | null;
}

export interface EngineUploadFile {
  file: File; // 浏览器 File 对象
  name: string;
  size: number;
}

type EventCallback = (payload: any) => void;

// ---------------------------------------------------------------------------
// 并发控制器（信号量模式）
// ---------------------------------------------------------------------------
class ConcurrencyController {
  private limit: number;
  private running = 0;
  private queue: Array<{
    task: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (reason?: any) => void;
  }> = [];

  constructor(limit: number) {
    this.limit = Math.max(1, limit);
  }

  setLimit(limit: number) {
    this.limit = Math.max(1, limit);
  }

  async add<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.process();
    });
  }

  private process() {
    if (this.running >= this.limit || this.queue.length === 0) return;
    this.running++;
    const { task, resolve, reject } = this.queue.shift()!;
    task()
      .then(resolve)
      .catch(reject)
      .finally(() => {
        this.running--;
        this.process();
      });
  }

  get pendingCount() {
    return this.queue.length;
  }

  get runningCount() {
    return this.running;
  }
}

// ---------------------------------------------------------------------------
// 断点续传管理器
// ---------------------------------------------------------------------------
const CHECKPOINT_KEY = "lsky_upload_checkpoint";

interface CheckpointData {
  tasks: Array<{
    id: string;
    fileName: string;
    fileSize: number;
    status: EngineUploadTask["status"];
    url: string | null;
    error: string | null;
  }>;
  timestamp: number;
}

export const UploadCheckpoint = {
  save(tasks: EngineUploadTask[]) {
    try {
      const data: CheckpointData = {
        tasks: tasks.map((t) => ({
          id: t.id,
          fileName: t.fileName,
          fileSize: t.fileSize,
          status: t.status,
          url: t.url,
          error: t.error,
        })),
        timestamp: Date.now(),
      };
      localStorage.setItem(CHECKPOINT_KEY, JSON.stringify(data));
    } catch {
      // localStorage 可能满了，忽略
    }
  },

  load(): CheckpointData | null {
    try {
      const raw = localStorage.getItem(CHECKPOINT_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  clear() {
    localStorage.removeItem(CHECKPOINT_KEY);
  },
};

// ---------------------------------------------------------------------------
// 浏览器上传引擎
// ---------------------------------------------------------------------------
export class WebUploadEngine {
  private tasks = new Map<string, EngineUploadTask>();
  private fileMap = new Map<string, File>(); // taskId -> File 对象
  private controller: ConcurrencyController;
  private isUploading = false;
  private abortControllers = new Map<string, AbortController>();

  // 事件回调
  private listeners = {
    progress: [] as EventCallback[],
    complete: [] as EventCallback[],
    error: [] as EventCallback[],
    tasksCreated: [] as EventCallback[],
  };

  constructor(concurrency = 3) {
    this.controller = new ConcurrencyController(concurrency);
  }

  // --- 事件系统 ---
  on(event: keyof typeof this.listeners, callback: EventCallback) {
    this.listeners[event].push(callback);
  }

  off(event: keyof typeof this.listeners, callback: EventCallback) {
    this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
  }

  private emit(event: keyof typeof this.listeners, payload: any) {
    this.listeners[event].forEach((cb) => cb(payload));
  }

  // --- 任务管理 ---
  getTasks(): EngineUploadTask[] {
    return Array.from(this.tasks.values());
  }

  getTask(taskId: string): EngineUploadTask | undefined {
    return this.tasks.get(taskId);
  }

  // --- 开始上传 ---
  async start(
    files: EngineUploadFile[],
    apiUrl: string,
    token: string,
    storageId: string,
    concurrency = 3,
  ): Promise<string[]> {
    if (files.length === 0) throw new Error("文件列表为空");
    if (!apiUrl || !token) throw new Error("API 配置不完整");

    this.isUploading = true;
    this.controller.setLimit(concurrency);
    this.tasks.clear();
    this.fileMap.clear();

    // 创建任务
    const taskIds: string[] = [];
    files.forEach((f, index) => {
      const id = `task_${Date.now()}_${index}`;
      const task: EngineUploadTask = {
        id,
        fileName: f.name,
        fileSize: f.size,
        status: "pending",
        progress: 0,
        url: null,
        error: null,
      };
      this.tasks.set(id, task);
      this.fileMap.set(id, f.file);
      taskIds.push(id);
    });

    // 发送任务创建事件
    this.emit("tasksCreated", { tasks: this.getTasks() });

    // 启动并发上传（不 await，后台运行）
    this.processQueue(apiUrl, token, storageId);

    return taskIds;
  }

  // --- 恢复上传（断点续传）---
  async resumeUpload(
    files: EngineUploadFile[],
    apiUrl: string,
    token: string,
    storageId: string,
    concurrency = 3,
  ): Promise<string[]> {
    const checkpoint = UploadCheckpoint.load();
    if (!checkpoint) {
      return this.start(files, apiUrl, token, storageId, concurrency);
    }

    this.isUploading = true;
    this.controller.setLimit(concurrency);

    // 用文件名+大小匹配 checkpoint 中的任务
    const fileMap = new Map<string, File>();
    files.forEach((f) => {
      fileMap.set(`${f.name}::${f.size}`, f.file);
    });

    const taskIds: string[] = [];
    const pendingTasks: EngineUploadTask[] = [];

    checkpoint.tasks.forEach((cp) => {
      const key = `${cp.fileName}::${cp.fileSize}`;
      const file = fileMap.get(key);

      if (cp.status === "success" && cp.url) {
        // 已完成的任务直接恢复
        const task: EngineUploadTask = { ...cp, progress: 100 };
        this.tasks.set(cp.id, task);
        taskIds.push(cp.id);
      } else if (file) {
        // 未完成且有对应文件的任务，重置为 pending
        const task: EngineUploadTask = {
          ...cp,
          status: "pending",
          progress: 0,
          error: null,
        };
        this.tasks.set(cp.id, task);
        this.fileMap.set(cp.id, file);
        taskIds.push(cp.id);
        pendingTasks.push(task);
      }
      // 没有对应文件的未完成任务跳过
    });

    // 发送任务创建事件
    this.emit("tasksCreated", { tasks: this.getTasks() });

    // 只上传 pending 的任务
    if (pendingTasks.length > 0) {
      this.processQueue(apiUrl, token, storageId);
    } else {
      this.isUploading = false;
    }

    return taskIds;
  }

  // --- 并发队列处理 ---
  private async processQueue(apiUrl: string, token: string, storageId: string) {
    const pendingTasks = Array.from(this.tasks.values()).filter(
      (t) => t.status === "pending",
    );

    const uploadPromises = pendingTasks.map((task) =>
      this.controller.add(() => this.uploadSingleFile(task, apiUrl, token, storageId)),
    );

    await Promise.allSettled(uploadPromises);

    // 上传完成后保存 checkpoint
    UploadCheckpoint.save(this.getTasks());
    this.isUploading = false;
  }

  // --- 上传单个文件 ---
  private async uploadSingleFile(
    task: EngineUploadTask,
    apiUrl: string,
    token: string,
    storageId: string,
  ): Promise<void> {
    if (!this.isUploading) {
      task.status = "cancelled";
      return;
    }

    const file = this.fileMap.get(task.id);
    if (!file) {
      task.status = "failed";
      task.error = "文件对象不存在";
      this.emit("error", {
        taskId: task.id,
        fileName: task.fileName,
        errorCode: "FILE_NOT_FOUND",
        errorMessage: "文件对象不存在",
        retryable: false,
      });
      return;
    }

    // 重试逻辑
    const maxRetries = 3;
    let lastError = "";

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (!this.isUploading) {
        task.status = "cancelled";
        return;
      }

      // 暂停检查
      if (task.status === "paused") {
        return;
      }

      try {
        task.status = "uploading";
        task.progress = 0;
        this.emit("progress", {
          taskId: task.id,
          fileName: task.fileName,
          progress: 0,
          status: "uploading",
        });

        const result = await this.doUpload(file, apiUrl, token, storageId, task);

        task.status = "success";
        task.progress = 100;
        task.url = result.url;
        task.error = null;

        this.emit("complete", {
          taskId: task.id,
          fileName: task.fileName,
          url: result.url,
          thumbnailUrl: result.thumbnailUrl,
        });

        // 每完成一个就保存 checkpoint
        UploadCheckpoint.save(this.getTasks());
        return;
      } catch (err: any) {
        lastError = err.message || "上传失败";

        if (attempt < maxRetries) {
          // 等待后重试（指数退避）
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        }
      }
    }

    // 所有重试都失败了
    task.status = "failed";
    task.error = lastError;
    this.emit("error", {
      taskId: task.id,
      fileName: task.fileName,
      errorCode: "UPLOAD_FAILED",
      errorMessage: lastError,
      retryable: true,
    });

    UploadCheckpoint.save(this.getTasks());
  }

  // --- 实际 HTTP 上传 ---
  private doUpload(
    file: File,
    apiUrl: string,
    token: string,
    storageId: string,
    task: EngineUploadTask,
  ): Promise<{ url: string; thumbnailUrl: string }> {
    return new Promise((resolve, reject) => {
      // 构建 URL
      let baseUrl = apiUrl.trim();
      if (baseUrl.endsWith("/")) baseUrl = baseUrl.slice(0, -1);
      if (baseUrl.endsWith("/api/v2")) baseUrl = baseUrl.slice(0, -7);
      else if (baseUrl.includes("/api/v2/")) {
        const idx = baseUrl.indexOf("/api/v2");
        baseUrl = baseUrl.substring(0, idx);
      }

      const uploadUrl = `${baseUrl}/api/v2/upload`;

      const xhr = new XMLHttpRequest();
      const abortController = new AbortController();
      this.abortControllers.set(task.id, abortController);

      xhr.open("POST", uploadUrl);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.timeout = 10 * 60 * 1000; // 10 分钟超时

      // 上传进度
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          task.progress = progress;
          this.emit("progress", {
            taskId: task.id,
            fileName: task.fileName,
            progress,
            uploadedBytes: event.loaded,
            totalBytes: event.total,
            status: "uploading",
          });
        }
      };

      xhr.onload = () => {
        this.abortControllers.delete(task.id);

        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText);
            if (result.status === "success" || result.status === true || result.status === 200) {
              resolve({
                url: result.data?.public_url || result.data?.links?.url || "",
                thumbnailUrl: result.data?.thumbnail_url || result.data?.links?.thumbnail || "",
              });
            } else {
              reject(new Error(result.message || "上传失败"));
            }
          } catch (e: any) {
            reject(new Error(`解析响应失败: ${e.message}`));
          }
        } else {
          let msg = `HTTP ${xhr.status}`;
          try {
            const err = JSON.parse(xhr.responseText);
            msg = err.message || msg;
          } catch {
            msg = xhr.responseText || msg;
          }
          reject(new Error(msg));
        }
      };

      xhr.onerror = () => {
        this.abortControllers.delete(task.id);
        reject(new Error("网络错误"));
      };

      xhr.ontimeout = () => {
        this.abortControllers.delete(task.id);
        reject(new Error("上传超时"));
      };

      // 构建 FormData
      const formData = new FormData();
      formData.append("file", file);
      formData.append("storage_id", storageId || "1");

      xhr.send(formData);

      // 支持取消
      abortController.signal.addEventListener("abort", () => {
        xhr.abort();
      });
    });
  }

  // --- 暂停 ---
  pause(taskIds?: string[]) {
    const ids = taskIds || Array.from(this.tasks.keys());
    const paused: string[] = [];

    ids.forEach((id) => {
      const task = this.tasks.get(id);
      if (task && (task.status === "pending" || task.status === "uploading")) {
        task.status = "paused";
        paused.push(id);
        // 取消正在进行的请求
        const controller = this.abortControllers.get(id);
        if (controller) {
          controller.abort();
          this.abortControllers.delete(id);
        }
      }
    });

    return { paused };
  }

  // --- 恢复 ---
  resume(taskIds?: string[]) {
    const ids = taskIds || Array.from(this.tasks.keys());
    const resumed: string[] = [];

    ids.forEach((id) => {
      const task = this.tasks.get(id);
      if (task && (task.status === "paused" || task.status === "failed")) {
        task.status = "pending";
        task.error = null;
        resumed.push(id);
      }
    });

    // 如果有恢复的任务，重新启动队列
    if (resumed.length > 0 && !this.isUploading) {
      this.isUploading = true;
      // 需要 apiUrl, token, storageId — 通过事件通知外部重新调用
    }

    return { resumed };
  }

  // --- 取消 ---
  cancel(taskIds?: string[]) {
    const ids = taskIds || Array.from(this.tasks.keys());
    const cancelled: string[] = [];

    ids.forEach((id) => {
      const task = this.tasks.get(id);
      if (
        task &&
        (task.status === "pending" ||
          task.status === "uploading" ||
          task.status === "paused")
      ) {
        task.status = "cancelled";
        cancelled.push(id);
        // 取消正在进行的请求
        const controller = this.abortControllers.get(id);
        if (controller) {
          controller.abort();
          this.abortControllers.delete(id);
        }
      }
    });

    if (!taskIds) {
      this.isUploading = false;
    }

    return { cancelled };
  }

  // --- 重试失败任务 ---
  retryFailed(apiUrl: string, token: string, storageId: string) {
    const failedTasks = Array.from(this.tasks.values()).filter(
      (t) => t.status === "failed",
    );

    failedTasks.forEach((t) => {
      t.status = "pending";
      t.error = null;
      t.progress = 0;
    });

    if (failedTasks.length > 0 && !this.isUploading) {
      this.isUploading = true;
      this.processQueue(apiUrl, token, storageId);
    }

    return { retried: failedTasks.map((t) => t.id) };
  }

  // --- 销毁 ---
  destroy() {
    this.cancel();
    this.tasks.clear();
    this.fileMap.clear();
    this.abortControllers.clear();
    Object.keys(this.listeners).forEach((key) => {
      (this.listeners as any)[key] = [];
    });
  }
}

import { useState, useEffect, useCallback, useRef } from "react";
import {
  uploadApi,
  eventApi,
  isWebMode,
  type UploadFile,
  type UploadTask,
} from "@/lib/api";
import { UploadCheckpoint } from "@/lib/upload-engine";

export function useUpload() {
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [hasCheckpoint, setHasCheckpoint] = useState(false);
  const unlistenFns = useRef<UnlistenFn[]>([]);

  // 保存的上传参数（用于断点续传和重试）
  const uploadParamsRef = useRef<{
    apiUrl: string;
    token: string;
    storageId: string;
    concurrency: number;
  } | null>(null);

  // 检查是否有 checkpoint
  useEffect(() => {
    const checkpoint = UploadCheckpoint.load();
    if (checkpoint && checkpoint.tasks.length > 0) {
      const hasIncomplete = checkpoint.tasks.some(
        (t) => t.status !== "success" && t.status !== "cancelled",
      );
      setHasCheckpoint(hasIncomplete);
    }
  }, []);

  // 监听上传事件
  useEffect(() => {
    const setupListeners = async () => {
      // 监听进度事件
      const unlistenProgress = await eventApi.onUploadProgress((payload) => {
        setTasks((prev) =>
          prev.map((task) =>
            task.id === payload.taskId
              ? { ...task, progress: payload.progress, status: "uploading" }
              : task,
          ),
        );
      });

      // 监听完成事件
      const unlistenComplete = await eventApi.onUploadComplete((payload) => {
        setTasks((prev) =>
          prev.map((task) =>
            task.id === payload.taskId
              ? { ...task, status: "success", progress: 100, url: payload.url }
              : task,
          ),
        );
      });

      // 监听错误事件
      const unlistenError = await eventApi.onUploadError((payload) => {
        setTasks((prev) =>
          prev.map((task) =>
            task.id === payload.taskId
              ? { ...task, status: "failed", error: payload.errorMessage }
              : task,
          ),
        );
      });

      // 监听任务创建事件
      const unlistenTasksCreated = await eventApi.onUploadTasksCreated((payload) => {
        setTasks(payload.tasks);
      });

      unlistenFns.current = [
        unlistenProgress,
        unlistenComplete,
        unlistenError,
        unlistenTasksCreated,
      ];
    };

    setupListeners();

    return () => {
      unlistenFns.current.forEach((unlisten) => unlisten());
    };
  }, []);

  // 开始上传
  const start = useCallback(
    async (
      files: UploadFile[],
      apiUrl: string,
      token: string,
      storageId: string,
      concurrency?: number,
    ) => {
      try {
        setIsUploading(true);
        setHasCheckpoint(false);

        // 保存参数用于重试/续传
        uploadParamsRef.current = {
          apiUrl,
          token,
          storageId,
          concurrency: concurrency || 3,
        };

        // 清除旧 checkpoint
        UploadCheckpoint.clear();

        const result = await uploadApi.start(files, apiUrl, token, storageId, concurrency);
        return result.taskIds;
      } catch (err) {
        setIsUploading(false);
        throw err;
      }
    },
    [],
  );

  // 从断点续传恢复
  const resumeFromCheckpoint = useCallback(
    async (
      files: UploadFile[],
      apiUrl: string,
      token: string,
      storageId: string,
      concurrency?: number,
    ) => {
      try {
        setIsUploading(true);
        setHasCheckpoint(false);

        uploadParamsRef.current = {
          apiUrl,
          token,
          storageId,
          concurrency: concurrency || 3,
        };

        if (isWebMode) {
          // Web 模式：使用引擎的 resumeUpload
          const engine = uploadApi.getWebEngine();
          if (engine) {
            const engineFiles = files.map((f) => ({
              file: (f as any).file as File,
              name: f.name,
              size: f.size,
            }));
            const taskIds = await engine.resumeUpload(
              engineFiles,
              apiUrl,
              token,
              storageId,
              concurrency || 3,
            );
            return taskIds;
          }
        }

        // Tauri 模式或引擎不存在：普通启动
        UploadCheckpoint.clear();
        const result = await uploadApi.start(files, apiUrl, token, storageId, concurrency);
        return result.taskIds;
      } catch (err) {
        setIsUploading(false);
        throw err;
      }
    },
    [],
  );

  // 暂停上传
  const pause = useCallback(async (taskIds?: string[]) => {
    try {
      const result = await uploadApi.pause(taskIds);
      setTasks((prev) =>
        prev.map((task) =>
          result.paused.includes(task.id) ? { ...task, status: "paused" } : task,
        ),
      );
    } catch (err) {
      console.error("暂停失败:", err);
    }
  }, []);

  // 继续上传
  const resume = useCallback(async (taskIds?: string[]) => {
    try {
      const result = await uploadApi.resume(taskIds);
      setTasks((prev) =>
        prev.map((task) =>
          result.resumed.includes(task.id) ? { ...task, status: "pending" } : task,
        ),
      );

      // Web 模式：如果引擎有 pending 任务，需要重新启动队列
      if (isWebMode && uploadParamsRef.current) {
        const engine = uploadApi.getWebEngine();
        if (engine) {
          const { apiUrl, token, storageId } = uploadParamsRef.current;
          // 引擎的 resume 已经将 failed/paused 设为 pending
          // 需要重新触发 processQueue
          (engine as any).isUploading = true;
          (engine as any).processQueue(apiUrl, token, storageId);
        }
      }
    } catch (err) {
      console.error("继续失败:", err);
    }
  }, []);

  // 取消上传
  const cancel = useCallback(async (taskIds?: string[]) => {
    try {
      const result = await uploadApi.cancel(taskIds);
      setTasks((prev) =>
        prev.map((task) =>
          result.cancelled.includes(task.id)
            ? { ...task, status: "cancelled" }
            : task,
        ),
      );
      if (!taskIds) {
        setIsUploading(false);
        UploadCheckpoint.clear();
      }
    } catch (err) {
      console.error("取消失败:", err);
    }
  }, []);

  // 重试失败任务
  const retryFailed = useCallback(async () => {
    if (!uploadParamsRef.current) return;

    const { apiUrl, token, storageId } = uploadParamsRef.current;

    if (isWebMode) {
      const engine = uploadApi.getWebEngine();
      if (engine) {
        const result = engine.retryFailed(apiUrl, token, storageId);
        if (result.retried.length > 0) {
          setIsUploading(true);
          setTasks((prev) =>
            prev.map((task) =>
              result.retried.includes(task.id)
                ? { ...task, status: "pending", error: null, progress: 0 }
                : task,
            ),
          );
        }
        return;
      }
    }

    // Tauri 模式
    const failedIds = tasks.filter((t) => t.status === "failed").map((t) => t.id);
    if (failedIds.length > 0) {
      await resume(failedIds);
    }
  }, [tasks, resume]);

  // 清空任务
  const clearTasks = useCallback(() => {
    setTasks([]);
    setHasCheckpoint(false);
    UploadCheckpoint.clear();
    if (isWebMode) {
      uploadApi.destroyWebEngine();
    }
  }, []);

  // 清除 checkpoint
  const clearCheckpoint = useCallback(() => {
    UploadCheckpoint.clear();
    setHasCheckpoint(false);
  }, []);

  // 统计
  const pendingCount = tasks.filter((t) => t.status === "pending").length;
  const uploadingCount = tasks.filter((t) => t.status === "uploading").length;
  const successCount = tasks.filter((t) => t.status === "success").length;
  const failedCount = tasks.filter((t) => t.status === "failed").length;

  return {
    tasks,
    isUploading,
    hasCheckpoint,
    start,
    resumeFromCheckpoint,
    pause,
    resume,
    cancel,
    retryFailed,
    clearTasks,
    clearCheckpoint,
    pendingCount,
    uploadingCount,
    successCount,
    failedCount,
  };
}

type UnlistenFn = () => void;

import { useState, useEffect, useCallback } from "react";
import { systemApi, eventApi, type SystemStatus } from "@/lib/api";

export function useSystem() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Rust 后端与应用同进程，启动即就绪；这里只订阅后端错误事件
  useEffect(() => {
    setIsReady(true);

    let unlistenError: (() => void) | undefined;
    eventApi
      .onNodeError((payload) => {
        console.error("后端错误:", payload);
        setError(payload.message);
      })
      .then((fn) => {
        unlistenError = fn;
      });

    return () => unlistenError?.();
  }, []);

  // 获取系统状态
  const fetchStatus = useCallback(async () => {
    try {
      const result = await systemApi.getStatus();
      setStatus(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "获取状态失败");
    }
  }, []);

  // 定期刷新状态
  useEffect(() => {
    if (isReady) {
      fetchStatus();
      const interval = setInterval(fetchStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [isReady, fetchStatus]);

  return {
    status,
    isReady,
    error,
    fetchStatus,
  };
}

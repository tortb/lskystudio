import { useState, useEffect, useCallback } from "react";
import { systemApi, eventApi, type SystemStatus } from "@/lib/api";

export function useSystem() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 监听 Node 就绪事件
  useEffect(() => {
    const setupListeners = async () => {
      const unlistenReady = await eventApi.onNodeReady((payload) => {
        console.log("Node.js 就绪:", payload);
        setIsReady(true);
      });

      const unlistenError = await eventApi.onNodeError((payload) => {
        console.error("Node.js 错误:", payload);
        setError(payload.message);
      });

      return () => {
        unlistenReady();
        unlistenError();
      };
    };

    setupListeners();
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

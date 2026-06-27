import { useState, useEffect, useCallback } from "react";
import {
  configApi,
  localConfigApi,
  type AppConfig,
  type Strategy,
  ApiError,
  getErrorMessage,
} from "@/lib/api";

export function useConfig() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 加载配置
  const loadConfig = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 从本地加载（支持 Tauri 和 localStorage）
      const localConfig = await localConfigApi.load();
      setConfig(localConfig);
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      setError(errorMsg);
      console.error("加载配置失败:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 更新配置
  const updateConfig = useCallback(
    async (updates: Partial<AppConfig>) => {
      try {
        setError(null);
        const result = await configApi.update(updates);

        if (result.success) {
          setConfig(result.config);
          // 同时保存到本地
          await localConfigApi.save(result.config);
        }

        return result;
      } catch (err) {
        const errorMsg = getErrorMessage(err);
        setError(errorMsg);
        console.error("更新配置失败:", err);
        throw new ApiError(errorMsg, "CONFIG_UPDATE_ERROR", err);
      }
    },
    [],
  );

  // 初始加载
  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  return {
    config,
    isLoading,
    error,
    loadConfig,
    updateConfig,
  };
}

export function useStrategies() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStrategies = useCallback(async (apiUrl?: string, apiToken?: string) => {
    if (!apiUrl || !apiToken) {
      setStrategies([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const result = await configApi.getStrategies(apiUrl, apiToken);
      setStrategies(result.strategies);
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      setError(errorMsg);
      console.error("加载策略失败:", err);
      setStrategies([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    strategies,
    isLoading,
    error,
    loadStrategies,
  };
}

export function useTestConnection() {
  const [isTesting, setIsTesting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    version?: string;
    error?: string;
  } | null>(null);

  const testConnection = useCallback(async (apiUrl: string, apiToken: string) => {
    try {
      setIsTesting(true);
      setResult(null);

      const testResult = await configApi.testConnection(apiUrl, apiToken);
      setResult(testResult);

      return testResult;
    } catch (err) {
      const errorResult = {
        success: false,
        error: getErrorMessage(err),
      };
      setResult(errorResult);
      return errorResult;
    } finally {
      setIsTesting(false);
    }
  }, []);

  return {
    isTesting,
    result,
    testConnection,
  };
}

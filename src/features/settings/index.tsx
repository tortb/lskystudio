import { useState, useEffect, useRef } from "react";
import {
  Save,
  RefreshCw,
  TestTube,
  Sun,
  Moon,
  Monitor,
  CheckCircle,
  XCircle,
  Settings2,
  Info,
  Upload,
  Download,
  Cpu,
  HardDrive,
  Globe,
  ImageIcon,
  Zap,
  RotateCcw,
  Clock,
  AlertTriangle,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToastActions } from "@/components/ui/toaster";
import { PageHeader } from "@/components/layout/page-header";
import { StatusIndicator } from "@/components/shared/status-indicator";
import { useTheme } from "@/hooks/use-theme";
import { useConfig, useStrategies, useTestConnection } from "@/hooks/use-config";
import { useSystem } from "@/hooks/use-system";
import { appApi, systemApi, isWebMode } from "@/lib/api";
import { APP_VERSION } from "@/lib/constants";
import { cn } from "@/lib/utils";

// 扩展配置类型
interface AdvancedConfig {
  retryCount: number;
  retryDelay: number;
  autoCopyUrl: boolean;
  compressImages: boolean;
  compressQuality: number;
}

// 表单验证错误
interface FormErrors {
  apiUrl?: string;
  token?: string;
  concurrency?: string;
  retryCount?: string;
  retryDelay?: string;
  compressQuality?: string;
}

// 分组卡片标题
function GroupHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/70 px-5 py-3.5">
      <div className="min-w-0">
        <h3 className="text-section">{title}</h3>
        {description && (
          <p className="mt-0.5 text-[12px] text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// 设置行
function SettingRow({
  title,
  description,
  htmlFor,
  children,
}: {
  title: React.ReactNode;
  description?: string;
  htmlFor?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/60 px-5 py-3.5 last:border-b-0">
      <div className="min-w-0">
        <Label htmlFor={htmlFor}>{title}</Label>
        {description && (
          <div className="mt-0.5 text-[12px] text-muted-foreground">{description}</div>
        )}
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  );
}

// 行内错误提示
function FieldError({ message }: { message: string }) {
  return (
    <p className="mt-1 flex items-center gap-1 text-[12px] text-destructive">
      <AlertTriangle className="h-3 w-3" strokeWidth={1.75} />
      {message}
    </p>
  );
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { config, isLoading, updateConfig } = useConfig();
  const { strategies, loadStrategies } = useStrategies();
  const { isTesting, result: testResult, testConnection } = useTestConnection();
  const { status, isReady } = useSystem();
  const toast = useToastActions();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 基础配置状态
  const [apiUrl, setApiUrl] = useState("");
  const [token, setToken] = useState("");
  const [concurrency, setConcurrency] = useState("3");
  const [strategyId, setStrategyId] = useState("1");

  // 高级配置状态
  const [advancedConfig, setAdvancedConfig] = useState<AdvancedConfig>({
    retryCount: 3,
    retryDelay: 1000,
    autoCopyUrl: true,
    compressImages: false,
    compressQuality: 80,
  });

  // 应用信息
  const [appVersion, setAppVersion] = useState<string>("");
  const [nodeVersion, setNodeVersion] = useState<string>("");

  // 表单验证错误
  const [errors, setErrors] = useState<FormErrors>({});

  // 从配置加载
  useEffect(() => {
    if (config) {
      setApiUrl(config.apiUrl);
      setToken(config.apiToken);
      setConcurrency(String(config.concurrency));
      setStrategyId(config.strategyId);
      // 加载高级配置（如果存在）
      if ((config as any).advanced) {
        setAdvancedConfig((config as any).advanced);
      }
    }
  }, [config]);

  // 加载策略列表
  useEffect(() => {
    if (apiUrl && token) {
      loadStrategies(apiUrl, token);
    }
  }, [apiUrl, token, loadStrategies]);

  // 加载应用信息
  useEffect(() => {
    const loadAppInfo = async () => {
      try {
        const version = await appApi.getVersion();
        setAppVersion(version || APP_VERSION);
      } catch {
        setAppVersion(APP_VERSION);
      }
    };
    loadAppInfo();
  }, []);

  // 加载 Node.js 版本（仅 Tauri 模式）
  useEffect(() => {
    if (isWebMode()) {
      setNodeVersion(`浏览器模式 (${navigator.userAgent.match(/Chrome\/[\d.]+|Firefox\/[\d.]+|Safari\/[\d.]+/)?.[0] || "Unknown"})`);
      return;
    }
    const loadNodeVersion = async () => {
      try {
        const result = await systemApi.getVersion();
        setNodeVersion(result.version);
      } catch {
        setNodeVersion("未知");
      }
    };
    loadNodeVersion();
  }, []);

  // 表单验证
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // 验证 API 地址
    if (!apiUrl.trim()) {
      newErrors.apiUrl = "请输入 API 地址";
    } else {
      try {
        new URL(apiUrl);
      } catch {
        newErrors.apiUrl = "请输入有效的 URL 地址";
      }
    }

    // 验证 Token
    if (!token.trim()) {
      newErrors.token = "请输入 API Token";
    } else if (token.length < 10) {
      newErrors.token = "Token 长度不能少于 10 个字符";
    }

    // 验证并发数
    const concurrencyNum = parseInt(concurrency);
    if (isNaN(concurrencyNum) || concurrencyNum < 1) {
      newErrors.concurrency = "并发数不能小于 1";
    } else if (concurrencyNum > 10) {
      newErrors.concurrency = "并发数不能大于 10";
    }

    // 验证重试次数
    if (advancedConfig.retryCount < 0 || advancedConfig.retryCount > 10) {
      newErrors.retryCount = "重试次数应在 0-10 之间";
    }

    // 验证重试延迟
    if (advancedConfig.retryDelay < 0 || advancedConfig.retryDelay > 60000) {
      newErrors.retryDelay = "重试延迟应在 0-60000 毫秒之间";
    }

    // 验证压缩质量
    if (
      advancedConfig.compressQuality < 1 ||
      advancedConfig.compressQuality > 100
    ) {
      newErrors.compressQuality = "压缩质量应在 1-100 之间";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 清除单个字段错误
  const clearFieldError = (field: keyof FormErrors) => {
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.warning("验证失败", "请检查表单中的错误");
      return;
    }

    try {
      await updateConfig({
        apiUrl,
        apiToken: token,
        concurrency: parseInt(concurrency),
        strategyId,
        advanced: advancedConfig,
      } as any);
      toast.success("保存成功", "配置已保存");
    } catch (err) {
      toast.error("保存失败", err instanceof Error ? err.message : String(err));
    }
  };

  const handleTestConnection = async () => {
    if (!apiUrl || !token) {
      toast.warning("提示", "请先填写 API 地址和 Token");
      return;
    }
    await testConnection(apiUrl, token);
  };

  // 导出配置
  const handleExportConfig = () => {
    const exportData = {
      apiUrl,
      apiToken: token,
      concurrency: parseInt(concurrency),
      strategyId,
      advanced: advancedConfig,
      theme,
      exportedAt: new Date().toISOString(),
      version: appVersion,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lsky-studio-config-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("导出成功", "配置文件已下载");
  };

  // 导入配置
  const handleImportConfig = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);

        // 验证导入的数据结构
        if (!imported.apiUrl || !imported.apiToken) {
          throw new Error("配置文件格式无效");
        }

        // 应用导入的配置
        setApiUrl(imported.apiUrl);
        setToken(imported.apiToken);
        if (imported.concurrency) {
          setConcurrency(String(imported.concurrency));
        }
        if (imported.strategyId) {
          setStrategyId(imported.strategyId);
        }
        if (imported.advanced) {
          setAdvancedConfig(imported.advanced);
        }
        if (imported.theme) {
          setTheme(imported.theme);
        }

        toast.success("导入成功", "配置已加载，请检查后保存");
      } catch (err) {
        toast.error(
          "导入失败",
          err instanceof Error ? err.message : "配置文件格式错误"
        );
      }
    };
    reader.readAsText(file);

    // 重置 input 以允许重复导入同一文件
    event.target.value = "";
  };

  // 重置高级配置
  const handleResetAdvanced = () => {
    setAdvancedConfig({
      retryCount: 3,
      retryDelay: 1000,
      autoCopyUrl: true,
      compressImages: false,
      compressQuality: 80,
    });
    toast.info("已重置", "高级配置已恢复默认值");
  };

  // 更新高级配置
  const updateAdvancedConfig = <K extends keyof AdvancedConfig>(
    key: K,
    value: AdvancedConfig[K]
  ) => {
    setAdvancedConfig((prev) => ({ ...prev, [key]: value }));
  };

  // 格式化内存大小
  const formatMemory = (bytes: number): string => {
    const mb = bytes / 1024 / 1024;
    return `${Math.round(mb)} MB`;
  };

  // 格式化运行时间
  const formatUptime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours} 小时 ${minutes} 分钟`;
    }
    return `${minutes} 分钟`;
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="设置"
        description="配置应用参数"
        actions={
          <>
            <Button variant="outline" onClick={handleImportConfig}>
              <Upload className="h-4 w-4" strokeWidth={1.75} />
              导入配置
            </Button>
            <Button variant="outline" onClick={handleExportConfig}>
              <Download className="h-4 w-4" strokeWidth={1.75} />
              导出配置
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              <Save className="h-4 w-4" strokeWidth={1.75} />
              保存配置
            </Button>
          </>
        }
      />

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileChange}
      />

      <Tabs defaultValue="basic">
        <TabsList>
          <TabsTrigger value="basic">
            <Settings2 className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
            基础设置
          </TabsTrigger>
          <TabsTrigger value="advanced">
            <Zap className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
            高级设置
          </TabsTrigger>
          <TabsTrigger value="about">
            <Info className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
            关于
          </TabsTrigger>
        </TabsList>

        {/* 基础设置 */}
        <TabsContent value="basic" className="mt-5">
          <div className="space-y-5">
            {/* API Configuration */}
            <Card className="overflow-hidden">
              <GroupHeader
                title="API 配置"
                description="配置兰空图床 API 连接信息"
              />
              <div>
                <SettingRow
                  title={
                    <>
                      API 地址
                      <span className="ml-0.5 text-destructive">*</span>
                    </>
                  }
                  htmlFor="apiUrl"
                >
                  <div className="w-[280px]">
                    <Input
                      id="apiUrl"
                      placeholder="https://your-domain.com"
                      value={apiUrl}
                      onChange={(e) => {
                        setApiUrl(e.target.value);
                        clearFieldError("apiUrl");
                      }}
                      className={cn(errors.apiUrl && "border-destructive")}
                    />
                    {errors.apiUrl && <FieldError message={errors.apiUrl} />}
                  </div>
                </SettingRow>

                <SettingRow
                  title={
                    <>
                      API Token
                      <span className="ml-0.5 text-destructive">*</span>
                    </>
                  }
                  htmlFor="token"
                >
                  <div className="w-[280px]">
                    <Input
                      id="token"
                      type="password"
                      placeholder="请输入 API Token"
                      value={token}
                      onChange={(e) => {
                        setToken(e.target.value);
                        clearFieldError("token");
                      }}
                      className={cn(errors.token && "border-destructive")}
                    />
                    {errors.token && <FieldError message={errors.token} />}
                  </div>
                </SettingRow>

                <SettingRow
                  title="连接测试"
                  description="验证 API 地址与 Token 是否可用"
                >
                  <div className="flex items-center gap-2">
                    {testResult &&
                      (testResult.success ? (
                        <Badge variant="success">
                          <CheckCircle className="mr-1 h-3 w-3" strokeWidth={1.75} />
                          连接成功
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <XCircle className="mr-1 h-3 w-3" strokeWidth={1.75} />
                          连接失败
                        </Badge>
                      ))}
                    {testResult?.version && (
                      <span className="text-[12px] tabular-nums text-muted-foreground">
                        版本: {testResult.version}
                      </span>
                    )}
                    <Button
                      variant="outline"
                      onClick={handleTestConnection}
                      disabled={isTesting}
                    >
                      <TestTube className="h-4 w-4" strokeWidth={1.75} />
                      {isTesting ? "测试中..." : "测试连接"}
                    </Button>
                  </div>
                </SettingRow>

                {testResult && !testResult.success && testResult.error && (
                  <div className="border-b border-border/60 px-5 py-3.5 last:border-b-0">
                    <div className="text-[14px] font-medium text-destructive">
                      错误详情
                    </div>
                    <p className="mt-0.5 break-all text-[12px] text-destructive/80">
                      {testResult.error}
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Storage Strategy */}
            <Card className="overflow-hidden">
              <GroupHeader
                title="存储策略"
                description="选择存储策略"
              />
              <div>
                <SettingRow
                  title="存储策略 ID"
                  description="选择图片上传所使用的存储策略"
                  htmlFor="strategyId"
                >
                  <div className="flex w-[280px] items-center gap-2">
                    <Input
                      id="strategyId"
                      placeholder="1"
                      value={strategyId}
                      onChange={(e) => setStrategyId(e.target.value)}
                    />
                    <Button
                      variant="outline"
                      onClick={() => loadStrategies(apiUrl, token)}
                    >
                      <RefreshCw className="h-4 w-4" strokeWidth={1.75} />
                      刷新
                    </Button>
                  </div>
                </SettingRow>

                {strategies.length > 0 && (
                  <div className="border-b border-border/60 px-5 py-3.5 last:border-b-0">
                    <div className="mb-2 text-[12px] text-muted-foreground">
                      可用策略（点击选择）
                    </div>
                    <div className="space-y-2">
                      {strategies.map((strategy) => (
                        <div
                          key={strategy.id}
                          className={cn(
                            "flex cursor-pointer items-center justify-between gap-3 rounded-md border px-3.5 py-2.5 transition-colors",
                            strategyId === String(strategy.id)
                              ? "border-primary bg-primary/5"
                              : "border-border/70 hover:bg-secondary/50"
                          )}
                          onClick={() => setStrategyId(String(strategy.id))}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-[14px] font-medium">
                              {strategy.name}
                            </p>
                            <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                              {strategy.description || strategy.provider}
                            </p>
                          </div>
                          <Badge
                            variant={
                              strategyId === String(strategy.id)
                                ? "default"
                                : "outline"
                            }
                            className="shrink-0 tabular-nums"
                          >
                            ID: {strategy.id}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {strategies.length === 0 && apiUrl && token && (
                  <div className="border-b border-border/60 px-5 py-3.5 text-[12px] text-muted-foreground last:border-b-0">
                    点击"刷新"按钮获取存储策略列表
                  </div>
                )}
              </div>
            </Card>

            {/* Upload Settings */}
            <Card className="overflow-hidden">
              <GroupHeader title="上传设置" description="配置上传参数" />
              <div>
                <SettingRow
                  title="并发上传数"
                  description="建议设置为 3-5，过高可能导致网络拥堵"
                  htmlFor="concurrency"
                >
                  <div className="w-[120px]">
                    <Input
                      id="concurrency"
                      type="number"
                      min="1"
                      max="10"
                      value={concurrency}
                      onChange={(e) => {
                        setConcurrency(e.target.value);
                        clearFieldError("concurrency");
                      }}
                      className={cn(
                        "tabular-nums",
                        errors.concurrency && "border-destructive"
                      )}
                    />
                    {errors.concurrency && (
                      <FieldError message={errors.concurrency} />
                    )}
                  </div>
                </SettingRow>
              </div>
            </Card>

            {/* Appearance Settings */}
            <Card className="overflow-hidden">
              <GroupHeader title="外观设置" description="配置应用外观" />
              <div>
                <SettingRow title="主题" description="选择应用的外观主题">
                  <div className="flex items-center gap-2">
                    <Button
                      variant={theme === "light" ? "default" : "outline"}
                      onClick={() => setTheme("light")}
                    >
                      <Sun className="h-4 w-4" strokeWidth={1.75} />
                      浅色
                    </Button>
                    <Button
                      variant={theme === "dark" ? "default" : "outline"}
                      onClick={() => setTheme("dark")}
                    >
                      <Moon className="h-4 w-4" strokeWidth={1.75} />
                      深色
                    </Button>
                    <Button
                      variant={theme === "system" ? "default" : "outline"}
                      onClick={() => setTheme("system")}
                    >
                      <Monitor className="h-4 w-4" strokeWidth={1.75} />
                      跟随系统
                    </Button>
                  </div>
                </SettingRow>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* 高级设置 */}
        <TabsContent value="advanced" className="mt-5">
          <div className="space-y-5">
            <Card className="overflow-hidden">
              <GroupHeader
                title="高级设置"
                description="配置高级上传参数"
                action={
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetAdvanced}
                  >
                    <RotateCcw className="h-4 w-4" strokeWidth={1.75} />
                    重置默认
                  </Button>
                }
              />
              <div>
                <SettingRow
                  title="重试次数"
                  description="上传失败后的重试次数，设为 0 则不重试"
                  htmlFor="retryCount"
                >
                  <div className="w-[120px]">
                    <Input
                      id="retryCount"
                      type="number"
                      min="0"
                      max="10"
                      value={advancedConfig.retryCount}
                      onChange={(e) => {
                        updateAdvancedConfig(
                          "retryCount",
                          parseInt(e.target.value) || 0
                        );
                        clearFieldError("retryCount");
                      }}
                      className={cn(
                        "tabular-nums",
                        errors.retryCount && "border-destructive"
                      )}
                    />
                    {errors.retryCount && (
                      <FieldError message={errors.retryCount} />
                    )}
                  </div>
                </SettingRow>

                <SettingRow
                  title="重试延迟 (毫秒)"
                  description="每次重试之间的等待时间"
                  htmlFor="retryDelay"
                >
                  <div className="w-[120px]">
                    <Input
                      id="retryDelay"
                      type="number"
                      min="0"
                      max="60000"
                      step="100"
                      value={advancedConfig.retryDelay}
                      onChange={(e) => {
                        updateAdvancedConfig(
                          "retryDelay",
                          parseInt(e.target.value) || 0
                        );
                        clearFieldError("retryDelay");
                      }}
                      className={cn(
                        "tabular-nums",
                        errors.retryDelay && "border-destructive"
                      )}
                    />
                    {errors.retryDelay && (
                      <FieldError message={errors.retryDelay} />
                    )}
                  </div>
                </SettingRow>

                <SettingRow
                  title="自动复制 URL"
                  description="上传完成后自动将图片 URL 复制到剪贴板"
                >
                  <button
                    type="button"
                    role="switch"
                    aria-checked={advancedConfig.autoCopyUrl}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                      advancedConfig.autoCopyUrl ? "bg-primary" : "bg-input"
                    }`}
                    onClick={() =>
                      updateAdvancedConfig(
                        "autoCopyUrl",
                        !advancedConfig.autoCopyUrl
                      )
                    }
                  >
                    <span
                      className={`pointer-events-none block h-5 w-5 rounded-full bg-card shadow-card ring-0 transition-transform ${
                        advancedConfig.autoCopyUrl
                          ? "translate-x-5"
                          : "translate-x-0"
                      }`}
                    />
                  </button>
                </SettingRow>

                <SettingRow
                  title="启用图片压缩"
                  description="上传前自动压缩图片以减小文件大小"
                >
                  <button
                    type="button"
                    role="switch"
                    aria-checked={advancedConfig.compressImages}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                      advancedConfig.compressImages ? "bg-primary" : "bg-input"
                    }`}
                    onClick={() =>
                      updateAdvancedConfig(
                        "compressImages",
                        !advancedConfig.compressImages
                      )
                    }
                  >
                    <span
                      className={`pointer-events-none block h-5 w-5 rounded-full bg-card shadow-card ring-0 transition-transform ${
                        advancedConfig.compressImages
                          ? "translate-x-5"
                          : "translate-x-0"
                      }`}
                    />
                  </button>
                </SettingRow>

                {advancedConfig.compressImages && (
                  <div className="border-b border-border/60 px-5 py-3.5 last:border-b-0">
                    <div className="flex items-center justify-between gap-4">
                      <Label htmlFor="compressQuality">压缩质量</Label>
                      <span className="text-[14px] font-medium tabular-nums">
                        {advancedConfig.compressQuality}%
                      </span>
                    </div>
                    <input
                      id="compressQuality"
                      type="range"
                      min="1"
                      max="100"
                      value={advancedConfig.compressQuality}
                      onChange={(e) => {
                        updateAdvancedConfig(
                          "compressQuality",
                          parseInt(e.target.value)
                        );
                        clearFieldError("compressQuality");
                      }}
                      className={cn(
                        "mt-3 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-primary",
                        errors.compressQuality && "ring-1 ring-destructive"
                      )}
                    />
                    {errors.compressQuality && (
                      <FieldError message={errors.compressQuality} />
                    )}
                    <div className="mt-1.5 flex justify-between text-[12px] text-muted-foreground">
                      <span>高质量 (大文件)</span>
                      <span>低质量 (小文件)</span>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* 关于 */}
        <TabsContent value="about" className="mt-5">
          <div className="space-y-5">
            {/* 应用信息 */}
            <Card className="overflow-hidden">
              <GroupHeader
                title="应用信息"
                description="Lsky Studio 版本和系统信息"
              />
              <div>
                <div className="flex items-center justify-between gap-4 border-b border-border/60 px-5 py-3.5 last:border-b-0">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
                    <span className="text-[14px] font-medium">应用版本</span>
                  </div>
                  <Badge variant="outline" className="tabular-nums">
                    {appVersion || "加载中..."}
                  </Badge>
                </div>

                <div className="flex items-center justify-between gap-4 border-b border-border/60 px-5 py-3.5 last:border-b-0">
                  <div className="flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
                    <span className="text-[14px] font-medium">
                      {isWebMode() ? "运行环境" : "Node.js 版本"}
                    </span>
                  </div>
                  <Badge variant="outline">{nodeVersion || "加载中..."}</Badge>
                </div>

                {isWebMode() && (
                  <div className="flex items-center justify-between gap-4 border-b border-border/60 px-5 py-3.5 last:border-b-0">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
                      <span className="text-[14px] font-medium">运行模式</span>
                    </div>
                    <Badge variant="secondary">Web 浏览器模式</Badge>
                  </div>
                )}

                <div className="flex items-center justify-between gap-4 border-b border-border/60 px-5 py-3.5 last:border-b-0">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
                    <span className="text-[14px] font-medium">运行平台</span>
                  </div>
                  <span className="text-[14px] text-muted-foreground">
                    {navigator.platform}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 border-b border-border/60 px-5 py-3.5 last:border-b-0">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
                    <span className="text-[14px] font-medium">用户代理</span>
                  </div>
                  <span className="max-w-[320px] truncate text-[14px] text-muted-foreground">
                    {navigator.userAgent}
                  </span>
                </div>
              </div>
            </Card>

            {/* Node.js 服务状态（仅 Tauri 模式） */}
            {!isWebMode() && (
              <Card className="overflow-hidden">
                <GroupHeader
                  title="服务状态"
                  description="Node.js 后端服务运行状态"
                />
                <div>
                  <div className="flex items-center justify-between gap-4 border-b border-border/60 px-5 py-3.5 last:border-b-0">
                    <span className="text-[14px] font-medium">服务状态</span>
                    <StatusIndicator
                      status={isReady ? "online" : "offline"}
                      label={isReady ? "运行中" : "未连接"}
                    />
                  </div>

                  {status && (
                    <>
                      <div className="flex items-center justify-between gap-4 border-b border-border/60 px-5 py-3.5 last:border-b-0">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
                          <span className="text-[14px] font-medium">运行时间</span>
                        </div>
                        <span className="text-[14px] tabular-nums text-muted-foreground">
                          {formatUptime(status.uptime)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4 border-b border-border/60 px-5 py-3.5 last:border-b-0">
                        <div className="flex items-center gap-2">
                          <HardDrive className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
                          <span className="text-[14px] font-medium">内存使用</span>
                        </div>
                        <span className="text-[14px] tabular-nums text-muted-foreground">
                          {formatMemory(status.memory.heapUsed)} /{" "}
                          {formatMemory(status.memory.heapTotal)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4 border-b border-border/60 px-5 py-3.5 last:border-b-0">
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
                          <span className="text-[14px] font-medium">任务数量</span>
                        </div>
                        <span className="text-[14px] tabular-nums text-muted-foreground">
                          {status.tasks}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </Card>
            )}

            {/* 关于应用 */}
            <Card className="overflow-hidden">
              <div className="flex flex-col items-center px-6 py-8 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
                  <ImageIcon className="h-8 w-8 text-primary" strokeWidth={1.5} />
                </div>
                <h3 className="mt-4 text-section">Lsky Studio</h3>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  兰空图床桌面客户端
                </p>
                <p className="mt-3 max-w-md text-[12px] leading-[1.5] text-muted-foreground">
                  Lsky Studio 是兰空图床客户端，
                  支持批量上传、拖拽上传、图片压缩等功能。
                  {isWebMode() ? " 当前运行在浏览器模式下。" : ""}
                </p>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

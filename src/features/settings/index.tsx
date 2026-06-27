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
  Copy,
  ImageIcon,
  Zap,
  RotateCcw,
  Clock,
  AlertTriangle,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToastActions } from "@/components/ui/toaster";
import { useTheme } from "@/hooks/use-theme";
import { useConfig, useStrategies, useTestConnection } from "@/hooks/use-config";
import { useSystem } from "@/hooks/use-system";
import { appApi, systemApi, isWebMode } from "@/lib/api";
import { APP_VERSION } from "@/lib/constants";

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
    if (isWebMode) {
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">设置</h2>
          <p className="text-muted-foreground">配置应用参数</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleImportConfig}>
            <Upload className="mr-2 h-4 w-4" />
            导入配置
          </Button>
          <Button variant="outline" onClick={handleExportConfig}>
            <Download className="mr-2 h-4 w-4" />
            导出配置
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            <Save className="mr-2 h-4 w-4" />
            保存配置
          </Button>
        </div>
      </div>

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Tabs 组件 */}
      <Tabs defaultValue="basic">
        <TabsList>
          <TabsTrigger value="basic">
            <Settings2 className="mr-2 h-4 w-4" />
            基础设置
          </TabsTrigger>
          <TabsTrigger value="advanced">
            <Zap className="mr-2 h-4 w-4" />
            高级设置
          </TabsTrigger>
          <TabsTrigger value="about">
            <Info className="mr-2 h-4 w-4" />
            关于
          </TabsTrigger>
        </TabsList>

        {/* 基础设置 */}
        <TabsContent value="basic">
          <div className="space-y-6">
            {/* API Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>API 配置</CardTitle>
                <CardDescription>配置兰空图床 API 连接信息</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="apiUrl">
                    API 地址
                    <span className="text-destructive ml-1">*</span>
                  </Label>
                  <Input
                    id="apiUrl"
                    placeholder="https://your-domain.com"
                    value={apiUrl}
                    onChange={(e) => {
                      setApiUrl(e.target.value);
                      clearFieldError("apiUrl");
                    }}
                    className={errors.apiUrl ? "border-destructive" : ""}
                  />
                  {errors.apiUrl && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {errors.apiUrl}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="token">
                    API Token
                    <span className="text-destructive ml-1">*</span>
                  </Label>
                  <Input
                    id="token"
                    type="password"
                    placeholder="请输入 API Token"
                    value={token}
                    onChange={(e) => {
                      setToken(e.target.value);
                      clearFieldError("token");
                    }}
                    className={errors.token ? "border-destructive" : ""}
                  />
                  {errors.token && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {errors.token}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleTestConnection}
                    disabled={isTesting}
                  >
                    <TestTube className="mr-2 h-4 w-4" />
                    {isTesting ? "测试中..." : "测试连接"}
                  </Button>
                  {testResult && (
                    <div className="flex items-center gap-2">
                      {testResult.success ? (
                        <Badge variant="success">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          连接成功
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <XCircle className="mr-1 h-3 w-3" />
                          连接失败
                        </Badge>
                      )}
                      {testResult.version && (
                        <span className="text-sm text-muted-foreground">
                          版本: {testResult.version}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {testResult && !testResult.success && testResult.error && (
                  <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                    <p className="text-sm text-destructive font-medium">错误详情：</p>
                    <p className="text-sm text-destructive/80 mt-1">{testResult.error}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Storage Strategy */}
            <Card>
              <CardHeader>
                <CardTitle>存储策略</CardTitle>
                <CardDescription>选择存储策略</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="strategyId">存储策略 ID</Label>
                  <div className="flex gap-2">
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
                      <RefreshCw className="mr-2 h-4 w-4" />
                      刷新
                    </Button>
                  </div>
                </div>
                {strategies.length > 0 && (
                  <div className="space-y-2">
                    <Label>可用策略（点击选择）</Label>
                    <div className="grid gap-2">
                      {strategies.map((strategy) => (
                        <div
                          key={strategy.id}
                          className={`flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-colors ${
                            strategyId === String(strategy.id)
                              ? "border-primary bg-primary/5"
                              : "hover:bg-muted/50"
                          }`}
                          onClick={() => setStrategyId(String(strategy.id))}
                        >
                          <div>
                            <p className="text-sm font-medium">
                              {strategy.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {strategy.description || strategy.provider}
                            </p>
                          </div>
                          <Badge variant={strategyId === String(strategy.id) ? "default" : "outline"}>
                            ID: {strategy.id}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {strategies.length === 0 && apiUrl && token && (
                  <div className="text-sm text-muted-foreground">
                    点击"刷新"按钮获取存储策略列表
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upload Settings */}
            <Card>
              <CardHeader>
                <CardTitle>上传设置</CardTitle>
                <CardDescription>配置上传参数</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="concurrency">并发上传数</Label>
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
                    className={errors.concurrency ? "border-destructive" : ""}
                  />
                  {errors.concurrency && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {errors.concurrency}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    建议设置为 3-5，过高可能导致网络拥堵
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Appearance Settings */}
            <Card>
              <CardHeader>
                <CardTitle>外观设置</CardTitle>
                <CardDescription>配置应用外观</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>主题</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={theme === "light" ? "default" : "outline"}
                      onClick={() => setTheme("light")}
                    >
                      <Sun className="mr-2 h-4 w-4" />
                      浅色
                    </Button>
                    <Button
                      variant={theme === "dark" ? "default" : "outline"}
                      onClick={() => setTheme("dark")}
                    >
                      <Moon className="mr-2 h-4 w-4" />
                      深色
                    </Button>
                    <Button
                      variant={theme === "system" ? "default" : "outline"}
                      onClick={() => setTheme("system")}
                    >
                      <Monitor className="mr-2 h-4 w-4" />
                      跟随系统
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 高级设置 */}
        <TabsContent value="advanced">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>高级设置</CardTitle>
                    <CardDescription>配置高级上传参数</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleResetAdvanced}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    重置默认
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 重试配置 */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-base font-medium">重试配置</Label>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="retryCount">重试次数</Label>
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
                        className={
                          errors.retryCount ? "border-destructive" : ""
                        }
                      />
                      {errors.retryCount && (
                        <p className="text-sm text-destructive flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {errors.retryCount}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        上传失败后的重试次数，设为 0 则不重试
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="retryDelay">重试延迟 (毫秒)</Label>
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
                        className={
                          errors.retryDelay ? "border-destructive" : ""
                        }
                      />
                      {errors.retryDelay && (
                        <p className="text-sm text-destructive flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {errors.retryDelay}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        每次重试之间的等待时间
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* 上传行为 */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-base font-medium">上传行为</Label>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Copy className="h-4 w-4 text-muted-foreground" />
                          <Label>自动复制 URL</Label>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          上传完成后自动将图片 URL 复制到剪贴板
                        </p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={advancedConfig.autoCopyUrl}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                          advancedConfig.autoCopyUrl
                            ? "bg-primary"
                            : "bg-input"
                        }`}
                        onClick={() =>
                          updateAdvancedConfig(
                            "autoCopyUrl",
                            !advancedConfig.autoCopyUrl
                          )
                        }
                      >
                        <span
                          className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${
                            advancedConfig.autoCopyUrl
                              ? "translate-x-5"
                              : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* 图片压缩 */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-base font-medium">图片压缩</Label>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>启用图片压缩</Label>
                        <p className="text-xs text-muted-foreground">
                          上传前自动压缩图片以减小文件大小
                        </p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={advancedConfig.compressImages}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                          advancedConfig.compressImages
                            ? "bg-primary"
                            : "bg-input"
                        }`}
                        onClick={() =>
                          updateAdvancedConfig(
                            "compressImages",
                            !advancedConfig.compressImages
                          )
                        }
                      >
                        <span
                          className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${
                            advancedConfig.compressImages
                              ? "translate-x-5"
                              : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    {advancedConfig.compressImages && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="compressQuality">
                            压缩质量
                          </Label>
                          <span className="text-sm font-medium">
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
                          className={`w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer ${
                            errors.compressQuality
                              ? "border-destructive"
                              : ""
                          }`}
                        />
                        {errors.compressQuality && (
                          <p className="text-sm text-destructive flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {errors.compressQuality}
                          </p>
                        )}
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>高质量 (大文件)</span>
                          <span>低质量 (小文件)</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 关于 */}
        <TabsContent value="about">
          <div className="space-y-6">
            {/* 应用信息 */}
            <Card>
              <CardHeader>
                <CardTitle>应用信息</CardTitle>
                <CardDescription>Lsky Studio 版本和系统信息</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">应用版本</span>
                  </div>
                  <Badge variant="outline">{appVersion || "加载中..."}</Badge>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{isWebMode ? "运行环境" : "Node.js 版本"}</span>
                  </div>
                  <Badge variant="outline">
                    {nodeVersion || "加载中..."}
                  </Badge>
                </div>
                {isWebMode && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Monitor className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">运行模式</span>
                      </div>
                      <Badge variant="secondary">Web 浏览器模式</Badge>
                    </div>
                  </>
                )}
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">运行平台</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {navigator.platform}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">用户代理</span>
                  </div>
                  <span className="text-sm text-muted-foreground max-w-[300px] truncate">
                    {navigator.userAgent}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Node.js 服务状态（仅 Tauri 模式） */}
            {!isWebMode && <Card>
              <CardHeader>
                <CardTitle>服务状态</CardTitle>
                <CardDescription>Node.js 后端服务运行状态</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">服务状态</span>
                  <Badge variant={isReady ? "success" : "destructive"}>
                    {isReady ? "运行中" : "未连接"}
                  </Badge>
                </div>
                {status && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">运行时间</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formatUptime(status.uptime)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <HardDrive className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">内存使用</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formatMemory(status.memory.heapUsed)} /{" "}
                        {formatMemory(status.memory.heapTotal)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">任务数量</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {status.tasks}
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>}

            {/* 关于应用 */}
            <Card>
              <CardHeader>
                <CardTitle>关于 Lsky Studio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center space-y-4">
                  <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Lsky Studio</h3>
                    <p className="text-sm text-muted-foreground">
                      兰空图床桌面客户端
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    Lsky Studio 是兰空图床客户端，
                    支持批量上传、拖拽上传、图片压缩等功能。
                    {isWebMode ? " 当前运行在浏览器模式下。" : ""}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

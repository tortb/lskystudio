import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Upload,
  History,
  CheckCircle,
  XCircle,
  TrendingUp,
  Cpu,
  HardDrive,
  Activity,
  Settings,
  Image,
  Loader2,
  ChevronRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { useSystem } from "@/hooks/use-system";
import { useConfig } from "@/hooks/use-config";
import { formatFileSize } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  tone?: string;
}

function StatsCard({ title, value, description, icon: Icon, tone }: StatsCardProps) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-muted-foreground">{title}</span>
          <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
        </div>
        <div
          className={`mt-2 text-[17px] font-semibold leading-none tabular-nums tracking-[-0.01em] ${tone ?? ""}`}
        >
          {value}
        </div>
        {description && (
          <p className="mt-2 text-[12px] text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { status } = useSystem();
  const { config } = useConfig();

  const [stats, setStats] = useState({
    totalUploads: 0,
    successRate: 0,
    todayUploads: 0,
    failedUploads: 0,
  });
  const [recentUploads, setRecentUploads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const fetchingRef = useRef(false);

  // 提取原始值，避免对象引用变化导致无限循环
  const apiUrl = config?.apiUrl || "";
  const apiToken = config?.apiToken || "";

  // 获取真实数据
  const fetchDashboardData = useCallback(async () => {
    if (!apiUrl || !apiToken) {
      return;
    }

    // 防止并发请求
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    setIsLoading(true);
    try {
      const baseUrl = apiUrl.replace(/\/+$/, "");

      // 获取图片列表 (v2 API)
      const response = await fetch(`${baseUrl}/api/v2/user/photos?page=1&per_page=100`, {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          Accept: "application/json",
        },
      });

      if (response.ok) {
        const contentType = response.headers.get("content-type") || "";
        const text = await response.text();

        if (!contentType.includes("application/json")) {
          console.error("API 返回非 JSON 响应");
          return;
        }

        const result = JSON.parse(text);

        // 兼容 status 为 "success" 或 true
        const isSuccess = result.status === "success" || result.status === true;
        const photoList = result.data?.data || result.data?.images || [];

        if (isSuccess) {
          const photos = photoList;
          const total = photos.length;
          const success = photos.filter((img: any) => img.public_url || img.url).length;
          const failed = total - success;

          // 计算今日上传
          const today = new Date().toISOString().split("T")[0];
          const todayUploads = photos.filter((img: any) => {
            const uploadDate = (img.created_at || "").split("T")[0];
            return uploadDate === today;
          }).length;

          setStats({
            totalUploads: total,
            successRate: total > 0 ? Math.round((success / total) * 100) : 0,
            todayUploads,
            failedUploads: failed,
          });

          // 最近上传
          setRecentUploads(
            photos.slice(0, 5).map((img: any) => ({
              id: String(img.id),
              fileName: img.name || img.filename || "未知文件",
              fileSize: img.size || 0,
              status: img.public_url || img.url ? "success" : "failed",
              url: img.public_url || img.url,
              createdAt: img.created_at,
            }))
          );
        }
      }
    } catch (error) {
      console.error("获取仪表盘数据失败:", error);
    } finally {
      setIsLoading(false);
      fetchingRef.current = false;
    }
  }, [apiUrl, apiToken]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // 格式化内存大小
  const formatMemory = (bytes: number): string => {
    const mb = bytes / 1024 / 1024;
    return `${Math.round(mb)} MB`;
  };

  const isConfigured = Boolean(config?.apiUrl && config?.apiToken);

  const quickActions = [
    { label: "上传图片", icon: Upload, to: "/upload" },
    { label: "查看历史", icon: History, to: "/history" },
    { label: "管理相册", icon: Image, to: "/albums" },
    { label: "系统设置", icon: Settings, to: "/settings" },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="仪表盘"
        description={isConfigured ? "系统运行正常，准备上传" : "请先配置 API 信息"}
      />

      {/* 未配置提示 */}
      {!isConfigured ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
              <Settings className="h-7 w-7 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <h3 className="text-section">欢迎使用 Lsky Studio</h3>
            <p className="mt-1.5 max-w-md text-[14px] leading-[1.5] text-muted-foreground">
              请先在设置页面配置 API 地址和 Token，然后即可开始使用上传功能
            </p>
            <Button className="mt-6" onClick={() => navigate("/settings")}>
              <Settings className="h-4 w-4" strokeWidth={1.75} />
              前往设置
            </Button>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center px-6 py-16">
            <Loader2 className="mb-3 h-6 w-6 animate-spin text-muted-foreground" strokeWidth={1.75} />
            <p className="text-[14px] text-muted-foreground">加载中…</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title="总上传数"
              value={stats.totalUploads}
              description="累计上传图片数量"
              icon={Upload}
            />
            <StatsCard
              title="成功率"
              value={`${stats.successRate}%`}
              description="上传成功率"
              icon={CheckCircle}
              tone="text-success"
            />
            <StatsCard
              title="今日上传"
              value={stats.todayUploads}
              description="今日上传图片数量"
              icon={TrendingUp}
            />
            <StatsCard
              title="失败数"
              value={stats.failedUploads}
              description="上传失败数量"
              icon={XCircle}
              tone={stats.failedUploads > 0 ? "text-destructive" : undefined}
            />
          </div>

          {/* Quick Actions and Recent Uploads */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Quick Actions */}
            <Card className="overflow-hidden">
              <div className="border-b border-border/70 px-5 py-3.5">
                <h3 className="text-section">快速操作</h3>
                <p className="mt-0.5 text-[12px] text-muted-foreground">
                  常用功能快捷入口
                </p>
              </div>
              <div>
                {quickActions.map((action) => (
                  <button
                    key={action.to}
                    type="button"
                    onClick={() => navigate(action.to)}
                    className="flex w-full items-center gap-3 border-b border-border/60 px-5 py-3 text-left transition-colors last:border-b-0 hover:bg-secondary/50"
                  >
                    <action.icon
                      className="h-4 w-4 shrink-0 text-muted-foreground"
                      strokeWidth={1.75}
                    />
                    <span className="flex-1 text-[14px] font-medium">
                      {action.label}
                    </span>
                    <ChevronRight
                      className="h-4 w-4 shrink-0 text-muted-foreground/70"
                      strokeWidth={1.75}
                    />
                  </button>
                ))}
              </div>
            </Card>

            {/* Recent Uploads */}
            <Card className="overflow-hidden">
              <div className="border-b border-border/70 px-5 py-3.5">
                <h3 className="text-section">最近上传</h3>
                <p className="mt-0.5 text-[12px] text-muted-foreground">
                  最近上传的图片记录
                </p>
              </div>
              {recentUploads.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-6 py-12">
                  <History className="mb-3 h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
                  <p className="text-[14px] text-muted-foreground">暂无上传记录</p>
                </div>
              ) : (
                <div>
                  {recentUploads.map((upload) => (
                    <div
                      key={upload.id}
                      className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-3 last:border-b-0"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-sm bg-secondary">
                          {upload.url ? (
                            <img
                              src={upload.url}
                              alt={upload.fileName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Image className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-medium leading-tight">
                            {upload.fileName}
                          </p>
                          <p className="mt-0.5 text-[12px] tabular-nums text-muted-foreground">
                            {formatFileSize(upload.fileSize)}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={upload.status === "success" ? "success" : "destructive"}
                      >
                        {upload.status === "success" ? "成功" : "失败"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* System Status */}
          <Card className="overflow-hidden">
            <div className="border-b border-border/70 px-5 py-3.5">
              <h3 className="text-section">系统状态</h3>
              <p className="mt-0.5 text-[12px] text-muted-foreground">Node.js 服务状态</p>
            </div>
            <div className="grid divide-y divide-border/60 md:grid-cols-3 md:divide-x md:divide-y-0">
              <div className="flex items-center justify-between gap-3 px-5 py-4">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
                  <span className="text-[14px]">内存使用</span>
                </div>
                <span className="text-[14px] tabular-nums text-muted-foreground">
                  {status ? formatMemory(status.memory.heapUsed) : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 px-5 py-4">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
                  <span className="text-[14px]">堆内存总量</span>
                </div>
                <span className="text-[14px] tabular-nums text-muted-foreground">
                  {status ? formatMemory(status.memory.heapTotal) : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 px-5 py-4">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
                  <span className="text-[14px]">上传状态</span>
                </div>
                <Badge variant={status?.isUploading ? "default" : "secondary"}>
                  {status?.isUploading ? "上传中" : "空闲"}
                </Badge>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

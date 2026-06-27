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
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSystem } from "@/hooks/use-system";
import { useConfig } from "@/hooks/use-config";
import { formatFileSize } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: typeof Upload;
}

function StatsCard({ title, value, description, icon: Icon }: StatsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">仪表盘</h2>
        <p className="text-muted-foreground">
          {config?.apiUrl && config?.apiToken
            ? "系统运行正常，准备上传"
            : "请先配置 API 信息"}
        </p>
      </div>

      {/* 未配置提示 */}
      {!config?.apiUrl || !config?.apiToken ? (
        <Card>
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center">
              <Settings className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-medium">欢迎使用 Lsky Studio</h3>
              <p className="mb-4 text-sm text-muted-foreground text-center max-w-md">
                请先在设置页面配置 API 地址和 Token，然后即可开始使用上传功能
              </p>
              <Button onClick={() => navigate("/settings")}>
                <Settings className="mr-2 h-4 w-4" />
                前往设置
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <Card>
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center">
              <Loader2 className="mb-4 h-12 w-12 text-muted-foreground animate-spin" />
              <p className="text-sm text-muted-foreground">加载中...</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
            />
          </div>

          {/* Quick Actions and Recent Uploads */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>快速操作</CardTitle>
                <CardDescription>常用功能快捷入口</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => navigate("/upload")}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    上传图片
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => navigate("/history")}
                  >
                    <History className="mr-2 h-4 w-4" />
                    查看历史
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => navigate("/albums")}
                  >
                    <Image className="mr-2 h-4 w-4" />
                    管理相册
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => navigate("/settings")}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    系统设置
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Uploads */}
            <Card>
              <CardHeader>
                <CardTitle>最近上传</CardTitle>
                <CardDescription>最近上传的图片记录</CardDescription>
              </CardHeader>
              <CardContent>
                {recentUploads.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <History className="mb-4 h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">暂无上传记录</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentUploads.map((upload) => (
                      <div
                        key={upload.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 overflow-hidden rounded bg-muted">
                            {upload.url ? (
                              <img
                                src={upload.url}
                                alt={upload.fileName}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <Image className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{upload.fileName}</p>
                            <p className="text-xs text-muted-foreground">
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
              </CardContent>
            </Card>
          </div>

          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle>系统状态</CardTitle>
              <CardDescription>Node.js 服务状态</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">内存使用</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {status ? formatMemory(status.memory.heapUsed) : "N/A"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HardDrive className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">堆内存总量</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {status ? formatMemory(status.memory.heapTotal) : "N/A"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">上传状态</span>
                  </div>
                  <Badge variant={status?.isUploading ? "default" : "secondary"}>
                    {status?.isUploading ? "上传中" : "空闲"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

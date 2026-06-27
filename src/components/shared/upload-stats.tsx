import {
  Upload,
  CheckCircle,
  XCircle,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatFileSize, formatDuration } from "@/lib/utils";

interface UploadStatsProps {
  totalFiles: number;
  successCount: number;
  failedCount: number;
  pendingCount: number;
  uploadingCount: number;
  totalSize: number;
  uploadedSize: number;
  startTime?: Date | null;
  className?: string;
}

export function UploadStats({
  totalFiles,
  successCount,
  failedCount,
  pendingCount: _pendingCount,
  uploadingCount: _uploadingCount,
  totalSize,
  uploadedSize,
  startTime,
  className,
}: UploadStatsProps) {
  // 计算速度
  const calculateSpeed = () => {
    if (!startTime || uploadedSize === 0) return 0;
    const elapsed = (Date.now() - startTime.getTime()) / 1000;
    return uploadedSize / elapsed;
  };

  // 计算剩余时间
  const calculateETA = () => {
    const speed = calculateSpeed();
    if (speed === 0 || totalSize <= uploadedSize) return 0;
    return (totalSize - uploadedSize) / speed;
  };

  const speed = calculateSpeed();
  const eta = calculateETA();

  return (
    <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-4", className)}>
      {/* 总文件数 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">总文件数</CardTitle>
          <Upload className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalFiles}</div>
          <p className="text-xs text-muted-foreground">
            {formatFileSize(totalSize)}
          </p>
        </CardContent>
      </Card>

      {/* 成功数 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">上传成功</CardTitle>
          <CheckCircle className="h-4 w-4 text-success" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-success">{successCount}</div>
          <p className="text-xs text-muted-foreground">
            {totalFiles > 0
              ? `${Math.round((successCount / totalFiles) * 100)}% 成功率`
              : "暂无数据"}
          </p>
        </CardContent>
      </Card>

      {/* 失败数 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">上传失败</CardTitle>
          <XCircle className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">{failedCount}</div>
          <p className="text-xs text-muted-foreground">
            {failedCount > 0 ? "点击重试失败项" : "暂无失败"}
          </p>
        </CardContent>
      </Card>

      {/* 上传速度 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">上传速度</CardTitle>
          <Zap className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {speed > 0 ? `${formatFileSize(speed)}/s` : "N/A"}
          </div>
          <p className="text-xs text-muted-foreground">
            {eta > 0 ? `预计剩余 ${formatDuration(eta)}` : "等待上传"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

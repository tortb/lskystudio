import type { ReactNode } from "react";
import {
  Upload,
  CheckCircle,
  XCircle,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
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

function StatTile({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  icon: ReactNode;
  tone?: string;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-card px-4 py-3.5">
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-muted-foreground">{label}</span>
        {icon}
      </div>
      <div
        className={cn(
          "mt-1.5 text-[17px] font-semibold leading-none tabular-nums tracking-[-0.01em]",
          tone,
        )}
      >
        {value}
      </div>
      <p className="mt-1.5 text-[12px] text-muted-foreground">{hint}</p>
    </div>
  );
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
    <div className={cn("grid gap-3 md:grid-cols-2 lg:grid-cols-4", className)}>
      <StatTile
        label="总文件数"
        value={String(totalFiles)}
        hint={formatFileSize(totalSize)}
        icon={<Upload className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />}
      />

      <StatTile
        label="上传成功"
        value={String(successCount)}
        hint={
          totalFiles > 0
            ? `${Math.round((successCount / totalFiles) * 100)}% 成功率`
            : "暂无数据"
        }
        tone="text-success"
        icon={<CheckCircle className="h-4 w-4 text-success" strokeWidth={1.75} />}
      />

      <StatTile
        label="上传失败"
        value={String(failedCount)}
        hint={failedCount > 0 ? "点击重试失败项" : "暂无失败"}
        tone={failedCount > 0 ? "text-destructive" : undefined}
        icon={<XCircle className="h-4 w-4 text-destructive" strokeWidth={1.75} />}
      />

      <StatTile
        label="上传速度"
        value={speed > 0 ? `${formatFileSize(speed)}/s` : "—"}
        hint={eta > 0 ? `预计剩余 ${formatDuration(eta)}` : "等待上传"}
        icon={<Zap className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />}
      />
    </div>
  );
}

import { memo, useState } from "react";
import {
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Pause,
  Copy,
  X,
  RotateCcw,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToastActions } from "@/components/ui/toaster";
import { formatFileSize } from "@/lib/utils";

interface ProgressCardProps {
  id: string;
  fileName: string;
  fileSize: number;
  status: "pending" | "uploading" | "success" | "failed" | "paused" | "cancelled";
  progress: number;
  url?: string | null;
  error?: string | null;
  thumbnailUrl?: string | null;
  onPause?: (id: string) => void;
  onResume?: (id: string) => void;
  onCancel?: (id: string) => void;
  onRetry?: (id: string) => void;
  onRemove?: (id: string) => void;
  className?: string;
}

/**
 * 上传任务卡片
 *
 * 列表内可能同时存在上百个卡片，且进度高频变化，因此用 memo 包裹：
 * 回调统一定义为接收任务 id，便于调用方传入稳定引用，做到只重渲染进度变化的那一张。
 */
export const ProgressCard = memo(function ProgressCard({
  id,
  fileName,
  fileSize,
  status,
  progress,
  url,
  error,
  thumbnailUrl,
  onPause,
  onResume,
  onCancel,
  onRetry,
  onRemove,
  className,
}: ProgressCardProps) {
  const toast = useToastActions();
  const [imageLoaded, setImageLoaded] = useState(false);

  const copyUrl = async () => {
    if (url) {
      try {
        await navigator.clipboard.writeText(url);
        toast.success("复制成功", "链接已复制到剪贴板");
      } catch {
        toast.error("复制失败", "无法复制链接");
      }
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      case "uploading":
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case "success":
        return <CheckCircle className="h-4 w-4 text-success" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "paused":
        return <Pause className="h-4 w-4 text-warning" />;
      case "cancelled":
        return <X className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">等待中</Badge>;
      case "uploading":
        return <Badge>上传中 {progress}%</Badge>;
      case "success":
        return <Badge variant="success">成功</Badge>;
      case "failed":
        return <Badge variant="destructive">失败</Badge>;
      case "paused":
        return <Badge variant="warning">已暂停</Badge>;
      case "cancelled":
        return <Badge variant="secondary">已取消</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getProgressColor = () => {
    if (status === "failed") return "bg-destructive";
    if (status === "success") return "bg-success";
    if (status === "paused") return "bg-warning";
    return "bg-primary";
  };

  return (
    <div
      className={cn(
        "group relative flex items-start gap-3.5 border-b border-border/60 px-1 py-3.5 transition-colors last:border-b-0 hover:bg-secondary/40",
        className,
      )}
    >
      {/* 缩略图 */}
      <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-md bg-secondary">
        {thumbnailUrl || url ? (
          <>
            <img
              src={thumbnailUrl || url || ""}
              alt={fileName}
              className={cn(
                "h-full w-full object-cover transition-opacity duration-200",
                imageLoaded ? "opacity-100" : "opacity-0",
              )}
              onLoad={() => setImageLoaded(true)}
            />
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            {getStatusIcon()}
          </div>
        )}

        {/* 上传中覆盖层 */}
        {status === "uploading" && (
          <div className="absolute inset-0 bg-foreground/25">
            <div
              className="absolute bottom-0 left-0 right-0 bg-primary transition-[height] duration-300 ease-out"
              style={{ height: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* 信息区域 */}
      <div className="min-w-0 flex-1 space-y-1">
        {/* 文件名 */}
        <p className="truncate text-[14px] font-medium leading-tight" title={fileName}>
          {fileName}
        </p>

        {/* 文件大小 */}
        <p className="text-[12px] tabular-nums text-muted-foreground">
          {formatFileSize(fileSize)}
        </p>

        {/* 进度条 */}
        {(status === "uploading" || status === "paused") && (
          <div className="space-y-1 pt-0.5">
            <Progress
              value={progress}
              className={cn("h-1", getProgressColor())}
            />
            <div className="flex justify-between text-[12px] tabular-nums text-muted-foreground">
              <span>{progress}%</span>
              <span>{formatFileSize(fileSize * progress / 100)} / {formatFileSize(fileSize)}</span>
            </div>
          </div>
        )}

        {/* 状态 */}
        <div className="flex items-center gap-1.5 pt-0.5">
          {getStatusIcon()}
          {getStatusBadge()}
        </div>

        {/* 错误信息 */}
        {error && (
          <p className="line-clamp-2 text-[12px] text-destructive">{error}</p>
        )}

        {/* URL */}
        {url && status === "success" && (
          <div className="flex items-center gap-1">
            <p className="flex-1 truncate text-[12px] text-muted-foreground">
              {url}
            </p>
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="flex shrink-0 flex-col gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        {/* 上传中 */}
        {status === "uploading" && onPause && (
          <Button variant="ghost" size="icon-sm" onClick={() => onPause(id)} aria-label="暂停">
            <Pause className="h-4 w-4" />
          </Button>
        )}

        {/* 已暂停 */}
        {status === "paused" && onResume && (
          <Button variant="ghost" size="icon-sm" onClick={() => onResume(id)} aria-label="继续">
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}

        {/* 失败 */}
        {status === "failed" && onRetry && (
          <Button variant="ghost" size="icon-sm" onClick={() => onRetry(id)} aria-label="重试">
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}

        {/* 成功 - 复制链接 */}
        {status === "success" && url && (
          <Button variant="ghost" size="icon-sm" onClick={copyUrl} aria-label="复制链接">
            <Copy className="h-4 w-4" />
          </Button>
        )}

        {/* 成功 - 打开链接 */}
        {status === "success" && url && (
          <Button variant="ghost" size="icon-sm" asChild>
            <a href={url} target="_blank" rel="noopener noreferrer" aria-label="打开链接">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        )}

        {/* 取消/删除 */}
        {(status === "pending" || status === "paused" || status === "failed" || status === "cancelled") && onRemove && (
          <Button variant="ghost" size="icon-sm" onClick={() => onRemove(id)} aria-label="移除">
            <X className="h-4 w-4" />
          </Button>
        )}

        {status === "uploading" && onCancel && (
          <Button variant="ghost" size="icon-sm" onClick={() => onCancel(id)} aria-label="取消">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
});

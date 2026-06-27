import { useState } from "react";
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
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
  onRetry?: () => void;
  onRemove?: () => void;
  className?: string;
}

export function ProgressCard({
  id: _id,
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
        "group relative flex items-start gap-4 rounded-lg border p-4 transition-all duration-200",
        status === "success" && "border-success/20 bg-success/5",
        status === "failed" && "border-destructive/20 bg-destructive/5",
        status === "uploading" && "border-primary/20 bg-primary/5",
        className,
      )}
    >
      {/* 缩略图 */}
      <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded bg-muted">
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
          <div className="absolute inset-0 bg-black/20">
            <div
              className="absolute bottom-0 left-0 right-0 bg-primary transition-all duration-200"
              style={{ height: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* 信息区域 */}
      <div className="flex-1 min-w-0 space-y-1">
        {/* 文件名 */}
        <p className="text-sm font-medium truncate" title={fileName}>
          {fileName}
        </p>

        {/* 文件大小 */}
        <p className="text-xs text-muted-foreground">
          {formatFileSize(fileSize)}
        </p>

        {/* 进度条 */}
        {(status === "uploading" || status === "paused") && (
          <div className="space-y-1">
            <Progress
              value={progress}
              className={cn("h-2", getProgressColor())}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{progress}%</span>
              <span>{formatFileSize(fileSize * progress / 100)} / {formatFileSize(fileSize)}</span>
            </div>
          </div>
        )}

        {/* 状态 */}
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          {getStatusBadge()}
        </div>

        {/* 错误信息 */}
        {error && (
          <p className="text-xs text-destructive line-clamp-2">{error}</p>
        )}

        {/* URL */}
        {url && status === "success" && (
          <div className="flex items-center gap-1">
            <p className="text-xs text-muted-foreground truncate flex-1">
              {url}
            </p>
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* 上传中 */}
        {status === "uploading" && onPause && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onPause}>
            <Pause className="h-4 w-4" />
          </Button>
        )}

        {/* 已暂停 */}
        {status === "paused" && onResume && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onResume}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}

        {/* 失败 */}
        {status === "failed" && onRetry && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRetry}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}

        {/* 成功 - 复制链接 */}
        {status === "success" && url && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={copyUrl}>
            <Copy className="h-4 w-4" />
          </Button>
        )}

        {/* 成功 - 打开链接 */}
        {status === "success" && url && (
          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
            <a href={url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        )}

        {/* 取消/删除 */}
        {(status === "pending" || status === "paused" || status === "failed" || status === "cancelled") && onRemove && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRemove}>
            <X className="h-4 w-4" />
          </Button>
        )}

        {status === "uploading" && onCancel && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

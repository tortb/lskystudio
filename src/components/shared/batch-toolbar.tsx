import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface BatchToolbarProps {
  totalCount: number;
  pendingCount: number;
  uploadingCount: number;
  successCount: number;
  failedCount: number;
  isUploading: boolean;
  onStartAll?: () => void;
  onPauseAll?: () => void;
  onResumeAll?: () => void;
  onCancelAll?: () => void;
  onRetryFailed?: () => void;
  onClearAll?: () => void;
  onClearSuccess?: () => void;
  className?: string;
}

export function BatchToolbar({
  totalCount,
  pendingCount,
  uploadingCount,
  successCount,
  failedCount,
  isUploading,
  onStartAll,
  onPauseAll,
  onResumeAll,
  onCancelAll,
  onRetryFailed,
  onClearAll,
  onClearSuccess,
  className,
}: BatchToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3",
        className,
      )}
    >
      {/* 统计信息 */}
      <div className="flex items-center gap-2">
        <Badge variant="outline">
          <Clock className="mr-1 h-3 w-3" />
          {pendingCount} 等待
        </Badge>
        {uploadingCount > 0 && (
          <Badge>
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            {uploadingCount} 上传中
          </Badge>
        )}
        {successCount > 0 && (
          <Badge variant="success">
            <CheckCircle className="mr-1 h-3 w-3" />
            {successCount} 成功
          </Badge>
        )}
        {failedCount > 0 && (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            {failedCount} 失败
          </Badge>
        )}
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* 操作按钮 */}
      <div className="flex items-center gap-1">
        {/* 开始全部 */}
        {!isUploading && pendingCount > 0 && onStartAll && (
          <Button size="sm" onClick={onStartAll}>
            <Play className="mr-1 h-3 w-3" />
            开始全部
          </Button>
        )}

        {/* 暂停全部 */}
        {isUploading && onPauseAll && (
          <Button size="sm" variant="outline" onClick={onPauseAll}>
            <Pause className="mr-1 h-3 w-3" />
            暂停全部
          </Button>
        )}

        {/* 继续全部 */}
        {!isUploading && (pendingCount > 0 || uploadingCount > 0) && onResumeAll && (
          <Button size="sm" variant="outline" onClick={onResumeAll}>
            <Play className="mr-1 h-3 w-3" />
            继续全部
          </Button>
        )}

        {/* 取消全部 */}
        {(pendingCount > 0 || uploadingCount > 0) && onCancelAll && (
          <Button size="sm" variant="destructive" onClick={onCancelAll}>
            <Square className="mr-1 h-3 w-3" />
            取消全部
          </Button>
        )}

        {/* 重试失败 */}
        {failedCount > 0 && onRetryFailed && (
          <Button size="sm" variant="outline" onClick={onRetryFailed}>
            <RotateCcw className="mr-1 h-3 w-3" />
            重试失败
          </Button>
        )}

        <Separator orientation="vertical" className="h-6" />

        {/* 清除成功 */}
        {successCount > 0 && onClearSuccess && (
          <Button size="sm" variant="ghost" onClick={onClearSuccess}>
            清除成功
          </Button>
        )}

        {/* 清除全部 */}
        {totalCount > 0 && onClearAll && (
          <Button size="sm" variant="ghost" onClick={onClearAll}>
            <Trash2 className="mr-1 h-3 w-3" />
            清除全部
          </Button>
        )}
      </div>
    </div>
  );
}

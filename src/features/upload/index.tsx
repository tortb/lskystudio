import { useState, useCallback, useEffect } from "react";
import { Play, Settings, X, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/layout/page-header";
import { useToastActions } from "@/components/ui/toaster";
import { FileDropzone } from "@/components/shared/file-dropzone";
import { ProgressCard } from "@/components/shared/progress-card";
import { BatchToolbar } from "@/components/shared/batch-toolbar";
import { UploadStats } from "@/components/shared/upload-stats";
import { useUpload } from "@/hooks/use-upload";
import { useConfig } from "@/hooks/use-config";
import { formatFileSize } from "@/lib/utils";
import { UPLOAD_DEFAULTS } from "@/lib/constants";
import { convertFileSrc } from "@tauri-apps/api/core";
import { isTauriEnv } from "@/lib/env";
import type { UploadFile } from "@/lib/api";

/** 待上传文件缩略图：Web 模式用 File 对象，桌面模式用 asset 协议读取本地路径 */
function FileThumb({ file }: { file: UploadFile }) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    if (file.file) {
      const url = URL.createObjectURL(file.file);
      setSrc(url);
      return () => URL.revokeObjectURL(url);
    }
    if (isTauriEnv) {
      setSrc(convertFileSrc(file.path));
    }
  }, [file]);

  if (!src) return null;

  return (
    <img
      src={src}
      alt={file.name}
      className="h-full w-full object-cover"
      loading="lazy"
    />
  );
}

export default function UploadPage() {
  const { config } = useConfig();
  const toast = useToastActions();
  const {
    tasks,
    isUploading,
    hasCheckpoint,
    start,
    resumeFromCheckpoint,
    pause,
    resume,
    cancel,
    retryFailed,
    clearTasks,
    clearCheckpoint,
    pendingCount,
    uploadingCount,
    successCount,
    failedCount,
  } = useUpload();

  const [selectedFiles, setSelectedFiles] = useState<UploadFile[]>([]);
  const [apiUrl, setApiUrl] = useState("");
  const [token, setToken] = useState("");
  const [storageId, setStorageId] = useState("1");
  const [concurrency, setConcurrency] = useState<number>(UPLOAD_DEFAULTS.concurrency);
  const [showSettings, setShowSettings] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);

  // 从配置加载
  useEffect(() => {
    if (config) {
      setApiUrl(config.apiUrl);
      setToken(config.apiToken);
      setStorageId(config.strategyId);
      if (config.concurrency) setConcurrency(config.concurrency);
    }
  }, [config]);

  const handleFilesSelected = useCallback((files: UploadFile[]) => {
    setSelectedFiles((prev) => [...prev, ...files]);
  }, []);

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearFiles = () => {
    setSelectedFiles([]);
    clearTasks();
    setStartTime(null);
  };

  const handleStartUpload = async () => {
    if (!apiUrl || !token) {
      toast.warning("提示", "请先配置 API 地址和 Token");
      setShowSettings(true);
      return;
    }

    if (selectedFiles.length === 0 && tasks.length === 0) {
      toast.warning("提示", "请先选择文件");
      return;
    }

    // 如果有选中的文件，开始上传
    if (selectedFiles.length > 0) {
      const uploadFiles = selectedFiles;

      try {
        setStartTime(new Date());
        await start(uploadFiles, apiUrl, token, storageId, concurrency);
        toast.info("上传开始", `正在上传 ${selectedFiles.length} 个文件`);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        toast.error("上传失败", `错误详情: ${errorMessage}`);
      }
    } else {
      // 继续已有的任务
      resume();
    }
  };

  // 从断点续传恢复
  const handleResumeCheckpoint = async () => {
    if (!apiUrl || !token) {
      toast.warning("提示", "请先配置 API 地址和 Token");
      setShowSettings(true);
      return;
    }

    if (selectedFiles.length === 0) {
      toast.warning("提示", "请先选择与上次相同的文件");
      return;
    }

    const uploadFiles = selectedFiles;

    try {
      setStartTime(new Date());
      await resumeFromCheckpoint(uploadFiles, apiUrl, token, storageId, concurrency);
      toast.info("续传开始", "正在从上次中断处继续上传");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast.error("续传失败", `错误详情: ${errorMessage}`);
    }
  };

  const handlePause = () => {
    pause();
    toast.info("上传暂停", "所有上传任务已暂停");
  };

  const handleResume = () => {
    resume();
    toast.info("上传继续", "所有上传任务已继续");
  };

  const handleCancel = () => {
    cancel();
    toast.warning("上传取消", "所有上传任务已取消");
  };

  const handleRetryFailed = () => {
    const failedTasks = tasks.filter((t) => t.status === "failed");
    if (failedTasks.length > 0) {
      retryFailed();
      toast.info("重试开始", `正在重试 ${failedTasks.length} 个失败任务`);
    }
  };

  const handleClearSuccess = () => {
    toast.info("已清除", "成功任务已清除");
  };

  // 稳定的按任务操作回调，保证 ProgressCard 的 memo 只在对应任务变化时重渲染
  const pauseTask = useCallback((id: string) => pause([id]), [pause]);
  const resumeTask = useCallback((id: string) => resume([id]), [resume]);
  const cancelTask = useCallback((id: string) => cancel([id]), [cancel]);

  // 计算统计数据
  const totalSize = selectedFiles.reduce((sum, file) => sum + file.size, 0);
  const uploadedSize = tasks
    .filter((t) => t.status === "success")
    .reduce((sum, t) => sum + t.fileSize, 0);

  const headerDescription =
    selectedFiles.length > 0
      ? `上传图片到兰空图床 · 已选 ${selectedFiles.length} 个文件 · ${formatFileSize(totalSize)}`
      : "上传图片到兰空图床";

  return (
    <div className="space-y-5">
      <PageHeader
        title="上传"
        description={headerDescription}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="h-4 w-4" strokeWidth={1.75} />
              设置
            </Button>
            <Button variant="outline" onClick={clearFiles}>
              清空
            </Button>
            {!isUploading ? (
              <Button
                onClick={handleStartUpload}
                disabled={selectedFiles.length === 0 && tasks.length === 0}
              >
                <Play className="h-4 w-4" strokeWidth={1.75} />
                {tasks.length > 0 ? "继续上传" : "开始上传"}
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={handlePause}>
                  暂停
                </Button>
                <Button variant="destructive" onClick={handleCancel}>
                  取消
                </Button>
              </>
            )}
          </>
        }
      />

      {/* 断点续传提示 */}
      {hasCheckpoint && selectedFiles.length > 0 && !isUploading && (
        <Card className="border-primary/40 bg-primary/[0.035]">
          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <div className="min-w-0">
              <p className="text-[14px] font-medium">检测到上次未完成的上传</p>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                请选择与上次相同的文件，系统会自动跳过已上传的部分
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button variant="outline" size="sm" onClick={clearCheckpoint}>
                忽略
              </Button>
              <Button size="sm" onClick={handleResumeCheckpoint}>
                <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} />
                断点续传
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* 统计信息 */}
      {(selectedFiles.length > 0 || tasks.length > 0) && (
        <UploadStats
          totalFiles={selectedFiles.length || tasks.length}
          successCount={successCount}
          failedCount={failedCount}
          pendingCount={pendingCount}
          uploadingCount={uploadingCount}
          totalSize={totalSize}
          uploadedSize={uploadedSize}
          startTime={startTime}
        />
      )}

      {/* API 配置 */}
      {showSettings && (
        <Card className="overflow-hidden">
          <div className="border-b border-border/70 px-5 py-3.5">
            <h3 className="text-section">API 配置</h3>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              配置兰空图床 API 连接信息
            </p>
          </div>
          <div className="p-5">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="apiUrl">API 地址</Label>
                <Input
                  id="apiUrl"
                  placeholder="https://your-domain.com"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="token">API Token</Label>
                <Input
                  id="token"
                  type="password"
                  placeholder="请输入 API Token"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="storageId">存储策略 ID</Label>
                <Input
                  id="storageId"
                  placeholder="1"
                  value={storageId}
                  onChange={(e) => setStorageId(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="concurrency">并发数</Label>
                <Input
                  id="concurrency"
                  type="number"
                  min={1}
                  max={UPLOAD_DEFAULTS.maxConcurrency}
                  value={concurrency}
                  onChange={(e) =>
                    setConcurrency(
                      Math.min(
                        Math.max(1, parseInt(e.target.value) || 1),
                        UPLOAD_DEFAULTS.maxConcurrency,
                      ),
                    )
                  }
                />
                <p className="text-[12px] text-muted-foreground">
                  同时上传的文件数 (1-{UPLOAD_DEFAULTS.maxConcurrency})
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* 拖拽上传区域 */}
      {(tasks.length === 0 || hasCheckpoint) && (
        <FileDropzone onFilesSelected={handleFilesSelected} />
      )}

      {/* 批量操作工具栏 */}
      {tasks.length > 0 && (
        <BatchToolbar
          totalCount={tasks.length}
          pendingCount={pendingCount}
          uploadingCount={uploadingCount}
          successCount={successCount}
          failedCount={failedCount}
          isUploading={isUploading}
          onStartAll={handleStartUpload}
          onPauseAll={handlePause}
          onResumeAll={handleResume}
          onCancelAll={handleCancel}
          onRetryFailed={handleRetryFailed}
          onClearAll={clearFiles}
          onClearSuccess={handleClearSuccess}
        />
      )}

      {/* 待上传文件列表 */}
      {selectedFiles.length > 0 && tasks.length === 0 && (
        <Card className="overflow-hidden">
          <div className="border-b border-border/70 px-5 py-3.5">
            <h3 className="text-section">待上传文件（{selectedFiles.length}）</h3>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              总大小 {formatFileSize(totalSize)}
              {selectedFiles.length > 100 && " · 仅显示前 100 个文件"}
            </p>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {selectedFiles.slice(0, 100).map((file, index) => (
              <div
                key={index}
                className="group flex items-center gap-3 border-b border-border/60 px-5 py-3 transition-colors last:border-b-0 hover:bg-secondary/50"
              >
                <div className="h-9 w-9 shrink-0 overflow-hidden rounded-sm bg-secondary">
                  <FileThumb file={file} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium leading-tight">
                    {file.name}
                  </p>
                  <p className="mt-0.5 text-[12px] tabular-nums text-muted-foreground">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeFile(index)}
                  aria-label="移除"
                >
                  <X className="h-4 w-4" strokeWidth={1.75} />
                </Button>
              </div>
            ))}
            {selectedFiles.length > 100 && (
              <div className="px-5 py-3 text-center text-[12px] text-muted-foreground">
                … 还有 {selectedFiles.length - 100} 个文件
              </div>
            )}
          </div>
        </Card>
      )}

      {/* 上传任务列表 */}
      {tasks.length > 0 && (
        <Card className="overflow-hidden">
          <div className="border-b border-border/70 px-5 py-3.5">
            <h3 className="text-section">上传任务</h3>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {successCount} 成功 / {failedCount} 失败 / {pendingCount} 等待
              {tasks.length > 200 && ` · 共 ${tasks.length} 个任务（显示前 200 个）`}
            </p>
          </div>
          <div className="max-h-[600px] overflow-y-auto px-4">
            {tasks.slice(0, 200).map((task) => (
              <ProgressCard
                key={task.id}
                id={task.id}
                fileName={task.fileName}
                fileSize={task.fileSize}
                status={task.status}
                progress={task.progress}
                url={task.url}
                error={task.error}
                onPause={pauseTask}
                onResume={resumeTask}
                onCancel={cancelTask}
                onRetry={resumeTask}
              />
            ))}
            {tasks.length > 200 && (
              <div className="px-1 py-3 text-center text-[12px] text-muted-foreground">
                … 还有 {tasks.length - 200} 个任务
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

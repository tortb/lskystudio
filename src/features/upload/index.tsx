import { useState, useCallback, useEffect } from "react";
import { Play, Settings, X, RotateCcw } from "lucide-react";
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
import { useToastActions } from "@/components/ui/toaster";
import { FileDropzone } from "@/components/shared/file-dropzone";
import { ProgressCard } from "@/components/shared/progress-card";
import { BatchToolbar } from "@/components/shared/batch-toolbar";
import { UploadStats } from "@/components/shared/upload-stats";
import { useUpload } from "@/hooks/use-upload";
import { useConfig } from "@/hooks/use-config";
import { formatFileSize } from "@/lib/utils";
import { UPLOAD_DEFAULTS } from "@/lib/constants";

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

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
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

  const handleFilesSelected = useCallback((files: File[]) => {
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
      const uploadFiles = selectedFiles.map((file) => ({
        path: (file as any).path || file.name,
        name: file.name,
        size: file.size,
        file, // 附加 File 对象，Web 模式上传引擎需要
      }));

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

    const uploadFiles = selectedFiles.map((file) => ({
      path: (file as any).path || file.name,
      name: file.name,
      size: file.size,
      file,
    }));

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

  // 计算统计数据
  const totalSize = selectedFiles.reduce((sum, file) => sum + file.size, 0);
  const uploadedSize = tasks
    .filter((t) => t.status === "success")
    .reduce((sum, t) => sum + t.fileSize, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">上传</h2>
          <p className="text-muted-foreground">
            上传图片到兰空图床
            {selectedFiles.length > 0 && ` · 已选 ${selectedFiles.length} 个文件 · ${formatFileSize(totalSize)}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="mr-2 h-4 w-4" />
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
              <Play className="mr-2 h-4 w-4" />
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
        </div>
      </div>

      {/* 断点续传提示 */}
      {hasCheckpoint && selectedFiles.length > 0 && !isUploading && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium">检测到上次未完成的上传</p>
              <p className="text-xs text-muted-foreground">
                请选择与上次相同的文件，系统会自动跳过已上传的部分
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={clearCheckpoint}>
                忽略
              </Button>
              <Button size="sm" onClick={handleResumeCheckpoint}>
                <RotateCcw className="mr-1 h-3 w-3" />
                断点续传
              </Button>
            </div>
          </CardContent>
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
        <Card>
          <CardHeader>
            <CardTitle>API 配置</CardTitle>
            <CardDescription>配置兰空图床 API 连接信息</CardDescription>
          </CardHeader>
          <CardContent>
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
                <p className="text-xs text-muted-foreground">
                  同时上传的文件数 (1-{UPLOAD_DEFAULTS.maxConcurrency})
                </p>
              </div>
            </div>
          </CardContent>
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
        <Card>
          <CardHeader>
            <CardTitle>待上传文件 ({selectedFiles.length})</CardTitle>
            <CardDescription>
              总大小: {formatFileSize(totalSize)}
              {selectedFiles.length > 100 && " · 仅显示前 100 个文件"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {selectedFiles.slice(0, 100).map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <div className="h-10 w-10 overflow-hidden rounded bg-muted flex-shrink-0">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFile(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {selectedFiles.length > 100 && (
                <div className="text-center py-3 text-sm text-muted-foreground">
                  ... 还有 {selectedFiles.length - 100} 个文件
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 上传任务列表 */}
      {tasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>上传任务</CardTitle>
            <CardDescription>
              {successCount} 成功 / {failedCount} 失败 / {pendingCount} 等待
              {tasks.length > 200 && ` · 共 ${tasks.length} 个任务（显示前 200 个）`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
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
                  onPause={() => pause([task.id])}
                  onResume={() => resume([task.id])}
                  onCancel={() => cancel([task.id])}
                  onRetry={() => resume([task.id])}
                />
              ))}
              {tasks.length > 200 && (
                <div className="text-center py-3 text-sm text-muted-foreground">
                  ... 还有 {tasks.length - 200} 个任务
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

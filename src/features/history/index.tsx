import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search,
  Download,
  Trash2,
  Copy,
  ExternalLink,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  Image,
  Loader2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { useToastActions } from "@/components/ui/toaster";
import { useConfig } from "@/hooks/use-config";
import { formatFileSize, formatDate } from "@/lib/utils";

interface HistoryRecord {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  status: "success" | "failed";
  url?: string;
  thumbnailUrl?: string;
  createdAt: string;
  folderName?: string;
}

interface HistoryStatProps {
  label: string;
  value: string | number;
  hint: string;
  icon: LucideIcon;
  tone?: string;
}

function HistoryStat({ label, value, hint, icon: Icon, tone }: HistoryStatProps) {
  return (
    <div className="rounded-lg border border-border/70 bg-card px-4 py-3.5">
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
      </div>
      <div
        className={`mt-1.5 text-[17px] font-semibold leading-none tabular-nums tracking-[-0.01em] ${tone ?? ""}`}
      >
        {value}
      </div>
      <p className="mt-1.5 text-[12px] text-muted-foreground">{hint}</p>
    </div>
  );
}

export default function HistoryPage() {
  const toast = useToastActions();
  const { config } = useConfig();
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<HistoryRecord[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "failed">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [isLoading, setIsLoading] = useState(false);
  const fetchingRef = useRef(false);

  // 提取原始值，避免对象引用变化导致无限循环
  const apiUrl = config?.apiUrl || "";
  const apiToken = config?.apiToken || "";

  // 获取历史记录
  const fetchHistory = useCallback(async () => {
    if (!apiUrl || !apiToken) {
      setRecords([]);
      setIsLoading(false);
      return;
    }

    // 防止并发请求
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    setIsLoading(true);
    try {
      const baseUrl = apiUrl.replace(/\/+$/, "");
      const response = await fetch(`${baseUrl}/api/v2/user/photos?page=1&per_page=1000`, {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          Accept: "application/json",
        },
      });

      // 先检查 Content-Type，防止 HTML 响应导致 JSON 解析崩溃
      const contentType = response.headers.get("content-type") || "";
      const text = await response.text();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${text.substring(0, 200)}`);
      }

      if (!contentType.includes("application/json")) {
        throw new Error(`API 返回了非 JSON 响应 (${contentType})，请检查 API 地址是否正确`);
      }

      const result = JSON.parse(text);

      // 兼容 status 为 "success" 或 true
      const isSuccess = result.status === "success" || result.status === true;
      const photoList = result.data?.data || result.data?.images || [];

      if (isSuccess) {
        setRecords(
          photoList.map((photo: any) => ({
            id: String(photo.id),
            fileName: photo.name || photo.filename || "未知文件",
            fileSize: photo.size || 0,
            fileType: photo.mimetype || photo.mime_type || "image/jpeg",
            status: photo.public_url || photo.url ? "success" : "failed",
            url: photo.public_url || photo.url,
            thumbnailUrl: photo.thumbnail_url,
            createdAt: photo.created_at || new Date().toISOString(),
            folderName: photo.albums?.[0]?.name || "",
          }))
        );
      } else {
        throw new Error(result.message || "获取历史记录失败");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error("获取历史记录失败", errorMessage);
      setRecords([]);
    } finally {
      setIsLoading(false);
      fetchingRef.current = false;
    }
  }, [apiUrl, apiToken, toast]);

  // 初始加载
  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // 过滤记录
  useEffect(() => {
    let filtered = [...records];

    // 搜索过滤
    if (search) {
      filtered = filtered.filter(
        (record) =>
          record.fileName.toLowerCase().includes(search.toLowerCase()) ||
          record.folderName?.toLowerCase().includes(search.toLowerCase()),
      );
    }

    // 状态过滤
    if (statusFilter !== "all") {
      filtered = filtered.filter((record) => record.status === statusFilter);
    }

    setFilteredRecords(filtered);
    setCurrentPage(1);
  }, [records, search, statusFilter]);

  // 分页
  const totalPages = Math.ceil(filteredRecords.length / pageSize);
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("复制成功", "链接已复制到剪贴板");
    } catch {
      toast.error("复制失败", "无法复制链接");
    }
  };

  const handleDelete = async (id: string) => {
    if (!apiUrl || !apiToken) {
      toast.error("错误", "请先配置 API 地址和 Token");
      return;
    }

    try {
      const baseUrl = apiUrl.replace(/\/+$/, "");
      // v2 API: DELETE /api/v2/user/photos，body 为图片 ID 数组
      const response = await fetch(`${baseUrl}/api/v2/user/photos`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify([parseInt(id)]),
      });

      if (!response.ok && response.status !== 204) {
        const errorText = await response.text();
        throw new Error(`删除失败: HTTP ${response.status} - ${errorText}`);
      }

      // DELETE 返回 204 无内容
      toast.success("删除成功", "记录已删除");
      fetchHistory(); // 刷新列表
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error("删除失败", errorMessage);
    }
  };

  const handleClearAll = async () => {
    if (!apiUrl || !apiToken) {
      toast.error("错误", "请先配置 API 地址和 Token");
      return;
    }

    if (!confirm("确定要清空所有历史记录吗？此操作不可撤销。")) {
      return;
    }

    try {
      // v2 API: 批量删除，body 为图片 ID 数组
      const baseUrl = apiUrl.replace(/\/+$/, "");
      const ids = records.map((r) => parseInt(r.id));
      await fetch(`${baseUrl}/api/v2/user/photos`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(ids),
      });

      toast.success("清空成功", "所有记录已清空");
      fetchHistory(); // 刷新列表
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error("清空失败", errorMessage);
    }
  };

  const handleExport = () => {
    // 导出为 CSV
    const headers = ["文件名", "大小", "状态", "链接", "时间"];
    const rows = filteredRecords.map((record) => [
      record.fileName,
      formatFileSize(record.fileSize),
      record.status === "success" ? "成功" : "失败",
      record.url || "",
      formatDate(record.createdAt),
    ]);

    const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `upload_history_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success("导出成功", "CSV 文件已下载");
  };

  const handleRefresh = () => {
    fetchHistory();
  };

  const successCount = records.filter((r) => r.status === "success").length;
  const failedCount = records.filter((r) => r.status === "failed").length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="历史记录"
        description="查看上传历史记录"
        actions={
          <>
            <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                strokeWidth={1.75}
              />
              刷新
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4" strokeWidth={1.75} />
              导出
            </Button>
            <Button variant="destructive" onClick={handleClearAll}>
              <Trash2 className="h-4 w-4" strokeWidth={1.75} />
              清空
            </Button>
          </>
        }
      />

      {/* 未配置提示 */}
      {!config?.apiUrl || !config?.apiToken ? (
        <Card>
          <EmptyState
            icon={Clock}
            title="请先配置 API"
            description="在设置页面配置 API 地址和 Token 后即可查看历史记录"
            action={{
              label: "前往设置",
              onClick: () => {
                window.location.href = "/settings";
              },
            }}
          />
        </Card>
      ) : (
        <>
          {/* 统计 */}
          <div className="grid gap-3 md:grid-cols-3">
            <HistoryStat
              label="总记录数"
              value={records.length}
              hint={`共 ${formatFileSize(records.reduce((sum, r) => sum + r.fileSize, 0))}`}
              icon={Image}
            />
            <HistoryStat
              label="成功数"
              value={successCount}
              hint={
                records.length > 0
                  ? `${Math.round((successCount / records.length) * 100)}% 成功率`
                  : "暂无数据"
              }
              icon={CheckCircle}
              tone="text-success"
            />
            <HistoryStat
              label="失败数"
              value={failedCount}
              hint={failedCount > 0 ? "需要处理" : "暂无失败"}
              icon={XCircle}
              tone={failedCount > 0 ? "text-destructive" : undefined}
            />
          </div>

          {/* 搜索和筛选 */}
          <Card>
            <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  strokeWidth={1.75}
                />
                <Input
                  placeholder="搜索文件名或文件夹..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant={statusFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("all")}
                >
                  全部
                </Button>
                <Button
                  variant={statusFilter === "success" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("success")}
                >
                  <CheckCircle className="h-3.5 w-3.5" strokeWidth={1.75} />
                  成功
                </Button>
                <Button
                  variant={statusFilter === "failed" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("failed")}
                >
                  <XCircle className="h-3.5 w-3.5" strokeWidth={1.75} />
                  失败
                </Button>
              </div>
            </div>
          </Card>

          {/* 历史记录列表 */}
          <Card className="overflow-hidden">
            <div className="border-b border-border/70 px-5 py-3.5">
              <h3 className="text-section">上传记录</h3>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                共 {filteredRecords.length} 条记录
                {search && ` （搜索：“${search}”）`}
                {statusFilter !== "all" &&
                  ` （筛选：${statusFilter === "success" ? "成功" : "失败"}）`}
              </p>
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2
                  className="mb-3 h-6 w-6 animate-spin text-muted-foreground"
                  strokeWidth={1.75}
                />
                <p className="text-[14px] text-muted-foreground">加载中...</p>
              </div>
            ) : filteredRecords.length === 0 ? (
              <EmptyState
                icon={Clock}
                title="暂无记录"
                description={
                  search || statusFilter !== "all"
                    ? "没有找到匹配的记录"
                    : "上传图片后将在此显示历史记录"
                }
              />
            ) : (
              <>
                <div>
                  {paginatedRecords.map((record) => (
                    <div
                      key={record.id}
                      className="group flex items-center gap-3 border-b border-border/60 px-5 py-3 transition-colors last:border-b-0 hover:bg-secondary/50"
                    >
                      {/* 缩略图 */}
                      <div className="h-9 w-9 shrink-0 overflow-hidden rounded-sm bg-secondary">
                        {record.thumbnailUrl || record.url ? (
                          <img
                            src={record.thumbnailUrl || record.url}
                            alt={record.fileName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Image className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
                          </div>
                        )}
                      </div>

                      {/* 文件名 / 文件夹 */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-medium leading-tight">
                          {record.fileName}
                        </p>
                        {record.folderName && (
                          <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                            {record.folderName}
                          </p>
                        )}
                      </div>

                      {/* 大小 */}
                      <span className="hidden w-20 shrink-0 text-right text-[12px] tabular-nums text-muted-foreground sm:block">
                        {formatFileSize(record.fileSize)}
                      </span>

                      {/* 状态 */}
                      <Badge
                        variant={record.status === "success" ? "success" : "destructive"}
                        className="shrink-0"
                      >
                        {record.status === "success" ? "成功" : "失败"}
                      </Badge>

                      {/* 时间 */}
                      <span className="hidden w-32 shrink-0 text-right text-[12px] tabular-nums text-muted-foreground md:block">
                        {formatDate(record.createdAt)}
                      </span>

                      {/* 操作 */}
                      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                        {record.url && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => copyUrl(record.url!)}
                              aria-label="复制链接"
                            >
                              <Copy className="h-4 w-4" strokeWidth={1.75} />
                            </Button>
                            <Button variant="ghost" size="icon-sm" asChild>
                              <a
                                href={record.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="打开链接"
                              >
                                <ExternalLink className="h-4 w-4" strokeWidth={1.75} />
                              </a>
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleDelete(record.id)}
                          aria-label="删除"
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 分页 */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-border/60 px-5 py-3">
                    <p className="text-[12px] tabular-nums text-muted-foreground">
                      第 {currentPage} 页，共 {totalPages} 页
                    </p>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        aria-label="上一页"
                      >
                        <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
                      </Button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const page = i + 1;
                        return (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="icon-sm"
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </Button>
                        );
                      })}
                      {totalPages > 5 && (
                        <>
                          <span className="flex h-7 w-7 items-center justify-center text-[12px] text-muted-foreground">
                            ...
                          </span>
                          <Button
                            variant={currentPage === totalPages ? "default" : "outline"}
                            size="icon-sm"
                            onClick={() => setCurrentPage(totalPages)}
                          >
                            {totalPages}
                          </Button>
                        </>
                      )}
                      <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        aria-label="下一页"
                      >
                        <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

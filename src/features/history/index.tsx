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
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">历史记录</h2>
          <p className="text-muted-foreground">查看上传历史记录</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            刷新
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            导出
          </Button>
          <Button variant="destructive" onClick={handleClearAll}>
            <Trash2 className="mr-2 h-4 w-4" />
            清空
          </Button>
        </div>
      </div>

      {/* 未配置提示 */}
      {!config?.apiUrl || !config?.apiToken ? (
        <Card>
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center">
              <Clock className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-medium">请先配置 API</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                在设置页面配置 API 地址和 Token 后即可查看历史记录
              </p>
              <Button onClick={() => (window.location.href = "/settings")}>
                前往设置
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* 统计卡片 */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">总记录数</CardTitle>
                <Image className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{records.length}</div>
                <p className="text-xs text-muted-foreground">
                  共 {formatFileSize(records.reduce((sum, r) => sum + r.fileSize, 0))}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">成功数</CardTitle>
                <CheckCircle className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">{successCount}</div>
                <p className="text-xs text-muted-foreground">
                  {records.length > 0
                    ? `${Math.round((successCount / records.length) * 100)}% 成功率`
                    : "暂无数据"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">失败数</CardTitle>
                <XCircle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{failedCount}</div>
                <p className="text-xs text-muted-foreground">
                  {failedCount > 0 ? "需要处理" : "暂无失败"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 搜索和筛选 */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索文件名或文件夹..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex gap-2">
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
                    <CheckCircle className="mr-1 h-3 w-3" />
                    成功
                  </Button>
                  <Button
                    variant={statusFilter === "failed" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter("failed")}
                  >
                    <XCircle className="mr-1 h-3 w-3" />
                    失败
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 历史记录表格 */}
          <Card>
            <CardHeader>
              <CardTitle>上传记录</CardTitle>
              <CardDescription>
                共 {filteredRecords.length} 条记录
                {search && ` (搜索: "${search}")`}
                {statusFilter !== "all" && ` (筛选: ${statusFilter === "success" ? "成功" : "失败"})`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="mb-4 h-12 w-12 text-muted-foreground animate-spin" />
                  <p className="text-sm text-muted-foreground">加载中...</p>
                </div>
              ) : filteredRecords.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Clock className="mb-4 h-12 w-12 text-muted-foreground" />
                  <h3 className="mb-2 text-lg font-medium">暂无记录</h3>
                  <p className="text-sm text-muted-foreground">
                    {search || statusFilter !== "all"
                      ? "没有找到匹配的记录"
                      : "上传图片后将在此显示历史记录"}
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="pb-3 text-left font-medium">文件名</th>
                          <th className="pb-3 text-left font-medium">大小</th>
                          <th className="pb-3 text-left font-medium">状态</th>
                          <th className="pb-3 text-left font-medium">时间</th>
                          <th className="pb-3 text-left font-medium">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedRecords.map((record) => (
                          <tr key={record.id} className="border-b">
                            <td className="py-3">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 overflow-hidden rounded bg-muted">
                                  {record.thumbnailUrl || record.url ? (
                                    <img
                                      src={record.thumbnailUrl || record.url}
                                      alt={record.fileName}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center">
                                      <Image className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <p className="text-sm font-medium">{record.fileName}</p>
                                  {record.folderName && (
                                    <p className="text-xs text-muted-foreground">
                                      {record.folderName}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-3 text-sm text-muted-foreground">
                              {formatFileSize(record.fileSize)}
                            </td>
                            <td className="py-3">
                              <Badge
                                variant={
                                  record.status === "success" ? "success" : "destructive"
                                }
                              >
                                {record.status === "success" ? "成功" : "失败"}
                              </Badge>
                            </td>
                            <td className="py-3 text-sm text-muted-foreground">
                              {formatDate(record.createdAt)}
                            </td>
                            <td className="py-3">
                              <div className="flex gap-1">
                                {record.url && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => copyUrl(record.url!)}
                                    >
                                      <Copy className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                      <a
                                        href={record.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        <ExternalLink className="h-4 w-4" />
                                      </a>
                                    </Button>
                                  </>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleDelete(record.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* 分页 */}
                  {totalPages > 1 && (
                    <div className="mt-4 flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        第 {currentPage} 页，共 {totalPages} 页
                      </p>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const page = i + 1;
                          return (
                            <Button
                              key={page}
                              variant={currentPage === page ? "default" : "outline"}
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setCurrentPage(page)}
                            >
                              {page}
                            </Button>
                          );
                        })}
                        {totalPages > 5 && (
                          <>
                            <span className="flex h-8 w-8 items-center justify-center text-sm text-muted-foreground">
                              ...
                            </span>
                            <Button
                              variant={currentPage === totalPages ? "default" : "outline"}
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setCurrentPage(totalPages)}
                            >
                              {totalPages}
                            </Button>
                          </>
                        )}
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search,
  Trash2,
  RefreshCw,
  Edit,
  Copy,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Image,
  Loader2,
  LayoutGrid,
  List,
  Info,
  Tag,
  Globe,
  Lock,
  CheckSquare,
  Square,
  MinusSquare,
  Check,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  ConfirmDialog,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { useToastActions } from "@/components/ui/toaster";
import { useConfig } from "@/hooks/use-config";
import { formatFileSize, formatDate, useDebounce, cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Photo {
  id: number;
  name: string;
  intro: string;
  filename: string;
  pathname: string;
  mimetype: string;
  extension: string;
  md5: string;
  sha1: string;
  width: number;
  height: number;
  is_public: boolean;
  ip_address: string;
  expired_at: string | null;
  created_at: string;
  thumbnail_url: string;
  public_url: string;
  group: { id: number; name: string; intro: string };
  storage: { id: number; name: string; intro: string; provider: string };
  albums: { id: number; name: string; intro: string }[];
  tags: { id: number; name: string }[];
}

interface PhotoDetail extends Photo {
  album?: { id: number; name: string; intro: string };
}

interface EditForm {
  name: string;
  intro: string;
  is_public: boolean;
  tags: string[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PhotoPage() {
  const toast = useToastActions();
  const { config, isLoading: isConfigLoading } = useConfig();
  const fetchingRef = useRef(false);

  // 提取原始值，避免对象引用变化导致无限循环
  const apiUrl = config?.apiUrl || "";
  const apiToken = config?.apiToken || "";

  // 数据状态
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // 视图模式
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  // 搜索和筛选
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput, 500);
  const [albumFilter] = useState("all");
  const [publicFilter, setPublicFilter] = useState<"all" | "public" | "private">("all");
  const [orderBy, setOrderBy] = useState<"latest" | "oldest">("latest");

  // 分页
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);

  // 选择状态
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // 编辑状态
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    name: "",
    intro: "",
    is_public: true,
    tags: [],
  });
  const [editTagInput, setEditTagInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // 批量编辑状态
  const [showBatchEditDialog, setShowBatchEditDialog] = useState(false);
  const [batchForm, setBatchForm] = useState<EditForm>({
    name: "",
    intro: "",
    is_public: true,
    tags: [],
  });
  const [batchTagInput, setBatchTagInput] = useState("");

  // 删除确认
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // 详情状态
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [detailPhoto, setDetailPhoto] = useState<PhotoDetail | null>(null);

  // ---------------------------------------------------------------------------
  // 数据获取
  // ---------------------------------------------------------------------------

  const fetchPhotos = useCallback(async () => {
    if (!apiUrl || !apiToken) {
      setPhotos([]);
      setIsLoading(false);
      return;
    }

    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setIsLoading(true);

    try {
      const baseUrl = apiUrl.replace(/\/+$/, "");
      const params = new URLSearchParams({
        page: String(currentPage),
        per_page: String(pageSize),
        order_by: orderBy,
      });
      if (search) params.set("q", search);
      if (albumFilter !== "all") params.set("album_id", albumFilter);

      const response = await fetch(`${baseUrl}/api/v2/user/photos?${params}`, {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          Accept: "application/json",
        },
      });

      const contentType = response.headers.get("content-type") || "";
      const text = await response.text();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${text.substring(0, 200)}`);
      }

      if (!contentType.includes("application/json")) {
        throw new Error(`API 返回了非 JSON 响应 (${contentType})`);
      }

      const result = JSON.parse(text);
      const isSuccess = result.status === "success" || result.status === true;

      if (isSuccess) {
        let photoList = result.data?.data || [];

        // 客户端筛选公开状态（API 不支持此筛选参数）
        if (publicFilter === "public") {
          photoList = photoList.filter((p: Photo) => p.is_public);
        } else if (publicFilter === "private") {
          photoList = photoList.filter((p: Photo) => !p.is_public);
        }

        setPhotos(photoList);
        setTotalCount(result.data?.meta?.total || 0);
        setTotalPages(result.data?.meta?.last_page || 1);
      } else {
        throw new Error(result.message || "获取图片列表失败");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error("获取图片失败", errorMessage);
      setPhotos([]);
    } finally {
      setIsLoading(false);
      fetchingRef.current = false;
    }
  }, [apiUrl, apiToken, toast, currentPage, pageSize, search, albumFilter, publicFilter, orderBy]);

  // 初始加载
  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  // 搜索/筛选变化时重置到第一页
  useEffect(() => {
    setCurrentPage(1);
  }, [search, albumFilter, publicFilter, orderBy]);

  // ---------------------------------------------------------------------------
  // 操作函数
  // ---------------------------------------------------------------------------

  // 打开编辑对话框
  const handleOpenEdit = (photo: Photo) => {
    setEditingPhoto(photo);
    setEditForm({
      name: photo.name,
      intro: photo.intro,
      is_public: photo.is_public,
      tags: photo.tags.map((t) => t.name),
    });
    setEditTagInput("");
    setShowEditDialog(true);
  };

  // 保存单图编辑
  const handleSaveEdit = async () => {
    if (!editingPhoto || !apiUrl || !apiToken) return;

    setIsSaving(true);
    try {
      const baseUrl = apiUrl.replace(/\/+$/, "");
      const response = await fetch(`${baseUrl}/api/v2/user/photos/${editingPhoto.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name: editForm.name,
          intro: editForm.intro,
          is_public: editForm.is_public,
          tags: editForm.tags,
        }),
      });

      if (!response.ok && response.status !== 204) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 200)}`);
      }

      toast.success("保存成功", "图片信息已更新");
      setShowEditDialog(false);
      setEditingPhoto(null);
      fetchPhotos();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error("保存失败", errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  // 批量编辑
  const handleBatchEdit = async () => {
    if (!apiUrl || !apiToken || selectedIds.size === 0) return;

    setIsSaving(true);
    try {
      const baseUrl = apiUrl.replace(/\/+$/, "");
      const response = await fetch(`${baseUrl}/api/v2/user/photos/update`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          name: batchForm.name,
          intro: batchForm.intro,
          is_public: batchForm.is_public,
          tags: batchForm.tags,
        }),
      });

      if (!response.ok && response.status !== 204) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 200)}`);
      }

      toast.success("批量编辑成功", `已更新 ${selectedIds.size} 张图片`);
      setShowBatchEditDialog(false);
      setSelectedIds(new Set());
      fetchPhotos();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error("批量编辑失败", errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  // 批量删除
  const handleBatchDelete = async () => {
    if (!apiUrl || !apiToken || selectedIds.size === 0) return;

    try {
      const baseUrl = apiUrl.replace(/\/+$/, "");
      const response = await fetch(`${baseUrl}/api/v2/user/photos`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(Array.from(selectedIds)),
      });

      if (!response.ok && response.status !== 204) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 200)}`);
      }

      toast.success("删除成功", `已删除 ${selectedIds.size} 张图片`);
      setShowDeleteDialog(false);
      setSelectedIds(new Set());
      fetchPhotos();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error("删除失败", errorMessage);
    }
  };

  // 查看详情
  const handleViewDetail = async (photo: Photo) => {
    if (!apiUrl || !apiToken) return;

    try {
      const baseUrl = apiUrl.replace(/\/+$/, "");
      const response = await fetch(`${baseUrl}/api/v2/user/photos/${photo.id}`, {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          Accept: "application/json",
        },
      });

      const contentType = response.headers.get("content-type") || "";
      const text = await response.text();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${text.substring(0, 200)}`);
      }

      if (!contentType.includes("application/json")) {
        throw new Error(`API 返回了非 JSON 响应`);
      }

      const result = JSON.parse(text);
      const isSuccess = result.status === "success" || result.status === true;

      if (isSuccess) {
        setDetailPhoto(result.data);
        setShowDetailDialog(true);
      } else {
        throw new Error(result.message || "获取图片详情失败");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error("获取详情失败", errorMessage);
    }
  };

  // 复制链接
  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("复制成功", "链接已复制到剪贴板");
    } catch {
      toast.error("复制失败", "无法复制链接");
    }
  };

  // 选择操作
  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === photos.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(photos.map((p) => p.id)));
    }
  };

  // 添加标签到编辑表单
  const addEditTag = () => {
    const tag = editTagInput.trim();
    if (tag && !editForm.tags.includes(tag)) {
      setEditForm((prev) => ({ ...prev, tags: [...prev.tags, tag] }));
      setEditTagInput("");
    }
  };

  const removeEditTag = (tag: string) => {
    setEditForm((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));
  };

  // 添加标签到批量表单
  const addBatchTag = () => {
    const tag = batchTagInput.trim();
    if (tag && !batchForm.tags.includes(tag)) {
      setBatchForm((prev) => ({ ...prev, tags: [...prev.tags, tag] }));
      setBatchTagInput("");
    }
  };

  const removeBatchTag = (tag: string) => {
    setBatchForm((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));
  };

  // 统计
  const publicCount = photos.filter((p) => p.is_public).length;
  const privateCount = photos.length - publicCount;

  // ---------------------------------------------------------------------------
  // 渲染
  // ---------------------------------------------------------------------------

  // 配置加载中
  if (isConfigLoading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center px-6 py-16">
          <Loader2 className="mb-3 h-6 w-6 animate-spin text-muted-foreground" strokeWidth={1.75} />
          <p className="text-[14px] text-muted-foreground">加载配置中…</p>
        </CardContent>
      </Card>
    );
  }

  // 未配置提示
  if (!config?.apiUrl || !config?.apiToken) {
    return (
      <div className="space-y-5">
        <PageHeader title="图片" description="管理兰空图库中的图片" />
        <Card>
          <EmptyState
            icon={Image}
            title="请先配置 API"
            description="在设置页面配置 API 地址和 Token 后即可管理图片"
            action={{
              label: "前往设置",
              onClick: () => {
                window.location.href = "/settings";
              },
            }}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="图片"
        description="管理兰空图库中的图片"
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5 rounded-md border border-border bg-card p-0.5">
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon-sm"
                onClick={() => setViewMode("list")}
                aria-label="列表视图"
              >
                <List className="h-4 w-4" strokeWidth={1.75} />
              </Button>
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon-sm"
                onClick={() => setViewMode("grid")}
                aria-label="网格视图"
              >
                <LayoutGrid className="h-4 w-4" strokeWidth={1.75} />
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={fetchPhotos} disabled={isLoading}>
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} strokeWidth={1.75} />
              刷新
            </Button>
            {selectedIds.size > 0 && (
              <>
                <Button variant="outline" size="sm" onClick={() => setShowBatchEditDialog(true)}>
                  <Edit className="h-4 w-4" strokeWidth={1.75} />
                  批量编辑 ({selectedIds.size})
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
                  <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                  批量删除 ({selectedIds.size})
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* 统计 */}
      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-muted-foreground">总图片数</span>
              <Image className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
            </div>
            <div className="mt-2 text-[17px] font-semibold leading-none tabular-nums tracking-[-0.01em]">
              {totalCount}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-muted-foreground">公开图片</span>
              <Globe className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
            </div>
            <div className="mt-2 text-[17px] font-semibold leading-none tabular-nums tracking-[-0.01em] text-success">
              {publicCount}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-muted-foreground">私密图片</span>
              <Lock className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
            </div>
            <div className="mt-2 text-[17px] font-semibold leading-none tabular-nums tracking-[-0.01em] text-muted-foreground">
              {privateCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 搜索和筛选 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.75} />
              <Input
                placeholder="搜索文件名..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-0.5 rounded-md border border-border bg-card p-0.5">
                <Button
                  variant={publicFilter === "all" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setPublicFilter("all")}
                >
                  全部
                </Button>
                <Button
                  variant={publicFilter === "public" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setPublicFilter("public")}
                >
                  公开
                </Button>
                <Button
                  variant={publicFilter === "private" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setPublicFilter("private")}
                >
                  私密
                </Button>
              </div>
              <Select
                options={[
                  { value: "latest", label: "最新" },
                  { value: "oldest", label: "最早" },
                ]}
                value={orderBy}
                onChange={(e) => setOrderBy(e.target.value as "latest" | "oldest")}
                className="w-28"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 内容区 */}
      {isLoading ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center px-6 py-16">
            <Loader2 className="mb-3 h-6 w-6 animate-spin text-muted-foreground" strokeWidth={1.75} />
            <p className="text-[14px] text-muted-foreground">加载中…</p>
          </CardContent>
        </Card>
      ) : photos.length === 0 ? (
        <Card>
          <EmptyState
            icon={Image}
            title="暂无图片"
            description={search ? "没有找到匹配的图片" : "上传图片后将在此显示"}
          />
        </Card>
      ) : viewMode === "list" ? (
        /* ========== 列表视图 ========== */
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border/70 px-5 py-3.5">
            <div>
              <h3 className="text-section">图片列表</h3>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                共 {totalCount} 张图片
                {search && ` (搜索: "${search}")`}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={toggleSelectAll}>
              {selectedIds.size === photos.length ? (
                <CheckSquare className="h-4 w-4" strokeWidth={1.75} />
              ) : selectedIds.size > 0 ? (
                <MinusSquare className="h-4 w-4" strokeWidth={1.75} />
              ) : (
                <Square className="h-4 w-4" strokeWidth={1.75} />
              )}
              {selectedIds.size === photos.length ? "取消全选" : "全选"}
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="w-10 px-5 py-3 text-left"></th>
                  <th className="px-3 py-3 text-left text-[12px] font-medium text-muted-foreground">缩略图</th>
                  <th className="px-3 py-3 text-left text-[12px] font-medium text-muted-foreground">文件名</th>
                  <th className="px-3 py-3 text-left text-[12px] font-medium text-muted-foreground">大小</th>
                  <th className="px-3 py-3 text-left text-[12px] font-medium text-muted-foreground">尺寸</th>
                  <th className="px-3 py-3 text-left text-[12px] font-medium text-muted-foreground">相册</th>
                  <th className="px-3 py-3 text-left text-[12px] font-medium text-muted-foreground">标签</th>
                  <th className="px-3 py-3 text-left text-[12px] font-medium text-muted-foreground">状态</th>
                  <th className="px-3 py-3 text-left text-[12px] font-medium text-muted-foreground">时间</th>
                  <th className="px-3 py-3 text-left text-[12px] font-medium text-muted-foreground">操作</th>
                </tr>
              </thead>
              <tbody>
                {photos.map((photo) => (
                  <tr
                    key={photo.id}
                    className="border-b border-border/60 last:border-b-0 hover:bg-secondary/50"
                  >
                    <td className="px-5 py-3">
                      <button
                        onClick={() => toggleSelect(photo.id)}
                        className="text-muted-foreground transition-colors hover:text-foreground"
                        aria-label={selectedIds.has(photo.id) ? "取消选择" : "选择"}
                      >
                        {selectedIds.has(photo.id) ? (
                          <CheckSquare className="h-4 w-4" strokeWidth={1.75} />
                        ) : (
                          <Square className="h-4 w-4" strokeWidth={1.75} />
                        )}
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <div
                        className="h-10 w-10 cursor-pointer overflow-hidden rounded-sm bg-secondary"
                        onClick={() => handleViewDetail(photo)}
                      >
                        {photo.thumbnail_url ? (
                          <img
                            src={photo.thumbnail_url}
                            alt={photo.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Image className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <p className="text-[14px] font-medium">{photo.name || photo.filename}</p>
                      <p className="mt-0.5 text-[12px] text-muted-foreground">{photo.filename}</p>
                    </td>
                    <td className="px-3 py-3 text-[14px] tabular-nums text-muted-foreground">
                      {formatFileSize(photo.md5 ? 0 : 0)}
                    </td>
                    <td className="px-3 py-3 text-[14px] tabular-nums text-muted-foreground">
                      {photo.width} × {photo.height}
                    </td>
                    <td className="px-3 py-3">
                      {photo.albums && photo.albums.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {photo.albums.map((album) => (
                            <Badge key={album.id} variant="secondary">
                              {album.name}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[12px] text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {photo.tags && photo.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {photo.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag.id} variant="outline">
                              {tag.name}
                            </Badge>
                          ))}
                          {photo.tags.length > 3 && (
                            <Badge variant="outline">+{photo.tags.length - 3}</Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-[12px] text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant={photo.is_public ? "success" : "outline"}>
                        {photo.is_public ? "公开" : "私密"}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-[14px] tabular-nums text-muted-foreground">
                      {formatDate(photo.created_at)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleOpenEdit(photo)}
                          aria-label="编辑"
                        >
                          <Edit className="h-4 w-4" strokeWidth={1.75} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => copyUrl(photo.public_url)}
                          aria-label="复制链接"
                        >
                          <Copy className="h-4 w-4" strokeWidth={1.75} />
                        </Button>
                        <a
                          href={photo.public_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
                          aria-label="打开原图"
                        >
                          <ExternalLink className="h-4 w-4" strokeWidth={1.75} />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                    <span className="flex h-7 w-7 items-center justify-center text-[14px] tabular-nums text-muted-foreground">
                      …
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
        </Card>
      ) : (
        /* ========== 网格视图 ========== */
        <>
          <div className="flex items-center justify-between">
            <p className="text-[14px] tabular-nums text-muted-foreground">
              共 {totalCount} 张图片，已选 {selectedIds.size} 张
            </p>
            <Button variant="ghost" size="sm" onClick={toggleSelectAll}>
              {selectedIds.size === photos.length ? "取消全选" : "全选"}
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {photos.map((photo) => {
              const isSelected = selectedIds.has(photo.id);
              return (
                <div
                  key={photo.id}
                  onClick={() => toggleSelect(photo.id)}
                  className={cn(
                    "group relative cursor-pointer overflow-hidden rounded-lg border border-border/70 bg-card transition-colors",
                    isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                  )}
                >
                  <div className="relative aspect-square overflow-hidden bg-secondary">
                    {photo.thumbnail_url ? (
                      <img
                        src={photo.thumbnail_url}
                        alt={photo.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Image className="h-10 w-10 text-muted-foreground" strokeWidth={1.5} />
                      </div>
                    )}

                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

                    <div className="absolute left-2 top-2">
                      <span
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-md transition-opacity",
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "border border-white/70 bg-black/20 text-transparent opacity-0 backdrop-blur-sm group-hover:opacity-100",
                        )}
                      >
                        <Check className="h-4 w-4" strokeWidth={2.25} />
                      </span>
                    </div>

                    <div className="absolute right-2 top-2">
                      <Badge
                        variant={photo.is_public ? "success" : "outline"}
                        className={cn(
                          !photo.is_public && "border-transparent bg-black/30 text-white backdrop-blur-sm",
                        )}
                      >
                        {photo.is_public ? "公开" : "私密"}
                      </Badge>
                    </div>

                    <div
                      className="absolute inset-x-2 bottom-2 flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="secondary"
                        size="icon-sm"
                        onClick={() => handleOpenEdit(photo)}
                        aria-label="编辑"
                      >
                        <Edit className="h-4 w-4" strokeWidth={1.75} />
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon-sm"
                        onClick={() => handleViewDetail(photo)}
                        aria-label="查看详情"
                      >
                        <Info className="h-4 w-4" strokeWidth={1.75} />
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon-sm"
                        onClick={() => copyUrl(photo.public_url)}
                        aria-label="复制链接"
                      >
                        <Copy className="h-4 w-4" strokeWidth={1.75} />
                      </Button>
                    </div>
                  </div>

                  <div className="p-3">
                    <p className="truncate text-[14px] font-medium">{photo.name || photo.filename}</p>
                    <p className="mt-0.5 text-[12px] tabular-nums text-muted-foreground">
                      {photo.width} × {photo.height} · {formatDate(photo.created_at)}
                    </p>
                    {photo.tags && photo.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {photo.tags.slice(0, 2).map((tag) => (
                          <Badge key={tag.id} variant="secondary">
                            {tag.name}
                          </Badge>
                        ))}
                        {photo.tags.length > 2 && (
                          <Badge variant="secondary">+{photo.tags.length - 2}</Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 网格视图分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                aria-label="上一页"
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
              </Button>
              <span className="text-[14px] tabular-nums text-muted-foreground">
                第 {currentPage} / {totalPages} 页
              </span>
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
          )}
        </>
      )}

      {/* ========== 编辑对话框 ========== */}
      {showEditDialog && editingPhoto && (
        <Dialog open onOpenChange={setShowEditDialog}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogClose onClick={() => setShowEditDialog(false)} />
            <DialogHeader>
              <DialogTitle>编辑图片信息</DialogTitle>
              <DialogDescription>{editingPhoto.filename}</DialogDescription>
            </DialogHeader>

            <div className="mt-5 space-y-4">
              {editingPhoto.thumbnail_url && (
                <div className="flex justify-center overflow-hidden rounded-lg bg-secondary p-2">
                  <img
                    src={editingPhoto.thumbnail_url}
                    alt={editingPhoto.name}
                    className="max-h-40 rounded-md object-contain"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="edit-name">名称</Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="图片名称"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-intro">简介</Label>
                <Input
                  id="edit-intro"
                  value={editForm.intro}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, intro: e.target.value }))}
                  placeholder="图片简介"
                />
              </div>

              <div className="flex items-center gap-3">
                <Label>公开状态</Label>
                <Button
                  variant={editForm.is_public ? "default" : "outline"}
                  size="sm"
                  onClick={() =>
                    setEditForm((prev) => ({ ...prev, is_public: !prev.is_public }))
                  }
                >
                  {editForm.is_public ? (
                    <>
                      <Globe className="h-4 w-4" strokeWidth={1.75} />
                      公开
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" strokeWidth={1.75} />
                      私密
                    </>
                  )}
                </Button>
              </div>

              <div className="space-y-2">
                <Label>标签</Label>
                {editForm.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {editForm.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                        <button
                          onClick={() => removeEditTag(tag)}
                          className="ml-1.5 transition-colors hover:text-destructive"
                          aria-label={`移除标签 ${tag}`}
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    value={editTagInput}
                    onChange={(e) => setEditTagInput(e.target.value)}
                    placeholder="输入标签名称"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addEditTag();
                      }
                    }}
                  />
                  <Button variant="outline" onClick={addEditTag}>
                    <Tag className="h-4 w-4" strokeWidth={1.75} />
                    添加
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowEditDialog(false)}
                disabled={isSaving}
              >
                取消
              </Button>
              <Button onClick={handleSaveEdit} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
                    保存中...
                  </>
                ) : (
                  "保存"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ========== 批量编辑对话框 ========== */}
      {showBatchEditDialog && (
        <Dialog open onOpenChange={setShowBatchEditDialog}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogClose onClick={() => setShowBatchEditDialog(false)} />
            <DialogHeader>
              <DialogTitle>批量编辑</DialogTitle>
              <DialogDescription>将修改应用到 {selectedIds.size} 张图片</DialogDescription>
            </DialogHeader>

            <div className="mt-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="batch-name">名称</Label>
                <Input
                  id="batch-name"
                  value={batchForm.name}
                  onChange={(e) => setBatchForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="留空则不修改"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="batch-intro">简介</Label>
                <Input
                  id="batch-intro"
                  value={batchForm.intro}
                  onChange={(e) => setBatchForm((prev) => ({ ...prev, intro: e.target.value }))}
                  placeholder="留空则不修改"
                />
              </div>

              <div className="flex items-center gap-3">
                <Label>公开状态</Label>
                <Button
                  variant={batchForm.is_public ? "default" : "outline"}
                  size="sm"
                  onClick={() =>
                    setBatchForm((prev) => ({ ...prev, is_public: !prev.is_public }))
                  }
                >
                  {batchForm.is_public ? "公开" : "私密"}
                </Button>
              </div>

              <div className="space-y-2">
                <Label>标签</Label>
                {batchForm.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {batchForm.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                        <button
                          onClick={() => removeBatchTag(tag)}
                          className="ml-1.5 transition-colors hover:text-destructive"
                          aria-label={`移除标签 ${tag}`}
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    value={batchTagInput}
                    onChange={(e) => setBatchTagInput(e.target.value)}
                    placeholder="输入标签名称"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addBatchTag();
                      }
                    }}
                  />
                  <Button variant="outline" onClick={addBatchTag}>
                    <Tag className="h-4 w-4" strokeWidth={1.75} />
                    添加
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowBatchEditDialog(false)}
                disabled={isSaving}
              >
                取消
              </Button>
              <Button onClick={handleBatchEdit} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
                    保存中...
                  </>
                ) : (
                  "批量保存"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ========== 图片详情对话框（灯箱） ========== */}
      {showDetailDialog && detailPhoto && (
        <Dialog open onOpenChange={setShowDetailDialog}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogClose onClick={() => setShowDetailDialog(false)} />
            <DialogHeader>
              <DialogTitle>图片详情</DialogTitle>
              <DialogDescription>{detailPhoto.name || detailPhoto.filename}</DialogDescription>
            </DialogHeader>

            <div className="mt-5 space-y-4">
              {/* 大图预览 */}
              <div className="flex justify-center overflow-hidden rounded-lg bg-secondary p-2">
                <img
                  src={detailPhoto.public_url}
                  alt={detailPhoto.name}
                  className="max-h-72 rounded-md object-contain"
                />
              </div>

              {/* 信息列表 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[12px] text-muted-foreground">名称</p>
                  <p className="mt-0.5 text-[14px] font-medium">{detailPhoto.name || "-"}</p>
                </div>
                <div>
                  <p className="text-[12px] text-muted-foreground">文件名</p>
                  <p className="mt-0.5 truncate text-[14px] font-medium">{detailPhoto.filename}</p>
                </div>
                <div>
                  <p className="text-[12px] text-muted-foreground">简介</p>
                  <p className="mt-0.5 text-[14px] font-medium">{detailPhoto.intro || "-"}</p>
                </div>
                <div>
                  <p className="text-[12px] text-muted-foreground">类型</p>
                  <p className="mt-0.5 text-[14px] font-medium">{detailPhoto.mimetype}</p>
                </div>
                <div>
                  <p className="text-[12px] text-muted-foreground">尺寸</p>
                  <p className="mt-0.5 text-[14px] font-medium tabular-nums">
                    {detailPhoto.width} × {detailPhoto.height}
                  </p>
                </div>
                <div>
                  <p className="text-[12px] text-muted-foreground">公开状态</p>
                  <div className="mt-1">
                    <Badge variant={detailPhoto.is_public ? "success" : "outline"}>
                      {detailPhoto.is_public ? "公开" : "私密"}
                    </Badge>
                  </div>
                </div>
                <div>
                  <p className="text-[12px] text-muted-foreground">MD5</p>
                  <p className="mt-0.5 break-all font-mono text-[12px]">{detailPhoto.md5}</p>
                </div>
                <div>
                  <p className="text-[12px] text-muted-foreground">SHA1</p>
                  <p className="mt-0.5 break-all font-mono text-[12px]">{detailPhoto.sha1}</p>
                </div>
                <div>
                  <p className="text-[12px] text-muted-foreground">上传时间</p>
                  <p className="mt-0.5 text-[14px] font-medium tabular-nums">
                    {formatDate(detailPhoto.created_at)}
                  </p>
                </div>
                <div>
                  <p className="text-[12px] text-muted-foreground">上传 IP</p>
                  <p className="mt-0.5 text-[14px] font-medium tabular-nums">
                    {detailPhoto.ip_address}
                  </p>
                </div>
                {detailPhoto.storage && (
                  <div>
                    <p className="text-[12px] text-muted-foreground">存储</p>
                    <p className="mt-0.5 text-[14px] font-medium">
                      {detailPhoto.storage.name} ({detailPhoto.storage.provider})
                    </p>
                  </div>
                )}
                {detailPhoto.album && (
                  <div>
                    <p className="text-[12px] text-muted-foreground">相册</p>
                    <p className="mt-0.5 text-[14px] font-medium">{detailPhoto.album.name}</p>
                  </div>
                )}
              </div>

              {/* 标签 */}
              {detailPhoto.tags && detailPhoto.tags.length > 0 && (
                <div>
                  <p className="text-[12px] text-muted-foreground">标签</p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {detailPhoto.tags.map((tag) => (
                      <Badge key={tag.id} variant="secondary">
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => copyUrl(detailPhoto.public_url)}>
                <Copy className="h-4 w-4" strokeWidth={1.75} />
                复制链接
              </Button>
              <a
                href={detailPhoto.public_url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(buttonVariants({ variant: "outline" }))}
              >
                <ExternalLink className="h-4 w-4" strokeWidth={1.75} />
                打开原图
              </a>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ========== 删除确认对话框 ========== */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="批量删除图片"
        description={`确定要删除选中的 ${selectedIds.size} 张图片吗？此操作不可撤销。`}
        confirmText="删除"
        variant="destructive"
        onConfirm={handleBatchDelete}
      />
    </div>
  );
}
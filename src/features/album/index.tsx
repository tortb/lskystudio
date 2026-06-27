import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus,
  Image,
  Trash2,
  RefreshCw,
  FolderOpen,
  Edit,
  Upload,
  Check,
  X,
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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToastActions } from "@/components/ui/toaster";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useConfig } from "@/hooks/use-config";
import { formatDate } from "@/lib/utils";

interface Album {
  id: string;
  name: string;
  description: string;
  imageCount: number;
  covers: string[];
  isPublic: boolean;
  tags: string[];
  createdAt: string;
}

export default function AlbumPage() {
  const toast = useToastActions();
  const { config, isLoading: isConfigLoading } = useConfig();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [newAlbumName, setNewAlbumName] = useState("");
  const [newAlbumDescription, setNewAlbumDescription] = useState("");
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const fetchingRef = useRef(false);

  // 提取原始值，避免对象引用变化导致无限循环
  const apiUrl = config?.apiUrl || "";
  const apiToken = config?.apiToken || "";

  // 获取相册列表
  const fetchAlbums = useCallback(async () => {
    if (!apiUrl || !apiToken) {
      setAlbums([]);
      setIsLoading(false);
      return;
    }

    // 防止并发请求
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    setIsLoading(true);
    try {
      const baseUrl = apiUrl.replace(/\/+$/, "");
      const response = await fetch(`${baseUrl}/api/v2/user/albums`, {
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
      const albumList = result.data?.data || result.data?.albums || [];

      if (isSuccess) {
        setAlbums(
          albumList.map((album: any) => ({
            id: String(album.id),
            name: album.name || "",
            description: album.intro || "",
            imageCount: album.photo_count || 0,
            covers: album.covers || [],
            isPublic: album.is_public ?? true,
            tags: album.tags || [],
            createdAt: album.created_at,
          }))
        );
      } else {
        throw new Error(result.message || "获取相册列表失败");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error("获取相册失败", errorMessage);
      setAlbums([]);
    } finally {
      setIsLoading(false);
      fetchingRef.current = false;
    }
  }, [apiUrl, apiToken, toast]);

  // 初始加载
  useEffect(() => {
    fetchAlbums();
  }, [fetchAlbums]);

  // 创建相册
  const handleCreateAlbum = async () => {
    if (!newAlbumName.trim()) {
      toast.warning("提示", "请输入相册名称");
      return;
    }

    if (!apiUrl || !apiToken) {
      toast.error("错误", "请先配置 API 地址和 Token");
      return;
    }

    setIsCreating(true);
    try {
      const baseUrl = apiUrl.replace(/\/+$/, "");
      const response = await fetch(`${baseUrl}/api/v2/user/albums`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name: newAlbumName.trim(),
          intro: newAlbumDescription.trim(),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`创建相册失败: HTTP ${response.status} - ${errorText}`);
      }

      const result = await response.json();

      if (result.status === "success") {
        toast.success("创建成功", `相册 "${newAlbumName}" 已创建`);
        setShowCreateDialog(false);
        setNewAlbumName("");
        setNewAlbumDescription("");
        fetchAlbums(); // 刷新列表
      } else {
        throw new Error(result.message || "创建相册失败");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error("创建失败", errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  // 删除相册
  const handleDeleteAlbum = async () => {
    if (!selectedAlbum || !apiUrl || !apiToken) return;

    try {
      const baseUrl = apiUrl.replace(/\/+$/, "");
      const response = await fetch(`${baseUrl}/api/v2/user/albums/${selectedAlbum.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          Accept: "application/json",
        },
      });

      if (!response.ok && response.status !== 204) {
        const errorText = await response.text();
        throw new Error(`删除相册失败: HTTP ${response.status} - ${errorText}`);
      }

      // DELETE 返回 204 无内容，或 200 有 JSON
      let result: any = {};
      if (response.status !== 204) {
        const text = await response.text();
        try { result = JSON.parse(text); } catch { /* 非 JSON 忽略 */ }
      }

      if (response.status === 204 || result.status === "success") {
        toast.success("删除成功", `相册 "${selectedAlbum.name}" 已删除`);
        setShowDeleteDialog(false);
        setSelectedAlbum(null);
        fetchAlbums(); // 刷新列表
      } else {
        throw new Error(result.message || "删除相册失败");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error("删除失败", errorMessage);
    }
  };

  // 编辑相册
  const handleEditAlbum = (album: Album) => {
    setEditingAlbum(album);
    setEditName(album.name);
    setEditDescription(album.description);
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingAlbum(null);
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!editingAlbum || !editName.trim()) {
      toast.warning("提示", "请输入相册名称");
      return;
    }

    if (!apiUrl || !apiToken) {
      toast.error("错误", "请先配置 API 地址和 Token");
      return;
    }

    try {
      const baseUrl = apiUrl.replace(/\/+$/, "");
      const response = await fetch(`${baseUrl}/api/v2/user/albums/${editingAlbum.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name: editName.trim(),
          intro: editDescription.trim(),
        }),
      });

      if (!response.ok && response.status !== 204) {
        const errorText = await response.text();
        throw new Error(`更新相册失败: HTTP ${response.status} - ${errorText}`);
      }

      // PUT 返回 204 无内容
      if (response.status === 204) {
        toast.success("更新成功", "相册信息已更新");
        setEditingAlbum(null);
        fetchAlbums(); // 刷新列表
      } else {
        const result = await response.json();
        throw new Error(result.message || "更新相册失败");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error("更新失败", errorMessage);
    }
  };

  const handleUploadToAlbum = (album: Album) => {
    // 跳转到上传页面并预选相册
    window.location.href = `/upload?albumId=${album.id}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">相册管理</h2>
          <p className="text-muted-foreground">管理兰空图床相册</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchAlbums} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            刷新
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            创建相册
          </Button>
        </div>
      </div>

      {/* 加载中 */}
      {isConfigLoading ? (
        <Card>
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center">
              <Loader2 className="mb-4 h-12 w-12 text-muted-foreground animate-spin" />
              <p className="text-sm text-muted-foreground">加载配置中...</p>
            </div>
          </CardContent>
        </Card>
      ) : /* 未配置提示 */
      !config?.apiUrl || !config?.apiToken ? (
        <Card>
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center">
              <FolderOpen className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-medium">请先配置 API</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                在设置页面配置 API 地址和 Token 后即可管理相册
              </p>
              <Button onClick={() => (window.location.href = "/settings")}>
                前往设置
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <Card>
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center">
              <Loader2 className="mb-4 h-12 w-12 text-muted-foreground animate-spin" />
              <p className="text-sm text-muted-foreground">加载中...</p>
            </div>
          </CardContent>
        </Card>
      ) : albums.length === 0 ? (
        <Card>
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center">
              <FolderOpen className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-medium">暂无相册</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                创建相册来组织你的图片
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                创建相册
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {albums.map((album) => (
            <Card key={album.id} className="overflow-hidden">
              {/* 封面图 */}
              <div className="aspect-video bg-muted">
                {album.covers && album.covers.length > 0 ? (
                  <img
                    src={album.covers[0]}
                    alt={album.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Image className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* 内容 */}
              <CardContent className="p-4">
                {editingAlbum?.id === album.id ? (
                  // 编辑模式
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor={`edit-name-${album.id}`}>名称</Label>
                      <Input
                        id={`edit-name-${album.id}`}
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`edit-desc-${album.id}`}>描述</Label>
                      <Input
                        id={`edit-desc-${album.id}`}
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveEdit}>
                        <Check className="mr-1 h-3 w-3" />
                        保存
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                        <X className="mr-1 h-3 w-3" />
                        取消
                      </Button>
                    </div>
                  </div>
                ) : (
                  // 显示模式
                  <>
                    <div className="mb-2 flex items-start justify-between">
                      <div>
                        <h3 className="font-medium">{album.name}</h3>
                        {album.description && (
                          <p className="text-sm text-muted-foreground">
                            {album.description}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline">{album.imageCount} 张</Badge>
                    </div>

                    <p className="mb-3 text-xs text-muted-foreground">
                      创建于 {formatDate(album.createdAt)}
                    </p>

                    {/* 标签 */}
                    {album.tags && album.tags.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-1">
                        {album.tags.map((tag, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* 公开状态 */}
                    <div className="mb-2">
                      <Badge variant={album.isPublic ? "default" : "outline"} className="text-xs">
                        {album.isPublic ? "公开" : "私密"}
                      </Badge>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleUploadToAlbum(album)}
                      >
                        <Upload className="mr-1 h-3 w-3" />
                        上传
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditAlbum(album)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedAlbum(album);
                          setShowDeleteDialog(true);
                        }}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 创建相册对话框 */}
      {showCreateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>创建相册</CardTitle>
              <CardDescription>创建一个新的相册来组织图片</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="albumName">相册名称 *</Label>
                <Input
                  id="albumName"
                  placeholder="请输入相册名称"
                  value={newAlbumName}
                  onChange={(e) => setNewAlbumName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="albumDescription">描述（可选）</Label>
                <Input
                  id="albumDescription"
                  placeholder="请输入相册描述"
                  value={newAlbumDescription}
                  onChange={(e) => setNewAlbumDescription(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                  disabled={isCreating}
                >
                  取消
                </Button>
                <Button onClick={handleCreateAlbum} disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      创建中...
                    </>
                  ) : (
                    "创建"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 删除确认对话框 */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="删除相册"
        description={`确定要删除相册 "${selectedAlbum?.name}" 吗？此操作不可撤销。`}
        confirmText="删除"
        variant="destructive"
        onConfirm={handleDeleteAlbum}
      />
    </div>
  );
}

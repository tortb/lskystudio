import { useState, useCallback, useEffect, useRef, type DragEvent } from "react";
import { ImagePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatFileSize } from "@/lib/utils";
import { isTauriEnv } from "@/lib/env";
import { filesApi, type UploadFile } from "@/lib/api";

interface FileDropzoneProps {
  onFilesSelected: (files: UploadFile[]) => void;
  accept?: string[];
  maxFiles?: number;
  maxSize?: number;
  disabled?: boolean;
  className?: string;
}

/** 桌面端按扩展名判断类型（原生拖拽只有路径，没有 MIME） */
const IMAGE_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "svg",
  "bmp",
  "ico",
  "tif",
  "tiff",
  "avif",
  "heic",
];

export function FileDropzone({
  onFilesSelected,
  accept = ["image/*"],
  maxFiles = 20000,
  maxSize = 50 * 1024 * 1024, // 50MB
  disabled = false,
  className,
}: FileDropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [, setDragCounter] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAcceptedPath = useCallback(
    (path: string) => {
      const ext = path.split(".").pop()?.toLowerCase() ?? "";
      if (accept.includes("image/*")) return IMAGE_EXTENSIONS.includes(ext);
      return accept.some((type) => type.toLowerCase() === `.${ext}`);
    },
    [accept],
  );

  // 桌面端：把拖拽得到的真实路径解析为文件元信息
  const ingestPaths = useCallback(
    async (paths: string[]) => {
      try {
        const metas = await filesApi.resolve(paths);
        const valid = metas.filter((m) => isAcceptedPath(m.path) && m.size <= maxSize);
        if (valid.length > 0) {
          onFilesSelected(valid.slice(0, maxFiles));
        }
      } catch (err) {
        console.error("解析拖拽文件失败:", err);
      }
    },
    [isAcceptedPath, maxSize, maxFiles, onFilesSelected],
  );

  // 桌面端的 HTML5 拖拽拿不到文件真实路径，改用 Tauri 原生拖拽事件
  useEffect(() => {
    if (!isTauriEnv || disabled) return;

    let unlisten: (() => void) | undefined;
    import("@tauri-apps/api/webview")
      .then(({ getCurrentWebview }) =>
        getCurrentWebview().onDragDropEvent((event) => {
          if (event.payload.type === "over") {
            setIsDragActive(true);
          } else if (event.payload.type === "drop") {
            setIsDragActive(false);
            ingestPaths(event.payload.paths);
          } else {
            setIsDragActive(false);
          }
        }),
      )
      .then((fn) => {
        unlisten = fn;
      })
      .catch(console.error);

    return () => unlisten?.();
  }, [disabled, ingestPaths]);

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter((prev) => prev + 1);
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter((prev) => {
      const next = prev - 1;
      if (next === 0) {
        setIsDragActive(false);
      }
      return next;
    });
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const processFiles = useCallback(
    (files: File[]) => {
      const validFiles = files.filter((file) => {
        const isValidType = accept.some((type) => {
          if (type.endsWith("/*")) {
            return file.type.startsWith(type.replace("/*", "/"));
          }
          return file.type === type;
        });
        const isValidSize = file.size <= maxSize;
        return isValidType && isValidSize;
      });

      const limitedFiles = validFiles.slice(0, maxFiles);

      if (limitedFiles.length > 0) {
        onFilesSelected(
          limitedFiles.map((file) => ({
            path: file.name,
            name: file.name,
            size: file.size,
            file,
          })),
        );
      }
    },
    [accept, maxSize, maxFiles, onFilesSelected],
  );

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragActive(false);
      setDragCounter(0);

      // 桌面端由原生拖拽事件处理
      if (disabled || isTauriEnv) return;

      const files = Array.from(e.dataTransfer.files);
      processFiles(files);
    },
    [disabled, processFiles],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const files = Array.from(e.target.files);
        processFiles(files);
      }
    },
    [processFiles],
  );

  const handleClick = async () => {
    if (disabled) return;

    // 桌面端：走系统文件选择框，才能拿到真实路径
    if (isTauriEnv) {
      try {
        const files = await filesApi.select();
        const valid = files.filter((f) => f.size <= maxSize);
        if (valid.length > 0) {
          onFilesSelected(valid.slice(0, maxFiles));
        }
      } catch (err) {
        console.error("选择文件失败:", err);
      }
      return;
    }

    fileInputRef.current?.click();
  };

  return (
    <div
      className={cn(
        "group relative flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-8 py-14 text-center transition-colors duration-200",
        isDragActive
          ? "border-primary bg-primary/[0.04]"
          : "border-border hover:border-muted-foreground/40 hover:bg-secondary/40",
        disabled && "pointer-events-none cursor-not-allowed opacity-50",
        className,
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={accept.join(",")}
        className="hidden"
        onChange={handleFileInput}
        disabled={disabled}
      />

      <div
        className={cn(
          "mb-4 flex h-12 w-12 items-center justify-center rounded-full transition-colors duration-200",
          isDragActive
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-muted-foreground",
        )}
      >
        <ImagePlus className="h-[22px] w-[22px]" strokeWidth={1.75} />
      </div>

      <p className="text-[17px] font-medium text-foreground">
        {isDragActive ? "释放以上传" : "拖拽图片到此处，或点击选择"}
      </p>
      <p className="mt-1 text-[12px] text-muted-foreground">
        支持 JPG、PNG、GIF、WebP 等格式，单文件最大 {formatFileSize(maxSize)}
      </p>
    </div>
  );
}

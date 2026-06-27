import { useState, useCallback, useRef, type DragEvent } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatFileSize } from "@/lib/utils";

interface FileDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string[];
  maxFiles?: number;
  maxSize?: number;
  disabled?: boolean;
  className?: string;
}

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

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragActive(false);
      setDragCounter(0);

      if (disabled) return;

      const files = Array.from(e.dataTransfer.files);
      processFiles(files);
    },
    [disabled, accept, maxSize, maxFiles, onFilesSelected],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const files = Array.from(e.target.files);
        processFiles(files);
      }
    },
    [accept, maxSize, maxFiles, onFilesSelected],
  );

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
        onFilesSelected(limitedFiles);
      }
    },
    [accept, maxSize, maxFiles, onFilesSelected],
  );

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-all duration-200 cursor-pointer",
        isDragActive
          ? "border-primary bg-primary/5 scale-[1.02]"
          : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
        disabled && "opacity-50 cursor-not-allowed",
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
          "mb-4 rounded-full p-3 transition-all duration-200",
          isDragActive
            ? "bg-primary text-primary-foreground scale-110"
            : "bg-muted text-muted-foreground",
        )}
      >
        <Upload className="h-8 w-8" />
      </div>

      <div className="text-center">
        <p className="mb-1 text-sm font-medium">
          {isDragActive ? "释放文件以上传" : "拖拽文件到此处或点击选择"}
        </p>
        <p className="text-xs text-muted-foreground">
          支持 JPG、PNG、GIF、WebP 等图片格式，最大 {formatFileSize(maxSize)}
        </p>
      </div>

      {isDragActive && (
        <div className="absolute inset-0 rounded-lg border-2 border-primary animate-pulse" />
      )}
    </div>
  );
}

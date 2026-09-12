import { useState, useCallback, useRef, type DragEvent } from "react";
import { ImagePlus } from "lucide-react";
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

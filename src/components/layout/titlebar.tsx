import { Minus, Square, X } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";

export function Titlebar() {
  // 运行时检测是否在 Tauri 环境（避免模块加载时序问题）
  const isTauri = typeof window !== "undefined" && window.__TAURI__ !== undefined;

  // 浏览器模式下不渲染自定义标题栏
  if (!isTauri) {
    return null;
  }

  const handleMinimize = () => {
    invoke("minimize_window").catch(console.error);
  };

  const handleMaximize = () => {
    invoke("maximize_window").catch(console.error);
  };

  const handleClose = () => {
    invoke("close_window").catch(console.error);
  };

  return (
    <div className="flex h-10 items-center justify-between border-b bg-card px-2" data-tauri-drag-region>
      {/* Drag region */}
      <div className="flex-1 pl-2" data-tauri-drag-region>
        <span className="text-xs font-medium text-muted-foreground">
          Lsky Studio
        </span>
      </div>

      {/* Window controls */}
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleMinimize}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleMaximize}
        >
          <Square className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-destructive hover:text-destructive-foreground"
          onClick={handleClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

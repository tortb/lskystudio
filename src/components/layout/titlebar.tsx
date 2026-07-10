import { useState, useEffect } from "react";
import { Minus, Square, Copy, X } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Button } from "@/components/ui/button";

export function Titlebar() {
  // 运行时检测是否在 Tauri 环境（避免模块加载时序问题）
  const isTauri = typeof window !== "undefined" && window.__TAURI__ !== undefined;
  const [isMaximized, setIsMaximized] = useState(false);

  // 监听窗口状态变化，同步最大化/还原按钮图标
  useEffect(() => {
    if (!isTauri) return;

    let unlisten: (() => void) | undefined;
    let cancelled = false;

    const appWindow = getCurrentWindow();

    // 初始化时获取当前最大化状态
    appWindow
      .isMaximized()
      .then((maximized) => {
        if (!cancelled) setIsMaximized(maximized);
      })
      .catch(console.error);

    // 监听窗口 resize 事件（最大化/还原时会触发 resize）
    appWindow
      .listen<unknown>("tauri://resize", () => {
        appWindow
          .isMaximized()
          .then((maximized) => {
            if (!cancelled) setIsMaximized(maximized);
          })
          .catch(console.error);
      })
      .then((fn) => {
        unlisten = fn;
      })
      .catch(console.error);

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [isTauri]);

  // 浏览器模式下不渲染自定义标题栏
  if (!isTauri) {
    return null;
  }

  const appWindow = getCurrentWindow();

  const handleMinimize = () => {
    appWindow.minimize().catch(console.error);
  };

  const handleToggleMaximize = () => {
    appWindow.toggleMaximize().catch(console.error);
  };

  const handleClose = () => {
    appWindow.close().catch(console.error);
  };

  return (
    <div className="flex h-10 items-center justify-between border-b bg-card select-none">
      {/* 应用标题 + 窗口拖拽区域 */}
      <div
        className="flex h-full flex-1 items-center pl-3"
        data-tauri-drag-region
      >
        <span className="text-xs font-medium text-muted-foreground">
          Lsky Studio
        </span>
      </div>

      {/* 窗口控制按钮 - 不置于 data-tauri-drag-region 内，确保点击不被拖拽拦截 */}
      <div className="flex h-full items-center">
        <Button
          variant="ghost"
          size="icon"
          className="h-full w-10 rounded-none hover:bg-accent hover:text-accent-foreground"
          onClick={handleMinimize}
          aria-label="最小化"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-full w-10 rounded-none hover:bg-accent hover:text-accent-foreground transition-all"
          onClick={handleToggleMaximize}
          aria-label={isMaximized ? "还原" : "最大化"}
        >
          {isMaximized ? (
            <Copy className="h-3 w-3" />
          ) : (
            <Square className="h-3 w-3" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-full w-10 rounded-none hover:bg-destructive hover:text-destructive-foreground"
          onClick={handleClose}
          aria-label="关闭"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

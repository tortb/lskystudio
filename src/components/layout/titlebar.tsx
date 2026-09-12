import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Minus, Square, Copy, X } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauriEnv } from "@/lib/env";
import { cn } from "@/lib/utils";

/**
 * 自定义标题栏
 *
 * 窗口控制按钮曾因使用 window.__TAURI__ 判断环境而完全消失：
 * Tauri v2 默认不注入该全局变量，导致 isTauri 恒为 false，标题栏直接 return null，
 * 而 tauri.conf.json 中 decorations: false 又关闭了系统原生按钮。
 * 现统一改用 @tauri-apps/api 的 isTauri() 检测。
 */
export function Titlebar() {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (!isTauriEnv) return;

    const appWindow = getCurrentWindow();
    let unlisten: (() => void) | undefined;
    let cancelled = false;

    appWindow.isMaximized().then((value) => {
      if (!cancelled) setIsMaximized(value);
    });

    appWindow
      .onResized(() => {
        appWindow.isMaximized().then((value) => {
          if (!cancelled) setIsMaximized(value);
        });
      })
      .then((fn) => {
        unlisten = fn;
      });

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  const handleMinimize = useCallback(() => {
    getCurrentWindow().minimize();
  }, []);

  const handleToggleMaximize = useCallback(() => {
    getCurrentWindow().toggleMaximize();
  }, []);

  const handleClose = useCallback(() => {
    getCurrentWindow().close();
  }, []);

  // 浏览器模式（pnpm dev 在浏览器中预览）不渲染自定义标题栏
  if (!isTauriEnv) return null;

  return (
    <header className="relative z-50 flex h-[38px] shrink-0 select-none items-center border-b border-border/70 bg-background/80 pl-3 backdrop-blur-xl">
      {/* 标题 + 拖拽区域 */}
      <div
        data-tauri-drag-region
        onDoubleClick={handleToggleMaximize}
        className="flex h-full flex-1 items-center gap-2"
      >
        <div className="flex h-[18px] w-[18px] items-center justify-center rounded-[5px] bg-gradient-to-br from-primary to-[#5ea8ff]">
          <svg viewBox="0 0 24 24" className="h-3 w-3 text-white" aria-hidden>
            <path
              fill="currentColor"
              d="M12 3.5 7.5 8h3v5.5h3V8h3L12 3.5ZM5.5 15.5h13V20a.5.5 0 0 1-.5.5H6a.5.5 0 0 1-.5-.5v-4.5Z"
            />
          </svg>
        </div>
        <span
          data-tauri-drag-region
          className="text-[12px] font-medium tracking-[-0.01em] text-muted-foreground"
        >
          Lsky Studio
        </span>
      </div>

      {/* 窗口控制按钮：不在 data-tauri-drag-region 内，避免点击被识别为拖拽 */}
      <div className="flex h-full items-center">
        <WindowButton label="最小化" onClick={handleMinimize}>
          <Minus className="h-[15px] w-[15px]" strokeWidth={1.75} />
        </WindowButton>

        <WindowButton
          label={isMaximized ? "还原" : "最大化"}
          onClick={handleToggleMaximize}
        >
          {isMaximized ? (
            <Copy className="h-[13px] w-[13px]" strokeWidth={1.75} />
          ) : (
            <Square className="h-[12px] w-[12px]" strokeWidth={1.75} />
          )}
        </WindowButton>

        <WindowButton label="关闭" onClick={handleClose} danger>
          <X className="h-[15px] w-[15px]" strokeWidth={1.75} />
        </WindowButton>
      </div>
    </header>
  );
}

function WindowButton({
  label,
  onClick,
  danger = false,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "flex h-full w-[46px] items-center justify-center text-muted-foreground transition-colors duration-150 outline-none",
        "hover:bg-foreground/[0.06] hover:text-foreground focus-visible:bg-foreground/[0.08]",
        danger &&
          "hover:bg-destructive hover:text-white focus-visible:bg-destructive focus-visible:text-white",
      )}
    >
      {children}
    </button>
  );
}

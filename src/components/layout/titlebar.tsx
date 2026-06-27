import { Minus, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { windowApi, isWebMode } from "@/lib/api";

export function Titlebar() {
  // 浏览器模式下不渲染自定义标题栏
  if (isWebMode) {
    return null;
  }

  return (
    <div className="flex h-10 items-center justify-between border-b bg-card px-2">
      {/* Drag region */}
      <div className="flex-1 drag-region pl-2">
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
          onClick={() => windowApi.minimize()}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => windowApi.maximize()}
        >
          <Square className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-destructive hover:text-destructive-foreground"
          onClick={() => windowApi.close()}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

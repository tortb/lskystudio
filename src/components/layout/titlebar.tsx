import { Minus, Square, X } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";

export function Titlebar() {
  const handleMinimize = () => {
    invoke("minimize_window");
  };

  const handleMaximize = () => {
    invoke("maximize_window");
  };

  const handleClose = () => {
    invoke("close_window");
  };

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

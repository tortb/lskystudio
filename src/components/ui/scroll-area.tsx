import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

// ScrollArea 组件
export interface ScrollAreaProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: "vertical" | "horizontal";
}

const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className, children, orientation = "vertical", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "relative overflow-hidden",
          className,
        )}
        {...props}
      >
        <div
          className={cn(
            "h-full w-full",
            orientation === "vertical"
              ? "overflow-y-auto overflow-x-hidden"
              : "overflow-x-auto overflow-y-hidden",
          )}
        >
          {children}
        </div>
      </div>
    );
  },
);
ScrollArea.displayName = "ScrollArea";

// ScrollBar 组件
export interface ScrollBarProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: "vertical" | "horizontal";
}

const ScrollBar = forwardRef<HTMLDivElement, ScrollBarProps>(
  ({ className, orientation = "vertical", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex touch-none select-none transition-colors",
          orientation === "vertical"
            ? "h-full w-2.5 border-l border-l-transparent p-[1px]"
            : "h-2.5 w-full border-t border-t-transparent p-[1px]",
          className,
        )}
        {...props}
      />
    );
  },
);
ScrollBar.displayName = "ScrollBar";

export { ScrollArea, ScrollBar };

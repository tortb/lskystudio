import { useState, useRef, useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// Tooltip 组件
interface TooltipProps {
  children: ReactNode;
  content: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  delayDuration?: number;
  className?: string;
}

export function Tooltip({
  children,
  content,
  side = "top",
  align = "center",
  delayDuration = 300,
  className,
}: TooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(true);
    }, delayDuration);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsOpen(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
  };

  const alignClasses = {
    start: side === "top" || side === "bottom" ? "left-0" : "top-0",
    center: "",
    end: side === "top" || side === "bottom" ? "right-0" : "bottom-0",
  };

  return (
    <div
      ref={triggerRef}
      className="relative inline-flex"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isOpen && (
        <div
          className={cn(
            "absolute z-50 rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95",
            positionClasses[side],
            alignClasses[align],
            className,
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
}

// TooltipProvider
export function TooltipProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

// TooltipTrigger
export function TooltipTrigger({
  children,
  asChild: _asChild,
}: {
  children: ReactNode;
  asChild?: boolean;
}) {
  return <>{children}</>;
}

// TooltipContent
export function TooltipContent({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md",
        className,
      )}
    >
      {children}
    </div>
  );
}

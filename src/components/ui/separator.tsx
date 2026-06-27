import { cn } from "@/lib/utils";

// Separator 组件
interface SeparatorProps {
  className?: string;
  orientation?: "horizontal" | "vertical";
  decorative?: boolean;
}

export function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
}: SeparatorProps) {
  return (
    <div
      role={decorative ? "none" : "separator"}
      aria-orientation={orientation}
      className={cn(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
        className,
      )}
    />
  );
}

import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StatusType = "online" | "offline" | "loading" | "error";

export interface StatusIndicatorProps {
  /** Current status to display. */
  status: StatusType;
  /** Optional label shown next to the dot. */
  label?: string;
  /** Dot size — defaults to "md". */
  size?: "sm" | "md" | "lg";
  /** Additional class names. */
  className?: string;
}

// ---------------------------------------------------------------------------
// Style maps
// ---------------------------------------------------------------------------

const dotColor: Record<StatusType, string> = {
  online: "bg-success",
  offline: "bg-muted-foreground",
  loading: "bg-warning",
  error: "bg-destructive",
};

const ringColor: Record<StatusType, string> = {
  online: "bg-success/40",
  offline: "",
  loading: "",
  error: "",
};

const sizeMap = {
  sm: "h-2 w-2",
  md: "h-2.5 w-2.5",
  lg: "h-3 w-3",
};

const ringSizeMap = {
  sm: "h-2 w-2",
  md: "h-2.5 w-2.5",
  lg: "h-3 w-3",
};

const textSizeMap = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-sm",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StatusIndicator({
  status,
  label,
  size = "md",
  className,
}: StatusIndicatorProps) {
  return (
    <span
      className={cn("inline-flex items-center gap-1.5", className)}
      role="status"
      aria-label={label ?? status}
    >
      {/* Dot + pulse ring wrapper */}
      <span className="relative inline-flex shrink-0">
        {/* Pulse ring — only visible for "online" status */}
        {status === "online" && (
          <span
            aria-hidden
            className={cn(
              "absolute inset-0 rounded-full animate-pulse-ring",
              ringColor[status],
              ringSizeMap[size],
            )}
          />
        )}

        {/* Spinning indicator for "loading" */}
        {status === "loading" && (
          <span
            aria-hidden
            className={cn(
              "absolute inset-0 rounded-full border-2 border-warning/40 border-t-warning animate-spin",
              sizeMap[size],
            )}
          />
        )}

        {/* Solid dot */}
        <span
          className={cn(
            "rounded-full",
            dotColor[status],
            sizeMap[size],
            status === "offline" && "opacity-60",
          )}
        />
      </span>

      {/* Label */}
      {label && (
        <span className={cn("text-muted-foreground", textSizeMap[size])}>
          {label}
        </span>
      )}
    </span>
  );
}

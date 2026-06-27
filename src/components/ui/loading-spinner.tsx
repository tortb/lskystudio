import * as React from "react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Spinner size. */
  size?: "sm" | "default" | "lg" | "xl";
  /** Visual variant. */
  variant?: "spinner" | "dots" | "pulse";
  /** Optional label shown below the spinner. */
  label?: string;
  /** Center the spinner in its container. */
  centered?: boolean;
}

// ---------------------------------------------------------------------------
// Size map
// ---------------------------------------------------------------------------

const sizeMap: Record<string, { outer: string; inner: string; dot: string }> = {
  sm: { outer: "h-5 w-5", inner: "h-3 w-3", dot: "h-1.5 w-1.5" },
  default: { outer: "h-8 w-8", inner: "h-5 w-5", dot: "h-2 w-2" },
  lg: { outer: "h-12 w-12", inner: "h-8 w-8", dot: "h-3 w-3" },
  xl: { outer: "h-16 w-16", inner: "h-10 w-10", dot: "h-4 w-4" },
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SpinnerRing({ size }: { size: string }) {
  return (
    <div className={cn("relative", size)}>
      {/* Background ring */}
      <div className="absolute inset-0 rounded-full border-2 border-muted" />
      {/* Spinning arc */}
      <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
}

function DotsSpinner({ dotSize }: { dotSize: string }) {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn(
            dotSize,
            "rounded-full bg-primary animate-bounce",
          )}
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  );
}

function PulseSpinner({ size }: { size: string }) {
  return (
    <div className={cn("relative flex items-center justify-center", size)}>
      {/* Expanding ring */}
      <div className="absolute inset-0 rounded-full border-2 border-primary animate-pulse-ring" />
      {/* Solid center */}
      <div className="h-1/3 w-1/3 rounded-full bg-primary" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const LoadingSpinner = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  (
    {
      size = "default",
      variant = "spinner",
      label,
      centered = false,
      className,
      ...props
    },
    ref,
  ) => {
    const dims = sizeMap[size] ?? sizeMap.default;

    const spinnerNode =
      variant === "dots" ? (
        <DotsSpinner dotSize={dims.dot} />
      ) : variant === "pulse" ? (
        <PulseSpinner size={dims.outer} />
      ) : (
        <SpinnerRing size={dims.outer} />
      );

    return (
      <div
        ref={ref}
        role="status"
        aria-live="polite"
        aria-busy="true"
        className={cn(
          "flex flex-col items-center gap-2",
          centered && "justify-center",
          className,
        )}
        {...props}
      >
        {spinnerNode}
        {label && (
          <span className="text-sm text-muted-foreground animate-pulse">
            {label}
          </span>
        )}
        <span className="sr-only">Loading...</span>
      </div>
    );
  },
);

LoadingSpinner.displayName = "LoadingSpinner";

export { LoadingSpinner };

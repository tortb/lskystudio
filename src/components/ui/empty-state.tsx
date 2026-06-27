import * as React from "react";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
  variant?: "default" | "outline" | "secondary" | "ghost";
  icon?: LucideIcon;
}

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Icon displayed at the top of the empty state. */
  icon: LucideIcon;
  /** Primary title text. */
  title: string;
  /** Optional description shown below the title. */
  description?: string;
  /** Optional action button. */
  action?: EmptyStateAction;
  /** Optional secondary action button. */
  secondaryAction?: EmptyStateAction;
  /** Size of the icon container. */
  iconSize?: "sm" | "default" | "lg";
}

// ---------------------------------------------------------------------------
// Size map for icon wrappers
// ---------------------------------------------------------------------------

const iconSizeMap: Record<string, { wrapper: string; icon: string }> = {
  sm: { wrapper: "h-12 w-12", icon: "h-6 w-6" },
  default: { wrapper: "h-16 w-16", icon: "h-8 w-8" },
  lg: { wrapper: "h-20 w-20", icon: "h-10 w-10" },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  (
    {
      icon: Icon,
      title,
      description,
      action,
      secondaryAction,
      iconSize = "default",
      className,
      ...props
    },
    ref,
  ) => {
    const dims = iconSizeMap[iconSize] ?? iconSizeMap.default;

    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col items-center justify-center px-6 py-12 text-center",
          className,
        )}
        {...props}
      >
        {/* Icon circle */}
        <div
          className={cn(
            "mb-4 flex items-center justify-center rounded-full bg-muted",
            dims.wrapper,
          )}
        >
          <Icon className={cn("text-muted-foreground", dims.icon)} />
        </div>

        {/* Title */}
        <h3 className="mb-1 text-lg font-semibold text-foreground">{title}</h3>

        {/* Description */}
        {description && (
          <p className="mb-6 max-w-sm text-sm text-muted-foreground">
            {description}
          </p>
        )}

        {/* Actions */}
        {(action || secondaryAction) && (
          <div className="flex items-center gap-3">
            {action && (
              <Button
                variant={action.variant ?? "default"}
                onClick={action.onClick}
              >
                {action.icon && <action.icon className="mr-2 h-4 w-4" />}
                {action.label}
              </Button>
            )}
            {secondaryAction && (
              <Button
                variant={secondaryAction.variant ?? "outline"}
                onClick={secondaryAction.onClick}
              >
                {secondaryAction.icon && (
                  <secondaryAction.icon className="mr-2 h-4 w-4" />
                )}
                {secondaryAction.label}
              </Button>
            )}
          </div>
        )}
      </div>
    );
  },
);

EmptyState.displayName = "EmptyState";

export { EmptyState };

import { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BreadcrumbItem {
  /** Display label for this crumb. */
  label: string;
  /** Optional href — omit for the current (last) item. */
  href?: string;
}

export interface PageHeaderProps {
  /** Main heading text. */
  title: string;
  /** Optional supporting text shown below the title. */
  description?: string;
  /** Optional action buttons / controls rendered on the right. */
  actions?: ReactNode;
  /** Optional breadcrumb trail rendered above the title. */
  breadcrumbs?: BreadcrumbItem[];
  /** Additional class names for the outer wrapper. */
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("mb-6 space-y-2", className)}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground">
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;

            return (
              <span key={index} className="flex items-center gap-1">
                {index > 0 && (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                )}

                {crumb.href && !isLast ? (
                  <a
                    href={crumb.href}
                    className="transition-colors hover:text-foreground"
                  >
                    {crumb.label}
                  </a>
                ) : (
                  <span className={cn(isLast && "text-foreground font-medium")}>
                    {crumb.label}
                  </span>
                )}
              </span>
            );
          })}
        </nav>
      )}

      {/* Title row */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>

        {actions && (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        )}
      </div>
    </div>
  );
}

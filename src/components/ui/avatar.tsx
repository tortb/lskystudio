import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

// Avatar 组件
export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "default" | "lg";
}

const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, size = "default", ...props }, ref) => {
    const sizeClasses = {
      sm: "h-8 w-8",
      default: "h-10 w-10",
      lg: "h-12 w-12",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "relative flex shrink-0 overflow-hidden rounded-full",
          sizeClasses[size],
          className,
        )}
        {...props}
      />
    );
  },
);
Avatar.displayName = "Avatar";

// AvatarImage 组件
export interface AvatarImageProps extends HTMLAttributes<HTMLImageElement> {
  src?: string;
  alt?: string;
}

const AvatarImage = forwardRef<HTMLImageElement, AvatarImageProps>(
  ({ className, src, alt, ...props }, ref) => {
    return (
      <img
        ref={ref}
        src={src}
        alt={alt}
        className={cn("aspect-square h-full w-full", className)}
        {...props}
      />
    );
  },
);
AvatarImage.displayName = "AvatarImage";

// AvatarFallback 组件
export interface AvatarFallbackProps extends HTMLAttributes<HTMLDivElement> {}

const AvatarFallback = forwardRef<HTMLDivElement, AvatarFallbackProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex h-full w-full items-center justify-center rounded-full bg-muted",
          className,
        )}
        {...props}
      />
    );
  },
);
AvatarFallback.displayName = "AvatarFallback";

export { Avatar, AvatarImage, AvatarFallback };

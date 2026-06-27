import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// CSS animation class helpers
// ---------------------------------------------------------------------------

/** Fade an element in from fully transparent. */
export function fadeIn(options?: {
  duration?: "fast" | "normal" | "slow";
  delay?: number;
  className?: string;
}) {
  const { duration = "normal", delay = 0, className } = options ?? {};
  return cn(
    "animate-in fade-in",
    duration === "fast" && "duration-150",
    duration === "normal" && "duration-300",
    duration === "slow" && "duration-500",
    delay > 0 && `delay-${delay}`,
    className,
  );
}

/** Slide an element into view from a chosen direction. */
export function slideIn(options?: {
  direction?: "up" | "down" | "left" | "right";
  duration?: "fast" | "normal" | "slow";
  delay?: number;
  className?: string;
}) {
  const { direction = "up", duration = "normal", delay = 0, className } =
    options ?? {};

  const directionMap: Record<string, string> = {
    up: "slide-in-from-bottom-4",
    down: "slide-in-from-top-4",
    left: "slide-in-from-right-4",
    right: "slide-in-from-left-4",
  };

  return cn(
    "animate-in",
    directionMap[direction],
    "fade-in",
    duration === "fast" && "duration-150",
    duration === "normal" && "duration-300",
    duration === "slow" && "duration-500",
    delay > 0 && `delay-${delay}`,
    className,
  );
}

/** Scale an element from slightly smaller to its natural size. */
export function scale(options?: {
  duration?: "fast" | "normal" | "slow";
  delay?: number;
  from?: number;
  className?: string;
}) {
  const { duration = "normal", delay = 0, from = 0.95, className } =
    options ?? {};

  // tailwindcss-animate provides animate-in zoom-in-95 by default.
  // We pick a predefined scale entry when possible.
  const scaleClass =
    from <= 0.9
      ? "zoom-in-90"
      : from <= 0.95
        ? "zoom-in-95"
        : "zoom-in";

  return cn(
    "animate-in",
    scaleClass,
    "fade-in",
    duration === "fast" && "duration-150",
    duration === "normal" && "duration-300",
    duration === "slow" && "duration-500",
    delay > 0 && `delay-${delay}`,
    className,
  );
}

// ---------------------------------------------------------------------------
// Inline style helpers (for use with the `style` prop when CSS classes
// from tailwindcss-animate are not enough)
// ---------------------------------------------------------------------------

export type AnimationConfig = {
  duration?: number;
  easing?: string;
  delay?: number;
  fillMode?: "none" | "forwards" | "backwards" | "both";
};

const defaultConfig: Required<AnimationConfig> = {
  duration: 300,
  easing: "cubic-bezier(0.4, 0, 0.2, 1)",
  delay: 0,
  fillMode: "both",
};

/** Returns a `style` object for a fade-in animation. */
export function fadeInStyle(config?: AnimationConfig) {
  const c = { ...defaultConfig, ...config };
  return {
    animation: `anim-fadeIn ${c.duration}ms ${c.easing} ${c.delay}ms ${c.fillMode}`,
  };
}

/** Returns a `style` object for a slide-in animation. */
export function slideInStyle(
  direction: "up" | "down" | "left" | "right" = "up",
  config?: AnimationConfig,
) {
  const c = { ...defaultConfig, ...config };
  const name = `anim-slideIn-${direction}`;
  return {
    animation: `${name} ${c.duration}ms ${c.easing} ${c.delay}ms ${c.fillMode}`,
  };
}

/** Returns a `style` object for a scale animation. */
export function scaleStyle(config?: AnimationConfig) {
  const c = { ...defaultConfig, ...config };
  return {
    animation: `anim-scale ${c.duration}ms ${c.easing} ${c.delay}ms ${c.fillMode}`,
  };
}

// ---------------------------------------------------------------------------
// Stagger helper
// ---------------------------------------------------------------------------

export type StaggerOptions = {
  /** Total number of children to stagger. */
  count: number;
  /** Delay between each child in ms. Default 50. */
  step?: number;
  /** Base animation duration per child in ms. Default 300. */
  duration?: number;
  easing?: string;
};

/**
 * Returns an array of `style` objects, one per child, each with a
 * progressively increasing animation-delay so items cascade in.
 *
 * Usage:
 *   const styles = staggerChildrenStyle({ count: items.length });
 *   items.map((item, i) => <div style={styles[i]} key={i}>…</div>)
 */
export function staggerChildrenStyle(options: StaggerOptions) {
  const {
    count,
    step = 50,
    duration = 300,
    easing = "cubic-bezier(0.4, 0, 0.2, 1)",
  } = options;

  return Array.from({ length: count }, (_, i) => ({
    animation: `anim-fadeIn ${duration}ms ${easing} ${i * step}ms both`,
    opacity: 0,
  }));
}

/**
 * Returns CSS class names for a stagger child at the given index.
 * Works together with the `@keyframes` defined in globals.css.
 */
export function staggerChild(index: number, options?: { step?: number }) {
  const step = options?.step ?? 50;
  return cn("animate-in fade-in", `delay-${index * step}`);
}

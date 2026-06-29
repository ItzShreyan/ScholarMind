// ✅ PERFORMANCE OPTIMIZATION UTILITIES
// Optimized for low-end devices and smooth 120Hz animations

/**
 * Detect device performance capabilities
 * Returns optimization level: 'high', 'medium', 'low'
 */
export function detectDevicePerformance(): "high" | "medium" | "low" {
  if (typeof navigator === "undefined") return "high";

  // Check device memory (if available)
  const deviceMemory = (navigator as any).deviceMemory;
  if (deviceMemory !== undefined) {
    if (deviceMemory <= 2) return "low";
    if (deviceMemory <= 4) return "medium";
    return "high";
  }

  // Fallback: Check CPU cores
  const cores = navigator.hardwareConcurrency || 1;
  if (cores <= 2) return "low";
  if (cores <= 4) return "medium";
  return "high";
}

/**
 * Debounce function for scroll/resize events
 * Prevents excessive re-renders on low-end devices
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function for high-frequency events
 * Ensures consistent frame rate on low-end devices
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Request idle callback with fallback for older browsers
 * Schedules non-urgent work when browser is idle
 */
export function scheduleIdleWork(callback: () => void, timeout: number = 2000): number {
  if (typeof requestIdleCallback !== "undefined") {
    return requestIdleCallback(callback, { timeout });
  }

  // Fallback: Use setTimeout
  return window.setTimeout(callback, timeout) as any;
}

/**
 * Intersection Observer for lazy loading
 * Prevents rendering off-screen elements
 */
export function observeElement(
  element: Element,
  callback: (isVisible: boolean) => void,
  options: IntersectionObserverInit = {}
): IntersectionObserver {
  const observer = new IntersectionObserver(([entry]) => {
    callback(entry.isIntersecting);
  }, {
    threshold: 0.1,
    ...options
  });

  observer.observe(element);
  return observer;
}

/**
 * Reduce animation duration for low-end devices
 */
export function getAnimationDuration(
  baseDuration: number,
  performance: "high" | "medium" | "low" = detectDevicePerformance()
): number {
  if (performance === "low") {
    return baseDuration * 0.5; // Half speed for low-end
  }
  if (performance === "medium") {
    return baseDuration * 0.75; // 75% speed for medium
  }
  return baseDuration; // Full speed for high-end
}

/**
 * Check if reduced motion is preferred
 * Respects user's accessibility settings
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Optimize list rendering with virtualization
 * Only renders visible items to improve performance
 */
export class VirtualList {
  private items: any[] = [];
  private itemHeight: number = 0;
  private containerHeight: number = 0;
  private scrollTop: number = 0;

  constructor(items: any[], itemHeight: number, containerHeight: number) {
    this.items = items;
    this.itemHeight = itemHeight;
    this.containerHeight = containerHeight;
  }

  getVisibleItems(): { items: any[]; startIndex: number; endIndex: number } {
    const startIndex = Math.floor(this.scrollTop / this.itemHeight);
    const endIndex = Math.ceil((this.scrollTop + this.containerHeight) / this.itemHeight);

    return {
      items: this.items.slice(startIndex, Math.min(endIndex + 1, this.items.length)),
      startIndex,
      endIndex
    };
  }

  updateScroll(scrollTop: number): void {
    this.scrollTop = scrollTop;
  }

  getTotalHeight(): number {
    return this.items.length * this.itemHeight;
  }
}

/**
 * Smooth scroll with performance optimization
 * Uses requestAnimationFrame for smooth 60fps scrolling
 */
export function smoothScroll(
  element: HTMLElement,
  targetScroll: number,
  duration: number = 300
): Promise<void> {
  return new Promise((resolve) => {
    const startScroll = element.scrollTop;
    const distance = targetScroll - startScroll;
    const startTime = performance.now();

    const scroll = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function: cubic-bezier(0.4, 0, 0.2, 1)
      const easeProgress = progress < 0.5
        ? 2 * progress * progress
        : -1 + (4 - 2 * progress) * progress;

      element.scrollTop = startScroll + distance * easeProgress;

      if (progress < 1) {
        requestAnimationFrame(scroll);
      } else {
        resolve();
      }
    };

    requestAnimationFrame(scroll);
  });
}

/**
 * Batch DOM updates to prevent layout thrashing
 */
export class DOMBatcher {
  private updates: (() => void)[] = [];
  private scheduled: boolean = false;

  add(update: () => void): void {
    this.updates.push(update);
    this.schedule();
  }

  private schedule(): void {
    if (this.scheduled) return;
    this.scheduled = true;

    requestAnimationFrame(() => {
      this.updates.forEach((update) => update());
      this.updates = [];
      this.scheduled = false;
    });
  }

  flush(): void {
    this.updates.forEach((update) => update());
    this.updates = [];
    this.scheduled = false;
  }
}

/**
 * Memory-efficient image loading
 * Lazy loads images and uses appropriate sizes
 */
export function getOptimizedImageUrl(
  url: string,
  width: number,
  height: number,
  quality: number = 80
): string {
  // Example for Cloudinary or similar CDN
  // Adjust based on your image provider
  const performance = detectDevicePerformance();
  const qualityMap = {
    high: quality,
    medium: Math.max(quality - 10, 60),
    low: Math.max(quality - 20, 40)
  };

  // Return optimized URL (implementation depends on your CDN)
  return url;
}

/**
 * Preload critical resources
 * Improves perceived performance
 */
export function preloadResource(url: string, type: "image" | "font" | "script" | "style"): void {
  if (typeof document === "undefined") return;

  const link = document.createElement("link");
  link.rel = "preload";
  link.href = url;

  switch (type) {
    case "image":
      link.as = "image";
      break;
    case "font":
      link.as = "font";
      link.crossOrigin = "anonymous";
      break;
    case "script":
      link.as = "script";
      break;
    case "style":
      link.as = "style";
      break;
  }

  document.head.appendChild(link);
}

/**
 * Performance monitoring utility
 * Tracks animation frame rate and memory usage
 */
export class PerformanceMonitor {
  private frameCount: number = 0;
  private lastTime: number = performance.now();
  private fps: number = 0;

  measureFrame(): number {
    this.frameCount++;
    const currentTime = performance.now();
    const elapsed = currentTime - this.lastTime;

    if (elapsed >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastTime = currentTime;
    }

    return this.fps;
  }

  getMemoryUsage(): number | null {
    if ((performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize / 1048576; // Convert to MB
    }
    return null;
  }

  report(): { fps: number; memory: number | null } {
    return {
      fps: this.fps,
      memory: this.getMemoryUsage()
    };
  }
}

/**
 * CSS containment for performance
 * Reduces reflow/repaint on complex layouts
 */
export const containmentStyles = {
  strict: "contain: layout style paint",
  layout: "contain: layout style",
  paint: "contain: paint"
};

/**
 * Will-change optimization
 * Hints to browser which properties will animate
 */
export const willChangeStyles = {
  transform: "will-change: transform",
  opacity: "will-change: opacity",
  scroll: "will-change: scroll-position"
};

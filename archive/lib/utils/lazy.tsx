"use client";

/**
 * Lazy Loading Utilities
 *
 * Provides utilities for code splitting and lazy loading of React components.
 * Includes dynamic import helpers, loading skeletons, and prefetch strategies.
 *
 * @module lib/utils/lazy
 */

import dynamic, { type Loader } from "next/dynamic";
import type { ComponentType, ReactNode } from "react";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Options for creating a lazy-loaded component
 */
export type LazyComponentOptions<_P> = {
    /** Show loading fallback during load */
    loading?: () => ReactNode;
    /** Disable SSR for client-only components */
    ssr?: boolean;
};

/**
 * Options for module preloading
 */
export type PreloadOptions = {
    /** Delay before preloading (ms) */
    delay?: number;
    /** Only preload on interaction (hover, focus) */
    onInteraction?: boolean;
};

// =============================================================================
// LOADING SKELETONS
// =============================================================================

/**
 * Generic loading skeleton for lazy-loaded components
 */
export function LoadingSkeleton({
    className = "",
    lines = 3,
}: {
    className?: string;
    lines?: number;
}) {
    return (
        <div className={`animate-pulse space-y-2 ${className}`}>
            {Array.from({ length: lines }).map((_, i) => (
                <div
                    className="h-4 rounded bg-muted"
                    key={i}
                    style={{ width: `${100 - i * 15}%` }}
                />
            ))}
        </div>
    );
}

/**
 * Editor loading skeleton with code-like appearance
 */
export function EditorSkeleton({ className = "" }: { className?: string }) {
    return (
        <div
            className={`not-prose relative w-full pb-[calc(80dvh)] text-sm ${className}`}
        >
            <div className="animate-pulse space-y-2 p-4">
                <div className="h-4 w-3/4 rounded bg-muted" />
                <div className="h-4 w-1/2 rounded bg-muted" />
                <div className="h-4 w-5/6 rounded bg-muted" />
                <div className="h-4 w-2/3 rounded bg-muted" />
                <div className="h-4 w-4/5 rounded bg-muted" />
            </div>
        </div>
    );
}

/**
 * Card-style loading skeleton
 */
export function CardSkeleton({ className = "" }: { className?: string }) {
    return (
        <div
            className={`animate-pulse rounded-lg border bg-card p-4 ${className}`}
        >
            <div className="mb-4 h-5 w-1/3 rounded bg-muted" />
            <div className="space-y-2">
                <div className="h-4 w-full rounded bg-muted" />
                <div className="h-4 w-4/5 rounded bg-muted" />
            </div>
        </div>
    );
}

// =============================================================================
// LAZY LOADING UTILITIES
// =============================================================================

/**
 * Create a lazy-loaded component with next/dynamic
 *
 * @example
 * ```tsx
 * const LazyCodeBlock = lazyComponent(
 *   () => import('@/components/ai-elements/code-block').then(m => m.CodeBlock),
 *   { ssr: false, loading: () => <EditorSkeleton /> }
 * );
 * ```
 */
export function lazyComponent<P extends object>(
    loader: Loader<P>,
    options: LazyComponentOptions<P> = {}
): ComponentType<P> {
    const { loading, ssr = true } = options;

    // Turbopack requires dynamic() options to be handled with explicit paths
    // Return a wrapper that uses dynamic with inline options based on the flags
    if (loading && !ssr) {
        return dynamic(loader, { ssr: false, loading });
    }
    if (loading) {
        return dynamic(loader, { ssr: true, loading });
    }
    if (!ssr) {
        return dynamic(loader, { ssr: false });
    }
    return dynamic(loader, { ssr: true });
}

/**
 * Create a lazy-loaded component that only loads on client
 *
 * @example
 * ```tsx
 * const ClientOnlyCanvas = clientOnlyComponent(
 *   () => import('@/components/ai-elements/canvas').then(m => m.Canvas)
 * );
 * ```
 */
export function clientOnlyComponent<P extends object>(
    loader: Loader<P>,
    loading?: () => ReactNode
): ComponentType<P> {
    // Use inline object literal for Turbopack compatibility
    if (loading) {
        return dynamic(loader, { ssr: false, loading });
    }
    return dynamic(loader, { ssr: false });
}

// =============================================================================
// PRELOADING UTILITIES
// =============================================================================

/** Cache for preloaded modules */
const preloadedModules = new Set<string>();

/**
 * Preload a module without rendering it
 *
 * @example
 * ```tsx
 * // Preload on hover
 * <button onMouseEnter={() => preloadModule(() => import('./HeavyComponent'))}>
 *   Open
 * </button>
 * ```
 */
export function preloadModule(loader: () => Promise<unknown>): void {
    const key = loader.toString();
    if (!preloadedModules.has(key)) {
        preloadedModules.add(key);
        // Execute import in background
        loader().catch(() => {
            // Remove from cache if preload fails so it can be retried
            preloadedModules.delete(key);
        });
    }
}

/**
 * Create a preloader function that triggers on interaction
 *
 * @example
 * ```tsx
 * const preloadEditor = createPreloader(() => import('./Editor'));
 *
 * <button
 *   onMouseEnter={preloadEditor}
 *   onFocus={preloadEditor}
 *   onClick={handleClick}
 * >
 *   Open Editor
 * </button>
 * ```
 */
export function createPreloader(
    loader: () => Promise<unknown>,
    options: PreloadOptions = {}
): () => void {
    const { delay = 0 } = options;

    let preloaded = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    return () => {
        if (preloaded) {
            return;
        }

        if (delay > 0) {
            if (!timeoutId) {
                timeoutId = setTimeout(() => {
                    preloadModule(loader);
                    preloaded = true;
                }, delay);
            }
        } else {
            preloadModule(loader);
            preloaded = true;
        }
    };
}

/**
 * Preload multiple modules in parallel
 *
 * @example
 * ```tsx
 * // Preload when user is likely to navigate
 * useEffect(() => {
 *   preloadModules([
 *     () => import('./SettingsPage'),
 *     () => import('./ProfilePage'),
 *   ]);
 * }, []);
 * ```
 */
export function preloadModules(loaders: Array<() => Promise<unknown>>): void {
    for (const loader of loaders) {
        preloadModule(loader);
    }
}

// =============================================================================
// IMAGE OPTIMIZATION UTILITIES
// =============================================================================

/**
 * Generate a tiny placeholder for images using CSS
 */
export function generatePlaceholder(
    width: number,
    height: number
): { width: number; height: number; blurDataURL: string } {
    // Create a tiny SVG placeholder
    const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#e5e7eb"/>
    </svg>
  `;
    const base64 = Buffer.from(svg).toString("base64");

    return {
        width,
        height,
        blurDataURL: `data:image/svg+xml;base64,${base64}`,
    };
}

/**
 * Shimmer effect placeholder for images
 */
export function shimmerPlaceholder(
    width: number,
    height: number
): { width: number; height: number; blurDataURL: string } {
    const shimmer = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="shimmer">
          <stop offset="0%" stop-color="#f3f4f6">
            <animate attributeName="offset" values="-2; 1" dur="2s" repeatCount="indefinite"/>
          </stop>
          <stop offset="50%" stop-color="#e5e7eb">
            <animate attributeName="offset" values="-1; 2" dur="2s" repeatCount="indefinite"/>
          </stop>
          <stop offset="100%" stop-color="#f3f4f6">
            <animate attributeName="offset" values="0; 3" dur="2s" repeatCount="indefinite"/>
          </stop>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#shimmer)"/>
    </svg>
  `;
    const base64 = Buffer.from(shimmer).toString("base64");

    return {
        width,
        height,
        blurDataURL: `data:image/svg+xml;base64,${base64}`,
    };
}

// =============================================================================
// INTERSECTION OBSERVER LAZY LOADING
// =============================================================================

/**
 * Options for intersection-based lazy loading
 */
export type LazyLoadOptions = {
    /** Root margin for intersection observer */
    rootMargin?: string;
    /** Threshold for triggering load */
    threshold?: number;
};

/**
 * Check if Intersection Observer is supported
 */
export function supportsIntersectionObserver(): boolean {
    return typeof IntersectionObserver !== "undefined";
}

/**
 * Create an intersection observer for lazy loading
 * Returns a cleanup function
 *
 * @example
 * ```tsx
 * useEffect(() => {
 *   const cleanup = observeElement(ref.current, () => {
 *     setIsVisible(true);
 *   });
 *   return cleanup;
 * }, []);
 * ```
 */
export function observeElement(
    element: Element | null,
    onIntersect: () => void,
    options: LazyLoadOptions = {}
): () => void {
    if (!element || !supportsIntersectionObserver()) {
        // Fall back to immediate loading
        onIntersect();
        return () => {};
    }

    const { rootMargin = "100px", threshold = 0 } = options;

    const observer = new IntersectionObserver(
        (entries) => {
            for (const entry of entries) {
                if (entry.isIntersecting) {
                    onIntersect();
                    observer.disconnect();
                    break;
                }
            }
        },
        { rootMargin, threshold }
    );

    observer.observe(element);

    return () => observer.disconnect();
}

/**
 * Lazy Loading Utilities
 *
 * Utilities for lazy loading heavy components with loading skeletons.
 * Used by ai-elements/lazy.tsx for dynamic imports.
 *
 * @module lib/utils/lazy
 */

import type { JSX } from "react"

/**
 * Editor skeleton component for lazy-loaded code editors.
 * Displays a placeholder while the editor is being loaded.
 */
export function EditorSkeleton(): JSX.Element {
	return (
		<div className="flex h-64 w-full items-center justify-center rounded-md border bg-muted">
			<div className="space-y-2">
				<div className="h-4 w-48 animate-pulse rounded bg-muted-foreground/20" />
				<div className="h-4 w-32 animate-pulse rounded bg-muted-foreground/20" />
			</div>
		</div>
	)
}

/**
 * Loading skeleton component for general lazy-loaded content.
 * Displays animated placeholder lines while content is loading.
 *
 * @param lines - Number of skeleton lines to display (default: 3)
 */
export function LoadingSkeleton({
	lines = 3,
}: {
	lines?: number
}): JSX.Element {
	return (
		<div className="space-y-2">
			{Array.from({ length: lines }).map((_, i) => (
				<div
					// biome-ignore lint/suspicious/noArrayIndexKey: Static array, index is stable
					key={i}
					className="h-4 animate-pulse rounded bg-muted-foreground/20"
					style={{ width: `${Math.random() * 40 + 60}%` }}
				/>
			))}
		</div>
	)
}

/**
 * Creates a preloader function for hover-based module loading.
 * Returns a function that triggers module import when called.
 *
 * @param importFn - Dynamic import function for the module
 * @returns Preloader function
 */
export function createPreloader(importFn: () => Promise<unknown>): () => void {
	return () => {
		importFn().catch(() => {
			// Preload failed silently - will be retried on actual import
		})
	}
}

/**
 * Triggers a module preload by importing it.
 * Useful for warming up caches on hover/focus.
 *
 * @param importFn - Dynamic import function for the module
 */
export function preloadModule(importFn: () => Promise<unknown>): void {
	importFn().catch(() => {
		// Preload failed silently - will be retried on actual import
	})
}

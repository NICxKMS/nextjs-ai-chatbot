/**
 * Lazy-loaded AI Elements
 *
 * Pre-configured dynamically imported versions of heavy AI element components.
 * Use these when components are not immediately visible to reduce initial bundle.
 *
 * @module components/ai-elements/lazy
 */

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { LoadingSkeleton, EditorSkeleton } from "@/lib/utils/lazy";

// =============================================================================
// LAZY CODE BLOCK
// =============================================================================

/**
 * Lazy-loaded CodeBlock component.
 * Shiki syntax highlighting is loaded on demand.
 */
export const LazyCodeBlock = dynamic(
    () => import("./code-block").then((m) => m.CodeBlock),
    {
        ssr: false,
        loading: () => <EditorSkeleton />,
    }
);

/**
 * Lazy-loaded CodeBlockCopyButton component.
 */
export const LazyCodeBlockCopyButton = dynamic(
    () => import("./code-block").then((m) => m.CodeBlockCopyButton),
    { ssr: false }
);

// =============================================================================
// LAZY CANVAS (ReactFlow)
// =============================================================================

/**
 * Lazy-loaded Canvas component with ReactFlow.
 * Heavy dependency loaded only when needed.
 */
export const LazyCanvas = dynamic(
    () => import("./canvas").then((m) => m.Canvas),
    {
        ssr: false,
        loading: () => (
            <div className="flex h-full w-full items-center justify-center bg-sidebar">
                <LoadingSkeleton lines={1} />
            </div>
        ),
    }
);

// =============================================================================
// LAZY WEB PREVIEW
// =============================================================================

/**
 * Lazy-loaded WebPreview component.
 * Deferred loading for non-critical iframe-based preview.
 */
export const LazyWebPreview = dynamic(
    () => import("./web-preview").then((m) => m.WebPreview),
    {
        ssr: false,
        loading: () => (
            <div className="flex h-64 w-full items-center justify-center rounded-lg border bg-card">
                <LoadingSkeleton lines={2} />
            </div>
        ),
    }
);

// =============================================================================
// LAZY REASONING
// =============================================================================

/**
 * Lazy-loaded Reasoning components.
 * Collapsible thinking/reasoning display loaded on demand.
 */
export const LazyReasoning = dynamic(
    () => import("./reasoning").then((m) => m.Reasoning),
    { ssr: false }
);

export const LazyReasoningTrigger = dynamic(
    () => import("./reasoning").then((m) => m.ReasoningTrigger),
    { ssr: false }
);

export const LazyReasoningContent = dynamic(
    () => import("./reasoning").then((m) => m.ReasoningContent),
    { ssr: false }
);

// =============================================================================
// RE-EXPORTS FOR CONVENIENCE
// =============================================================================

// Export preloaders for hover-based loading
export { preloadModule, createPreloader } from "@/lib/utils/lazy";

/**
 * Preloader functions for triggering module load on hover/focus
 */
export const preloaders = {
    codeBlock: () => import("./code-block"),
    canvas: () => import("./canvas"),
    webPreview: () => import("./web-preview"),
    reasoning: () => import("./reasoning"),
} as const;

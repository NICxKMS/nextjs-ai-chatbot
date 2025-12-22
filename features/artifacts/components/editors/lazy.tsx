/**
 * Lazy-loaded Artifact Editors
 *
 * Pre-configured dynamically imported versions of artifact editor components.
 * Heavy dependencies (CodeMirror, TipTap, etc.) are loaded on demand.
 *
 * @module features/artifacts/components/editors/lazy
 */

import dynamic from "next/dynamic";
import { EditorSkeleton } from "@/lib/utils/lazy";

// =============================================================================
// EDITOR LOADING STATES
// =============================================================================

/**
 * Shared loading skeleton for all editors
 */
function EditorLoadingSkeleton() {
    return <EditorSkeleton className="min-h-[400px]" />;
}

/**
 * Sheet editor loading state
 */
function SheetLoadingSkeleton() {
    return (
        <div className="animate-pulse p-4">
            <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: 25 }).map((_, i) => (
                    <div
                        // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton
                        key={i}
                        className="h-8 rounded bg-muted"
                    />
                ))}
            </div>
        </div>
    );
}

// =============================================================================
// LAZY EDITORS
// =============================================================================

/**
 * Lazy-loaded CodeEditor with CodeMirror.
 * Heavy dependency (CodeMirror, language support) loaded on demand.
 */
export const LazyCodeEditor = dynamic(
    () => import("./code-editor").then((m) => m.CodeEditor),
    {
        ssr: false,
        loading: EditorLoadingSkeleton,
    }
);

/**
 * Lazy-loaded TextEditor with TipTap.
 * Heavy dependency (TipTap, ProseMirror) loaded on demand.
 */
export const LazyTextEditor = dynamic(
    () => import("./text-editor").then((m) => m.TextEditor),
    {
        ssr: false,
        loading: EditorLoadingSkeleton,
    }
);

/**
 * Lazy-loaded DiffView with TipTap.
 * Heavy dependency (TipTap, diff-match-patch) loaded on demand.
 */
export const LazyDiffView = dynamic(
    () => import("./diff-view").then((m) => m.DiffView),
    {
        ssr: false,
        loading: EditorLoadingSkeleton,
    }
);

/**
 * Lazy-loaded SheetEditor with react-data-grid.
 * Heavy dependency (react-data-grid) loaded on demand.
 */
export const LazySheetEditor = dynamic(
    () => import("./sheet-editor").then((m) => m.SheetEditor),
    {
        ssr: false,
        loading: SheetLoadingSkeleton,
    }
);

/**
 * ImageEditor doesn't have heavy dependencies, but lazy load for consistency.
 */
export const LazyImageEditor = dynamic(
    () => import("./image-editor").then((m) => m.ImageEditor),
    { ssr: false }
);

/**
 * Console component for code output.
 */
export const LazyConsole = dynamic(
    () => import("./console").then((m) => m.Console),
    { ssr: false }
);

// =============================================================================
// PRELOADERS
// =============================================================================

/**
 * Preloader functions for triggering module load on hover/focus
 */
export const editorPreloaders = {
    codeEditor: () => import("./code-editor"),
    textEditor: () => import("./text-editor"),
    diffView: () => import("./diff-view"),
    sheetEditor: () => import("./sheet-editor"),
    imageEditor: () => import("./image-editor"),
    console: () => import("./console"),
} as const;

/**
 * Preload all editors (useful when navigating to artifact view)
 */
export function preloadAllEditors(): void {
    Object.values(editorPreloaders).forEach((loader) => loader());
}

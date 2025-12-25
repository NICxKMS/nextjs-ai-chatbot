/**
 * Tool Renderer Registry
 *
 * Provides a registry pattern for tool call/result rendering.
 * Features register their tool renderers, chat feature consumes them.
 * This avoids direct cross-feature imports and enables loose coupling.
 *
 * @module shared/services/tool-renderer-registry
 */

"use client";

import type { ComponentType } from "react";
import {
    createContext,
    type PropsWithChildren,
    useContext,
    useMemo,
} from "react";
import type { ArtifactKind } from "@/shared/types";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Document operation type.
 */
export type DocumentOperationType = "create" | "update" | "request-suggestions";

/**
 * Document-specific tool call props.
 * Uses union type for type-safe args based on operation type.
 */
export interface DocumentToolCallProps {
    type: DocumentOperationType;
    args:
        | { title: string; kind: ArtifactKind }
        | { id: string; description: string }
        | { documentId: string };
    isReadonly?: boolean;
}

/**
 * Document-specific preview props.
 */
export interface DocumentPreviewProps {
    result?: {
        id?: string;
        title?: string;
        kind?: string;
    };
    args?: {
        title?: string;
        kind?: string;
        id?: string;
    };
    isReadonly?: boolean;
}

/**
 * Document-specific tool result props.
 */
export interface DocumentToolResultProps {
    type: DocumentOperationType;
    result: {
        id: string;
        title: string;
        kind: ArtifactKind;
    };
    isReadonly?: boolean;
}

/**
 * Tool renderer registration.
 */
export interface ToolRenderers {
    /** Render a document tool call (create/update/request-suggestions) */
    DocumentToolCall?: ComponentType<DocumentToolCallProps>;
    /** Render a document preview */
    DocumentPreview?: ComponentType<DocumentPreviewProps>;
    /** Render a document tool result */
    DocumentToolResult?: ComponentType<DocumentToolResultProps>;
}

// =============================================================================
// CONTEXT
// =============================================================================

const ToolRendererContext = createContext<ToolRenderers>({});

/**
 * Hook to access registered tool renderers.
 */
export function useToolRenderers(): ToolRenderers {
    return useContext(ToolRendererContext);
}

// =============================================================================
// PROVIDER
// =============================================================================

interface ToolRendererProviderProps extends PropsWithChildren {
    /** Tool renderers to register */
    renderers: ToolRenderers;
}

/**
 * Provider for tool renderer registry.
 * Wrap the app or chat section to provide tool renderers.
 *
 * @example
 * ```tsx
 * import { DocumentToolCall, DocumentPreview, DocumentToolResult } from '@/features/documents';
 *
 * <ToolRendererProvider renderers={{
 *   DocumentToolCall,
 *   DocumentPreview,
 *   DocumentToolResult,
 * }}>
 *   <ChatMessages />
 * </ToolRendererProvider>
 * ```
 */
export function ToolRendererProvider({
    renderers,
    children,
}: ToolRendererProviderProps) {
    const value = useMemo(() => renderers, [renderers]);
    return (
        <ToolRendererContext.Provider value={value}>
            {children}
        </ToolRendererContext.Provider>
    );
}

// =============================================================================
// FALLBACK RENDERERS
// =============================================================================

/**
 * Fallback renderer when no tool renderer is registered.
 */
export function FallbackToolRenderer({
    toolName,
    className,
}: {
    toolName: string;
    className?: string;
}) {
    return (
        <div
            className={`rounded-lg border bg-muted/50 p-4 text-muted-foreground ${className ?? ""}`}
        >
            <span className="text-sm">Tool: {toolName}</span>
        </div>
    );
}

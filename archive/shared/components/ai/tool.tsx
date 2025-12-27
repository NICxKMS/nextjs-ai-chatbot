"use client";

import type { ToolUIPart } from "ai";
import type { ReactNode } from "react";
import { useCallback, useState } from "react";
import {
    Tool as BaseTool,
    type ToolProps as BaseToolProps,
    ToolOutput,
    type ToolOutputProps,
} from "@/components/ai-elements/tool";

export {
    Tool as BaseTool,
    ToolContent,
    type ToolContentProps,
    ToolHeader,
    type ToolHeaderProps,
    ToolInput,
    type ToolInputProps,
    ToolOutput,
    type ToolOutputProps,
    type ToolProps as BaseToolProps,
} from "@/components/ai-elements/tool";

/**
 * Custom tool result renderer type
 */
export type ToolResultRenderer = (output: ToolUIPart["output"]) => ReactNode;

/**
 * Map of tool names to custom renderers
 */
export type ToolRendererMap = Record<string, ToolResultRenderer>;

/**
 * Extended tool props with custom rendering and state persistence
 */
export interface EnhancedToolProps extends BaseToolProps {
    /** Tool name for custom rendering lookup */
    toolName?: string;
    /** Custom renderers for specific tool types */
    customRenderers?: ToolRendererMap;
    /** Persist collapsed state using this key */
    persistKey?: string;
    /** Called when collapsed state changes */
    onOpenChange?: (open: boolean) => void;
    /** Default open state */
    defaultOpen?: boolean;
}

// Simple in-memory storage for collapsed state persistence
// Limit to prevent memory leaks in long-running sessions
const MAX_PERSISTED_STATES = 100;
const collapsedStateStorage = new Map<string, boolean>();

/** LRU-style cleanup when storage limit is reached */
function setCollapsedState(key: string, value: boolean): void {
    // If at limit and adding new key, remove oldest entry (first in Map)
    if (
        !collapsedStateStorage.has(key) &&
        collapsedStateStorage.size >= MAX_PERSISTED_STATES
    ) {
        const oldestKey = collapsedStateStorage.keys().next().value;
        if (oldestKey) {
            collapsedStateStorage.delete(oldestKey);
        }
    }
    collapsedStateStorage.set(key, value);
}

/**
 * Enhanced Tool wrapper with custom rendering and state persistence.
 * Supports custom result renderers for specific tool types (e.g., DocumentToolCall, Weather).
 */
export function Tool({
    toolName,
    customRenderers,
    persistKey,
    onOpenChange,
    defaultOpen,
    ...props
}: EnhancedToolProps) {
    // Restore persisted state if available
    const getInitialOpen = () => {
        if (persistKey && collapsedStateStorage.has(persistKey)) {
            return (
                collapsedStateStorage.get(persistKey) ?? defaultOpen ?? false
            );
        }
        return defaultOpen ?? false;
    };

    const [open, setOpen] = useState(getInitialOpen);

    const handleOpenChange = useCallback(
        (newOpen: boolean) => {
            setOpen(newOpen);
            if (persistKey) {
                setCollapsedState(persistKey, newOpen);
            }
            onOpenChange?.(newOpen);
        },
        [persistKey, onOpenChange]
    );

    return <BaseTool onOpenChange={handleOpenChange} open={open} {...props} />;
}

/**
 * Extended ToolOutput with custom rendering support
 */
export interface EnhancedToolOutputProps extends ToolOutputProps {
    /** Tool name for renderer lookup */
    toolName?: string;
    /** Custom renderers map */
    customRenderers?: ToolRendererMap;
}

/**
 * Enhanced ToolOutput that supports custom renderers for specific tool types.
 */
export const EnhancedToolOutput = ({
    toolName,
    customRenderers,
    output,
    ...props
}: EnhancedToolOutputProps) => {
    // Check for custom renderer
    if (toolName && customRenderers?.[toolName] && output) {
        const customContent = customRenderers[toolName](output);
        if (customContent) {
            return <div className="p-4">{customContent}</div>;
        }
    }

    return <ToolOutput output={output} {...props} />;
};

/**
 * Built-in renderer for document tool calls
 */
export const documentToolRenderer: ToolResultRenderer = (output) => {
    if (!output || typeof output !== "object") {
        return null;
    }
    const doc = output as { title?: string; content?: string; id?: string };

    return (
        <div className="rounded-md border bg-muted/50 p-3">
            {doc.title && (
                <h4 className="mb-2 font-medium text-sm">{doc.title}</h4>
            )}
            {doc.content && (
                <p className="line-clamp-3 text-muted-foreground text-sm">
                    {doc.content}
                </p>
            )}
        </div>
    );
};

/**
 * Built-in renderer for weather tool calls
 */
export const weatherToolRenderer: ToolResultRenderer = (output) => {
    if (!output || typeof output !== "object") {
        return null;
    }
    const weather = output as {
        temperature?: number;
        condition?: string;
        location?: string;
    };

    return (
        <div className="flex items-center gap-3 rounded-md border bg-muted/50 p-3">
            <div className="text-3xl">
                {weather.condition?.toLowerCase().includes("sun") ? "☀️" : "🌤️"}
            </div>
            <div>
                {weather.location && (
                    <p className="font-medium text-sm">{weather.location}</p>
                )}
                {weather.temperature !== undefined && (
                    <p className="text-muted-foreground text-sm">
                        {weather.temperature}°
                    </p>
                )}
            </div>
        </div>
    );
};

/**
 * Default custom renderers map
 */
export const defaultToolRenderers: ToolRendererMap = {
    getDocumentContent: documentToolRenderer,
    createDocument: documentToolRenderer,
    updateDocument: documentToolRenderer,
    getWeather: weatherToolRenderer,
};

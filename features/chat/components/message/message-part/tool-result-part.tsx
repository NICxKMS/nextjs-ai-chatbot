/**
 * Tool Result Part Component
 *
 * Renders tool execution results with expandable output.
 * P3-017: Uses type guards instead of type assertions for safety.
 *
 * @module features/chat/components/message/message-part/tool-result-part
 */

"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { FallbackToolRenderer, useToolRenderers } from "@/shared/services";
import type { ArtifactKind } from "@/shared/types";
import type { ToolResultPart } from "../../../types";
import { Weather, type WeatherAtLocation } from "../../weather";
import { isDocumentResult, isDocumentTool, isWeatherTool } from "./helpers";
import { AlertCircleIcon, CheckCircleIcon, ChevronDownIcon } from "./icons";

// =============================================================================
// TYPE GUARDS (P3-017: Replace type assertions with type guards)
// =============================================================================

/**
 * Type guard for checking if a value is a non-null object.
 */
function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Type guard for weather result error.
 */
function isWeatherError(
    result: unknown
): result is { error: string | unknown } {
    return isObject(result) && "error" in result;
}

/**
 * Type guard for WeatherAtLocation shape.
 * Validates the essential properties needed by Weather component.
 */
function isWeatherAtLocation(result: unknown): result is WeatherAtLocation {
    if (!isObject(result)) {
        return false;
    }

    // Check required top-level properties
    const hasLatLong =
        typeof result.latitude === "number" &&
        typeof result.longitude === "number";
    if (!hasLatLong) {
        return false;
    }

    // Check current object
    if (!isObject(result.current)) {
        return false;
    }
    const current = result.current;
    if (
        typeof current.time !== "string" ||
        typeof current.temperature_2m !== "number"
    ) {
        return false;
    }

    // Check current_units object
    if (!isObject(result.current_units)) {
        return false;
    }
    const currentUnits = result.current_units;
    if (typeof currentUnits.temperature_2m !== "string") {
        return false;
    }

    // Check hourly object
    if (!isObject(result.hourly)) {
        return false;
    }
    const hourly = result.hourly;
    if (!Array.isArray(hourly.time) || !Array.isArray(hourly.temperature_2m)) {
        return false;
    }

    // Check daily object
    if (!isObject(result.daily)) {
        return false;
    }
    const daily = result.daily;
    if (!Array.isArray(daily.sunrise) || !Array.isArray(daily.sunset)) {
        return false;
    }

    return true;
}

/**
 * Type guard for ArtifactKind.
 */
function isArtifactKind(value: unknown): value is ArtifactKind {
    return (
        typeof value === "string" &&
        ["text", "code", "image", "sheet"].includes(value)
    );
}

export type ToolResultPartViewProps = ToolResultPart & {
    isReadonly?: boolean;
    className?: string;
};

/**
 * Renders a tool result display.
 * For document tools, renders DocumentPreview or DocumentToolResult via registry.
 * For weather tool, renders Weather component.
 */
export function ToolResultPartView({
    toolCallId,
    toolName,
    result,
    isError,
    isReadonly,
    className,
}: ToolResultPartViewProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const { DocumentPreview, DocumentToolResult } = useToolRenderers();

    // Handle weather tool results (P3-017: using type guards)
    if (isWeatherTool(toolName)) {
        // Check for error in result using type guard
        if (isWeatherError(result)) {
            return (
                <div
                    className={cn(
                        "rounded-lg border border-red-200 bg-red-50 p-4 text-red-500 dark:border-red-800 dark:bg-red-950/50",
                        className
                    )}
                >
                    Weather Error: {String(result.error)}
                </div>
            );
        }

        // Render Weather component with validated data
        if (isWeatherAtLocation(result)) {
            return <Weather weatherAtLocation={result} />;
        }
    }

    // Handle document tool results specially (P3-018: using type guards)
    if (isDocumentTool(toolName) && isDocumentResult(result)) {
        const resultObj = result;

        // Check for error in result
        if (resultObj.error) {
            return (
                <div
                    className={cn(
                        "rounded-lg border border-red-200 bg-red-50 p-4 text-red-500 dark:border-red-800 dark:bg-red-950/50",
                        className
                    )}
                >
                    Error with document: {String(resultObj.error)}
                </div>
            );
        }

        // For createDocument and updateDocument, show DocumentPreview
        if (toolName === "createDocument" || toolName === "updateDocument") {
            if (DocumentPreview) {
                return (
                    <DocumentPreview
                        isReadonly={isReadonly}
                        result={{
                            id: resultObj.id,
                            title: resultObj.title,
                            kind: resultObj.kind,
                        }}
                    />
                );
            }
            return (
                <FallbackToolRenderer
                    className={className}
                    toolName={toolName}
                />
            );
        }

        // For requestSuggestions, show DocumentToolResult (P3-017: validated with type guard)
        if (
            toolName === "requestSuggestions" &&
            resultObj.id &&
            resultObj.title &&
            isArtifactKind(resultObj.kind)
        ) {
            if (DocumentToolResult) {
                return (
                    <DocumentToolResult
                        isReadonly={isReadonly}
                        result={{
                            id: resultObj.id,
                            title: resultObj.title,
                            kind: resultObj.kind,
                        }}
                        type="request-suggestions"
                    />
                );
            }
            return (
                <FallbackToolRenderer
                    className={className}
                    toolName={toolName}
                />
            );
        }
    }

    // Default tool result display
    return (
        <div
            className={cn(
                "my-2 overflow-hidden rounded-lg border",
                isError
                    ? "border-destructive bg-destructive/10"
                    : "bg-muted/50",
                className
            )}
        >
            <button
                aria-expanded={isExpanded}
                aria-label={`${isExpanded ? "Collapse" : "Expand"} ${toolName} result`}
                className={cn(
                    "flex w-full items-center justify-between gap-2 p-3 text-left transition-colors",
                    isError ? "hover:bg-destructive/20" : "hover:bg-muted/70"
                )}
                onClick={() => setIsExpanded(!isExpanded)}
                type="button"
            >
                <div className="flex items-center gap-2 font-medium text-sm">
                    {isError ? (
                        <AlertCircleIcon className="h-4 w-4 text-destructive" />
                    ) : (
                        <CheckCircleIcon className="h-4 w-4 text-green-600" />
                    )}
                    <span>{toolName} result</span>
                </div>
                <ChevronDownIcon
                    className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform",
                        isExpanded && "rotate-180"
                    )}
                />
            </button>
            {isExpanded && (
                <div className="border-t p-3">
                    <pre className="overflow-x-auto rounded bg-background/50 p-2 text-xs">
                        {typeof result === "string"
                            ? result
                            : JSON.stringify(result, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
}

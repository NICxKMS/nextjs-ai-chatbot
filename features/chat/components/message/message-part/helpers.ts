/**
 * Message Part Helpers
 *
 * Utility functions for message part rendering.
 *
 * @module features/chat/components/message/message-part/helpers
 */

import type { ArtifactKind } from "@/shared/types";
import {
    DOCUMENT_TOOL_NAMES,
    type DocumentToolName,
    WEATHER_TOOL_NAME,
} from "./constants";

// =============================================================================
// TYPE GUARDS FOR TOOL ARGUMENTS
// =============================================================================

/** Valid artifact kinds */
const VALID_ARTIFACT_KINDS = ["text", "code", "image", "sheet"] as const;

/**
 * Type guard for checking if a value is a non-null object.
 *
 * @param value - The unknown value to check
 * @returns `true` if value is a non-null, non-array object
 */
function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Type guard for checking if a value is a string.
 *
 * @param value - The unknown value to check
 * @returns `true` if value is a primitive string
 */
function isString(value: unknown): value is string {
    return typeof value === "string";
}

/**
 * Type guard for checking if a value is a valid ArtifactKind.
 *
 * @param value - The unknown value to check
 * @returns `true` if value is a valid ArtifactKind
 */
function isArtifactKind(value: unknown): value is ArtifactKind {
    return (
        isString(value) && VALID_ARTIFACT_KINDS.includes(value as ArtifactKind)
    );
}

/** Arguments for createDocument tool call */
export interface CreateDocumentArgs {
    title: string;
    kind: ArtifactKind;
}

/** Arguments for updateDocument tool call */
export interface UpdateDocumentArgs {
    id: string;
    description: string;
}

/** Arguments for requestSuggestions tool call */
export interface RequestSuggestionsArgs {
    documentId: string;
}

/** Document result from tool execution */
export interface DocumentResult {
    id?: string;
    title?: string;
    kind?: ArtifactKind;
    error?: string;
}

/**
 * Type guard for createDocument tool arguments.
 *
 * Validates that args contain required `title` (string) and `kind` (ArtifactKind) properties.
 *
 * @param args - The unknown args value to validate
 * @returns `true` if args is valid CreateDocumentArgs; narrows type
 *
 * @example
 * ```ts
 * if (isCreateDocumentArgs(args)) {
 *   console.log(args.title, args.kind); // Safe access
 * }
 * ```
 */
export function isCreateDocumentArgs(
    args: unknown
): args is CreateDocumentArgs {
    return isObject(args) && isString(args.title) && isArtifactKind(args.kind);
}

/**
 * Type guard for updateDocument tool arguments.
 *
 * Validates that args contain required `id` (string) and `description` (string) properties.
 *
 * @param args - The unknown args value to validate
 * @returns `true` if args is valid UpdateDocumentArgs; narrows type
 *
 * @example
 * ```ts
 * if (isUpdateDocumentArgs(args)) {
 *   console.log(args.id, args.description); // Safe access
 * }
 * ```
 */
export function isUpdateDocumentArgs(
    args: unknown
): args is UpdateDocumentArgs {
    return isObject(args) && isString(args.id) && isString(args.description);
}

/**
 * Type guard for requestSuggestions tool arguments.
 *
 * Validates that args contain required `documentId` (string) property.
 *
 * @param args - The unknown args value to validate
 * @returns `true` if args is valid RequestSuggestionsArgs; narrows type
 *
 * @example
 * ```ts
 * if (isRequestSuggestionsArgs(args)) {
 *   console.log(args.documentId); // Safe access
 * }
 * ```
 */
export function isRequestSuggestionsArgs(
    args: unknown
): args is RequestSuggestionsArgs {
    return isObject(args) && isString(args.documentId);
}

/**
 * Type guard for document tool result.
 *
 * Validates that result is an object that may contain id, title, kind, or error fields.
 *
 * @param result - The unknown result value to validate
 * @returns `true` if result is a valid DocumentResult; narrows type
 *
 * @example
 * ```ts
 * if (isDocumentResult(result)) {
 *   console.log(result.id, result.title); // Safe access
 * }
 * ```
 */
export function isDocumentResult(result: unknown): result is DocumentResult {
    if (!isObject(result)) {
        return false;
    }
    // Optional fields - validate types if present
    if ("id" in result && result.id !== undefined && !isString(result.id)) {
        return false;
    }
    if (
        "title" in result &&
        result.title !== undefined &&
        !isString(result.title)
    ) {
        return false;
    }
    if (
        "kind" in result &&
        result.kind !== undefined &&
        !isArtifactKind(result.kind)
    ) {
        return false;
    }
    if (
        "error" in result &&
        result.error !== undefined &&
        !isString(result.error)
    ) {
        return false;
    }
    return true;
}

// =============================================================================
// TOOL NAME GUARDS
// =============================================================================

/**
 * Check if a tool name is a document tool.
 *
 * @param toolName - The tool name to check
 * @returns `true` if toolName is one of the document tools; narrows type to DocumentToolName
 */
export function isDocumentTool(toolName: string): toolName is DocumentToolName {
    return DOCUMENT_TOOL_NAMES.includes(toolName as DocumentToolName);
}

/**
 * Check if a tool name is the weather tool.
 *
 * @param toolName - The tool name to check
 * @returns `true` if toolName is the weather tool
 */
export function isWeatherTool(toolName: string): boolean {
    return toolName === WEATHER_TOOL_NAME;
}

/**
 * Get document operation type from tool name.
 *
 * @param toolName - A validated DocumentToolName
 * @returns The operation type corresponding to the tool
 */
export function getDocumentOperationType(
    toolName: DocumentToolName
): "create" | "update" | "request-suggestions" {
    switch (toolName) {
        case "createDocument":
            return "create";
        case "updateDocument":
            return "update";
        case "requestSuggestions":
            return "request-suggestions";
        default:
            return "create";
    }
}

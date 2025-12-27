/**
 * Tool Call Part Component
 *
 * Renders a tool call invocation display with expandable parameters.
 *
 * @module features/chat/components/message/message-part/tool-call-part
 */

"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { FallbackToolRenderer, useToolRenderers } from "@/shared/services";
import type { ArtifactKind } from "@/shared/types";
import type { ToolCallPart } from "../../../types";
import {
    getDocumentOperationType,
    isCreateDocumentArgs,
    isDocumentTool,
    isRequestSuggestionsArgs,
    isUpdateDocumentArgs,
} from "./helpers";
import { ChevronDownIcon, WrenchIcon } from "./icons";

export type ToolCallPartViewProps = ToolCallPart & {
    isReadonly?: boolean;
    className?: string;
};

/**
 * Renders a tool call invocation display.
 * For document tools, delegates to registered DocumentToolCall component via registry.
 */
export function ToolCallPartView({
    toolCallId,
    toolName,
    args,
    isReadonly,
    className,
}: ToolCallPartViewProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const { DocumentToolCall } = useToolRenderers();

    // Handle document tool calls specially
    if (isDocumentTool(toolName)) {
        const operationType = getDocumentOperationType(toolName);

        // Build args based on tool type using type guards (P3-018)
        let docArgs:
            | { title: string; kind: ArtifactKind }
            | { id: string; description: string }
            | { documentId: string }
            | undefined;

        if (toolName === "createDocument" && isCreateDocumentArgs(args)) {
            docArgs = { title: args.title, kind: args.kind };
        } else if (
            toolName === "updateDocument" &&
            isUpdateDocumentArgs(args)
        ) {
            docArgs = { id: args.id, description: args.description };
        } else if (
            toolName === "requestSuggestions" &&
            isRequestSuggestionsArgs(args)
        ) {
            docArgs = { documentId: args.documentId };
        }

        // Use registered renderer or fallback
        if (DocumentToolCall && docArgs) {
            return (
                <DocumentToolCall
                    args={docArgs}
                    isReadonly={isReadonly}
                    type={operationType}
                />
            );
        }
        return (
            <FallbackToolRenderer className={className} toolName={toolName} />
        );
    }

    return (
        <div
            className={cn(
                "my-2 overflow-hidden rounded-lg border bg-muted/50",
                className
            )}
        >
            <button
                aria-expanded={isExpanded}
                aria-label={`${isExpanded ? "Collapse" : "Expand"} ${toolName} tool details`}
                className="flex w-full items-center justify-between gap-2 p-3 text-left transition-colors hover:bg-muted/70"
                onClick={() => setIsExpanded(!isExpanded)}
                type="button"
            >
                <div className="flex items-center gap-2 font-medium text-sm">
                    <WrenchIcon className="h-4 w-4 text-muted-foreground" />
                    <span>{toolName}</span>
                </div>
                <ChevronDownIcon
                    className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform",
                        isExpanded && "rotate-180"
                    )}
                />
            </button>
            {isExpanded && (
                <div className="border-t bg-muted/30 p-3">
                    <div className="mb-2 text-muted-foreground text-xs uppercase tracking-wide">
                        Parameters
                    </div>
                    <pre className="overflow-x-auto rounded bg-background/50 p-2 text-xs">
                        {JSON.stringify(args, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
}

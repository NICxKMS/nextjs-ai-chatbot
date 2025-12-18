"use client";

import { cn } from "@/lib/utils";
import { useToolbarShortcuts } from "./hooks";
import { ToolbarGroup } from "./toolbar-group";
import { AddAttachmentTool } from "./tools/add-attachment";
import { CreateDocumentTool } from "./tools/create-document";
import { RequestSuggestionsTool } from "./tools/request-suggestions";
import type { ToolbarProps } from "./types";

export function Toolbar({
    tools,
    isLoading,
    className,
    onToolSelect,
}: ToolbarProps) {
    // Default tools if not specified
    const activeTools = tools ?? [
        "add-attachment",
        "create-document",
        "request-suggestions",
    ];

    useToolbarShortcuts([
        {
            key: "u",
            ctrl: true,
            action: () => onToolSelect?.("add-attachment"),
        },
        {
            key: "d",
            ctrl: true,
            shift: true,
            action: () => onToolSelect?.("create-document"),
        },
        {
            key: "s",
            ctrl: true,
            shift: true,
            action: () => onToolSelect?.("request-suggestions"),
        },
    ]);

    return (
        <div
            className={cn(
                "flex items-center gap-1 rounded-lg border p-2",
                className
            )}
        >
            <ToolbarGroup>
                {activeTools.includes("add-attachment") && (
                    <AddAttachmentTool
                        disabled={isLoading}
                        onSelect={() => onToolSelect?.("add-attachment")}
                    />
                )}
                {activeTools.includes("create-document") && (
                    <CreateDocumentTool
                        disabled={isLoading}
                        onSelect={() => onToolSelect?.("create-document")}
                    />
                )}
                {activeTools.includes("request-suggestions") && (
                    <RequestSuggestionsTool
                        disabled={isLoading}
                        onSelect={() => onToolSelect?.("request-suggestions")}
                    />
                )}
            </ToolbarGroup>
        </div>
    );
}

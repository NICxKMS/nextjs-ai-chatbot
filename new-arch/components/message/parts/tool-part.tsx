"use client";

import {
    CheckCircleIcon,
    CircleIcon,
    ClockIcon,
    WrenchIcon,
    XCircleIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

export type ToolState =
    | "input-streaming"
    | "input-available"
    | "output-available"
    | "output-error";

export type ToolPartProps = {
    toolCallId: string;
    toolName: string;
    state: ToolState;
    input?: ReactNode;
    output?: ReactNode;
    error?: string;
    defaultOpen?: boolean;
    className?: string;
};

const STATUS_CONFIG = {
    "input-streaming": { label: "Pending", icon: CircleIcon, iconClass: "" },
    "input-available": {
        label: "Running",
        icon: ClockIcon,
        iconClass: "animate-pulse",
    },
    "output-available": {
        label: "Completed",
        icon: CheckCircleIcon,
        iconClass: "text-green-600",
    },
    "output-error": {
        label: "Error",
        icon: XCircleIcon,
        iconClass: "text-red-600",
    },
} as const;

function StatusBadge({ state }: { state: ToolState }) {
    const config = STATUS_CONFIG[state];
    const Icon = config.icon;

    return (
        <Badge
            className="flex items-center gap-1 rounded-full text-xs"
            variant="secondary"
        >
            <Icon className={cn("size-4", config.iconClass)} />
            <span>{config.label}</span>
        </Badge>
    );
}

/**
 * Renders a tool invocation with collapsible input/output.
 */
export function ToolPart({
    _toolCallId,
    toolName,
    state,
    input,
    output,
    error,
    defaultOpen = true,
    className,
}: ToolPartProps) {
    return (
        <Collapsible
            className={cn("not-prose mb-4 w-full rounded-md border", className)}
            defaultOpen={defaultOpen}
        >
            <CollapsibleTrigger className="flex w-full min-w-0 items-center justify-between gap-2 p-3">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                    <WrenchIcon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate font-medium text-sm">
                        {toolName}
                    </span>
                </div>
                <StatusBadge state={state} />
            </CollapsibleTrigger>

            <CollapsibleContent className="border-t px-3 py-2 text-sm">
                {state === "input-available" && input && (
                    <div className="text-muted-foreground">
                        <span className="font-medium">Input:</span>
                        <pre className="mt-1 overflow-auto rounded bg-muted p-2 text-xs">
                            {JSON.stringify(input, null, 2)}
                        </pre>
                    </div>
                )}
                {state === "output-available" && output}
                {state === "output-error" && error && (
                    <div className="text-red-500">Error: {error}</div>
                )}
            </CollapsibleContent>
        </Collapsible>
    );
}

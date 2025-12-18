"use client";

import { BookIcon, ChevronDownIcon, ExternalLinkIcon } from "lucide-react";
import type { HTMLAttributes } from "react";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

export type Source = {
    url: string;
    title: string;
};

export type SourcePartProps = HTMLAttributes<HTMLDivElement> & {
    sources: Source[];
    defaultOpen?: boolean;
};

/**
 * Renders a collapsible list of source references.
 */
export function SourcePart({
    sources,
    defaultOpen = false,
    className,
    ...props
}: SourcePartProps) {
    if (!sources.length) {
        return null;
    }

    return (
        <Collapsible
            className={cn("not-prose mb-4 text-primary text-xs", className)}
            defaultOpen={defaultOpen}
            {...props}
        >
            <CollapsibleTrigger className="flex items-center gap-2 hover:underline">
                <BookIcon className="size-4" />
                <span className="font-medium">
                    Used {sources.length} sources
                </span>
                <ChevronDownIcon className="size-4 transition-transform data-[state=open]:rotate-180" />
            </CollapsibleTrigger>

            <CollapsibleContent className="mt-3 flex flex-col gap-2">
                {sources.map((source, index) => (
                    <a
                        className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted"
                        href={source.url}
                        key={`${source.url}-${index}`}
                        rel="noopener noreferrer"
                        target="_blank"
                    >
                        <span className="flex-1 truncate">{source.title}</span>
                        <ExternalLinkIcon className="size-3 shrink-0 text-muted-foreground" />
                    </a>
                ))}
            </CollapsibleContent>
        </Collapsible>
    );
}

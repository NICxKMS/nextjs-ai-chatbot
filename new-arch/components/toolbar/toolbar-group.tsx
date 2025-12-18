"use client";

import { cn } from "@/lib/utils";
import type { ToolbarGroupProps } from "./types";

export function ToolbarGroup({ children, className }: ToolbarGroupProps) {
    return (
        <div className={cn("flex items-center gap-1", className)}>
            {children}
        </div>
    );
}

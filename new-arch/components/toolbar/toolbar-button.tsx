"use client";

import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ToolbarButtonProps } from "./types";

export function ToolbarButton({
    icon,
    label,
    shortcut,
    disabled,
    isActive,
    onClick,
}: ToolbarButtonProps) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    className={cn(isActive && "bg-accent")}
                    disabled={disabled}
                    onClick={onClick}
                    size="icon"
                    variant="ghost"
                >
                    {icon}
                    <span className="sr-only">{label}</span>
                </Button>
            </TooltipTrigger>
            <TooltipContent>
                {label}
                {shortcut && <kbd className="ml-2 text-xs">{shortcut}</kbd>}
            </TooltipContent>
        </Tooltip>
    );
}

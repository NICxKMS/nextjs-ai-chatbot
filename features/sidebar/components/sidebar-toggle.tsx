"use client";

import { memo } from "react";

import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/shared/components/tooltip";
import { useSidebar } from "../hooks";

function SidebarLeftIcon({ size = 16 }: { size?: number }) {
    return (
        <svg
            height={size}
            strokeLinejoin="round"
            viewBox="0 0 16 16"
            width={size}
        >
            <path
                clipRule="evenodd"
                d="M1.75 1.5H14.25V14.5H1.75V1.5ZM0.25 1C0.25 0.447715 0.697715 0 1.25 0H14.75C15.3023 0 15.75 0.447715 15.75 1V15C15.75 15.5523 15.3023 16 14.75 16H1.25C0.697715 16 0.25 15.5523 0.25 15V1ZM5.5 2.5V13.5H4V2.5H5.5Z"
                fill="currentColor"
                fillRule="evenodd"
            />
        </svg>
    );
}

export const SidebarToggle = memo(function SidebarToggle() {
    const { state, toggle } = useSidebar();

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    aria-label={state.isOpen ? "Close sidebar" : "Open sidebar"}
                    className={cn(
                        "rounded-lg p-2 transition-colors hover:bg-muted",
                        "focus:outline-none focus:ring-2 focus:ring-primary"
                    )}
                    onClick={toggle}
                    type="button"
                >
                    <SidebarLeftIcon size={20} />
                </button>
            </TooltipTrigger>
            <TooltipContent side="right">Toggle Sidebar</TooltipContent>
        </Tooltip>
    );
});

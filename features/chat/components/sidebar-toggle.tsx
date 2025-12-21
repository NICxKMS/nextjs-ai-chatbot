/**
 * SidebarToggle Component
 *
 * Button to toggle the sidebar visibility.
 * Placeholder implementation - will integrate with sidebar feature later.
 *
 * @module features/chat/components/sidebar-toggle
 */

"use client";

import { memo } from "react";

import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/shared/components/tooltip";

/**
 * Sidebar panel icon for the toggle button.
 * Matches the OldApp SidebarLeftIcon style.
 */
function SidebarLeftIcon({ className }: { className?: string }) {
    return (
        <svg
            aria-hidden="true"
            className={className}
            fill="currentColor"
            viewBox="0 0 16 16"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                clipRule="evenodd"
                d="M1.75 1.5H14.25V14.5H1.75V1.5ZM0.25 1C0.25 0.447715 0.697715 0 1.25 0H14.75C15.3023 0 15.75 0.447715 15.75 1V15C15.75 15.5523 15.3023 16 14.75 16H1.25C0.697715 16 0.25 15.5523 0.25 15V1ZM5.5 2.5V13.5H4V2.5H5.5Z"
                fillRule="evenodd"
            />
        </svg>
    );
}

/**
 * Props for the SidebarToggle component.
 */
export type SidebarToggleProps = {
    /** Click handler for toggle action */
    onClick?: () => void;
};

/**
 * Button component for toggling sidebar visibility.
 *
 * @remarks
 * This is a placeholder that will be integrated with the
 * sidebar feature module when implemented.
 *
 * @example
 * ```tsx
 * <SidebarToggle onClick={() => setSidebarOpen(!open)} />
 * ```
 */
export const SidebarToggle = memo(function SidebarToggle({
    onClick,
}: SidebarToggleProps) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    aria-label="Toggle sidebar"
                    className="rounded-md p-2 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    data-testid="sidebar-toggle-button"
                    onClick={onClick}
                    type="button"
                >
                    <SidebarLeftIcon className="h-5 w-5" />
                </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Toggle Sidebar</TooltipContent>
        </Tooltip>
    );
});

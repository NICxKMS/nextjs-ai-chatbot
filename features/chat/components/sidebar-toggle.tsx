/**
 * SidebarToggle Component
 *
 * Button to toggle the sidebar visibility.
 * Placeholder implementation - will integrate with sidebar feature later.
 *
 * @module features/chat/components/sidebar-toggle
 */

'use client';

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/components/tooltip';

/**
 * Sidebar panel icon for the toggle button.
 * Matches the OldApp SidebarLeftIcon style.
 */
function SidebarLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M1.75 1.5H14.25V14.5H1.75V1.5ZM0.25 1C0.25 0.447715 0.697715 0 1.25 0H14.75C15.3023 0 15.75 0.447715 15.75 1V15C15.75 15.5523 15.3023 16 14.75 16H1.25C0.697715 16 0.25 15.5523 0.25 15V1ZM5.5 2.5V13.5H4V2.5H5.5Z"
      />
    </svg>
  );
}

/**
 * Props for the SidebarToggle component.
 */
export interface SidebarToggleProps {
  /** Click handler for toggle action */
  onClick?: () => void;
}

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
export function SidebarToggle({ onClick }: SidebarToggleProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          className="p-2 rounded-md hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Toggle sidebar"
          data-testid="sidebar-toggle-button"
        >
          <SidebarLeftIcon className="h-5 w-5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">Toggle Sidebar</TooltipContent>
    </Tooltip>
  );
}

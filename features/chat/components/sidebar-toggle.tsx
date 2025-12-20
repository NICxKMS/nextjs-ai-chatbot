/**
 * SidebarToggle Component
 *
 * Button to toggle the sidebar visibility.
 * Placeholder implementation - will integrate with sidebar feature later.
 *
 * @module features/chat/components/sidebar-toggle
 */

'use client';

/**
 * Menu icon for the sidebar toggle button.
 */
function MenuIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
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
    <button
      type="button"
      onClick={onClick}
      className="p-2 rounded-md hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label="Toggle sidebar"
    >
      <MenuIcon className="h-5 w-5" />
    </button>
  );
}

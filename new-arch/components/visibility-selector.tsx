/**
 * Visibility Selector Component - Stub
 * @module new-arch/components/visibility-selector
 *
 * This is a placeholder for the visibility selector component.
 * Will be implemented in future.
 */

"use client";

import type React from "react";

export type VisibilityType = "public" | "private";

export type VisibilitySelectorProps = {
    value?: VisibilityType;
    onChange?: (value: VisibilityType) => void;
    disabled?: boolean;
    className?: string;
};

export function VisibilitySelector({
    value = "private",
    onChange,
    disabled = false,
    className = "",
}: VisibilitySelectorProps): React.JSX.Element {
    return (
        <select
            className={`rounded border px-2 py-1 text-sm ${className}`}
            disabled={disabled}
            onChange={(e) => onChange?.(e.target.value as VisibilityType)}
            value={value}
        >
            <option value="private">Private</option>
            <option value="public">Public</option>
        </select>
    );
}

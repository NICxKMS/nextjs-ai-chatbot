/**
 * VisibilitySelector Component
 *
 * Dropdown for selecting chat visibility (public/private).
 * Updates the chat visibility setting when changed.
 *
 * @module features/chat/components/visibility-selector
 */

"use client";

import { type ReactNode, useMemo, useState, useCallback } from "react";
import {
    Button,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    ChevronDownIcon,
    CheckCircleFillIcon,
    GlobeIcon,
    LockIcon,
} from "@/shared/components";
import { cn } from "@/lib/utils";
import { useChatVisibility } from "../hooks";
import type { VisibilityType } from "../types";

// =============================================================================
// TYPES
// =============================================================================

export interface VisibilitySelectorProps {
    /** Chat session identifier */
    chatId: string;
    /** Initial visibility type */
    selectedVisibilityType: VisibilityType;
    /** Optional additional CSS classes */
    className?: string;
}

interface VisibilityOption {
    id: VisibilityType;
    label: string;
    description: string;
    icon: ReactNode;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const VISIBILITY_OPTIONS: VisibilityOption[] = [
    {
        id: "private",
        label: "Private",
        description: "Only you can access this chat",
        icon: <LockIcon />,
    },
    {
        id: "public",
        label: "Public",
        description: "Anyone with the link can access this chat",
        icon: <GlobeIcon />,
    },
];

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Chat visibility selector dropdown.
 *
 * Features:
 * - Dropdown menu with visibility options
 * - Shows current selection with icon
 * - Updates visibility via server action
 *
 * Visual parity with oldapp/components/visibility-selector.tsx
 */
export function VisibilitySelector({
    chatId,
    selectedVisibilityType,
    className,
}: VisibilitySelectorProps) {
    const [open, setOpen] = useState(false);

    const { visibilityType, setVisibilityType } = useChatVisibility({
        chatId,
        initialVisibilityType: selectedVisibilityType,
    });

    // Get the currently selected visibility option
    const selectedVisibility = useMemo(
        () => VISIBILITY_OPTIONS.find((option) => option.id === visibilityType),
        [visibilityType]
    );

    // Handle visibility selection
    const handleSelect = useCallback(
        (id: VisibilityType) => {
            setVisibilityType(id);
            setOpen(false);
        },
        [setVisibilityType]
    );

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger
                asChild
                className={cn(
                    "w-fit data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
                    className
                )}
            >
                <Button
                    variant="outline"
                    className="hidden h-8 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 md:flex md:h-fit md:px-2"
                    data-testid="visibility-selector"
                >
                    {selectedVisibility?.icon}
                    <span className="md:sr-only">
                        {selectedVisibility?.label}
                    </span>
                    <ChevronDownIcon />
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="start" className="min-w-[300px]">
                {VISIBILITY_OPTIONS.map((option) => (
                    <DropdownMenuItem
                        key={option.id}
                        className="group/item flex flex-row items-center justify-between gap-4"
                        data-active={option.id === visibilityType}
                        data-testid={`visibility-selector-item-${option.id}`}
                        onSelect={() => handleSelect(option.id)}
                    >
                        <div className="flex flex-col items-start gap-1">
                            {option.label}
                            {option.description && (
                                <div className="text-muted-foreground text-xs">
                                    {option.description}
                                </div>
                            )}
                        </div>
                        <div className="text-foreground opacity-0 group-data-[active=true]/item:opacity-100 dark:text-foreground">
                            <CheckCircleFillIcon />
                        </div>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

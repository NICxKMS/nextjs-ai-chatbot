"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import type { StopButtonProps, SubmitButtonProps } from "./types";

function PureSubmitButton({
    status,
    disabled = false,
    onClick,
    className,
}: SubmitButtonProps) {
    const isDisabled = disabled || status !== "ready";

    return (
        <Button
            className={cn(
                "size-8 rounded-full bg-primary text-primary-foreground",
                "transition-colors duration-200 hover:bg-primary/90",
                "disabled:bg-muted disabled:text-muted-foreground",
                className
            )}
            data-testid="submit-button"
            disabled={isDisabled}
            onClick={onClick}
            size="icon"
            type="submit"
        >
            <ArrowUpIcon />
        </Button>
    );
}

function PureStopButton({ stop, setMessages }: StopButtonProps) {
    const handleStop = (event: React.MouseEvent) => {
        event.preventDefault();
        stop();
        setMessages((messages) => messages);
    };

    return (
        <Button
            className={cn(
                "size-8 rounded-full bg-foreground text-background",
                "transition-colors duration-200 hover:bg-foreground/90",
                "disabled:bg-muted disabled:text-muted-foreground"
            )}
            data-testid="stop-button"
            onClick={handleStop}
            size="icon"
            type="button"
        >
            <StopIcon />
        </Button>
    );
}

function ArrowUpIcon() {
    return (
        <svg
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            viewBox="0 0 24 24"
        >
            <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
    );
}

function StopIcon() {
    return (
        <svg className="size-3" fill="currentColor" viewBox="0 0 24 24">
            <rect height="12" rx="2" width="12" x="6" y="6" />
        </svg>
    );
}

export const SubmitButton = memo(PureSubmitButton);
export const StopButton = memo(PureStopButton);

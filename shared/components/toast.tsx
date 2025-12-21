"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { Toaster as SonnerToaster, toast as sonnerToast } from "sonner";
import { cn } from "@/lib/utils";
import { CheckCircleFillIcon, WarningIcon } from "./icons";

const iconsByType: Record<"success" | "error", ReactNode> = {
    success: <CheckCircleFillIcon />,
    error: <WarningIcon />,
};

export function toast(props: Omit<ToastProps, "id">) {
    return sonnerToast.custom((id) => (
        <Toast description={props.description} id={id} type={props.type} />
    ));
}

function Toast(props: ToastProps) {
    const { id, type, description } = props;

    const descriptionRef = useRef<HTMLDivElement>(null);
    const [multiLine, setMultiLine] = useState(false);

    useEffect(() => {
        const el = descriptionRef.current;
        if (!el) {
            return;
        }

        // Cache lineHeight to avoid repeated getComputedStyle calls
        let cachedLineHeight: number | null = null;

        const update = () => {
            if (cachedLineHeight === null) {
                cachedLineHeight = Number.parseFloat(
                    getComputedStyle(el).lineHeight
                );
            }
            const lines = Math.round(el.scrollHeight / cachedLineHeight);
            setMultiLine(lines > 1);
        };

        update(); // initial check
        const ro = new ResizeObserver(update); // re-check on width changes
        ro.observe(el);

        return () => ro.disconnect();
    }, []);

    return (
        <div className="flex toast-mobile:w-[356px] w-full justify-center">
            <div
                className={cn(
                    "flex toast-mobile:w-fit w-full flex-row gap-3 rounded-lg bg-zinc-100 p-3",
                    multiLine ? "items-start" : "items-center"
                )}
                data-testid="toast"
                key={id}
            >
                <div
                    className={cn(
                        "data-[type=error]:text-red-600 data-[type=success]:text-green-600",
                        { "pt-1": multiLine }
                    )}
                    data-type={type}
                >
                    {iconsByType[type]}
                </div>
                <div className="text-sm text-zinc-950" ref={descriptionRef}>
                    {description}
                </div>
            </div>
        </div>
    );
}

export type ToastProps = {
    id: string | number;
    type: "success" | "error";
    description: string;
};

// Custom Toaster with OldApp styling
export function Toaster() {
    return (
        <SonnerToaster
            position="bottom-right"
            toastOptions={{
                className:
                    "bg-zinc-100 dark:bg-zinc-900 text-zinc-950 dark:text-zinc-50 border border-zinc-200 dark:border-zinc-800",
                duration: 4000,
            }}
        />
    );
}

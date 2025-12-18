"use client";

import Script from "next/script";
import type { ReactNode } from "react";
import { Suspense } from "react";
import {
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarProvider,
    SidebarRoot,
} from "@/components/sidebar";
import { cn } from "@/lib/utils";

/**
 * Loading skeleton for sidebar
 */
function SidebarSkeleton() {
    const skeletonIds = ["sk-1", "sk-2", "sk-3", "sk-4", "sk-5"];
    return (
        <div className="flex h-full w-[var(--sidebar-width)] flex-col bg-sidebar">
            <div className="flex h-14 items-center border-b px-4">
                <div className="h-6 w-24 animate-pulse rounded bg-muted" />
            </div>
            <div className="flex-1 space-y-2 p-4">
                {skeletonIds.map((id) => (
                    <div
                        className="h-10 animate-pulse rounded bg-muted"
                        key={id}
                    />
                ))}
            </div>
        </div>
    );
}

/**
 * Loading spinner for main content
 */
function ContentLoader() {
    return (
        <div className="flex h-full w-full items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
    );
}

/**
 * Main content area with proper styling
 */
function SidebarInset({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <main
            className={cn(
                "relative flex min-h-svh flex-1 flex-col bg-background",
                "peer-data-[variant=inset]:min-h-[calc(100svh-theme(spacing.4))]",
                "md:peer-data-[variant=inset]:m-2",
                "md:peer-data-[state=collapsed]:peer-data-[variant=inset]:ml-2",
                "md:peer-data-[variant=inset]:ml-0",
                "md:peer-data-[variant=inset]:rounded-xl",
                "md:peer-data-[variant=inset]:shadow",
                className
            )}
        >
            {children}
        </main>
    );
}

type ChatLayoutClientProps = {
    children: ReactNode;
    initialIsMobile?: boolean;
    initialSidebarOpen?: boolean;
};

export function ChatLayoutClient({
    children,
    initialIsMobile,
    initialSidebarOpen = true,
}: ChatLayoutClientProps) {
    return (
        <>
            <Script
                src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"
                strategy="lazyOnload"
            />
            <SidebarProvider
                defaultOpen={initialSidebarOpen}
                {...(initialIsMobile !== undefined && { initialIsMobile })}
            >
                <Suspense fallback={<SidebarSkeleton />}>
                    <SidebarRoot>
                        <SidebarHeader />
                        <SidebarContent />
                        <SidebarFooter />
                    </SidebarRoot>
                </Suspense>
                <SidebarInset>
                    <Suspense fallback={<ContentLoader />}>{children}</Suspense>
                </SidebarInset>
            </SidebarProvider>
        </>
    );
}

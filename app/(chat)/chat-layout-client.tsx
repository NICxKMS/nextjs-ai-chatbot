"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import Script from "next/script";
import type { ReactNode } from "react";
import { Suspense, useEffect } from "react";
import { toast } from "sonner";
import { Loader } from "@/components/elements/loader";
import { DataStreamProvider } from "@/components/providers/data-stream-provider";
import { OptimisticChatsProvider } from "@/components/providers/optimistic-chats-provider";
import { SettingsProvider } from "@/components/providers/settings-provider";
import { SidebarSkeleton } from "@/components/sidebar-skeleton";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

const AppSidebar = dynamic(
    () =>
        import("@/components/app-sidebar").then((mod) => ({
            default: mod.AppSidebar,
        })),
    { ssr: false, loading: () => <SidebarSkeleton /> }
);

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
    const searchParams = useSearchParams();

    useEffect(() => {
        const notice = searchParams.get("notice");
        if (notice === "chat_not_found") {
            toast.warning(
                "This chat was not found. Redirected to the homepage."
            );
            // Clean the query param to avoid repeated toasts on refresh
            if (typeof window !== "undefined") {
                const url = new URL(window.location.href);
                url.searchParams.delete("notice");
                window.history.replaceState(null, "", url.toString());
            }
        } else if (notice === "user_not_found") {
            toast.error(
                "Your account could not be found. Switched to a guest session."
            );
            // Clean the query param to avoid repeated toasts on refresh
            if (typeof window !== "undefined") {
                const url = new URL(window.location.href);
                url.searchParams.delete("notice");
                window.history.replaceState(null, "", url.toString());
            }
        }
    }, [searchParams]);

    return (
        <>
            <Script
                src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"
                strategy="lazyOnload"
            />
            <SettingsProvider>
                <DataStreamProvider>
                    <OptimisticChatsProvider>
                        <SidebarProvider
                            defaultOpen={initialSidebarOpen}
                            initialIsMobile={initialIsMobile}
                        >
                            <Suspense fallback={<SidebarSkeleton />}>
                                <AppSidebar />
                            </Suspense>
                            <SidebarInset>
                                <Suspense
                                    fallback={
                                        <div className="flex h-full w-full items-center justify-center">
                                            <Loader size={24} />
                                        </div>
                                    }
                                >
                                    {children}
                                </Suspense>
                            </SidebarInset>
                        </SidebarProvider>
                    </OptimisticChatsProvider>
                </DataStreamProvider>
            </SettingsProvider>
        </>
    );
}

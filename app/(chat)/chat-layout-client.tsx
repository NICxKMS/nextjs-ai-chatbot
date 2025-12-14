"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import Script from "next/script";
import type { ReactNode } from "react";
import { Suspense, useEffect } from "react";
import { toast } from "sonner";
import { DataStreamProvider } from "@/components/data-stream-provider";
import { SidebarSkeleton } from "@/components/sidebar-skeleton";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { OptimisticChatsProvider } from "@/hooks/use-optimistic-chats";
import { SettingsProvider } from "@/lib/ui/settings-store";

const AppSidebar = dynamic(
    () =>
        import("@/components/app-sidebar").then((mod) => ({
            default: mod.AppSidebar,
        })),
    { loading: () => <SidebarSkeleton /> }
);

export function ChatLayoutClient({ children }: { children: ReactNode }) {
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
                        <SidebarProvider defaultOpen={true}>
                            <Suspense fallback={<SidebarSkeleton />}>
                                <AppSidebar />
                            </Suspense>
                            <SidebarInset>
                                {/* Children rendered directly - loading handled by Next.js route segments */}
                                {children}
                            </SidebarInset>
                        </SidebarProvider>
                    </OptimisticChatsProvider>
                </DataStreamProvider>
            </SettingsProvider>
        </>
    );
}

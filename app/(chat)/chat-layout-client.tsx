"use client";

import { useSearchParams } from "next/navigation";
import Script from "next/script";
import { Suspense, useEffect } from "react";
import { toast } from "sonner";
import { AppSidebar } from "@/components/app-sidebar";
import { DataStreamProvider } from "@/components/data-stream-provider";
import { SidebarSkeleton } from "@/components/sidebar-skeleton";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { OptimisticChatsProvider } from "@/hooks/use-optimistic-chats";
import { SettingsProvider } from "@/lib/ui/settings-store";

export function ChatLayoutClient({ children }: { children: React.ReactNode }) {
	const searchParams = useSearchParams();

	useEffect(() => {
		const notice = searchParams.get("notice");
		if (notice === "chat_not_found") {
			toast.warning(
				"This chat was not found. Redirected to the homepage."
			);
			// Clean the query param to avoid repeated toasts on refresh
			if (typeof window !== "undefined") {
				window.history.replaceState({}, "", "/");
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
								<Suspense>{children}</Suspense>
							</SidebarInset>
						</SidebarProvider>
					</OptimisticChatsProvider>
				</DataStreamProvider>
			</SettingsProvider>
		</>
	);
}

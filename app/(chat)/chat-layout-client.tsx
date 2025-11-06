"use client";

import Script from "next/script";
import { Suspense } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { DataStreamProvider } from "@/components/data-stream-provider";
import { SidebarSkeleton } from "@/components/sidebar-skeleton";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { OptimisticChatsProvider } from "@/hooks/use-optimistic-chats";
import { SettingsProvider } from "@/lib/ui/settings-store";

export function ChatLayoutClient({
	children,
}: {
	children: React.ReactNode;
}) {
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

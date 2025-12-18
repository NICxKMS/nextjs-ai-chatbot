/**
 * HistorySkeleton Component
 * Loading skeleton for chat history
 */

import type { CSSProperties } from "react";

import { SidebarGroup, SidebarGroupContent } from "@/components/ui/sidebar";

const SKELETON_WIDTHS = [44, 32, 28, 64, 52];

export function HistorySkeleton() {
    return (
        <SidebarGroup className="flex-1 overflow-hidden">
            <div className="px-2 py-1 text-sidebar-foreground/50 text-xs">
                Today
            </div>
            <SidebarGroupContent className="h-full">
                <div aria-busy="true" className="flex h-full flex-col">
                    {SKELETON_WIDTHS.map((width) => (
                        <div
                            className="flex h-8 items-center gap-2 rounded-md px-2"
                            key={width}
                        >
                            <div
                                className="h-4 max-w-(--skeleton-width) flex-1 rounded-md bg-sidebar-accent-foreground/10"
                                style={
                                    {
                                        "--skeleton-width": `${width}%`,
                                    } as CSSProperties
                                }
                            />
                        </div>
                    ))}
                </div>
            </SidebarGroupContent>
        </SidebarGroup>
    );
}

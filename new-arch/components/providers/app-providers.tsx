"use client";

/**
 * App Providers
 * Composed app-level providers (Theme, Auth, SWR, Tooltip)
 *
 * Flattens provider depth from 9 → 4 by composing app-level providers
 * into a single component.
 */

import { ThemeProvider } from "next-themes";
import { SWRConfig } from "swr";
import { AuthProvider } from "@/components/auth-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { AppProvidersProps, SWRConfigOptions } from "./types";

// ============================================================================
// Constants
// ============================================================================

const SWR_CONFIG: SWRConfigOptions = {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 2000,
};

// ============================================================================
// Main Component
// ============================================================================

/**
 * AppProviders - Composed app-level providers
 *
 * Provider Stack (4 levels):
 * 1. ThemeProvider - Dark/light mode
 * 2. SWRConfig - Data fetching configuration
 * 3. TooltipProvider - Global tooltip context
 * 4. AuthProvider - Authentication context
 *
 * @example
 * ```tsx
 * <AppProviders initialSession={session}>
 *   <ChatProviders>
 *     {children}
 *   </ChatProviders>
 * </AppProviders>
 * ```
 */
export function AppProviders({ children, initialSession }: AppProvidersProps) {
    return (
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            disableTransitionOnChange
            enableSystem
        >
            <SWRConfig value={SWR_CONFIG}>
                <TooltipProvider delayDuration={0}>
                    <AuthProvider initialSession={initialSession}>
                        {children}
                    </AuthProvider>
                </TooltipProvider>
            </SWRConfig>
        </ThemeProvider>
    );
}

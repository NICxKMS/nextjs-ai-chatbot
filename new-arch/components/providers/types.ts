/**
 * Provider Types
 * Type definitions for provider components
 */

import type { ReactNode } from "react";

// ============================================================================
// App Session Types (for provider props)
// ============================================================================

/** User type discriminator */
export type UserType = "guest" | "regular";

/** Application user representation (client-side version) */
export type AppUser = {
    readonly id: string;
    readonly type: UserType;
    readonly email?: string | null;
};

/** Application session for provider props */
export type AppSession = {
    readonly user: AppUser;
};

// ============================================================================
// App Provider Types
// ============================================================================

export type AppProvidersProps = {
    children: ReactNode;
    initialSession: AppSession | null;
};

// ============================================================================
// Chat Provider Types
// ============================================================================

export type ChatProvidersProps = {
    children: ReactNode;
    defaultSidebarOpen?: boolean;
};

// ============================================================================
// SWR Configuration Types
// ============================================================================

export type SWRConfigOptions = {
    revalidateOnFocus: boolean;
    revalidateOnReconnect: boolean;
    dedupingInterval: number;
};

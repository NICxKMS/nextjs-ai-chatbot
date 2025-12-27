/**
 * Settings Hydration Component
 *
 * Client-side component that triggers Zustand settings store rehydration
 * from localStorage. This prevents SSR hydration mismatches by deferring
 * localStorage reads until after the initial render.
 *
 * @module features/settings/components/settings-hydration
 */

"use client";

import { useEffect } from "react";

import { useSettings } from "../stores/settings-store";

/**
 * Invisible component that rehydrates settings store on mount.
 * Place this high in the component tree (e.g., in a layout).
 *
 * @example
 * ```tsx
 * // In app layout or provider
 * <SettingsHydration />
 * ```
 */
export function SettingsHydration(): null {
    useEffect(() => {
        useSettings.persist.rehydrate();
    }, []);

    return null;
}

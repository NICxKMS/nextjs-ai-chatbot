/**
 * Theme Provider Component
 *
 * Wrapper around next-themes ThemeProvider for dark mode support.
 *
 * @module components/theme-provider
 */

"use client"

import type { ThemeProviderProps } from "next-themes"
import { ThemeProvider as NextThemesProvider } from "next-themes"

/**
 * Theme provider component wrapping next-themes.
 * Enables dark mode support with class-based theme switching.
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
	return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}

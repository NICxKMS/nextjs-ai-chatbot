import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combines class names using clsx and merges Tailwind CSS classes with tailwind-merge.
 * This utility handles conditional classes, arrays, objects, and deduplicates conflicting
 * Tailwind classes (e.g., `cn('p-4', 'p-2')` returns `'p-2'`).
 *
 * @param inputs - Class values to combine (strings, arrays, objects, or undefined)
 * @returns Merged class string with Tailwind conflicts resolved
 *
 * @example
 * ```ts
 * cn('px-2 py-1', 'p-4') // Returns 'p-4' (p-4 overrides px-2 py-1)
 * cn('base-class', condition && 'conditional-class') // Conditional application
 * cn(['array', 'of', 'classes']) // Array support
 * cn({ active: isActive, disabled: isDisabled }) // Object syntax
 * ```
 */
export function cn(...inputs: ClassValue[]): string {
	return twMerge(clsx(inputs))
}

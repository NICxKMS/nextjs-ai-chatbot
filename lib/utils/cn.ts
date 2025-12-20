/**
 * Class Name Utility
 *
 * Combines clsx and tailwind-merge for conditional class name composition
 * with intelligent Tailwind CSS class merging.
 *
 * @module lib/utils/cn
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines class names using clsx and merges Tailwind CSS classes intelligently.
 *
 * @param inputs - Class values to combine (strings, objects, arrays, etc.)
 * @returns Merged class name string with Tailwind conflicts resolved
 *
 * @example
 * ```tsx
 * cn('px-4 py-2', 'bg-blue-500', { 'opacity-50': isDisabled })
 * // => 'px-4 py-2 bg-blue-500' or 'px-4 py-2 bg-blue-500 opacity-50'
 *
 * cn('px-4', 'px-8') // => 'px-8' (tailwind-merge handles conflicts)
 * ```
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

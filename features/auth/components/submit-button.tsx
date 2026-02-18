/**
 * Submit Button Component
 *
 * Form submit button with loading state and ARIA accessibility.
 * Prevents double-submit via type-switching pattern.
 *
 * @module features/auth/components/submit-button
 */

"use client"

import type { JSX } from "react"
import { useFormStatus } from "react-dom"

import { LoaderIcon } from "@/components/icons"
import { Button } from "@/components/ui/button"

// =============================================================================
// Submit Button Component
// =============================================================================

/**
 * Props for the SubmitButton component
 */
interface SubmitButtonProps {
	/** Button content (text/elements) */
	children: React.ReactNode
	/** Whether the form submission was successful */
	isSuccessful?: boolean
	/** Additional CSS classes */
	className?: string
}

/**
 * Submit button with loading state and ARIA accessibility.
 *
 * Features:
 * - Shows loading spinner during form submission
 * - Prevents double-submit via type="button" when pending
 * - Provides screen-reader feedback via aria-live output
 *
 * @param props - Component props
 * @param props.children - Button content
 * @param props.isSuccessful - Whether submission succeeded
 * @param props.className - Additional CSS classes
 *
 * @example
 * ```tsx
 * <SubmitButton isSuccessful={false}>Sign In</SubmitButton>
 * ```
 */
export function SubmitButton({
	children,
	isSuccessful = false,
	className,
}: SubmitButtonProps): JSX.Element {
	const { pending } = useFormStatus()
	const isDisabled = pending || isSuccessful

	return (
		<Button
			aria-disabled={isDisabled}
			className={className}
			disabled={isDisabled}
			type={pending ? "button" : "submit"}
		>
			{children}

			{(pending || isSuccessful) && (
				<span className="absolute right-4 animate-spin">
					<LoaderIcon />
				</span>
			)}

			<output aria-live="polite" className="sr-only">
				{pending || isSuccessful ? "Loading" : "Submit form"}
			</output>
		</Button>
	)
}

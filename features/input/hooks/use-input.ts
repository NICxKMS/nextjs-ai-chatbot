/**
 * Input State Hook
 *
 * React hook for managing input state with localStorage persistence.
 *
 * @module features/input/hooks/use-input
 */

"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useDebounceCallback, useLocalStorage } from "usehooks-ts"
import type { InputAttachment } from "../types"

/**
 * Options for useInput hook
 */
export interface UseInputOptions {
	/** Chat ID for localStorage key */
	chatId: string
	/** Initial input value */
	initialValue?: string
	/** Debounce delay for localStorage writes (ms) */
	debounceDelay?: number
}

/**
 * Return type for useInput hook
 */
export interface UseInputReturn {
	/** Current input value */
	value: string
	/** Set input value */
	setValue: (value: string) => void
	/** Attached files */
	attachments: InputAttachment[]
	/** Set attachments */
	setAttachments: React.Dispatch<React.SetStateAction<InputAttachment[]>>
	/** Whether submission is in progress */
	isSubmitting: boolean
	/** Set submitting state */
	setIsSubmitting: (value: boolean) => void
	/** Whether file upload is in progress */
	isUploading: boolean
	/** Set uploading state */
	setIsUploading: (value: boolean) => void
	/** Textarea ref for focus management */
	textareaRef: React.RefObject<HTMLTextAreaElement | null>
	/** Reset textarea height */
	resetHeight: () => void
	/** Adjust textarea height */
	adjustHeight: () => void
	/** Clear the input */
	clear: () => void
}

/**
 * Hook for managing input state with localStorage persistence
 *
 * @param options - Input options
 * @returns Input state and actions
 */
export function useInput(options: UseInputOptions): UseInputReturn {
	const { chatId, initialValue = "", debounceDelay = 500 } = options

	const textareaRef = useRef<HTMLTextAreaElement | null>(null)
	const [value, setValue] = useState(initialValue)
	const [attachments, setAttachments] = useState<InputAttachment[]>([])
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [isUploading, setIsUploading] = useState(false)

	// LocalStorage persistence
	const [localStorageInput, setLocalStorageInput] = useLocalStorage(
		`input-${chatId}`,
		"",
		{ initializeWithValue: false },
	)

	// Debounce localStorage writes
	const debouncedSetLocalStorageInput = useDebounceCallback(
		setLocalStorageInput,
		debounceDelay,
	)

	// Track hydration
	const hasHydratedRef = useRef(false)

	/**
	 * Adjust textarea height to fit content
	 */
	const adjustHeight = useCallback(() => {
		if (textareaRef.current) {
			textareaRef.current.style.height = "44px"
		}
	}, [])

	/**
	 * Reset textarea height to default
	 */
	const resetHeight = useCallback(() => {
		if (textareaRef.current) {
			textareaRef.current.style.height = "44px"
		}
	}, [])

	// Hydration effect
	useEffect(() => {
		if (hasHydratedRef.current) return

		if (textareaRef.current) {
			hasHydratedRef.current = true
			const domValue = textareaRef.current.value
			const finalValue = domValue || localStorageInput || ""
			setValue(finalValue)
			adjustHeight()
		}
	}, [localStorageInput, adjustHeight])

	// Sync input to localStorage
	useEffect(() => {
		debouncedSetLocalStorageInput(value)
	}, [value, debouncedSetLocalStorageInput])

	/**
	 * Clear the input
	 */
	const clear = useCallback(() => {
		setValue("")
		setAttachments([])
		setLocalStorageInput("")
		resetHeight()
	}, [setLocalStorageInput, resetHeight])

	return {
		// State
		value,
		setValue,
		attachments,
		setAttachments,
		isSubmitting,
		setIsSubmitting,
		isUploading,
		setIsUploading,

		// Refs
		textareaRef,
		resetHeight,
		adjustHeight,

		// Actions
		clear,
	}
}

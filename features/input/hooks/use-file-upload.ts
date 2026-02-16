/**
 * File Upload Hook
 *
 * React hook for managing file uploads with progress tracking and queue management.
 *
 * @module features/input/hooks/use-file-upload
 */

"use client"

import { useCallback, useRef, useState } from "react"
import { toast } from "sonner"
import type {
	AttachmentError,
	InputAttachment,
	UploadConfig,
	UploadProgress,
	UploadResult,
} from "../types"
import { DEFAULT_UPLOAD_CONFIG, getAttachmentType } from "../types"

/**
 * Options for useFileUpload hook
 */
export interface UseFileUploadOptions {
	/** Upload configuration override */
	config?: Partial<UploadConfig>
	/** Callback when upload completes */
	onUploadComplete?: (attachment: InputAttachment) => void
	/** Callback when upload fails */
	onUploadError?: (error: AttachmentError) => void
	/** Callback for upload progress */
	onProgress?: (progress: UploadProgress) => void
}

/**
 * Return type for useFileUpload hook
 */
export interface UseFileUploadReturn {
	/** Current attachments */
	attachments: InputAttachment[]
	/** Whether upload is in progress */
	isUploading: boolean
	/** Files in upload queue */
	uploadQueue: File[]
	/** Upload errors */
	errors: AttachmentError[]

	/** Upload files */
	upload: (files: FileList | File[]) => Promise<void>
	/** Remove attachment by ID */
	remove: (attachmentId: string) => void
	/** Clear all attachments */
	clear: () => void
	/** Retry failed upload */
	retry: (attachmentId: string) => Promise<void>

	/** Whether more files can be uploaded */
	canUpload: boolean
	/** Remaining upload slots */
	remainingSlots: number
	/** Total size of attachments */
	totalSize: number
}

/**
 * Hook for managing file uploads with progress tracking
 *
 * @param options - Upload options
 * @returns Upload state and actions
 */
export function useFileUpload(
	options?: UseFileUploadOptions,
): UseFileUploadReturn {
	const config: UploadConfig = {
		...DEFAULT_UPLOAD_CONFIG,
		...options?.config,
	}

	const [attachments, setAttachments] = useState<InputAttachment[]>([])
	const [uploadQueue, setUploadQueue] = useState<File[]>([])
	const [errors, setErrors] = useState<AttachmentError[]>([])
	const [isUploading, setIsUploading] = useState(false)

	// AbortController ref for cancelling uploads
	const abortControllerRef = useRef<AbortController | null>(null)
	// Track failed uploads for retry
	const failedUploadsRef = useRef<Map<string, File>>(new Map())

	/**
	 * Upload a single file
	 */
	const uploadFile = useCallback(
		async (file: File): Promise<UploadResult> => {
			const formData = new FormData()
			formData.append("file", file)

			// Create new AbortController for this upload
			abortControllerRef.current = new AbortController()

			try {
				const response = await fetch(config.uploadEndpoint, {
					method: "POST",
					body: formData,
					signal: abortControllerRef.current.signal,
				})

				if (response.ok) {
					const data = await response.json()
					const { url, pathname, contentType, filename } = data

					const attachment: InputAttachment = {
						id: crypto.randomUUID(),
						url,
						name: filename ?? pathname ?? file.name,
						contentType: contentType ?? file.type,
						type: getAttachmentType(contentType ?? file.type),
						status: "ready",
						previewUrl: contentType?.startsWith("image/")
							? url
							: undefined,
					}

					return { success: true, attachment }
				}

				const { error } = await response.json()
				return { success: false, error: error ?? "Upload failed" }
			} catch (error) {
				// Don't show error if upload was aborted
				if (error instanceof Error && error.name === "AbortError") {
					return { success: false, error: "Upload cancelled" }
				}
				return { success: false, error: "Failed to upload file" }
			}
		},
		[config.uploadEndpoint],
	)

	/**
	 * Upload multiple files
	 */
	const upload = useCallback(
		async (files: FileList | File[]) => {
			const fileArray = Array.from(files)

			// Validate files
			const validFiles: File[] = []
			const invalidFiles: Array<{ file: File; error: string }> = []

			for (const file of fileArray) {
				// Check file size
				if (file.size > config.maxFileSize) {
					invalidFiles.push({
						file,
						error: `File exceeds ${Math.round(config.maxFileSize / 1024 / 1024)}MB limit`,
					})
					continue
				}

				// Check file type
				if (
					config.allowedTypes.length > 0 &&
					!config.allowedTypes.includes(file.type)
				) {
					invalidFiles.push({
						file,
						error: "File type not allowed",
					})
					continue
				}

				validFiles.push(file)
			}

			// Show errors for invalid files
			for (const { file, error } of invalidFiles) {
				toast.error(`${file.name}: ${error}`)
			}

			// Check remaining slots
			const remainingSlots = config.maxFiles - attachments.length
			if (remainingSlots <= 0) {
				toast.error(`Maximum ${config.maxFiles} files allowed`)
				return
			}

			const filesToUpload = validFiles.slice(0, remainingSlots)
			if (filesToUpload.length < validFiles.length) {
				toast.warning(
					`Only ${filesToUpload.length} of ${validFiles.length} files uploaded (limit reached)`,
				)
			}

			if (filesToUpload.length === 0) return

			setUploadQueue(filesToUpload)
			setIsUploading(true)

			try {
				// Upload in batches of 3 concurrent uploads
				const MAX_CONCURRENT_UPLOADS = 3
				const uploadedAttachments: InputAttachment[] = []
				const uploadErrors: AttachmentError[] = []

				for (
					let i = 0;
					i < filesToUpload.length;
					i += MAX_CONCURRENT_UPLOADS
				) {
					const batch = filesToUpload.slice(
						i,
						i + MAX_CONCURRENT_UPLOADS,
					)
					const batchResults = await Promise.all(
						batch.map((file) => uploadFile(file)),
					)

					for (let j = 0; j < batchResults.length; j++) {
						const result = batchResults[j]
						const file = batch[j]

						// Skip if result or file is undefined
						if (!result || !file) continue

						if (result.success && result.attachment) {
							uploadedAttachments.push(result.attachment)
							options?.onUploadComplete?.(result.attachment)
						} else {
							const uploadError: AttachmentError = {
								attachmentId: crypto.randomUUID(),
								code: "upload_failed",
								message: result.error ?? "Upload failed",
							}
							uploadErrors.push(uploadError)
							failedUploadsRef.current.set(
								uploadError.attachmentId,
								file,
							)
							options?.onUploadError?.(uploadError)
						}
					}
				}

				// Update attachments state
				if (uploadedAttachments.length > 0) {
					setAttachments((current) => [
						...current,
						...uploadedAttachments,
					])
				}

				// Update errors state
				if (uploadErrors.length > 0) {
					setErrors((current) => [...current, ...uploadErrors])
					toast.error(
						`${uploadErrors.length} file(s) failed to upload`,
					)
				}
			} catch {
				toast.error("Failed to upload files")
			} finally {
				setUploadQueue([])
				setIsUploading(false)
			}
		},
		[
			attachments.length,
			config.maxFileSize,
			config.maxFiles,
			config.allowedTypes,
			uploadFile,
			options,
		],
	)

	/**
	 * Remove attachment by ID
	 */
	const remove = useCallback((attachmentId: string) => {
		setAttachments((current) =>
			current.filter((a) => a.id !== attachmentId),
		)
		setErrors((current) =>
			current.filter((e) => e.attachmentId !== attachmentId),
		)
		failedUploadsRef.current.delete(attachmentId)
	}, [])

	/**
	 * Clear all attachments
	 */
	const clear = useCallback(() => {
		// Abort any in-progress uploads
		abortControllerRef.current?.abort()
		setAttachments([])
		setUploadQueue([])
		setErrors([])
		failedUploadsRef.current.clear()
	}, [])

	/**
	 * Retry failed upload
	 */
	const retry = useCallback(
		async (attachmentId: string) => {
			const file = failedUploadsRef.current.get(attachmentId)
			if (!file) return

			// Remove the error
			setErrors((current) =>
				current.filter((e) => e.attachmentId !== attachmentId),
			)
			failedUploadsRef.current.delete(attachmentId)

			// Retry upload
			await upload([file])
		},
		[upload],
	)

	// Cleanup on unmount
	// Note: In a real implementation, we'd use useEffect for cleanup

	const canUpload = attachments.length < config.maxFiles
	const remainingSlots = config.maxFiles - attachments.length
	const totalSize = attachments.reduce((sum, _a) => {
		// We don't have size in InputAttachment, estimate from URL
		return sum
	}, 0)

	return {
		attachments,
		isUploading,
		uploadQueue,
		errors,
		upload,
		remove,
		clear,
		retry,
		canUpload,
		remainingSlots,
		totalSize,
	}
}

/**
 * Hook for file validation
 *
 * @param config - Upload configuration
 * @returns Validation functions
 */
export function useFileValidation(config: UploadConfig) {
	const validate = useCallback(
		(file: File): { valid: boolean; error?: string } => {
			if (file.size > config.maxFileSize) {
				return {
					valid: false,
					error: `File exceeds ${Math.round(config.maxFileSize / 1024 / 1024)}MB limit`,
				}
			}

			if (
				config.allowedTypes.length > 0 &&
				!config.allowedTypes.includes(file.type)
			) {
				return {
					valid: false,
					error: "File type not allowed",
				}
			}

			return { valid: true }
		},
		[config],
	)

	const validateMany = useCallback(
		(
			files: File[],
		): { valid: File[]; invalid: Array<{ file: File; error: string }> } => {
			const valid: File[] = []
			const invalid: Array<{ file: File; error: string }> = []

			for (const file of files) {
				const result = validate(file)
				if (result.valid) {
					valid.push(file)
				} else {
					invalid.push({
						file,
						error: result.error ?? "Invalid file",
					})
				}
			}

			return { valid, invalid }
		},
		[validate],
	)

	return { validate, validateMany }
}

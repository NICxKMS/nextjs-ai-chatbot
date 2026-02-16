/**
 * Image Artifact Handler
 *
 * Handler for image artifact operations. Note that image artifacts
 * are primarily handled client-side (see image-editor.tsx) and do not
 * use AI streaming for generation like text/code/sheet artifacts.
 *
 * @module features/artifact/handlers/image.handler
 */

import { type ArtifactHandler, createArtifactHandler } from "./base.handler"

/**
 * Image artifact handler
 *
 * Image artifacts are handled differently from text/code/sheet:
 * - No AI streaming generation (images are uploaded or created client-side)
 * - Content stores image URL or base64 data
 * - Editor provides image manipulation UI
 *
 * This handler provides stub implementations that pass through content
 * without AI processing. The actual image handling is done via:
 * - Client-side image editor (features/artifact/components/editors/image-editor.tsx)
 * - File upload utilities (lib/files.ts)
 *
 * @example
 * ```typescript
 * // Image artifacts are typically created via file upload
 * await imageHandler.createDocument({
 *   id: 'doc-123',
 *   title: 'My Image',
 *   dataStream,
 *   userId: 'user-456',
 *   chatId: 'chat-789',
 * });
 * ```
 */
export const imageHandler: ArtifactHandler<"image"> = createArtifactHandler({
	kind: "image",

	async onCreateDocument({ title }) {
		// Image artifacts don't use AI streaming generation
		// Images are uploaded or created client-side
		// Return empty content - actual image data is set via file upload
		console.log(
			`[ImageHandler] Creating image artifact: ${title}. Image content should be uploaded client-side.`,
		)

		// Return placeholder content indicating image should be uploaded
		return ""
	},

	async onUpdateDocument({ document, description }) {
		// Image updates are handled client-side via the image editor
		// This could be extended to support AI-based image modifications
		// when integrated with image generation APIs
		console.log(
			`[ImageHandler] Update requested for image artifact: ${document.title}. Description: ${description}`,
		)

		// Return existing content - actual modifications done client-side
		return document.content
	},
})

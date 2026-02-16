/**
 * AI Content Wrappers - Barrel Export
 *
 * Project wrappers for content display primitives.
 * Includes code blocks, images, and web previews.
 *
 * @module components/ai/content
 */

// =============================================================================
// Code Block Components
// =============================================================================

export {
	AICodeBlock,
	AICodeBlockCopyButton,
	type AICodeBlockCopyButtonProps,
	type AICodeBlockWrapperProps,
} from "./code-block"

// =============================================================================
// Image Components
// =============================================================================

export {
	AIImage,
	AIImageGallery,
	type AIImageGalleryProps,
	type AIImageWrapperProps,
} from "./image"

// =============================================================================
// Web Preview Components
// =============================================================================

export {
	AIArtifactPreview,
	type AIArtifactPreviewProps,
	AICodePreview,
	type AICodePreviewProps,
	AIWebPreview,
	type AIWebPreviewWrapperProps,
} from "./web-preview"

/**
 * Artifact Handlers Barrel Export
 *
 * Re-exports all artifact handlers for clean imports.
 * Provides a registry of handlers by artifact kind.
 *
 * @module features/artifact/handlers
 */

// Base types and factory
export {
	type ArtifactHandler,
	type ArtifactHandlerConfig,
	BaseArtifactHandler,
	type CreateDocumentContext,
	createArtifactHandler,
	type UpdateDocumentContext,
} from "./base.handler"

// Type-specific handlers
export { codeHandler } from "./code.handler"
export { imageHandler } from "./image.handler"
export { sheetHandler } from "./sheet.handler"
export { textHandler } from "./text.handler"

// =============================================================================
// Handler Registry
// =============================================================================

import type { ArtifactKind } from "../types"
import type { ArtifactHandler } from "./base.handler"
import { codeHandler } from "./code.handler"
import { imageHandler } from "./image.handler"
import { sheetHandler } from "./sheet.handler"
import { textHandler } from "./text.handler"

/**
 * Registry of all artifact handlers by kind
 *
 * Use this to look up the appropriate handler for an artifact type.
 *
 * @example
 * ```typescript
 * const handler = artifactHandlersByKind['text'];
 * await handler.createDocument({ ... });
 * ```
 */
export const artifactHandlersByKind: Record<
	ArtifactKind,
	ArtifactHandler<ArtifactKind>
> = {
	text: textHandler,
	code: codeHandler,
	image: imageHandler,
	sheet: sheetHandler,
}

/**
 * Get the handler for a specific artifact kind
 *
 * @param kind - The artifact kind
 * @returns The handler for that kind
 * @throws Error if no handler is found for the kind
 *
 * @example
 * ```typescript
 * const handler = getArtifactHandler('text');
 * await handler.createDocument({ ... });
 * ```
 */
export function getArtifactHandler(
	kind: ArtifactKind,
): ArtifactHandler<ArtifactKind> {
	const handler = artifactHandlersByKind[kind]
	if (!handler) {
		throw new Error(`No handler found for artifact kind: ${kind}`)
	}
	return handler
}

/**
 * List of all supported artifact kinds
 *
 * Derived from the handler registry to ensure consistency.
 */
export const supportedArtifactKinds: ArtifactKind[] = Object.keys(
	artifactHandlersByKind,
) as ArtifactKind[]

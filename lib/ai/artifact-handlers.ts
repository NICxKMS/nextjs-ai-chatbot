import { AppError } from "@/lib/errors/app-error"
import type { ArtifactKind } from "@/lib/types/artifact.types"
import type { ArtifactHandler } from "@/lib/types/artifact-handler.types"

// Re-export handler types — consumers import from this module,
// not from lib/types/ directly.
export type {
	ArtifactHandler,
	ArtifactStreamWriter,
	CreateArtifactParams,
	UpdateArtifactParams,
} from "@/lib/types/artifact-handler.types"

// ── Handler Registry ─────────────────────────────────────────
// Central dispatch: ArtifactKind → ArtifactHandler.
// Handlers are registered during initialization (P4) via
// registerArtifactHandler(). Tools call getArtifactHandler()
// at runtime — they never import handler implementations directly.

const handlers = new Map<ArtifactKind, ArtifactHandler>()

/**
 * Register an artifact handler for a specific kind.
 *
 * Called once per kind during handler initialization.
 * Throws if a handler is already registered for the given kind
 * (duplicate registration is a programming error).
 */
export function registerArtifactHandler(kind: ArtifactKind, handler: ArtifactHandler): void {
	if (handlers.has(kind)) {
		throw new Error(`Artifact handler already registered for kind "${kind}"`)
	}
	handlers.set(kind, handler)
}

/**
 * Retrieve the artifact handler for a given kind.
 *
 * Returns the registered handler or throws if none exists.
 * A missing handler indicates a registration gap — all expected
 * kinds must be registered before tools invoke this function.
 */
export function getArtifactHandler(kind: ArtifactKind): ArtifactHandler {
	const handler = handlers.get(kind)
	if (!handler) {
		throw AppError.notFound(
			"not_found:artifact:artifact_not_found",
			`No artifact handler registered for kind "${kind}"`,
		)
	}
	return handler
}

/**
 * Artifact Class and Registration System
 *
 * Provides a class-based approach for defining and registering artifact types.
 * Each artifact type defines its kind, content renderer, actions, toolbar items,
 * and stream handlers.
 *
 * @module features/artifact/lib/artifact-class
 */

import { CodeIcon, FileIcon, ImageIcon, MessageIcon } from "@/components/icons"

import type {
	ArtifactAction,
	ArtifactContentProps,
	ArtifactDefinition,
	ArtifactInitializeParams,
	ArtifactKind,
	ArtifactMetadata,
	ArtifactStreamContext,
	ArtifactToolbarItem,
} from "../types"
import { artifactKinds as artifactKindList } from "../types"

/**
 * Built-in artifact kind registration map.
 */
export const artifactKinds: Record<ArtifactKind, ArtifactKind> = {
	text: "text",
	code: "code",
	image: "image",
	sheet: "sheet",
}

/**
 * Checks if a kind is one of the built-in artifact kinds.
 */
export function isBuiltInArtifactKind(kind: string): kind is ArtifactKind {
	return artifactKindList.includes(kind as ArtifactKind)
}

type ArtifactIconComponent = typeof FileIcon

const artifactIcons: Record<ArtifactKind, ArtifactIconComponent> = {
	text: FileIcon,
	code: CodeIcon,
	image: ImageIcon,
	sheet: MessageIcon,
}

/**
 * Get icon component for an artifact kind.
 */
export function getArtifactIcon(kind: ArtifactKind): ArtifactIconComponent {
	return artifactIcons[kind] ?? FileIcon
}

// =============================================================================
// Artifact Registry
// =============================================================================

/**
 * Registry of all registered artifact definitions
 * Maps artifact kind to its definition
 */
const artifactRegistry = new Map<ArtifactKind, ArtifactDefinition>()

/**
 * Register an artifact definition
 *
 * @param definition - The artifact definition to register
 * @throws Error if an artifact with the same kind is already registered
 *
 * @example
 * ```typescript
 * registerArtifact({
 *   kind: 'text',
 *   name: 'Text',
 *   description: 'Text document',
 *   actions: [...],
 *   toolbar: [...],
 *   content: TextEditor,
 * })
 * ```
 */
export function registerArtifact<M = ArtifactMetadata>(
	definition: ArtifactDefinition<M>,
): void {
	if (artifactRegistry.has(definition.kind)) {
		throw new Error(
			`Artifact kind "${definition.kind}" is already registered. Use unregisterArtifact() first if you want to replace it.`,
		)
	}
	artifactRegistry.set(definition.kind, definition as ArtifactDefinition)
}

/**
 * Unregister an artifact definition
 *
 * @param kind - The artifact kind to unregister
 * @returns true if the artifact was unregistered, false if it wasn't registered
 */
export function unregisterArtifact(kind: ArtifactKind): boolean {
	return artifactRegistry.delete(kind)
}

/**
 * Get an artifact definition by kind
 *
 * @param kind - The artifact kind
 * @returns The artifact definition or undefined if not found
 */
export function getArtifactDefinition(
	kind: ArtifactKind,
): ArtifactDefinition | undefined {
	return artifactRegistry.get(kind)
}

/**
 * Get all registered artifact definitions
 *
 * @returns Array of all registered artifact definitions
 */
export function getAllArtifactDefinitions(): ArtifactDefinition[] {
	return Array.from(artifactRegistry.values())
}

/**
 * Get all registered artifact kinds
 *
 * @returns Array of all registered artifact kinds
 */
export function getRegisteredArtifactKinds(): ArtifactKind[] {
	return Array.from(artifactRegistry.keys())
}

/**
 * Check if an artifact kind is registered
 *
 * @param kind - The artifact kind to check
 * @returns true if registered, false otherwise
 */
export function isArtifactRegistered(kind: ArtifactKind): boolean {
	return artifactRegistry.has(kind)
}

/**
 * Clear all registered artifacts
 * Useful for testing or resetting state
 */
export function clearArtifactRegistry(): void {
	artifactRegistry.clear()
}

// =============================================================================
// Artifact Class
// =============================================================================

/**
 * Configuration for creating an Artifact instance
 */
export interface ArtifactConfig<T extends ArtifactKind, M = ArtifactMetadata> {
	/** The artifact kind */
	kind: T
	/** Human-readable description */
	description: string
	/** Content renderer component */
	content: React.ComponentType<ArtifactContentProps<M>>
	/** Actions for this artifact type */
	actions?: ArtifactAction<M>[]
	/** Toolbar items for this artifact type */
	toolbar?: ArtifactToolbarItem[]
	/** Initialization function called when artifact is loaded */
	initialize?: (params: ArtifactInitializeParams<M>) => void | Promise<void>
	/** Handler for custom stream data types */
	onStreamPart?: (context: ArtifactStreamContext<M>) => void
}

/**
 * Artifact class for defining artifact types
 *
 * Provides a class-based approach for defining artifact types with
 * content renderers, actions, toolbar items, and stream handlers.
 *
 * @example
 * ```typescript
 * const textArtifact = new Artifact({
 *   kind: 'text',
 *   description: 'Text document for drafting essays and emails',
 *   content: TextEditor,
 *   actions: [
 *     {
 *       icon: <CopyIcon />,
 *       description: 'Copy to clipboard',
 *       onClick: ({ content }) => {
 *         navigator.clipboard.writeText(content);
 *       },
 *     },
 *   ],
 *   toolbar: [
 *     {
 *       icon: <PenIcon />,
 *       description: 'Add final polish',
 *       onClick: ({ sendMessage }) => {
 *         sendMessage({ role: 'user', parts: [...] });
 *       },
 *     },
 *   ],
 *   onStreamPart: ({ streamPart, setArtifact }) => {
 *     if (streamPart.type === 'data-textDelta') {
 *       setArtifact(draft => ({
 *         ...draft,
 *         content: draft.content + streamPart.data,
 *       }));
 *     }
 *   },
 * });
 *
 * // Register the artifact
 * textArtifact.register();
 * ```
 */
export class Artifact<T extends ArtifactKind, M = ArtifactMetadata> {
	readonly kind: T
	readonly description: string
	readonly content: React.ComponentType<ArtifactContentProps<M>>
	readonly actions: ArtifactAction<M>[]
	readonly toolbar: ArtifactToolbarItem[]
	readonly initialize:
		| ((params: ArtifactInitializeParams<M>) => void | Promise<void>)
		| undefined
	readonly onStreamPart:
		| ((context: ArtifactStreamContext<M>) => void)
		| undefined

	constructor(config: ArtifactConfig<T, M>) {
		this.kind = config.kind
		this.description = config.description
		this.content = config.content
		this.actions = config.actions ?? []
		this.toolbar = config.toolbar ?? []
		this.initialize = config.initialize ?? undefined
		this.onStreamPart = config.onStreamPart ?? undefined
	}

	/**
	 * Get the artifact name (defaults to capitalized kind)
	 */
	get name(): string {
		return this.kind.charAt(0).toUpperCase() + this.kind.slice(1)
	}

	/**
	 * Convert to ArtifactDefinition format
	 */
	toDefinition(): ArtifactDefinition<M> {
		return {
			kind: this.kind,
			name: this.name,
			title: this.name,
			description: this.description,
			actions: this.actions,
			toolbar: this.toolbar,
			content: this.content,
			component: this.content,
			initialize: this.initialize,
			onStreamPart: this.onStreamPart,
		}
	}

	/**
	 * Register this artifact in the global registry
	 * @throws Error if an artifact with the same kind is already registered
	 */
	register(): void {
		registerArtifact(this.toDefinition())
	}

	/**
	 * Unregister this artifact from the global registry
	 */
	unregister(): void {
		unregisterArtifact(this.kind)
	}

	/**
	 * Check if this artifact is registered
	 */
	isRegistered(): boolean {
		return isArtifactRegistered(this.kind)
	}
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create and optionally register an artifact definition
 *
 * Convenience function that creates an Artifact instance and optionally
 * registers it immediately.
 *
 * @param config - Artifact configuration
 * @param autoRegister - Whether to automatically register (default: false)
 * @returns The created Artifact instance
 *
 * @example
 * ```typescript
 * // Create without registering
 * const textArtifact = createArtifactDefinition({
 *   kind: 'text',
 *   description: 'Text document',
 *   content: TextEditor,
 * });
 *
 * // Create and register immediately
 * const codeArtifact = createArtifactDefinition({
 *   kind: 'code',
 *   description: 'Code artifact',
 *   content: CodeEditor,
 * }, true);
 * ```
 */
export function createArtifactDefinition<
	T extends ArtifactKind,
	M = ArtifactMetadata,
>(config: ArtifactConfig<T, M>, autoRegister = false): Artifact<T, M> {
	const artifact = new Artifact(config)
	if (autoRegister) {
		artifact.register()
	}
	return artifact
}

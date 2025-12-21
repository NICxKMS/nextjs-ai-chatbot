import type { ComponentType } from "react";

import type {
    ArtifactAction,
    ArtifactConfig,
    ArtifactContentProps,
    ArtifactDefinition,
    ArtifactInitializeParams,
    ArtifactKind,
    ArtifactStreamPartArgs,
    ArtifactToolbarItem,
} from "../types";

/**
 * Factory class for creating artifact definitions.
 * Provides a type-safe builder pattern for defining artifact behaviors.
 *
 * @example
 * ```ts
 * const textArtifact = new Artifact({
 *   kind: 'text',
 *   description: 'Text document artifact',
 *   content: TextEditor,
 *   actions: [...],
 *   toolbar: [...],
 *   onStreamPart: ({ streamPart, setArtifact }) => { ... },
 * });
 * ```
 */
export class Artifact<TKind extends ArtifactKind, TMetadata = unknown>
    implements ArtifactDefinition<TKind, TMetadata>
{
    readonly kind: TKind;
    readonly description: string;
    readonly content: ComponentType<ArtifactContentProps<TMetadata>>;
    readonly actions: ArtifactAction<TMetadata>[];
    readonly toolbar: ArtifactToolbarItem[];
    readonly initialize?: (params: ArtifactInitializeParams<TMetadata>) => void;
    readonly onStreamPart: (args: ArtifactStreamPartArgs<TMetadata>) => void;

    constructor(config: ArtifactConfig<TKind, TMetadata>) {
        this.kind = config.kind;
        this.description = config.description;
        this.content = config.content;
        this.actions = config.actions ?? [];
        this.toolbar = config.toolbar ?? [];
        this.initialize = config.initialize;
        this.onStreamPart = config.onStreamPart;
    }
}

/**
 * Type guard to check if an object is an artifact definition.
 */
export function isArtifactDefinition(obj: unknown): obj is ArtifactDefinition {
    return (
        typeof obj === "object" &&
        obj !== null &&
        "kind" in obj &&
        "content" in obj &&
        "onStreamPart" in obj
    );
}

/**
 * Registry for storing and retrieving artifact definitions.
 * Singleton pattern ensures consistent access across the application.
 */
class ArtifactRegistry {
    private definitions: Map<ArtifactKind, ArtifactDefinition> = new Map();

    /**
     * Register an artifact definition.
     */
    register<TKind extends ArtifactKind, TMetadata>(
        definition: ArtifactDefinition<TKind, TMetadata>
    ): void {
        this.definitions.set(definition.kind, definition as ArtifactDefinition);
    }

    /**
     * Get an artifact definition by kind.
     */
    get<TKind extends ArtifactKind>(
        kind: TKind
    ): ArtifactDefinition<TKind> | undefined {
        return this.definitions.get(kind) as
            | ArtifactDefinition<TKind>
            | undefined;
    }

    /**
     * Get all registered artifact definitions.
     */
    getAll(): ArtifactDefinition[] {
        return Array.from(this.definitions.values());
    }

    /**
     * Check if an artifact kind is registered.
     */
    has(kind: ArtifactKind): boolean {
        return this.definitions.has(kind);
    }

    /**
     * Clear all registered definitions (useful for testing).
     */
    clear(): void {
        this.definitions.clear();
    }
}

/**
 * Global artifact registry instance.
 */
export const artifactRegistry = new ArtifactRegistry();

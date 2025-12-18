"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import type { DataUIPart } from "ai";
import type { ComponentType, Dispatch, ReactNode, SetStateAction } from "react";
import type { Suggestion } from "@/lib/data/schema";
import type { ChatMessage, CustomUIDataTypes } from "@/lib/types";

// ============================================================================
// Artifact Type Definitions
// ============================================================================

export type ArtifactKind = "code" | "text" | "image" | "sheet";

export type ArtifactStatus = "idle" | "streaming";

export type BoundingBox = {
    top: number;
    left: number;
    width: number;
    height: number;
};

/**
 * UI state for an artifact in the panel
 */
export type UIArtifact = {
    documentId: string;
    content: string;
    kind: ArtifactKind;
    title: string;
    status: ArtifactStatus;
    isVisible: boolean;
    boundingBox: BoundingBox;
};

// ============================================================================
// Artifact Action & Toolbar Types
// ============================================================================

export type ArtifactActionContext<M = unknown> = {
    content: string;
    handleVersionChange: (type: "next" | "prev" | "toggle" | "latest") => void;
    currentVersionIndex: number;
    isCurrentVersion: boolean;
    mode: "edit" | "diff";
    metadata: M;
    setMetadata: Dispatch<SetStateAction<M>>;
};

export type ArtifactAction<M = unknown> = {
    icon: ReactNode;
    label?: string;
    description: string;
    onClick: (context: ArtifactActionContext<M>) => Promise<void> | void;
    isDisabled?: (context: ArtifactActionContext<M>) => boolean;
};

export type ArtifactToolbarContext = {
    sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
};

export type ArtifactToolbarItem = {
    description: string;
    icon: ReactNode;
    onClick: (context: ArtifactToolbarContext) => void;
};

// ============================================================================
// Artifact Content Props
// ============================================================================

export type ArtifactContentProps<M = unknown> = {
    title: string;
    content: string;
    mode: "edit" | "diff";
    isCurrentVersion: boolean;
    currentVersionIndex: number;
    status: ArtifactStatus;
    suggestions: Suggestion[];
    onSaveContent: (updatedContent: string, debounce: boolean) => void;
    isInline: boolean;
    getDocumentContentById: (index: number) => string;
    isLoading: boolean;
    metadata: M;
    setMetadata: Dispatch<SetStateAction<M>>;
};

// ============================================================================
// Artifact Definition Configuration
// ============================================================================

export type InitializeParams<M = unknown> = {
    documentId: string;
    setMetadata: Dispatch<SetStateAction<M>>;
};

export type StreamPartParams<M = unknown> = {
    setMetadata: Dispatch<SetStateAction<M>>;
    setArtifact: Dispatch<SetStateAction<UIArtifact>>;
    streamPart: DataUIPart<CustomUIDataTypes>;
};

export type ArtifactConfig<K extends ArtifactKind, M = unknown> = {
    kind: K;
    description: string;
    content: ComponentType<ArtifactContentProps<M>>;
    actions: ArtifactAction<M>[];
    toolbar: ArtifactToolbarItem[];
    initialize?: (params: InitializeParams<M>) => void | Promise<void>;
    onStreamPart: (params: StreamPartParams<M>) => void;
};

/**
 * Artifact definition class for type-safe artifact creation
 */
export class ArtifactDefinition<K extends ArtifactKind, M = unknown> {
    readonly kind: K;
    readonly description: string;
    readonly content: ComponentType<ArtifactContentProps<M>>;
    readonly actions: ArtifactAction<M>[];
    readonly toolbar: ArtifactToolbarItem[];
    readonly initialize?: (params: InitializeParams<M>) => void | Promise<void>;
    readonly onStreamPart: (params: StreamPartParams<M>) => void;

    constructor(config: ArtifactConfig<K, M>) {
        this.kind = config.kind;
        this.description = config.description;
        this.content = config.content;
        this.actions = config.actions ?? [];
        this.toolbar = config.toolbar ?? [];
        this.initialize = config.initialize;
        this.onStreamPart = config.onStreamPart;
    }
}

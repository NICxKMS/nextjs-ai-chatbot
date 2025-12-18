// Artifact System - Registry-based extensible artifact editing
// ============================================================================

// Components
export { ArtifactContainer } from "./artifact-container";
export { ArtifactContent } from "./artifact-content";
export { ArtifactHeader } from "./artifact-header";

// Context & Hooks
export {
    ArtifactProvider,
    initialArtifactData,
    useArtifactContext,
    useArtifactSelector,
} from "./context";
// Registry
export {
    getArtifactDefinition,
    getRegisteredArtifactKinds,
    isArtifactRegistered,
    registerArtifact,
} from "./registry";
// Types
export type {
    ArtifactAction,
    ArtifactActionContext,
    ArtifactConfig,
    ArtifactContentProps,
    ArtifactKind,
    ArtifactStatus,
    ArtifactToolbarContext,
    ArtifactToolbarItem,
    BoundingBox,
    InitializeParams,
    StreamPartParams,
    UIArtifact,
} from "./types";
export { ArtifactDefinition } from "./types";

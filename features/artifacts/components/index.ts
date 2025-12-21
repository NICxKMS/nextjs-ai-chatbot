/**
 * Artifact Components - Public API
 * @module features/artifacts/components
 */

// Main container
export { Artifact } from "./artifact";

// Sub-components
export { ArtifactClose } from "./artifact-close";
export { ArtifactErrorBoundary } from "./artifact-error";
export { ArtifactActions } from "./artifact-actions";
export { ArtifactMessages } from "./artifact-messages";
export { VersionFooter } from "./version-footer";
export { Toolbar, Tools } from "./toolbar";

// Editors (re-export from editors folder)
export * from "./editors";

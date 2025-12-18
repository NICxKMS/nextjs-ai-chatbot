// Modular Toolbar Components

export { useToolbarShortcuts } from "./hooks";
export { ToolbarButton } from "./toolbar-button";
export { Toolbar } from "./toolbar-container";
export { ToolbarGroup } from "./toolbar-group";
// Re-export tool components
export { AddAttachmentTool } from "./tools/add-attachment";
export { CreateDocumentTool } from "./tools/create-document";
export { RequestSuggestionsTool } from "./tools/request-suggestions";
export * from "./types";

// Legacy exports from original toolbar.tsx for backward compatibility
// The original Toolbar, Tools components remain in ../toolbar.tsx

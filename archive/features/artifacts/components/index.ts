/**
 * Artifact Components - Public API
 * @module features/artifacts/components
 */

// Main container
export { Artifact } from "./artifact";
export { ArtifactActions } from "./artifact-actions";
// Sub-components
export { ArtifactClose } from "./artifact-close";
export { ArtifactErrorBoundary } from "./artifact-error";
export { ArtifactMessages } from "./artifact-messages";
// Editors (explicit exports for better tree-shaking)
export {
    CodeEditor,
    type CodeEditorProps,
    Console,
    type ConsoleOutput,
    type ConsoleOutputContent,
    type ConsoleProps,
    DiffType,
    type DiffTypeValue,
    DiffView,
    type DiffViewProps,
    editorPreloaders,
    ImageEditor,
    type ImageEditorProps,
    LazyCodeEditor,
    LazyConsole,
    LazyDiffView,
    LazyImageEditor,
    LazySheetEditor,
    LazyTextEditor,
    preloadAllEditors,
    SheetEditor,
    type SheetEditorProps,
    TextEditor,
    type TextEditorProps,
} from "./editors";
export { Toolbar, Tools } from "./toolbar";
export { VersionFooter } from "./version-footer";

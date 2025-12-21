// Types

// Actions (server actions are safe to import in client components)
export { getSuggestions } from "./actions";

// Constants
export {
    ARTIFACT_KIND_LABELS,
    ARTIFACT_KINDS,
    DEFAULT_ARTIFACT_CONTENT,
} from "./constants";
export {
    artifactDefinitions,
    artifactKinds,
    codeArtifact,
    getArtifactDefinition,
    imageArtifact,
    sheetArtifact,
    textArtifact,
} from "./definitions";
// Definitions
export {
    Artifact as ArtifactFactory,
    artifactRegistry,
    isArtifactDefinition,
} from "./definitions/base";

// Hooks
export {
    initialArtifactData,
    type UseArtifactReturn,
    useArtifact,
    useArtifactSelector,
} from "./hooks";
export type {
    ArtifactAction,
    ArtifactActionContext,
    ArtifactBoundingBox,
    ArtifactConfig,
    ArtifactContentProps,
    ArtifactDefinition,
    ArtifactInitializeParams,
    ArtifactKind,
    ArtifactStatus,
    ArtifactStreamPart,
    ArtifactStreamPartArgs,
    ArtifactStreamPartType,
    ArtifactToolbarContext,
    ArtifactToolbarItem,
    ConsoleOutput,
    ConsoleOutputContent,
    ConsoleOutputStatus,
    UIArtifact,
} from "./types";
// Utils
export {
    DataStreamHandler,
    type DataStreamHandlerProps,
} from "./utils/stream-handler";

// NOTE: Server-only exports (handlers) are in './server.ts'
// Import from '@/features/artifacts/server' for server code

// Main Components
export {
    Artifact,
    ArtifactActions,
    ArtifactClose,
    ArtifactErrorBoundary,
    ArtifactMessages,
    Toolbar,
    Tools,
    VersionFooter,
} from "./components";

// Editor Components
export {
    CodeEditor,
    type CodeEditorProps,
    Console,
    type ConsoleOutput as ConsoleOutputType,
    type ConsoleOutputContent as ConsoleOutputContentType,
    type ConsoleProps,
    DiffType,
    type DiffTypeValue,
    DiffView,
    type DiffViewProps,
    ImageEditor,
    type ImageEditorProps,
    SheetEditor,
    type SheetEditorProps,
    TextEditor,
    type TextEditorProps,
} from "./components/editors";

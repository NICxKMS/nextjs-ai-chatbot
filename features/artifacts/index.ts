// Types
export type {
    ArtifactKind,
    ArtifactStatus,
    ArtifactBoundingBox,
    UIArtifact,
    ArtifactActionContext,
    ArtifactAction,
    ArtifactToolbarContext,
    ArtifactToolbarItem,
    ArtifactContentProps,
    ArtifactInitializeParams,
    ArtifactStreamPartType,
    ArtifactStreamPart,
    ArtifactStreamPartArgs,
    ArtifactConfig,
    ArtifactDefinition,
    ConsoleOutputContent,
    ConsoleOutputStatus,
    ConsoleOutput,
} from "./types";

// Constants
export {
    ARTIFACT_KINDS,
    DEFAULT_ARTIFACT_CONTENT,
    ARTIFACT_KIND_LABELS,
} from "./constants";

// Definitions
export {
    Artifact as ArtifactFactory,
    artifactRegistry,
    isArtifactDefinition,
} from "./definitions/base";
export {
    artifactDefinitions,
    getArtifactDefinition,
    artifactKinds,
    textArtifact,
    codeArtifact,
    imageArtifact,
    sheetArtifact,
} from "./definitions";

// Hooks
export {
    useArtifact,
    useArtifactSelector,
    initialArtifactData,
    type UseArtifactReturn,
} from "./hooks";

// Utils
export {
    DataStreamHandler,
    type DataStreamHandlerProps,
} from "./utils/stream-handler";

// Actions (server actions are safe to import in client components)
export { getSuggestions } from "./actions";

// NOTE: Server-only exports (handlers) are in './server.ts'
// Import from '@/features/artifacts/server' for server code

// Main Components
export {
    Artifact,
    ArtifactClose,
    ArtifactErrorBoundary,
    ArtifactActions,
    ArtifactMessages,
    VersionFooter,
    Toolbar,
    Tools,
} from "./components";

// Editor Components
export {
    ImageEditor,
    TextEditor,
    CodeEditor,
    SheetEditor,
    Console,
    DiffView,
    DiffType,
    type ImageEditorProps,
    type TextEditorProps,
    type CodeEditorProps,
    type SheetEditorProps,
    type ConsoleProps,
    type DiffViewProps,
    type DiffTypeValue,
    type ConsoleOutput as ConsoleOutputType,
    type ConsoleOutputContent as ConsoleOutputContentType,
} from "./components/editors";

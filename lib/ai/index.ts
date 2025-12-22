/**
 * AI Integration Module - Public API
 * Ref: 05-ai-integration-optimal-design.md
 *
 * @module lib/ai
 */

// Config
export {
    DEFAULT_MODEL_ID,
    getToolModel,
    getTitleModel,
    TITLE_MODEL_ID,
    TOOL_MODEL_ID,
    USE_SELECTED_MODEL_FOR_TITLE,
    USE_SELECTED_MODEL_FOR_TOOLS,
} from "./config";

// Mock Provider (for testing)
export {
    addMockResponse,
    clearMockResponses,
    configureMockProvider,
    createMockModel,
    getModelWithMockFallback,
    MockLanguageModel,
    type MockProviderConfig,
    resetMockProvider,
    shouldUseMockAI,
} from "./mock-provider";
// Models
export {
    getAvailableModels,
    getModelById,
    isValidModel,
    MODEL_REGISTRY,
} from "./models";
// Providers - Unified Registry Pattern (like OldApp)
export {
    getAnthropic,
    getGoogle,
    getLanguageModel,
    getOpenAI,
    getOpenRouter,
    ModelResolutionError,
    myProvider,
} from "./providers";

// Reasoning
export {
    buildProviderOptions,
    getReasoningType,
    isReasoningModel,
    type ReasoningType,
    wrapWithReasoningMiddleware,
} from "./reasoning";

// Tools
export {
    type CreateDocumentToolProps,
    createDocument,
    type GetToolsProps,
    getTools,
    type UpdateDocumentToolProps,
    updateDocument,
} from "./tools";

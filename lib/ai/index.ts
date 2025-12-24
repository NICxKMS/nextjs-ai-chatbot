/**
 * AI Integration Module - Public API
 * Ref: 05-ai-integration-optimal-design.md
 *
 * @module lib/ai
 */

// Config
export {
    DEFAULT_MODEL_ID,
    getTitleModel,
    getToolModel,
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
// Provider Utilities - Circuit Breaker Pattern
export {
    anthropicCircuit,
    type CircuitBreaker,
    CircuitBreakerOpenError,
    type CircuitBreakerOptions,
    type CircuitState,
    createCircuitBreaker,
    googleCircuit,
    openaiCircuit,
    openrouterCircuit,
} from "./provider-utils";
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

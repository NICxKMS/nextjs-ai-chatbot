/**
 * AI Integration Module - Public API
 * Ref: 05-ai-integration-optimal-design.md
 *
 * @module lib/ai
 */

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
    DEFAULT_MODEL_ID,
    getAvailableModels,
    getModelById,
    isValidModel,
    MODEL_REGISTRY,
} from "./models";
// Providers
export { getAnthropic, getGoogle, getOpenAI } from "./providers";

// Tools
export {
    type CreateDocumentToolProps,
    createDocument,
    type GetToolsProps,
    getTools,
    type UpdateDocumentToolProps,
    updateDocument,
} from "./tools";

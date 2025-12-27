/**
 * Test Utilities Index
 *
 * Central export point for all test utilities, helpers, and fixtures.
 * Import from this file for convenient access to all test utilities.
 *
 * @example
 * ```typescript
 * import {
 *   createMockUser,
 *   createSWRWrapper,
 *   TEST_USER,
 *   generateConversation,
 * } from "@/tests/utils";
 * ```
 *
 * @module tests/utils
 */

// =============================================================================
// CONSTANTS
// =============================================================================

export {
    ARTIFACT_KINDS,
    ARTIFACT_STATUSES,
    // Error constants
    ERROR_MESSAGES,
    HTTP_STATUS,
    SAMPLE_CODE,
    // Content constants
    SAMPLE_TEXT_CONTENT,
    TEST_ADMIN_USER,
    // API constants
    TEST_API_ENDPOINTS,
    TEST_ARTIFACT,
    TEST_CHAT,
    // Chat constants
    TEST_CHAT_ID,
    // Time constants
    TEST_DATES,
    // Artifact constants
    TEST_DOCUMENT_ID,
    TEST_GUEST_USER,
    TEST_MESSAGE_ID,
    // Model constants
    TEST_MODEL_IDS,
    TEST_TOOL_CALL_ID,
    TEST_TOOL_NAMES,
    // User constants
    TEST_USER,
    TIMEOUTS,
    // Other constants
    VISIBILITY_TYPES,
} from "./constants";

// =============================================================================
// MOCK FACTORIES
// =============================================================================

export {
    createDelayedMock,
    // Artifact mocks
    createMockArtifact,
    createMockAssistantMessage,
    // Attachment mocks
    createMockAttachment,
    // Chat mocks
    createMockChat,
    createMockChatWithMessages,
    createMockCodeArtifact,
    // Event mocks
    createMockEvent,
    // Function mocks
    createMockFetch,
    createMockGuestUser,
    createMockImageAttachment,
    createMockKeyboardEvent,
    // Message mocks
    createMockMessage,
    createMockMessageWithToolCall,
    createMockMouseEvent,
    createMockPathname,
    createMockPdfAttachment,
    // Router mocks
    createMockRouter,
    createMockSearchParams,
    createMockSession,
    createMockStreamingArtifact,
    createMockSystemMessage,
    // User mocks
    createMockUser,
    createMockUserMessage,
    createRetryableMock,
    type MockChat,
    type MockSession,
    // Types
    type MockUser,
} from "./mock-factories";

// =============================================================================
// FIXTURES
// =============================================================================

export {
    // Types
    type ChatFixture,
    // Artifact fixtures
    generateArtifactSet,
    // Batch generators
    generateBatch,
    // Chat fixtures
    generateChatFixture,
    generateChatList,
    generateCodeMessage,
    // Message fixtures
    generateConversation,
    // Date fixtures
    generateDateRange,
    generateErrorResponse,
    // Error fixtures
    generateErrorScenarios,
    // ID generators
    generateId,
    generateMarkdownMessage,
    generateMessageWithLength,
    generateRelativeDate,
    generateStreamingArtifact,
    // User fixtures
    generateUserFixture,
    generateUserList,
    generateUUID,
    pickRandom,
    pickRandomN,
    resetIdCounter,
    type UserFixture,
} from "./fixtures";

// =============================================================================
// TEST HELPERS
// =============================================================================

export {
    actAsync,
    advanceTimersAndFlush,
    // Cleanup utilities
    cleanupAllMocks,
    createCustomSWRWrapper,
    // Mock utilities
    createDeferred,
    createPartialMock,
    // SWR wrappers
    createSWRWrapper,
    createTrackedMock,
    delay,
    expectAsyncToThrow,
    // Assertion utilities
    expectToThrowWithMessage,
    flushPromises,
    safeCleanup,
    // DOM utilities
    setupIntersectionObserverMock,
    setupMatchMediaMock,
    setupResizeObserverMock,
    suppressConsole,
    typedEntries,
    // Type utilities
    typedKeys,
    // Async utilities
    waitForCondition,
    waitForElement,
} from "./test-helpers";

// =============================================================================
// DATABASE SEEDING
// =============================================================================

export {
    // Cleanup functions
    cleanupTestChat,
    cleanupTestData,
    cleanupTestUser,
    // Seeding functions
    seedCompleteTestScenario,
    seedIsolatedTestUser,
    seedMultipleChats,
    seedTestChat,
    seedTestDocument,
    seedTestMessages,
    seedTestUser,
    // Test data constants
    TEST_CHAT as SEED_TEST_CHAT,
    TEST_DOCUMENT as SEED_TEST_DOCUMENT,
    TEST_MESSAGE as SEED_TEST_MESSAGE,
    TEST_USER as SEED_TEST_USER,
    // Types
    type TestScenario,
} from "./seed";

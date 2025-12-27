/**
 * Test Constants
 *
 * Centralized constants for use across all test suites.
 * @module tests/utils/constants
 */

// =============================================================================
// USER CONSTANTS
// =============================================================================

export const TEST_USER = {
    id: "user-test-123",
    email: "test@example.com",
    name: "Test User",
    image: "https://example.com/avatar.png",
} as const;

export const TEST_GUEST_USER = {
    id: "guest-456",
    email: null,
    name: "Guest",
    image: null,
} as const;

export const TEST_ADMIN_USER = {
    id: "admin-789",
    email: "admin@example.com",
    name: "Admin User",
    image: null,
} as const;

// =============================================================================
// CHAT CONSTANTS
// =============================================================================

export const TEST_CHAT_ID = "chat-test-abc123";
export const TEST_MESSAGE_ID = "msg-test-xyz789";

export const TEST_CHAT = {
    id: TEST_CHAT_ID,
    title: "Test Chat",
    userId: TEST_USER.id,
    createdAt: new Date("2025-01-01T00:00:00Z"),
    updatedAt: new Date("2025-01-01T00:00:00Z"),
    visibility: "private" as const,
} as const;

// =============================================================================
// ARTIFACT CONSTANTS
// =============================================================================

export const TEST_DOCUMENT_ID = "doc-test-123";

export const TEST_ARTIFACT = {
    documentId: TEST_DOCUMENT_ID,
    title: "Test Artifact",
    kind: "text" as const,
    content: "Test content",
    isVisible: false,
    status: "idle" as const,
    boundingBox: {
        top: 0,
        left: 0,
        width: 0,
        height: 0,
    },
} as const;

export const ARTIFACT_KINDS = ["text", "code", "image", "sheet"] as const;
export const ARTIFACT_STATUSES = ["streaming", "idle"] as const;

// =============================================================================
// MESSAGE CONTENT CONSTANTS
// =============================================================================

export const SAMPLE_TEXT_CONTENT = {
    short: "Hello, world!",
    medium: "This is a medium-length test message that spans multiple words for testing text handling.",
    long: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.",
    withMarkdown:
        "# Heading\n\nThis is **bold** and *italic* text.\n\n- List item 1\n- List item 2",
    withCode:
        "Here is some code:\n\n```typescript\nconst x = 1;\nconsole.log(x);\n```",
} as const;

export const SAMPLE_CODE = {
    typescript: "const hello = (name: string): string => `Hello, ${name}!`;",
    javascript: "function add(a, b) { return a + b; }",
    python: 'def greet(name):\n    return f"Hello, {name}!"',
    react: "export function Button({ children }) {\n  return <button>{children}</button>;\n}",
} as const;

// =============================================================================
// TIME CONSTANTS
// =============================================================================

export const TEST_DATES = {
    past: new Date("2020-01-01T00:00:00Z"),
    recent: new Date("2025-01-01T00:00:00Z"),
    now: new Date("2025-12-23T00:00:00Z"),
    future: new Date("2030-01-01T00:00:00Z"),
} as const;

// Timeout durations in milliseconds
export const TIMEOUTS = {
    short: 100,
    medium: 500,
    long: 1000,
    async: 2000,
    network: 5000,
} as const;

// =============================================================================
// API/NETWORK CONSTANTS
// =============================================================================

export const TEST_API_ENDPOINTS = {
    chat: "/api/chat",
    auth: "/api/auth",
    document: "/api/document",
    history: "/api/history",
    vote: "/api/vote",
    suggestions: "/api/suggestions",
} as const;

export const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_ERROR: 500,
} as const;

// =============================================================================
// ERROR MESSAGES
// =============================================================================

export const ERROR_MESSAGES = {
    unauthorized: "Unauthorized",
    notFound: "Not found",
    invalidInput: "Invalid input",
    networkError: "Network error",
    serverError: "Internal server error",
    sessionExpired: "Session expired",
} as const;

// =============================================================================
// MODEL CONSTANTS
// =============================================================================

export const TEST_MODEL_IDS = {
    default: "gpt-4o-mini",
    reasoning: "o3-mini",
    fast: "gpt-4o-mini",
    advanced: "gpt-4o",
} as const;

// =============================================================================
// VISIBILITY CONSTANTS
// =============================================================================

export const VISIBILITY_TYPES = ["private", "public"] as const;

// =============================================================================
// TOOL CONSTANTS
// =============================================================================

export const TEST_TOOL_NAMES = {
    createDocument: "createDocument",
    updateDocument: "updateDocument",
    requestSuggestions: "requestSuggestions",
    getWeather: "getWeather",
} as const;

export const TEST_TOOL_CALL_ID = "tool-call-test-123";

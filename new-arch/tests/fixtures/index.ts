/**
 * Test Fixtures
 *
 * Shared test data and factory functions for creating test entities.
 * These fixtures provide consistent test data across unit and integration tests.
 */

import { nanoid } from "nanoid";

// =============================================================================
// Constants
// =============================================================================

/** Length for nanoid in email generation */
const EMAIL_NANOID_LENGTH = 8;

// =============================================================================
// E2E Test Constants
// =============================================================================

/**
 * Test user credentials for E2E tests
 * These should be set via environment variables in CI/CD
 */
export const TEST_USER = process.env.TEST_USER_EMAIL ?? "test@example.com";
export const TEST_PASSWORD =
    process.env.TEST_USER_PASSWORD ?? "testpassword123";

/**
 * Pre-built mock user data for E2E tests
 */
export const mockUserData = {
    id: "test-user-123",
    email: TEST_USER,
    name: "Test User",
    type: "pro" as const,
    createdAt: new Date().toISOString(),
};

/**
 * Pre-built mock chat data for E2E tests
 */
export const mockChatData = {
    id: "test-chat-123",
    title: "Test Chat",
    userId: mockUserData.id,
    visibility: "private" as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
};

/**
 * Pre-built mock messages for E2E tests
 */
export const mockMessages = [
    {
        id: "msg-1",
        chatId: mockChatData.id,
        role: "user" as const,
        content: "Hello, how are you?",
        createdAt: new Date().toISOString(),
    },
    {
        id: "msg-2",
        chatId: mockChatData.id,
        role: "assistant" as const,
        content:
            "Hello! I am doing well, thank you for asking. How can I assist you today?",
        createdAt: new Date().toISOString(),
    },
];

// =============================================================================
// User Fixtures
// =============================================================================

export type TestUser = {
    id: string;
    email: string;
    name: string;
    createdAt: Date;
};

/**
 * Create a test user with optional overrides
 */
export function createTestUser(overrides: Partial<TestUser> = {}): TestUser {
    return {
        id: nanoid(),
        email: `test-${nanoid(EMAIL_NANOID_LENGTH)}@example.com`,
        name: "Test User",
        createdAt: new Date(),
        ...overrides,
    };
}

/**
 * Pre-defined test users for consistent testing
 */
export const testUsers = {
    ada: createTestUser({ name: "Ada Lovelace", email: "ada@test.com" }),
    babbage: createTestUser({
        name: "Charles Babbage",
        email: "babbage@test.com",
    }),
    curie: createTestUser({ name: "Marie Curie", email: "curie@test.com" }),
} as const;

// =============================================================================
// Chat Fixtures
// =============================================================================

export type TestMessage = {
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    createdAt: Date;
};

export type TestChat = {
    id: string;
    userId: string;
    title: string;
    messages: TestMessage[];
    createdAt: Date;
    updatedAt: Date;
};

/**
 * Create a test message
 */
export function createTestMessage(
    overrides: Partial<TestMessage> = {}
): TestMessage {
    return {
        id: nanoid(),
        role: "user",
        content: "Test message content",
        createdAt: new Date(),
        ...overrides,
    };
}

/**
 * Create a test chat with messages
 */
export function createTestChat(overrides: Partial<TestChat> = {}): TestChat {
    const now = new Date();
    return {
        id: nanoid(),
        userId: nanoid(),
        title: "Test Chat",
        messages: [
            createTestMessage({ role: "user", content: "Hello" }),
            createTestMessage({ role: "assistant", content: "Hi there!" }),
        ],
        createdAt: now,
        updatedAt: now,
        ...overrides,
    };
}

// =============================================================================
// API Response Fixtures
// =============================================================================

export type MockApiResponse<T> = {
    data: T;
    status: number;
    headers: Record<string, string>;
};

/**
 * Create a mock successful API response
 */
export function createSuccessResponse<T>(data: T): MockApiResponse<T> {
    return {
        data,
        status: 200,
        headers: { "content-type": "application/json" },
    };
}

/**
 * Create a mock error API response
 */
export function createErrorResponse(
    message: string,
    status = 500
): MockApiResponse<{ error: string }> {
    return {
        data: { error: message },
        status,
        headers: { "content-type": "application/json" },
    };
}

// =============================================================================
// Stream Fixtures
// =============================================================================

/**
 * Create a mock text stream for testing AI responses
 */
export function createMockTextStream(chunks: string[]): ReadableStream<string> {
    return new ReadableStream({
        async start(controller) {
            for (const chunk of chunks) {
                controller.enqueue(chunk);
                // Small delay to simulate streaming
                await new Promise((resolve) => setTimeout(resolve, 10));
            }
            controller.close();
        },
    });
}

/**
 * Collect all chunks from a stream into a single string
 */
export async function collectStream(
    stream: ReadableStream<string>
): Promise<string> {
    const reader = stream.getReader();
    const chunks: string[] = [];

    for (;;) {
        const { done, value } = await reader.read();
        if (done) {
            break;
        }
        chunks.push(value);
    }

    return chunks.join("");
}

// =============================================================================
// Artifact Fixtures
// =============================================================================

export type TestArtifact = {
    id: string;
    type: "code" | "text" | "image" | "sheet";
    title: string;
    content: string;
    language?: string;
    chatId: string;
    createdAt: Date;
};

/**
 * Create a test artifact
 */
export function createTestArtifact(
    overrides: Partial<TestArtifact> = {}
): TestArtifact {
    return {
        id: nanoid(),
        type: "code",
        title: "Test Artifact",
        content: 'console.log("Hello, World!");',
        language: "typescript",
        chatId: nanoid(),
        createdAt: new Date(),
        ...overrides,
    };
}

// =============================================================================
// Environment Fixtures
// =============================================================================

/**
 * Mock environment configuration for tests
 */
export const mockEnv = {
    DATABASE_URL: "postgres://test:test@localhost:5432/test",
    OPENAI_API_KEY: "sk-test-key",
    GOOGLE_GENERATIVE_AI_API_KEY: "test-google-key",
    AUTH_SECRET: "test-auth-secret",
    NODE_ENV: "test",
} as const;

/**
 * Set mock environment variables
 */
export function setupMockEnv(): void {
    for (const [key, value] of Object.entries(mockEnv)) {
        process.env[key] = value;
    }
}

/**
 * Clear mock environment variables
 */
export function clearMockEnv(): void {
    for (const key of Object.keys(mockEnv)) {
        delete process.env[key];
    }
}

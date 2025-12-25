/**
 * Test Data Fixtures and Generators
 *
 * Functions for generating test data with randomization and sequences.
 * Useful for property-based testing and creating varied test scenarios.
 *
 * @module tests/utils/fixtures
 */

import type { UIMessage } from "ai";
import type { ArtifactKind, UIArtifact } from "@/features/artifacts/types";
import { ARTIFACT_KINDS, SAMPLE_CODE, SAMPLE_TEXT_CONTENT } from "./constants";

// =============================================================================
// ID GENERATORS
// =============================================================================

let idCounter = 0;

/**
 * Generates a unique sequential ID with optional prefix.
 */
export function generateId(prefix = "id"): string {
    idCounter++;
    return `${prefix}-${idCounter}-${Date.now().toString(36)}`;
}

/**
 * Resets the ID counter (call in beforeEach if needed).
 */
export function resetIdCounter(): void {
    idCounter = 0;
}

/**
 * Generates a UUID-like string for testing.
 */
export function generateUUID(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
        const r = (Math.random() * 16) | 0;
        const v = char === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

// =============================================================================
// MESSAGE FIXTURES
// =============================================================================

/**
 * Generates a conversation with alternating user/assistant messages.
 */
export function generateConversation(
    turns: number,
    options: {
        startWithUser?: boolean;
        includeSystemMessage?: boolean;
    } = {}
): UIMessage[] {
    const { startWithUser = true, includeSystemMessage = false } = options;
    const messages: UIMessage[] = [];

    if (includeSystemMessage) {
        messages.push({
            id: generateId("system"),
            role: "system",
            content: "You are a helpful assistant.",
            parts: [{ type: "text", text: "You are a helpful assistant." }],
            createdAt: new Date(),
        });
    }

    for (let i = 0; i < turns * 2; i++) {
        const isUser = startWithUser ? i % 2 === 0 : i % 2 !== 0;
        const role = isUser ? "user" : "assistant";
        const content = isUser
            ? `User message ${Math.floor(i / 2) + 1}`
            : `Assistant response ${Math.floor(i / 2) + 1}`;

        messages.push({
            id: generateId(role),
            role,
            content,
            parts: [{ type: "text", text: content }],
            createdAt: new Date(Date.now() + i * 1000),
        });
    }

    return messages;
}

/**
 * Generates a message with specific content length.
 */
export function generateMessageWithLength(
    charCount: number,
    role: "user" | "assistant" = "user"
): UIMessage {
    const content = "x".repeat(charCount);
    return {
        id: generateId("msg"),
        role,
        content,
        parts: [{ type: "text", text: content }],
        createdAt: new Date(),
    };
}

/**
 * Generates a message with markdown content.
 */
export function generateMarkdownMessage(): UIMessage {
    return {
        id: generateId("msg"),
        role: "assistant",
        content: SAMPLE_TEXT_CONTENT.withMarkdown,
        parts: [{ type: "text", text: SAMPLE_TEXT_CONTENT.withMarkdown }],
        createdAt: new Date(),
    };
}

/**
 * Generates a message with code content.
 */
export function generateCodeMessage(
    language: keyof typeof SAMPLE_CODE = "typescript"
): UIMessage {
    const content = `Here's some ${language} code:\n\n\`\`\`${language}\n${SAMPLE_CODE[language]}\n\`\`\``;
    return {
        id: generateId("msg"),
        role: "assistant",
        content,
        parts: [{ type: "text", text: content }],
        createdAt: new Date(),
    };
}

// =============================================================================
// ARTIFACT FIXTURES
// =============================================================================

/**
 * Generates an artifact of each kind for testing.
 */
export function generateArtifactSet(): UIArtifact[] {
    return ARTIFACT_KINDS.map((kind) => ({
        documentId: generateId(`artifact-${kind}`),
        title: `Test ${kind} artifact`,
        kind,
        content: getContentForKind(kind),
        isVisible: false,
        status: "idle" as const,
        boundingBox: { top: 0, left: 0, width: 0, height: 0 },
    }));
}

/**
 * Generates an artifact with streaming state.
 */
export function generateStreamingArtifact(
    partialContent: string,
    kind: ArtifactKind = "text"
): UIArtifact {
    return {
        documentId: generateId("streaming"),
        title: "Loading...",
        kind,
        content: partialContent,
        isVisible: true,
        status: "streaming",
        boundingBox: { top: 0, left: 0, width: 0, height: 0 },
    };
}

/**
 * Gets appropriate content for an artifact kind.
 */
function getContentForKind(kind: ArtifactKind): string {
    switch (kind) {
        case "code":
            return SAMPLE_CODE.typescript;
        case "text":
            return SAMPLE_TEXT_CONTENT.medium;
        case "image":
            return "https://example.com/image.png";
        case "sheet":
            return JSON.stringify([
                ["A", "B", "C"],
                [1, 2, 3],
                [4, 5, 6],
            ]);
        default:
            return "";
    }
}

// =============================================================================
// CHAT FIXTURES
// =============================================================================

export type ChatFixture = {
    id: string;
    title: string;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
    visibility: "private" | "public";
    messages: UIMessage[];
};

/**
 * Generates a complete chat fixture with messages.
 */
export function generateChatFixture(
    messageCount = 4,
    options: {
        userId?: string;
        visibility?: "private" | "public";
    } = {}
): ChatFixture {
    const { userId = "user-123", visibility = "private" } = options;
    const id = generateId("chat");
    const createdAt = new Date();

    return {
        id,
        title: `Chat ${id}`,
        userId,
        createdAt,
        updatedAt: createdAt,
        visibility,
        messages: generateConversation(Math.ceil(messageCount / 2)),
    };
}

/**
 * Generates multiple chat fixtures for list testing.
 */
export function generateChatList(
    count: number,
    userId = "user-123"
): ChatFixture[] {
    return Array.from({ length: count }, (_, i) =>
        generateChatFixture(2 + (i % 4) * 2, {
            userId,
            visibility: i % 3 === 0 ? "public" : "private",
        })
    );
}

// =============================================================================
// USER FIXTURES
// =============================================================================

export type UserFixture = {
    id: string;
    email: string;
    name: string;
    image: string | null;
};

/**
 * Generates a user fixture.
 */
export function generateUserFixture(index = 0): UserFixture {
    return {
        id: generateId("user"),
        email: `user${index}@example.com`,
        name: `Test User ${index}`,
        image:
            index % 2 === 0 ? `https://example.com/avatar${index}.png` : null,
    };
}

/**
 * Generates multiple user fixtures.
 */
export function generateUserList(count: number): UserFixture[] {
    return Array.from({ length: count }, (_, i) => generateUserFixture(i));
}

// =============================================================================
// BATCH GENERATORS
// =============================================================================

/**
 * Generates a batch of items using a factory function.
 */
export function generateBatch<T>(
    count: number,
    factory: (index: number) => T
): T[] {
    return Array.from({ length: count }, (_, i) => factory(i));
}

/**
 * Picks a random item from an array.
 */
export function pickRandom<T>(items: readonly T[]): T {
    return items[Math.floor(Math.random() * items.length)];
}

/**
 * Picks n random items from an array (without replacement).
 */
export function pickRandomN<T>(items: readonly T[], n: number): T[] {
    const shuffled = [...items].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(n, items.length));
}

// =============================================================================
// DATE FIXTURES
// =============================================================================

/**
 * Generates dates spread over a time range.
 */
export function generateDateRange(
    count: number,
    options: {
        start?: Date;
        end?: Date;
    } = {}
): Date[] {
    const start =
        options.start?.getTime() ?? Date.now() - 30 * 24 * 60 * 60 * 1000;
    const end = options.end?.getTime() ?? Date.now();
    const step = (end - start) / (count - 1);

    return Array.from({ length: count }, (_, i) => new Date(start + step * i));
}

/**
 * Generates a date relative to now.
 */
export function generateRelativeDate(
    offset: number,
    unit: "days" | "hours" | "minutes" = "days"
): Date {
    const multipliers = {
        days: 24 * 60 * 60 * 1000,
        hours: 60 * 60 * 1000,
        minutes: 60 * 1000,
    };
    return new Date(Date.now() + offset * multipliers[unit]);
}

// =============================================================================
// ERROR FIXTURES
// =============================================================================

/**
 * Generates common error scenarios for testing.
 */
export function generateErrorScenarios() {
    return {
        networkError: new Error("Network request failed"),
        timeoutError: new Error("Request timeout"),
        authError: new Error("Unauthorized"),
        validationError: new Error("Validation failed"),
        notFoundError: new Error("Resource not found"),
        serverError: new Error("Internal server error"),
    };
}

/**
 * Generates an error response object.
 */
export function generateErrorResponse(
    status: number,
    message: string
): { status: number; error: string; message: string } {
    return {
        status,
        error: status >= 500 ? "Server Error" : "Client Error",
        message,
    };
}

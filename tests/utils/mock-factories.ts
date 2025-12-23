/**
 * Mock Factory Functions
 *
 * Factory functions for creating mock objects used in tests.
 * Each factory returns a properly typed mock with sensible defaults.
 *
 * @module tests/utils/mock-factories
 */

import type { UIMessage } from "ai";
import { vi } from "vitest";
import type { ArtifactKind, UIArtifact } from "@/features/artifacts/types";
import type { Attachment } from "@/features/chat/types";
import {
    TEST_CHAT_ID,
    TEST_DATES,
    TEST_DOCUMENT_ID,
    TEST_MESSAGE_ID,
    TEST_USER,
} from "./constants";

// =============================================================================
// USER MOCKS
// =============================================================================

export type MockUser = {
    id: string;
    email: string | null;
    name: string | null;
    image: string | null;
};

export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
    return {
        id: TEST_USER.id,
        email: TEST_USER.email,
        name: TEST_USER.name,
        image: TEST_USER.image,
        ...overrides,
    };
}

export function createMockGuestUser(): MockUser {
    return createMockUser({
        id: `guest-${Date.now()}`,
        email: null,
        name: "Guest",
        image: null,
    });
}

// =============================================================================
// SESSION MOCKS
// =============================================================================

export type MockSession = {
    user: MockUser;
    expires: string;
};

export function createMockSession(
    overrides: Partial<MockSession> = {}
): MockSession {
    return {
        user: createMockUser(),
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        ...overrides,
    };
}

// =============================================================================
// MESSAGE MOCKS
// =============================================================================

export function createMockMessage(
    overrides: Partial<UIMessage> = {}
): UIMessage {
    return {
        id: TEST_MESSAGE_ID,
        role: "user",
        content: "Test message content",
        parts: [{ type: "text", text: "Test message content" }],
        createdAt: TEST_DATES.recent,
        ...overrides,
    };
}

export function createMockUserMessage(content: string, id?: string): UIMessage {
    return createMockMessage({
        id: id ?? `user-msg-${Date.now()}`,
        role: "user",
        content,
        parts: [{ type: "text", text: content }],
    });
}

export function createMockAssistantMessage(
    content: string,
    id?: string
): UIMessage {
    return createMockMessage({
        id: id ?? `assistant-msg-${Date.now()}`,
        role: "assistant",
        content,
        parts: [{ type: "text", text: content }],
    });
}

export function createMockSystemMessage(content: string): UIMessage {
    return createMockMessage({
        id: `system-msg-${Date.now()}`,
        role: "system",
        content,
        parts: [{ type: "text", text: content }],
    });
}

export function createMockMessageWithToolCall(
    toolName: string,
    args: Record<string, unknown>,
    toolCallId?: string
): UIMessage {
    const id = toolCallId ?? `tool-${Date.now()}`;
    return createMockMessage({
        id: `msg-with-tool-${Date.now()}`,
        role: "assistant",
        content: "",
        parts: [
            {
                type: "tool-invocation",
                toolInvocation: {
                    toolCallId: id,
                    toolName,
                    args,
                    state: "call",
                },
            },
        ],
    });
}

// =============================================================================
// CHAT MOCKS
// =============================================================================

export type MockChat = {
    id: string;
    title: string;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
    visibility: "private" | "public";
};

export function createMockChat(overrides: Partial<MockChat> = {}): MockChat {
    return {
        id: TEST_CHAT_ID,
        title: "Test Chat",
        userId: TEST_USER.id,
        createdAt: TEST_DATES.recent,
        updatedAt: TEST_DATES.recent,
        visibility: "private",
        ...overrides,
    };
}

export function createMockChatWithMessages(
    messageCount = 2,
    chatOverrides: Partial<MockChat> = {}
): { chat: MockChat; messages: UIMessage[] } {
    const chat = createMockChat(chatOverrides);
    const messages: UIMessage[] = [];

    for (let i = 0; i < messageCount; i++) {
        const isUser = i % 2 === 0;
        messages.push(
            isUser
                ? createMockUserMessage(`User message ${i + 1}`, `msg-${i}`)
                : createMockAssistantMessage(
                      `Assistant response ${i + 1}`,
                      `msg-${i}`
                  )
        );
    }

    return { chat, messages };
}

// =============================================================================
// ARTIFACT MOCKS
// =============================================================================

export function createMockArtifact(
    overrides: Partial<UIArtifact> = {}
): UIArtifact {
    return {
        documentId: TEST_DOCUMENT_ID,
        title: "Test Artifact",
        kind: "text",
        content: "Test artifact content",
        isVisible: false,
        status: "idle",
        boundingBox: {
            top: 0,
            left: 0,
            width: 0,
            height: 0,
        },
        ...overrides,
    };
}

export function createMockCodeArtifact(
    code: string,
    language = "typescript"
): UIArtifact {
    return createMockArtifact({
        documentId: `code-${Date.now()}`,
        title: `${language} code`,
        kind: "code",
        content: code,
    });
}

export function createMockStreamingArtifact(
    partialContent: string,
    kind: ArtifactKind = "text"
): UIArtifact {
    return createMockArtifact({
        documentId: `streaming-${Date.now()}`,
        title: "Streaming...",
        kind,
        content: partialContent,
        status: "streaming",
        isVisible: true,
    });
}

// =============================================================================
// ATTACHMENT MOCKS
// =============================================================================

export function createMockAttachment(
    overrides: Partial<Attachment> = {}
): Attachment {
    return {
        name: "test-file.txt",
        url: "data:text/plain;base64,SGVsbG8gV29ybGQ=",
        contentType: "text/plain",
        ...overrides,
    };
}

export function createMockImageAttachment(name = "image.png"): Attachment {
    return createMockAttachment({
        name,
        url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        contentType: "image/png",
    });
}

export function createMockPdfAttachment(name = "document.pdf"): Attachment {
    return createMockAttachment({
        name,
        url: "data:application/pdf;base64,JVBERi0xLjQKJeLjz9M=",
        contentType: "application/pdf",
    });
}

// =============================================================================
// FUNCTION MOCKS
// =============================================================================

/**
 * Creates a mock fetch function with configurable responses.
 */
export function createMockFetch(
    responses: Array<{ status?: number; data?: unknown; error?: Error }>
) {
    let callIndex = 0;
    return vi.fn().mockImplementation(() => {
        const response = responses[callIndex] ?? responses.at(-1);
        callIndex++;

        if (response?.error) {
            return Promise.reject(response.error);
        }

        return Promise.resolve({
            ok: (response?.status ?? 200) < 400,
            status: response?.status ?? 200,
            json: () => Promise.resolve(response?.data ?? {}),
            text: () => Promise.resolve(JSON.stringify(response?.data ?? {})),
        });
    });
}

/**
 * Creates a mock function that resolves after a delay.
 */
export function createDelayedMock<T>(value: T, delay = 100) {
    return vi
        .fn()
        .mockImplementation(
            () =>
                new Promise((resolve) =>
                    setTimeout(() => resolve(value), delay)
                )
        );
}

/**
 * Creates a mock function that fails n times before succeeding.
 */
export function createRetryableMock<T>(
    successValue: T,
    failCount: number,
    error = new Error("Mock error")
) {
    let attempts = 0;
    return vi.fn().mockImplementation(() => {
        attempts++;
        if (attempts <= failCount) {
            return Promise.reject(error);
        }
        return Promise.resolve(successValue);
    });
}

// =============================================================================
// ROUTER/NAVIGATION MOCKS
// =============================================================================

export function createMockRouter() {
    return {
        push: vi.fn(),
        replace: vi.fn(),
        back: vi.fn(),
        forward: vi.fn(),
        refresh: vi.fn(),
        prefetch: vi.fn(),
    };
}

export function createMockPathname(pathname = "/") {
    return pathname;
}

export function createMockSearchParams(params: Record<string, string> = {}) {
    return new URLSearchParams(params);
}

// =============================================================================
// EVENT MOCKS
// =============================================================================

export function createMockEvent<T extends Event>(
    type: string,
    overrides: Partial<T> = {}
): Partial<T> {
    return {
        type,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        ...overrides,
    } as Partial<T>;
}

export function createMockKeyboardEvent(
    key: string,
    options: Partial<KeyboardEvent> = {}
): Partial<KeyboardEvent> {
    return createMockEvent<KeyboardEvent>("keydown", {
        key,
        code: key,
        shiftKey: false,
        ctrlKey: false,
        altKey: false,
        metaKey: false,
        ...options,
    });
}

export function createMockMouseEvent(
    type = "click",
    options: Partial<MouseEvent> = {}
): Partial<MouseEvent> {
    return createMockEvent<MouseEvent>(type, {
        button: 0,
        clientX: 0,
        clientY: 0,
        ...options,
    });
}

/**
 * Chat API Route Unit Tests
 * Tests /api/chat/[id] GET and DELETE endpoints
 *
 * @module tests/unit/api/chat.route.test
 */

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies before imports
vi.mock("@/lib/auth", () => ({
    getSessionCached: vi.fn(),
}));

vi.mock("@/lib/data", () => ({
    createContext: vi.fn((userId, userType) => ({ userId, userType })),
    getChatCached: vi.fn(),
    deleteChatCached: vi.fn(),
}));

vi.mock("@/lib/utils/logger", () => ({
    logger: {
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
    },
}));

import { DELETE, GET } from "@/app/api/chat/[id]/route";
// Import after mocks
import { getSessionCached } from "@/lib/auth";
import { createContext, deleteChatCached, getChatCached } from "@/lib/data";

// Type helpers
const mockGetSessionCached = vi.mocked(getSessionCached);
const mockGetChatCached = vi.mocked(getChatCached);
const mockDeleteChatCached = vi.mocked(deleteChatCached);
const mockCreateContext = vi.mocked(createContext);

// Test fixtures
const testUserId = "user-123";
const testChatId = "chat-456";

const mockSession = {
    user: {
        id: testUserId,
        type: "regular" as const,
        email: "test@example.com",
    },
    expires: new Date(Date.now() + 86_400_000).toISOString(),
};

const mockChat = {
    id: testChatId,
    title: "Test Chat",
    createdAt: new Date("2024-01-01"),
    visibility: "private" as const,
    userId: testUserId,
};

/** Base URL for test requests */
const TEST_BASE_URL = "http://localhost:3000";

// Helper to create route params
function createRouteParams(id: string) {
    return { params: Promise.resolve({ id }) };
}

// Helper to create NextRequest
function createRequest(path: string): NextRequest {
    return new NextRequest(`${TEST_BASE_URL}${path}`);
}

describe("Chat API Route /api/chat/[id]", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockCreateContext.mockImplementation(
            (userId: string, userType: string) => ({
                userId,
                userType,
            })
        );
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    describe("GET /api/chat/[id]", () => {
        it("should return 401 if not authenticated", async () => {
            mockGetSessionCached.mockResolvedValue(null);

            const request = createRequest(`/api/chat/${testChatId}`);
            const response = await GET(request, createRouteParams(testChatId));

            expect(response.status).toBe(401);
            const json = await response.json();
            expect(json.error.code).toBe("auth:unauthorized");
        });

        it("should return 401 if session has no user ID", async () => {
            mockGetSessionCached.mockResolvedValue({
                user: { id: "", type: "regular" },
                expires: new Date().toISOString(),
            } as typeof mockSession);

            const request = createRequest(`/api/chat/${testChatId}`);
            const response = await GET(request, createRouteParams(testChatId));

            expect(response.status).toBe(401);
        });

        it("should return 404 if chat not found", async () => {
            mockGetSessionCached.mockResolvedValue(mockSession);
            mockGetChatCached.mockResolvedValue(null);

            const request = createRequest(`/api/chat/${testChatId}`);
            const response = await GET(request, createRouteParams(testChatId));

            expect(response.status).toBe(404);
            const json = await response.json();
            expect(json.error.code).toBe("resource:not_found:chat");
        });

        it("should return chat data if authenticated and chat exists", async () => {
            mockGetSessionCached.mockResolvedValue(mockSession);
            mockGetChatCached.mockResolvedValue(mockChat);

            const request = createRequest(`/api/chat/${testChatId}`);
            const response = await GET(request, createRouteParams(testChatId));

            expect(response.status).toBe(200);
            const json = await response.json();
            expect(json).toEqual({
                id: testChatId,
                title: "Test Chat",
                createdAt: mockChat.createdAt.toISOString(),
                visibility: "private",
                userId: testUserId,
            });
        });

        it("should create context with correct user info", async () => {
            mockGetSessionCached.mockResolvedValue(mockSession);
            mockGetChatCached.mockResolvedValue(mockChat);

            const request = createRequest(`/api/chat/${testChatId}`);
            await GET(request, createRouteParams(testChatId));

            expect(mockCreateContext).toHaveBeenCalledWith(
                testUserId,
                "regular"
            );
        });

        it("should pass correct chatId to getChatCached", async () => {
            mockGetSessionCached.mockResolvedValue(mockSession);
            mockGetChatCached.mockResolvedValue(mockChat);

            const request = createRequest(`/api/chat/${testChatId}`);
            await GET(request, createRouteParams(testChatId));

            expect(mockGetChatCached).toHaveBeenCalledWith(
                testChatId,
                expect.objectContaining({ userId: testUserId })
            );
        });

        it("should handle guest users", async () => {
            const guestSession = {
                user: { id: "guest-123", type: "guest" as const },
                expires: new Date().toISOString(),
            };
            mockGetSessionCached.mockResolvedValue(guestSession);
            mockGetChatCached.mockResolvedValue({
                ...mockChat,
                userId: "guest-123",
            });

            const request = createRequest(`/api/chat/${testChatId}`);
            const response = await GET(request, createRouteParams(testChatId));

            expect(response.status).toBe(200);
            expect(mockCreateContext).toHaveBeenCalledWith(
                "guest-123",
                "guest"
            );
        });
    });

    describe("DELETE /api/chat/[id]", () => {
        it("should return 401 if not authenticated", async () => {
            mockGetSessionCached.mockResolvedValue(null);

            const request = createRequest(`/api/chat/${testChatId}`);
            const response = await DELETE(
                request,
                createRouteParams(testChatId)
            );

            expect(response.status).toBe(401);
            const json = await response.json();
            expect(json.error.code).toBe("auth:unauthorized");
        });

        it("should return 404 if chat not found or not owned", async () => {
            mockGetSessionCached.mockResolvedValue(mockSession);
            mockDeleteChatCached.mockResolvedValue(false);

            const request = createRequest(`/api/chat/${testChatId}`);
            const response = await DELETE(
                request,
                createRouteParams(testChatId)
            );

            expect(response.status).toBe(404);
            const json = await response.json();
            expect(json.error.code).toBe("resource:not_found:chat");
        });

        it("should return 204 on successful deletion", async () => {
            mockGetSessionCached.mockResolvedValue(mockSession);
            mockDeleteChatCached.mockResolvedValue(true);

            const request = createRequest(`/api/chat/${testChatId}`);
            const response = await DELETE(
                request,
                createRouteParams(testChatId)
            );

            expect(response.status).toBe(204);
        });

        it("should call deleteChatCached with correct params", async () => {
            mockGetSessionCached.mockResolvedValue(mockSession);
            mockDeleteChatCached.mockResolvedValue(true);

            const request = createRequest(`/api/chat/${testChatId}`);
            await DELETE(request, createRouteParams(testChatId));

            expect(mockDeleteChatCached).toHaveBeenCalledWith(
                testChatId,
                expect.objectContaining({ userId: testUserId })
            );
        });

        it("should create context for deletion", async () => {
            mockGetSessionCached.mockResolvedValue(mockSession);
            mockDeleteChatCached.mockResolvedValue(true);

            const request = createRequest(`/api/chat/${testChatId}`);
            await DELETE(request, createRouteParams(testChatId));

            expect(mockCreateContext).toHaveBeenCalledWith(
                testUserId,
                "regular"
            );
        });
    });
});

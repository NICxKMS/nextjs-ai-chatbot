/**
 * Vote API Route Unit Tests
 * Tests /api/vote PATCH endpoint
 *
 * @module tests/unit/api/vote.route.test
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies before imports
vi.mock("@/lib/auth", () => ({
    requireAuthForRoute: vi.fn(),
    isAuthResponse: vi.fn(),
}));

vi.mock("@/lib/data", () => ({
    createContext: vi.fn((userId, userType) => ({ userId, userType })),
    getChatCached: vi.fn(),
    getChatWithMessagesCached: vi.fn(),
    saveVoteCached: vi.fn(),
}));

import { PATCH } from "@/app/api/vote/route";
// Import after mocks
import { isAuthResponse, requireAuthForRoute } from "@/lib/auth";
import {
    getChatCached,
    getChatWithMessagesCached,
    saveVoteCached,
} from "@/lib/data";

// Type helpers
const mockRequireAuthForRoute = vi.mocked(requireAuthForRoute);
const mockIsAuthResponse = vi.mocked(isAuthResponse);
const mockGetChatCached = vi.mocked(getChatCached);
const mockGetChatWithMessagesCached = vi.mocked(getChatWithMessagesCached);
const mockSaveVoteCached = vi.mocked(saveVoteCached);

// Test fixtures
const testUserId = "user-123";
const testChatId = "550e8400-e29b-41d4-a716-446655440000";
const testMessageId = "660e8400-e29b-41d4-a716-446655440001";

const mockSession = {
    user: {
        id: testUserId,
        type: "regular" as const,
        email: "test@example.com",
    },
    expires: new Date(Date.now() + 86_400_000).toISOString(),
};

const mockCtx = { userId: testUserId, userType: "regular" as const };

const mockChat = {
    id: testChatId,
    title: "Test Chat",
    createdAt: new Date("2024-01-01"),
    visibility: "private" as const,
    userId: testUserId,
};

const mockChatWithMessages = {
    ...mockChat,
    messages: [
        { id: testMessageId, role: "assistant", content: "Hello" },
        { id: "other-message", role: "user", content: "Hi" },
    ],
};

// Helper to create Request with JSON body
function createRequest(body: unknown): Request {
    return new Request("http://localhost:3000/api/vote", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
}

describe("Vote API Route /api/vote", () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Default: authenticated regular user
        mockRequireAuthForRoute.mockResolvedValue({
            session: mockSession,
            ctx: mockCtx,
        });
        mockIsAuthResponse.mockReturnValue(false);
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    describe("PATCH /api/vote", () => {
        describe("Authentication", () => {
            it("should return auth error if not authenticated", async () => {
                const authResponse = new Response(
                    JSON.stringify({ error: "Unauthorized" }),
                    { status: 401 }
                );
                mockRequireAuthForRoute.mockResolvedValue(authResponse);
                mockIsAuthResponse.mockReturnValue(true);

                const request = createRequest({
                    chatId: testChatId,
                    messageId: testMessageId,
                    type: "up",
                });

                const response = await PATCH(request);

                expect(response.status).toBe(401);
            });

            it("should return 403 for guest users", async () => {
                const guestSession = {
                    user: { id: "guest-123", type: "guest" as const },
                    expires: new Date().toISOString(),
                };
                mockRequireAuthForRoute.mockResolvedValue({
                    session: guestSession,
                    ctx: { userId: "guest-123", userType: "guest" },
                });
                mockIsAuthResponse.mockReturnValue(false);

                const request = createRequest({
                    chatId: testChatId,
                    messageId: testMessageId,
                    type: "up",
                });

                const response = await PATCH(request);

                expect(response.status).toBe(403);
                const json = await response.json();
                // AppError returns { error: { code, message } }
                expect(json.error.code).toBe("resource:access_denied:vote");
            });
        });

        describe("Validation", () => {
            it("should return 400 for invalid JSON body", async () => {
                const request = new Request("http://localhost:3000/api/vote", {
                    method: "PATCH",
                    body: "invalid json",
                });

                const response = await PATCH(request);

                expect(response.status).toBe(400);
                const json = await response.json();
                // AppError returns { error: { code, message } }
                expect(json.error.message).toContain("Invalid JSON");
            });

            it("should return 400 for missing chatId", async () => {
                const request = createRequest({
                    messageId: testMessageId,
                    type: "up",
                });

                const response = await PATCH(request);

                expect(response.status).toBe(400);
            });

            it("should return 400 for invalid chatId format", async () => {
                const request = createRequest({
                    chatId: "not-a-uuid",
                    messageId: testMessageId,
                    type: "up",
                });

                const response = await PATCH(request);

                expect(response.status).toBe(400);
                const json = await response.json();
                // AppError returns { error: { code, message } }
                expect(json.error.message).toContain("Invalid chat ID");
            });

            it("should return 400 for invalid messageId format", async () => {
                const request = createRequest({
                    chatId: testChatId,
                    messageId: "not-a-uuid",
                    type: "up",
                });

                const response = await PATCH(request);

                expect(response.status).toBe(400);
                const json = await response.json();
                // AppError returns { error: { code, message } }
                expect(json.error.message).toContain("Invalid message ID");
            });

            it("should return 400 for invalid vote type", async () => {
                const request = createRequest({
                    chatId: testChatId,
                    messageId: testMessageId,
                    type: "invalid",
                });

                const response = await PATCH(request);

                expect(response.status).toBe(400);
                const json = await response.json();
                // AppError returns { error: { code, message } }
                expect(json.error.message).toContain("up");
            });
        });

        describe("Resource Verification", () => {
            it("should return 404 if chat not found", async () => {
                mockGetChatCached.mockResolvedValue(null);

                const request = createRequest({
                    chatId: testChatId,
                    messageId: testMessageId,
                    type: "up",
                });

                const response = await PATCH(request);

                expect(response.status).toBe(404);
                const json = await response.json();
                // AppError returns { error: { code, message } }
                expect(json.error.code).toBe("resource:not_found:chat");
            });

            it("should return 404 if message not in chat", async () => {
                mockGetChatCached.mockResolvedValue(mockChat);
                mockGetChatWithMessagesCached.mockResolvedValue({
                    ...mockChatWithMessages,
                    messages: [
                        {
                            id: "different-message",
                            role: "user",
                            content: "Hi",
                        },
                    ],
                });

                const request = createRequest({
                    chatId: testChatId,
                    messageId: testMessageId,
                    type: "up",
                });

                const response = await PATCH(request);

                expect(response.status).toBe(404);
                const json = await response.json();
                // AppError returns { error: { code, message } }
                expect(json.error.code).toBe("resource:not_found:message");
            });
        });

        describe("Success Cases", () => {
            beforeEach(() => {
                mockGetChatCached.mockResolvedValue(mockChat);
                mockGetChatWithMessagesCached.mockResolvedValue(
                    mockChatWithMessages
                );
            });

            it("should save upvote successfully", async () => {
                mockSaveVoteCached.mockResolvedValue({
                    chatId: testChatId,
                    messageId: testMessageId,
                    isUpvoted: true,
                });

                const request = createRequest({
                    chatId: testChatId,
                    messageId: testMessageId,
                    type: "up",
                });

                const response = await PATCH(request);

                expect(response.status).toBe(200);
                const json = await response.json();
                expect(json.success).toBe(true);
                expect(json.messageId).toBe(testMessageId);
                expect(json.type).toBe("up");
            });

            it("should save downvote successfully", async () => {
                mockSaveVoteCached.mockResolvedValue({
                    chatId: testChatId,
                    messageId: testMessageId,
                    isUpvoted: false,
                });

                const request = createRequest({
                    chatId: testChatId,
                    messageId: testMessageId,
                    type: "down",
                });

                const response = await PATCH(request);

                expect(response.status).toBe(200);
                const json = await response.json();
                expect(json.success).toBe(true);
                expect(json.type).toBe("down");
            });

            it("should call saveVoteCached with correct params", async () => {
                mockSaveVoteCached.mockResolvedValue({
                    chatId: testChatId,
                    messageId: testMessageId,
                    isUpvoted: true,
                });

                const request = createRequest({
                    chatId: testChatId,
                    messageId: testMessageId,
                    type: "up",
                });

                await PATCH(request);

                expect(mockSaveVoteCached).toHaveBeenCalledWith(
                    testChatId,
                    testMessageId,
                    "up",
                    expect.objectContaining({ userId: testUserId })
                );
            });
        });

        describe("Error Cases", () => {
            it("should return 500 if save fails", async () => {
                mockGetChatCached.mockResolvedValue(mockChat);
                mockGetChatWithMessagesCached.mockResolvedValue(
                    mockChatWithMessages
                );
                mockSaveVoteCached.mockResolvedValue(null);

                const request = createRequest({
                    chatId: testChatId,
                    messageId: testMessageId,
                    type: "up",
                });

                const response = await PATCH(request);

                expect(response.status).toBe(500);
                const json = await response.json();
                // AppError returns { error: { code, message } }
                expect(json.error.message).toContain("Failed to save vote");
            });
        });
    });
});

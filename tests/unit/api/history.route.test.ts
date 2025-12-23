/**
 * History API Route Unit Tests
 * Tests /api/history GET and DELETE endpoints
 *
 * @module tests/unit/api/history.route.test
 */

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies before imports
vi.mock("@/lib/auth", () => ({
    getSession: vi.fn(),
}));

vi.mock("@/lib/data", () => ({
    createContext: vi.fn((userId, userType) => ({ userId, userType })),
    getUserChatsCached: vi.fn(),
    deleteAllUserChatsCached: vi.fn(),
}));

vi.mock("@/lib/utils/logger", () => ({
    logger: {
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
    },
}));

import { DELETE, GET } from "@/app/api/history/route";
// Import after mocks
import { getSession } from "@/lib/auth";
import {
    createContext,
    deleteAllUserChatsCached,
    getUserChatsCached,
} from "@/lib/data";

// Type helpers
const mockGetSession = vi.mocked(getSession);
const mockGetUserChatsCached = vi.mocked(getUserChatsCached);
const mockDeleteAllUserChatsCached = vi.mocked(deleteAllUserChatsCached);
const mockCreateContext = vi.mocked(createContext);

// Test fixtures
const testUserId = "user-123";

const mockSession = {
    user: {
        id: testUserId,
        type: "regular" as const,
        email: "test@example.com",
    },
    expires: new Date(Date.now() + 86_400_000).toISOString(),
};

const mockChats = [
    {
        id: "chat-1",
        title: "First Chat",
        createdAt: new Date("2024-01-01"),
        visibility: "private" as const,
        userId: testUserId,
    },
    {
        id: "chat-2",
        title: "Second Chat",
        createdAt: new Date("2024-01-02"),
        visibility: "public" as const,
        userId: testUserId,
    },
];

// Helper to create NextRequest
function createRequest(path: string): NextRequest {
    return new NextRequest(`http://localhost:3000${path}`);
}

describe("History API Route /api/history", () => {
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

    describe("GET /api/history", () => {
        it("should return 401 if not authenticated", async () => {
            mockGetSession.mockResolvedValue(null);

            const request = createRequest("/api/history");
            const response = await GET(request);

            expect(response.status).toBe(401);
            const json = await response.json();
            expect(json.error).toBe("Unauthorized");
        });

        it("should return 401 if session has no user ID", async () => {
            mockGetSession.mockResolvedValue({
                user: { id: "", type: "regular" },
                expires: new Date().toISOString(),
            } as typeof mockSession);

            const request = createRequest("/api/history");
            const response = await GET(request);

            expect(response.status).toBe(401);
        });

        it("should return empty chats array when no history", async () => {
            mockGetSession.mockResolvedValue(mockSession);
            mockGetUserChatsCached.mockResolvedValue([]);

            const request = createRequest("/api/history");
            const response = await GET(request);

            expect(response.status).toBe(200);
            const json = await response.json();
            expect(json.chats).toEqual([]);
            expect(json.hasMore).toBe(false);
            expect(json.nextCursor).toBeNull();
        });

        it("should return chat history when available", async () => {
            mockGetSession.mockResolvedValue(mockSession);
            mockGetUserChatsCached.mockResolvedValue(mockChats);

            const request = createRequest("/api/history");
            const response = await GET(request);

            expect(response.status).toBe(200);
            const json = await response.json();
            expect(json.chats).toHaveLength(2);
            expect(json.chats[0]).toEqual({
                id: "chat-1",
                title: "First Chat",
                createdAt: mockChats[0].createdAt.toISOString(),
                visibility: "private",
                userId: testUserId,
            });
            expect(json.chats[1]).toEqual({
                id: "chat-2",
                title: "Second Chat",
                createdAt: mockChats[1].createdAt.toISOString(),
                visibility: "public",
                userId: testUserId,
            });
        });

        it("should create context with correct user info", async () => {
            mockGetSession.mockResolvedValue(mockSession);
            mockGetUserChatsCached.mockResolvedValue([]);

            const request = createRequest("/api/history");
            await GET(request);

            expect(mockCreateContext).toHaveBeenCalledWith(
                testUserId,
                "regular"
            );
        });

        it("should handle guest users", async () => {
            const guestSession = {
                user: { id: "guest-123", type: "guest" as const },
                expires: new Date().toISOString(),
            };
            mockGetSession.mockResolvedValue(guestSession);
            mockGetUserChatsCached.mockResolvedValue([]);

            const request = createRequest("/api/history");
            const response = await GET(request);

            expect(response.status).toBe(200);
            expect(mockCreateContext).toHaveBeenCalledWith(
                "guest-123",
                "guest"
            );
        });

        it("should always return hasMore as false and nextCursor as null", async () => {
            mockGetSession.mockResolvedValue(mockSession);
            mockGetUserChatsCached.mockResolvedValue(mockChats);

            const request = createRequest("/api/history");
            const response = await GET(request);

            const json = await response.json();
            expect(json.hasMore).toBe(false);
            expect(json.nextCursor).toBeNull();
        });

        it("should return 500 on internal error", async () => {
            mockGetSession.mockResolvedValue(mockSession);
            mockGetUserChatsCached.mockRejectedValue(
                new Error("Database error")
            );

            const request = createRequest("/api/history");
            const response = await GET(request);

            expect(response.status).toBe(500);
            const json = await response.json();
            expect(json.error).toBe("Internal error");
        });
    });

    describe("DELETE /api/history", () => {
        it("should return 401 if not authenticated", async () => {
            mockGetSession.mockResolvedValue(null);

            const request = createRequest("/api/history");
            const response = await DELETE(request);

            expect(response.status).toBe(401);
            const json = await response.json();
            expect(json.error).toBe("Unauthorized");
        });

        it("should return 401 if session has no user ID", async () => {
            mockGetSession.mockResolvedValue({
                user: { id: "", type: "regular" },
                expires: new Date().toISOString(),
            } as typeof mockSession);

            const request = createRequest("/api/history");
            const response = await DELETE(request);

            expect(response.status).toBe(401);
        });

        it("should delete all chats successfully", async () => {
            mockGetSession.mockResolvedValue(mockSession);
            mockDeleteAllUserChatsCached.mockResolvedValue(undefined);

            const request = createRequest("/api/history");
            const response = await DELETE(request);

            expect(response.status).toBe(200);
            const json = await response.json();
            expect(json.success).toBe(true);
        });

        it("should call deleteAllUserChatsCached with correct context", async () => {
            mockGetSession.mockResolvedValue(mockSession);
            mockDeleteAllUserChatsCached.mockResolvedValue(undefined);

            const request = createRequest("/api/history");
            await DELETE(request);

            expect(mockDeleteAllUserChatsCached).toHaveBeenCalledWith(
                expect.objectContaining({ userId: testUserId })
            );
        });

        it("should create context for deletion", async () => {
            mockGetSession.mockResolvedValue(mockSession);
            mockDeleteAllUserChatsCached.mockResolvedValue(undefined);

            const request = createRequest("/api/history");
            await DELETE(request);

            expect(mockCreateContext).toHaveBeenCalledWith(
                testUserId,
                "regular"
            );
        });

        it("should return 500 on internal error", async () => {
            mockGetSession.mockResolvedValue(mockSession);
            mockDeleteAllUserChatsCached.mockRejectedValue(
                new Error("Database error")
            );

            const request = createRequest("/api/history");
            const response = await DELETE(request);

            expect(response.status).toBe(500);
            const json = await response.json();
            expect(json.error).toBe("Internal error");
        });
    });
});

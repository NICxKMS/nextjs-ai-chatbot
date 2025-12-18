import { beforeEach, describe, expect, it, vi } from "vitest";

const mockDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
};

vi.mock("@/lib/db", () => ({ db: mockDb }));

describe("Chat Data Layer", () => {
    beforeEach(() => vi.clearAllMocks());

    describe("getChatById", () => {
        it("returns chat when found", async () => {
            mockDb.returning.mockResolvedValueOnce([
                { id: "1", title: "Test" },
            ]);
            const { getChatById } = await import("@/lib/data/chat");
            const result = await getChatById("1");
            expect(result).toEqual({ id: "1", title: "Test" });
        });

        it("returns null when not found", async () => {
            mockDb.returning.mockResolvedValueOnce([]);
            const { getChatById } = await import("@/lib/data/chat");
            const result = await getChatById("nonexistent");
            expect(result).toBeNull();
        });
    });

    describe("getChatsByUserId", () => {
        it("returns chats for user", async () => {
            const chats = [{ id: "1" }, { id: "2" }];
            mockDb.returning.mockResolvedValueOnce(chats);
            const { getChatsByUserId } = await import("@/lib/data/chat");
            const result = await getChatsByUserId("user-1");
            expect(result).toHaveLength(2);
        });

        it("returns empty array when no chats", async () => {
            mockDb.returning.mockResolvedValueOnce([]);
            const { getChatsByUserId } = await import("@/lib/data/chat");
            const result = await getChatsByUserId("user-no-chats");
            expect(result).toEqual([]);
        });
    });

    describe("createChat", () => {
        it("creates chat with provided data", async () => {
            const newChat = { id: "new", userId: "u1", title: "New Chat" };
            mockDb.returning.mockResolvedValueOnce([newChat]);
            const { createChat } = await import("@/lib/data/chat");
            const result = await createChat({
                userId: "u1",
                title: "New Chat",
            });
            expect(result).toEqual(newChat);
        });
    });

    describe("deleteChat", () => {
        it("deletes chat successfully", async () => {
            mockDb.returning.mockResolvedValueOnce([{ id: "1" }]);
            const { deleteChat } = await import("@/lib/data/chat");
            const result = await deleteChat("1", "user-1");
            expect(result).toBe(true);
        });

        it("returns false if chat not found", async () => {
            mockDb.returning.mockResolvedValueOnce([]);
            const { deleteChat } = await import("@/lib/data/chat");
            const result = await deleteChat("nonexistent", "user-1");
            expect(result).toBe(false);
        });
    });
});

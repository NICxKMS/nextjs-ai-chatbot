import { beforeEach, describe, expect, it, vi } from "vitest";

const mockDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    onConflictDoUpdate: vi.fn().mockReturnThis(),
};

vi.mock("@/lib/data/db", () => ({ db: mockDb }));

describe("Vote Data Layer", () => {
    beforeEach(() => vi.clearAllMocks());

    describe("getVotesByChatId", () => {
        it("returns votes when they exist", async () => {
            mockDb.where.mockResolvedValueOnce([
                { messageId: "m1", chatId: "c1", isUpvoted: true },
            ]);
            const { getVotesByChatId } = await import("@/lib/data/vote");
            const result = await getVotesByChatId("c1");
            expect(result).toHaveLength(1);
        });
    });

    describe("upsertVote", () => {
        it("creates new vote", async () => {
            mockDb.returning.mockResolvedValueOnce([
                { messageId: "m1", chatId: "c1", isUpvoted: true },
            ]);
            const { upsertVote } = await import("@/lib/data/vote");
            const result = await upsertVote({
                messageId: "m1",
                chatId: "c1",
                userId: "u1",
                type: "up",
            });
            expect(result.isUpvoted).toBe(true);
        });
    });
});

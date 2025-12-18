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
    delete: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
};

vi.mock("@/lib/data/db", () => ({ db: mockDb }));

describe("Document Data Layer", () => {
    beforeEach(() => vi.clearAllMocks());

    describe("getDocumentById", () => {
        it("returns document when found", async () => {
            mockDb.limit.mockResolvedValueOnce([{ id: "d1", title: "Doc" }]);
            const { getDocumentById } = await import("@/lib/data/document");
            const result = await getDocumentById("d1");
            expect(result?.title).toBe("Doc");
        });
    });

    describe("createDocument", () => {
        it("creates document with kind", async () => {
            const doc = { id: "d1", kind: "text", title: "New Doc" };
            mockDb.returning.mockResolvedValueOnce([doc]);
            const { createDocument } = await import("@/lib/data/document");
            const result = await createDocument({
                kind: "text",
                title: "New Doc",
                userId: "u1",
                chatId: "c1",
            });
            expect(result.kind).toBe("text");
        });
    });

    describe("updateDocument", () => {
        it("updates document content", async () => {
            mockDb.returning.mockResolvedValueOnce([
                { id: "d1", content: "Updated" },
            ]);
            const { updateDocument } = await import("@/lib/data/document");
            const result = await updateDocument({
                id: "d1",
                createdAt: new Date(),
                content: "Updated",
            });
            expect(result?.content).toBe("Updated");
        });
    });
});

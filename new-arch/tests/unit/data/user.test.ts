import { beforeEach, describe, expect, it, vi } from "vitest";

const mockDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn(),
};

vi.mock("@/lib/db", () => ({ db: mockDb }));

describe("User Data Layer", () => {
    beforeEach(() => vi.clearAllMocks());

    describe("getUserById", () => {
        it("returns user when found", async () => {
            mockDb.returning.mockResolvedValueOnce([
                { id: "u1", email: "test@example.com" },
            ]);
            const { getUserById } = await import("@/lib/data/user");
            const result = await getUserById("u1");
            expect(result?.email).toBe("test@example.com");
        });
    });

    describe("getUserByEmail", () => {
        it("returns user by email", async () => {
            mockDb.returning.mockResolvedValueOnce([
                { id: "u1", email: "test@example.com" },
            ]);
            const { getUserByEmail } = await import("@/lib/data/user");
            const result = await getUserByEmail("test@example.com");
            expect(result?.id).toBe("u1");
        });

        it("returns null for unknown email", async () => {
            mockDb.returning.mockResolvedValueOnce([]);
            const { getUserByEmail } = await import("@/lib/data/user");
            const result = await getUserByEmail("unknown@example.com");
            expect(result).toBeNull();
        });
    });

    describe("createUser", () => {
        it("creates user with hashed password", async () => {
            const user = { id: "u1", email: "new@example.com", type: "free" };
            mockDb.returning.mockResolvedValueOnce([user]);
            const { createUser } = await import("@/lib/data/user");
            const result = await createUser({
                email: "new@example.com",
                passwordHash: "hashed_secret",
            });
            expect(result).toBeDefined();
        });
    });
});

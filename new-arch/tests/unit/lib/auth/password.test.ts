import { describe, expect, it } from "vitest";

describe("Password Utilities", () => {
    describe("hashPassword", () => {
        it("creates hash different from input", async () => {
            const { hashPassword } = await import("@/lib/auth/password");
            const hash = await hashPassword("mypassword");
            expect(hash).not.toBe("mypassword");
            expect(hash.length).toBeGreaterThan(0);
        });

        it("creates different hashes for same password", async () => {
            const { hashPassword } = await import("@/lib/auth/password");
            const hash1 = await hashPassword("mypassword");
            const hash2 = await hashPassword("mypassword");
            expect(hash1).not.toBe(hash2); // Due to salt
        });
    });

    describe("verifyPassword", () => {
        it("verifies correct password", async () => {
            const { hashPassword, verifyPassword } = await import(
                "@/lib/auth/password"
            );
            const hash = await hashPassword("mypassword");
            const result = await verifyPassword("mypassword", hash);
            expect(result).toBe(true);
        });

        it("rejects incorrect password", async () => {
            const { hashPassword, verifyPassword } = await import(
                "@/lib/auth/password"
            );
            const hash = await hashPassword("mypassword");
            const result = await verifyPassword("wrongpassword", hash);
            expect(result).toBe(false);
        });
    });
});

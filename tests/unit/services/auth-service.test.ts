/**
 * P3-084: Guest Migration Tests (AuthService)
 *
 * Unit tests for lib/services/auth-service.ts
 * Tests guest migration validation and error handling.
 *
 * Note: Full migration requires integration tests due to DB dependency.
 * This file tests the service layer validation logic.
 *
 * @module tests/unit/services/auth-service.test.ts
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// Mocks
// ============================================================================

// Mock server-only to allow imports
vi.mock("server-only", () => ({}));

// Mock the logger to avoid console noise
vi.mock("@/lib/utils/logger", () => ({
    logger: {
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
    },
}));

// Mock the data layer migration function
const mockMigrateGuestData = vi.fn();
vi.mock("@/lib/data/migrate-guest", () => ({
    migrateGuestToAuthUser: (...args: unknown[]) =>
        mockMigrateGuestData(...args),
}));

// ============================================================================
// Test Setup
// ============================================================================

import {
    AuthService,
    type MigrateGuestParams,
} from "@/lib/services/auth-service";
import { logger } from "@/lib/utils/logger";

// ============================================================================
// Tests
// ============================================================================

describe("AuthService", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    describe("migrateGuestToAuthUser", () => {
        describe("Input Validation", () => {
            it("should reject empty guestId", async () => {
                const params: MigrateGuestParams = {
                    guestId: "",
                    authUserId: "550e8400-e29b-41d4-a716-446655440000",
                };

                const result = await AuthService.migrateGuestToAuthUser(params);

                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(result.code).toBe("validation:invalid_guest_id");
                    expect(result.error).toBe("Invalid guest ID");
                }
            });

            it("should reject null guestId", async () => {
                const params = {
                    guestId: null as unknown as string,
                    authUserId: "550e8400-e29b-41d4-a716-446655440000",
                };

                const result = await AuthService.migrateGuestToAuthUser(params);

                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(result.code).toBe("validation:invalid_guest_id");
                }
            });

            it("should reject empty authUserId", async () => {
                const params: MigrateGuestParams = {
                    guestId: "abc123",
                    authUserId: "",
                };

                const result = await AuthService.migrateGuestToAuthUser(params);

                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(result.code).toBe("validation:invalid_auth_user_id");
                    expect(result.error).toBe("Invalid auth user ID");
                }
            });

            it("should reject null authUserId", async () => {
                const params = {
                    guestId: "abc123",
                    authUserId: null as unknown as string,
                };

                const result = await AuthService.migrateGuestToAuthUser(params);

                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(result.code).toBe("validation:invalid_auth_user_id");
                }
            });

            it("should reject non-UUID authUserId", async () => {
                const params: MigrateGuestParams = {
                    guestId: "abc123",
                    authUserId: "not-a-uuid",
                };

                const result = await AuthService.migrateGuestToAuthUser(params);

                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(result.code).toBe("validation:invalid_uuid");
                    expect(result.error).toBe(
                        "Auth user ID must be a valid UUID"
                    );
                }
            });

            it("should reject malformed UUID", async () => {
                const params: MigrateGuestParams = {
                    guestId: "abc123",
                    authUserId: "550e8400-e29b-41d4-a716", // incomplete UUID
                };

                const result = await AuthService.migrateGuestToAuthUser(params);

                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(result.code).toBe("validation:invalid_uuid");
                }
            });

            it("should accept valid lowercase UUID", async () => {
                mockMigrateGuestData.mockResolvedValue({
                    success: true,
                    migratedChats: 0,
                    migratedMessages: 0,
                });

                const params: MigrateGuestParams = {
                    guestId: "abc123",
                    authUserId: "550e8400-e29b-41d4-a716-446655440000",
                };

                const result = await AuthService.migrateGuestToAuthUser(params);

                expect(result.success).toBe(true);
                expect(mockMigrateGuestData).toHaveBeenCalledWith(
                    "abc123",
                    params.authUserId
                );
            });

            it("should accept valid uppercase UUID", async () => {
                mockMigrateGuestData.mockResolvedValue({
                    success: true,
                    migratedChats: 0,
                    migratedMessages: 0,
                });

                const params: MigrateGuestParams = {
                    guestId: "abc123",
                    authUserId: "550E8400-E29B-41D4-A716-446655440000",
                };

                const result = await AuthService.migrateGuestToAuthUser(params);

                expect(result.success).toBe(true);
            });
        });

        describe("Migration Execution", () => {
            const validParams: MigrateGuestParams = {
                guestId: "test-guest-123",
                authUserId: "550e8400-e29b-41d4-a716-446655440000",
            };

            it("should return success result on successful migration", async () => {
                const migrationResult = {
                    success: true,
                    migratedChats: 5,
                    migratedMessages: 25,
                };
                mockMigrateGuestData.mockResolvedValue(migrationResult);

                const result =
                    await AuthService.migrateGuestToAuthUser(validParams);

                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data).toEqual(migrationResult);
                }
            });

            it("should log success on successful migration", async () => {
                mockMigrateGuestData.mockResolvedValue({
                    success: true,
                    migratedChats: 5,
                    migratedMessages: 25,
                });

                await AuthService.migrateGuestToAuthUser(validParams);

                expect(logger.info).toHaveBeenCalledWith(
                    "[SEC-003] Guest data migration completed",
                    expect.objectContaining({
                        guestId: validParams.guestId,
                        authUserId: validParams.authUserId,
                        chats: 5,
                        messages: 25,
                    })
                );
            });

            it("should return failed result when data layer fails", async () => {
                const migrationResult = {
                    success: false,
                    error: "Guest user not found",
                    migratedChats: 0,
                    migratedMessages: 0,
                };
                mockMigrateGuestData.mockResolvedValue(migrationResult);

                const result =
                    await AuthService.migrateGuestToAuthUser(validParams);

                expect(result.success).toBe(true); // Service returns success with data
                if (result.success) {
                    expect(result.data.success).toBe(false);
                }
            });

            it("should log error on failed migration", async () => {
                mockMigrateGuestData.mockResolvedValue({
                    success: false,
                    error: "Guest user not found",
                    migratedChats: 0,
                    migratedMessages: 0,
                });

                await AuthService.migrateGuestToAuthUser(validParams);

                expect(logger.error).toHaveBeenCalledWith(
                    "[SEC-003] Guest data migration failed",
                    expect.objectContaining({
                        guestId: validParams.guestId,
                        authUserId: validParams.authUserId,
                    })
                );
            });
        });

        describe("Error Handling", () => {
            const validParams: MigrateGuestParams = {
                guestId: "test-guest-123",
                authUserId: "550e8400-e29b-41d4-a716-446655440000",
            };

            it("should handle thrown errors gracefully", async () => {
                mockMigrateGuestData.mockRejectedValue(
                    new Error("Database connection failed")
                );

                const result =
                    await AuthService.migrateGuestToAuthUser(validParams);

                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(result.code).toBe("internal:migration_error");
                    expect(result.error).toBe("Database connection failed");
                }
            });

            it("should handle non-Error thrown values", async () => {
                mockMigrateGuestData.mockRejectedValue("Unknown error string");

                const result =
                    await AuthService.migrateGuestToAuthUser(validParams);

                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(result.code).toBe("internal:migration_error");
                    expect(result.error).toBe("Migration failed");
                }
            });

            it("should log errors when exceptions occur", async () => {
                mockMigrateGuestData.mockRejectedValue(new Error("DB error"));

                await AuthService.migrateGuestToAuthUser(validParams);

                expect(logger.error).toHaveBeenCalledWith(
                    "[SEC-003] Guest data migration error",
                    expect.objectContaining({
                        guestId: validParams.guestId,
                        authUserId: validParams.authUserId,
                    })
                );
            });
        });
    });
});

describe("AuthServiceResult Type", () => {
    it("should have correct structure for success case", async () => {
        mockMigrateGuestData.mockResolvedValue({
            success: true,
            migratedChats: 1,
            migratedMessages: 10,
        });

        const result = await AuthService.migrateGuestToAuthUser({
            guestId: "test",
            authUserId: "550e8400-e29b-41d4-a716-446655440000",
        });

        if (result.success) {
            // TypeScript should allow accessing data
            expect(result.data).toBeDefined();
        }
    });

    it("should have correct structure for failure case", async () => {
        const result = await AuthService.migrateGuestToAuthUser({
            guestId: "",
            authUserId: "550e8400-e29b-41d4-a716-446655440000",
        });

        if (!result.success) {
            // TypeScript should allow accessing error and code
            expect(result.error).toBeDefined();
            expect(result.code).toBeDefined();
        }
    });
});

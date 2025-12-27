/**
 * P3-082: AuthProvider Tests
 *
 * Unit tests for features/auth/components/auth-provider.tsx
 * Tests context provision, session handling, and hook behavior.
 *
 * @module tests/unit/features/auth-provider.test.tsx
 */
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// Mocks
// ============================================================================

// Mock the Supabase client
const mockSubscription = { unsubscribe: vi.fn() };
const mockOnAuthStateChange = vi.fn(() => ({
    data: { subscription: mockSubscription },
}));

vi.mock("@/lib/auth/client", () => ({
    getSupabaseBrowserClient: () => ({
        auth: {
            onAuthStateChange: mockOnAuthStateChange,
        },
    }),
}));

// ============================================================================
// Test Setup
// ============================================================================

import {
    AuthProvider,
    useAuth,
} from "@/features/auth/components/auth-provider";
import type { AppSession } from "@/lib/auth";

const createMockSession = (overrides?: Partial<AppSession>): AppSession => ({
    user: {
        id: "test-user-123",
        type: "regular",
        email: "test@example.com",
    },
    ...overrides,
});

const createGuestSession = (): AppSession => ({
    user: {
        id: "guest-abc123",
        type: "guest",
        email: null,
    },
});

// ============================================================================
// Tests
// ============================================================================

describe("AuthProvider", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    describe("Context Provision", () => {
        it("should provide auth context to children", () => {
            const mockSession = createMockSession();

            const wrapper = ({ children }: { children: ReactNode }) => (
                <AuthProvider initialSession={mockSession}>
                    {children}
                </AuthProvider>
            );

            const { result } = renderHook(() => useAuth(), { wrapper });

            expect(result.current).toBeDefined();
            expect(result.current.session).toEqual(mockSession);
        });

        it("should provide null session when initialSession is null", () => {
            const wrapper = ({ children }: { children: ReactNode }) => (
                <AuthProvider initialSession={null}>{children}</AuthProvider>
            );

            const { result } = renderHook(() => useAuth(), { wrapper });

            expect(result.current.session).toBeNull();
            expect(result.current.isAuthenticated).toBe(false);
        });

        it("should derive isAuthenticated from session presence", () => {
            const mockSession = createMockSession();

            const wrapper = ({ children }: { children: ReactNode }) => (
                <AuthProvider initialSession={mockSession}>
                    {children}
                </AuthProvider>
            );

            const { result } = renderHook(() => useAuth(), { wrapper });

            expect(result.current.isAuthenticated).toBe(true);
        });

        it("should derive isGuest from user type", () => {
            const guestSession = createGuestSession();

            const wrapper = ({ children }: { children: ReactNode }) => (
                <AuthProvider initialSession={guestSession}>
                    {children}
                </AuthProvider>
            );

            const { result } = renderHook(() => useAuth(), { wrapper });

            expect(result.current.isGuest).toBe(true);
            expect(result.current.isAuthenticated).toBe(true);
        });

        it("should provide user object from session", () => {
            const mockSession = createMockSession();

            const wrapper = ({ children }: { children: ReactNode }) => (
                <AuthProvider initialSession={mockSession}>
                    {children}
                </AuthProvider>
            );

            const { result } = renderHook(() => useAuth(), { wrapper });

            expect(result.current.user).toEqual(mockSession.user);
        });
    });

    describe("Session Management", () => {
        it("should allow session updates via setSession", async () => {
            const wrapper = ({ children }: { children: ReactNode }) => (
                <AuthProvider initialSession={null}>{children}</AuthProvider>
            );

            const { result } = renderHook(() => useAuth(), { wrapper });

            expect(result.current.session).toBeNull();

            const newSession = createMockSession();
            result.current.setSession(newSession);

            await waitFor(() => {
                expect(result.current.session).toEqual(newSession);
            });
        });

        it("should clear session when setSession called with null", async () => {
            const mockSession = createMockSession();

            const wrapper = ({ children }: { children: ReactNode }) => (
                <AuthProvider initialSession={mockSession}>
                    {children}
                </AuthProvider>
            );

            const { result } = renderHook(() => useAuth(), { wrapper });

            expect(result.current.session).toEqual(mockSession);

            result.current.setSession(null);

            await waitFor(() => {
                expect(result.current.session).toBeNull();
                expect(result.current.isAuthenticated).toBe(false);
            });
        });
    });

    describe("New Session Flag", () => {
        it("should initialize isNewSession as false", () => {
            const wrapper = ({ children }: { children: ReactNode }) => (
                <AuthProvider initialSession={null}>{children}</AuthProvider>
            );

            const { result } = renderHook(() => useAuth(), { wrapper });

            expect(result.current.isNewSession).toBe(false);
        });

        it("should provide clearNewSessionFlag function", () => {
            const wrapper = ({ children }: { children: ReactNode }) => (
                <AuthProvider initialSession={null}>{children}</AuthProvider>
            );

            const { result } = renderHook(() => useAuth(), { wrapper });

            expect(typeof result.current.clearNewSessionFlag).toBe("function");
        });
    });

    describe("Supabase Integration", () => {
        it("should subscribe to auth state changes on mount", () => {
            const wrapper = ({ children }: { children: ReactNode }) => (
                <AuthProvider initialSession={null}>{children}</AuthProvider>
            );

            renderHook(() => useAuth(), { wrapper });

            expect(mockOnAuthStateChange).toHaveBeenCalledTimes(1);
        });

        it("should unsubscribe on unmount", () => {
            const wrapper = ({ children }: { children: ReactNode }) => (
                <AuthProvider initialSession={null}>{children}</AuthProvider>
            );

            const { unmount } = renderHook(() => useAuth(), { wrapper });

            unmount();

            expect(mockSubscription.unsubscribe).toHaveBeenCalledTimes(1);
        });
    });
});

describe("useAuth", () => {
    it("should throw error when used outside AuthProvider", () => {
        // Suppress console.error for this test
        const consoleSpy = vi
            .spyOn(console, "error")
            .mockImplementation(() => {});

        expect(() => {
            renderHook(() => useAuth());
        }).toThrow("useAuth must be used within an AuthProvider");

        consoleSpy.mockRestore();
    });
});

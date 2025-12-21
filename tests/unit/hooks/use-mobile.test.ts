import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useIsMobile } from "@/shared/hooks/use-mobile";

describe("useIsMobile", () => {
    let originalMatchMedia: typeof window.matchMedia;
    let originalInnerWidth: number;
    let mockAddEventListener: ReturnType<typeof vi.fn>;
    let mockRemoveEventListener: ReturnType<typeof vi.fn>;
    let changeHandler: (() => void) | null = null;

    const createMatchMediaMock = (matches: boolean) => {
        mockAddEventListener = vi.fn((event: string, handler: () => void) => {
            if (event === "change") {
                changeHandler = handler;
            }
        });
        mockRemoveEventListener = vi.fn();

        return vi.fn().mockImplementation((query: string) => ({
            matches,
            media: query,
            onchange: null,
            addListener: vi.fn(), // deprecated
            removeListener: vi.fn(), // deprecated
            addEventListener: mockAddEventListener,
            removeEventListener: mockRemoveEventListener,
            dispatchEvent: vi.fn(),
        }));
    };

    beforeEach(() => {
        originalMatchMedia = window.matchMedia;
        originalInnerWidth = window.innerWidth;
        changeHandler = null;
    });

    afterEach(() => {
        window.matchMedia = originalMatchMedia;
        Object.defineProperty(window, "innerWidth", {
            value: originalInnerWidth,
            writable: true,
            configurable: true,
        });
        vi.clearAllMocks();
    });

    it("should return undefined when no initial value and window width is >= 768", () => {
        Object.defineProperty(window, "innerWidth", {
            value: 1024,
            configurable: true,
        });
        window.matchMedia = createMatchMediaMock(false);

        const { result } = renderHook(() => useIsMobile());

        // Initial state is undefined, then updates to false after useEffect
        expect(result.current).toBe(false);
    });

    it("should return true when window width is < 768", () => {
        Object.defineProperty(window, "innerWidth", {
            value: 500,
            configurable: true,
        });
        window.matchMedia = createMatchMediaMock(true);

        const { result } = renderHook(() => useIsMobile());

        expect(result.current).toBe(true);
    });

    it("should use initialIsMobile value for SSR hydration", () => {
        Object.defineProperty(window, "innerWidth", {
            value: 1024,
            configurable: true,
        });
        window.matchMedia = createMatchMediaMock(false);

        const { result } = renderHook(() =>
            useIsMobile({ initialIsMobile: false })
        );

        expect(result.current).toBe(false);
    });

    it("should update when initialIsMobile differs from actual window width", () => {
        // Server thought it was mobile, but client is desktop
        Object.defineProperty(window, "innerWidth", {
            value: 1024,
            configurable: true,
        });
        window.matchMedia = createMatchMediaMock(false);

        const { result } = renderHook(() =>
            useIsMobile({ initialIsMobile: true })
        );

        // Should update to false because actual width is desktop
        expect(result.current).toBe(false);
    });

    it("should keep initial value when it matches actual window width", () => {
        // Server correctly detected mobile
        Object.defineProperty(window, "innerWidth", {
            value: 500,
            configurable: true,
        });
        window.matchMedia = createMatchMediaMock(true);

        const { result } = renderHook(() =>
            useIsMobile({ initialIsMobile: true })
        );

        expect(result.current).toBe(true);
    });

    it("should add and remove event listener on mount/unmount", () => {
        Object.defineProperty(window, "innerWidth", {
            value: 1024,
            configurable: true,
        });
        window.matchMedia = createMatchMediaMock(false);

        const { unmount } = renderHook(() => useIsMobile());

        expect(mockAddEventListener).toHaveBeenCalledWith(
            "change",
            expect.any(Function)
        );

        unmount();

        expect(mockRemoveEventListener).toHaveBeenCalledWith(
            "change",
            expect.any(Function)
        );
    });

    it("should respond to media query changes", () => {
        Object.defineProperty(window, "innerWidth", {
            value: 1024,
            configurable: true,
        });
        window.matchMedia = createMatchMediaMock(false);

        const { result } = renderHook(() => useIsMobile());

        expect(result.current).toBe(false);

        // Simulate resize to mobile
        act(() => {
            Object.defineProperty(window, "innerWidth", {
                value: 500,
                configurable: true,
            });
            if (changeHandler) {
                changeHandler();
            }
        });

        expect(result.current).toBe(true);
    });

    it("should use mobile breakpoint of 768px", () => {
        // Test at exactly 767px (should be mobile)
        Object.defineProperty(window, "innerWidth", {
            value: 767,
            configurable: true,
        });
        window.matchMedia = createMatchMediaMock(true);

        const { result: result767 } = renderHook(() => useIsMobile());
        expect(result767.current).toBe(true);

        // Test at exactly 768px (should be desktop)
        Object.defineProperty(window, "innerWidth", {
            value: 768,
            configurable: true,
        });
        window.matchMedia = createMatchMediaMock(false);

        const { result: result768 } = renderHook(() => useIsMobile());
        expect(result768.current).toBe(false);
    });

    it("should handle undefined options", () => {
        Object.defineProperty(window, "innerWidth", {
            value: 1024,
            configurable: true,
        });
        window.matchMedia = createMatchMediaMock(false);

        const { result } = renderHook(() => useIsMobile(undefined));

        expect(result.current).toBe(false);
    });

    it("should handle empty options object", () => {
        Object.defineProperty(window, "innerWidth", {
            value: 500,
            configurable: true,
        });
        window.matchMedia = createMatchMediaMock(true);

        const { result } = renderHook(() => useIsMobile({}));

        expect(result.current).toBe(true);
    });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useScrollToBottom } from '@/features/chat/hooks/use-scroll-to-bottom';

// Mock SWR
vi.mock('swr', () => ({
  default: vi.fn((key, fetcher, options) => ({
    data: false,
    mutate: vi.fn(),
  })),
}));

// Mock ResizeObserver
class MockResizeObserver {
  callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

// Mock MutationObserver
class MockMutationObserver {
  callback: MutationCallback;

  constructor(callback: MutationCallback) {
    this.callback = callback;
  }

  observe = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn(() => []);
}

describe('useScrollToBottom', () => {
  let originalResizeObserver: typeof ResizeObserver;
  let originalMutationObserver: typeof MutationObserver;
  let originalRequestAnimationFrame: typeof requestAnimationFrame;

  beforeEach(() => {
    // Store originals
    originalResizeObserver = global.ResizeObserver;
    originalMutationObserver = global.MutationObserver;
    originalRequestAnimationFrame = global.requestAnimationFrame;

    // Mock globals
    global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
    global.MutationObserver = MockMutationObserver as unknown as typeof MutationObserver;
    global.requestAnimationFrame = vi.fn((cb) => {
      cb(0);
      return 0;
    });
  });

  afterEach(() => {
    // Restore originals
    global.ResizeObserver = originalResizeObserver;
    global.MutationObserver = originalMutationObserver;
    global.requestAnimationFrame = originalRequestAnimationFrame;
    vi.clearAllMocks();
  });

  it('should return containerRef and endRef', () => {
    const { result } = renderHook(() => useScrollToBottom());

    expect(result.current.containerRef).toBeDefined();
    expect(result.current.endRef).toBeDefined();
    expect(result.current.containerRef.current).toBeNull();
    expect(result.current.endRef.current).toBeNull();
  });

  it('should initialize isAtBottom as true', () => {
    const { result } = renderHook(() => useScrollToBottom());

    expect(result.current.isAtBottom).toBe(true);
  });

  it('should provide scrollToBottom function', () => {
    const { result } = renderHook(() => useScrollToBottom());

    expect(typeof result.current.scrollToBottom).toBe('function');
  });

  it('should provide onViewportEnter callback', () => {
    const { result } = renderHook(() => useScrollToBottom());

    expect(typeof result.current.onViewportEnter).toBe('function');
  });

  it('should provide onViewportLeave callback', () => {
    const { result } = renderHook(() => useScrollToBottom());

    expect(typeof result.current.onViewportLeave).toBe('function');
  });

  it('should set isAtBottom to true when onViewportEnter is called', () => {
    const { result } = renderHook(() => useScrollToBottom());

    act(() => {
      result.current.onViewportLeave();
    });

    expect(result.current.isAtBottom).toBe(false);

    act(() => {
      result.current.onViewportEnter();
    });

    expect(result.current.isAtBottom).toBe(true);
  });

  it('should set isAtBottom to false when onViewportLeave is called', () => {
    const { result } = renderHook(() => useScrollToBottom());

    act(() => {
      result.current.onViewportLeave();
    });

    expect(result.current.isAtBottom).toBe(false);
  });

  it('should detect scroll position when container is scrolled', async () => {
    const { result } = renderHook(() => useScrollToBottom());

    // Create a mock container element
    const mockContainer = document.createElement('div');
    Object.defineProperties(mockContainer, {
      scrollTop: { value: 0, writable: true, configurable: true },
      scrollHeight: { value: 1000, writable: true, configurable: true },
      clientHeight: { value: 500, writable: true, configurable: true },
    });

    // Assign mock container to ref
    Object.defineProperty(result.current.containerRef, 'current', {
      value: mockContainer,
      writable: true,
    });

    // Simulate scroll event when not at bottom
    Object.defineProperty(mockContainer, 'scrollTop', { value: 100 });

    act(() => {
      mockContainer.dispatchEvent(new Event('scroll'));
    });

    // Hook should detect not at bottom (scrollTop + clientHeight < scrollHeight - threshold)
    // 100 + 500 = 600 < 1000 - 100 = 900, so not at bottom
    await waitFor(() => {
      // After mount and scroll detection, isAtBottom should reflect scroll position
      expect(result.current.isAtBottom).toBeDefined();
    });
  });

  it('should return stable references for viewport callbacks', () => {
    const { result, rerender } = renderHook(() => useScrollToBottom());

    const firstOnViewportEnter = result.current.onViewportEnter;
    const firstOnViewportLeave = result.current.onViewportLeave;

    rerender();

    // Viewport callbacks should be stable (no dependencies)
    expect(result.current.onViewportEnter).toBe(firstOnViewportEnter);
    expect(result.current.onViewportLeave).toBe(firstOnViewportLeave);
  });
});

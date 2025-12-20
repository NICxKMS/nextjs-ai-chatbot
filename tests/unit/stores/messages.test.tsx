import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import type { ReactNode } from 'react';
import { useMessages } from '@/features/chat/hooks/use-messages';
import { useChatVisibility } from '@/features/chat/hooks/use-chat-visibility';
import type { ChatStatus } from '@/features/chat/types';

// =============================================================================
// MOCKS
// =============================================================================

// Mock the updateChatVisibility action
vi.mock('@/features/chat/actions', () => ({
  updateChatVisibility: vi.fn().mockResolvedValue({ success: true }),
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// =============================================================================
// TEST HELPERS
// =============================================================================

/**
 * Creates a fresh SWR wrapper for isolated test state
 */
function createWrapper() {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
        {children}
      </SWRConfig>
    );
  };
}

// =============================================================================
// MESSAGE STORE TESTS (useMessages)
// =============================================================================

describe('Message Store (useMessages)', () => {
  describe('Initial State', () => {
    it('should return hasSentMessage as false initially', () => {
      const { result } = renderHook(
        () => useMessages({ status: 'ready' as ChatStatus }),
        { wrapper: createWrapper() }
      );

      expect(result.current.hasSentMessage).toBe(false);
    });

    it('should return containerRef', () => {
      const { result } = renderHook(
        () => useMessages({ status: 'ready' as ChatStatus }),
        { wrapper: createWrapper() }
      );

      expect(result.current.containerRef).toBeDefined();
      expect(result.current.containerRef.current).toBeNull();
    });

    it('should return endRef', () => {
      const { result } = renderHook(
        () => useMessages({ status: 'ready' as ChatStatus }),
        { wrapper: createWrapper() }
      );

      expect(result.current.endRef).toBeDefined();
      expect(result.current.endRef.current).toBeNull();
    });

    it('should return isAtBottom as true initially', () => {
      const { result } = renderHook(
        () => useMessages({ status: 'ready' as ChatStatus }),
        { wrapper: createWrapper() }
      );

      expect(result.current.isAtBottom).toBe(true);
    });

    it('should return scrollToBottom function', () => {
      const { result } = renderHook(
        () => useMessages({ status: 'ready' as ChatStatus }),
        { wrapper: createWrapper() }
      );

      expect(typeof result.current.scrollToBottom).toBe('function');
    });

    it('should return resetSentState function', () => {
      const { result } = renderHook(
        () => useMessages({ status: 'ready' as ChatStatus }),
        { wrapper: createWrapper() }
      );

      expect(typeof result.current.resetSentState).toBe('function');
    });
  });

  describe('Message Submission Tracking', () => {
    it('should set hasSentMessage to true when status is "submitted"', async () => {
      const { result, rerender } = renderHook(
        ({ status }: { status: ChatStatus }) => useMessages({ status }),
        {
          wrapper: createWrapper(),
          initialProps: { status: 'ready' as ChatStatus },
        }
      );

      expect(result.current.hasSentMessage).toBe(false);

      // Simulate status change to submitted
      rerender({ status: 'submitted' as ChatStatus });

      await waitFor(() => {
        expect(result.current.hasSentMessage).toBe(true);
      });
    });

    it('should call onMessageSent callback when message is submitted', async () => {
      const onMessageSent = vi.fn();

      const { rerender } = renderHook(
        ({ status }: { status: ChatStatus }) =>
          useMessages({ status, onMessageSent }),
        {
          wrapper: createWrapper(),
          initialProps: { status: 'ready' as ChatStatus },
        }
      );

      expect(onMessageSent).not.toHaveBeenCalled();

      rerender({ status: 'submitted' as ChatStatus });

      await waitFor(() => {
        expect(onMessageSent).toHaveBeenCalledTimes(1);
      });
    });

    it('should not call onMessageSent for other status changes', async () => {
      const onMessageSent = vi.fn();

      const { rerender } = renderHook(
        ({ status }: { status: ChatStatus }) =>
          useMessages({ status, onMessageSent }),
        {
          wrapper: createWrapper(),
          initialProps: { status: 'ready' as ChatStatus },
        }
      );

      // Change to streaming
      rerender({ status: 'streaming' as ChatStatus });

      // Small delay to ensure effect runs
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(onMessageSent).not.toHaveBeenCalled();
    });
  });

  describe('Reset Sent State', () => {
    it('should reset hasSentMessage to false', async () => {
      const { result, rerender } = renderHook(
        ({ status }: { status: ChatStatus }) => useMessages({ status }),
        {
          wrapper: createWrapper(),
          initialProps: { status: 'ready' as ChatStatus },
        }
      );

      // Trigger sent state
      rerender({ status: 'submitted' as ChatStatus });

      await waitFor(() => {
        expect(result.current.hasSentMessage).toBe(true);
      });

      // Reset
      act(() => {
        result.current.resetSentState();
      });

      expect(result.current.hasSentMessage).toBe(false);
    });

    it('should allow re-triggering after reset', async () => {
      const { result, rerender } = renderHook(
        ({ status }: { status: ChatStatus }) => useMessages({ status }),
        {
          wrapper: createWrapper(),
          initialProps: { status: 'ready' as ChatStatus },
        }
      );

      // First submission
      rerender({ status: 'submitted' as ChatStatus });
      await waitFor(() => {
        expect(result.current.hasSentMessage).toBe(true);
      });

      // Reset
      act(() => {
        result.current.resetSentState();
      });
      expect(result.current.hasSentMessage).toBe(false);

      // Go back to ready
      rerender({ status: 'ready' as ChatStatus });

      // Second submission
      rerender({ status: 'submitted' as ChatStatus });
      await waitFor(() => {
        expect(result.current.hasSentMessage).toBe(true);
      });
    });
  });

  describe('Viewport Callbacks', () => {
    it('should provide onViewportEnter callback', () => {
      const { result } = renderHook(
        () => useMessages({ status: 'ready' as ChatStatus }),
        { wrapper: createWrapper() }
      );

      expect(typeof result.current.onViewportEnter).toBe('function');
    });

    it('should provide onViewportLeave callback', () => {
      const { result } = renderHook(
        () => useMessages({ status: 'ready' as ChatStatus }),
        { wrapper: createWrapper() }
      );

      expect(typeof result.current.onViewportLeave).toBe('function');
    });
  });
});

// =============================================================================
// CHAT VISIBILITY STORE TESTS (useChatVisibility - Optimistic Updates)
// =============================================================================

describe('Chat Visibility Store (Optimistic Updates)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should return initial visibility type', () => {
      const { result } = renderHook(
        () =>
          useChatVisibility({
            chatId: 'chat-123',
            initialVisibilityType: 'private',
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current.visibilityType).toBe('private');
    });

    it('should handle public initial visibility', () => {
      const { result } = renderHook(
        () =>
          useChatVisibility({
            chatId: 'chat-456',
            initialVisibilityType: 'public',
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current.visibilityType).toBe('public');
    });

    it('should provide setVisibilityType function', () => {
      const { result } = renderHook(
        () =>
          useChatVisibility({
            chatId: 'chat-789',
            initialVisibilityType: 'private',
          }),
        { wrapper: createWrapper() }
      );

      expect(typeof result.current.setVisibilityType).toBe('function');
    });
  });

  describe('Optimistic Updates', () => {
    it('should optimistically update visibility', async () => {
      const { result } = renderHook(
        () =>
          useChatVisibility({
            chatId: 'chat-opt-1',
            initialVisibilityType: 'private',
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current.visibilityType).toBe('private');

      await act(async () => {
        await result.current.setVisibilityType('public');
      });

      expect(result.current.visibilityType).toBe('public');
    });

    it('should update from public to private', async () => {
      const { result } = renderHook(
        () =>
          useChatVisibility({
            chatId: 'chat-opt-2',
            initialVisibilityType: 'public',
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current.visibilityType).toBe('public');

      await act(async () => {
        await result.current.setVisibilityType('private');
      });

      expect(result.current.visibilityType).toBe('private');
    });
  });

  describe('State Isolation', () => {
    it('should maintain separate state for different chat IDs', () => {
      const wrapper = createWrapper();

      const { result: result1 } = renderHook(
        () =>
          useChatVisibility({
            chatId: 'chat-iso-1',
            initialVisibilityType: 'private',
          }),
        { wrapper }
      );

      const { result: result2 } = renderHook(
        () =>
          useChatVisibility({
            chatId: 'chat-iso-2',
            initialVisibilityType: 'public',
          }),
        { wrapper }
      );

      expect(result1.current.visibilityType).toBe('private');
      expect(result2.current.visibilityType).toBe('public');
    });
  });

  describe('Multiple Updates', () => {
    it('should handle rapid consecutive updates', async () => {
      const { result } = renderHook(
        () =>
          useChatVisibility({
            chatId: 'chat-rapid',
            initialVisibilityType: 'private',
          }),
        { wrapper: createWrapper() }
      );

      // Rapid updates
      await act(async () => {
        result.current.setVisibilityType('public');
        result.current.setVisibilityType('private');
        await result.current.setVisibilityType('public');
      });

      // Final state should be the last update
      expect(result.current.visibilityType).toBe('public');
    });
  });
});

// =============================================================================
// CRUD-LIKE OPERATIONS TESTS
// =============================================================================

describe('Message CRUD Operations (via Status)', () => {
  describe('Create (Message Submission)', () => {
    it('should track message creation via submitted status', async () => {
      const onMessageSent = vi.fn();

      const { rerender } = renderHook(
        ({ status }: { status: ChatStatus }) =>
          useMessages({ status, onMessageSent }),
        {
          wrapper: createWrapper(),
          initialProps: { status: 'ready' as ChatStatus },
        }
      );

      // Create/send message
      rerender({ status: 'submitted' as ChatStatus });

      await waitFor(() => {
        expect(onMessageSent).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Read (Initial State)', () => {
    it('should read initial hasSentMessage state', () => {
      const { result } = renderHook(
        () => useMessages({ status: 'ready' as ChatStatus }),
        { wrapper: createWrapper() }
      );

      expect(result.current.hasSentMessage).toBe(false);
    });

    it('should read initial scroll state', () => {
      const { result } = renderHook(
        () => useMessages({ status: 'ready' as ChatStatus }),
        { wrapper: createWrapper() }
      );

      expect(result.current.isAtBottom).toBe(true);
    });
  });

  describe('Update (Status Changes)', () => {
    it('should update state when status changes to streaming', async () => {
      const { result, rerender } = renderHook(
        ({ status }: { status: ChatStatus }) => useMessages({ status }),
        {
          wrapper: createWrapper(),
          initialProps: { status: 'ready' as ChatStatus },
        }
      );

      const initialState = result.current.hasSentMessage;

      // Status change but not to submitted shouldn't change hasSentMessage
      rerender({ status: 'streaming' as ChatStatus });

      expect(result.current.hasSentMessage).toBe(initialState);
    });
  });

  describe('Delete/Reset', () => {
    it('should reset message sent state', async () => {
      const { result, rerender } = renderHook(
        ({ status }: { status: ChatStatus }) => useMessages({ status }),
        {
          wrapper: createWrapper(),
          initialProps: { status: 'ready' as ChatStatus },
        }
      );

      // Create state
      rerender({ status: 'submitted' as ChatStatus });
      await waitFor(() => {
        expect(result.current.hasSentMessage).toBe(true);
      });

      // Delete/reset state
      act(() => {
        result.current.resetSentState();
      });

      expect(result.current.hasSentMessage).toBe(false);
    });
  });
});

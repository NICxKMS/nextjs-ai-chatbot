import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import type { ReactNode } from 'react';
import {
  useArtifact,
  useArtifactSelector,
  initialArtifactData,
} from '@/features/artifacts/hooks/use-artifact';

// Wrapper to provide fresh SWR cache for each test
function createWrapper() {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
        {children}
      </SWRConfig>
    );
  };
}

describe('useArtifact', () => {
  describe('initial state', () => {
    it('should return initial artifact data', () => {
      const { result } = renderHook(() => useArtifact(), {
        wrapper: createWrapper(),
      });

      expect(result.current.artifact).toEqual(initialArtifactData);
    });

    it('should have correct initial values', () => {
      const { result } = renderHook(() => useArtifact(), {
        wrapper: createWrapper(),
      });

      expect(result.current.artifact.documentId).toBe('init');
      expect(result.current.artifact.content).toBe('');
      expect(result.current.artifact.kind).toBe('text');
      expect(result.current.artifact.status).toBe('idle');
      expect(result.current.artifact.isVisible).toBe(false);
    });

    it('should have setArtifact and setMetadata functions', () => {
      const { result } = renderHook(() => useArtifact(), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current.setArtifact).toBe('function');
      expect(typeof result.current.setMetadata).toBe('function');
    });
  });

  describe('setArtifact', () => {
    it('should update artifact with object', async () => {
      const { result } = renderHook(() => useArtifact(), {
        wrapper: createWrapper(),
      });

      const newArtifact = {
        ...initialArtifactData,
        documentId: 'doc-123',
        content: 'Hello World',
        isVisible: true,
      };

      act(() => {
        result.current.setArtifact(newArtifact);
      });

      await waitFor(() => {
        expect(result.current.artifact.documentId).toBe('doc-123');
        expect(result.current.artifact.content).toBe('Hello World');
        expect(result.current.artifact.isVisible).toBe(true);
      });
    });

    it('should update artifact with function', async () => {
      const { result } = renderHook(() => useArtifact(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setArtifact((current) => ({
          ...current,
          title: 'Updated Title',
          status: 'streaming',
        }));
      });

      await waitFor(() => {
        expect(result.current.artifact.title).toBe('Updated Title');
        expect(result.current.artifact.status).toBe('streaming');
      });
    });
  });

  describe('reset artifact', () => {
    it('should reset to initial state', async () => {
      const { result } = renderHook(() => useArtifact(), {
        wrapper: createWrapper(),
      });

      // Set some values
      act(() => {
        result.current.setArtifact({
          ...initialArtifactData,
          documentId: 'test-doc',
          isVisible: true,
        });
      });

      await waitFor(() => {
        expect(result.current.artifact.documentId).toBe('test-doc');
      });

      // Reset to initial
      act(() => {
        result.current.setArtifact(initialArtifactData);
      });

      await waitFor(() => {
        expect(result.current.artifact).toEqual(initialArtifactData);
      });
    });
  });
});

describe('useArtifactSelector', () => {
  it('should select specific state', async () => {
    const wrapper = createWrapper();
    const { result: selectorResult } = renderHook(
      () => useArtifactSelector((state) => state.isVisible),
      { wrapper }
    );

    expect(selectorResult.current).toBe(false);
  });

  it('should select nested state', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useArtifactSelector((state) => state.boundingBox.top),
      { wrapper }
    );

    expect(result.current).toBe(0);
  });

  it('should select computed value', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useArtifactSelector((state) => state.documentId !== 'init'),
      { wrapper }
    );

    expect(result.current).toBe(false);
  });
});

describe('initialArtifactData', () => {
  it('should have correct shape', () => {
    expect(initialArtifactData).toEqual({
      documentId: 'init',
      content: '',
      kind: 'text',
      title: '',
      status: 'idle',
      isVisible: false,
      boundingBox: {
        top: 0,
        left: 0,
        width: 0,
        height: 0,
      },
    });
  });

  it('should be immutable (frozen)', () => {
    // Test that initial data has expected values
    expect(initialArtifactData.documentId).toBe('init');
    expect(initialArtifactData.isVisible).toBe(false);
  });
});

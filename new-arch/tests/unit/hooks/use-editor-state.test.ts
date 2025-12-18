import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEditorState } from "@/hooks/use-editor-state";

describe("useEditorState", () => {
    const mockOnSave = vi.fn().mockResolvedValue(undefined);

    beforeEach(() => {
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    it("initializes with content", () => {
        const { result } = renderHook(() =>
            useEditorState({ initialContent: "Hello", onSave: mockOnSave })
        );
        expect(result.current.content).toBe("Hello");
        expect(result.current.isDirty).toBe(false);
    });

    it("marks dirty on change", () => {
        const { result } = renderHook(() =>
            useEditorState({ initialContent: "Hello", onSave: mockOnSave })
        );
        act(() => {
            result.current.setContent("World");
        });
        expect(result.current.isDirty).toBe(true);
    });

    it("auto-saves after delay", async () => {
        const { result } = renderHook(() =>
            useEditorState({
                initialContent: "Hello",
                onSave: mockOnSave,
                autoSaveMs: 1000,
            })
        );
        act(() => {
            result.current.setContent("Updated");
        });
        expect(mockOnSave).not.toHaveBeenCalled();
        act(() => {
            vi.advanceTimersByTime(1000);
        });
        await waitFor(() => expect(mockOnSave).toHaveBeenCalledWith("Updated"));
    });
});

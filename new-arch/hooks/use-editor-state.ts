"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { debounce } from "@/lib/utils";

type EditorState<T> = {
    content: T;
    isDirty: boolean;
    isSaving: boolean;
    lastSaved: Date | null;
    error: Error | null;
};

type UseEditorStateOptions<T> = {
    initialContent: T;
    onSave: (content: T) => Promise<void>;
    autoSaveMs?: number;
};

export type UseEditorStateReturn<T> = {
    content: T;
    isDirty: boolean;
    isSaving: boolean;
    lastSaved: Date | null;
    error: Error | null;
    setContent: (content: T) => void;
    save: () => Promise<void>;
    reset: (newContent?: T) => void;
};

/**
 * Shared editor state hook with auto-save functionality.
 *
 * @example
 * ```tsx
 * const { content, setContent, isDirty, save } = useEditorState({
 *   initialContent: document.content,
 *   onSave: async (content) => {
 *     await saveDocument(document.id, content);
 *   },
 *   autoSaveMs: 2000,
 * });
 * ```
 */
export function useEditorState<T>({
    initialContent,
    onSave,
    autoSaveMs = 2000,
}: UseEditorStateOptions<T>): UseEditorStateReturn<T> {
    const [state, setState] = useState<EditorState<T>>({
        content: initialContent,
        isDirty: false,
        isSaving: false,
        lastSaved: null,
        error: null,
    });

    // Keep save callback ref stable
    const saveRef = useRef(onSave);
    saveRef.current = onSave;

    // Core save function
    const save = useCallback(async (content: T) => {
        setState((s) => ({ ...s, isSaving: true, error: null }));
        try {
            await saveRef.current(content);
            setState((s) => ({
                ...s,
                isDirty: false,
                isSaving: false,
                lastSaved: new Date(),
            }));
        } catch (error) {
            setState((s) => ({
                ...s,
                isSaving: false,
                error:
                    error instanceof Error ? error : new Error(String(error)),
            }));
            throw error;
        }
    }, []);

    // Debounced save for auto-save
    const debouncedSave = useMemo(
        () =>
            autoSaveMs > 0
                ? debounce((content: T) => {
                      save(content).catch(() => {
                          // Error already handled in save function
                      });
                  }, autoSaveMs)
                : null,
        [save, autoSaveMs]
    );

    // Cleanup debounce on unmount
    useEffect(() => {
        return () => {
            debouncedSave?.cancel?.();
        };
    }, [debouncedSave]);

    // Set content and trigger auto-save
    const setContent = useCallback(
        (content: T) => {
            setState((s) => ({ ...s, content, isDirty: true, error: null }));
            if (debouncedSave) {
                debouncedSave(content);
            }
        },
        [debouncedSave]
    );

    // Force immediate save
    const forceSave = useCallback(
        () => save(state.content),
        [save, state.content]
    );

    // Reset to initial or new content
    const reset = useCallback(
        (newContent?: T) => {
            debouncedSave?.cancel?.();
            setState({
                content: newContent ?? initialContent,
                isDirty: false,
                isSaving: false,
                lastSaved: null,
                error: null,
            });
        },
        [initialContent, debouncedSave]
    );

    return {
        content: state.content,
        isDirty: state.isDirty,
        isSaving: state.isSaving,
        lastSaved: state.lastSaved,
        error: state.error,
        setContent,
        save: forceSave,
        reset,
    };
}

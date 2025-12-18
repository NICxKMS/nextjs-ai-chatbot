"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";

import { getDocumentById, updateDocumentContent } from "../artifacts/actions";
import type { Document } from "../lib/data/types";

import { SWR_KEYS } from "./swr-keys";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export type UseArtifactPersistenceReturn = {
    /** The current document (latest version) */
    document: Document | null;
    /** Whether there are unsaved changes */
    hasUnsavedChanges: boolean;
    /** Current save status */
    saveStatus: SaveStatus;
    /** Error message if save failed */
    saveError: string | null;
    /** Manually save content (bypasses debounce) */
    save: (content: string) => Promise<boolean>;
    /** Save with debounce (1s delay) */
    saveDebounced: (content: string) => void;
    /** Discard unsaved changes and revert to last saved content */
    discard: () => void;
    /** Mark content as dirty (has changes) */
    markDirty: () => void;
    /** Mark content as clean (no changes) */
    markClean: () => void;
    /** Whether the hook is loading initial data */
    isLoading: boolean;
};

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const DEBOUNCE_DELAY_MS = 1000;
const SAVE_STATUS_RESET_DELAY_MS = 2000;

// ─────────────────────────────────────────────────────────────
// Fetcher
// ─────────────────────────────────────────────────────────────

async function documentFetcher(documentId: string): Promise<Document | null> {
    const result = await getDocumentById(documentId);
    if (!result.success) {
        throw new Error(result.error.message);
    }
    return result.data;
}

// ─────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────

/**
 * Hook for artifact persistence with auto-save and dirty state tracking.
 *
 * Provides:
 * - Auto-save with debounce (1s delay)
 * - Dirty state tracking (hasUnsavedChanges)
 * - Save status (saving, saved, error)
 * - save(), discard() functions
 * - Integration with document actions
 *
 * @param documentId - The document ID to manage persistence for
 *
 * @example
 * ```tsx
 * const {
 *   document,
 *   hasUnsavedChanges,
 *   saveStatus,
 *   save,
 *   saveDebounced,
 *   discard,
 * } = useArtifactPersistence(documentId);
 *
 * // Auto-save on content change
 * useEffect(() => {
 *   saveDebounced(content);
 * }, [content, saveDebounced]);
 *
 * // Manual save
 * const handleSave = async () => {
 *   const success = await save(content);
 *   if (success) console.log("Saved!");
 * };
 * ```
 */
export function useArtifactPersistence(
    documentId: string
): UseArtifactPersistenceReturn {
    // ─────────────────────────────────────────────────────────────
    // Document State (SWR)
    // ─────────────────────────────────────────────────────────────

    const swrKey = useMemo(() => {
        if (!documentId || documentId === "init") {
            return null;
        }
        return `${SWR_KEYS.artifactMetadata(documentId)}:document`;
    }, [documentId]);

    const {
        data: document,
        mutate,
        isLoading,
    } = useSWR<Document | null>(swrKey, () => documentFetcher(documentId), {
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        dedupingInterval: 5000,
    });

    // ─────────────────────────────────────────────────────────────
    // Local State
    // ─────────────────────────────────────────────────────────────

    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
    const [saveError, setSaveError] = useState<string | null>(null);

    // ─────────────────────────────────────────────────────────────
    // Refs
    // ─────────────────────────────────────────────────────────────

    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const statusResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
        null
    );
    const abortControllerRef = useRef<AbortController | null>(null);
    const lastSavedContentRef = useRef<string | null>(null);

    // Track the last saved content
    useEffect(() => {
        if (document?.content) {
            lastSavedContentRef.current = document.content;
        }
    }, [document?.content]);

    // ─────────────────────────────────────────────────────────────
    // Cleanup
    // ─────────────────────────────────────────────────────────────

    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
            if (statusResetTimerRef.current) {
                clearTimeout(statusResetTimerRef.current);
            }
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    // ─────────────────────────────────────────────────────────────
    // Actions
    // ─────────────────────────────────────────────────────────────

    const save = useCallback(
        async (content: string): Promise<boolean> => {
            if (!documentId || documentId === "init") {
                return false;
            }

            // Cancel any pending debounced save
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
                debounceTimerRef.current = null;
            }

            // Cancel any in-flight save
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            abortControllerRef.current = new AbortController();

            setSaveStatus("saving");
            setSaveError(null);

            try {
                // Check if document exists
                if (document) {
                    // Update existing document
                    const result = await updateDocumentContent({
                        id: documentId,
                        createdAt: document.createdAt,
                        content,
                    });

                    if (!result.success) {
                        throw new Error(result.error.message);
                    }

                    // Update cache with new document
                    await mutate(result.data, { revalidate: false });
                }

                lastSavedContentRef.current = content;
                setHasUnsavedChanges(false);
                setSaveStatus("saved");

                // Reset status after delay
                statusResetTimerRef.current = setTimeout(() => {
                    setSaveStatus("idle");
                }, SAVE_STATUS_RESET_DELAY_MS);

                return true;
            } catch (error) {
                // Ignore abort errors
                if (error instanceof Error && error.name === "AbortError") {
                    return false;
                }

                const errorMessage =
                    error instanceof Error ? error.message : "Save failed";
                setSaveError(errorMessage);
                setSaveStatus("error");

                // Reset status after delay
                statusResetTimerRef.current = setTimeout(() => {
                    setSaveStatus("idle");
                    setSaveError(null);
                }, SAVE_STATUS_RESET_DELAY_MS * 2);

                return false;
            }
        },
        [documentId, document, mutate]
    );

    const saveDebounced = useCallback(
        (content: string) => {
            if (!documentId || documentId === "init") {
                return;
            }

            // Mark as dirty immediately
            setHasUnsavedChanges(true);

            // Clear existing timer
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }

            // Set new timer
            debounceTimerRef.current = setTimeout(() => {
                save(content);
            }, DEBOUNCE_DELAY_MS);
        },
        [documentId, save]
    );

    const discard = useCallback(() => {
        // Cancel any pending save
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
        }

        // Cancel any in-flight save
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        setHasUnsavedChanges(false);
        setSaveStatus("idle");
        setSaveError(null);
    }, []);

    const markDirty = useCallback(() => {
        setHasUnsavedChanges(true);
    }, []);

    const markClean = useCallback(() => {
        setHasUnsavedChanges(false);
    }, []);

    // ─────────────────────────────────────────────────────────────
    // Return
    // ─────────────────────────────────────────────────────────────

    return useMemo(
        () => ({
            document: document ?? null,
            hasUnsavedChanges,
            saveStatus,
            saveError,
            save,
            saveDebounced,
            discard,
            markDirty,
            markClean,
            isLoading,
        }),
        [
            document,
            hasUnsavedChanges,
            saveStatus,
            saveError,
            save,
            saveDebounced,
            discard,
            markDirty,
            markClean,
            isLoading,
        ]
    );
}

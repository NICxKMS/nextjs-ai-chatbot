"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";

import { SWR_KEYS } from "./swr-keys";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type VersionInfo = {
    id: string;
    createdAt: Date;
    content: string;
    title: string;
};

export type VersionMode = "edit" | "diff";

export type UseArtifactVersioningReturn = {
    /** List of all versions (oldest to newest) */
    versions: VersionInfo[];
    /** Current version index (0-based, -1 if no versions) */
    currentVersionIndex: number;
    /** Current version info */
    currentVersion: VersionInfo | null;
    /** Whether viewing the latest version */
    isCurrentVersion: boolean;
    /** Content of the currently selected version */
    versionContent: string;
    /** View mode: edit or diff */
    mode: VersionMode;
    /** Set the view mode */
    setMode: (mode: VersionMode) => void;
    /** Navigate to a specific version by index */
    goToVersion: (index: number) => void;
    /** Navigate to a specific version by ID */
    goToVersionById: (versionId: string) => void;
    /** Navigate to previous version */
    goToPrevious: () => void;
    /** Navigate to next version */
    goToNext: () => void;
    /** Navigate to latest version */
    goToLatest: () => void;
    /** Whether can navigate to previous version */
    canUndo: boolean;
    /** Whether can navigate to next version (not at latest) */
    canRedo: boolean;
    /** Total number of versions */
    totalVersions: number;
    /** Whether versions are loading */
    isLoading: boolean;
    /** Get diff between two versions */
    getDiff: (
        fromIndex: number,
        toIndex: number
    ) => { from: string; to: string } | null;
};

// ─────────────────────────────────────────────────────────────
// Version Fetcher
// ─────────────────────────────────────────────────────────────

/**
 * Fetches document versions from the API and transforms to VersionInfo[].
 * The API returns Document[] which we map to the VersionInfo shape.
 */
async function versionsFetcher(documentId: string): Promise<VersionInfo[]> {
    const response = await fetch(
        `/api/document?id=${encodeURIComponent(documentId)}`
    );

    if (!response.ok) {
        if (response.status === 404) {
            return [];
        }
        throw new Error(
            `Failed to fetch document versions: ${response.status}`
        );
    }

    const documents: Array<{
        id: string;
        createdAt: string;
        content: string | null;
        title: string;
    }> = await response.json();

    // Transform Document[] to VersionInfo[]
    return documents.map((doc) => ({
        id: doc.id,
        createdAt: new Date(doc.createdAt),
        content: doc.content ?? "",
        title: doc.title,
    }));
}

// ─────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────

/**
 * Hook for artifact versioning with history navigation.
 *
 * Provides:
 * - Version list fetching
 * - Current version state
 * - goToVersion(versionId)
 * - Diff between versions
 * - canUndo, canRedo
 *
 * @param documentId - The document ID to manage versions for
 *
 * @example
 * ```tsx
 * const {
 *   versions,
 *   currentVersion,
 *   isCurrentVersion,
 *   versionContent,
 *   mode,
 *   setMode,
 *   goToPrevious,
 *   goToNext,
 *   goToLatest,
 *   canUndo,
 *   canRedo,
 * } = useArtifactVersioning(documentId);
 *
 * // Navigate versions
 * <button onClick={goToPrevious} disabled={!canUndo}>Previous</button>
 * <button onClick={goToNext} disabled={!canRedo}>Next</button>
 *
 * // Toggle diff mode
 * <button onClick={() => setMode(mode === 'edit' ? 'diff' : 'edit')}>
 *   {mode === 'edit' ? 'Show Diff' : 'Hide Diff'}
 * </button>
 * ```
 */
export function useArtifactVersioning(
    documentId: string
): UseArtifactVersioningReturn {
    // ─────────────────────────────────────────────────────────────
    // Version List State (SWR)
    // ─────────────────────────────────────────────────────────────

    const swrKey = useMemo(() => {
        if (!documentId || documentId === "init") {
            return null;
        }
        return `${SWR_KEYS.artifactMetadata(documentId)}:versions`;
    }, [documentId]);

    const { data: versions = [], isLoading } = useSWR<VersionInfo[]>(
        swrKey,
        () => versionsFetcher(documentId),
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            dedupingInterval: 5000,
        }
    );

    // ─────────────────────────────────────────────────────────────
    // Local State
    // ─────────────────────────────────────────────────────────────

    const [currentVersionIndex, setCurrentVersionIndex] = useState(-1);
    const [mode, setMode] = useState<VersionMode>("edit");

    // ─────────────────────────────────────────────────────────────
    // Auto-set to latest when versions load or change
    // ─────────────────────────────────────────────────────────────

    useEffect(() => {
        if (versions.length > 0) {
            setCurrentVersionIndex(versions.length - 1);
        } else {
            setCurrentVersionIndex(-1);
        }
    }, [versions.length]);

    // Reset mode when document changes
    // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally reset only on documentId change
    useEffect(() => {
        setMode("edit");
    }, [documentId]);

    // ─────────────────────────────────────────────────────────────
    // Computed Values
    // ─────────────────────────────────────────────────────────────

    const totalVersions = versions.length;

    const isCurrentVersion = useMemo(() => {
        if (totalVersions === 0) {
            return true;
        }
        return currentVersionIndex === totalVersions - 1;
    }, [currentVersionIndex, totalVersions]);

    const currentVersion = useMemo((): VersionInfo | null => {
        if (currentVersionIndex < 0 || currentVersionIndex >= totalVersions) {
            return null;
        }
        const version = versions[currentVersionIndex];
        return version !== undefined ? version : null;
    }, [versions, currentVersionIndex, totalVersions]);

    const versionContent = useMemo(() => {
        return currentVersion?.content ?? "";
    }, [currentVersion]);

    const canUndo = useMemo(() => {
        return totalVersions > 0 && currentVersionIndex > 0;
    }, [totalVersions, currentVersionIndex]);

    const canRedo = useMemo(() => {
        return totalVersions > 0 && currentVersionIndex < totalVersions - 1;
    }, [totalVersions, currentVersionIndex]);

    // ─────────────────────────────────────────────────────────────
    // Navigation Actions
    // ─────────────────────────────────────────────────────────────

    const goToVersion = useCallback(
        (index: number) => {
            if (index < 0 || index >= totalVersions) {
                return;
            }
            setCurrentVersionIndex(index);
        },
        [totalVersions]
    );

    const goToVersionById = useCallback(
        (versionId: string) => {
            const index = versions.findIndex((v) => v.id === versionId);
            if (index !== -1) {
                setCurrentVersionIndex(index);
            }
        },
        [versions]
    );

    const goToPrevious = useCallback(() => {
        if (canUndo) {
            setCurrentVersionIndex((prev) => prev - 1);
        }
    }, [canUndo]);

    const goToNext = useCallback(() => {
        if (canRedo) {
            setCurrentVersionIndex((prev) => prev + 1);
        }
    }, [canRedo]);

    const goToLatest = useCallback(() => {
        if (totalVersions > 0) {
            setCurrentVersionIndex(totalVersions - 1);
        }
    }, [totalVersions]);

    // ─────────────────────────────────────────────────────────────
    // Diff Utility
    // ─────────────────────────────────────────────────────────────

    const getDiff = useCallback(
        (
            fromIndex: number,
            toIndex: number
        ): { from: string; to: string } | null => {
            if (fromIndex < 0 || fromIndex >= totalVersions) {
                return null;
            }
            if (toIndex < 0 || toIndex >= totalVersions) {
                return null;
            }

            const fromVersion = versions[fromIndex];
            const toVersion = versions[toIndex];

            if (!(fromVersion && toVersion)) {
                return null;
            }

            return {
                from: fromVersion.content,
                to: toVersion.content,
            };
        },
        [versions, totalVersions]
    );

    // ─────────────────────────────────────────────────────────────
    // Return
    // ─────────────────────────────────────────────────────────────

    return useMemo(
        () => ({
            versions,
            currentVersionIndex,
            currentVersion,
            isCurrentVersion,
            versionContent,
            mode,
            setMode,
            goToVersion,
            goToVersionById,
            goToPrevious,
            goToNext,
            goToLatest,
            canUndo,
            canRedo,
            totalVersions,
            isLoading,
            getDiff,
        }),
        [
            versions,
            currentVersionIndex,
            currentVersion,
            isCurrentVersion,
            versionContent,
            mode,
            goToVersion,
            goToVersionById,
            goToPrevious,
            goToNext,
            goToLatest,
            canUndo,
            canRedo,
            totalVersions,
            isLoading,
            getDiff,
        ]
    );
}

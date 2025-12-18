"use client";

import type { Dispatch, ReactNode, SetStateAction } from "react";
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import useSWR from "swr";
import type { UIArtifact } from "./types";

// ============================================================================
// Initial State
// ============================================================================

export const initialArtifactData: UIArtifact = {
    documentId: "init",
    content: "",
    kind: "text",
    title: "",
    status: "idle",
    isVisible: false,
    boundingBox: { top: 0, left: 0, width: 0, height: 0 },
};

// ============================================================================
// Context Types
// ============================================================================

type ArtifactContextValue = {
    artifact: UIArtifact;
    setArtifact: Dispatch<SetStateAction<UIArtifact>>;
    metadata: unknown;
    setMetadata: Dispatch<SetStateAction<unknown>>;
    closeArtifact: () => void;
    openArtifact: (artifact: Partial<UIArtifact>) => void;
};

const ArtifactContext = createContext<ArtifactContextValue | null>(null);

// ============================================================================
// Provider Component
// ============================================================================

type ArtifactProviderProps = {
    children: ReactNode;
};

export function ArtifactProvider({ children }: ArtifactProviderProps) {
    const { data: localArtifact, mutate: setLocalArtifact } =
        useSWR<UIArtifact>("artifact", null, {
            fallbackData: initialArtifactData,
        });

    const artifact = localArtifact ?? initialArtifactData;
    const previousDocumentIdRef = useRef(artifact.documentId);

    // Metadata SWR - keyed by documentId for automatic cleanup
    const { data: localMetadata, mutate: setLocalMetadata } = useSWR<unknown>(
        () =>
            artifact.documentId && artifact.documentId !== "init"
                ? `artifact-metadata-${artifact.documentId}`
                : null,
        null,
        { fallbackData: null, revalidateOnMount: true }
    );

    // Clear metadata when documentId changes
    useEffect(() => {
        if (previousDocumentIdRef.current !== artifact.documentId) {
            previousDocumentIdRef.current = artifact.documentId;
            setLocalMetadata(null, { revalidate: false });
        }
    }, [artifact.documentId, setLocalMetadata]);

    const setArtifact = useCallback(
        (updater: UIArtifact | ((current: UIArtifact) => UIArtifact)) => {
            setLocalArtifact((current) => {
                const base = current ?? initialArtifactData;
                return typeof updater === "function" ? updater(base) : updater;
            });
        },
        [setLocalArtifact]
    );

    const setMetadata = useCallback(
        (updater: SetStateAction<unknown>) => {
            if (typeof updater === "function") {
                setLocalMetadata((current: unknown) =>
                    updater(current ?? null)
                );
            } else {
                setLocalMetadata(updater);
            }
        },
        [setLocalMetadata]
    ) as Dispatch<SetStateAction<unknown>>;

    const closeArtifact = useCallback(() => {
        setArtifact((current) => ({ ...current, isVisible: false }));
    }, [setArtifact]);

    const openArtifact = useCallback(
        (partial: Partial<UIArtifact>) => {
            setArtifact((current) => ({
                ...current,
                ...partial,
                isVisible: true,
            }));
        },
        [setArtifact]
    );

    const value = useMemo(
        () => ({
            artifact,
            setArtifact,
            metadata: localMetadata,
            setMetadata,
            closeArtifact,
            openArtifact,
        }),
        [
            artifact,
            setArtifact,
            localMetadata,
            setMetadata,
            closeArtifact,
            openArtifact,
        ]
    );

    return (
        <ArtifactContext.Provider value={value}>
            {children}
        </ArtifactContext.Provider>
    );
}

// ============================================================================
// Hooks
// ============================================================================

export function useArtifactContext(): ArtifactContextValue {
    const context = useContext(ArtifactContext);
    if (!context) {
        throw new Error(
            "useArtifactContext must be used within ArtifactProvider"
        );
    }
    return context;
}

type Selector<T> = (state: UIArtifact) => T;

/**
 * Select specific artifact state to minimize re-renders
 */
export function useArtifactSelector<T>(selector: Selector<T>): T {
    const [mounted, setMounted] = useState(false);
    const { data } = useSWR<UIArtifact>("artifact", null, {
        fallbackData: initialArtifactData,
    });

    useEffect(() => {
        setMounted(true);
    }, []);

    return useMemo(() => {
        if (!mounted) {
            return selector(initialArtifactData);
        }
        return selector(data ?? initialArtifactData);
    }, [data, selector, mounted]);
}

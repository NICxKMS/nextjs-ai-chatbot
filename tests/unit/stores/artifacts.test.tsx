import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import type { ReactNode } from "react";
import {
    useArtifact,
    useArtifactSelector,
    initialArtifactData,
} from "@/features/artifacts/hooks/use-artifact";
import type { UIArtifact } from "@/features/artifacts/types";

// =============================================================================
// TEST HELPERS
// =============================================================================

/**
 * Creates a fresh SWR wrapper for isolated test state
 */
function createWrapper() {
    return function Wrapper({ children }: { children: ReactNode }) {
        return (
            <SWRConfig
                value={{ provider: () => new Map(), dedupingInterval: 0 }}
            >
                {children}
            </SWRConfig>
        );
    };
}

/**
 * Creates a test artifact with specified overrides
 */
function createTestArtifact(overrides: Partial<UIArtifact> = {}): UIArtifact {
    return {
        ...initialArtifactData,
        ...overrides,
    };
}

// =============================================================================
// ARTIFACT STORE TESTS
// =============================================================================

describe("Artifact Store", () => {
    describe("Initial State", () => {
        it("should have correct initial state shape", () => {
            const { result } = renderHook(() => useArtifact(), {
                wrapper: createWrapper(),
            });

            expect(result.current.artifact).toEqual({
                documentId: "init",
                content: "",
                kind: "text",
                title: "",
                status: "idle",
                isVisible: false,
                boundingBox: {
                    top: 0,
                    left: 0,
                    width: 0,
                    height: 0,
                },
            });
        });

        it('should have documentId as "init" by default', () => {
            const { result } = renderHook(() => useArtifact(), {
                wrapper: createWrapper(),
            });

            expect(result.current.artifact.documentId).toBe("init");
        });

        it("should have isVisible as false by default", () => {
            const { result } = renderHook(() => useArtifact(), {
                wrapper: createWrapper(),
            });

            expect(result.current.artifact.isVisible).toBe(false);
        });

        it('should have status as "idle" by default', () => {
            const { result } = renderHook(() => useArtifact(), {
                wrapper: createWrapper(),
            });

            expect(result.current.artifact.status).toBe("idle");
        });

        it("should have empty content by default", () => {
            const { result } = renderHook(() => useArtifact(), {
                wrapper: createWrapper(),
            });

            expect(result.current.artifact.content).toBe("");
        });

        it("should have metadata as null initially", () => {
            const { result } = renderHook(() => useArtifact(), {
                wrapper: createWrapper(),
            });

            expect(result.current.metadata).toBeNull();
        });
    });

    describe("openArtifact (setArtifact with isVisible: true)", () => {
        it("should open artifact by setting isVisible to true", async () => {
            const { result } = renderHook(() => useArtifact(), {
                wrapper: createWrapper(),
            });

            const testArtifact = createTestArtifact({
                documentId: "doc-123",
                title: "Test Document",
                content: "Hello World",
                isVisible: true,
            });

            act(() => {
                result.current.setArtifact(testArtifact);
            });

            await waitFor(() => {
                expect(result.current.artifact.isVisible).toBe(true);
                expect(result.current.artifact.documentId).toBe("doc-123");
                expect(result.current.artifact.title).toBe("Test Document");
            });
        });

        it("should open artifact with specific kind", async () => {
            const { result } = renderHook(() => useArtifact(), {
                wrapper: createWrapper(),
            });

            act(() => {
                result.current.setArtifact(
                    createTestArtifact({
                        documentId: "code-doc",
                        kind: "code",
                        isVisible: true,
                    })
                );
            });

            await waitFor(() => {
                expect(result.current.artifact.kind).toBe("code");
                expect(result.current.artifact.isVisible).toBe(true);
            });
        });

        it("should preserve existing fields when opening", async () => {
            const { result } = renderHook(() => useArtifact(), {
                wrapper: createWrapper(),
            });

            // Set initial state
            act(() => {
                result.current.setArtifact(
                    createTestArtifact({
                        documentId: "existing-doc",
                        content: "Existing content",
                        isVisible: false,
                    })
                );
            });

            await waitFor(() => {
                expect(result.current.artifact.documentId).toBe("existing-doc");
            });

            // Open artifact using updater function
            act(() => {
                result.current.setArtifact((current) => ({
                    ...current,
                    isVisible: true,
                }));
            });

            await waitFor(() => {
                expect(result.current.artifact.isVisible).toBe(true);
                expect(result.current.artifact.content).toBe(
                    "Existing content"
                );
                expect(result.current.artifact.documentId).toBe("existing-doc");
            });
        });
    });

    describe("closeArtifact (setArtifact with isVisible: false)", () => {
        it("should close artifact by setting isVisible to false", async () => {
            const { result } = renderHook(() => useArtifact(), {
                wrapper: createWrapper(),
            });

            // Open first
            act(() => {
                result.current.setArtifact(
                    createTestArtifact({
                        documentId: "doc-to-close",
                        isVisible: true,
                    })
                );
            });

            await waitFor(() => {
                expect(result.current.artifact.isVisible).toBe(true);
            });

            // Close artifact
            act(() => {
                result.current.setArtifact((current) => ({
                    ...current,
                    isVisible: false,
                }));
            });

            await waitFor(() => {
                expect(result.current.artifact.isVisible).toBe(false);
            });
        });

        it("should reset to initial state when closing", async () => {
            const { result } = renderHook(() => useArtifact(), {
                wrapper: createWrapper(),
            });

            // Set some state
            act(() => {
                result.current.setArtifact(
                    createTestArtifact({
                        documentId: "active-doc",
                        content: "Some content",
                        isVisible: true,
                    })
                );
            });

            await waitFor(() => {
                expect(result.current.artifact.isVisible).toBe(true);
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

    describe("setSelectedVersionIndex (setArtifact with content updates)", () => {
        it("should update content when selecting different version", async () => {
            const { result } = renderHook(() => useArtifact(), {
                wrapper: createWrapper(),
            });

            // Initial version
            act(() => {
                result.current.setArtifact(
                    createTestArtifact({
                        documentId: "versioned-doc",
                        content: "Version 1 content",
                        isVisible: true,
                    })
                );
            });

            await waitFor(() => {
                expect(result.current.artifact.content).toBe(
                    "Version 1 content"
                );
            });

            // Select different version (simulated by content update)
            act(() => {
                result.current.setArtifact((current) => ({
                    ...current,
                    content: "Version 2 content",
                }));
            });

            await waitFor(() => {
                expect(result.current.artifact.content).toBe(
                    "Version 2 content"
                );
                expect(result.current.artifact.documentId).toBe(
                    "versioned-doc"
                );
            });
        });

        it("should handle version selection with metadata update", async () => {
            const { result } = renderHook(() => useArtifact(), {
                wrapper: createWrapper(),
            });

            act(() => {
                result.current.setArtifact(
                    createTestArtifact({
                        documentId: "meta-doc",
                        isVisible: true,
                    })
                );
            });

            await waitFor(() => {
                expect(result.current.artifact.documentId).toBe("meta-doc");
            });

            // Update metadata for the version
            act(() => {
                result.current.setMetadata({
                    version: 2,
                    outputs: ["output1"],
                });
            });

            await waitFor(() => {
                expect(result.current.metadata).toEqual({
                    version: 2,
                    outputs: ["output1"],
                });
            });
        });
    });

    describe("State Updates", () => {
        it("should update status during streaming", async () => {
            const { result } = renderHook(() => useArtifact(), {
                wrapper: createWrapper(),
            });

            act(() => {
                result.current.setArtifact((current) => ({
                    ...current,
                    status: "streaming",
                }));
            });

            await waitFor(() => {
                expect(result.current.artifact.status).toBe("streaming");
            });
        });

        it("should update bounding box", async () => {
            const { result } = renderHook(() => useArtifact(), {
                wrapper: createWrapper(),
            });

            act(() => {
                result.current.setArtifact((current) => ({
                    ...current,
                    boundingBox: {
                        top: 100,
                        left: 200,
                        width: 300,
                        height: 400,
                    },
                }));
            });

            await waitFor(() => {
                expect(result.current.artifact.boundingBox).toEqual({
                    top: 100,
                    left: 200,
                    width: 300,
                    height: 400,
                });
            });
        });

        it("should handle multiple sequential updates", async () => {
            const { result } = renderHook(() => useArtifact(), {
                wrapper: createWrapper(),
            });

            act(() => {
                result.current.setArtifact(
                    createTestArtifact({ documentId: "update-1" })
                );
            });

            await waitFor(() => {
                expect(result.current.artifact.documentId).toBe("update-1");
            });

            act(() => {
                result.current.setArtifact((current) => ({
                    ...current,
                    documentId: "update-2",
                }));
            });

            await waitFor(() => {
                expect(result.current.artifact.documentId).toBe("update-2");
            });

            act(() => {
                result.current.setArtifact((current) => ({
                    ...current,
                    documentId: "update-3",
                }));
            });

            await waitFor(() => {
                expect(result.current.artifact.documentId).toBe("update-3");
            });
        });
    });

    describe("Metadata Management", () => {
        it("should update metadata with object", async () => {
            const { result } = renderHook(() => useArtifact(), {
                wrapper: createWrapper(),
            });

            // Need to set documentId first for metadata key
            act(() => {
                result.current.setArtifact(
                    createTestArtifact({ documentId: "doc-with-meta" })
                );
            });

            await waitFor(() => {
                expect(result.current.artifact.documentId).toBe(
                    "doc-with-meta"
                );
            });

            act(() => {
                result.current.setMetadata({ custom: "data" });
            });

            await waitFor(() => {
                expect(result.current.metadata).toEqual({ custom: "data" });
            });
        });

        it("should update metadata with function", async () => {
            const { result } = renderHook(() => useArtifact(), {
                wrapper: createWrapper(),
            });

            act(() => {
                result.current.setArtifact(
                    createTestArtifact({ documentId: "func-meta-doc" })
                );
            });

            await waitFor(() => {
                expect(result.current.artifact.documentId).toBe(
                    "func-meta-doc"
                );
            });

            // Set initial metadata
            act(() => {
                result.current.setMetadata({ count: 1 });
            });

            await waitFor(() => {
                expect(result.current.metadata).toEqual({ count: 1 });
            });

            // Update with function
            act(() => {
                result.current.setMetadata((prev: unknown) => ({
                    ...(prev as object),
                    count: ((prev as { count: number })?.count || 0) + 1,
                }));
            });

            await waitFor(() => {
                expect(result.current.metadata).toEqual({ count: 2 });
            });
        });
    });
});

describe("useArtifactSelector", () => {
    it("should select isVisible state", () => {
        const { result } = renderHook(
            () => useArtifactSelector((state) => state.isVisible),
            { wrapper: createWrapper() }
        );

        expect(result.current).toBe(false);
    });

    it("should select documentId state", () => {
        const { result } = renderHook(
            () => useArtifactSelector((state) => state.documentId),
            { wrapper: createWrapper() }
        );

        expect(result.current).toBe("init");
    });

    it("should select nested boundingBox property", () => {
        const { result } = renderHook(
            () => useArtifactSelector((state) => state.boundingBox.width),
            { wrapper: createWrapper() }
        );

        expect(result.current).toBe(0);
    });

    it("should compute derived values", () => {
        const { result } = renderHook(
            () => useArtifactSelector((state) => state.documentId !== "init"),
            { wrapper: createWrapper() }
        );

        expect(result.current).toBe(false);
    });

    it("should compute hasContent", () => {
        const { result } = renderHook(
            () => useArtifactSelector((state) => state.content.length > 0),
            { wrapper: createWrapper() }
        );

        expect(result.current).toBe(false);
    });
});

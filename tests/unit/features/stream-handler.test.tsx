/**
 * P3-083: DataStreamHandler Tests
 *
 * Unit tests for features/artifacts/utils/stream-handler.tsx
 * Tests stream chunk processing, artifact state updates, and error handling.
 *
 * Note: DataStreamHandler is a React component that uses hooks (useRef, useEffect).
 * Tests must render it within a React context using @testing-library/react.
 *
 * @module tests/unit/features/stream-handler.test.tsx
 */
import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// Mocks
// ============================================================================

const mockSetArtifact = vi.fn();
const mockSetMetadata = vi.fn();
let mockArtifactKind = "text";

vi.mock("@/features/artifacts/hooks/use-artifact", () => ({
    initialArtifactData: {
        documentId: "",
        title: "",
        kind: "text",
        content: "",
        status: "idle",
        isVisible: false,
        boundingBox: { top: 0, left: 0, width: 0, height: 0 },
    },
    useArtifact: () => ({
        artifact: {
            documentId: "",
            title: "",
            kind: mockArtifactKind,
            content: "",
            status: "idle",
            isVisible: false,
            boundingBox: { top: 0, left: 0, width: 0, height: 0 },
        },
        setArtifact: mockSetArtifact,
        setMetadata: mockSetMetadata,
    }),
}));

// ============================================================================
// Test Setup
// ============================================================================

import type {
    ArtifactDefinition,
    ArtifactStreamPart,
} from "@/features/artifacts/types";
import { DataStreamHandler } from "@/features/artifacts/utils/stream-handler";

const createTextArtifactDefinition = (): ArtifactDefinition => ({
    kind: "text",
    description: "Text artifact",
    initialize: async () => ({ content: "" }),
    onStreamPart: vi.fn(),
});

const createCodeArtifactDefinition = (): ArtifactDefinition => ({
    kind: "code",
    description: "Code artifact",
    initialize: async () => ({ content: "", language: "javascript" }),
    onStreamPart: vi.fn(),
});

// Helper to render the DataStreamHandler component
function renderStreamHandler(props: {
    dataStream: ArtifactStreamPart[] | undefined;
    artifactDefinitions: ArtifactDefinition[];
}) {
    return render(
        <DataStreamHandler
            artifactDefinitions={props.artifactDefinitions}
            dataStream={props.dataStream}
        />
    );
}

// ============================================================================
// Tests
// ============================================================================

describe("DataStreamHandler", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockArtifactKind = "text";
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    describe("Rendering", () => {
        it("should render null (no visible output)", () => {
            const { container } = renderStreamHandler({
                dataStream: undefined,
                artifactDefinitions: [],
            });

            // Component renders nothing
            expect(container.innerHTML).toBe("");
        });

        it("should handle empty dataStream array", () => {
            const { container } = renderStreamHandler({
                dataStream: [],
                artifactDefinitions: [],
            });

            expect(container.innerHTML).toBe("");
        });
    });

    describe("Base Stream Part Processing", () => {
        it("should process data-id stream parts", () => {
            const dataStream: ArtifactStreamPart[] = [
                { type: "data-id", data: "doc-123" },
            ];

            renderStreamHandler({
                dataStream,
                artifactDefinitions: [createTextArtifactDefinition()],
            });

            expect(mockSetArtifact).toHaveBeenCalled();
        });

        it("should process data-title stream parts", () => {
            const dataStream: ArtifactStreamPart[] = [
                { type: "data-title", data: "Test Document" },
            ];

            renderStreamHandler({
                dataStream,
                artifactDefinitions: [createTextArtifactDefinition()],
            });

            expect(mockSetArtifact).toHaveBeenCalled();
        });

        it("should process data-kind stream parts", () => {
            const dataStream: ArtifactStreamPart[] = [
                { type: "data-kind", data: "code" },
            ];

            renderStreamHandler({
                dataStream,
                artifactDefinitions: [createTextArtifactDefinition()],
            });

            expect(mockSetArtifact).toHaveBeenCalled();
        });

        it("should process data-clear stream parts", () => {
            const dataStream: ArtifactStreamPart[] = [
                { type: "data-clear", data: null },
            ];

            renderStreamHandler({
                dataStream,
                artifactDefinitions: [createTextArtifactDefinition()],
            });

            expect(mockSetArtifact).toHaveBeenCalled();
        });

        it("should process data-finish stream parts", () => {
            const dataStream: ArtifactStreamPart[] = [
                { type: "data-finish", data: null },
            ];

            renderStreamHandler({
                dataStream,
                artifactDefinitions: [createTextArtifactDefinition()],
            });

            expect(mockSetArtifact).toHaveBeenCalled();
        });

        it("should process multiple stream parts in sequence", () => {
            const dataStream: ArtifactStreamPart[] = [
                { type: "data-id", data: "doc-123" },
                { type: "data-title", data: "Test Document" },
                { type: "data-kind", data: "text" },
                { type: "data-finish", data: null },
            ];

            renderStreamHandler({
                dataStream,
                artifactDefinitions: [createTextArtifactDefinition()],
            });

            // Should call setArtifact for each stream part
            expect(mockSetArtifact).toHaveBeenCalledTimes(4);
        });
    });

    describe("Artifact Definition Callbacks", () => {
        it("should call onStreamPart for matching artifact definition", () => {
            const textDefinition = createTextArtifactDefinition();
            const dataStream: ArtifactStreamPart[] = [
                { type: "data-id", data: "doc-123" },
            ];

            renderStreamHandler({
                dataStream,
                artifactDefinitions: [textDefinition],
            });

            expect(textDefinition.onStreamPart).toHaveBeenCalled();
        });

        it("should not call onStreamPart for non-matching artifact definition", () => {
            const codeDefinition = createCodeArtifactDefinition();
            const dataStream: ArtifactStreamPart[] = [
                { type: "data-id", data: "doc-123" },
            ];

            // Current artifact kind is "text", but we only have code definition
            renderStreamHandler({
                dataStream,
                artifactDefinitions: [codeDefinition],
            });

            expect(codeDefinition.onStreamPart).not.toHaveBeenCalled();
        });

        it("should pass correct arguments to onStreamPart", () => {
            const textDefinition = createTextArtifactDefinition();
            const streamPart: ArtifactStreamPart = {
                type: "data-id",
                data: "doc-123",
            };
            const dataStream: ArtifactStreamPart[] = [streamPart];

            renderStreamHandler({
                dataStream,
                artifactDefinitions: [textDefinition],
            });

            expect(textDefinition.onStreamPart).toHaveBeenCalledWith(
                expect.objectContaining({
                    streamPart,
                    setArtifact: mockSetArtifact,
                    setMetadata: mockSetMetadata,
                })
            );
        });
    });

    describe("Stream Processing Logic", () => {
        it("should handle undefined dataStream gracefully", () => {
            expect(() => {
                renderStreamHandler({
                    dataStream: undefined,
                    artifactDefinitions: [createTextArtifactDefinition()],
                });
            }).not.toThrow();
        });

        it("should work with empty artifact definitions array", () => {
            const dataStream: ArtifactStreamPart[] = [
                { type: "data-id", data: "doc-123" },
            ];

            expect(() => {
                renderStreamHandler({
                    dataStream,
                    artifactDefinitions: [],
                });
            }).not.toThrow();

            // Should still process base stream parts
            expect(mockSetArtifact).toHaveBeenCalled();
        });

        it("should handle unknown stream part types gracefully", () => {
            const dataStream: ArtifactStreamPart[] = [
                { type: "unknown-type" as any, data: "test" },
            ];

            expect(() => {
                renderStreamHandler({
                    dataStream,
                    artifactDefinitions: [createTextArtifactDefinition()],
                });
            }).not.toThrow();
        });
    });
});

describe("processBaseStreamPart (indirect testing)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockArtifactKind = "text";
    });

    it("should update documentId for data-id type", () => {
        const dataStream: ArtifactStreamPart[] = [
            { type: "data-id", data: "new-doc-id" },
        ];

        renderStreamHandler({
            dataStream,
            artifactDefinitions: [],
        });

        // Verify setArtifact was called with a function
        expect(mockSetArtifact).toHaveBeenCalledWith(expect.any(Function));
    });

    it("should update title for data-title type", () => {
        const dataStream: ArtifactStreamPart[] = [
            { type: "data-title", data: "New Title" },
        ];

        renderStreamHandler({
            dataStream,
            artifactDefinitions: [],
        });

        expect(mockSetArtifact).toHaveBeenCalledWith(expect.any(Function));
    });

    it("should update kind for data-kind type", () => {
        const dataStream: ArtifactStreamPart[] = [
            { type: "data-kind", data: "code" },
        ];

        renderStreamHandler({
            dataStream,
            artifactDefinitions: [],
        });

        expect(mockSetArtifact).toHaveBeenCalledWith(expect.any(Function));
    });

    it("should clear content for data-clear type", () => {
        const dataStream: ArtifactStreamPart[] = [
            { type: "data-clear", data: null },
        ];

        renderStreamHandler({
            dataStream,
            artifactDefinitions: [],
        });

        expect(mockSetArtifact).toHaveBeenCalledWith(expect.any(Function));
    });

    it("should set status to idle for data-finish type", () => {
        const dataStream: ArtifactStreamPart[] = [
            { type: "data-finish", data: null },
        ];

        renderStreamHandler({
            dataStream,
            artifactDefinitions: [],
        });

        expect(mockSetArtifact).toHaveBeenCalledWith(expect.any(Function));
    });
});

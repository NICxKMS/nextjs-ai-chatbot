import { type LanguageModel, streamObject } from "ai";
import { z } from "zod";
import { DEFAULT_CHAT_MODEL_ID } from "@/lib/ai/config";
import { getProvider } from "@/lib/ai/providers/registry";
import type { AIProviderId } from "@/lib/ai/types";
import {
    createDocumentHandler,
    sheetPrompt,
    updateDocumentPrompt,
} from "../server";

/**
 * Gets a language model instance for artifact generation.
 * Uses the default chat model provider.
 */
function getArtifactModel(): LanguageModel {
    const [providerId, modelId] = DEFAULT_CHAT_MODEL_ID.split(":") as [
        string,
        string,
    ];
    const provider = getProvider(providerId as AIProviderId);

    if (!provider) {
        throw new Error(
            `Provider '${providerId}' is not available for artifact generation`
        );
    }

    const languageModelFn = (
        provider as unknown as {
            languageModel: (id: string) => LanguageModel;
        }
    ).languageModel;

    if (typeof languageModelFn !== "function") {
        throw new Error(
            `Provider '${providerId}' does not support language models`
        );
    }

    return languageModelFn(modelId);
}

/**
 * Sheet document handler for CSV spreadsheet generation
 */
export const sheetDocumentHandler = createDocumentHandler<"sheet">({
    kind: "sheet",
    onCreateDocument: async ({ title, dataStream }) => {
        let draftContent = "";

        const { fullStream } = streamObject({
            model: getArtifactModel(),
            system: sheetPrompt,
            prompt: title,
            schema: z.object({
                csv: z.string().describe("CSV data"),
            }),
            experimental_telemetry: {
                isEnabled: true,
                functionId: "artifact-sheet-create",
                recordInputs: true,
                recordOutputs: true,
            },
        });

        for await (const delta of fullStream) {
            const { type } = delta;

            if (type === "object") {
                const { object } = delta;
                const { csv } = object;

                if (csv) {
                    dataStream.write({
                        type: "data-sheetDelta",
                        data: csv,
                        transient: true,
                    });

                    draftContent = csv;
                }
            }
        }

        dataStream.write({
            type: "data-sheetDelta",
            data: draftContent,
            transient: true,
        });

        return draftContent;
    },
    onUpdateDocument: async ({ document, description, dataStream }) => {
        let draftContent = "";

        const { fullStream } = streamObject({
            model: getArtifactModel(),
            system: updateDocumentPrompt(document.content, "sheet"),
            prompt: description,
            schema: z.object({
                csv: z.string(),
            }),
            experimental_telemetry: {
                isEnabled: true,
                functionId: "artifact-sheet-update",
                recordInputs: true,
                recordOutputs: true,
            },
        });

        for await (const delta of fullStream) {
            const { type } = delta;

            if (type === "object") {
                const { object } = delta;
                const { csv } = object;

                if (csv) {
                    dataStream.write({
                        type: "data-sheetDelta",
                        data: csv,
                        transient: true,
                    });

                    draftContent = csv;
                }
            }
        }

        return draftContent;
    },
});

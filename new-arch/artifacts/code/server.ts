import { type LanguageModel, streamObject } from "ai";
import { z } from "zod";
import { DEFAULT_CHAT_MODEL_ID } from "@/lib/ai/config";
import { getProvider } from "@/lib/ai/providers/registry";
import type { AIProviderId } from "@/lib/ai/types";
import {
    codePrompt,
    createDocumentHandler,
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
 * Code document handler for Python code generation
 */
export const codeDocumentHandler = createDocumentHandler<"code">({
    kind: "code",
    onCreateDocument: async ({ title, dataStream }) => {
        let draftContent = "";

        const { fullStream } = streamObject({
            model: getArtifactModel(),
            system: codePrompt,
            prompt: title,
            schema: z.object({
                code: z.string(),
            }),
            experimental_telemetry: {
                isEnabled: true,
                functionId: "artifact-code-create",
                recordInputs: true,
                recordOutputs: true,
            },
        });

        for await (const delta of fullStream) {
            const { type } = delta;

            if (type === "object") {
                const { object } = delta;
                const { code } = object;

                if (code) {
                    dataStream.write({
                        type: "data-codeDelta",
                        data: code ?? "",
                        transient: true,
                    });

                    draftContent = code;
                }
            }
        }

        return draftContent;
    },
    onUpdateDocument: async ({ document, description, dataStream }) => {
        let draftContent = "";

        const { fullStream } = streamObject({
            model: getArtifactModel(),
            system: updateDocumentPrompt(document.content, "code"),
            prompt: description,
            schema: z.object({
                code: z.string(),
            }),
            experimental_telemetry: {
                isEnabled: true,
                functionId: "artifact-code-update",
                recordInputs: true,
                recordOutputs: true,
            },
        });

        for await (const delta of fullStream) {
            const { type } = delta;

            if (type === "object") {
                const { object } = delta;
                const { code } = object;

                if (code) {
                    dataStream.write({
                        type: "data-codeDelta",
                        data: code ?? "",
                        transient: true,
                    });

                    draftContent = code;
                }
            }
        }

        return draftContent;
    },
});

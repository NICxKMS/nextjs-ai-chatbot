/**
 * Code Document Handler
 * Ref: oldapp/artifacts/code/server.ts
 *
 * Handles streaming code document generation and updates.
 */
import "server-only";

import { type LanguageModel, streamObject } from "ai";
import { z } from "zod";

import { createDocumentHandler } from "./base";

const CODE_SYSTEM_PROMPT = `
Generate self-contained, executable Python code.

**Requirements:**
- **Complete:** Runnable as-is.
- **Output:** Use \`print()\` to show results.
- **Concise:** Keep under 15 lines if possible.
- **Standard Lib:** No external dependencies.
- **Safe:** No \`input()\`, infinite loops, file access, or network calls.
- **Documented:** Brief comments explaining logic.
`;

/**
 * Create update prompt for code documents
 */
function createUpdatePrompt(currentContent: string | null): string {
    return `Update the code snippet below based on the user's request.
    
${currentContent}`;
}

/**
 * Code response schema for structured output
 */
const codeSchema = z.object({
    code: z.string(),
});

/**
 * Code document handler for streaming code generation
 */
export const codeDocumentHandler = createDocumentHandler<"code">({
    kind: "code",

    onCreateDocument: async ({ title, dataStream, model }) => {
        let draftContent = "";

        const { fullStream } = streamObject({
            model,
            system: CODE_SYSTEM_PROMPT,
            prompt: title,
            schema: codeSchema,
        });

        for await (const delta of fullStream) {
            if (delta.type === "object") {
                const { object } = delta;
                const { code } = object;

                if (code) {
                    dataStream.write({
                        type: "data-codeDelta",
                        data: code,
                        transient: true,
                    });
                    draftContent = code;
                }
            }
        }

        return draftContent;
    },

    onUpdateDocument: async ({ document, description, dataStream, model }) => {
        let draftContent = "";

        const { fullStream } = streamObject({
            model,
            system: createUpdatePrompt(document.content),
            prompt: description,
            schema: codeSchema,
        });

        for await (const delta of fullStream) {
            if (delta.type === "object") {
                const { object } = delta;
                const { code } = object;

                if (code) {
                    dataStream.write({
                        type: "data-codeDelta",
                        data: code,
                        transient: true,
                    });
                    draftContent = code;
                }
            }
        }

        return draftContent;
    },
});

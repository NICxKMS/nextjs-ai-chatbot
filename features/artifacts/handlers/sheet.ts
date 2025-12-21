/**
 * Sheet Document Handler
 * Ref: oldapp/artifacts/sheet/server.ts
 *
 * Handles streaming spreadsheet (CSV) document generation and updates.
 */
import "server-only";

import { type LanguageModel, streamObject } from "ai";
import { z } from "zod";

import { createDocumentHandler } from "./base";

const SHEET_SYSTEM_PROMPT = `
Generate a CSV spreadsheet based on the user's request.
- Include meaningful headers.
- Ensure data is consistent and formatted correctly.
`;

/**
 * Create update prompt for sheet documents
 */
function createUpdatePrompt(currentContent: string | null): string {
    return `Update the spreadsheet below based on the user's request.
    
${currentContent}`;
}

/**
 * Sheet response schema for structured output
 */
const sheetSchema = z.object({
    csv: z.string().describe("CSV data"),
});

/**
 * Sheet document handler for streaming CSV generation
 */
export const sheetDocumentHandler = createDocumentHandler<"sheet">({
    kind: "sheet",

    onCreateDocument: async ({ title, dataStream, model }) => {
        let draftContent = "";

        const { fullStream } = streamObject({
            model,
            system: SHEET_SYSTEM_PROMPT,
            prompt: title,
            schema: sheetSchema,
        });

        for await (const delta of fullStream) {
            if (delta.type === "object") {
                const { object } = delta;
                const { csv } = object;

                if (csv) {
                    dataStream.write({
                        type: "data-sheetDelta",
                        data: csv,
                    });
                    draftContent = csv;
                }
            }
        }

        // Send final content
        dataStream.write({
            type: "data-sheetDelta",
            data: draftContent,
        });

        return draftContent;
    },

    onUpdateDocument: async ({ document, description, dataStream, model }) => {
        let draftContent = "";

        const { fullStream } = streamObject({
            model,
            system: createUpdatePrompt(document.content),
            prompt: description,
            schema: sheetSchema,
        });

        for await (const delta of fullStream) {
            if (delta.type === "object") {
                const { object } = delta;
                const { csv } = object;

                if (csv) {
                    dataStream.write({
                        type: "data-sheetDelta",
                        data: csv,
                    });
                    draftContent = csv;
                }
            }
        }

        return draftContent;
    },
});

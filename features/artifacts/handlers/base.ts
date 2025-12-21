/**
 * Document Handler Base
 * Ref: oldapp/lib/artifacts/server.ts
 *
 * Factory function for creating document streaming handlers.
 * Handles saving to database on completion.
 */
import "server-only";

import type { LanguageModel, UIMessageStreamWriter } from "ai";
import type { AppSession } from "@/lib/auth/types";
import { createContext } from "@/lib/data/base";
import { documentData } from "@/lib/data/documents";
import type { Document } from "@/lib/db/schema";
import type { ArtifactKind } from "../types";

/**
 * Props for creating a new document
 */
export type CreateDocumentCallbackProps = {
    id: string;
    title: string;
    dataStream: UIMessageStreamWriter;
    session: AppSession;
    chatId: string;
    model: LanguageModel;
};

/**
 * Props for updating an existing document
 */
export type UpdateDocumentCallbackProps = {
    document: Document;
    description: string;
    dataStream: UIMessageStreamWriter;
    session: AppSession;
    model: LanguageModel;
};

/**
 * Document handler interface
 */
export type DocumentHandler<T = ArtifactKind> = {
    kind: T;
    onCreateDocument: (args: CreateDocumentCallbackProps) => Promise<void>;
    onUpdateDocument: (args: UpdateDocumentCallbackProps) => Promise<void>;
};

/**
 * Configuration for creating a document handler
 */
export type DocumentHandlerConfig<T extends ArtifactKind> = {
    kind: T;
    onCreateDocument: (params: CreateDocumentCallbackProps) => Promise<string>;
    onUpdateDocument: (params: UpdateDocumentCallbackProps) => Promise<string>;
};

/**
 * Create a document handler with automatic database saving
 *
 * @param config Handler configuration with stream callbacks
 * @returns DocumentHandler with onCreateDocument and onUpdateDocument
 */
export function createDocumentHandler<T extends ArtifactKind>(
    config: DocumentHandlerConfig<T>
): DocumentHandler<T> {
    return {
        kind: config.kind,

        onCreateDocument: async (args: CreateDocumentCallbackProps) => {
            const draftContent = await config.onCreateDocument({
                id: args.id,
                title: args.title,
                dataStream: args.dataStream,
                session: args.session,
                chatId: args.chatId,
                model: args.model,
            });

            // Save to database if user is authenticated
            if (args.session?.user?.id) {
                const ctx = createContext(
                    args.session.user.id,
                    args.session.user.type
                );
                await documentData.save(
                    {
                        id: args.id,
                        title: args.title,
                        content: draftContent,
                        kind: config.kind,
                        chatId: args.chatId,
                    },
                    ctx
                );
            }
        },

        onUpdateDocument: async (args: UpdateDocumentCallbackProps) => {
            const draftContent = await config.onUpdateDocument({
                document: args.document,
                description: args.description,
                dataStream: args.dataStream,
                session: args.session,
                model: args.model,
            });

            // Save to database if user is authenticated
            if (args.session?.user?.id) {
                const ctx = createContext(
                    args.session.user.id,
                    args.session.user.type
                );
                await documentData.save(
                    {
                        id: args.document.id,
                        title: args.document.title,
                        content: draftContent,
                        kind: config.kind,
                        chatId: args.document.chatId!,
                    },
                    ctx
                );
            }
        },
    };
}

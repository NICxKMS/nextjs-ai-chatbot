import type { UIMessageStreamWriter } from "ai";
import type { Session } from "next-auth";
import { codeDocumentHandler } from "@/artifacts/code/server";
import { sheetDocumentHandler } from "@/artifacts/sheet/server";
import { textDocumentHandler } from "@/artifacts/text/server";
import type { ArtifactKind } from "@/components/artifact";
import { createContext } from "../data/base";
import { documentData } from "../data/document";
import type { Document } from "../db/schema";
import type { ChatMessage } from "../types";

export type SaveDocumentProps = {
	id: string;
	title: string;
	kind: ArtifactKind;
	content: string;
	userId: string;
	chatId: string;
};

export type CreateDocumentCallbackProps = {
	id: string;
	title: string;
	dataStream: UIMessageStreamWriter<ChatMessage>;
	session: Session;
	chatId: string;
};

export type UpdateDocumentCallbackProps = {
	document: Document;
	description: string;
	dataStream: UIMessageStreamWriter<ChatMessage>;
	session: Session;
};

export type DocumentHandler<T = ArtifactKind> = {
	kind: T;
	onCreateDocument: (args: CreateDocumentCallbackProps) => Promise<void>;
	onUpdateDocument: (args: UpdateDocumentCallbackProps) => Promise<void>;
};

export function createDocumentHandler<T extends ArtifactKind>(config: {
	kind: T;
	onCreateDocument: (params: CreateDocumentCallbackProps) => Promise<string>;
	onUpdateDocument: (params: UpdateDocumentCallbackProps) => Promise<string>;
}): DocumentHandler<T> {
	return {
		kind: config.kind,
		onCreateDocument: async (args: CreateDocumentCallbackProps) => {
			const draftContent = await config.onCreateDocument({
				id: args.id,
				title: args.title,
				dataStream: args.dataStream,
				session: args.session,
				chatId: args.chatId,
			});

			if (args.session?.user?.id) {
				const ctx = createContext(args.session);
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

			return;
		},
		onUpdateDocument: async (args: UpdateDocumentCallbackProps) => {
			const draftContent = await config.onUpdateDocument({
				document: args.document,
				description: args.description,
				dataStream: args.dataStream,
				session: args.session,
			});

			if (args.session?.user?.id) {
				const ctx = createContext(args.session);
				await documentData.save(
					{
						id: args.document.id,
						title: args.document.title,
						content: draftContent,
						kind: config.kind,
						chatId: args.document.chatId,
					},
					ctx
				);
			}

			return;
		},
	};
}

/*
 * Use this array to define the document handlers for each artifact kind.
 */
export const documentHandlersByArtifactKind: DocumentHandler[] = [
	textDocumentHandler,
	codeDocumentHandler,
	sheetDocumentHandler,
];

export const artifactKinds = ["text", "code", "sheet"] as const;

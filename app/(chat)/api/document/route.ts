import { getAppSession } from "@/lib/auth/session";
import type { ArtifactKind } from "@/components/artifact";
import { createContext } from "@/lib/data/base";
import { documentData } from "@/lib/data/document";
import { ChatSDKError } from "@/lib/errors";

// Optimize for Vercel Fluid Compute
export const maxDuration = 10;

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const id = searchParams.get("id");

	if (!id) {
		return new ChatSDKError(
			"bad_request:api:missing_id",
			"Parameter id is missing"
		).toResponse();
	}

	const session = await getAppSession();

	if (!session?.user) {
		return new ChatSDKError(
			"unauthorized:document:missing_session"
		).toResponse();
	}

	const ctx = createContext(session);
	const documents = await documentData.getAll(id, ctx);

	const [document] = documents;

	if (!document) {
		return new ChatSDKError("not_found:document").toResponse();
	}

	if (document.userId !== session.user.id) {
		return new ChatSDKError("forbidden:document").toResponse();
	}

	return Response.json(documents, { status: 200 });
}

export async function POST(request: Request) {
	const { searchParams } = new URL(request.url);
	const id = searchParams.get("id");

	if (!id) {
		return new ChatSDKError(
			"bad_request:api:missing_id",
			"Parameter id is required."
		).toResponse();
	}

	const sessionPromise = getAppSession();
	const bodyPromise = request.json();

	const session = await sessionPromise;

	if (!session?.user) {
		return new ChatSDKError(
			"unauthorized:document:missing_session"
		).toResponse();
	}

	const ctx = createContext(session);

	const {
		content,
		title,
		kind,
	}: { content: string; title: string; kind: ArtifactKind } =
		await bodyPromise;

	const documents = await documentData.getAll(id, ctx);

	let chatId: string | null = null;

	if (documents.length > 0) {
		const mostRecent = documents.at(-1);
		if (!mostRecent) {
			return new ChatSDKError("not_found:document").toResponse();
		}

		if (mostRecent.userId !== session.user.id) {
			return new ChatSDKError("forbidden:document").toResponse();
		}

		chatId = mostRecent.chatId;
	} else {
		return new ChatSDKError(
			"bad_request:document:no_chat_context",
			"Cannot save document without existing chat context"
		).toResponse();
	}

	const document = await documentData.save(
		{
		id,
		content,
		title,
		kind,
		chatId,
		},
		ctx
	);

	return Response.json(document, { status: 200 });
}

export async function DELETE(request: Request) {
	const { searchParams } = new URL(request.url);
	const id = searchParams.get("id");
	const timestamp = searchParams.get("timestamp");

	if (!id) {
		return new ChatSDKError(
			"bad_request:api:missing_id",
			"Parameter id is required."
		).toResponse();
	}

	if (!timestamp) {
		return new ChatSDKError(
			"bad_request:api:missing_timestamp",
			"Parameter timestamp is required."
		).toResponse();
	}

	const session = await getAppSession();

	if (!session?.user) {
		return new ChatSDKError(
			"unauthorized:document:missing_session"
		).toResponse();
	}

	const ctx = createContext(session);
	const documents = await documentData.getAll(id, ctx);

	const [document] = documents;

	if (!document) {
		return new ChatSDKError("not_found:document").toResponse();
	}

	if (document.userId !== session.user.id) {
		return new ChatSDKError("forbidden:document").toResponse();
	}

	const documentsDeleted = await documentData.deleteAfterTimestamp(
		id,
		new Date(timestamp),
		ctx
	);

	return Response.json(documentsDeleted, { status: 200 });
}

import { auth } from "@/app/(auth)/auth";
import type { ArtifactKind } from "@/components/artifact";
import {
	deleteDocumentsByIdAfterTimestamp,
	getDocumentsById,
	saveDocument,
} from "@/lib/db/queries";
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

	const session = await auth();

	if (!session?.user) {
		return new ChatSDKError(
			"unauthorized:document:missing_session"
		).toResponse();
	}

	const isGuest = session.user.type === "guest";
	const documents = await getDocumentsById({
		id,
		userId: session.user.id,
		isGuest,
	});

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

	const sessionPromise = auth();
	const bodyPromise = request.json();

	const session = await sessionPromise;

	if (!session?.user) {
		return new ChatSDKError(
			"unauthorized:document:missing_session"
		).toResponse();
	}

	const isGuest = session.user.type === "guest";

	const {
		content,
		title,
		kind,
	}: { content: string; title: string; kind: ArtifactKind } =
		await bodyPromise;

	const documents = await getDocumentsById({
		id,
		userId: session.user.id,
		isGuest,
	});

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

	const document = await saveDocument({
		id,
		content,
		title,
		kind,
		userId: session.user.id,
		chatId,
		isGuest,
	});

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

	const session = await auth();

	if (!session?.user) {
		return new ChatSDKError(
			"unauthorized:document:missing_session"
		).toResponse();
	}

	const isGuest = session.user.type === "guest";
	const documents = await getDocumentsById({
		id,
		userId: session.user.id,
		isGuest,
	});

	const [document] = documents;

	if (!document) {
		return new ChatSDKError("not_found:document").toResponse();
	}

	if (document.userId !== session.user.id) {
		return new ChatSDKError("forbidden:document").toResponse();
	}

	const documentsDeleted = await deleteDocumentsByIdAfterTimestamp({
		id,
		timestamp: new Date(timestamp),
		userId: session.user.id,
		isGuest,
	});

	return Response.json(documentsDeleted, { status: 200 });
}

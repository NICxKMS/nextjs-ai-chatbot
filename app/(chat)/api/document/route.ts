import { auth } from "@/app/(auth)/auth";
import type { ArtifactKind } from "@/components/artifact";
import {
	deleteDocumentsByIdAfterTimestamp,
	getDocumentsById,
	saveDocument,
} from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const id = searchParams.get("id");

	if (!id) {
		return new ChatSDKError(
			"bad_request:api",
			"Parameter id is missing"
		).toResponse();
	}

	const documentsPromise = getDocumentsById({ id });
	const session = await auth();

	if (!session?.user) {
		return new ChatSDKError("unauthorized:document").toResponse();
	}

	const documents = await documentsPromise;

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
			"bad_request:api",
			"Parameter id is required."
		).toResponse();
	}

	const sessionPromise = auth();
	const bodyPromise = request.json();
	const documentsPromise = getDocumentsById({ id });

	const session = await sessionPromise;
	const {
		content,
		title,
		kind,
	}: { content: string; title: string; kind: ArtifactKind } =
		await bodyPromise;
	const documents = await documentsPromise;

	if (!session?.user) {
		return new ChatSDKError("not_found:document").toResponse();
	}

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
			"bad_request:document",
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
	});

	return Response.json(document, { status: 200 });
}

export async function DELETE(request: Request) {
	const { searchParams } = new URL(request.url);
	const id = searchParams.get("id");
	const timestamp = searchParams.get("timestamp");

	if (!id) {
		return new ChatSDKError(
			"bad_request:api",
			"Parameter id is required."
		).toResponse();
	}

	if (!timestamp) {
		return new ChatSDKError(
			"bad_request:api",
			"Parameter timestamp is required."
		).toResponse();
	}

	const session = await auth();

	if (!session?.user) {
		return new ChatSDKError("unauthorized:document").toResponse();
	}

	const documents = await getDocumentsById({ id });

	const [document] = documents;

	if (document.userId !== session.user.id) {
		return new ChatSDKError("forbidden:document").toResponse();
	}

	const documentsDeleted = await deleteDocumentsByIdAfterTimestamp({
		id,
		timestamp: new Date(timestamp),
	});

	return Response.json(documentsDeleted, { status: 200 });
}

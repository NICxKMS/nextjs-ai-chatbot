import { createUIMessageStream, JsonToSseTransformStream } from "ai";
import { differenceInSeconds } from "date-fns";
import { getAppSession } from "@/lib/auth/session";
import { createContext } from "@/lib/data/base";
import { chatData } from "@/lib/data/chat";
import { ChatSDKError } from "@/lib/errors";
import type { ChatMessage } from "@/lib/types";

export async function GET(
	_: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	const { id: chatId } = await params;

	if (!chatId) {
		return new ChatSDKError("bad_request:api:missing_chat_id").toResponse();
	}

	const session = await getAppSession();

	if (!session?.user) {
		return new ChatSDKError(
			"unauthorized:chat:missing_session"
		).toResponse();
	}

	const ctx = createContext(session);

	// Fetch chat with messages in a single optimized cache operation
	// Guest users: cache-only (no database fallback)
	// Authenticated users: cache first, then database fallback
	let result: Awaited<ReturnType<typeof chatData.getWithMessages>>;

	try {
		result = await chatData.getWithMessages(chatId, ctx);
	} catch {
		return new ChatSDKError("not_found:chat").toResponse();
	}

	if (!result) {
		return new ChatSDKError("not_found:chat").toResponse();
	}

	const { chat, messages } = result;

	if (chat.visibility === "private" && chat.userId !== session.user.id) {
		return new ChatSDKError("forbidden:chat:owner_mismatch").toResponse();
	}

	// Since resumable streams are removed, we just return the most recent message if it's recent
	const mostRecentMessage = messages.at(-1);

	const emptyDataStream = createUIMessageStream<ChatMessage>({
		// biome-ignore lint/suspicious/noEmptyBlockStatements: "Needs to exist"
		execute: () => {},
	});

	if (!mostRecentMessage) {
		return new Response(
			emptyDataStream.pipeThrough(new JsonToSseTransformStream()),
			{ status: 200 }
		);
	}

	if (mostRecentMessage.role !== "assistant") {
		return new Response(
			emptyDataStream.pipeThrough(new JsonToSseTransformStream()),
			{ status: 200 }
		);
	}

	const messageCreatedAt = new Date(mostRecentMessage.createdAt);
	const resumeRequestedAt = new Date();

	if (differenceInSeconds(resumeRequestedAt, messageCreatedAt) > 15) {
		return new Response(
			emptyDataStream.pipeThrough(new JsonToSseTransformStream()),
			{ status: 200 }
		);
	}

	const restoredStream = createUIMessageStream<ChatMessage>({
		execute: ({ writer }) => {
			writer.write({
				type: "data-appendMessage",
				data: JSON.stringify(mostRecentMessage),
				transient: true,
			});
		},
	});

	return new Response(
		restoredStream.pipeThrough(new JsonToSseTransformStream()),
		{ status: 200 }
	);
}

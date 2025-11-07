import { auth } from "@/app/(auth)/auth";
import {
	getChatById,
	getVotesByChatIdAndUserId,
	voteMessage,
} from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";

// Optimize for Vercel Fluid Compute
export const maxDuration = 10;

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const chatId = searchParams.get("chatId");

	if (!chatId) {
		return new ChatSDKError(
			"bad_request:api:missing_chat_id",
			"Parameter chatId is required."
		).toResponse();
	}

	const chatPromise = getChatById({ id: chatId });
	const session = await auth();

	if (!session?.user) {
		return new ChatSDKError(
			"unauthorized:vote:missing_session"
		).toResponse();
	}

	// Guest users cannot vote (requires database persistence)
	if (session.user.type === "guest") {
		return new ChatSDKError(
			"forbidden:vote:guest_cannot_vote",
			"Guest users cannot vote on messages"
		).toResponse();
	}

	const chat = await chatPromise;

	if (!chat) {
		return new ChatSDKError("not_found:chat").toResponse();
	}

	if (chat.userId !== session.user.id) {
		return new ChatSDKError(
			"forbidden:vote:owner_mismatch"
		).toResponse();
	}

	const votes = await getVotesByChatIdAndUserId({
		chatId,
		userId: session.user.id,
	});

	// Return minimal UI shape
	const uiVotes = votes.map((v) => ({
		chatId: v.chatId,
		messageId: v.messageId,
		isUpvoted: v.isUpvoted,
	}));

	return Response.json(uiVotes, { status: 200 });
}

export async function PATCH(request: Request) {
	const bodyPromise: Promise<{
		chatId: string;
		messageId: string;
		type: "up" | "down";
	}> = request.json();
	const sessionPromise = auth();
	const { chatId, messageId, type } = await bodyPromise;

	if (!chatId || !messageId || !type) {
		return new ChatSDKError(
			"bad_request:api:missing_vote_params",
			"Parameters chatId, messageId, and type are required."
		).toResponse();
	}

	const [session, chat] = await Promise.all([
		sessionPromise,
		getChatById({ id: chatId }),
	]);

	if (!session?.user) {
		return new ChatSDKError(
			"unauthorized:vote:missing_session"
		).toResponse();
	}

	// Guest users cannot vote (requires database persistence)
	if (session.user.type === "guest") {
		return new ChatSDKError(
			"forbidden:vote:guest_cannot_vote",
			"Guest users cannot vote on messages"
		).toResponse();
	}

	if (!chat) {
		return new ChatSDKError("not_found:vote").toResponse();
	}

	if (chat.userId !== session.user.id) {
		return new ChatSDKError(
			"forbidden:vote:owner_mismatch"
		).toResponse();
	}

	await voteMessage({
		chatId,
		messageId,
		type,
		userId: session.user.id,
	});

	return new Response("Message voted", { status: 200 });
}

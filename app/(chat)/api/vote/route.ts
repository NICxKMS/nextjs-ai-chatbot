import { getAppSession } from "@/lib/auth/session";
import { createContext } from "@/lib/data/base";
import { chatData } from "@/lib/data/chat";
import { voteMessage } from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";

// Optimize for Vercel Fluid Compute
export const maxDuration = 10;

export async function PATCH(request: Request) {
	const bodyPromise: Promise<{
		chatId: string;
		messageId: string;
		type: "up" | "down";
	}> = request.json();
	const sessionPromise = getAppSession();
	const { chatId, messageId, type } = await bodyPromise;

	if (!chatId || !messageId || !type) {
		return new ChatSDKError(
			"bad_request:api:missing_vote_params",
			"Parameters chatId, messageId, and type are required."
		).toResponse();
	}

	const session = await sessionPromise;

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

	const ctx = createContext(session);
	const chat = await chatData.get(chatId, ctx, { warmCache: false });

	if (!chat) {
		return new ChatSDKError("not_found:vote").toResponse();
	}

	if (chat.userId !== session.user.id) {
		return new ChatSDKError("forbidden:vote:owner_mismatch").toResponse();
	}

	await voteMessage({
		chatId,
		messageId,
		type,
		userId: session.user.id,
	});

	return new Response("Message voted", { status: 200 });
}

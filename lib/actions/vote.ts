"use server";

import { revalidatePath } from "next/cache";
import { getAppSession } from "@/lib/auth/session";
import { voteMessage } from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";

/**
 * Server Action for voting on messages.
 *
 * Benefits over API route:
 * - Automatic CSRF protection
 * - No need for client to handle response parsing
 * - Integrated with Next.js caching
 */
export async function voteOnMessage(
	chatId: string,
	messageId: string,
	type: "up" | "down"
) {
	const session = await getAppSession();

	if (!session?.user) {
		throw new ChatSDKError("unauthorized:vote:missing_session");
	}

	if (session.user.type === "guest") {
		throw new ChatSDKError("forbidden:vote:guest_cannot_vote");
	}

	await voteMessage({
		chatId,
		messageId,
		type,
		userId: session.user.id,
	});

	// Revalidate the chat page to reflect the new vote
	revalidatePath(`/chat/${chatId}`);

	return { success: true };
}

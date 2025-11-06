import type { NextRequest } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { deleteAllGuestChatsByUserId, getGuestChatsByUserId } from "@/lib/cache/guest-queries";
import { deleteAllChatsByUserId, getChatsByUserId } from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";

// Optimize for Vercel Fluid Compute
export const maxDuration = 10;

export async function GET(request: NextRequest) {
	const { searchParams } = request.nextUrl;

	const limit = Number.parseInt(searchParams.get("limit") || "10", 10);
	const startingAfter = searchParams.get("starting_after");
	const endingBefore = searchParams.get("ending_before");

	if (startingAfter && endingBefore) {
		return new ChatSDKError(
			"bad_request:api",
			"Only one of starting_after or ending_before can be provided."
		).toResponse();
	}

	const session = await auth();

	if (!session?.user) {
		return new ChatSDKError("unauthorized:chat").toResponse();
	}

	// Check if user is guest - fetch from cache instead of DB
	const isGuest = session.user.type === "guest";

	const chats = isGuest
		? await getGuestChatsByUserId({
				id: session.user.id,
				limit,
				startingAfter,
				endingBefore,
			})
		: await getChatsByUserId({
				id: session.user.id,
				limit,
				startingAfter,
				endingBefore,
			});

	return Response.json(chats);
}

export async function DELETE() {
	const session = await auth();

	if (!session?.user) {
		return new ChatSDKError("unauthorized:chat").toResponse();
	}

	// Check if user is guest - delete from cache instead of DB
	const isGuest = session.user.type === "guest";

	const result = isGuest
		? await deleteAllGuestChatsByUserId({ userId: session.user.id })
		: await deleteAllChatsByUserId({ userId: session.user.id });

	return Response.json(result, { status: 200 });
}

import { cacheLife, cacheTag, revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { deleteAllChatsByUserId, getChatsByUserId } from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";

async function getCachedChatsByUserId({
	id,
	limit,
	startingAfter,
	endingBefore,
}: Parameters<typeof getChatsByUserId>[0]) {
	"use cache";

	cacheLife("minutes");
	cacheTag(`history:user:${id}`);

	return await getChatsByUserId({
		id,
		limit,
		startingAfter,
		endingBefore,
	});
}

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

	const cachedChats = await getCachedChatsByUserId({
		id: session.user.id,
		limit,
		startingAfter,
		endingBefore,
	});

	return Response.json(cachedChats);
}

export async function DELETE() {
	const session = await auth();

	if (!session?.user) {
		return new ChatSDKError("unauthorized:chat").toResponse();
	}

	const result = await deleteAllChatsByUserId({ userId: session.user.id });

	revalidateTag(`history:user:${session.user.id}`, "minutes");

	return Response.json(result, { status: 200 });
}

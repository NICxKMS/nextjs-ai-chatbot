import type { NextRequest } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { createContext } from "@/lib/data/base";
import { chatData } from "@/lib/data/chat";
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
			"bad_request:api:conflicting_pagination_params",
			"Only one of starting_after or ending_before can be provided."
		).toResponse();
	}

	const session = await auth();

	if (!session?.user) {
		return new ChatSDKError(
			"unauthorized:chat:missing_session"
		).toResponse();
	}

	const ctx = createContext(session);

	const result = await chatData.list(
		{
				limit,
				startingAfter,
				endingBefore,
		},
		ctx
	);

	return Response.json({
		chats: result.items,
		hasMore: result.hasMore,
	});
}

export async function DELETE() {
	const session = await auth();

	if (!session?.user) {
		return new ChatSDKError(
			"unauthorized:chat:missing_session"
		).toResponse();
	}

	const ctx = createContext(session);

	const result = await chatData.deleteAll(ctx);

	return Response.json(result, { status: 200 });
}

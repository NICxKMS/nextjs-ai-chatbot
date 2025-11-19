import { getAppSession } from "@/lib/auth/session";
import { getSuggestionsByDocumentId } from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";

// Optimize for Vercel Fluid Compute
export const maxDuration = 10;

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const documentId = searchParams.get("documentId");

	if (!documentId) {
		return new ChatSDKError(
			"bad_request:api:missing_document_id",
			"Parameter documentId is required."
		).toResponse();
	}

	const suggestionsPromise = getSuggestionsByDocumentId({
		documentId,
	});

	const session = await getAppSession();

	if (!session?.user) {
		return new ChatSDKError(
			"unauthorized:suggestions:missing_session"
		).toResponse();
	}

	// Authenticated users are mirrored from Supabase auth.users into the local
	// User table via a database trigger, so we don't need an explicit
	// "ensure user exists" check here.

	// Guest users cannot retrieve suggestions (not persisted in database)
	if (session.user.type === "guest") {
		return Response.json([], { status: 200 });
	}

	const suggestions = await suggestionsPromise;

	const [suggestion] = suggestions;

	if (!suggestion) {
		return Response.json([], { status: 200 });
	}

	if (suggestion.userId !== session.user.id) {
		return new ChatSDKError("forbidden:api:owner_mismatch").toResponse();
	}

	return Response.json(suggestions, { status: 200 });
}

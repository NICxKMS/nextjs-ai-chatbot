import "server-only";

import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { ChatSDKError, toDatabaseError } from "../errors";
import {
	message,
	type Suggestion,
	suggestion,
	type User,
	user,
	vote,
} from "./schema";

// Optionally, if not using email/pass login, you can
// use the Drizzle adapter for Auth.js / NextAuth
// https://authjs.dev/reference/adapter/drizzle

// Environment-aware PostgreSQL pool configuration
if (!process.env.DATABASE_URL) {
	throw new ChatSDKError(
		"bad_request:database:missing_postgres_url",
		"DATABASE_URL environment variable is not set"
	);
}

// Optimize pool size based on deployment environment
const getPoolConfig = () => {
	const isProduction = process.env.NODE_ENV === "production";
	const isVercelFluid = process.env.VERCEL_FLUID === "1";

	if (isVercelFluid) {
		// Vercel Fluid Compute: optimize for rapid scaling
		return { max: 5, idle_timeout: 10 };
	}
	if (isProduction) {
		// Traditional serverless: moderate pooling
		return { max: 10, idle_timeout: 20 };
	}
	// Development: minimal pooling
	return { max: 3, idle_timeout: 30 };
};

const poolConfig = getPoolConfig();
const client = postgres(process.env.DATABASE_URL, {
	...poolConfig,
	connect_timeout: 10,
	prepare: false, // Better for serverless environments
});
export const db = drizzle(client);

// =============================================================================
// USER FUNCTIONS
// =============================================================================

export async function getUser(email: string): Promise<User[]> {
	try {
		return await db
			.select()
			.from(user)
			.where(eq(user.email, email.toLowerCase()));
	} catch (error) {
		throw toDatabaseError(
			"get_user_by_email",
			error,
			"Failed to get user by email"
		);
	}
}

export async function getUserById(id: string): Promise<User[]> {
	try {
		return await db.select().from(user).where(eq(user.id, id));
	} catch (error) {
		throw toDatabaseError(
			"get_user_by_id",
			error,
			"Failed to get user by id"
		);
	}
}

// =============================================================================
// MESSAGE FUNCTIONS
// =============================================================================

export async function getMessageById({ id }: { id: string }) {
	try {
		return await db.select().from(message).where(eq(message.id, id));
	} catch (error) {
		throw toDatabaseError(
			"get_message_by_id",
			error,
			"Failed to get message by id"
		);
	}
}

// =============================================================================
// VOTE FUNCTIONS
// =============================================================================

export async function voteMessage({
	chatId,
	messageId,
	type,
	userId,
}: {
	chatId: string;
	messageId: string;
	type: "up" | "down";
	userId: string;
}) {
	try {
		const [existingVote] = await db
			.select()
			.from(vote)
			.where(
				and(
					eq(vote.chatId, chatId),
					eq(vote.messageId, messageId),
					eq(vote.userId, userId)
				)
			);

		if (existingVote) {
			return await db
				.update(vote)
				.set({ isUpvoted: type === "up" })
				.where(
					and(
						eq(vote.chatId, chatId),
						eq(vote.messageId, messageId),
						eq(vote.userId, userId)
					)
				);
		}
		return await db.insert(vote).values({
			chatId,
			messageId,
			userId,
			isUpvoted: type === "up",
		});
	} catch (error) {
		throw toDatabaseError("vote_message", error, "Failed to vote message");
	}
}

export async function getVotesByChatId({ id }: { id: string }) {
	try {
		return await db.select().from(vote).where(eq(vote.chatId, id));
	} catch (error) {
		throw toDatabaseError(
			"get_votes_by_chat_id",
			error,
			"Failed to get votes by chat id"
		);
	}
}

export async function getVotesByChatIdAndUserId({
	chatId,
	userId,
}: {
	chatId: string;
	userId: string;
}) {
	try {
		return await db
			.select()
			.from(vote)
			.where(and(eq(vote.chatId, chatId), eq(vote.userId, userId)));
	} catch (error) {
		throw toDatabaseError(
			"get_votes_by_chat_id_and_user_id",
			error,
			"Failed to get votes by chat id and user id"
		);
	}
}

// =============================================================================
// SUGGESTION FUNCTIONS
// =============================================================================

export async function saveSuggestions({
	suggestions,
}: {
	suggestions: Suggestion[];
}) {
	try {
		return await db.insert(suggestion).values(suggestions);
	} catch (error) {
		throw toDatabaseError(
			"save_suggestions",
			error,
			"Failed to save suggestions"
		);
	}
}

export async function getSuggestionsByDocumentId({
	documentId,
}: {
	documentId: string;
}) {
	try {
		return await db
			.select()
			.from(suggestion)
			.where(and(eq(suggestion.documentId, documentId)));
	} catch (error) {
		throw toDatabaseError(
			"get_suggestions_by_document_id",
			error,
			"Failed to get suggestions by document id"
		);
	}
}

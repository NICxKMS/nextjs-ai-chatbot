import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ChatSDKError } from "@/lib/errors";
import { getSupabaseSessionFromCookies } from "@/lib/auth/session";

export async function POST(request: Request) {
	try {
		const { accessToken } = (await request.json()) as {
			accessToken?: string;
		};

		if (!accessToken) {
			return new ChatSDKError(
				"bad_request:api:invalid_json",
				"Missing access token"
			).toResponse();
		}

		const cookieStore = await cookies();

		cookieStore.set("sb-access-token", accessToken, {
			httpOnly: true,
			secure: true,
			path: "/",
			sameSite: "lax",
		});

		const session = await getSupabaseSessionFromCookies();

		return NextResponse.json(
			{
				user: session?.user ?? null,
			},
			{ status: 200 }
		);
	} catch {
		return new ChatSDKError(
			"bad_request:api:invalid_json",
			"Failed to process auth exchange"
		).toResponse();
	}
}



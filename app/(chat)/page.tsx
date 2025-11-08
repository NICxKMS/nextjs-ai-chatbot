import { redirect } from "next/navigation";
import { Chat } from "@/components/chat";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { listChatModels } from "@/lib/ai/model-registry";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { getUserById } from "@/lib/db/queries";
import { generateUUID } from "@/lib/utils";
import { auth } from "../(auth)/auth";

export default async function Page() {
	const session = await auth();

	if (!session) {
		redirect("/api/auth/guest");
	}

	// If session exists but underlying DB user is missing, convert to guest and do a full reload
	if (session.user?.id) {
		try {
			const users = await getUserById(session.user.id);
			if (users.length === 0) {
				redirect(
					`/api/auth/guest?redirectUrl=${encodeURIComponent(
						"/?notice=user_not_found"
					)}`
				);
			}
		} catch (_error) {
			// Database error - redirect to home with error notice
			redirect(
				`/api/auth/guest?redirectUrl=${encodeURIComponent(
					"/?notice=user_not_found"
				)}`
			);
		}
	}

	const id = generateUUID();
	const availableModels = listChatModels();

	return (
		<>
			<Chat
				availableModels={availableModels}
				id={id}
				initialChatModel={DEFAULT_CHAT_MODEL}
				initialMessages={[]}
				initialVisibilityType="private"
				isReadonly={false}
				key={id}
			/>
			<DataStreamHandler />
		</>
	);
}

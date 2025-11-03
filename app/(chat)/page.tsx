import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Chat } from "@/components/chat";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { DataStreamProvider } from "@/components/data-stream-provider";
import { listChatModels } from "@/lib/ai/model-registry";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { isBlobStorageConfigured } from "@/lib/constants";
import { generateUUID } from "@/lib/utils";
import { auth } from "../(auth)/auth";

export default async function Page() {
	const session = await auth();

	if (!session) {
		redirect("/api/auth/guest");
	}

	const id = generateUUID();
	const availableModels = listChatModels();

	const cookieStore = await cookies();
	const modelIdFromCookie = cookieStore.get("chat-model");

	if (!modelIdFromCookie) {
		return (
			<DataStreamProvider>
				<Chat
					autoResume={false}
					availableModels={availableModels}
					id={id}
					initialChatModel={DEFAULT_CHAT_MODEL}
					initialMessages={[]}
					initialVisibilityType="private"
					isReadonly={false}
					key={id}
					uploadsEnabled={isBlobStorageConfigured}
				/>
				<DataStreamHandler />
			</DataStreamProvider>
		);
	}

	return (
		<DataStreamProvider>
			<Chat
				autoResume={false}
				availableModels={availableModels}
				id={id}
				initialChatModel={modelIdFromCookie.value}
				initialMessages={[]}
				initialVisibilityType="private"
				isReadonly={false}
				key={id}
				uploadsEnabled={isBlobStorageConfigured}
			/>
			<DataStreamHandler />
		</DataStreamProvider>
	);
}

import { cookies } from "next/headers";
import { Chat } from "@/components/chat";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { listChatModels } from "@/lib/ai/model-registry";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { generateUUID } from "@/lib/utils";

export default async function Page() {
	// Access request data before using random values to satisfy Next.js
	// cacheComponents constraints for server components.
	await cookies();

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
				initialVotes={[]}
				isReadonly={false}
				key={id}
			/>
			<DataStreamHandler />
		</>
	);
}

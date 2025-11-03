"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import { useEffect, useRef } from "react";
import { useDataStream } from "@/components/data-stream-provider";
import type { ChatMessage } from "@/lib/types";

export type UseAutoResumeParams = {
	autoResume: boolean;
	initialMessages: ChatMessage[];
	resumeStream: UseChatHelpers<ChatMessage>["resumeStream"];
	setMessages: UseChatHelpers<ChatMessage>["setMessages"];
};

export function useAutoResume({
	autoResume,
	initialMessages,
	resumeStream,
	setMessages,
}: UseAutoResumeParams) {
	const { getDataStream, version } = useDataStream();
	const lastHandledVersion = useRef(-1);
	const lastProcessedIndex = useRef(-1);

	useEffect(() => {
		if (!autoResume) {
			return;
		}

		const mostRecentMessage = initialMessages.at(-1);

		if (mostRecentMessage?.role === "user") {
			resumeStream();
		}

		// we intentionally run this once
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [autoResume, initialMessages.at, resumeStream]);

	useEffect(() => {
		if (version === lastHandledVersion.current) {
			return;
		}
		lastHandledVersion.current = version;

		const dataStream = getDataStream();

		if (dataStream.length === 0) {
			lastProcessedIndex.current = -1;
			return;
		}

		const newParts = dataStream.slice(lastProcessedIndex.current + 1);
		lastProcessedIndex.current = dataStream.length - 1;

		for (const part of newParts) {
			if (part.type === "data-appendMessage") {
				const message = JSON.parse(part.data);
				setMessages((currentMessages) => {
					const alreadyExists = currentMessages.some(
						(existingMessage) => existingMessage.id === message.id
					);

					if (alreadyExists) {
						return currentMessages;
					}

					return [...currentMessages, message];
				});
			}
		}
	}, [getDataStream, version, setMessages]);
}

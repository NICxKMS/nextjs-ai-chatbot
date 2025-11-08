"use client";

import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useState,
} from "react";
import { ChatSDKError } from "@/lib/errors";

type OptimisticChat = {
	id: string;
	title: string;
	createdAt: Date;
};

type OptimisticChatsContextType = {
	optimisticChats: OptimisticChat[];
	addOptimisticChat: (chatId: string) => void;
	updateOptimisticChatTitle: (chatId: string, title: string) => void;
	removeOptimisticChat: (chatId: string) => void;
};

const OptimisticChatsContext = createContext<OptimisticChatsContextType | null>(
	null
);

export function OptimisticChatsProvider({ children }: { children: ReactNode }) {
	const [optimisticChats, setOptimisticChats] = useState<OptimisticChat[]>(
		[]
	);

	const addOptimisticChat = useCallback((chatId: string) => {
		setOptimisticChats((prev) => {
			// Don't add duplicate
			if (prev.some((chat) => chat.id === chatId)) {
				return prev;
			}
			return [
				{
					id: chatId,
					title: "Generating title...",
					createdAt: new Date(),
				},
				...prev,
			];
		});
	}, []);

	const updateOptimisticChatTitle = useCallback(
		(chatId: string, title: string) => {
			setOptimisticChats((prev) =>
				prev.map((chat) =>
					chat.id === chatId ? { ...chat, title } : chat
				)
			);
		},
		[]
	);

	const removeOptimisticChat = useCallback((chatId: string) => {
		setOptimisticChats((prev) => prev.filter((chat) => chat.id !== chatId));
	}, []);

	return (
		<OptimisticChatsContext.Provider
			value={{
				optimisticChats,
				addOptimisticChat,
				updateOptimisticChatTitle,
				removeOptimisticChat,
			}}
		>
			{children}
		</OptimisticChatsContext.Provider>
	);
}

export function useOptimisticChats() {
	const context = useContext(OptimisticChatsContext);
	if (!context) {
		throw new ChatSDKError(
			"bad_request:ui:useOptimisticChats_outside_provider"
		);
	}
	return context;
}

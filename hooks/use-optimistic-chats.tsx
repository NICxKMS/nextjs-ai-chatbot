"use client";

import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useState,
} from "react";

type OptimisticChat = {
	id: string;
	title: string;
	createdAt: Date;
};

type OptimisticChatsContextType = {
	optimisticChats: OptimisticChat[];
	addOptimisticChat: (chatId: string) => void;
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

	const removeOptimisticChat = useCallback((chatId: string) => {
		setOptimisticChats((prev) => prev.filter((chat) => chat.id !== chatId));
	}, []);

	return (
		<OptimisticChatsContext.Provider
			value={{ optimisticChats, addOptimisticChat, removeOptimisticChat }}
		>
			{children}
		</OptimisticChatsContext.Provider>
	);
}

export function useOptimisticChats() {
	const context = useContext(OptimisticChatsContext);
	if (!context) {
		throw new Error(
			"useOptimisticChats must be used within OptimisticChatsProvider"
		);
	}
	return context;
}

"use client";

import { motion } from "framer-motion";
import { memo } from "react";
import { Button } from "../ui/button";
import type { SuggestedActionsProps } from "./types";

const DEFAULT_SUGGESTIONS = [
    "What are the advantages of using Next.js?",
    "Write code to demonstrate Dijkstra's algorithm",
    "Help me write an essay about Silicon Valley",
    "What is the weather in San Francisco?",
];

function PureSuggestedActions({
    chatId,
    sendMessage,
    suggestions = DEFAULT_SUGGESTIONS,
}: SuggestedActionsProps & { suggestions?: string[] }) {
    const handleSuggestionClick = (suggestion: string) => {
        window.history.replaceState({}, "", `/chat/${chatId}`);
        sendMessage({
            role: "user",
            parts: [{ type: "text", text: suggestion }],
        });
    };

    return (
        <div
            className="grid w-full gap-2 sm:grid-cols-2"
            data-testid="suggested-actions"
        >
            {suggestions.map((suggestion, index) => (
                <motion.div
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    initial={{ opacity: 0, y: 20 }}
                    key={suggestion}
                    transition={{ delay: 0.05 * index }}
                >
                    <SuggestionButton
                        onClick={() => handleSuggestionClick(suggestion)}
                        suggestion={suggestion}
                    />
                </motion.div>
            ))}
        </div>
    );
}

type SuggestionButtonProps = {
    suggestion: string;
    onClick: () => void;
};

function SuggestionButton({ suggestion, onClick }: SuggestionButtonProps) {
    return (
        <Button
            className="h-auto w-full whitespace-normal p-3 text-left hover:bg-accent"
            onClick={onClick}
            variant="outline"
        >
            {suggestion}
        </Button>
    );
}

export const SuggestedActions = memo(
    PureSuggestedActions,
    (prevProps, nextProps) => {
        return prevProps.chatId === nextProps.chatId;
    }
);

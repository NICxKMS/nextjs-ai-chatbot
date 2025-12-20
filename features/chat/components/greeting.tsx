"use client";

import { motion } from "framer-motion";

export interface GreetingProps {
    username?: string;
}

const SUGGESTIONS = [
    "What can you help me with?",
    "Tell me about your capabilities",
    "How do I get started?",
];

export function Greeting({ username }: GreetingProps) {
    const displayName = username ? `, ${username}` : "";

    return (
        <div
            className="mx-auto flex size-full max-w-3xl flex-col items-center justify-center px-4 py-12"
            key="greeting"
        >
            <motion.h1
                animate={{ opacity: 1, y: 0 }}
                className="text-center font-semibold text-2xl md:text-3xl"
                initial={{ opacity: 0, y: 10 }}
                transition={{ delay: 0.1, duration: 0.4 }}
            >
                Hello{displayName}!
            </motion.h1>

            <motion.p
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 text-center text-muted-foreground text-lg md:text-xl"
                initial={{ opacity: 0, y: 10 }}
                transition={{ delay: 0.2, duration: 0.4 }}
            >
                How can I help you today?
            </motion.p>

            <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="mt-8 flex flex-wrap justify-center gap-2"
                initial={{ opacity: 0, y: 10 }}
                transition={{ delay: 0.3, duration: 0.4 }}
            >
                {SUGGESTIONS.map((suggestion) => (
                    <button
                        key={suggestion}
                        className="rounded-full border border-border bg-background px-4 py-2 text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground"
                        type="button"
                    >
                        {suggestion}
                    </button>
                ))}
            </motion.div>
        </div>
    );
}

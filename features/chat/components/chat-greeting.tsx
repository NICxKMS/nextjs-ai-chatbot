"use client";

import { motion } from "@/lib/motion";

export function ChatGreeting() {
    return (
        <div className="flex min-h-[120px] flex-col justify-center px-4 md:px-8">
            <motion.h1
                animate={{ opacity: 1, y: 0 }}
                className="font-semibold text-xl md:text-2xl"
                initial={{ opacity: 0, y: 20 }}
                transition={{ delay: 0.5, duration: 0.5 }}
            >
                Hello there!
            </motion.h1>
            <motion.p
                animate={{ opacity: 1, y: 0 }}
                className="text-xl text-zinc-500 md:text-2xl"
                initial={{ opacity: 0, y: 20 }}
                transition={{ delay: 0.6, duration: 0.5 }}
            >
                Ask me anything about coding, writing, or research.
            </motion.p>
        </div>
    );
}

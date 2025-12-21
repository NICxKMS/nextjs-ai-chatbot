'use client';

import { motion } from 'framer-motion';

export function ChatGreeting() {
  return (
    <div className="flex flex-col justify-center px-4 md:px-8 min-h-[120px]">
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="text-xl md:text-2xl font-semibold"
      >
        Hello there!
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="text-xl md:text-2xl text-zinc-500"
      >
        Ask me anything about coding, writing, or research.
      </motion.p>
    </div>
  );
}

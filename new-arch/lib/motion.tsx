"use client";

import { domAnimation, LazyMotion } from "framer-motion";
import type { ReactNode } from "react";

// biome-ignore lint/performance/noBarrelFile: Intentional re-export pattern for LazyMotion optimization
export { AnimatePresence, m as motion } from "framer-motion";

export function MotionProvider({ children }: { children: ReactNode }) {
    return (
        <LazyMotion features={domAnimation} strict>
            {children}
        </LazyMotion>
    );
}

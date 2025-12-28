"use client";

import { domAnimation, LazyMotion } from "framer-motion";
import type { ReactNode } from "react";

export { AnimatePresence, m as motion } from "framer-motion";

export function MotionProvider({ children }: { children: ReactNode }) {
    return (
        <LazyMotion features={domAnimation} strict>
            {children}
        </LazyMotion>
    );
}

"use client";

import { AnimatePresence, LazyMotion, domAnimation, m } from "framer-motion";
import type { ReactNode } from "react";

export function MotionProvider({ children }: { children: ReactNode }) {
    return (
        <LazyMotion features={domAnimation} strict>
            {children}
        </LazyMotion>
    );
}

export { AnimatePresence, m as motion };

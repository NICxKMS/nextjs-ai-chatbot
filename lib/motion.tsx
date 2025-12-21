"use client";

import { domAnimation, LazyMotion } from "framer-motion";

export {
    AnimatePresence,
    domAnimation,
    LazyMotion,
    m as motion,
    useMotionValue,
    useTransform,
} from "framer-motion";

import type { ReactNode } from "react";

export function MotionProvider({ children }: { children: ReactNode }) {
    return (
        <LazyMotion features={domAnimation} strict>
            {children}
        </LazyMotion>
    );
}

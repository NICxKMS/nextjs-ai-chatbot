"use client";

/**
 * Rate Limit Hook
 *
 * React hook for using a rate limiter with automatic cleanup.
 *
 * @module shared/hooks/use-rate-limit
 */

import { useCallback, useMemo, useRef, useState } from "react";
import {
    createRateLimiter,
    type RateLimitConfig,
    type RateLimitResult,
} from "@/lib/utils/rate-limit-client";

/**
 * React hook for using a rate limiter with automatic cleanup
 *
 * @param config - Rate limit configuration
 * @returns Rate limiter check function and state
 *
 * @example
 * ```tsx
 * function ChatInput() {
 *   const { checkLimit, remaining } = useRateLimit({
 *     maxRequests: 10,
 *     windowMs: 60000
 *   });
 *
 *   const handleSubmit = () => {
 *     const result = checkLimit();
 *     if (!result.allowed) {
 *       toast.error('Slow down! Too many messages.');
 *       return;
 *     }
 *     sendMessage();
 *   };
 * }
 * ```
 */
export function useRateLimit(config: RateLimitConfig) {
    const limiterRef = useRef(createRateLimiter(config));
    const [remaining, setRemaining] = useState(config.maxRequests);

    const checkLimit = useCallback((): RateLimitResult => {
        const result = limiterRef.current.check();
        setRemaining(result.remaining);
        return result;
    }, []);

    const resetLimit = useCallback(() => {
        limiterRef.current.reset();
        setRemaining(config.maxRequests);
    }, [config.maxRequests]);

    const peekLimit = useCallback(() => {
        return limiterRef.current.peek();
    }, []);

    return useMemo(
        () => ({
            checkLimit,
            resetLimit,
            peekLimit,
            remaining,
        }),
        [checkLimit, resetLimit, peekLimit, remaining]
    );
}

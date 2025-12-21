"use client";

/**
 * Reasoning Wrapper
 *
 * Thin wrapper around AI Element Reasoning component.
 * Re-exports all components and types for consistency with other wrappers.
 */

// Re-export everything from the base component
export {
    Reasoning,
    type ReasoningProps,
    ReasoningContent,
    type ReasoningContentProps,
    ReasoningTrigger,
    type ReasoningTriggerProps,
    useReasoning,
} from "@/components/ai-elements/reasoning";

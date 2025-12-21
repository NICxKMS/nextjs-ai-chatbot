"use client";

/**
 * Confirmation Wrapper
 *
 * Enhanced wrapper around AI Element Confirmation component.
 * Adds callbacks for approval workflows and convenience hooks.
 */

import { useCallback, useState } from "react";
import {
    Confirmation as BaseConfirmation,
    type ConfirmationProps as BaseConfirmationProps,
    ConfirmationAccepted,
    ConfirmationAction,
    ConfirmationActions,
    ConfirmationRejected,
    ConfirmationRequest,
    ConfirmationTitle,
} from "@/components/ai-elements/confirmation";
import type { ExtendedToolState } from "@/lib/types/ai-sdk";
import { cn } from "@/lib/utils/index";

// Re-export all base components and types
export {
    ConfirmationAccepted,
    type ConfirmationAcceptedProps,
    ConfirmationAction,
    type ConfirmationActionProps,
    ConfirmationActions,
    type ConfirmationActionsProps,
    type ConfirmationProps as BaseConfirmationProps,
    ConfirmationRejected,
    type ConfirmationRejectedProps,
    ConfirmationRequest,
    type ConfirmationRequestProps,
    ConfirmationTitle,
    type ConfirmationTitleProps,
} from "@/components/ai-elements/confirmation";

/**
 * Approval result type
 */
export type ApprovalResult = {
    approved: boolean;
    reason?: string;
    timestamp: Date;
};

/**
 * Enhanced confirmation props with workflow callbacks
 */
export interface EnhancedConfirmationProps extends BaseConfirmationProps {
    /** Called when user approves the action */
    onApprove?: (result: ApprovalResult) => void;
    /** Called when user rejects the action */
    onReject?: (result: ApprovalResult) => void;
    /** Called when approval state changes */
    onStateChange?: (state: ExtendedToolState) => void;
    /** Require reason for rejection */
    requireRejectionReason?: boolean;
    /** Custom approve button text */
    approveText?: string;
    /** Custom reject button text */
    rejectText?: string;
}

/**
 * Enhanced Confirmation component with workflow callbacks
 */
export function Confirmation({
    onApprove,
    onReject,
    onStateChange,
    requireRejectionReason,
    approveText = "Approve",
    rejectText = "Reject",
    state,
    className,
    children,
    ...props
}: EnhancedConfirmationProps) {
    return (
        <BaseConfirmation
            className={cn("", className)}
            state={state}
            {...props}
        >
            {children}
        </BaseConfirmation>
    );
}

/**
 * Pre-built confirmation with approve/reject actions
 */
export interface QuickConfirmationProps
    extends Omit<EnhancedConfirmationProps, "children"> {
    /** Title text for the confirmation */
    title: string;
    /** Description text */
    description?: string;
    /** Content to show when approved */
    approvedContent?: React.ReactNode;
    /** Content to show when rejected */
    rejectedContent?: React.ReactNode;
}

/**
 * Quick confirmation component with built-in actions
 */
export function QuickConfirmation({
    title,
    description,
    approvedContent = "Action approved",
    rejectedContent = "Action rejected",
    onApprove,
    onReject,
    approveText = "Approve",
    rejectText = "Reject",
    ...props
}: QuickConfirmationProps) {
    const handleApprove = useCallback(() => {
        onApprove?.({
            approved: true,
            timestamp: new Date(),
        });
    }, [onApprove]);

    const handleReject = useCallback(() => {
        onReject?.({
            approved: false,
            timestamp: new Date(),
        });
    }, [onReject]);

    return (
        <Confirmation onApprove={onApprove} onReject={onReject} {...props}>
            <ConfirmationTitle>{title}</ConfirmationTitle>
            {description && (
                <p className="text-muted-foreground text-sm">{description}</p>
            )}

            <ConfirmationRequest>
                <ConfirmationActions>
                    <ConfirmationAction
                        onClick={handleReject}
                        variant="outline"
                    >
                        {rejectText}
                    </ConfirmationAction>
                    <ConfirmationAction onClick={handleApprove}>
                        {approveText}
                    </ConfirmationAction>
                </ConfirmationActions>
            </ConfirmationRequest>

            <ConfirmationAccepted>
                <div className="text-green-600 text-sm dark:text-green-400">
                    {approvedContent}
                </div>
            </ConfirmationAccepted>

            <ConfirmationRejected>
                <div className="text-red-600 text-sm dark:text-red-400">
                    {rejectedContent}
                </div>
            </ConfirmationRejected>
        </Confirmation>
    );
}

/**
 * Hook for managing confirmation workflow state
 */
export function useConfirmationWorkflow(options?: {
    onApprove?: (result: ApprovalResult) => void | Promise<void>;
    onReject?: (result: ApprovalResult) => void | Promise<void>;
    onComplete?: (result: ApprovalResult) => void;
}) {
    const { onApprove, onReject, onComplete } = options ?? {};

    const [state, setState] = useState<
        "pending" | "approved" | "rejected" | "processing"
    >("pending");
    const [result, setResult] = useState<ApprovalResult | null>(null);
    const [error, setError] = useState<Error | null>(null);

    const approve = useCallback(
        async (reason?: string) => {
            setState("processing");
            const approvalResult: ApprovalResult = {
                approved: true,
                reason,
                timestamp: new Date(),
            };

            try {
                await onApprove?.(approvalResult);
                setResult(approvalResult);
                setState("approved");
                onComplete?.(approvalResult);
            } catch (e) {
                setError(e as Error);
                setState("pending");
            }
        },
        [onApprove, onComplete]
    );

    const reject = useCallback(
        async (reason?: string) => {
            setState("processing");
            const rejectionResult: ApprovalResult = {
                approved: false,
                reason,
                timestamp: new Date(),
            };

            try {
                await onReject?.(rejectionResult);
                setResult(rejectionResult);
                setState("rejected");
                onComplete?.(rejectionResult);
            } catch (e) {
                setError(e as Error);
                setState("pending");
            }
        },
        [onReject, onComplete]
    );

    const reset = useCallback(() => {
        setState("pending");
        setResult(null);
        setError(null);
    }, []);

    return {
        state,
        result,
        error,
        approve,
        reject,
        reset,
        isPending: state === "pending",
        isProcessing: state === "processing",
        isApproved: state === "approved",
        isRejected: state === "rejected",
    };
}

/**
 * Tool approval state type
 */
export type ToolApprovalState =
    | { status: "pending" }
    | { status: "approved"; reason?: string }
    | { status: "rejected"; reason?: string };

/**
 * Hook for tool-specific approval workflows
 */
export function useToolApproval(toolId: string) {
    const [approvalState, setApprovalState] = useState<ToolApprovalState>({
        status: "pending",
    });

    const approve = useCallback((reason?: string) => {
        setApprovalState({ status: "approved", reason });
    }, []);

    const reject = useCallback((reason?: string) => {
        setApprovalState({ status: "rejected", reason });
    }, []);

    const reset = useCallback(() => {
        setApprovalState({ status: "pending" });
    }, []);

    return {
        toolId,
        approvalState,
        approve,
        reject,
        reset,
        isPending: approvalState.status === "pending",
        isApproved: approvalState.status === "approved",
        isRejected: approvalState.status === "rejected",
    };
}

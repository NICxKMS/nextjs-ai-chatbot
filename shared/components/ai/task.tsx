"use client";

/**
 * Task Wrapper
 *
 * Enhanced wrapper around AI Element Task component.
 * Adds progress tracking and status callbacks.
 */

import {
    CheckCircle2Icon,
    CircleIcon,
    Loader2Icon,
    XCircleIcon,
} from "lucide-react";
import { useCallback, useState } from "react";
import {
    Task as BaseTask,
    type TaskProps as BaseTaskProps,
    TaskItem,
    type TaskItemProps,
} from "@/components/ai-elements/task";
import { cn } from "@/lib/utils/index";

// Re-export all base components and types
export {
    TaskContent,
    type TaskContentProps,
    TaskItem,
    TaskItemFile,
    type TaskItemFileProps,
    type TaskItemProps,
    type TaskProps as BaseTaskProps,
    TaskTrigger,
    type TaskTriggerProps,
} from "@/components/ai-elements/task";

/**
 * Task status type
 */
export type TaskStatus =
    | "pending"
    | "running"
    | "completed"
    | "failed"
    | "cancelled";

/**
 * Task progress type
 */
export type TaskProgress = {
    /** Current progress (0-100) */
    percentage: number;
    /** Current step number */
    currentStep?: number;
    /** Total steps */
    totalSteps?: number;
    /** Current step description */
    currentStepDescription?: string;
};

/**
 * Enhanced task props with progress tracking
 */
export interface EnhancedTaskProps extends BaseTaskProps {
    /** Current task status */
    status?: TaskStatus;
    /** Task progress */
    progress?: TaskProgress;
    /** Called when task status changes */
    onStatusChange?: (status: TaskStatus) => void;
    /** Called when task completes */
    onComplete?: () => void;
    /** Called when task fails */
    onFail?: (error?: Error) => void;
    /** Show status indicator */
    showStatusIndicator?: boolean;
}

/**
 * Get status icon component
 */
function getStatusIcon(status: TaskStatus) {
    switch (status) {
        case "completed":
            return <CheckCircle2Icon className="size-4 text-green-500" />;
        case "failed":
            return <XCircleIcon className="size-4 text-red-500" />;
        case "running":
            return (
                <Loader2Icon className="size-4 animate-spin text-blue-500" />
            );
        case "cancelled":
            return <XCircleIcon className="size-4 text-muted-foreground" />;
        default:
            return <CircleIcon className="size-4 text-muted-foreground" />;
    }
}

/**
 * Get status label
 */
function getStatusLabel(status: TaskStatus): string {
    switch (status) {
        case "completed":
            return "Completed";
        case "failed":
            return "Failed";
        case "running":
            return "Running";
        case "cancelled":
            return "Cancelled";
        default:
            return "Pending";
    }
}

/**
 * Enhanced Task component with progress tracking
 */
export function Task({
    status = "pending",
    progress,
    onStatusChange,
    onComplete,
    onFail,
    showStatusIndicator = true,
    className,
    children,
    ...props
}: EnhancedTaskProps) {
    return (
        <BaseTask className={cn(className)} {...props}>
            {children}
        </BaseTask>
    );
}

/**
 * Task status indicator component
 */
export type TaskStatusIndicatorProps = {
    status: TaskStatus;
    showLabel?: boolean;
    className?: string;
};

/**
 * Visual status indicator for tasks
 */
export function TaskStatusIndicator({
    status,
    showLabel = false,
    className,
}: TaskStatusIndicatorProps) {
    return (
        <div className={cn("flex items-center gap-1.5", className)}>
            {getStatusIcon(status)}
            {showLabel && (
                <span className="text-muted-foreground text-xs">
                    {getStatusLabel(status)}
                </span>
            )}
        </div>
    );
}

/**
 * Task progress bar component
 */
export type TaskProgressBarProps = {
    progress: TaskProgress;
    showPercentage?: boolean;
    showSteps?: boolean;
    className?: string;
};

/**
 * Visual progress bar for tasks
 */
export function TaskProgressBar({
    progress,
    showPercentage = true,
    showSteps = true,
    className,
}: TaskProgressBarProps) {
    return (
        <div className={cn("space-y-1", className)}>
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                    className="h-full bg-primary transition-all duration-300 ease-out"
                    style={{
                        width: `${Math.min(100, Math.max(0, progress.percentage))}%`,
                    }}
                />
            </div>
            <div className="flex items-center justify-between text-muted-foreground text-xs">
                {showSteps && progress.totalSteps && (
                    <span>
                        Step {progress.currentStep ?? 0} of{" "}
                        {progress.totalSteps}
                    </span>
                )}
                {showPercentage && (
                    <span>{Math.round(progress.percentage)}%</span>
                )}
            </div>
            {progress.currentStepDescription && (
                <p className="text-muted-foreground text-xs">
                    {progress.currentStepDescription}
                </p>
            )}
        </div>
    );
}

/**
 * Enhanced task item with status
 */
export interface EnhancedTaskItemProps extends TaskItemProps {
    status?: TaskStatus;
}

/**
 * Task item with status indicator
 */
export function EnhancedTaskItem({
    status = "pending",
    className,
    children,
    ...props
}: EnhancedTaskItemProps) {
    return (
        <TaskItem
            className={cn("flex items-center gap-2", className)}
            {...props}
        >
            <TaskStatusIndicator status={status} />
            <span className="flex-1">{children}</span>
        </TaskItem>
    );
}

/**
 * Hook for managing task state
 */
export function useTaskState(options?: {
    onStatusChange?: (status: TaskStatus) => void;
    onComplete?: () => void;
    onFail?: (error?: Error) => void;
}) {
    const { onStatusChange, onComplete, onFail } = options ?? {};

    const [status, setStatus] = useState<TaskStatus>("pending");
    const [progress, setProgress] = useState<TaskProgress>({ percentage: 0 });
    const [error, setError] = useState<Error | null>(null);

    const updateStatus = useCallback(
        (newStatus: TaskStatus) => {
            setStatus(newStatus);
            onStatusChange?.(newStatus);

            if (newStatus === "completed") {
                setProgress({ percentage: 100 });
                onComplete?.();
            }
        },
        [onStatusChange, onComplete]
    );

    const start = useCallback(() => {
        updateStatus("running");
        setProgress({ percentage: 0 });
        setError(null);
    }, [updateStatus]);

    const complete = useCallback(() => {
        updateStatus("completed");
    }, [updateStatus]);

    const fail = useCallback(
        (err?: Error) => {
            setError(err ?? null);
            updateStatus("failed");
            onFail?.(err);
        },
        [updateStatus, onFail]
    );

    const cancel = useCallback(() => {
        updateStatus("cancelled");
    }, [updateStatus]);

    const reset = useCallback(() => {
        setStatus("pending");
        setProgress({ percentage: 0 });
        setError(null);
    }, []);

    const updateProgress = useCallback((newProgress: Partial<TaskProgress>) => {
        setProgress((prev) => ({ ...prev, ...newProgress }));
    }, []);

    return {
        status,
        progress,
        error,
        start,
        complete,
        fail,
        cancel,
        reset,
        updateProgress,
        updateStatus,
        isPending: status === "pending",
        isRunning: status === "running",
        isCompleted: status === "completed",
        isFailed: status === "failed",
        isCancelled: status === "cancelled",
    };
}

/**
 * Hook for managing multiple tasks
 */
export function useTaskList<T extends { id: string }>(initialTasks: T[] = []) {
    const [tasks, setTasks] = useState<(T & { status: TaskStatus })[]>(
        initialTasks.map((t) => ({ ...t, status: "pending" as TaskStatus }))
    );

    const updateTaskStatus = useCallback(
        (taskId: string, status: TaskStatus) => {
            setTasks((prev) =>
                prev.map((t) => (t.id === taskId ? { ...t, status } : t))
            );
        },
        []
    );

    const addTask = useCallback((task: T) => {
        setTasks((prev) => [...prev, { ...task, status: "pending" }]);
    }, []);

    const removeTask = useCallback((taskId: string) => {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
    }, []);

    const resetAll = useCallback(() => {
        setTasks((prev) => prev.map((t) => ({ ...t, status: "pending" })));
    }, []);

    const completedCount = tasks.filter((t) => t.status === "completed").length;
    const failedCount = tasks.filter((t) => t.status === "failed").length;
    const pendingCount = tasks.filter((t) => t.status === "pending").length;
    const runningCount = tasks.filter((t) => t.status === "running").length;

    return {
        tasks,
        updateTaskStatus,
        addTask,
        removeTask,
        resetAll,
        completedCount,
        failedCount,
        pendingCount,
        runningCount,
        totalCount: tasks.length,
        allCompleted: completedCount === tasks.length && tasks.length > 0,
        hasFailures: failedCount > 0,
    };
}

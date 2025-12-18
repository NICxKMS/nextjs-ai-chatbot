export type ErrorSeverity = "fatal" | "error" | "warning" | "info";

export type ErrorContext = {
    userId?: string;
    chatId?: string;
    requestId?: string;
    [key: string]: unknown;
};

export type SerializedError = {
    code: string;
    message: string;
    severity: ErrorSeverity;
    context?: ErrorContext;
    timestamp: string;
};

// Type-only file - NO runtime imports
// This file can be safely imported without pulling in OpenTelemetry or other runtime dependencies

export type ErrorType =
    | "bad_request"
    | "unauthorized"
    | "forbidden"
    | "not_found"
    | "rate_limit"
    | "offline";

export type Surface =
    | "chat"
    | "auth"
    | "api"
    | "stream"
    | "database"
    | "history"
    | "vote"
    | "document"
    | "suggestions"
    | "activate_gateway"
    | "ui";

// Allow a specific reason suffix for granular codes, while keeping type/surface parsing stable
export type ErrorCode = `${ErrorType}:${Surface}${"" | `:${string}`}`;

export type ErrorVisibility = "response" | "log" | "none";

// Task 9.15: User type for context-aware error messages
export type ErrorUserType = "guest" | "regular" | "unknown";

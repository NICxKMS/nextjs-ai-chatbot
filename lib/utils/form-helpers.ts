/**
 * Form Utilities
 *
 * Provides utilities for form handling, validation, and state management.
 *
 * @module lib/utils/form-helpers
 */

import { sanitizeText } from "./sanitize";

// =============================================================================
// Constants (P3-036: Extracted magic numbers)
// =============================================================================

/**
 * Maximum length for chat input messages.
 * Prevents excessive payload sizes and ensures reasonable processing time.
 */
export const MAX_CHAT_INPUT_LENGTH = 32_000;

/**
 * Maximum consecutive newlines allowed in chat input.
 * Content with more newlines will be collapsed.
 */
export const MAX_CONSECUTIVE_NEWLINES = 3;

// =============================================================================
// Types
// =============================================================================

/**
 * Form field validation error.
 */
export interface FieldError {
    field: string;
    message: string;
}

/**
 * Form validation result.
 */
export interface ValidationResult {
    isValid: boolean;
    errors: FieldError[];
}

/**
 * Generic form state.
 */
export interface FormState<T = Record<string, unknown>> {
    values: T;
    errors: Record<string, string>;
    touched: Record<string, boolean>;
    isSubmitting: boolean;
    isValid: boolean;
}

/**
 * Validator function type.
 */
export type Validator<T = string> = (value: T) => string | undefined;

// =============================================================================
// Validation Rules
// =============================================================================

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Create a required field validator.
 */
export function required(message = "This field is required"): Validator {
    return (value) => {
        if (typeof value !== "string" || !value.trim()) {
            return message;
        }
        return;
    };
}

/**
 * Create an email validator.
 */
export function email(
    message = "Please enter a valid email address"
): Validator {
    return (value) => {
        if (typeof value !== "string" || !value.trim()) {
            return; // Let required() handle empty values
        }
        if (!EMAIL_PATTERN.test(value)) {
            return message;
        }
        return;
    };
}

/**
 * Create a minimum length validator.
 */
export function minLength(min: number, message?: string): Validator {
    return (value) => {
        if (typeof value !== "string") {
            return;
        }
        if (value.length > 0 && value.length < min) {
            return message ?? `Must be at least ${min} characters`;
        }
        return;
    };
}

/**
 * Create a maximum length validator.
 */
export function maxLength(max: number, message?: string): Validator {
    return (value) => {
        if (typeof value !== "string") {
            return;
        }
        if (value.length > max) {
            return message ?? `Must be no more than ${max} characters`;
        }
        return;
    };
}

/**
 * Create a pattern validator.
 */
export function pattern(regex: RegExp, message = "Invalid format"): Validator {
    return (value) => {
        if (typeof value !== "string" || !value) {
            return;
        }
        if (!regex.test(value)) {
            return message;
        }
        return;
    };
}

/**
 * Create a UUID validator.
 */
export function uuid(message = "Invalid ID format"): Validator {
    return pattern(UUID_PATTERN, message);
}

// =============================================================================
// Composition
// =============================================================================

/**
 * Compose multiple validators into a single validator.
 * Returns the first error message encountered, or undefined if all pass.
 */
export function compose<T = string>(
    ...validators: Validator<T>[]
): Validator<T> {
    return (value) => {
        for (const validator of validators) {
            const error = validator(value);
            if (error) {
                return error;
            }
        }
        return;
    };
}

// =============================================================================
// Form Data Extraction
// =============================================================================

/**
 * Safely extract and sanitize a string from FormData.
 *
 * @param formData - The form data object
 * @param field - The field name to extract
 * @param options - Extraction options
 * @returns Sanitized string value, or empty string if not found
 */
export function getFormString(
    formData: FormData,
    field: string,
    options: { trim?: boolean; sanitize?: boolean } = {}
): string {
    const { trim = true, sanitize = true } = options;

    const value = formData.get(field);

    if (typeof value !== "string") {
        return "";
    }

    let result = value;

    if (trim) {
        result = result.trim();
    }

    if (sanitize) {
        result = sanitizeText(result);
    }

    return result;
}

/**
 * Safely extract a number from FormData.
 *
 * @param formData - The form data object
 * @param field - The field name to extract
 * @param defaultValue - Default value if parsing fails
 * @returns Parsed number or default value
 */
export function getFormNumber(
    formData: FormData,
    field: string,
    defaultValue = 0
): number {
    const value = formData.get(field);

    if (typeof value !== "string") {
        return defaultValue;
    }

    const parsed = Number.parseFloat(value);

    if (Number.isNaN(parsed)) {
        return defaultValue;
    }

    return parsed;
}

/**
 * Safely extract a boolean from FormData.
 * Treats "true", "1", "on", "yes" as true.
 *
 * @param formData - The form data object
 * @param field - The field name to extract
 * @returns Boolean value
 */
export function getFormBoolean(formData: FormData, field: string): boolean {
    const value = formData.get(field);

    if (typeof value !== "string") {
        // Checkbox that wasn't checked
        return value !== null;
    }

    return ["true", "1", "on", "yes"].includes(value.toLowerCase());
}

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Validate a form's data against a schema of validators.
 *
 * @param data - Object of field values
 * @param schema - Object mapping field names to validators
 * @returns Validation result with isValid flag and errors array
 */
export function validateForm<T extends Record<string, unknown>>(
    data: T,
    schema: Partial<Record<keyof T, Validator>>
): ValidationResult {
    const errors: FieldError[] = [];

    for (const [field, validator] of Object.entries(schema)) {
        if (!validator) {
            continue;
        }

        const value = data[field];
        const stringValue =
            typeof value === "string" ? value : String(value ?? "");
        const error = validator(stringValue);

        if (error) {
            errors.push({ field, message: error });
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
}

/**
 * Convert validation errors array to a record for easier access.
 */
export function errorsToRecord(errors: FieldError[]): Record<string, string> {
    return errors.reduce(
        (acc, { field, message }) => {
            acc[field] = message;
            return acc;
        },
        {} as Record<string, string>
    );
}

// =============================================================================
// Input Sanitization for Chat
// =============================================================================

/**
 * Sanitize chat message input.
 * Removes potentially dangerous content while preserving legitimate markdown.
 *
 * @param input - Raw user input
 * @returns Sanitized input safe for processing
 */
export function sanitizeChatInput(input: string): string {
    if (typeof input !== "string") {
        return "";
    }

    return (
        sanitizeText(input)
            // Normalize line endings
            .replace(/\r\n/g, "\n")
            .replace(/\r/g, "\n")
            // Collapse excessive newlines (more than 3 consecutive)
            .replace(/\n{4,}/g, "\n\n\n")
            // Remove null bytes
            .replace(/\0/g, "")
            // Trim excessive whitespace at line endings
            .replace(/[ \t]+$/gm, "")
            // Trim leading/trailing whitespace
            .trim()
    );
}

/**
 * Check if chat input is valid for submission.
 *
 * @param input - Sanitized input
 * @param options - Validation options
 * @returns Error message or undefined if valid
 */
export function validateChatInput(
    input: string,
    options: { maxLength?: number } = {}
): string | undefined {
    const { maxLength: max = MAX_CHAT_INPUT_LENGTH } = options;

    if (!input || !input.trim()) {
        return "Message cannot be empty";
    }

    if (input.length > max) {
        return `Message too long (${input.length.toLocaleString()} / ${max.toLocaleString()} characters)`;
    }

    return;
}

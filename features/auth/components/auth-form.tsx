"use client";

import Form from "next/form";
import {
    type ComponentProps,
    forwardRef,
    useCallback,
    useRef,
    useState,
} from "react";
import { useFormStatus } from "react-dom";

import { Loader } from "@/components/ai-elements/loader";
import { cn } from "@/lib/utils";
import type { AuthFormProps } from "../types";

// ============================================================================
// Validation
// ============================================================================

type ValidationErrors = {
    email?: string;
    password?: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

function validateEmail(email: string): string | undefined {
    if (!email.trim()) {
        return "Email is required";
    }
    if (!EMAIL_REGEX.test(email)) {
        return "Please enter a valid email address";
    }
    return;
}

function validatePassword(
    password: string,
    isRegister: boolean
): string | undefined {
    if (!password) {
        return "Password is required";
    }
    if (isRegister && password.length < MIN_PASSWORD_LENGTH) {
        return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
    }
    return;
}

// ============================================================================
// UI Components (inline until shared/ui is populated)
// Ref: oldapp/components/ui/input.tsx, label.tsx, button.tsx
// ============================================================================

const Input = forwardRef<HTMLInputElement, ComponentProps<"input">>(
    ({ className, type, ...props }, ref) => {
        return (
            <input
                className={cn(
                    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:font-medium file:text-foreground file:text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
                    className
                )}
                ref={ref}
                type={type}
                {...props}
            />
        );
    }
);
Input.displayName = "Input";

const Label = forwardRef<HTMLLabelElement, ComponentProps<"label">>(
    ({ className, ...props }, ref) => {
        return (
            <label
                className={cn(
                    "font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
                    className
                )}
                ref={ref}
                {...props}
            />
        );
    }
);
Label.displayName = "Label";

/**
 * Inline error message component for form validation
 */
function ErrorMessage({ message, id }: { message?: string; id?: string }) {
    if (!message) {
        return null;
    }
    return (
        <p
            aria-live="polite"
            className="mt-1 text-destructive text-sm"
            id={id}
            role="alert"
        >
            {message}
        </p>
    );
}

const Button = forwardRef<HTMLButtonElement, ComponentProps<"button">>(
    ({ className, ...props }, ref) => {
        return (
            <button
                className={cn(
                    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium text-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                    "bg-primary text-primary-foreground hover:bg-primary/90",
                    "h-10 px-4 py-2",
                    className
                )}
                ref={ref}
                {...props}
            />
        );
    }
);
Button.displayName = "Button";

// ============================================================================
// Submit Button
// Ref: oldapp/components/submit-button.tsx
// ============================================================================

function SubmitButton({
    children,
    isSuccessful,
}: {
    children: React.ReactNode;
    isSuccessful?: boolean;
}) {
    const { pending } = useFormStatus();
    const isDisabled = pending || isSuccessful;

    return (
        <Button
            aria-disabled={isDisabled}
            className="relative"
            data-testid="submit-button"
            disabled={isDisabled}
            type={pending ? "button" : "submit"}
        >
            {children}

            {isDisabled && (
                <span className="absolute right-4">
                    <Loader size={16} />
                </span>
            )}

            <output aria-live="polite" className="sr-only">
                {isDisabled ? "Loading" : "Submit form"}
            </output>
        </Button>
    );
}

// ============================================================================
// AuthForm Component
// Ref: oldapp/components/auth-form.tsx, oldapp/app/(auth)/login/page.tsx
// ============================================================================

/**
 * Reusable authentication form component
 * Supports login and register modes with identical styling to OldApp
 */
export function AuthForm({
    mode,
    onSubmit,
    defaultEmail = "",
    isLoading = false,
    isSuccessful = false,
}: AuthFormProps) {
    const isLogin = mode === "login";
    const [errors, setErrors] = useState<ValidationErrors>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const emailRef = useRef<HTMLInputElement>(null);
    const passwordRef = useRef<HTMLInputElement>(null);

    const title = isLogin ? "Sign In" : "Sign Up";
    const description = isLogin
        ? "Use your email and password to sign in"
        : "Create an account with your email and password";
    const submitText = isLogin ? "Sign in" : "Sign Up";
    const alternateText = isLogin
        ? "Don't have an account? "
        : "Already have an account? ";
    const alternateLinkText = isLogin ? "Sign up" : "Sign in";
    const alternateSuffix = isLogin ? " for free." : " instead.";
    const alternateHref = isLogin ? "/register" : "/login";

    // Validate a single field
    const validateField = useCallback(
        (name: string, value: string): string | undefined => {
            if (name === "email") {
                return validateEmail(value);
            }
            if (name === "password") {
                return validatePassword(value, !isLogin);
            }
            return;
        },
        [isLogin]
    );

    // Handle field blur for touched state
    const handleBlur = useCallback(
        (e: React.FocusEvent<HTMLInputElement>) => {
            const { name, value } = e.target;
            setTouched((prev) => ({ ...prev, [name]: true }));
            const error = validateField(name, value);
            setErrors((prev) => ({ ...prev, [name]: error }));
        },
        [validateField]
    );

    // Handle field change for real-time validation when touched
    const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const { name, value } = e.target;
            if (touched[name]) {
                const error = validateField(name, value);
                setErrors((prev) => ({ ...prev, [name]: error }));
            }
        },
        [touched, validateField]
    );

    // Validate all fields before submit
    const handleFormAction = useCallback(
        async (formData: FormData) => {
            const email = formData.get("email") as string;
            const password = formData.get("password") as string;

            const emailError = validateEmail(email);
            const passwordError = validatePassword(password, !isLogin);

            const newErrors: ValidationErrors = {
                email: emailError,
                password: passwordError,
            };

            setErrors(newErrors);
            setTouched({ email: true, password: true });

            // Focus first field with error
            if (emailError) {
                emailRef.current?.focus();
                return;
            }
            if (passwordError) {
                passwordRef.current?.focus();
                return;
            }

            // All valid, submit
            await onSubmit(formData);
        },
        [isLogin, onSubmit]
    );

    return (
        <div className="flex h-dvh w-screen items-start justify-center bg-background pt-12 md:items-center md:pt-0">
            <div className="flex w-full max-w-md flex-col gap-12 overflow-hidden rounded-2xl">
                {/* Header */}
                <div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
                    <h3 className="font-semibold text-xl dark:text-zinc-50">
                        {title}
                    </h3>
                    <p className="text-gray-500 text-sm dark:text-zinc-400">
                        {description}
                    </p>
                </div>

                {/* Form */}
                <Form
                    action={handleFormAction}
                    className="flex flex-col gap-4 px-4 sm:px-16"
                    data-testid="auth-form"
                    noValidate
                >
                    {/* Email Field */}
                    <div className="flex flex-col gap-2">
                        <Label
                            className="font-normal text-zinc-600 dark:text-zinc-400"
                            htmlFor="email"
                        >
                            Email Address
                        </Label>
                        <Input
                            aria-describedby={
                                errors.email ? "email-error" : undefined
                            }
                            aria-invalid={!!errors.email}
                            autoComplete="email"
                            autoFocus
                            className={cn(
                                "bg-muted text-md md:text-sm",
                                errors.email &&
                                    touched.email &&
                                    "border-destructive focus-visible:ring-destructive"
                            )}
                            data-testid="email-input"
                            defaultValue={defaultEmail}
                            id="email"
                            name="email"
                            onBlur={handleBlur}
                            onChange={handleChange}
                            placeholder="user@acme.com"
                            ref={emailRef}
                            type="email"
                        />
                        <ErrorMessage
                            id="email-error"
                            message={touched.email ? errors.email : undefined}
                        />
                    </div>

                    {/* Password Field */}
                    <div className="flex flex-col gap-2">
                        <Label
                            className="font-normal text-zinc-600 dark:text-zinc-400"
                            htmlFor="password"
                        >
                            Password
                        </Label>
                        <Input
                            aria-describedby={
                                errors.password ? "password-error" : undefined
                            }
                            aria-invalid={!!errors.password}
                            autoComplete={
                                isLogin ? "current-password" : "new-password"
                            }
                            className={cn(
                                "bg-muted text-md md:text-sm",
                                errors.password &&
                                    touched.password &&
                                    "border-destructive focus-visible:ring-destructive"
                            )}
                            data-testid="password-input"
                            id="password"
                            name="password"
                            onBlur={handleBlur}
                            onChange={handleChange}
                            ref={passwordRef}
                            type="password"
                        />
                        <ErrorMessage
                            id="password-error"
                            message={
                                touched.password ? errors.password : undefined
                            }
                        />
                    </div>

                    {/* Submit Button */}
                    <SubmitButton isSuccessful={isSuccessful || isLoading}>
                        {submitText}
                    </SubmitButton>
                </Form>

                {/* Alternate Action Link - outside form to avoid form submission interference */}
                <p className="-mt-8 px-4 text-center text-gray-600 text-sm sm:px-16 dark:text-zinc-400">
                    {alternateText}
                    <a
                        className="font-semibold text-gray-800 hover:underline dark:text-zinc-200"
                        data-testid="auth-alternate-link"
                        href={alternateHref}
                    >
                        {alternateLinkText}
                    </a>
                    {alternateSuffix}
                </p>
            </div>
        </div>
    );
}

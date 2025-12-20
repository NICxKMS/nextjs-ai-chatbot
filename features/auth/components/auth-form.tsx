'use client';

import Form from 'next/form';
import Link from 'next/link';
import { useFormStatus } from 'react-dom';
import { forwardRef, type ComponentProps } from 'react';

import { cn } from '@/lib/utils';
import type { AuthFormProps } from '../types';

// ============================================================================
// UI Components (inline until shared/ui is populated)
// Ref: oldapp/components/ui/input.tsx, label.tsx, button.tsx
// ============================================================================

const Input = forwardRef<HTMLInputElement, ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:font-medium file:text-foreground file:text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          className
        )}
        ref={ref}
        type={type}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

const Label = forwardRef<HTMLLabelElement, ComponentProps<'label'>>(
  ({ className, ...props }, ref) => {
    return (
      <label
        className={cn(
          'font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Label.displayName = 'Label';

const Button = forwardRef<HTMLButtonElement, ComponentProps<'button'>>(
  ({ className, ...props }, ref) => {
    return (
      <button
        className={cn(
          'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium text-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
          'bg-primary text-primary-foreground hover:bg-primary/90',
          'h-10 px-4 py-2',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

// ============================================================================
// Loader Icon
// Ref: oldapp/components/icons.tsx
// ============================================================================

function LoaderIcon() {
  return (
    <svg
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

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
      disabled={isDisabled}
      type={pending ? 'button' : 'submit'}
      data-testid="submit-button"
    >
      {children}

      {isDisabled && (
        <span className="absolute right-4 animate-spin">
          <LoaderIcon />
        </span>
      )}

      <output aria-live="polite" className="sr-only">
        {isDisabled ? 'Loading' : 'Submit form'}
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
  defaultEmail = '',
  isLoading = false,
  isSuccessful = false,
}: AuthFormProps) {
  const isLogin = mode === 'login';

  const title = isLogin ? 'Sign In' : 'Sign Up';
  const description = isLogin
    ? 'Use your email and password to sign in'
    : 'Create an account with your email and password';
  const submitText = isLogin ? 'Sign in' : 'Sign Up';
  const alternateText = isLogin
    ? "Don't have an account? "
    : 'Already have an account? ';
  const alternateLinkText = isLogin ? 'Sign up' : 'Sign in';
  const alternateSuffix = isLogin ? ' for free.' : ' instead.';
  const alternateHref = isLogin ? '/register' : '/login';

  return (
    <div className="flex h-dvh w-screen items-start justify-center bg-background pt-12 md:items-center md:pt-0">
      <div className="flex w-full max-w-md flex-col gap-12 overflow-hidden rounded-2xl">
        {/* Header */}
        <div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
          <h3 className="font-semibold text-xl dark:text-zinc-50">{title}</h3>
          <p className="text-gray-500 text-sm dark:text-zinc-400">
            {description}
          </p>
        </div>

        {/* Form */}
        <Form action={onSubmit} className="flex flex-col gap-4 px-4 sm:px-16" data-testid="auth-form">
          {/* Email Field */}
          <div className="flex flex-col gap-2">
            <Label
              className="font-normal text-zinc-600 dark:text-zinc-400"
              htmlFor="email"
            >
              Email Address
            </Label>
            <Input
              autoComplete="email"
              autoFocus
              className="bg-muted text-md md:text-sm"
              defaultValue={defaultEmail}
              id="email"
              name="email"
              placeholder="user@acme.com"
              required
              type="email"
              data-testid="email-input"
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
              className="bg-muted text-md md:text-sm"
              id="password"
              name="password"
              required
              type="password"
              data-testid="password-input"
            />
          </div>

          {/* Submit Button */}
          <SubmitButton isSuccessful={isSuccessful || isLoading}>
            {submitText}
          </SubmitButton>

          {/* Alternate Action Link */}
          <p className="mt-4 text-center text-gray-600 text-sm dark:text-zinc-400">
            {alternateText}
            <Link
              className="font-semibold text-gray-800 hover:underline dark:text-zinc-200"
              href={alternateHref}
            >
              {alternateLinkText}
            </Link>
            {alternateSuffix}
          </p>
        </Form>
      </div>
    </div>
  );
}

import Form from "next/form";

import { cn } from "@/lib/utils";

import { Input } from "./ui/input";
import { Label } from "./ui/label";

export function AuthForm({
  action,
  children,
  defaultEmail = "",
  errors,
}: {
  action: NonNullable<
    string | ((formData: FormData) => void | Promise<void>) | undefined
  >;
  children: React.ReactNode;
  defaultEmail?: string;
  errors?: Partial<Record<"email" | "password", string>>;
}) {
  const emailError = errors?.email;
  const passwordError = errors?.password;

  return (
    <Form action={action} className="flex flex-col gap-4 px-4 sm:px-16">
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
          aria-describedby={emailError ? "auth-email-error" : undefined}
          aria-invalid={Boolean(emailError)}
          className={cn(
            "bg-muted text-md md:text-sm",
            emailError && "border-destructive focus-visible:ring-destructive"
          )}
          defaultValue={defaultEmail}
          id="email"
          name="email"
          placeholder="user@acme.com"
          required
          type="email"
        />
        {emailError ? (
          <p className="text-destructive text-sm" id="auth-email-error">
            {emailError}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label
          className="font-normal text-zinc-600 dark:text-zinc-400"
          htmlFor="password"
        >
          Password
        </Label>

        <Input
          aria-describedby={passwordError ? "auth-password-error" : undefined}
          aria-invalid={Boolean(passwordError)}
          className={cn(
            "bg-muted text-md md:text-sm",
            passwordError &&
              "border-destructive focus-visible:ring-destructive"
          )}
          id="password"
          name="password"
          required
          type="password"
        />
        {passwordError ? (
          <p className="text-destructive text-sm" id="auth-password-error">
            {passwordError}
          </p>
        ) : null}
      </div>

      {children}
    </Form>
  );
}

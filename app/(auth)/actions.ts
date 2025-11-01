"use server";

import { z } from "zod";

import { createUser, getUser } from "@/lib/db/queries";

import { signIn } from "./auth";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long.")
  .regex(/[A-Z]/, "Password must include at least one uppercase letter.")
  .regex(/[a-z]/, "Password must include at least one lowercase letter.")
  .regex(/\d/, "Password must include at least one number.")
  .regex(
    /[^A-Za-z0-9]/,
    "Password must include at least one special character."
  );

const authFormSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email address is required.")
    .email("Enter a valid email address."),
  password: passwordSchema,
});

type AuthFormValues = z.infer<typeof authFormSchema>;
type AuthFieldErrors = Partial<Record<keyof AuthFormValues, string>>;

const fieldLabels: Record<keyof AuthFormValues, string> = {
  email: "Email address",
  password: "Password",
};

const buildValidationFeedback = (
  error: z.ZodError<AuthFormValues>
): { message: string; fieldErrors: AuthFieldErrors } => {
  const flattened = error.flatten().fieldErrors;
  const fieldErrors: AuthFieldErrors = {};
  const messages: string[] = [];

  for (const [field, issues] of Object.entries(flattened) as [
    keyof AuthFormValues,
    string[] | undefined,
  ][]) {
    if (!issues?.length) {
      continue;
    }

    const message = issues[0];
    fieldErrors[field] = message;
    messages.push(`${fieldLabels[field]}: ${message}`);
  }

  return {
    fieldErrors,
    message:
      messages.join(" ") ||
      "Please double-check the highlighted fields and try again.",
  };
};

type AuthActionBase = {
  message?: string;
  fieldErrors?: AuthFieldErrors;
};

export type LoginActionState = AuthActionBase & {
  status: "idle" | "in_progress" | "success" | "failed" | "invalid_data";
};

export const login = async (
  _: LoginActionState,
  formData: FormData
): Promise<LoginActionState> => {
  try {
    const validatedData = authFormSchema.parse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    await signIn("credentials", {
      email: validatedData.email,
      password: validatedData.password,
      redirect: false,
    });

    return { status: "success" };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const { message, fieldErrors } = buildValidationFeedback(error);
      return { status: "invalid_data", message, fieldErrors };
    }

    return {
      status: "failed",
      message:
        "We couldn't sign you in. Please verify your email and password and try again.",
    };
  }
};

export type RegisterActionState = AuthActionBase & {
  status:
    | "idle"
    | "in_progress"
    | "success"
    | "failed"
    | "user_exists"
    | "invalid_data";
};

export const register = async (
  _: RegisterActionState,
  formData: FormData
): Promise<RegisterActionState> => {
  try {
    const validatedData = authFormSchema.parse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    const [user] = await getUser(validatedData.email);

    if (user) {
      return {
        status: "user_exists",
        message: `An account with ${validatedData.email} already exists. Try signing in instead.`,
        fieldErrors: {
          email: "An account with this email already exists.",
        },
      };
    }

    await createUser(validatedData.email, validatedData.password);
    await signIn("credentials", {
      email: validatedData.email,
      password: validatedData.password,
      redirect: false,
    });

    return {
      status: "success",
      message: "Account created successfully!",
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const { message, fieldErrors } = buildValidationFeedback(error);
      return { status: "invalid_data", message, fieldErrors };
    }

    return {
      status: "failed",
      message:
        "We couldn't create your account right now. Please try again shortly.",
    };
  }
};

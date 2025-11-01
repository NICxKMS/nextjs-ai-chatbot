"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useActionState, useEffect, useRef, useState } from "react";
import { AuthForm } from "@/components/auth-form";
import { SubmitButton } from "@/components/submit-button";
import { toast } from "@/components/toast";
import { type RegisterActionState, register } from "../actions";

export default function Page() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [isSuccessful, setIsSuccessful] = useState(false);

  const [state, formAction] = useActionState<RegisterActionState, FormData>(
    register,
    {
      status: "idle",
      message: undefined,
      fieldErrors: undefined,
    }
  );

  const { update: updateSession } = useSession();

  const lastHandledKey = useRef<string>(
    `${state.status}|${state.message ?? ""}`
  );

  useEffect(() => {
    const statusKey = `${state.status}|${state.message ?? ""}`;

    if (statusKey === lastHandledKey.current) {
      return;
    }

    lastHandledKey.current = statusKey;

    if (state.status === "user_exists") {
      toast({
        type: "error",
        description:
          state.message ?? "Account already exists! Try signing in instead.",
      });
    } else if (state.status === "failed") {
      toast({
        type: "error",
        description:
          state.message ?? "Failed to create account! Please try again.",
      });
    } else if (state.status === "invalid_data") {
      toast({
        type: "error",
        description: state.message ?? "Failed validating your submission!",
      });
    } else if (state.status === "success") {
      toast({
        type: "success",
        description: state.message ?? "Account created successfully!",
      });

      setIsSuccessful(true);
      updateSession().catch(() => {
        /* no-op */
      });
      router.refresh();
    }
  }, [router, state.message, state.status, updateSession]);

  const handleSubmit = (formData: FormData) => {
    const submittedEmail = (formData.get("email") as string | null) ?? "";
    const normalizedEmail = submittedEmail.trim();
    setEmail(normalizedEmail);
    if (normalizedEmail !== submittedEmail) {
      formData.set("email", normalizedEmail);
    }
    formAction(formData);
  };

  return (
    <div className="flex h-dvh w-screen items-start justify-center bg-background pt-12 md:items-center md:pt-0">
      <div className="flex w-full max-w-md flex-col gap-12 overflow-hidden rounded-2xl">
        <div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
          <h3 className="font-semibold text-xl dark:text-zinc-50">Sign Up</h3>
          <p className="text-gray-500 text-sm dark:text-zinc-400">
            Create an account with your email and password
          </p>
        </div>
        <AuthForm
          action={handleSubmit}
          defaultEmail={email}
          errors={state.fieldErrors}
        >
          <SubmitButton isSuccessful={isSuccessful}>Sign Up</SubmitButton>
          <p className="mt-4 text-center text-gray-600 text-sm dark:text-zinc-400">
            {"Already have an account? "}
            <Link
              className="font-semibold text-gray-800 hover:underline dark:text-zinc-200"
              href="/login"
            >
              Sign in
            </Link>
            {" instead."}
          </p>
        </AuthForm>
      </div>
    </div>
  );
}

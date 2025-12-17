"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthForm } from "@/components/auth-form";
import { SubmitButton } from "@/components/submit-button";
import { toast } from "@/components/toast";

export default function Page() {
    const [email, setEmail] = useState("");
    const [isSuccessful, setIsSuccessful] = useState(false);
    const router = useRouter();

    const handleSubmit = async (formData: FormData) => {
        const submittedEmail = formData.get("email");
        const password = formData.get("password");

        if (
            typeof submittedEmail !== "string" ||
            typeof password !== "string"
        ) {
            toast({
                type: "error",
                description: "Please provide a valid email and password.",
            });
            return;
        }

        setEmail(submittedEmail);

        const { getSupabaseBrowserClient } = await import("@/lib/auth/client");
        const supabase = getSupabaseBrowserClient();

        const { data, error } = await supabase.auth.signUp({
            email: submittedEmail,
            password,
        });

        if (error || !data.user) {
            toast({
                type: "error",
                description: error?.message || "Failed to create account!",
            });
            return;
        }

        // When email confirmation is required, Supabase returns user but no session
        // The user needs to verify their email before they can log in
        if (!data.session) {
            toast({
                type: "success",
                description:
                    "Account created! Please check your email to verify your account.",
            });
            setIsSuccessful(true);
            // Redirect to login page so user can log in after confirming email
            router.push("/login");
            return;
        }

        // If we have a session (email confirmation disabled), exchange it for cookies
        const accessToken = data.session.access_token;

        try {
            const exchangeResponse = await fetch("/api/auth/exchange", {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ accessToken }),
            });

            if (!exchangeResponse.ok) {
                toast({
                    type: "error",
                    description:
                        "Account created, but session setup failed. Please try logging in.",
                });
                return;
            }

            // Validate that a valid user was returned in the response
            const exchangeData = (await exchangeResponse.json()) as {
                user: unknown;
            };
            if (!exchangeData.user) {
                toast({
                    type: "error",
                    description:
                        "Account created, but session setup failed. Please try logging in.",
                });
                return;
            }
        } catch {
            toast({
                type: "error",
                description:
                    "Account created, but session setup failed. Please try logging in.",
            });
            return;
        }

        toast({
            type: "success",
            description: "Account created successfully!",
        });

        setIsSuccessful(true);
        router.push("/");
        router.refresh();
    };

    return (
        <div className="flex h-dvh w-screen items-start justify-center bg-background pt-12 md:items-center md:pt-0">
            <div className="flex w-full max-w-md flex-col gap-12 overflow-hidden rounded-2xl">
                <div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
                    <h3 className="font-semibold text-xl dark:text-zinc-50">
                        Sign Up
                    </h3>
                    <p className="text-gray-500 text-sm dark:text-zinc-400">
                        Create an account with your email and password
                    </p>
                </div>
                <AuthForm action={handleSubmit} defaultEmail={email}>
                    <SubmitButton isSuccessful={isSuccessful}>
                        Sign Up
                    </SubmitButton>
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

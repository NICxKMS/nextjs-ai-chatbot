"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthForm } from "@/features/auth";
import { getSupabaseBrowserClient } from "@/lib/auth/client";
import { mapSupabaseError } from "@/lib/utils";
import { toast } from "@/shared/ui";

/**
 * Register Page
 * Ref: oldapp/app/(auth)/register/page.tsx
 *
 * Handles new user registration via Supabase.
 * If email confirmation is enabled: shows success message and redirects to login.
 * If email confirmation is disabled: exchanges token for session and redirects to home.
 */
export default function RegisterPage() {
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
                description: "Please enter your email and password.",
            });
            return;
        }

        setEmail(submittedEmail);

        const supabase = getSupabaseBrowserClient();

        const { data, error } = await supabase.auth.signUp({
            email: submittedEmail,
            password,
        });

        if (error || !data.user) {
            const friendlyError = mapSupabaseError(
                error?.message ?? "Failed to create account"
            );
            toast({
                type: "error",
                description: friendlyError.message,
            });
            return;
        }

        // When email confirmation is required, Supabase returns user but no session
        // The user needs to verify their email before they can log in
        if (!data.session) {
            toast({
                type: "success",
                description:
                    "Welcome! We've sent a verification link to your email. Please check your inbox.",
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
                        "Account created! However, we couldn't sign you in automatically. Please try logging in.",
                });
                router.push("/login");
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
                        "Account created! However, we couldn't sign you in automatically. Please try logging in.",
                });
                router.push("/login");
                return;
            }
        } catch {
            toast({
                type: "error",
                description:
                    "Account created! However, a network error occurred. Please try logging in.",
            });
            router.push("/login");
            return;
        }

        toast({
            type: "success",
            description: "Welcome! Your account has been created.",
        });

        setIsSuccessful(true);
        router.push("/");
        router.refresh();
    };

    return (
        <AuthForm
            defaultEmail={email}
            isSuccessful={isSuccessful}
            mode="register"
            onSubmit={handleSubmit}
        />
    );
}

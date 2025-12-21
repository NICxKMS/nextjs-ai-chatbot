"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthForm } from "@/features/auth";
import { getSupabaseBrowserClient } from "@/lib/auth/client";
import { toast } from "@/shared/ui";

/**
 * Login Page
 * Ref: oldapp/app/(auth)/login/page.tsx
 *
 * Handles email/password authentication via Supabase.
 * On success: exchanges Supabase token for app session cookie and redirects to home.
 */
export default function LoginPage() {
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

        const supabase = getSupabaseBrowserClient();

        const { data, error } = await supabase.auth.signInWithPassword({
            email: submittedEmail,
            password,
        });

        if (error || !data.session) {
            toast({
                type: "error",
                description: "Invalid credentials!",
            });
            return;
        }

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
                        "Login successful, but session setup failed. Please try again.",
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
                        "Login successful, but session setup failed. Please try again.",
                });
                return;
            }
        } catch {
            toast({
                type: "error",
                description:
                    "Login successful, but session setup failed. Please try again.",
            });
            return;
        }

        setIsSuccessful(true);
        router.push("/");
        router.refresh();
    };

    return (
        <AuthForm
            defaultEmail={email}
            isSuccessful={isSuccessful}
            mode="login"
            onSubmit={handleSubmit}
        />
    );
}

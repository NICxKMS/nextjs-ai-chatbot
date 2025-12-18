"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthForm, SubmitButton } from "@/features/auth";

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
            // TODO: Add toast notification
            console.error("Please provide a valid email and password.");
            return;
        }

        setEmail(submittedEmail);

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email: submittedEmail,
                    password,
                }),
            });

            if (!response.ok) {
                console.error("Invalid credentials!");
                return;
            }

            setIsSuccessful(true);
            router.push("/");
            router.refresh();
        } catch {
            console.error("Login failed. Please try again.");
        }
    };

    return (
        <div className="flex h-dvh w-screen items-start justify-center bg-background pt-12 md:items-center md:pt-0">
            <div className="flex w-full max-w-md flex-col gap-12 overflow-hidden rounded-2xl">
                <div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
                    <h3 className="font-semibold text-xl dark:text-zinc-50">
                        Sign In
                    </h3>
                    <p className="text-gray-500 text-sm dark:text-zinc-400">
                        Use your email and password to sign in
                    </p>
                </div>
                <AuthForm action={handleSubmit} defaultEmail={email}>
                    <SubmitButton isSuccessful={isSuccessful}>
                        Sign in
                    </SubmitButton>
                    <p className="mt-4 text-center text-gray-600 text-sm dark:text-zinc-400">
                        {"Don't have an account? "}
                        <Link
                            className="font-semibold text-gray-800 hover:underline dark:text-zinc-200"
                            href="/register"
                        >
                            Sign up
                        </Link>
                        {" for free."}
                    </p>
                </AuthForm>
            </div>
        </div>
    );
}

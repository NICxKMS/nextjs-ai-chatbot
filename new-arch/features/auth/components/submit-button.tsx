"use client";

import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Button } from "@/shared/components/ui/button";

export type SubmitButtonProps = {
    children: React.ReactNode;
    isSuccessful: boolean;
};

export function SubmitButton({ children, isSuccessful }: SubmitButtonProps) {
    const { pending } = useFormStatus();

    return (
        <Button
            aria-disabled={pending || isSuccessful}
            className="relative"
            disabled={pending || isSuccessful}
            type={pending ? "button" : "submit"}
        >
            {children}

            {(pending || isSuccessful) && (
                <span className="absolute right-4 animate-spin">
                    <LoaderCircle className="size-4" />
                </span>
            )}

            <output aria-live="polite" className="sr-only">
                {pending || isSuccessful ? "Loading" : "Submit form"}
            </output>
        </Button>
    );
}

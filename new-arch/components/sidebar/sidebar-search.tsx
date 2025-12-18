"use client";

import { Search, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SidebarSearchProps = {
    value?: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
};

export function SidebarSearch({
    value = "",
    onChange,
    placeholder = "Search chats...",
    className,
}: SidebarSearchProps) {
    const [isFocused, setIsFocused] = useState(false);

    return (
        <div className={cn("relative", className)}>
            <Search
                className={cn(
                    "-translate-y-1/2 pointer-events-none absolute top-1/2 left-2 h-4 w-4 text-muted-foreground transition-colors",
                    isFocused && "text-foreground"
                )}
            />
            <Input
                className="pr-8 pl-8"
                onBlur={() => setIsFocused(false)}
                onChange={(e) => onChange(e.target.value)}
                onFocus={() => setIsFocused(true)}
                placeholder={placeholder}
                type="search"
                value={value}
            />
            {value && (
                <Button
                    aria-label="Clear search"
                    className="-translate-y-1/2 absolute top-1/2 right-1 h-6 w-6"
                    onClick={() => onChange("")}
                    size="icon"
                    type="button"
                    variant="ghost"
                >
                    <X className="h-3 w-3" />
                </Button>
            )}
        </div>
    );
}

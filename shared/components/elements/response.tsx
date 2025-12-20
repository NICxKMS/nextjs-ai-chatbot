"use client";

import { type ComponentProps, memo } from "react";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import { Streamdown } from "streamdown";
import { cn } from "@/shared/lib/utils";

type ResponseProps = ComponentProps<typeof Streamdown>;

export const Response = memo(
    ({ className, remarkPlugins, rehypePlugins, ...props }: ResponseProps) => {
        const remarkPluginsList = [
            [remarkMath, { singleDollarTextMath: true }] as const,
            ...(remarkPlugins && Array.isArray(remarkPlugins)
                ? remarkPlugins
                : []),
        ] as any;

        const rehypePluginsList = [
            [rehypeKatex, { singleDollarTextMath: true }] as const,
            ...(rehypePlugins && Array.isArray(rehypePlugins)
                ? rehypePlugins
                : []),
        ] as any;

        return (
            <Streamdown
                className={cn(
                    "size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_code]:whitespace-pre-wrap [&_code]:break-words [&_pre]:max-w-full [&_pre]:overflow-x-auto",
                    className
                )}
                rehypePlugins={rehypePluginsList}
                remarkPlugins={remarkPluginsList}
                {...props}
            />
        );
    },
    (prevProps, nextProps) => prevProps.children === nextProps.children
);

Response.displayName = "Response";

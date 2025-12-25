"use client";

import DOMPurify from "dompurify";
import { CheckIcon, CopyIcon } from "lucide-react";
import {
    type ComponentProps,
    createContext,
    type HTMLAttributes,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";
import { type BundledLanguage, codeToHtml, type ShikiTransformer } from "shiki";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/index";

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default timeout in ms for copy feedback indicator */
const COPY_FEEDBACK_TIMEOUT_MS = 2000;

// DOMPurify config to allow code highlighting elements while blocking XSS
const DOMPURIFY_CONFIG = {
    ALLOWED_TAGS: ["pre", "code", "span", "div"],
    ALLOWED_ATTR: ["class", "style"],
    ALLOW_DATA_ATTR: false,
};

// SSR-safe DOMPurify wrapper - returns unsanitized HTML on server (safe since
// code highlighting is client-only via useEffect), sanitizes on client
const sanitizeHtml =
    typeof window !== "undefined"
        ? (html: string) => DOMPurify.sanitize(html, DOMPURIFY_CONFIG)
        : (html: string) => html;

type CodeBlockProps = HTMLAttributes<HTMLDivElement> & {
    code: string;
    language: BundledLanguage;
    showLineNumbers?: boolean;
};

type CodeBlockContextType = {
    code: string;
};

const CodeBlockContext = createContext<CodeBlockContextType>({
    code: "",
});

const lineNumberTransformer: ShikiTransformer = {
    name: "line-numbers",
    line(node, line) {
        node.children.unshift({
            type: "element",
            tagName: "span",
            properties: {
                className: [
                    "inline-block",
                    "min-w-10",
                    "mr-4",
                    "text-right",
                    "select-none",
                    "text-muted-foreground",
                ],
            },
            children: [{ type: "text", value: String(line) }],
        });
    },
};

export async function highlightCode(
    code: string,
    language: BundledLanguage,
    showLineNumbers = false
) {
    const transformers: ShikiTransformer[] = showLineNumbers
        ? [lineNumberTransformer]
        : [];

    return await Promise.all([
        codeToHtml(code, {
            lang: language,
            theme: "one-light",
            transformers,
        }),
        codeToHtml(code, {
            lang: language,
            theme: "one-dark-pro",
            transformers,
        }),
    ]);
}

export const CodeBlock = ({
    code,
    language,
    showLineNumbers = false,
    className,
    children,
    ...props
}: CodeBlockProps) => {
    const [html, setHtml] = useState<string>("");
    const [darkHtml, setDarkHtml] = useState<string>("");
    const mounted = useRef(false);

    useEffect(() => {
        highlightCode(code, language, showLineNumbers).then(([light, dark]) => {
            if (!mounted.current) {
                // Sanitize highlighted HTML to prevent XSS attacks (SSR-safe)
                setHtml(sanitizeHtml(light));
                setDarkHtml(sanitizeHtml(dark));
                mounted.current = true;
            }
        });

        return () => {
            mounted.current = false;
        };
    }, [code, language, showLineNumbers]);

    return (
        <CodeBlockContext.Provider value={{ code }}>
            <div
                className={cn(
                    "group relative w-full overflow-hidden rounded-md border bg-background text-foreground",
                    className
                )}
                {...props}
            >
                <div className="relative">
                    <div
                        className="overflow-auto dark:hidden [&>pre]:m-0 [&>pre]:bg-background! [&>pre]:p-4 [&>pre]:text-foreground! [&>pre]:text-sm [&_code]:font-mono [&_code]:text-sm"
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: HTML is sanitized with DOMPurify
                        dangerouslySetInnerHTML={{ __html: html }}
                    />
                    <div
                        className="hidden overflow-auto dark:block [&>pre]:m-0 [&>pre]:bg-background! [&>pre]:p-4 [&>pre]:text-foreground! [&>pre]:text-sm [&_code]:font-mono [&_code]:text-sm"
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: HTML is sanitized with DOMPurify
                        dangerouslySetInnerHTML={{ __html: darkHtml }}
                    />
                    {children && (
                        <div className="absolute top-2 right-2 flex items-center gap-2">
                            {children}
                        </div>
                    )}
                </div>
            </div>
        </CodeBlockContext.Provider>
    );
};

export type CodeBlockCopyButtonProps = ComponentProps<typeof Button> & {
    onCopy?: () => void;
    onError?: (error: Error) => void;
    /** Timeout in ms for copy feedback indicator */
    timeout?: number;
};

export const CodeBlockCopyButton = ({
    onCopy,
    onError,
    timeout = COPY_FEEDBACK_TIMEOUT_MS,
    children,
    className,
    ...props
}: CodeBlockCopyButtonProps) => {
    const [isCopied, setIsCopied] = useState(false);
    const { code } = useContext(CodeBlockContext);

    const copyToClipboard = async () => {
        if (typeof window === "undefined" || !navigator?.clipboard?.writeText) {
            onError?.(new Error("Clipboard API not available"));
            return;
        }

        try {
            await navigator.clipboard.writeText(code);
            setIsCopied(true);
            onCopy?.();
            setTimeout(() => setIsCopied(false), timeout);
        } catch (error) {
            onError?.(error as Error);
        }
    };

    const Icon = isCopied ? CheckIcon : CopyIcon;

    return (
        <Button
            aria-label={isCopied ? "Copied" : "Copy code"}
            className={cn("shrink-0", className)}
            onClick={copyToClipboard}
            size="icon"
            variant="ghost"
            {...props}
        >
            {children ?? <Icon size={14} />}
        </Button>
    );
};

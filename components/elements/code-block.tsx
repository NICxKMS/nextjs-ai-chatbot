"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import dynamic from "next/dynamic";
import type {
    ComponentProps,
    CSSProperties,
    HTMLAttributes,
    ReactNode,
} from "react";
import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import type { SyntaxHighlighterProps } from "react-syntax-highlighter";
import { Button } from "@/components/ui/button";
import { ChatSDKError } from "@/lib/errors";
import { cn } from "@/lib/utils";

// Type for syntax highlighter style objects
type SyntaxStyle = { [key: string]: CSSProperties };

// Lazy-load SyntaxHighlighter to reduce initial bundle (~150KB savings)
const SyntaxHighlighter = dynamic(
    () =>
        import("react-syntax-highlighter").then((mod) => {
            // Store reference for language registration
            syntaxHighlighterRef = mod.PrismLight;
            return mod.PrismLight;
        }),
    {
        ssr: false,
        loading: () => (
            <pre className="m-0 overflow-auto bg-background p-4 font-mono text-foreground text-sm">
                Loading...
            </pre>
        ),
    }
) as React.ComponentType<SyntaxHighlighterProps>;

// Reference to the loaded SyntaxHighlighter for language registration
let syntaxHighlighterRef:
    | typeof import("react-syntax-highlighter").PrismLight
    | null = null;

// Lazy-load themes
const getThemes = async () => {
    const styles = await import(
        "react-syntax-highlighter/dist/esm/styles/prism"
    );
    return {
        oneDark: styles.oneDark as SyntaxStyle,
        oneLight: styles.oneLight as SyntaxStyle,
    };
};

// Cache for loaded themes
let themesCache: { oneDark: SyntaxStyle; oneLight: SyntaxStyle } | null = null;

// Track which languages have already been registered to avoid duplicates.
const REGISTERED_LANGUAGES = new Set<string>();

// Normalize common aliases to Prism's expected language identifiers.
const LANGUAGE_ALIASES: Record<string, string> = {
    js: "javascript",
    ts: "typescript",
    tsx: "tsx",
    jsx: "jsx",
    md: "markdown",
    yml: "yaml",
    sh: "bash",
    shell: "bash",
    "c++": "cpp",
    cplusplus: "cpp",
    "c#": "csharp",
    cs: "csharp",
    html: "markup",
    xml: "markup",
    dockerfile: "docker",
    txt: "text",
    plaintext: "text",
};

function normalizeLanguage(language: string | undefined): string | undefined {
    if (!language) {
        return;
    }
    const lower = language.toLowerCase();
    return LANGUAGE_ALIASES[lower] ?? lower;
}

async function registerLanguageDynamically(language: string): Promise<boolean> {
    if (!language) {
        return false;
    }
    const lang = normalizeLanguage(language);
    if (!lang) {
        return false;
    }
    if (REGISTERED_LANGUAGES.has(lang)) {
        return true;
    }

    // Wait for SyntaxHighlighter to be loaded
    if (!syntaxHighlighterRef) {
        // Trigger load and wait
        await import("react-syntax-highlighter").then((mod) => {
            syntaxHighlighterRef = mod.PrismLight;
        });
    }

    if (!syntaxHighlighterRef) {
        return false;
    }

    try {
        // Create split chunks for all prism languages; load only the requested one at runtime.
        const mod: { default?: unknown; [key: string]: unknown } = await import(
            /* webpackInclude: /\.js$/ */
            `react-syntax-highlighter/dist/esm/languages/prism/${lang}`
        );
        const grammar = mod.default ?? mod[lang];
        if (grammar) {
            syntaxHighlighterRef.registerLanguage(lang, grammar);
            REGISTERED_LANGUAGES.add(lang);
            return true;
        }
    } catch {
        // Fallback to plain rendering if the language isn't available.
    }
    return false;
}

type CodeBlockContextType = {
    code: string;
};

const CodeBlockContext = createContext<CodeBlockContextType>({
    code: "",
});

export type CodeBlockProps = HTMLAttributes<HTMLDivElement> & {
    code: string;
    language: string;
    showLineNumbers?: boolean;
    children?: ReactNode;
};

export const CodeBlock = ({
    code,
    language,
    showLineNumbers = false,
    className,
    children,
    ...props
}: CodeBlockProps) => (
    <CodeBlockContext.Provider value={{ code }}>
        <DynamicLanguageCodeBlock
            {...props}
            className={className}
            code={code}
            language={language}
            showLineNumbers={showLineNumbers}
        >
            {children}
        </DynamicLanguageCodeBlock>
    </CodeBlockContext.Provider>
);

function DynamicLanguageCodeBlock({
    code,
    language,
    showLineNumbers,
    className,
    children,
    ...props
}: CodeBlockProps) {
    const normalized = useMemo(() => normalizeLanguage(language), [language]);
    const [readyLang, setReadyLang] = useState<string | undefined>(() =>
        normalized && REGISTERED_LANGUAGES.has(normalized)
            ? normalized
            : undefined
    );
    const [themes, setThemes] = useState<{
        oneDark: SyntaxStyle;
        oneLight: SyntaxStyle;
    } | null>(themesCache);
    const mountedRef = useRef(false);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    // Load themes on mount
    useEffect(() => {
        if (themesCache) {
            setThemes(themesCache);
            return;
        }
        getThemes().then((loadedThemes) => {
            if (!mountedRef.current) {
                return;
            }
            themesCache = loadedThemes;
            setThemes(loadedThemes);
        });
    }, []);

    useEffect(() => {
        let cancelled = false;
        if (!normalized) {
            setReadyLang(undefined);
            return;
        }
        if (REGISTERED_LANGUAGES.has(normalized)) {
            setReadyLang(normalized);
            return;
        }
        registerLanguageDynamically(normalized).then((ok) => {
            if (cancelled || !mountedRef.current) {
                return;
            }
            setReadyLang(ok ? normalized : undefined);
        });
        return () => {
            cancelled = true;
        };
    }, [normalized]);

    const effectiveLanguage = readyLang;

    // Show fallback while themes are loading
    if (!themes) {
        return (
            <div
                className={cn(
                    "relative w-full overflow-hidden rounded-md border bg-background text-foreground",
                    className
                )}
                {...props}
            >
                <pre className="m-0 overflow-auto bg-background p-4 font-mono text-foreground text-sm">
                    {code}
                </pre>
                {children && (
                    <div className="absolute top-2 right-2 flex items-center gap-2">
                        {children}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div
            className={cn(
                "relative w-full overflow-hidden rounded-md border bg-background text-foreground",
                className
            )}
            {...props}
        >
            <div className="relative">
                <SyntaxHighlighter
                    className="overflow-hidden dark:hidden"
                    codeTagProps={{
                        className: "font-mono text-sm",
                    }}
                    customStyle={{
                        margin: 0,
                        padding: "1rem",
                        fontSize: "0.875rem",
                        background: "hsl(var(--background))",
                        color: "hsl(var(--foreground))",
                        overflowX: "auto",
                        overflowWrap: "break-word",
                        wordBreak: "break-all",
                    }}
                    language={effectiveLanguage}
                    lineNumberStyle={{
                        color: "hsl(var(--muted-foreground))",
                        paddingRight: "1rem",
                        minWidth: "2.5rem",
                    }}
                    showLineNumbers={showLineNumbers}
                    style={themes.oneLight}
                >
                    {code}
                </SyntaxHighlighter>
                <SyntaxHighlighter
                    className="hidden overflow-hidden dark:block"
                    codeTagProps={{
                        className: "font-mono text-sm",
                    }}
                    customStyle={{
                        margin: 0,
                        padding: "1rem",
                        fontSize: "0.875rem",
                        background: "hsl(var(--background))",
                        color: "hsl(var(--foreground))",
                        overflowX: "auto",
                        overflowWrap: "break-word",
                        wordBreak: "break-all",
                    }}
                    language={effectiveLanguage}
                    lineNumberStyle={{
                        color: "hsl(var(--muted-foreground))",
                        paddingRight: "1rem",
                        minWidth: "2.5rem",
                    }}
                    showLineNumbers={showLineNumbers}
                    style={themes.oneDark}
                >
                    {code}
                </SyntaxHighlighter>
                {children && (
                    <div className="absolute top-2 right-2 flex items-center gap-2">
                        {children}
                    </div>
                )}
            </div>
        </div>
    );
}

export type CodeBlockCopyButtonProps = ComponentProps<typeof Button> & {
    onCopy?: () => void;
    onError?: (error: Error) => void;
    timeout?: number;
};

export const CodeBlockCopyButton = ({
    onCopy,
    onError,
    timeout = 2000,
    children,
    className,
    ...props
}: CodeBlockCopyButtonProps) => {
    const [isCopied, setIsCopied] = useState(false);
    const { code } = useContext(CodeBlockContext);

    const copyToClipboard = async () => {
        if (typeof window === "undefined" || !navigator.clipboard.writeText) {
            onError?.(new ChatSDKError("bad_request:ui:clipboard_unavailable"));
            return;
        }

        try {
            await navigator.clipboard.writeText(code);
            setIsCopied(true);
            onCopy?.();
            setTimeout(() => setIsCopied(false), timeout);
        } catch (error) {
            onError?.(
                new ChatSDKError(
                    "bad_request:ui:clipboard_copy_failed",
                    (error as Error)?.message
                )
            );
        }
    };

    const Icon = isCopied ? CheckIcon : CopyIcon;

    return (
        <Button
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

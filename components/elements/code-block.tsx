"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import type { ComponentProps, HTMLAttributes, ReactNode } from "react";
import {
	createContext,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import {
	oneDark,
	oneLight,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import { Button } from "@/components/ui/button";
import { ChatSDKError } from "@/lib/errors";
import { cn } from "@/lib/utils";

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

	try {
		// Create split chunks for all prism languages; load only the requested one at runtime.
		const mod = await import(
			/* webpackInclude: /\.js$/ */
			`react-syntax-highlighter/dist/esm/languages/prism/${lang}`
		);
		const grammar = (mod as any).default ?? (mod as any)[lang];
		if (grammar) {
			// registerLanguage exists on PrismLight
			(SyntaxHighlighter as any).registerLanguage(lang, grammar);
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
	const mountedRef = useRef(false);

	useEffect(() => {
		mountedRef.current = true;
		return () => {
			mountedRef.current = false;
		};
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
					style={oneLight}
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
					style={oneDark}
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

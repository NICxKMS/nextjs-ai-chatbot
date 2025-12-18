"use server";

/**
 * Web Search Tool Definition
 * @module new-arch/lib/ai/tools/definitions/search-web
 *
 * Tool for performing web searches to retrieve relevant information.
 * Integrates with Tavily API for production search capabilities.
 */

import { tool } from "ai";
import { z } from "zod";

// ============================================================================
// Types
// ============================================================================

type SearchResult = {
    title: string;
    url: string;
    snippet: string;
};

type SearchWebResult = {
    query: string;
    results: SearchResult[];
    totalResults: number;
};

type SearchWebError = {
    error: string;
};

// ============================================================================
// Schema
// ============================================================================

const inputSchema = z.object({
    query: z
        .string()
        .min(1)
        .max(500)
        .describe("The search query to find relevant information"),
    maxResults: z
        .number()
        .int()
        .min(1)
        .max(10)
        .default(5)
        .optional()
        .describe("Maximum number of results to return (1-10, default 5)"),
});

type SearchWebInput = z.infer<typeof inputSchema>;

// ============================================================================
// Tool Definition
// ============================================================================

/**
 * Web Search Tool
 *
 * Performs web searches to retrieve relevant information.
 * Currently returns a placeholder indicating the feature requires
 * external API integration.
 *
 * @example
 * ```ts
 * const result = await searchWeb.execute({
 *   query: 'Next.js server components',
 *   maxResults: 5,
 * });
 * ```
 */
/**
 * Perform web search using Tavily API.
 * Falls back to error message if API key is not configured.
 */
async function performTavilySearch(
    query: string,
    maxResults: number
): Promise<SearchWebResult | SearchWebError> {
    const apiKey = process.env.TAVILY_API_KEY;

    if (!apiKey) {
        return {
            error: "Web search is not configured. Set TAVILY_API_KEY environment variable to enable search.",
        };
    }

    try {
        const response = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                api_key: apiKey,
                query,
                max_results: maxResults,
                search_depth: "basic",
                include_answer: false,
                include_raw_content: false,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(
                "[search-web] Tavily API error:",
                response.status,
                errorText
            );
            return {
                error: `Search failed: ${response.status === 401 ? "Invalid API key" : "Service unavailable"}`,
            };
        }

        const data = (await response.json()) as {
            results: Array<{
                title: string;
                url: string;
                content: string;
            }>;
        };

        return {
            query,
            results: data.results.map((r) => ({
                title: r.title,
                url: r.url,
                snippet: r.content,
            })),
            totalResults: data.results.length,
        };
    } catch (error) {
        console.error("[search-web] Search error:", error);
        return {
            error: "Search failed due to network error. Please try again.",
        };
    }
}

export const searchWeb = tool({
    description:
        "Search the web for relevant information. Use when you need up-to-date information or facts not in your training data.",
    parameters: inputSchema,
    execute: (input: SearchWebInput) => {
        const { query, maxResults = 5 } = input;

        // Validate query
        if (!query.trim()) {
            return {
                error: "Search query cannot be empty",
            } as SearchWebError;
        }

        // Perform search using Tavily API
        return performTavilySearch(query, maxResults);
    },
});

// ============================================================================
// Factory Export (for future context injection)
// ============================================================================

type SearchWebContext = {
    apiKey?: string;
    searchProvider?: "bing" | "google" | "brave" | "tavily";
    baseUrl?: string;
};

/**
 * Create Web Search Tool Factory
 *
 * Creates a configured web search tool with API credentials.
 * Use for production deployments with actual search API integration.
 *
 * @param context - Search configuration with API credentials
 * @returns Configured tool instance
 *
 * @example
 * ```ts
 * const search = createSearchWebTool({
 *   apiKey: process.env.TAVILY_API_KEY,
 *   searchProvider: 'tavily',
 * });
 *
 * const result = await search.execute({ query: 'AI news' });
 * ```
 */
export function createSearchWebTool(_context?: SearchWebContext) {
    // Currently uses environment variable for API key
    // Future: Support context-based configuration for different providers
    return searchWeb;
}

// ============================================================================
// Export Types
// ============================================================================

export type { SearchResult, SearchWebContext, SearchWebInput, SearchWebResult };

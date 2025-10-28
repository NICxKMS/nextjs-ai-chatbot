export type ProviderId =
  | "openai"
  | "google"
  | "openrouter"
  | "vercel-gateway"
  | "cloudflare-workers"
  | "cloudflare-gateway";

export const PROVIDER_DISPLAY_NAMES: Record<ProviderId, string> = {
  openai: "OpenAI",
  google: "Google Gemini",
  openrouter: "OpenRouter",
  "vercel-gateway": "Vercel AI Gateway",
  "cloudflare-workers": "Cloudflare Workers AI",
  "cloudflare-gateway": "Cloudflare AI Gateway",
};

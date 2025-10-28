# Multi-Provider Model Integration Plan

## Scope

- Replace the single Vercel Gateway integration with a multi-provider registry that supports Google Gemini, OpenAI (ChatGPT), OpenRouter, Vercel AI Gateway, and Cloudflare AI Gateway via the `ai` SDK.
- Dynamically fetch available models per provider while exposing a curated “best/latest” shortlist for the UI.
- Update server, shared model metadata, validation, and entitlements to use the expanded catalog.
- Ensure runtime continues to call `ai` SDK chat/text functions, selecting models solely by the model ID supplied from the API.

## Steps

1. Provider Registry & Dynamic Discovery
   - Add provider-specific discovery utilities in `lib/ai/model-registry.ts` that call each vendor’s list-models API (OpenAI, Google Gemini, OpenRouter, Cloudflare Workers AI, Cloudflare AI Gateway) using project environment keys.
   - Introduce dual caching: default in-memory cache with 1-hour TTL, plus a `forceRefresh` option (and small admin hook) to bypass cache on demand.
   - Ensure `lib/ai/providers.ts` builds its custom provider from the registry output, falling back to the latest curated flagships when discovery fails.

2. Shared Model Metadata
   - Regenerate `lib/ai/models.ts` metadata from the discovered catalog, describing provider, release window, capabilities, reasoning/vision support, etc.
   - Maintain a curated “best/latest” shortlist chosen from currently released flagship models (based on web research) for fallback mode.

3. API & UI Wiring
   - Relax the chat API schema and entitlements to accept arbitrary discovered IDs while guarding against missing entries.
   - Redesign `components/model-selector.tsx` (and the compact prompt selector) to group models by provider, surface detailed stats, show curated badges, and expose a manual refresh action/state indicator.
   - Ensure attachments/tool availability reacts to reasoning versus chat models based on metadata attributes.

4. Tests, Docs & Dependencies
   - Expand tests to cover discovery success/failure, cache TTL vs. force refresh, and UI rendering of grouped catalogs with fallback messaging.
   - Document required environment variables, discovery cadence, and instructions for triggering manual refresh.
   - Align mocks/fixtures with the new structure so test mode mirrors dynamic metadata.

### To-dos

- [ ] Implement provider discovery with hourly + on-demand caching, dynamic registry mappings, and updated fallbacks.
- [ ] Regenerate shared metadata from dynamic registry results and maintain curated latest fallbacks.
- [ ] Update API schema, entitlements, and UI selector to surface grouped model catalog with details and fallbacks.
- [ ] Add tests for discovery + fallback, document env vars and cache behavior.


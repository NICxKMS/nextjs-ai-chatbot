---
agent: Agent_AICore
task_ref: Task 1.12
status: Completed
ad_hoc_delegation: false
compatibility_issues: false
important_findings: false
---

# Task Log: Task 1.12 - Expand Curated Model List

## Summary
Expanded the model catalog in `lib/ai/registry.ts` from ~9 models to 35 models by adding comprehensive model definitions with rich metadata, organized by category (title, OpenAI, Google Gemini, Gemma 3, image/video generation, Claude, DeepSeek, Qwen, free models, and gateway providers).

## Details
- Read reference implementation from `archive/oldapp/lib/ai/curated-models.ts` (lines 1-582) to understand original model catalog structure
- Analyzed current `lib/ai/registry.ts` implementation and `ModelDefinition` interface in `lib/ai/types.ts`
- Compared old `ModelMetadata` type with new `ModelDefinition` interface - adapted fields appropriately
- Added 35 curated models organized by category:
  - **Title Model** (1): Gemini Flash Lite optimized for title generation
  - **OpenAI Models** (4): GPT-4o, GPT-4o Mini, o1, GPT-4.1
  - **Google Gemini 3.0** (1): Gemini 3.0 Pro Preview
  - **Gemma 3 Family** (4): 1B, 4B, 12B, 27B (all free via OpenRouter)
  - **Gemini 2.5 Family** (5): Pro, Flash, Flash Lite, Flash Image
  - **Image Generation** (3): Imagen 4, Imagen 4 Fast, Imagen 4 Ultra
  - **Video Generation** (2): Veo 3, Veo 3 Fast
  - **Claude Models** (2): Claude 3.7 Sonnet, Claude 3.5 Sonnet (via OpenRouter)
  - **DeepSeek Free Models** (2): R1, V3 Chat (reasoning models)
  - **Qwen Models** (2): Qwen Max, Qwen 3 Coder 480B
  - **Free Open-Source Models** (4): Venice Uncensored, GPT-OSS 120B, GPT-OSS 20B, GLM-4.5 Air, Kimi K2
  - **XAI** (1): Grok 2
  - **Gateway Providers** (3): Vercel Gateway GPT-4o, Cloudflare AI Gateway Gemini models
- Used legacy `ModelCapabilities` boolean format for compatibility
- Added `reasoningType` and `thinkingBudget` for reasoning models
- Added `modalities` and `capabilityList` arrays for extended metadata
- Maintained backward compatibility with existing model IDs

## Output
- **Modified File**: `lib/ai/registry.ts`
- **Model Count**: 35 curated models (expanded from ~9)
- **Categories Added**: 14 model categories with rich metadata
- **Key Model Types**:
  - Free models via OpenRouter (Gemma 3 family, DeepSeek, GPT-OSS, GLM-4.5, Kimi K2, Qwen 3 Coder, Venice)
  - Latest flagship models (Gemini 3.0 Pro Preview, Claude 3.7 Sonnet, GPT-4.1)
  - Image generation (Imagen 4 variants, Gemini 2.5 Flash Image)
  - Video generation (Veo 3 variants)
  - Reasoning models (o1, DeepSeek R1, Gemini 2.5 Pro/Flash, Claude 3.7 Sonnet)

## Issues
None

## Next Steps
- Consider adding model-specific configuration for title generation (separate from chat models)
- Monitor for new model releases from providers to keep catalog current
- Add pricing metadata when available from providers
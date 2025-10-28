# Chain-of-Thought (CoT) Status Report

## Current Status

**⚠️ Google Gemini 2.5 Pro: NO CoT Output Visibility**

As of October 2025, **Google has removed access to raw Chain-of-Thought (CoT) outputs from Gemini 2.5 Pro**. While the model internally uses thinking processes to enhance reasoning, the thinking tags are not returned in the API response, making them unavailable for extraction.

## Models with Working Chain-of-Thought

The following models have **verified CoT output visibility** and will display "Thinking..." during inference:

### ✅ OpenAI Models (WORKING)

- **GPT-o3-mini** (`openai:o3-mini`)

  - Reasoning Type: `openai-thinking`
  - Uses: `<think>` tags
  - Thinking Budget: 8,000 tokens
  - Status: ✅ CoT Output Visible

- **GPT-4.1** (`openai:gpt-4.1`)
  - Reasoning Type: `openai-thinking`
  - Uses: `<think>` tags
  - Thinking Budget: 6,000 tokens
  - Status: ✅ CoT Output Visible

### ✅ Anthropic Claude Models (WORKING)

- **Claude 3.7 Sonnet** (`openrouter:anthropic/claude-3.7-sonnet`)
  - Reasoning Type: `anthropic-thinking`
  - Uses: `<thinking>` tags
  - Thinking Budget: 8,000 tokens
  - Status: ✅ CoT Output Visible (Extended Thinking Mode)

### ✅ DeepSeek Models (WORKING)

- **DeepSeek R1** (`openrouter:deepseek/deepseek-r1`)
  - Reasoning Type: `deepseek-thinking`
  - Uses: `<think>` tags
  - Thinking Budget: 6,000 tokens
  - Status: ✅ CoT Output Visible (Native Chain-of-Thought)

### ✅ Other Models (WORKING)

- **Grok 3** (`vercel-gateway:xai/grok-3`)

  - Reasoning Type: `internal-thinking`
  - Uses: `<think>` tags
  - Thinking Budget: 6,000 tokens
  - Status: ✅ CoT Output Visible

- **Qwen3 Max** (`vercel-gateway:alibaba/qwen3-max`)
  - Reasoning Type: `internal-thinking`
  - Uses: `<think>` tags
  - Thinking Budget: 10,000 tokens
  - Status: ✅ CoT Output Visible

## Models WITHOUT Chain-of-Thought

### ❌ Google Gemini Models (NO CoT OUTPUT)

- **Gemini 2.5 Pro** (`google:gemini-2.5-pro`)

  - Status: ❌ Internal thinking only - **NO output visibility**
  - Reason: Google removed CoT output access in October 2025
  - Note: Model has been updated to remove `reasoning` capability

- **Gemini 2.5 Deep Think** (`google:gemini-2.5-deep-think`)

  - Status: ❌ Internal thinking only - **NO output visibility**
  - Reason: Google removed CoT output access

- **Gemini 2.5 Flash** (`google:gemini-2.5-flash`)
  - Status: ❌ No reasoning capability

### ❌ Standard Chat Models (NO REASONING)

- GPT-4o, Claude 3.5 Sonnet, Gemini Flash Lite, etc.
- These models lack reasoning/extended thinking capabilities

## Why Google Removed CoT Output

According to Google's official statement (October 2025):

1. **UX Simplification**: Raw CoT outputs were lengthy and deemed unnecessary for general users
2. **Streamlined Responses**: Google provided simplified summaries instead
3. **Future Plans**: Google indicated plans for "developer mode" with structured reasoning trace access

However, for developers, this decision impacts:

- Debugging capabilities
- Understanding model decision-making
- Fine-tuning and optimization

## How to Use Chain-of-Thought

### For Supported Models:

1. Select a model with reasoning capability (e.g., GPT-o3-mini, Claude 3.7 Sonnet)
2. Send your message
3. The UI will display "Thinking..." during reasoning
4. After completion, view the reasoning process in the collapsible "Thought for Xs" section

### Implementation Details:

- **File**: `lib/ai/providers.ts`
- **Middleware**: `extractReasoningMiddleware` from Vercel AI SDK
- **Detection**: Models must have:
  - `"reasoning"` in `capabilities`
  - `reasoningType !== "none"`
  - Valid `reasoningType` mapping to XML tag names

### Tag Mappings:

```typescript
const getReasoningTagName = (reasoningType?: ReasoningType): string => {
  switch (reasoningType) {
    case "openai-thinking":
      return "think"; // OpenAI o3/o4
    case "anthropic-thinking":
      return "thinking"; // Claude extended thinking
    case "gemini-thinking":
      return "think"; // Gemini (no output)
    case "deepseek-thinking":
      return "think"; // DeepSeek R1
    case "internal-thinking":
      return "think"; // Grok, Qwen
    default:
      return "think";
  }
};
```

## Architecture

```
User Message
    ↓
app/(chat)/api/chat/route.ts
    ↓
1. Check selectedModel.reasoningType
2. If "none" → Skip middleware
3. If not "none" → Build providerOptions with thinking config
    ↓
myProvider.languageModel()
    ↓
1. Get model metadata
2. Check for "reasoning" capability
3. If present → Wrap with extractReasoningMiddleware
4. Middleware extracts <think> or <thinking> tags
    ↓
Render thinking in UI
    ↓
Display "Thinking for Xs" with collapsible reasoning content
```

## Provider-Specific Configuration

### OpenAI

```typescript
providerOptions.openai = { reasoningEffort: "high" };
```

### Anthropic

```typescript
providerOptions.anthropic = { thinkingBudget: 8000 };
```

### Google (No Effect Currently)

```typescript
providerOptions.google = {
  thinkingConfig: {
    type: "enabled",
    budgetTokens: 10_000,
  },
};
```

### DeepSeek

```typescript
providerOptions.deepseek = { reasoningLevel: "high" };
```

## Testing CoT

To test chain-of-thought functionality:

1. **Use GPT-o3-mini**: Most reliable, instant CoT output
2. **Use Claude 3.7 Sonnet**: Extended thinking mode works well
3. **Use DeepSeek R1**: Open-source alternative with native CoT
4. **Avoid Gemini 2.5 Pro**: No output visibility

## Future Considerations

- Monitor Google's API updates for potential CoT re-enablement
- Consider implementing prompt-based reasoning fallback for Gemini models
- Track new reasoning model releases from other providers

---

**Last Updated**: October 28, 2025
**Status**: Chain-of-thought visibility working for OpenAI, Anthropic, DeepSeek, and alternative models

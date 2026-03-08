FLOW: Settings Store (localStorage → useSyncExternalStore → Cross-Tab Sync)
ENTRY: Module load (initial read from localStorage) OR user updates settings via `updateSettings(partial)`
STEPS:
  1. Module load (features/settings/hooks/use-settings.ts) → `typeof window !== "undefined"` guard → `localStorage.getItem("chat-settings")` → if found, `parseStoredSettings(value)` → Zod-validates via `settingsSchema.safeParse({ ...DEFAULT_SETTINGS, ...parsed })` → sets module-level `state` variable
  2. If localStorage is empty or parse fails → `state = DEFAULT_SETTINGS` (temperature=0.7, topP=1, maxOutputTokens=4096, systemPrompt="", enableReasoning=false, contextDisplayMode="compact")
  3. `useSettings()` → calls `useSettingsSelector(settings => settings)` → `useSyncExternalStore(settingsStore.subscribe, getSnapshot, getServerSnapshot)` → returns current `SettingsState` snapshot
  4. `useSettingsSelector(selector)` → subscribes to store, derives slice via `selector(snapshot)` → re-renders only when selected value changes (referential equality)
  5. `useSettingsSetter()` → returns pre-built stable `actions` object `{ updateSettings, resetSettings }` → NO subscription, NO re-render on settings change (write-only hook)
  6. `updateSettings(partial)` → Zod-validates partial via `partialSettingsSchema.safeParse(partial)` → if invalid, returns `false` → if valid, merges `{ ...state, ...result.data }` → `localStorage.setItem("chat-settings", JSON.stringify(nextState))` → `setState(nextState)` → `emitChange()` → subscribers re-render
  7. `resetSettings()` → `localStorage.removeItem("chat-settings")` → `setState(DEFAULT_SETTINGS)` → `emitChange()` → subscribers see defaults
  8. Cross-tab sync: `settingsStore.subscribe(listener)` → calls `ensureStorageListener()` → registers `window.addEventListener("storage", handleStorageEvent)` ONCE (guarded by `hasStorageListener` flag)
  9. Tab B updates localStorage → Tab A receives `StorageEvent` → `handleStorageEvent(event)` → checks `event.key === "chat-settings"` → `syncStoredSettings(event.newValue)` → parses + validates → `setState(nextState)` → subscribers in Tab A re-render
  10. If `event.newValue` is null (key removed) → `setState(DEFAULT_SETTINGS)` — reset propagated across tabs
  11. Last subscriber unsubscribes → `cleanupStorageListener()` checks `listeners.size === 0` → `window.removeEventListener("storage", handleStorageEvent)` → `hasStorageListener = false` — lazy cleanup
  12. SSR path: `getServerSnapshot()` → returns `DEFAULT_SETTINGS` → ensures server render matches pre-hydration client state (no localStorage on server)
  13. Consumer: `useChatSession` → `useSettingsSelector(s => s)` → reads full settings → stores in `settingsRef.current` for stale-closure-safe access in transport callback → `prepareSendMessagesRequest` attaches `settings: settingsRef.current` to API request body
BOTTLENECKS:
  - `localStorage.setItem` is synchronous and writes to disk — on slow storage this blocks the main thread. Each `updateSettings` call triggers a full JSON.stringify + sync write.
  - `parseStoredSettings` always merges with `DEFAULT_SETTINGS` before Zod parse — ensures forward compatibility when new fields are added, but adds an extra spread + parse on every read.
  - Storage event listener is process-scoped (one per tab) but fires for ALL storage key changes — the `event.key !== STORAGE_KEY` check is cheap but still runs on unrelated changes.
WASTE:
  - `useSettingsSelector(s => s)` in `useSettings()` wraps `useSyncExternalStore` with an identity selector — the selector overhead (function call + Object.is check) adds no filtering value. Could use `useSyncExternalStore` directly.
  - `useChatSession` subscribes to the full settings object via `useSettingsSelector(s => s)` — any setting change (e.g., contextDisplayMode) triggers an object reference change and a `useChatSession` re-render, even though only model-related settings (temperature, topP, etc.) are sent to the API. However, the ref pattern (`settingsRef.current = settings`) means the re-render doesn't cascade to children.
  - Zod validation runs on every `updateSettings` call AND on every cross-tab sync, even though the store's own writes are already validated — double validation on the write path.
SIMPLIFICATION OPPORTUNITIES:
  - The `ensureStorageListener` / `cleanupStorageListener` lazy registration pattern could be simplified to always-on registration if the app always has at least one settings consumer mounted (which it does — `useChatSession` always subscribes).
  - `useSettings()` could be a direct export of `useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)` without routing through `useSettingsSelector`, avoiding the identity selector overhead.
  - The `partialSettingsSchema = settingsSchema.partial()` is computed at module level, which is correct. But the full `settingsSchema` is also used in `parseStoredSettings` — consider sharing one parse path.
EXIT: Settings state is consumed by: (1) `useChatSession` → attached to every `/api/chat` request body as `settings`, (2) any UI components that display/edit settings, (3) cross-tab windows that auto-sync via StorageEvent. Server snapshot ensures SSR hydration safety with DEFAULT_SETTINGS.

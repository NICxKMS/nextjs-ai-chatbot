# Scout Report: Shard 05 - Settings Feature

```
| Files in shard          | 14 |
| Total LOC               | 2,720 |
| Exports catalogued      | 67 |
| Cross-shard edges found | 12 |
| Issues flagged          | 11 |
| Critical complexity (>10)| 0 |
```

---

## File Inventory

### 1. `features/settings/index.ts`
| Attribute | Value |
|-----------|-------|
| Size | 117 LOC |
| Classification | Entry point (barrel export) |
| Complexity | 1 |
| Exports | ModelSelector, SettingsButton, SettingsSheet, ThemeToggle, ThemeToggleButton, SettingsStore, DEFAULT_APP_SETTINGS, SettingsProvider, useSamplingSettings, useSettings, useSettingsModelSelection, useSettingsSnapshot, useSystemPrompt, UseAppSettingsReturn, UseModelSelectionReturn, UseThemeReturn, DEFAULT_PREFERENCES, useAppSettings, useModelSelectionHook, useTheme, clearAllData, clearArtifacts, clearChats, exportUserData, getAppSettings, getPreferences, resetAppSettings, resetPreferences, updateAppSettings, updatePreferences, appSettingsSchema, fontSizeSchema, modelCapabilitySchema, modelOptionSchema, samplingSettingsSchema, themeModeSchema, updateAppSettingsSchema, updateUserPreferencesSchema, userPreferencesSchema, AppSettings, ModelCapability, ModelConfig, ModelOption, ModelSelectorProps, SamplingSettings, SettingsButtonProps, SettingsContextValue, SettingsSheetProps, SettingsState, ThemeConfig, ThemeMode, ThemeToggleProps, UpdatePreferencesInput, UpdatePreferencesResult, UserPreferences, DEFAULT_SAMPLING |

**Imports:**
- Internal: `./components`, `./hooks`, `./actions`, `./schemas`, `./types`

---

### 2. `features/settings/types.ts`
| Attribute | Value |
|-----------|-------|
| Size | 296 LOC |
| Classification | Type definitions |
| Complexity | 2 |
| Exports | ThemeMode, ThemeConfig, ModelCapability, ModelOption, ModelConfig, SamplingSettings, UserPreferences, AppSettings, SettingsState, SettingsContextValue, SettingsSheetProps, SettingsButtonProps, ThemeToggleProps, ModelSelectorProps, UpdatePreferencesInput, UpdatePreferencesResult, DEFAULT_PREFERENCES, DEFAULT_SAMPLING, DEFAULT_APP_SETTINGS |

**Imports:**
- External: `@/lib/ai/constants` (DEFAULT_MAX_OUTPUT_TOKENS, DEFAULT_TEMPERATURE, DEFAULT_TOP_P)

**Cross-shard edges:**
- `@/lib/ai/constants` → constants for default sampling values

---

### 3. `features/settings/components/index.ts`
| Attribute | Value |
|-----------|-------|
| Size | 20 LOC |
| Classification | Entry point (barrel export) |
| Complexity | 1 |
| Exports | ModelSelector, SettingsStore, DEFAULT_APP_SETTINGS, SettingsProvider, useSamplingSettings, useSettings, useSettingsModelSelection, useSettingsSnapshot, useSystemPrompt, SettingsButton, SettingsSheet, ThemeToggle, ThemeToggleButton |

**Imports:**
- Internal: `./model-selector`, `./settings-provider`, `./settings-sheet`, `./theme-toggle`

---

### 4. `features/settings/components/settings-provider.tsx`
| Attribute | Value |
|-----------|-------|
| Size | 345 LOC |
| Classification | Domain logic (context provider) |
| Complexity | 8 |
| Exports | SettingsStore, SettingsProvider, useSettings, useSettingsSnapshot, useSettingsModelSelection, useSamplingSettings, useSystemPrompt, DEFAULT_APP_SETTINGS |

**Imports:**
- External: `react` (createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState)
- External: `usehooks-ts` (useLocalStorage)
- External: `@/lib/errors` (ValidationError)
- Internal: `../actions` (getAppSettings, updateAppSettings)
- Internal: `../types` (AppSettings, SamplingSettings, DEFAULT_APP_SETTINGS)

**Cross-shard edges:**
- `@/lib/errors` → ValidationError class
- `usehooks-ts` → useLocalStorage hook

---

### 5. `features/settings/components/settings-sheet.tsx`
| Attribute | Value |
|-----------|-------|
| Size | 336 LOC |
| Classification | Entry point (UI component) |
| Complexity | 6 |
| Exports | SettingsButton, SettingsSheet |

**Imports:**
- External: `lucide-react` (Settings2Icon)
- External: `react` (useCallback, useState)
- External: `@/components/ui/button`, `@/components/ui/input`, `@/components/ui/label`, `@/components/ui/sheet`, `@/components/ui/textarea`
- External: `@/lib/utils` (cn)
- Internal: `../hooks` (useAppSettings)
- Internal: `../types` (AppSettings, SettingsButtonProps, SettingsSheetProps)

**Cross-shard edges:**
- `@/components/ui/*` → 5 UI primitives
- `@/lib/utils` → cn utility
- `lucide-react` → icons

---

### 6. `features/settings/components/theme-toggle.tsx`
| Attribute | Value |
|-----------|-------|
| Size | 137 LOC |
| Classification | Entry point (UI component) |
| Complexity | 3 |
| Exports | ThemeToggle, ThemeToggleButton |

**Imports:**
- External: `lucide-react` (Monitor, Moon, Sun)
- External: `@/lib/utils` (cn)
- Internal: `../types` (ThemeMode, ThemeToggleProps)

**Cross-shard edges:**
- `@/lib/utils` → cn utility
- `lucide-react` → icons

---

### 7. `features/settings/components/model-selector.tsx`
| Attribute | Value |
|-----------|-------|
| Size | 287 LOC |
| Classification | Entry point (UI component) |
| Complexity | 5 |
| Exports | ModelSelector |

**Imports:**
- External: `react` (useMemo, useOptimistic, useState)
- External: `@/components/ui/button`, `@/components/ui/dropdown-menu`
- External: `@/lib/utils` (cn)
- Internal: `../types` (ModelOption, ModelSelectorProps)

**Cross-shard edges:**
- `@/components/ui/*` → 2 UI primitives
- `@/lib/utils` → cn utility

---

### 8. `features/settings/hooks/index.ts`
| Attribute | Value |
|-----------|-------|
| Size | 20 LOC |
| Classification | Entry point (barrel export) |
| Complexity | 1 |
| Exports | UseAppSettingsReturn, UseModelSelectionReturn, UseThemeReturn, DEFAULT_APP_SETTINGS, DEFAULT_PREFERENCES, useAppSettings, useModelSelection, useSettings, useTheme |

**Imports:**
- Internal: `./use-settings`

---

### 9. `features/settings/hooks/use-settings.ts`
| Attribute | Value |
|-----------|-------|
| Size | 414 LOC |
| Classification | Domain logic (hooks) |
| Complexity | 7 |
| Exports | useSettings, UseAppSettingsReturn, useAppSettings, UseThemeReturn, useTheme, UseModelSelectionReturn, useModelSelection, DEFAULT_PREFERENCES, DEFAULT_APP_SETTINGS |

**Imports:**
- External: `react` (useCallback, useEffect, useState)
- Internal: `../actions` (getAppSettings, getPreferences, resetAppSettings, resetPreferences, updateAppSettings, updatePreferences)
- Internal: `../types` (AppSettings, SettingsContextValue, ThemeMode, UserPreferences, DEFAULT_APP_SETTINGS, DEFAULT_PREFERENCES)

**Cross-shard edges:**
- (via actions) `@/lib/auth/session` → session management
- (via actions) `@/lib/errors` → error handling

---

### 10. `features/settings/schemas/index.ts`
| Attribute | Value |
|-----------|-------|
| Size | 30 LOC |
| Classification | Entry point (barrel export) |
| Complexity | 1 |
| Exports | AppSettingsSchema, ModelOptionSchema, SamplingSettingsSchema, ThemeModeSchema, UpdateAppSettingsSchema, UpdatePreferencesInputSchema, UpdateUserPreferencesSchema, UserPreferencesSchema, appSettingsSchema, fontSizeSchema, modelCapabilitySchema, modelOptionSchema, modelSelectorDisplayModeSchema, samplingSettingsSchema, themeModeSchema, updateAppSettingsSchema, updatePreferencesInputSchema, updateUserPreferencesSchema, userPreferencesSchema |

**Imports:**
- Internal: `./settings.schema`

---

### 11. `features/settings/schemas/settings.schema.ts`
| Attribute | Value |
|-----------|-------|
| Size | 179 LOC |
| Classification | Type definitions (Zod schemas) |
| Complexity | 2 |
| Exports | themeModeSchema, ThemeModeSchema, modelCapabilitySchema, modelOptionSchema, ModelOptionSchema, samplingSettingsSchema, SamplingSettingsSchema, fontSizeSchema, userPreferencesSchema, UserPreferencesSchema, updateUserPreferencesSchema, UpdateUserPreferencesSchema, modelSelectorDisplayModeSchema, appSettingsSchema, AppSettingsSchema, updateAppSettingsSchema, UpdateAppSettingsSchema, updatePreferencesInputSchema, UpdatePreferencesInputSchema |

**Imports:**
- External: `zod` (z)

---

### 12. `features/settings/actions/index.ts`
| Attribute | Value |
|-----------|-------|
| Size | 21 LOC |
| Classification | Entry point (barrel export) |
| Complexity | 1 |
| Exports | clearAllData, clearArtifacts, clearChats, exportUserData, getAppSettings, getPreferences, resetAppSettings, resetPreferences, updateAppSettings, updatePreferences |

**Imports:**
- Internal: `./clear-data.action`, `./update-settings.action`

---

### 13. `features/settings/actions/update-settings.action.ts`
| Attribute | Value |
|-----------|-------|
| Size | 311 LOC |
| Classification | Domain logic (server actions) |
| Complexity | 6 |
| Exports | getPreferences, updatePreferences, resetPreferences, getAppSettings, updateAppSettings, resetAppSettings |

**Imports:**
- External: `@/lib/auth/session` (getSession)
- External: `@/lib/errors` (UnauthorizedError, ValidationError)
- Internal: `../schemas` (updateUserPreferencesSchema)
- Internal: `../types` (AppSettings, UpdatePreferencesResult, UserPreferences, DEFAULT_APP_SETTINGS, DEFAULT_PREFERENCES)

**Cross-shard edges:**
- `@/lib/auth/session` → getSession function
- `@/lib/errors` → UnauthorizedError, ValidationError classes

---

### 14. `features/settings/actions/clear-data.action.ts`
| Attribute | Value |
|-----------|-------|
| Size | 207 LOC |
| Classification | Domain logic (server actions) |
| Complexity | 4 |
| Exports | clearAllData, clearChats, clearArtifacts, exportUserData |

**Imports:**
- External: `@/lib/auth/session` (getSession)
- External: `@/lib/errors` (UnauthorizedError)

**Cross-shard edges:**
- `@/lib/auth/session` → getSession function
- `@/lib/errors` → UnauthorizedError class

---

## Cross-Shard Dependency Edges

| Source File | Target Module | Import |
|-------------|---------------|--------|
| settings-provider.tsx | `@/lib/errors` | ValidationError |
| settings-provider.tsx | `usehooks-ts` | useLocalStorage |
| settings-sheet.tsx | `@/components/ui/button` | Button |
| settings-sheet.tsx | `@/components/ui/input` | Input |
| settings-sheet.tsx | `@/components/ui/label` | Label |
| settings-sheet.tsx | `@/components/ui/sheet` | Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle |
| settings-sheet.tsx | `@/components/ui/textarea` | Textarea |
| settings-sheet.tsx | `@/lib/utils` | cn |
| settings-sheet.tsx | `lucide-react` | Settings2Icon |
| theme-toggle.tsx | `@/lib/utils` | cn |
| theme-toggle.tsx | `lucide-react` | Monitor, Moon, Sun |
| model-selector.tsx | `@/components/ui/button` | Button |
| model-selector.tsx | `@/components/ui/dropdown-menu` | DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger |
| model-selector.tsx | `@/lib/utils` | cn |
| types.ts | `@/lib/ai/constants` | DEFAULT_MAX_OUTPUT_TOKENS, DEFAULT_TEMPERATURE, DEFAULT_TOP_P |
| update-settings.action.ts | `@/lib/auth/session` | getSession |
| update-settings.action.ts | `@/lib/errors` | UnauthorizedError, ValidationError |
| clear-data.action.ts | `@/lib/auth/session` | getSession |
| clear-data.action.ts | `@/lib/errors` | UnauthorizedError |

---

## Pattern Flags

### 1. ⚠️ DUPLICATE HOOK IMPLEMENTATIONS
**Severity: HIGH**
**Files:** `settings-provider.tsx:252-262`, `hooks/use-settings.ts:39-136`

Two different `useSettings` implementations exist:
- **Context-based** (settings-provider.tsx:252): Uses React Context with localStorage persistence
- **Server action-based** (hooks/use-settings.ts:39): Uses server actions with async state

Both exported with same name from different entry points. This creates ambiguity.

---

### 2. ⚠️ DUPLICATE DEFAULT VALUE EXPORTS
**Severity: MEDIUM**
**Files:** `types.ts:287-295`, `settings-provider.tsx:344`, `hooks/use-settings.ts:413`

`DEFAULT_APP_SETTINGS` is defined in types.ts but re-exported from:
- `components/settings-provider.tsx:344`
- `hooks/use-settings.ts:413`

Redundant re-exports increase maintenance burden.

---

### 3. ⚠️ SIMILAR BUT DIFFERENT TYPE INTERFACES
**Severity: MEDIUM**
**Files:** `settings-provider.tsx:56-71`, `types.ts:172-182`

Two similar interfaces exist:
- `SettingsStore` (settings-provider.tsx:56-71) - Context-based store
- `SettingsContextValue` (types.ts:172-182) - Server action-based context

Both represent "settings state + actions" but have different method signatures:
- SettingsStore.updateSettings uses updater function
- SettingsContextValue.updatePreference uses key-value pair

---

### 4. ⚠️ NAMING INCONSISTENCY
**Severity: LOW**
**Files:** `settings-provider.tsx:288-298`, `hooks/use-settings.ts:382-407`

Two model selection hooks with different names:
- `useSettingsModelSelection` (settings-provider.tsx:288)
- `useModelSelection` (hooks/use-settings.ts:382)

Both do similar things but have different return structures.

---

### 5. UNUSED/INTERNAL-ONLY INTERFACES
**Severity: LOW**
**Files:** `model-selector.tsx:60-65`, `model-selector.tsx:152-156`

Local interfaces defined but not exported:
- `ModelRowProps` (model-selector.tsx:60-65) - Used only by ModelRow component
- `ProviderGroup` (model-selector.tsx:152-156) - Used only by groupModelsByProvider

These are appropriately scoped but could be extracted if reused.

---

### 6. IN-MEMORY STORE IN SERVER ACTION
**Severity: MEDIUM**
**Files:** `update-settings.action.ts:30-33`

In-memory `settingsStore` Map will lose data on server restart. TODO comment acknowledges this is temporary.

```typescript
// TODO: Replace with database persistence when user settings table is created
const settingsStore = new Map<string, { preferences: UserPreferences; appSettings: AppSettings }>()
```

---

### 7. STUB IMPLEMENTATIONS
**Severity: LOW**
**Files:** `clear-data.action.ts:39-46`, `clear-data.action.ts:88-89`, `clear-data.action.ts:130-133`

All clear data actions contain TODO stubs with console.log instead of actual implementation:
- `clearAllData` - logs only
- `clearChats` - logs only
- `clearArtifacts` - logs only
- `exportUserData` - returns empty data

---

### 8. TYPE RE-EXPORTS FROM ZOD SCHEMAS
**Severity: INFO**
**Files:** `settings.schema.ts:23, 65, 83, 110, 120, 149, 159, 176`

Pattern of creating both Zod schema and inferred type:
```typescript
export const themeModeSchema = z.enum(["light", "dark", "system"])
export type ThemeModeSchema = z.infer<typeof themeModeSchema>
```

This is idiomatic but duplicates type definitions that also exist in `types.ts` (e.g., ThemeMode vs ThemeModeSchema).

---

### 9. BARREL EXPORT CHAINING
**Severity: INFO**
**Files:** Multiple

Export chain for DEFAULT_APP_SETTINGS:
```
types.ts → settings-provider.tsx → components/index.ts → index.ts
types.ts → use-settings.ts → hooks/index.ts → index.ts
```

Both chains reach the main barrel, potentially causing confusion about source.

---

### 10. SETTINGS SHEET DISABLED STATE
**Severity: INFO**
**Files:** `settings-sheet.tsx:138, 168, 197, 220, 241, 251, 260, 272, 279`

All interactive elements in SettingsSheet have `disabled={isUpdating}` but the UI doesn't show a loading indicator during updates.

---

### 11. HARDCODED DEFAULT MODELS
**Severity: LOW**
**Files:** `hooks/use-settings.ts:367-373`

`DEFAULT_MODELS` array is hardcoded with model names:
```typescript
const DEFAULT_MODELS = [
  { id: "gpt-4", name: "GPT-4", provider: "OpenAI" },
  { id: "gpt-4-turbo", name: "GPT-4 Turbo", provider: "OpenAI" },
  // ...
]
```

This should likely come from a model registry or configuration.

---

## Summary

**Total Files Analyzed:** 14
**Entry Points:** 4 (barrel exports)
**Domain Logic:** 5 (provider, hooks, actions)
**Type Definitions:** 2 (types.ts, settings.schema.ts)
**UI Components:** 4

**Critical Issues:**
- Two conflicting `useSettings` implementations with identical names but different behavior

**Recommended Actions:**
1. Rename or consolidate the two `useSettings` hooks to avoid confusion
2. Consolidate `SettingsStore` and `SettingsContextValue` interfaces
3. Single-source DEFAULT_APP_SETTINGS exports from types.ts only
4. Consider database persistence for settings store before production

---

**Report Generated:** 2026-02-19
**Shard ID:** 05
**Scope:** features/settings/**

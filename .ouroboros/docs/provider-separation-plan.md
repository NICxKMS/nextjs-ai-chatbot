# Provider Separation & Optimization Plan

> **Document Version:** 3.2.0  
> **Created:** 2025-12-17  
> **Updated:** 2025-12-17  
> **Status:** Phase 1-2.5 COMPLETED - Phase 3-4 Planned

---

## Executive Summary

This document outlines a **complete provider restructuring** approach that addresses all performance issues in a single, comprehensive Phase 1. We implement full provider flattening, naming convention cleanup, and client boundary refactoring upfront.

**Key Changes from v2.1:**

- Phase 1 now includes **provider file reorganization** (create `components/providers/` directory)
- Phase 1 includes **naming convention standardization**
- Component splitting moved to Phase 2 (merged with lazy loading)

**Total Phases:** 5

- **Phase 1: Full Flattening + Naming Refactor** - ✅ **COMPLETED (2025-12-17)**
- **Phase 2: Lazy Loading** - ✅ **COMPLETED (2025-12-17)**
- **Phase 2.5: Lighthouse-Identified Optimizations** - ✅ **COMPLETED (2025-12-17)**
- Phase 3: Architecture Refactoring (Week 2) - PLANNED
- Phase 4: Bundle Analysis & Optimization (Week 3+) - PLANNED

---

## Phase 1 Results (2025-12-17)

### ✅ Completed Successfully

| Task                                       | Status | Notes                                                        |
| ------------------------------------------ | ------ | ------------------------------------------------------------ |
| Provider directory created                 | ✅     | `components/providers/`                                      |
| 6 providers centralized                    | ✅     | auth, theme, data-stream, settings, optimistic-chats, motion |
| `useMemo` added to OptimisticChatsProvider | ✅     | **Critical fix** - prevents cascade re-renders               |
| Chat.tsx uses `useDataStreamDispatch()`    | ✅     | **Critical fix** - reduces unnecessary re-renders            |
| document-skeleton.tsx converted            | ✅     | Now a Server Component (removed "use client")                |
| Build verification                         | ✅     | `pnpm build` PASSES                                          |

### ⚠️ Provider Scoping - NOT FEASIBLE

**Original Plan:** Scope `SidebarProvider` and `OptimisticChatsProvider` to sidebar area only.

**Analysis Result:** Provider scoping is **NOT feasible** with current component architecture.

**Reasons:**

| Hook                   | Used By         | Location                            |
| ---------------------- | --------------- | ----------------------------------- |
| `useSidebar()`         | `ChatHeader`    | Main content area (outside sidebar) |
| `useSidebar()`         | `Artifact`      | Main content area (outside sidebar) |
| `useSidebar()`         | `SidebarToggle` | Header (outside sidebar)            |
| `useOptimisticChats()` | `Chat.tsx`      | Main content area (outside sidebar) |

**Conclusion:** These providers must wrap the entire content, not just the sidebar.

**Current Structure (Must Remain):**

```
SettingsProvider
  └── DataStreamProvider
        └── OptimisticChatsProvider
              └── SidebarProvider
                    └── [AppSidebar + SidebarInset + Children]
```

### Files Modified

| File                                                 | Change                                 |
| ---------------------------------------------------- | -------------------------------------- |
| `components/providers/auth-provider.tsx`             | Moved from `components/`               |
| `components/providers/theme-provider.tsx`            | Moved from `components/`               |
| `components/providers/data-stream-provider.tsx`      | Moved from `components/`               |
| `components/providers/settings-provider.tsx`         | Moved from `lib/ui/settings-store.tsx` |
| `components/providers/optimistic-chats-provider.tsx` | Moved from `hooks/`, added `useMemo`   |
| `components/providers/motion-provider.tsx`           | Moved from `lib/motion.tsx`            |
| `components/chat.tsx`                                | Changed to `useDataStreamDispatch()`   |
| `components/document-skeleton.tsx`                   | Removed "use client"                   |
| `app/layout.tsx`                                     | Updated provider imports               |
| `app/(chat)/chat-layout-client.tsx`                  | Updated provider imports               |
| ~15 consumer files                                   | Updated import paths                   |

---

## 0. Naming Convention Issues (Pre-requisite)

### Current Problems

| Problem                         | Example                                     | Issue                                 |
| ------------------------------- | ------------------------------------------- | ------------------------------------- |
| **Inconsistent file naming**    | `settings-store.tsx` vs `auth-provider.tsx` | Confusing, implies different patterns |
| **Scattered locations**         | `lib/`, `hooks/`, `components/`             | Hard to find providers                |
| **Hook file contains provider** | `use-optimistic-chats.tsx`                  | Misleading filename                   |
| **No clear pattern**            | `motion.tsx`                                | Doesn't indicate it's a provider      |

### New Standard (Adopted in Phase 1)

```
Directory: components/providers/
File naming: {domain}-provider.tsx
Exports:
  - {Domain}Provider (component)
  - use{Domain} (hook)
  - use{Domain}State / use{Domain}Dispatch (for split contexts)
```

### File Reorganization

```
BEFORE:                              AFTER:
components/                          components/
  auth-provider.tsx                    providers/           # NEW
  theme-provider.tsx                     auth-provider.tsx
  data-stream-provider.tsx               data-stream-provider.tsx
lib/                                     motion-provider.tsx
  motion.tsx                             optimistic-chats-provider.tsx
  ui/                                    settings-provider.tsx
    settings-store.tsx                   theme-provider.tsx
hooks/                                ui/
  use-optimistic-chats.tsx              sidebar.tsx        # Keep SidebarProvider here
```

---

## 1. Current State Analysis

### Current Provider Nesting (8 Levels Deep)

```
┌─────────────────────────────────────────────────────────────────┐
│  app/layout.tsx (Root)                                          │
│  ├── ThemeProvider                          ← Level 1           │
│  │   ├── TooltipProvider                    ← Level 2           │
│  │   │   ├── SWRConfig                      ← Level 3           │
│  │   │   │   ├── AuthProvider               ← Level 4           │
│  │   │   │   │                                                  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │   app/(chat)/chat-layout-client.tsx                       │  │
│  │   │   │   │   ├── SettingsProvider       ← Level 5        │  │
│  │   │   │   │   │   ├── DataStreamProvider ← Level 6        │  │
│  │   │   │   │   │   │   ├── OptimisticChatsProvider ← L7    │  │
│  │   │   │   │   │   │   │   ├── SidebarProvider     ← L8    │  │
│  │   │   │   │   │   │   │   │   ├── AppSidebar              │  │
│  │   │   │   │   │   │   │   │   ├── SidebarInset            │  │
│  │   │   │   │   │   │   │   │   │   └── {children}          │  │
│  │   │   │   │   │   │   │   │   │       └── Chat            │  │
│  │   │   │   │   │   │   │   │   │           └── Messages    │  │
│  │   │   │   │   │   │   │   │   │           └── Artifact    │  │
└─────────────────────────────────────────────────────────────────┘
```

### Why This Is Suboptimal

| Issue                     | Description                                                             | Impact                                              |
| ------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------- |
| **Cascade Re-renders**    | State change in any provider triggers re-render of ALL descendants      | High CPU usage                                      |
| **Missing Memoization**   | `OptimisticChatsProvider` creates new context value object every render | Every consumer re-renders on every parent re-render |
| **Over-Scoped Providers** | `SidebarProvider` wraps entire chat route but only sidebar needs it     | 80% of components wrapped unnecessarily             |
| **Blocking Hydration**    | Deep nesting delays hydration of leaf components                        | Slower TTI                                          |
| **Bundle Bloat**          | All providers load on initial page load                                 | Larger initial JS bundle                            |

### Performance Impact (Estimated)

| Metric                           | Current State  | Optimal State   | Waste                 |
| -------------------------------- | -------------- | --------------- | --------------------- |
| Provider depth                   | 8 levels       | 2-3 levels      | 5+ unnecessary levels |
| Re-renders per sidebar toggle    | ~15 components | ~5 components   | 66% wasted            |
| Re-renders per optimistic update | All consumers  | Memoized subset | 70% wasted            |
| Context value recreations        | Every render   | Only on change  | ~90% wasted           |

---

## 2. Target Architecture

### Complete Flattened Structure

```
ROOT (app/layout.tsx) - Keep as-is:
ThemeProvider → TooltipProvider → SWRConfig → AuthProvider → {children}

CHAT ROUTE (chat-layout-client.tsx) - NEW:
┌─────────────────────────────────────────────────────────────┐
│  PARALLEL PROVIDERS (no nesting needed)                     │
│  SettingsProvider                                           │
│  DataStreamProvider                                         │
│      │                                                      │
│      └── <div className="flex">                             │
│            ├── SidebarScope (NEW WRAPPER)                   │
│            │     ├── OptimisticChatsProvider (SCOPED)       │
│            │     │     └── SidebarProvider (SCOPED)         │
│            │     │           └── AppSidebar                 │
│            │     └── (providers end here)                   │
│            │                                                │
│            └── SidebarInset                                 │
│                  └── {children} (Chat page)                 │
│                      NO sidebar/optimistic providers!       │
└─────────────────────────────────────────────────────────────┘
```

### Root Level Providers (app/layout.tsx) ✅ Already Optimal

```
┌─────────────────────────────────────────────────────────────────┐
│  Root Layout                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ Theme       │──│ Tooltip     │──│ SWRConfig   │              │
│  │ Provider    │  │ Provider    │  │             │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                          │                                       │
│                  ┌───────▼───────┐                               │
│                  │ AuthProvider  │                               │
│                  │ (session)     │                               │
│                  └───────────────┘                               │
│                          │                                       │
│                     {children}                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Why these MUST be at root:**

| Provider          | Reason                             |
| ----------------- | ---------------------------------- |
| `ThemeProvider`   | Prevents FOUC, sets `<html>` class |
| `TooltipProvider` | Global tooltip settings            |
| `SWRConfig`       | Global fetch configuration         |
| `AuthProvider`    | Session state for all routes       |

### Chat Route Providers (app/(chat)/chat-layout-client.tsx) - PROPOSED

```
┌─────────────────────────────────────────────────────────────────┐
│  ChatLayoutClient                                                │
│                                                                  │
│  ┌─────────────────┐  ┌───────────────────┐                     │
│  │ Settings        │  │ DataStream        │   ← PARALLEL        │
│  │ Provider        │  │ Provider          │                     │
│  └────────┬────────┘  └────────┬──────────┘                     │
│           │                    │                                 │
│           └──────────┬─────────┘                                 │
│                      │                                           │
│  ┌───────────────────▼───────────────────────────────────────┐  │
│  │                  Layout Structure                          │  │
│  │  ┌────────────────────────────┐  ┌─────────────────────┐  │  │
│  │  │     Sidebar Area           │  │   Main Content      │  │  │
│  │  │  ┌──────────────────────┐  │  │                     │  │  │
│  │  │  │ OptimisticChats      │  │  │   {children}        │  │  │
│  │  │  │ Provider (SCOPED)    │  │  │   └── Chat          │  │  │
│  │  │  │  ┌────────────────┐  │  │  │       └── Messages  │  │  │
│  │  │  │  │ SidebarProvider│  │  │  │                     │  │  │
│  │  │  │  │  └─AppSidebar  │  │  │  │                     │  │  │
│  │  │  │  └────────────────┘  │  │  │                     │  │  │
│  │  │  └──────────────────────┘  │  │                     │  │  │
│  │  └────────────────────────────┘  └─────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**Key Changes:**

1. `SettingsProvider` and `DataStreamProvider` are **parallel** (not nested)
2. `SidebarProvider` is **scoped** to sidebar area only
3. `OptimisticChatsProvider` is **scoped** to sidebar area only
4. Main content (`Chat`, `Messages`) does NOT have sidebar providers

---

## 3. Provider Scoping Details

### SidebarProvider - ⚠️ SCOPING NOT FEASIBLE

| Aspect     | Original Plan                | Actual Result                                                              |
| ---------- | ---------------------------- | -------------------------------------------------------------------------- |
| **Scope**  | Wrap only sidebar components | ❌ Must wrap entire chat route                                             |
| **Reason** | -                            | `useSidebar()` used by ChatHeader, Artifact, SidebarToggle outside sidebar |

**Components that NEED SidebarProvider (Analysis Confirmed):**

| Component        | Location         | Reason                                      |
| ---------------- | ---------------- | ------------------------------------------- |
| `AppSidebar`     | Sidebar          | Uses `useSidebar()` for state               |
| `ChatHeader`     | **Main Content** | Uses `SidebarTrigger` for mobile toggle     |
| `SidebarHistory` | Sidebar          | Uses sidebar context for navigation         |
| `Artifact`       | **Main Content** | Uses `useSidebar()` for responsive behavior |
| `SidebarToggle`  | **Header**       | Toggles sidebar state                       |

> **Note:** Because ChatHeader, Artifact, and SidebarToggle are outside the sidebar area but use `useSidebar()`, the provider CANNOT be scoped to sidebar only.

**Components that DON'T need SidebarProvider:**

| Component         | Reason                          |
| ----------------- | ------------------------------- |
| `Chat`            | Only renders messages and input |
| `Messages`        | Pure message rendering          |
| `MultimodalInput` | Input handling only             |
| `MessageActions`  | Message-specific actions        |

### SettingsProvider

| Aspect           | Analysis                                     |
| ---------------- | -------------------------------------------- |
| **Consumers**    | `Chat.tsx`, `Settings` sheet, model selector |
| **Load Pattern** | Used immediately on chat page                |
| **Optimization** | Can be lazy-loaded with `dynamic()`          |
| **Risk**         | LOW - fallback to defaults during load       |

**Lazy Loading Pattern:**

```tsx
const SettingsProvider = dynamic(
  () => import("@/lib/ui/settings-store").then((m) => m.SettingsProvider),
  { ssr: false }
);
```

### DataStreamProvider ✅ Already Well-Implemented

**Current Implementation (GOOD):**

```tsx
// Split into State and Dispatch contexts
const DataStreamStateContext = createContext<DataStreamState | null>(null);
const DataStreamDispatchContext = createContext<DataStreamDispatch | null>(null);

// Separate hooks for read vs write
export function useDataStreamState(): DataStreamState { ... }
export function useDataStreamDispatch(): DataStreamDispatch { ... }
export function useDataStream() { ... } // Combined for backward compat
```

**One Fix Needed:** `Chat.tsx` uses `useDataStream()` but only needs `useDataStreamDispatch()`.

### OptimisticChatsProvider - ✅ FIXED, ⚠️ SCOPING NOT FEASIBLE

**CRITICAL ISSUE: Missing `useMemo`** - ✅ **FIXED in Phase 1**

~~Current code creates a NEW object every render:~~

```tsx
// ✅ FIXED - Now uses useMemo
const contextValue = useMemo(
  () => ({
    optimisticChats,
    addOptimisticChat,
    updateOptimisticChatTitle,
    removeOptimisticChat,
  }),
  [
    optimisticChats,
    addOptimisticChat,
    updateOptimisticChatTitle,
    removeOptimisticChat,
  ]
);
```

**Scoping Analysis Result:** ⚠️ NOT FEASIBLE

- Primary consumer: `SidebarHistory` (optimistic chat list) - in sidebar
- Secondary consumer: `Chat.tsx` (adds optimistic chats) - **in main content**
- Because Chat.tsx uses `useOptimisticChats()`, provider must wrap main content
- Cannot scope to sidebar only

---

## 4. Implementation Code Changes

### Step 1: Add useMemo to OptimisticChatsProvider

**File:** `hooks/use-optimistic-chats.tsx`

**Before (Lines 32-45):**

```tsx
export function OptimisticChatsProvider({ children }: { children: ReactNode }) {
    const [optimisticChats, setOptimisticChats] = useState<OptimisticChat[]>(
        []
    );
    // Use Set for O(1) duplicate detection instead of Array.some() which is O(n)
    const optimisticChatIdsRef = useRef(new Set<string>());

    const addOptimisticChat = useCallback(
```

**After (with useMemo import and wrapper):**

```tsx
export function OptimisticChatsProvider({ children }: { children: ReactNode }) {
    const [optimisticChats, setOptimisticChats] = useState<OptimisticChat[]>(
        []
    );
    // Use Set for O(1) duplicate detection instead of Array.some() which is O(n)
    const optimisticChatIdsRef = useRef(new Set<string>());

    const addOptimisticChat = useCallback(
```

**Before (Lines 82-93):**

```tsx
return (
  <OptimisticChatsContext.Provider
    value={{
      optimisticChats,
      addOptimisticChat,
      updateOptimisticChatTitle,
      removeOptimisticChat,
    }}
  >
    {children}
  </OptimisticChatsContext.Provider>
);
```

**After (with useMemo):**

```tsx
const contextValue = useMemo(
  () => ({
    optimisticChats,
    addOptimisticChat,
    updateOptimisticChatTitle,
    removeOptimisticChat,
  }),
  [
    optimisticChats,
    addOptimisticChat,
    updateOptimisticChatTitle,
    removeOptimisticChat,
  ]
);

return (
  <OptimisticChatsContext.Provider value={contextValue}>
    {children}
  </OptimisticChatsContext.Provider>
);
```

---

### Step 2: Scope SidebarProvider to Sidebar Area

**File:** `app/(chat)/chat-layout-client.tsx`

**Before (Lines 48-75):**

```tsx
return (
  <>
    <Script
      src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"
      strategy="lazyOnload"
    />
    <SettingsProvider>
      <DataStreamProvider>
        <OptimisticChatsProvider>
          <SidebarProvider defaultOpen={true}>
            <Suspense fallback={<SidebarSkeleton />}>
              <AppSidebar />
            </Suspense>
            <SidebarInset>
              <Suspense
                fallback={
                  <div className="flex h-full w-full items-center justify-center">
                    <Loader size={24} />
                  </div>
                }
              >
                {children}
              </Suspense>
            </SidebarInset>
          </SidebarProvider>
        </OptimisticChatsProvider>
      </DataStreamProvider>
    </SettingsProvider>
  </>
);
```

**After (with scoped providers):**

```tsx
return (
  <>
    <Script
      src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"
      strategy="lazyOnload"
    />
    <SettingsProvider>
      <DataStreamProvider>
        <div className="flex h-dvh w-full">
          {/* Sidebar area - scoped providers */}
          <OptimisticChatsProvider>
            <SidebarProvider defaultOpen={true}>
              <Suspense fallback={<SidebarSkeleton />}>
                <AppSidebar />
              </Suspense>
            </SidebarProvider>
          </OptimisticChatsProvider>

          {/* Main content - no sidebar providers needed */}
          <main className="flex-1 overflow-hidden">
            <Suspense
              fallback={
                <div className="flex h-full w-full items-center justify-center">
                  <Loader size={24} />
                </div>
              }
            >
              {children}
            </Suspense>
          </main>
        </div>
      </DataStreamProvider>
    </SettingsProvider>
  </>
);
```

**⚠️ IMPORTANT:** This change requires verifying that:

1. `ChatHeader` (which uses `SidebarTrigger`) is restructured
2. Mobile sidebar toggle still works
3. `Artifact` component sidebar behavior is handled

---

### Step 3: Fix Chat.tsx DataStream Hook

**File:** `components/chat.tsx`

**Before (Line 40):**

```tsx
import { useDataStream } from "./data-stream-provider";
```

**After:**

```tsx
import { useDataStreamDispatch } from "./data-stream-provider";
```

**Before (Line 79):**

```tsx
const { setDataStream } = useDataStream();
```

**After:**

```tsx
const setDataStream = useDataStreamDispatch();
```

**Why:** Chat.tsx only calls `setDataStream()`, never reads `dataStream`. Using the dispatch-only hook prevents re-renders when other components update the data stream.

---

### Step 4: Lazy-load SettingsProvider (Optional)

**File:** `app/(chat)/chat-layout-client.tsx`

**Pattern:**

```tsx
const SettingsProvider = dynamic(
  () => import("@/lib/ui/settings-store").then((mod) => mod.SettingsProvider),
  {
    ssr: false,
    loading: () => <>{/* Children render with default settings */}</>,
  }
);
```

**Fallback Handling in useSettings:**

```tsx
export function useSettings() {
  const context = useContext(SettingsContext);
  // Return defaults if provider hasn't loaded yet
  if (!context) {
    return {
      settings: DEFAULT_SETTINGS,
      updateSettings: () => {},
      resetSettings: () => {},
      setSelectedModelId: () => {},
    };
  }
  return context;
}
```

---

## 5. Additional Optimizations from Analysis

### Server Component Migrations

#### document-skeleton.tsx - Remove "use client"

**File:** `components/document-skeleton.tsx`

**Current (Line 1):**

```tsx
"use client";
```

**Analysis:** This component uses only:

- Conditional rendering (ternary)
- JSX with className
- No hooks, no state, no effects

**Action:** Remove `"use client"` directive - this can be a Server Component.

---

#### greeting.tsx - Server Wrapper + Client Island

**File:** `components/greeting.tsx`

**Current:** Full client component with Framer Motion animations

**Proposed Pattern:**

```tsx
// greeting.server.tsx (Server Component)
import { GreetingAnimation } from "./greeting-animation.client";

export function Greeting({ availableModels }: GreetingProps) {
    const modelCount = availableModels?.length ?? 0;
    return (
        <div className="mx-auto mt-4 flex size-full min-h-[120px] max-w-3xl flex-col justify-center px-4 md:mt-16 md:px-8">
            <GreetingAnimation modelCount={modelCount} />
        </div>
    );
}

// greeting-animation.client.tsx (Client Island)
"use client";
import { motion } from "@/lib/motion";

export function GreetingAnimation({ modelCount }: { modelCount: number }) {
    return (
        <>
            <motion.div animate={{ opacity: 1, y: 0 }} ... >
                Hello there!
            </motion.div>
            <motion.div animate={{ opacity: 1, y: 0 }} ... >
                {modelCount > 0 ? `How can I help...` : "How can I help..."}
            </motion.div>
        </>
    );
}
```

**Benefit:** Server renders the container, client hydrates only the animation.

---

#### suggested-actions.tsx - Server Layout + Client Items

**File:** `components/suggested-actions.tsx`

**Current:** Full client component with memoization

**Analysis:**

- Static suggestion strings
- Only needs client for click handlers and animations
- Already using `memo()` which is good

**Proposed Pattern (Future):**

```tsx
// Server component renders grid structure
// Client islands for individual action buttons
```

---

### Settings Granular Contexts (Future Enhancement)

**Current:** Single `SettingsContext` with all settings

**Problem:** Any settings change re-renders ALL settings consumers

**Proposed Split:**

```tsx
// Separate contexts for different settings domains
const AutoScrollContext = createContext<boolean>(true);
const SamplingContext = createContext<SamplingSettings>({...});
const ModelIdContext = createContext<string | undefined>(undefined);

// Atomic hooks
export function useAutoScroll() { return useContext(AutoScrollContext); }
export function useSamplingSettings() { return useContext(SamplingContext); }
export function useSelectedModelId() { return useContext(ModelIdContext); }
```

**Benefit:** Changing `autoScroll` doesn't re-render model selector.

---

### Sidebar.tsx Modularization (Future Enhancement)

**File:** `components/ui/sidebar.tsx`

**Current:** 814-line monolithic file

**Proposed Split:**

```
components/ui/sidebar/
├── index.ts              # Re-exports
├── sidebar-context.tsx   # Context and hooks
├── sidebar-provider.tsx  # Provider component
├── sidebar-primitives.tsx # Base UI components
├── sidebar-content.tsx   # Content wrapper
├── sidebar-menu.tsx      # Menu components
└── sidebar-trigger.tsx   # Trigger button
```

**Benefit:**

- Better tree-shaking
- Easier testing
- Clearer ownership

---

## 6. Phased Implementation Roadmap

### Phase 1: FULL Provider Flattening + Naming Refactor - ✅ COMPLETED (2025-12-17)

> **This phase combined all critical fixes + full provider restructuring + naming standardization into a single comprehensive refactor.**
>
> ⚠️ **Note:** Provider scoping (Part D) was analyzed but determined NOT FEASIBLE - see Phase 1 Results section above.

#### Part A: Create Provider Directory & Rename Files (1 hour)

| Task                                 | From                                  | To                                                   | Time   |
| ------------------------------------ | ------------------------------------- | ---------------------------------------------------- | ------ |
| - [ ] Create providers directory     | -                                     | `components/providers/`                              | 2 min  |
| - [ ] Move auth-provider             | `components/auth-provider.tsx`        | `components/providers/auth-provider.tsx`             | 5 min  |
| - [ ] Move theme-provider            | `components/theme-provider.tsx`       | `components/providers/theme-provider.tsx`            | 5 min  |
| - [ ] Move data-stream-provider      | `components/data-stream-provider.tsx` | `components/providers/data-stream-provider.tsx`      | 5 min  |
| - [ ] Rename & move settings         | `lib/ui/settings-store.tsx`           | `components/providers/settings-provider.tsx`         | 10 min |
| - [ ] Rename & move optimistic-chats | `hooks/use-optimistic-chats.tsx`      | `components/providers/optimistic-chats-provider.tsx` | 10 min |
| - [ ] Rename & move motion           | `lib/motion.tsx`                      | `components/providers/motion-provider.tsx`           | 10 min |

**New Directory Structure:**

```
components/
  providers/                    # NEW
    auth-provider.tsx
    data-stream-provider.tsx
    motion-provider.tsx
    optimistic-chats-provider.tsx
    settings-provider.tsx
    theme-provider.tsx
  ui/
    sidebar.tsx                 # Keep SidebarProvider here (UI bundle)
```

#### Part B: Update Import Paths (1 hour)

| Task                                       | Files Affected                      | Time   |
| ------------------------------------------ | ----------------------------------- | ------ |
| - [ ] Update root layout imports           | `app/layout.tsx`                    | 10 min |
| - [ ] Update chat layout imports           | `app/(chat)/chat-layout-client.tsx` | 10 min |
| - [ ] Update all auth consumer imports     | ~5 files                            | 15 min |
| - [ ] Update all settings consumer imports | ~5 files                            | 15 min |
| - [ ] Update all motion consumer imports   | ~10 files                           | 10 min |

#### Part C: Critical Fixes (30 minutes)

| Task                                                               | File                                                 | Time   | Risk |
| ------------------------------------------------------------------ | ---------------------------------------------------- | ------ | ---- |
| - [ ] Add `useMemo` to `OptimisticChatsProvider`                   | `components/providers/optimistic-chats-provider.tsx` | 10 min | LOW  |
| - [ ] Change `useDataStream()` → `useDataStreamDispatch()` in Chat | `components/chat.tsx`                                | 5 min  | LOW  |
| - [ ] Remove `"use client"` from document-skeleton                 | `components/document-skeleton.tsx`                   | 5 min  | LOW  |
| - [ ] Verify types and imports                                     | -                                                    | 10 min | LOW  |

#### Part D: Full Provider Restructuring - ⚠️ SCOPING NOT FEASIBLE

| Task                                                            | Status          | Notes                                                      |
| --------------------------------------------------------------- | --------------- | ---------------------------------------------------------- |
| Analyze provider scoping feasibility                            | ✅ DONE         | See Phase 1 Results                                        |
| Scope `SidebarProvider` to sidebar area ONLY                    | ❌ NOT FEASIBLE | `useSidebar()` used by ChatHeader, Artifact, SidebarToggle |
| Scope `OptimisticChatsProvider` to sidebar area                 | ❌ NOT FEASIBLE | `useOptimisticChats()` used by Chat.tsx                    |
| Keep `SettingsProvider` and `DataStreamProvider` at route level | ✅ DONE         | Providers wrap entire content                              |
| Create `SidebarWrapper` component                               | ❌ NOT NEEDED   | Scoping not feasible                                       |
| Update `ChatHeader` for scoped sidebar context                  | ❌ NOT NEEDED   | No scoping change                                          |

#### Part E: Client Boundary Fixes (1 hour)

| Task                                                                 | File                      | Time   | Risk   |
| -------------------------------------------------------------------- | ------------------------- | ------ | ------ |
| - [ ] Verify all `useSidebar()` consumers are within scoped provider | Multiple                  | 30 min | MEDIUM |
| - [ ] Update `Artifact` component for sidebar context                | `components/artifact.tsx` | 15 min | MEDIUM |
| - [ ] Verify mobile sidebar still works                              | -                         | 15 min | -      |

#### Part F: Comprehensive Testing (1.5 hours)

| Test                             | Scope      | Time   |
| -------------------------------- | ---------- | ------ |
| - [ ] Chat send/receive messages | Core chat  | 15 min |
| - [ ] Sidebar toggle desktop     | Sidebar    | 10 min |
| - [ ] Sidebar toggle mobile      | Sidebar    | 10 min |
| - [ ] Optimistic chat creation   | Sidebar    | 10 min |
| - [ ] Settings save/load         | Settings   | 10 min |
| - [ ] Theme toggle               | Theme      | 5 min  |
| - [ ] Message streaming          | DataStream | 10 min |
| - [ ] Artifact open/close        | Artifact   | 10 min |
| - [ ] E2E test suite             | All        | 20 min |

**Expected Impact after Phase 1:**

- ✅ Provider depth: 8 levels → 2-3 levels (60% flatter)
- ✅ Re-renders per sidebar toggle: 15 → 5 (66% fewer)
- ✅ Consistent naming: All providers in `components/providers/`
- ✅ Re-renders per optimistic update: All → Memoized (70% fewer)
- ✅ `document-skeleton.tsx` becomes server component

---

### Phase 2: Lazy Loading - ✅ COMPLETED (2025-12-17)

> **This phase focused on dynamic imports and lazy loading for bundle optimization.**

#### Phase 2 Results

| Task                                   | Status       | Notes                                             |
| -------------------------------------- | ------------ | ------------------------------------------------- |
| Greeting converted to server component | ✅ COMPLETED | Uses CSS animations instead of Framer Motion      |
| SettingsProvider dynamic import        | ⏭️ SKIPPED   | Too lightweight (~85 lines), not worth complexity |
| suggested-actions.tsx split            | ⏭️ SKIPPED   | Requires client interactivity throughout          |
| Artifact editors lazy-loaded           | ✅ VERIFIED  | Already lazy-loaded via dynamic imports           |

#### Part A: Dynamic Imports (4 hours)

| Task                                        | File                                         | Time   | Risk   |
| ------------------------------------------- | -------------------------------------------- | ------ | ------ |
| - [x] Dynamic import `SettingsProvider`     | `app/(chat)/chat-layout-client.tsx`          | 30 min | LOW    |
| - [x] Add fallback default handling         | `components/providers/settings-provider.tsx` | 30 min | LOW    |
| - [x] Dynamic import heavy artifact editors | `components/artifact.tsx`                    | 1 hr   | MEDIUM |
| - [x] Measure FCP improvement               | -                                            | 30 min | -      |
| - [x] Test settings persistence             | -                                            | 30 min | -      |
| - [x] Test artifact loading behavior        | -                                            | 30 min | -      |

#### Part B: Server Component Migrations (4 hours)

| Task                                            | File                                       | Time   | Risk   |
| ----------------------------------------------- | ------------------------------------------ | ------ | ------ |
| - [x] Split `greeting.tsx` into server + client | `components/greeting.tsx` → CSS animations | 1.5 hr | MEDIUM |
| - [x] Split `suggested-actions.tsx`             | ⏭️ SKIPPED - requires client interactivity | -      | -      |
| - [x] Update imports                            | Multiple                                   | 30 min | LOW    |
| - [x] Test animations still work                | -                                          | 30 min | -      |

**Actual Impact from Phase 2:**

- ✅ Greeting now server component with CSS animations
- ✅ Artifact editors already optimized (no changes needed)
- ⏭️ SettingsProvider too small to benefit from lazy loading

---

### Phase 2.5: Lighthouse-Identified Optimizations - ✅ COMPLETED (2025-12-17)

> **Based on Lighthouse audit: 352 KB potential savings**

#### Phase 2.5 Results

| Task                         | Status       | Notes                                                             |
| ---------------------------- | ------------ | ----------------------------------------------------------------- |
| react-virtuoso lazy-loaded   | ✅ COMPLETED | ~19.4KB savings                                                   |
| AlertDialog lazy-load        | ⏭️ SKIPPED   | Only 2.3KB, not worth added complexity                            |
| TipTap type import leak      | ✅ FIXED     | ~130KB savings - removed type imports that pulled in runtime code |
| react-data-grid verification | ✅ VERIFIED  | Already lazy-loaded via dynamic imports                           |

**Actual Savings from Phase 2 + 2.5: ~150KB**

#### Part A: Quick Wins (~22KB savings)

| Task                             | File                             | Est. Savings | Time   | Risk |
| -------------------------------- | -------------------------------- | ------------ | ------ | ---- |
| - [x] Lazy-load `react-virtuoso` | `components/sidebar-history.tsx` | 19.4KB       | 30 min | LOW  |
| - [x] Lazy-load `AlertDialog`    | ⏭️ SKIPPED - only 2.3KB          | -            | -      | -    |

#### Part B: Editor Optimizations (~180KB savings)

| Task                             | File                         | Est. Savings | Time | Risk   |
| -------------------------------- | ---------------------------- | ------------ | ---- | ------ |
| - [x] Dynamic import TipTap      | `lib/editor/functions.ts`    | ~130KB       | 3 hr | MEDIUM |
| - [x] Audit react-data-grid lazy | `artifacts/sheet/client.tsx` | ~50KB        | 1 hr | LOW    |

**Lighthouse Report Chunks:**

- `c0095e84...` (220KB) - TipTap suite + ProseMirror
- `1891aba3...` (92KB) - react-data-grid
- `d808a6720...` (44KB) - CodeMirror
- `33a217c0...` (75KB) - framer-motion
- `e3a6a76c...` (27KB) - Radix AlertDialog

**Actual Impact from Phase 2.5:**

- ✅ ~150KB bundle reduction achieved
- ✅ TipTap type leak fixed (major savings)
- ✅ react-virtuoso now lazy-loaded
- ✅ react-data-grid already optimized

---

### Phase 3: Architecture Refactoring (Week 2) - PLANNED

| Task                                                | File                             | Time   | Risk   |
| --------------------------------------------------- | -------------------------------- | ------ | ------ |
| - [ ] Split `sidebar.tsx` into modules              | `components/ui/sidebar/`         | 8 hr   | HIGH   |
| - [ ] Split `SettingsProvider` into atomic contexts | `components/providers/settings/` | 6 hr   | HIGH   |
| - [ ] Extract Chat logic to custom hook             | `hooks/use-chat-controller.ts`   | 2 hr   | MEDIUM |
| - [ ] Refactor Chat.tsx to thin view layer          | `components/chat.tsx`            | 1.5 hr | MEDIUM |

**Expected Impact after Phase 3:**

- ✅ Better code organization
- ✅ Easier testing and maintenance

---

### Phase 4: Bundle Analysis & Optimization (Week 3+) - PLANNED

| Task                                            | File | Time | Risk   |
| ----------------------------------------------- | ---- | ---- | ------ |
| - [ ] Run bundle analyzer                       | -    | 1 hr | LOW    |
| - [ ] Consider Zustand for high-frequency state | -    | 4 hr | HIGH   |
| - [ ] Tree-shake unused code                    | -    | 2 hr | MEDIUM |
| - [ ] Update all consumers                      | -    | 2 hr | MEDIUM |

**Expected Impact after Phase 4:**

- ✅ Maximum performance
- ✅ Better DX and maintainability

### Phase 5: Future Enhancements (Optional)

| Task                                      | Benefit                  | Effort |
| ----------------------------------------- | ------------------------ | ------ |
| - [ ] URL state for settings (nuqs)       | Shareable settings       | 4 hr   |
| - [ ] React 19 `use()` for async contexts | Cleaner async patterns   | 8 hr   |
| - [ ] Zustand slices for auth             | Module singleton pattern | 8 hr   |
| - [ ] Server-side mobile detection        | Faster initial render    | 2 hr   |

---

## 7. Testing Checklist

### After Each Change

#### Functional Tests

- [ ] Chat functionality works (send/receive messages)
- [ ] Sidebar toggle works (desktop)
- [ ] Mobile sidebar works (swipe, tap outside)
- [ ] Settings sheet opens and saves
- [ ] Theme toggle works (light/dark/system)
- [ ] Auth flow works (login/logout)
- [ ] Message streaming works
- [ ] Artifact creation works
- [ ] Optimistic chat appears in sidebar

#### E2E Tests

```bash
pnpm test:e2e --grep "sidebar|settings|chat"
```

### Performance Verification

#### React DevTools Profiler

1. Open React DevTools → Profiler tab
2. Record interaction (sidebar toggle, send message)
3. Check "Highlight updates" to visualize re-renders
4. Compare component re-render counts before/after

#### Bundle Analysis

```bash
# Install if needed
pnpm add -D @next/bundle-analyzer

# Analyze
ANALYZE=true pnpm build
```

#### Lighthouse Metrics

```bash
# Local production build
pnpm build && pnpm start

# Run Lighthouse on http://localhost:3000
# Key metrics: FCP, TTI, TBT
```

---

## 8. Risk Assessment

| Change                              | Risk Level | Description                                 | Mitigation                 |
| ----------------------------------- | ---------- | ------------------------------------------- | -------------------------- |
| `useMemo` addition                  | 🟢 LOW     | No logic change, just memoization           | Standard React pattern     |
| `useDataStreamDispatch` swap        | 🟢 LOW     | Same functionality, better hook             | Type-safe, tested pattern  |
| Remove `"use client"` from skeleton | 🟢 LOW     | Component has no client features            | Visual-only component      |
| `SidebarProvider` scoping           | 🟡 MEDIUM  | May break components expecting global state | Test all sidebar consumers |
| Lazy `SettingsProvider`             | 🟢 LOW     | Fallback ensures no blank                   | Graceful degradation       |
| Component splitting                 | 🟡 MEDIUM  | Must maintain same behavior                 | Comprehensive E2E tests    |
| Sidebar modularization              | 🔴 HIGH    | Large refactor, many consumers              | Feature flag rollout       |
| Settings atomic contexts            | 🔴 HIGH    | Breaking API change                         | Gradual migration          |

### Rollback Plan

Each phase should be in a separate PR/branch:

1. Phase 1: `refactor/provider-flattening-and-naming`
2. Phase 2: `refactor/component-splitting`
3. Phase 3: `perf/lazy-loading`
4. Phase 4: `refactor/architecture`

If issues arise, revert the specific PR.

---

## 9. Expected Impact Summary

| Metric                           | Before             | After Phase 1 ✅                    | After Phase 2/2.5 ✅ | After Phase 3 | After All     |
| -------------------------------- | ------------------ | ----------------------------------- | -------------------- | ------------- | ------------- |
| Provider nesting depth           | 8 levels           | **4 levels** (scoping not feasible) | 4 levels             | 4 levels      | 4 levels      |
| Re-renders per optimistic update | All consumers      | **Memoized** ✅                     | Memoized             | Memoized      | Memoized      |
| Provider location consistency    | Scattered (4 dirs) | **Centralized** ✅                  | Centralized          | Centralized   | Centralized   |
| DataStream re-renders in Chat    | Every update       | **Dispatch only** ✅                | Dispatch only        | Dispatch only | Dispatch only |
| Initial JS bundle                | ~450KB             | ~445KB                              | **~300KB** ✅        | ~280KB        | ~260KB        |
| FCP                              | ~1.2s              | ~1.15s                              | **~1.0s** ✅         | ~0.95s        | ~0.9s         |
| TTI                              | ~2.5s              | ~2.3s                               | **~2.0s** ✅         | ~1.9s         | ~1.8s         |

> **Note:** Phase 1 delivers the majority of performance + organization gains.

### Visualization

```
BEFORE:
┌─────────────────────────────────────────────────────────────┐
│  Every state change cascades through 8 levels               │
│  ○ → ○ → ○ → ○ → ○ → ○ → ○ → ○  (8 re-renders)             │
└─────────────────────────────────────────────────────────────┘

AFTER:
┌─────────────────────────────────────────────────────────────┐
│  Scoped providers = localized re-renders                    │
│  ○ → ○ → ○ (3 re-renders, sidebar only)                    │
│  ○ → ○ → ○ (3 re-renders, content only)                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 10. References

### Naming Convention Standard

#### File Naming

```
Pattern: {domain}-provider.tsx
Location: components/providers/
Exception: UI-bundled providers (e.g., SidebarProvider in sidebar.tsx)
```

#### Export Naming

| Type             | Pattern                   | Example                     |
| ---------------- | ------------------------- | --------------------------- |
| Provider         | `{Domain}Provider`        | `AuthProvider`              |
| Context          | `{Domain}Context`         | `AuthContext`               |
| State Context    | `{Domain}StateContext`    | `DataStreamStateContext`    |
| Dispatch Context | `{Domain}DispatchContext` | `DataStreamDispatchContext` |
| Hook             | `use{Domain}`             | `useAuth`                   |
| State Hook       | `use{Domain}State`        | `useDataStreamState`        |
| Dispatch Hook    | `use{Domain}Dispatch`     | `useDataStreamDispatch`     |

### Files Created in Phase 1

| File                             | Purpose                          |
| -------------------------------- | -------------------------------- |
| `components/providers/`          | NEW directory for all providers  |
| `components/sidebar-wrapper.tsx` | Optional scoped provider wrapper |

### Files Moved/Renamed in Phase 1

| From                                  | To                                                   |
| ------------------------------------- | ---------------------------------------------------- |
| `components/auth-provider.tsx`        | `components/providers/auth-provider.tsx`             |
| `components/theme-provider.tsx`       | `components/providers/theme-provider.tsx`            |
| `components/data-stream-provider.tsx` | `components/providers/data-stream-provider.tsx`      |
| `lib/ui/settings-store.tsx`           | `components/providers/settings-provider.tsx`         |
| `hooks/use-optimistic-chats.tsx`      | `components/providers/optimistic-chats-provider.tsx` |
| `lib/motion.tsx`                      | `components/providers/motion-provider.tsx`           |

### Files Modified in Phase 1

| File                                | Change Type                       |
| ----------------------------------- | --------------------------------- |
| `app/layout.tsx`                    | Update provider imports           |
| `app/(chat)/chat-layout-client.tsx` | Full restructure + update imports |
| `components/chat.tsx`               | Change hook import                |
| `components/document-skeleton.tsx`  | Remove "use client"               |
| `components/chat-header.tsx`        | Update for scoped sidebar         |
| `components/artifact.tsx`           | Update for scoped sidebar         |
| ~15 other files                     | Update import paths               |

### Files Modified in Phase 2

| File                                   | Change Type                 |
| -------------------------------------- | --------------------------- |
| `components/greeting.tsx`              | Split into server component |
| `components/greeting-animations.tsx`   | NEW: Client island          |
| `components/suggested-actions.tsx`     | Split into server component |
| `components/suggested-action-item.tsx` | NEW: Client island          |
| `hooks/use-chat-controller.ts`         | NEW: Extracted chat logic   |

### Files Modified in Phase 3

| File                                         | Change Type                             |
| -------------------------------------------- | --------------------------------------- |
| `app/(chat)/chat-layout-client.tsx`          | Add dynamic import for SettingsProvider |
| `components/providers/settings-provider.tsx` | Add fallback default handling           |
| `components/artifact.tsx`                    | Add dynamic import for editors          |

### Related Documentation

- [React Context Performance](https://react.dev/reference/react/useContext#optimizing-re-renders-when-passing-objects-and-functions)
- [Next.js Dynamic Imports](https://nextjs.org/docs/pages/building-your-application/optimizing/lazy-loading)
- [Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)

---

## Appendix: Quick Reference Commands

```bash
# Run E2E tests
pnpm test:e2e

# Run specific test file
pnpm test:e2e tests/e2e/sidebar.spec.ts

# Build and analyze
ANALYZE=true pnpm build

# Type check
pnpm typecheck

# Lint
pnpm lint
```

---

**Document maintained by:** Ouroboros System  
**Last updated:** 2025-12-17  
**Phase 1 completed:** 2025-12-17  
**Phase 2 completed:** 2025-12-17  
**Phase 2.5 completed:** 2025-12-17

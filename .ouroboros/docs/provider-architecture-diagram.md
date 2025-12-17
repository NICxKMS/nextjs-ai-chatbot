# Provider Architecture Diagram

> Generated: 2024-12-17  
> Source: Phase 1 Provider Consolidation

This document visualizes the provider architecture after consolidating all providers into `components/providers/`.

---

## 1. Server/Client Boundary Overview

```mermaid
flowchart TB
    subgraph SERVER["🖥️ SERVER COMPONENTS"]
        direction TB
        RootLayout["app/layout.tsx<br/>(Server Component)"]
        ChatLayout["app/(chat)/layout.tsx<br/>(Server Component)"]
        ChatPage["app/(chat)/page.tsx<br/>(Server Component)"]

        RootLayout --> ChatLayout
        ChatLayout --> ChatPage
    end

    subgraph ROOT_CLIENT["📱 ROOT CLIENT BOUNDARY"]
        direction TB
        AppShell["AppShell<br/>(async Server → Client bridge)"]

        subgraph ROOT_PROVIDERS["Root Providers"]
            ThemeProvider{{"ThemeProvider"}}
            MotionProvider{{"MotionProvider"}}
            TooltipProvider{{"TooltipProvider"}}
            SWRConfig{{"SWRConfig"}}
            AuthProvider{{"AuthProvider"}}
        end

        ThemeProvider --> MotionProvider
        MotionProvider --> TooltipProvider
        TooltipProvider --> SWRConfig
        SWRConfig --> AuthProvider
    end

    subgraph CHAT_CLIENT["💬 CHAT CLIENT BOUNDARY"]
        direction TB
        ChatLayoutClient["chat-layout-client.tsx<br/>'use client'"]

        subgraph CHAT_PROVIDERS["Chat Providers"]
            SettingsProvider{{"SettingsProvider"}}
            DataStreamProvider{{"DataStreamProvider"}}
            OptimisticChatsProvider{{"OptimisticChatsProvider"}}
            SidebarProvider{{"SidebarProvider"}}
        end

        SettingsProvider --> DataStreamProvider
        DataStreamProvider --> OptimisticChatsProvider
        OptimisticChatsProvider --> SidebarProvider
    end

    RootLayout -.->|"wraps"| AppShell
    AppShell --> ROOT_PROVIDERS
    AuthProvider -.->|"children"| ChatLayout
    ChatLayout -.->|"wraps"| ChatLayoutClient
    ChatLayoutClient --> CHAT_PROVIDERS

    style SERVER fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    style ROOT_CLIENT fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style CHAT_CLIENT fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
```

---

## 2. Provider Nesting Hierarchy

```mermaid
flowchart TD
    subgraph LEVEL0["Level 0: Root Layout"]
        TH{{"ThemeProvider"}}
        MP{{"MotionProvider"}}
    end

    subgraph LEVEL1["Level 1: Root Providers"]
        TT{{"TooltipProvider"}}
        SW{{"SWRConfig"}}
        AU{{"AuthProvider"}}
    end

    subgraph LEVEL2["Level 2: Chat Layout Client"]
        SE{{"SettingsProvider"}}
        DS{{"DataStreamProvider"}}
        OC{{"OptimisticChatsProvider"}}
        SB{{"SidebarProvider"}}
    end

    TH --> MP
    MP --> TT
    TT --> SW
    SW --> AU
    AU -->|"'use client' boundary"| SE
    SE --> DS
    DS --> OC
    OC --> SB

    subgraph CONSUMERS["Consumer Components"]
        AppSidebar(["AppSidebar"])
        SidebarInset(["SidebarInset"])
        Chat(["Chat.tsx"])
        ChatHeader(["ChatHeader.tsx"])
        Artifact(["Artifact.tsx"])
        Messages(["Messages.tsx"])
        MultimodalInput(["MultimodalInput.tsx"])
    end

    SB --> AppSidebar
    SB --> SidebarInset
    SidebarInset --> Chat
    SidebarInset --> ChatHeader
    SidebarInset --> Artifact

    style LEVEL0 fill:#f3e5f5,stroke:#7b1fa2
    style LEVEL1 fill:#e8f5e9,stroke:#388e3c
    style LEVEL2 fill:#fff3e0,stroke:#f57c00
    style CONSUMERS fill:#e3f2fd,stroke:#1976d2
```

---

## 3. DataStreamProvider Split Context Pattern

```mermaid
flowchart TB
    subgraph DSP["DataStreamProvider"]
        direction TB
        State["useState()<br/>dataStream, setDataStream"]

        subgraph CONTEXTS["Split Contexts"]
            StateCtx[["DataStreamStateContext<br/>(dataStream value)"]]
            DispatchCtx[["DataStreamDispatchContext<br/>(setDataStream fn)"]]
        end

        State --> StateCtx
        State --> DispatchCtx
    end

    subgraph HOOKS["Exported Hooks"]
        useDS["useDataStream()<br/>⚠️ Returns both<br/>(re-renders on change)"]
        useDSState["useDataStreamState()<br/>📖 Read only<br/>(re-renders on change)"]
        useDSDispatch["useDataStreamDispatch()<br/>✏️ Write only<br/>(NO re-renders!)"]
    end

    StateCtx --> useDS
    DispatchCtx --> useDS
    StateCtx --> useDSState
    DispatchCtx --> useDSDispatch

    subgraph USAGE["Component Usage"]
        Reader(["Components reading stream<br/>(Messages, Artifact)"])
        Writer(["Components writing stream<br/>(MultimodalInput)"])
        Both(["Components doing both<br/>(Chat.tsx)"])
    end

    useDSState -.->|"subscribe"| Reader
    useDSDispatch -.->|"dispatch"| Writer
    useDS -.->|"full access"| Both

    style DSP fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    style HOOKS fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
    style USAGE fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
```

---

## 4. Component Tree with Client Boundaries

```mermaid
flowchart TD
    subgraph SERVER["Server Components"]
        RL["app/layout.tsx"]
        CL["app/(chat)/layout.tsx"]
        CP["app/(chat)/page.tsx"]
    end

    subgraph CLIENT_ROOT["Client: Root Boundary"]
        AS["AppShell"]
    end

    subgraph CLIENT_CHAT["Client: Chat Boundary"]
        CLC["ChatLayoutClient<br/>'use client'"]

        subgraph SIDEBAR["Sidebar Area"]
            ASB(["AppSidebar"])
            SHI(["SidebarHistoryItem"])
            SUN(["SidebarUserNav"])
        end

        subgraph MAIN["Main Content Area"]
            SI(["SidebarInset"])
            CH(["Chat.tsx"])
            CHH(["ChatHeader.tsx"])
            ART(["Artifact.tsx"])
            MSG(["Messages.tsx"])
            MI(["MultimodalInput.tsx"])
        end
    end

    RL --> AS
    AS --> CL
    CL --> CLC
    CLC --> ASB
    CLC --> SI
    SI --> CH
    CH --> CHH
    CH --> MSG
    CH --> MI
    CH --> ART

    style SERVER fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    style CLIENT_ROOT fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style CLIENT_CHAT fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
```

---

## 5. Provider → Consumer Mapping

```mermaid
flowchart LR
    subgraph PROVIDERS["Providers"]
        TH{{"ThemeProvider"}}
        MP{{"MotionProvider"}}
        AU{{"AuthProvider"}}
        SE{{"SettingsProvider"}}
        DS{{"DataStreamProvider"}}
        OC{{"OptimisticChatsProvider"}}
        SB{{"SidebarProvider"}}
    end

    subgraph COMPONENTS["Consumer Components"]
        ANY(["Any Component"])
        AUTH(["Protected Components"])
        SETTINGS(["Settings Panel"])
        CHAT(["Chat.tsx"])
        MESSAGES(["Messages.tsx"])
        INPUT(["MultimodalInput.tsx"])
        SIDEBAR(["AppSidebar"])
        HEADER(["ChatHeader.tsx"])
        ARTIFACT(["Artifact.tsx"])
        HISTORY(["SidebarHistory"])
    end

    TH -.->|"useTheme()"| ANY
    MP -.->|"motion, AnimatePresence"| ANY
    AU -.->|"useSession()"| AUTH
    SE -.->|"useSettings()"| SETTINGS
    DS -.->|"useDataStream*()"| CHAT
    DS -.->|"useDataStreamState()"| MESSAGES
    DS -.->|"useDataStreamDispatch()"| INPUT
    OC -.->|"useOptimisticChats()"| HISTORY
    OC -.->|"useOptimisticChats()"| SIDEBAR
    SB -.->|"useSidebar()"| HEADER
    SB -.->|"useSidebar()"| ARTIFACT

    style PROVIDERS fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    style COMPONENTS fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
```

---

## Legend

| Symbol               | Meaning                |
| -------------------- | ---------------------- |
| `[Rectangle]`        | Server Component       |
| `([Rounded])`        | Client Component       |
| `{{Diamond}}`        | Provider (Context)     |
| `[[Double Bracket]]` | Context Object         |
| `-->`                | Direct child / nesting |
| `-.->`               | Consumes / uses hook   |
| Green background     | Server-side            |
| Blue background      | Client-side (root)     |
| Orange background    | Client-side (chat)     |
| Purple background    | Provider layer         |

---

## File Locations

| Provider                | Path                                                 |
| ----------------------- | ---------------------------------------------------- |
| AuthProvider            | `components/providers/auth-provider.tsx`             |
| ThemeProvider           | `components/providers/theme-provider.tsx`            |
| DataStreamProvider      | `components/providers/data-stream-provider.tsx`      |
| SettingsProvider        | `components/providers/settings-provider.tsx`         |
| OptimisticChatsProvider | `components/providers/optimistic-chats-provider.tsx` |
| MotionProvider          | `components/providers/motion-provider.tsx`           |

---

## Key Architecture Decisions

1. **Split Context Pattern**: `DataStreamProvider` uses two separate contexts to allow dispatch-only components to avoid re-renders when state changes.

2. **Client Boundary Placement**: The main `'use client'` boundary is at `chat-layout-client.tsx`, keeping layout server-rendered while enabling client interactivity.

3. **Provider Hierarchy**: Providers are nested from most global (Theme) to most specific (Sidebar), ensuring each layer can access parent context.

4. **Lazy Loading**: `AppSidebar` is dynamically imported with `next/dynamic` to reduce initial bundle size.

5. **MotionProvider Integration**: Uses `LazyMotion` with `domAnimation` feature set (~40KB bundle savings vs full framer-motion). Strict mode is enabled for development warnings. Components use re-exported `motion` and `AnimatePresence` from the provider module for tree-shaking benefits.

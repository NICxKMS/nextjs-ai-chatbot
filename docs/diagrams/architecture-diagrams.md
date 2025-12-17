# Architecture Overhaul Diagrams

> Source: [Architecture Overhaul Design Document](../../.ouroboros/specs/architecture-overhaul/design.md)

---

## Table of Contents

1. [High-Level Architecture](#1-high-level-architecture)
2. [Runtime Boundary Model](#2-runtime-boundary-model)
3. [Module Dependency Rules](#3-module-dependency-rules)
4. [Provider Hierarchy](#4-provider-hierarchy)
5. [Chat Component Tree](#5-chat-component-tree)
6. [Read Flow](#6-read-flow)
7. [Write Flow](#7-write-flow)
8. [Streaming Flow](#8-streaming-flow)
9. [Bundle Distribution](#9-bundle-distribution)
10. [Cache Layers](#10-cache-layers)
11. [Error Boundaries](#11-error-boundaries)
12. [Migration Timeline](#12-migration-timeline)

---

## 1. High-Level Architecture

Four-layer architecture: Presentation, Feature Modules, Core, and Shared layers.

```mermaid
graph TB
    subgraph "Presentation Layer"
        subgraph "App Router"
            RL[Root Layout<br/>Server]
            AUTH["(auth)/*"]
            CHAT["(chat)/*"]
            API["api/*"]
        end
        
        subgraph "Parallel Routes"
            SIDEBAR["@sidebar"]
            MAIN["@main"]
        end
    end
    
    subgraph "Feature Modules"
        F_CHAT[features/chat]
        F_AUTH[features/auth]
        F_ARTIFACT[features/artifacts]
        F_SETTINGS[features/settings]
    end
    
    subgraph "Core Layer"
        CORE_DB[core/database]
        CORE_AUTH[core/auth]
        CORE_CACHE[core/cache]
        CORE_ERROR[core/errors]
    end
    
    subgraph "Shared Layer"
        SHARED_TYPES[shared/types]
        SHARED_UI[shared/ui]
        SHARED_UTILS[shared/utils]
    end
    
    RL --> AUTH
    RL --> CHAT
    RL --> API
    
    CHAT --> SIDEBAR
    CHAT --> MAIN
    
    SIDEBAR --> F_CHAT
    MAIN --> F_CHAT
    
    F_CHAT --> CORE_DB
    F_AUTH --> CORE_AUTH
    F_ARTIFACT --> CORE_DB
    
    CORE_DB --> SHARED_TYPES
    F_CHAT --> SHARED_UI
```

---

## 2. Runtime Boundary Model

Server/Client/Edge runtime separation showing what runs where.

```mermaid
graph LR
    subgraph "Server Runtime"
        S1[Route Handlers]
        S2[Server Components]
        S3[Server Actions]
        S4["'use cache' Functions"]
    end
    
    subgraph "Client Runtime"
        C1[Interactive Components]
        C2[Hooks]
        C3[Client State]
    end
    
    subgraph "Edge Runtime"
        E1[Middleware]
        E2[Edge Functions]
    end
    
    subgraph "Shared"
        T1[Types]
        T2[Constants]
        T3[Pure Utilities]
    end
    
    S1 -.-> T1
    S2 -.-> T1
    C1 -.-> T1
    E1 -.-> T2
```

---

## 3. Module Dependency Rules

Dependency direction rules and forbidden imports between layers.

```mermaid
graph TD
    subgraph "Dependency Direction"
        APP[app/] --> FEATURES[features/]
        APP --> SHARED[shared/]
        FEATURES --> CORE[core/]
        FEATURES --> SHARED
        CORE --> SHARED
    end
    
    subgraph "Forbidden"
        F1[features/chat] -.X.-> F2[features/auth]
        CORE -.X.-> FEATURES
        SHARED -.X.-> FEATURES
        SHARED -.X.-> CORE
    end
```

---

## 4. Provider Hierarchy

Flattened 4-level provider structure (down from 9 levels).

```mermaid
graph TD
    ROOT["RootLayout (Server)"]
    PROV["Providers (Client)"]
    THEME[ThemeProvider]
    AUTH[AuthProvider]
    CHAT_LAYOUT["ChatLayout (Server)"]
    CHAT_PROV["ChatProviders (Client)"]
    DATA[DataStreamProvider]
    SETTINGS[SettingsProvider]
    
    ROOT --> PROV
    PROV --> THEME
    PROV --> AUTH
    AUTH --> CHAT_LAYOUT
    CHAT_LAYOUT --> CHAT_PROV
    CHAT_PROV --> DATA
    CHAT_PROV --> SETTINGS
```

---

## 5. Chat Component Tree

Server/Client component breakdown for chat feature.

```mermaid
graph TD
    subgraph "Server Components"
        CL[ChatLayout]
        CP[ChatPage]
    end
    
    subgraph "Client Components"
        CC[ChatContainer]
        ML[MessageList]
        MI[MessageInput]
        MSG[Message]
        ART[ArtifactViewer]
    end
    
    CL --> CP
    CP --> CC
    CC --> ML
    CC --> MI
    ML --> MSG
    MSG --> ART
```

---

## 6. Read Flow

Browser → Server → Cache → Database data fetching flow.

```mermaid
sequenceDiagram
    participant Browser
    participant ServerComponent
    participant Cache as "use cache"
    participant Repository
    participant Database
    
    Browser->>ServerComponent: Request Page
    ServerComponent->>Cache: getChatData(id)
    Cache->>Repository: chatRepository.findById()
    Repository->>Database: SQL Query
    Database-->>Repository: Rows
    Repository-->>Cache: Chat Entity
    Cache-->>ServerComponent: Cached Data
    ServerComponent-->>Browser: HTML + Hydration Data
```

---

## 7. Write Flow

Optimistic updates with Server Actions.

```mermaid
sequenceDiagram
    participant Browser
    participant ClientComponent
    participant ServerAction
    participant Repository
    participant Database
    
    Browser->>ClientComponent: User Action
    ClientComponent->>ClientComponent: Optimistic Update
    ClientComponent->>ServerAction: "use server" action
    ServerAction->>Repository: chatRepository.save()
    Repository->>Database: INSERT/UPDATE
    Database-->>Repository: Result
    Repository-->>ServerAction: Success
    ServerAction-->>ClientComponent: Revalidate
    ClientComponent-->>Browser: Confirmed State
```

---

## 8. Streaming Flow

AI response streaming via SSE.

```mermaid
sequenceDiagram
    participant Browser
    participant RouteHandler
    participant AIService
    participant StreamTransform
    
    Browser->>RouteHandler: POST /api/chat
    RouteHandler->>AIService: Generate Stream
    loop Streaming
        AIService-->>StreamTransform: Token
        StreamTransform-->>Browser: SSE Chunk
    end
    StreamTransform-->>Browser: [DONE]
```

---

## 9. Bundle Distribution

Target bundle split percentages.

```mermaid
pie title Bundle Distribution (Target)
    "Framework (React, Next)" : 35
    "Core App Shell" : 15
    "Chat Feature" : 20
    "Artifacts (Lazy)" : 15
    "Third-party (Lazy)" : 15
```

---

## 10. Cache Layers

Next.js + Application + Browser caching hierarchy.

```mermaid
graph LR
    subgraph "Next.js Cache"
        FC[Full Route Cache]
        DC[Data Cache]
        RC[Request Cache]
    end
    
    subgraph "Application Cache"
        REDIS[Redis/Upstash]
        SWR[SWR Client Cache]
    end
    
    subgraph "Browser"
        HTTP[HTTP Cache]
        SW[Service Worker]
    end
    
    FC --> DC
    DC --> REDIS
    SWR --> HTTP
```

---

## 11. Error Boundaries

error.tsx cascade through route groups.

```mermaid
graph TD
    ROOT[global-error.tsx]
    CHAT["(chat)/error.tsx"]
    SIDEBAR["@sidebar/error.tsx"]
    MAIN["@main/error.tsx"]
    COMP[Component ErrorBoundary]
    
    ROOT --> CHAT
    CHAT --> SIDEBAR
    CHAT --> MAIN
    MAIN --> COMP
```

---

## 12. Migration Timeline

Phase timeline for architecture migration.

```mermaid
gantt
    title Migration Timeline
    dateFormat  YYYY-MM-DD
    section Phase 1
    Directory Structure    :p1, 2025-01-01, 7d
    Core Layer Setup      :p2, after p1, 5d
    section Phase 2
    Feature Extraction    :p3, after p2, 14d
    Provider Refactor     :p4, after p2, 7d
    section Phase 3
    Bundle Optimization   :p5, after p3, 7d
    Testing & Validation  :p6, after p5, 7d
```

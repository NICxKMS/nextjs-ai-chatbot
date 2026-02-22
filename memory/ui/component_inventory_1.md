# Component Inventory 1: Routes, Shells, Navigation

Catalog format:
- `Component`
- `Primary role`
- `Key user-visible contracts`
- `Traceability`

## Route and Shell Components

- `RootLayout`
  - Role: global app frame and providers.
  - Contracts: global loading fallback, theme color script, toast layer, auth/theme/tooltip wrappers.
  - Traceability: `oldapp/app/layout.tsx`.

- `GlobalError`
  - Role: uncaught app-level exception fallback.
  - Contracts: generic full-page error rendering.
  - Traceability: `oldapp/app/global-error.tsx`.

- `Chat group layout` + `ChatLayoutClient`
  - Role: chat route shell.
  - Contracts: sidebar + main inset layout, notice-to-toast translation, sidebar skeleton/content suspense.
  - Traceability: `oldapp/app/(chat)/layout.tsx`, `oldapp/app/(chat)/chat-layout-client.tsx`.

- `Chat page (new)`
  - Role: initializes empty chat with generated ID.
  - Contracts: empty timeline, active composer, data stream handler.
  - Traceability: `oldapp/app/(chat)/page.tsx`.

- `Chat page (existing)`
  - Role: hydrate persisted chat and vote data.
  - Contracts: readonly when not owner, redirect + notice for not-found/unauthorized.
  - Traceability: `oldapp/app/(chat)/chat/[id]/page.tsx`.

- `Chat loading pages`
  - Role: route-level suspense placeholders.
  - Contracts: spinner + context-specific loading copy.
  - Traceability: `oldapp/app/(chat)/loading.tsx`, `oldapp/app/(chat)/chat/[id]/loading.tsx`.

- `ChatError`
  - Role: chat route error recovery.
  - Contracts: digest display, home/reset actions.
  - Traceability: `oldapp/app/(chat)/error.tsx`.

- `LoginPage` / `RegisterPage`
  - Role: auth entry points.
  - Contracts: form validation, async auth exchange, toast feedback, redirects.
  - Traceability: `oldapp/app/(auth)/login/page.tsx`, `oldapp/app/(auth)/register/page.tsx`.

## Session/Theme/Data Providers

- `AuthProvider`
  - Role: session state and guest bootstrap.
  - Contracts: auth status transitions should avoid false history fetches and enable first-chat behavior.
  - Traceability: `oldapp/components/auth-provider.tsx`.

- `ThemeProvider`
  - Role: dark/light/system orchestration.
  - Contracts: class-based theme toggling and resolved theme access.
  - Traceability: `oldapp/components/theme-provider.tsx`.

- `DataStreamProvider` + `DataStreamHandler`
  - Role: streamed UI-part state bus for artifacts.
  - Contracts: ordered stream consumption and artifact state updates.
  - Traceability: `oldapp/components/data-stream-provider.tsx`, `oldapp/components/data-stream-handler.tsx`.

## Sidebar and Navigation Components

- `AppSidebar`
  - Role: container for logo, new chat, delete-all, history, user nav.
  - Contracts: dialogs for destructive actions, mobile close on navigation.
  - Traceability: `oldapp/components/app-sidebar.tsx`.

- `SidebarHistory`
  - Role: grouped virtualized chat history with pagination.
  - Contracts: loading/empty/end states, optimistic chat reconciliation, delete dialog.
  - Traceability: `oldapp/components/sidebar-history.tsx`.

- `ChatItem`
  - Role: single history row with menu.
  - Contracts: active-row state, share visibility controls, delete trigger.
  - Traceability: `oldapp/components/sidebar-history-item.tsx`.

- `SidebarUserNav`
  - Role: footer identity + account actions.
  - Contracts: guest/auth labels, theme toggle, login/signout action handling.
  - Traceability: `oldapp/components/sidebar-user-nav.tsx`.

- `SidebarToggle`
  - Role: top-bar sidebar open/close control.
  - Contracts: tooltip on desktop, icon button behavior.
  - Traceability: `oldapp/components/sidebar-toggle.tsx`.

- `Sidebar UI primitives`
  - Role: infrastructure for desktop/mobile variants, collapse states.
  - Contracts: mobile sheet under 768px, cookie persistence, Ctrl/Cmd+B shortcut.
  - Traceability: `oldapp/components/ui/sidebar.tsx`.

## Auth and Utility Form Components

- `AuthForm`
  - Role: shared login/register form shell.
  - Contracts: labeled email/password inputs and action slot.
  - Traceability: `oldapp/components/auth-form.tsx`.

- `SubmitButton`
  - Role: async form submit state control.
  - Contracts: disabled+spinner while pending/success, live-region text updates.
  - Traceability: `oldapp/components/submit-button.tsx`.

- `Toast` wrapper
  - Role: custom toast visual style.
  - Contracts: icon by type, multiline alignment logic.
  - Traceability: `oldapp/components/toast.tsx`.

## Conclusions
- Shell and navigation components carry critical app-state assumptions (guest session, history fetch conditions, mobile sidebar mode).
- Route-level parity is mostly deterministic; component-level parity risk is concentrated downstream (chat/artifact systems covered in Inventory 2).

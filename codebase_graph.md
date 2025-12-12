# Codebase Architecture Map

```xml
<codebase name="neo_client" framework="nextjs" router="app" language="ts">
  <directories>

  </directories>

  <routes>
    <route id="route__layout" path="/" file="layout.tsx" type="layout" segment="." isClient="false" />
    <route id="route_chat_layout" path="/" file="(chat)\layout.tsx" type="layout" segment="(chat)" isClient="false" />
    <route id="route_chat_loading" path="/" file="(chat)\loading.tsx" type="loading" segment="(chat)" isClient="false" />
    <route id="route_chat_page" path="/" file="(chat)\page.tsx" type="page" segment="(chat)" isClient="false" />
    <route id="route_auth\login_page" path="/login" file="(auth)\login\page.tsx" type="page" segment="login" isClient="true" />
    <route id="route_auth\register_page" path="/register" file="(auth)\register\page.tsx" type="page" segment="register" isClient="true" />
    <route id="route_chat\chat\[id]_loading" path="/chat/[id]" file="(chat)\chat\[id]\loading.tsx" type="loading" segment="[id]" isClient="false" />
    <route id="route_chat\chat\[id]_page" path="/chat/[id]" file="(chat)\chat\[id]\page.tsx" type="page" segment="[id]" isClient="false" />
  </routes>

  <components>
    <component id="cmp_GlobalError" name="GlobalError" path="f:/Study/Code/git/nextjs-ai-chatbot/app/global-error.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Effects: 1 detected</description>
      <props>
        <prop name="error" type="any" required="true" />
      </props>
      <imports>
        <import name="" from="@sentry/nextjs" />
        <import name="NextError" from="next/error" />
        <import name="useEffect" from="react" />
      </imports>
    </component>
    <component id="cmp_Head" name="Head" path="f:/Study/Code/git/nextjs-ai-chatbot/app/head.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
    </component>
    <component id="cmp_RootLayout" name="RootLayout" path="f:/Study/Code/git/nextjs-ai-chatbot/app/layout.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
      <props>
        <prop name="children" type="any" required="true" />
      </props>
      <imports>
        <import name="SpeedInsights" from="@vercel/speed-insights/next" />
        <import name="Metadata" from="next" />
        <import name="Geist, Geist_Mono" from="next/font/google" />
        <import name="Script" from="next/script" />
        <import name="Suspense" from="react" />
        <import name="Toaster" from="sonner" />
        <import name="SWRConfig" from="swr" />
        <import name="AuthProvider" from="@/components/auth-provider" />
        <import name="ThemeProvider" from="@/components/theme-provider" />
        <import name="getAppSession" from="@/lib/auth/session" />
        <import name="" from="./globals.css" />
      </imports>
    </component>
    <component id="cmp_AppShellFallback" name="AppShellFallback" path="f:/Study/Code/git/nextjs-ai-chatbot/app/layout.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="SpeedInsights" from="@vercel/speed-insights/next" />
        <import name="Metadata" from="next" />
        <import name="Geist, Geist_Mono" from="next/font/google" />
        <import name="Script" from="next/script" />
        <import name="Suspense" from="react" />
        <import name="Toaster" from="sonner" />
        <import name="SWRConfig" from="swr" />
        <import name="AuthProvider" from="@/components/auth-provider" />
        <import name="ThemeProvider" from="@/components/theme-provider" />
        <import name="getAppSession" from="@/lib/auth/session" />
        <import name="" from="./globals.css" />
      </imports>
    </component>
    <component id="cmp_AppShell" name="AppShell" path="f:/Study/Code/git/nextjs-ai-chatbot/app/layout.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
      <props>
        <prop name="children" type="any" required="true" />
      </props>
      <imports>
        <import name="SpeedInsights" from="@vercel/speed-insights/next" />
        <import name="Metadata" from="next" />
        <import name="Geist, Geist_Mono" from="next/font/google" />
        <import name="Script" from="next/script" />
        <import name="Suspense" from="react" />
        <import name="Toaster" from="sonner" />
        <import name="SWRConfig" from="swr" />
        <import name="AuthProvider" from="@/components/auth-provider" />
        <import name="ThemeProvider" from="@/components/theme-provider" />
        <import name="getAppSession" from="@/lib/auth/session" />
        <import name="" from="./globals.css" />
      </imports>
    </component>
    <component id="cmp_AppSidebar" name="AppSidebar" path="f:/Study/Code/git/nextjs-ai-chatbot/components/app-sidebar.tsx" kind="ui" isClient="true">
      <description>[Skeleton] State: { showDeleteAllDialog } | Uses: useRouter, useSidebar, useSWRConfig, useAuth</description>
      <imports>
        <import name="Link" from="next/link" />
        <import name="useRouter" from="next/navigation" />
        <import name="useState" from="react" />
        <import name="toast" from="sonner" />
        <import name="useSWRConfig" from="swr" />
        <import name="unstable_serialize" from="swr/infinite" />
        <import name="useAuth" from="@/components/auth-provider" />
        <import name="PlusIcon, TrashIcon" from="@/components/icons" />
        <import name="getChatHistoryPaginationKey, SidebarHistory" from="@/components/sidebar-history" />
        <import name="SidebarUserNav" from="@/components/sidebar-user-nav" />
        <import name="Button" from="@/components/ui/button" />
        <import name="Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, useSidebar" from="@/components/ui/sidebar" />
        <import name="AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle" from="./ui/alert-dialog" />
        <import name="Tooltip, TooltipContent, TooltipTrigger" from="./ui/tooltip" />
      </imports>
      <usesHooks>
        <hook name="useRouter" />
        <hook name="useSidebar" />
        <hook name="useSWRConfig" />
        <hook name="useAuth" />
      </usesHooks>
    </component>
    <component id="cmp_PureArtifactActions" name="PureArtifactActions" path="f:/Study/Code/git/nextjs-ai-chatbot/components/artifact-actions.tsx" kind="ui" isClient="false">
      <description>[Skeleton] State: { isLoading }</description>
      <props>
        <prop name="artifact" type="any" required="true" />
        <prop name="handleVersionChange" type="any" required="true" />
        <prop name="currentVersionIndex" type="any" required="true" />
        <prop name="isCurrentVersion" type="any" required="true" />
        <prop name="mode" type="any" required="true" />
        <prop name="metadata" type="any" required="true" />
        <prop name="setMetadata" type="any" required="true" />
      </props>
      <imports>
        <import name="Dispatch, memo, SetStateAction, useState" from="react" />
        <import name="toast" from="sonner" />
        <import name="cn" from="@/lib/utils" />
        <import name="artifactDefinitions, UIArtifact" from="./artifact" />
        <import name="ArtifactActionContext" from="./create-artifact" />
        <import name="Button" from="./ui/button" />
        <import name="Tooltip, TooltipContent, TooltipTrigger" from="./ui/tooltip" />
      </imports>
    </component>
    <component id="cmp_PureArtifactCloseButton" name="PureArtifactCloseButton" path="f:/Study/Code/git/nextjs-ai-chatbot/components/artifact-close-button.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Uses: useArtifact</description>
      <imports>
        <import name="memo" from="react" />
        <import name="initialArtifactData, useArtifact" from="@/hooks/use-artifact" />
        <import name="CrossIcon" from="./icons" />
        <import name="Button" from="./ui/button" />
      </imports>
      <usesHooks>
        <hook name="useArtifact" />
      </usesHooks>
    </component>
    <component id="cmp_PureArtifactMessages" name="PureArtifactMessages" path="f:/Study/Code/git/nextjs-ai-chatbot/components/artifact-messages.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Uses: useMessages</description>
      <props>
        <prop name="chatId" type="any" required="true" />
        <prop name="status" type="any" required="true" />
        <prop name="votes" type="any" required="true" />
        <prop name="messages" type="any" required="true" />
        <prop name="setMessages" type="any" required="true" />
        <prop name="regenerate" type="any" required="true" />
        <prop name="isReadonly" type="any" required="true" />
      </props>
      <imports>
        <import name="UseChatHelpers" from="@ai-sdk/react" />
        <import name="equal" from="fast-deep-equal" />
        <import name="AnimatePresence, motion" from="framer-motion" />
        <import name="memo" from="react" />
        <import name="useMessages" from="@/hooks/use-messages" />
        <import name="ModelMetadata" from="@/lib/ai/model-catalog-types" />
        <import name="ChatMessage, UserVote" from="@/lib/types" />
        <import name="UIArtifact" from="./artifact" />
        <import name="PreviewMessage, ThinkingMessage" from="./message" />
      </imports>
      <usesHooks>
        <hook name="useMessages" />
      </usesHooks>
    </component>
    <component id="cmp_PureArtifact" name="PureArtifact" path="f:/Study/Code/git/nextjs-ai-chatbot/components/artifact.tsx" kind="ui" isClient="false">
      <description>[Skeleton] State: { mode, document, currentVersionIndex, isContentDirty, isToolbarVisible } | Effects: 4 detected | Uses: useArtifact, useSWR, useSidebar, useSWRConfig, useCallback, useDebounceCallback, useWindowSize</description>
      <props>
        <prop name="chatId" type="any" required="true" />
        <prop name="input" type="any" required="true" />
        <prop name="setInput" type="any" required="true" />
        <prop name="status" type="any" required="true" />
        <prop name="stop" type="any" required="true" />
        <prop name="attachments" type="any" required="true" />
        <prop name="setAttachments" type="any" required="true" />
        <prop name="sendMessage" type="any" required="true" />
        <prop name="messages" type="any" required="true" />
        <prop name="setMessages" type="any" required="true" />
        <prop name="regenerate" type="any" required="true" />
        <prop name="votes" type="any" required="true" />
        <prop name="isReadonly" type="any" required="true" />
        <prop name="selectedVisibilityType" type="any" required="true" />
        <prop name="selectedModelId" type="any" required="true" />
      </props>
      <imports>
        <import name="UseChatHelpers" from="@ai-sdk/react" />
        <import name="formatDistance" from="date-fns" />
        <import name="equal" from="fast-deep-equal" />
        <import name="AnimatePresence, motion" from="framer-motion" />
        <import name="Dispatch, memo, SetStateAction, useCallback, useEffect, useState" from="react" />
        <import name="useSWR" from="swr" />
        <import name="useDebounceCallback, useWindowSize" from="usehooks-ts" />
        <import name="codeArtifact" from="@/artifacts/code/client" />
        <import name="imageArtifact" from="@/artifacts/image/client" />
        <import name="sheetArtifact" from="@/artifacts/sheet/client" />
        <import name="textArtifact" from="@/artifacts/text/client" />
        <import name="useArtifact" from="@/hooks/use-artifact" />
        <import name="ModelMetadata" from="@/lib/ai/model-catalog-types" />
        <import name="Document" from="@/lib/db/schema" />
        <import name="Attachment, ChatMessage, UserVote" from="@/lib/types" />
        <import name="fetcher" from="@/lib/utils" />
        <import name="ArtifactActions" from="./artifact-actions" />
        <import name="ArtifactCloseButton" from="./artifact-close-button" />
        <import name="ArtifactMessages" from="./artifact-messages" />
        <import name="MultimodalInput" from="./multimodal-input" />
        <import name="Toolbar" from="./toolbar" />
        <import name="useSidebar" from="./ui/sidebar" />
        <import name="VersionFooter" from="./version-footer" />
        <import name="VisibilityType" from="./visibility-selector" />
      </imports>
      <usesHooks>
        <hook name="useArtifact" />
        <hook name="useSWR" />
        <hook name="useSidebar" />
        <hook name="useSWRConfig" />
        <hook name="useCallback" />
        <hook name="useDebounceCallback" />
        <hook name="useWindowSize" />
      </usesHooks>
    </component>
    <component id="cmp_AuthForm" name="AuthForm" path="f:/Study/Code/git/nextjs-ai-chatbot/components/auth-form.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
      <props>
        <prop name="action" type="any" required="true" />
        <prop name="children" type="any" required="true" />
        <prop name="defaultEmail" type="any" required="true" />
      </props>
      <imports>
        <import name="Form" from="next/form" />
        <import name="Input" from="./ui/input" />
        <import name="Label" from="./ui/label" />
      </imports>
    </component>
    <component id="cmp_AuthProvider" name="AuthProvider" path="f:/Study/Code/git/nextjs-ai-chatbot/components/auth-provider.tsx" kind="ui" isClient="true">
      <description>[Skeleton] State: { session } | Effects: 2 detected | Uses: useMemo</description>
      <props>
        <prop name="initialSession" type="any" required="true" />
        <prop name="children" type="any" required="true" />
      </props>
      <imports>
        <import name="AuthChangeEvent, Session" from="@supabase/supabase-js" />
        <import name="ReactNode" from="react" />
        <import name="createContext, useContext, useEffect, useMemo, useState" from="react" />
        <import name="getSupabaseBrowserClient" from="@/lib/auth/client" />
        <import name="AppSession" from="@/lib/auth/session" />
      </imports>
      <usesHooks>
        <hook name="useMemo" />
      </usesHooks>
    </component>
    <component id="cmp_PureChatHeader" name="PureChatHeader" path="f:/Study/Code/git/nextjs-ai-chatbot/components/chat-header.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Uses: useRouter, useSidebar, useWindowSize</description>
      <props>
        <prop name="chatId" type="any" required="true" />
        <prop name="selectedVisibilityType" type="any" required="true" />
        <prop name="isReadonly" type="any" required="true" />
      </props>
      <imports>
        <import name="useRouter" from="next/navigation" />
        <import name="memo" from="react" />
        <import name="useWindowSize" from="usehooks-ts" />
        <import name="SidebarToggle" from="@/components/sidebar-toggle" />
        <import name="Button" from="@/components/ui/button" />
        <import name="PlusIcon" from="./icons" />
        <import name="SettingsButton" from="./settings/settings-sheet" />
        <import name="useSidebar" from="./ui/sidebar" />
        <import name="VisibilitySelector, VisibilityType" from="./visibility-selector" />
      </imports>
      <usesHooks>
        <hook name="useRouter" />
        <hook name="useSidebar" />
        <hook name="useWindowSize" />
      </usesHooks>
    </component>
    <component id="cmp_Chat" name="Chat" path="f:/Study/Code/git/nextjs-ai-chatbot/components/chat.tsx" kind="ui" isClient="true">
      <description>[Skeleton] State: { input, usage, showCreditCardAlert, currentModelId, hasAppendedQuery... } | Effects: 4 detected | Uses: useChatVisibility, useDataStream, useSettingsSnapshot, useOptimisticChats, useArtifact, useRef, useCallback, useMemo, useChat, useSearchParams, useAuth, useSWR, useArtifactSelector</description>
      <props>
        <prop name="id" type="any" required="true" />
        <prop name="initialMessages" type="any" required="true" />
        <prop name="initialChatModel" type="any" required="true" />
        <prop name="initialVisibilityType" type="any" required="true" />
        <prop name="isReadonly" type="any" required="true" />
        <prop name="initialLastContext" type="any" required="true" />
        <prop name="availableModels" type="any" required="true" />
        <prop name="initialVotes" type="any" required="true" />
      </props>
      <imports>
        <import name="useChat" from="@ai-sdk/react" />
        <import name="DefaultChatTransport" from="ai" />
        <import name="dynamic" from="next/dynamic" />
        <import name="useSearchParams" from="next/navigation" />
        <import name="useCallback, useEffect, useMemo, useRef, useState" from="react" />
        <import name="useSWR" from="swr" />
        <import name="useAuth" from="@/components/auth-provider" />
        <import name="ChatHeader" from="@/components/chat-header" />
        <import name="AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle" from="@/components/ui/alert-dialog" />
        <import name="initialArtifactData, useArtifact, useArtifactSelector" from="@/hooks/use-artifact" />
        <import name="useChatVisibility" from="@/hooks/use-chat-visibility" />
        <import name="useOptimisticChats" from="@/hooks/use-optimistic-chats" />
        <import name="ModelMetadata" from="@/lib/ai/model-catalog-types" />
        <import name="ChatSDKError" from="@/lib/errors" />
        <import name="logError, logWarn" from="@/lib/log" />
        <import name="Attachment, ChatMessage, isDataAppendMessagePart, isDataChatTitlePart, UserVote" from="@/lib/types" />
        <import name="useSettingsSnapshot" from="@/lib/ui/settings-store" />
        <import name="AppUsage" from="@/lib/usage" />
        <import name="fetchWithErrorHandlers, generateUUID" from="@/lib/utils" />
        <import name="useDataStream" from="./data-stream-provider" />
        <import name="Messages" from="./messages" />
        <import name="MultimodalInput" from="./multimodal-input" />
        <import name="toast" from="./toast" />
        <import name="VisibilityType" from="./visibility-selector" />
      </imports>
      <usesHooks>
        <hook name="useChatVisibility" />
        <hook name="useDataStream" />
        <hook name="useSettingsSnapshot" />
        <hook name="useOptimisticChats" />
        <hook name="useArtifact" />
        <hook name="useRef" />
        <hook name="useCallback" />
        <hook name="useMemo" />
        <hook name="useChat" />
        <hook name="useSearchParams" />
        <hook name="useAuth" />
        <hook name="useSWR" />
        <hook name="useArtifactSelector" />
      </usesHooks>
    </component>
    <component id="cmp_PureCodeEditor" name="PureCodeEditor" path="f:/Study/Code/git/nextjs-ai-chatbot/components/code-editor.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Effects: 3 detected | Uses: useRef</description>
      <props>
        <prop name="content" type="any" required="true" />
        <prop name="onSaveContent" type="any" required="true" />
        <prop name="status" type="any" required="true" />
      </props>
      <imports>
        <import name="python" from="@codemirror/lang-python" />
        <import name="EditorState, Transaction" from="@codemirror/state" />
        <import name="oneDark" from="@codemirror/theme-one-dark" />
        <import name="EditorView" from="@codemirror/view" />
        <import name="basicSetup" from="codemirror" />
        <import name="memo, useEffect, useRef" from="react" />
        <import name="Suggestion" from="@/lib/db/schema" />
      </imports>
      <usesHooks>
        <hook name="useRef" />
      </usesHooks>
    </component>
    <component id="cmp_Console" name="Console" path="f:/Study/Code/git/nextjs-ai-chatbot/components/console.tsx" kind="ui" isClient="false">
      <description>[Skeleton] State: { height, isResizing } | Effects: 3 detected | Uses: useRef, useArtifactSelector, useCallback</description>
      <props>
        <prop name="consoleOutputs" type="any" required="true" />
        <prop name="setConsoleOutputs" type="any" required="true" />
      </props>
      <imports>
        <import name="Dispatch, SetStateAction, useCallback, useEffect, useRef, useState" from="react" />
        <import name="useArtifactSelector" from="@/hooks/use-artifact" />
        <import name="cn" from="@/lib/utils" />
        <import name="Loader" from="./elements/loader" />
        <import name="CrossSmallIcon, TerminalWindowIcon" from="./icons" />
        <import name="Button" from="./ui/button" />
      </imports>
      <usesHooks>
        <hook name="useRef" />
        <hook name="useArtifactSelector" />
        <hook name="useCallback" />
      </usesHooks>
    </component>
    <component id="cmp_DataStreamHandler" name="DataStreamHandler" path="f:/Study/Code/git/nextjs-ai-chatbot/components/data-stream-handler.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Effects: 1 detected | Uses: useDataStream, useArtifact, useRef</description>
      <imports>
        <import name="useEffect, useRef" from="react" />
        <import name="initialArtifactData, useArtifact" from="@/hooks/use-artifact" />
        <import name="artifactDefinitions" from="./artifact" />
        <import name="useDataStream" from="./data-stream-provider" />
      </imports>
      <usesHooks>
        <hook name="useDataStream" />
        <hook name="useArtifact" />
        <hook name="useRef" />
      </usesHooks>
    </component>
    <component id="cmp_DataStreamProvider" name="DataStreamProvider" path="f:/Study/Code/git/nextjs-ai-chatbot/components/data-stream-provider.tsx" kind="ui" isClient="true">
      <description>[Skeleton] State: { dataStream } | Uses: useMemo</description>
      <props>
        <prop name="children" type="any" required="true" />
      </props>
      <imports>
        <import name="DataUIPart" from="ai" />
        <import name="React" from="react" />
        <import name="createContext, useContext, useMemo, useState" from="react" />
        <import name="ChatSDKError" from="@/lib/errors" />
        <import name="CustomUIDataTypes" from="@/lib/types" />
      </imports>
      <usesHooks>
        <hook name="useMemo" />
      </usesHooks>
    </component>
    <component id="cmp_DiffView" name="DiffView" path="f:/Study/Code/git/nextjs-ai-chatbot/components/diffview.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Effects: 1 detected | Uses: useMemo, useEditor</description>
      <imports>
        <import name="Editor, Extension, Mark" from="@tiptap/core" />
        <import name="Table" from="@tiptap/extension-table" />
        <import name="TableCell" from="@tiptap/extension-table-cell" />
        <import name="TableHeader" from="@tiptap/extension-table-header" />
        <import name="TableRow" from="@tiptap/extension-table-row" />
        <import name="Markdown" from="@tiptap/markdown" />
        <import name="Plugin, PluginKey" from="@tiptap/pm/state" />
        <import name="DecorationSet" from="@tiptap/pm/view" />
        <import name="EditorContent, useEditor" from="@tiptap/react" />
        <import name="StarterKit" from="@tiptap/starter-kit" />
        <import name="useEffect, useMemo" from="react" />
        <import name="DiffType, diffEditor" from="@/lib/editor/diff" />
      </imports>
      <usesHooks>
        <hook name="useMemo" />
        <hook name="useEditor" />
      </usesHooks>
    </component>
    <component id="cmp_DocumentPreview" name="DocumentPreview" path="f:/Study/Code/git/nextjs-ai-chatbot/components/document-preview.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Effects: 1 detected | Uses: useArtifact, useSWR, useMemo, useRef</description>
      <props>
        <prop name="isReadonly" type="any" required="true" />
        <prop name="result" type="any" required="true" />
        <prop name="args" type="any" required="true" />
      </props>
      <imports>
        <import name="equal" from="fast-deep-equal" />
        <import name="MouseEvent, memo, useCallback, useEffect, useMemo, useRef" from="react" />
        <import name="useSWR" from="swr" />
        <import name="useArtifact" from="@/hooks/use-artifact" />
        <import name="Document" from="@/lib/db/schema" />
        <import name="cn, fetcher" from="@/lib/utils" />
        <import name="ArtifactKind, UIArtifact" from="./artifact" />
        <import name="CodeEditor" from="./code-editor" />
        <import name="DocumentToolCall, DocumentToolResult" from="./document" />
        <import name="InlineDocumentSkeleton" from="./document-skeleton" />
        <import name="FileIcon, FullscreenIcon, ImageIcon, LoaderIcon" from="./icons" />
        <import name="ImageEditor" from="./image-editor" />
        <import name="SpreadsheetEditor" from="./sheet-editor" />
        <import name="Editor" from="./text-editor" />
      </imports>
      <usesHooks>
        <hook name="useArtifact" />
        <hook name="useSWR" />
        <hook name="useMemo" />
        <hook name="useRef" />
      </usesHooks>
    </component>
    <component id="cmp_LoadingSkeleton" name="LoadingSkeleton" path="f:/Study/Code/git/nextjs-ai-chatbot/components/document-preview.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="equal" from="fast-deep-equal" />
        <import name="MouseEvent, memo, useCallback, useEffect, useMemo, useRef" from="react" />
        <import name="useSWR" from="swr" />
        <import name="useArtifact" from="@/hooks/use-artifact" />
        <import name="Document" from="@/lib/db/schema" />
        <import name="cn, fetcher" from="@/lib/utils" />
        <import name="ArtifactKind, UIArtifact" from="./artifact" />
        <import name="CodeEditor" from="./code-editor" />
        <import name="DocumentToolCall, DocumentToolResult" from="./document" />
        <import name="InlineDocumentSkeleton" from="./document-skeleton" />
        <import name="FileIcon, FullscreenIcon, ImageIcon, LoaderIcon" from="./icons" />
        <import name="ImageEditor" from="./image-editor" />
        <import name="SpreadsheetEditor" from="./sheet-editor" />
        <import name="Editor" from="./text-editor" />
      </imports>
    </component>
    <component id="cmp_PureHitboxLayer" name="PureHitboxLayer" path="f:/Study/Code/git/nextjs-ai-chatbot/components/document-preview.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Uses: useCallback</description>
      <imports>
        <import name="equal" from="fast-deep-equal" />
        <import name="MouseEvent, memo, useCallback, useEffect, useMemo, useRef" from="react" />
        <import name="useSWR" from="swr" />
        <import name="useArtifact" from="@/hooks/use-artifact" />
        <import name="Document" from="@/lib/db/schema" />
        <import name="cn, fetcher" from="@/lib/utils" />
        <import name="ArtifactKind, UIArtifact" from="./artifact" />
        <import name="CodeEditor" from="./code-editor" />
        <import name="DocumentToolCall, DocumentToolResult" from="./document" />
        <import name="InlineDocumentSkeleton" from="./document-skeleton" />
        <import name="FileIcon, FullscreenIcon, ImageIcon, LoaderIcon" from="./icons" />
        <import name="ImageEditor" from="./image-editor" />
        <import name="SpreadsheetEditor" from="./sheet-editor" />
        <import name="Editor" from="./text-editor" />
      </imports>
      <usesHooks>
        <hook name="useCallback" />
      </usesHooks>
    </component>
    <component id="cmp_PureDocumentHeader" name="PureDocumentHeader" path="f:/Study/Code/git/nextjs-ai-chatbot/components/document-preview.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="equal" from="fast-deep-equal" />
        <import name="MouseEvent, memo, useCallback, useEffect, useMemo, useRef" from="react" />
        <import name="useSWR" from="swr" />
        <import name="useArtifact" from="@/hooks/use-artifact" />
        <import name="Document" from="@/lib/db/schema" />
        <import name="cn, fetcher" from="@/lib/utils" />
        <import name="ArtifactKind, UIArtifact" from="./artifact" />
        <import name="CodeEditor" from="./code-editor" />
        <import name="DocumentToolCall, DocumentToolResult" from="./document" />
        <import name="InlineDocumentSkeleton" from="./document-skeleton" />
        <import name="FileIcon, FullscreenIcon, ImageIcon, LoaderIcon" from="./icons" />
        <import name="ImageEditor" from="./image-editor" />
        <import name="SpreadsheetEditor" from="./sheet-editor" />
        <import name="Editor" from="./text-editor" />
      </imports>
    </component>
    <component id="cmp_DocumentContent" name="DocumentContent" path="f:/Study/Code/git/nextjs-ai-chatbot/components/document-preview.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Uses: useArtifact</description>
      <imports>
        <import name="equal" from="fast-deep-equal" />
        <import name="MouseEvent, memo, useCallback, useEffect, useMemo, useRef" from="react" />
        <import name="useSWR" from="swr" />
        <import name="useArtifact" from="@/hooks/use-artifact" />
        <import name="Document" from="@/lib/db/schema" />
        <import name="cn, fetcher" from="@/lib/utils" />
        <import name="ArtifactKind, UIArtifact" from="./artifact" />
        <import name="CodeEditor" from="./code-editor" />
        <import name="DocumentToolCall, DocumentToolResult" from="./document" />
        <import name="InlineDocumentSkeleton" from="./document-skeleton" />
        <import name="FileIcon, FullscreenIcon, ImageIcon, LoaderIcon" from="./icons" />
        <import name="ImageEditor" from="./image-editor" />
        <import name="SpreadsheetEditor" from="./sheet-editor" />
        <import name="Editor" from="./text-editor" />
      </imports>
      <usesHooks>
        <hook name="useArtifact" />
      </usesHooks>
    </component>
    <component id="cmp_DocumentSkeleton" name="DocumentSkeleton" path="f:/Study/Code/git/nextjs-ai-chatbot/components/document-skeleton.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="ArtifactKind" from="./artifact" />
      </imports>
    </component>
    <component id="cmp_InlineDocumentSkeleton" name="InlineDocumentSkeleton" path="f:/Study/Code/git/nextjs-ai-chatbot/components/document-skeleton.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="ArtifactKind" from="./artifact" />
      </imports>
    </component>
    <component id="cmp_PureDocumentToolResult" name="PureDocumentToolResult" path="f:/Study/Code/git/nextjs-ai-chatbot/components/document.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Uses: useArtifact</description>
      <props>
        <prop name="type" type="any" required="true" />
        <prop name="result" type="any" required="true" />
        <prop name="isReadonly" type="any" required="true" />
      </props>
      <imports>
        <import name="memo" from="react" />
        <import name="toast" from="sonner" />
        <import name="useArtifact" from="@/hooks/use-artifact" />
        <import name="ArtifactKind" from="./artifact" />
        <import name="FileIcon, LoaderIcon, MessageIcon, PencilEditIcon" from="./icons" />
      </imports>
      <usesHooks>
        <hook name="useArtifact" />
      </usesHooks>
    </component>
    <component id="cmp_PureDocumentToolCall" name="PureDocumentToolCall" path="f:/Study/Code/git/nextjs-ai-chatbot/components/document.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Uses: useArtifact</description>
      <props>
        <prop name="type" type="any" required="true" />
        <prop name="args" type="any" required="true" />
        <prop name="isReadonly" type="any" required="true" />
      </props>
      <imports>
        <import name="memo" from="react" />
        <import name="toast" from="sonner" />
        <import name="useArtifact" from="@/hooks/use-artifact" />
        <import name="ArtifactKind" from="./artifact" />
        <import name="FileIcon, LoaderIcon, MessageIcon, PencilEditIcon" from="./icons" />
      </imports>
      <usesHooks>
        <hook name="useArtifact" />
      </usesHooks>
    </component>
    <component id="cmp_Greeting" name="Greeting" path="f:/Study/Code/git/nextjs-ai-chatbot/components/greeting.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="motion" from="framer-motion" />
        <import name="ModelMetadata" from="@/lib/ai/model-catalog-types" />
      </imports>
    </component>
    <component id="cmp_BotIcon" name="BotIcon" path="f:/Study/Code/git/nextjs-ai-chatbot/components/icons.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
    </component>
    <component id="cmp_UserIcon" name="UserIcon" path="f:/Study/Code/git/nextjs-ai-chatbot/components/icons.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
    </component>
    <component id="cmp_AttachmentIcon" name="AttachmentIcon" path="f:/Study/Code/git/nextjs-ai-chatbot/components/icons.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
    </component>
    <component id="cmp_VercelIcon" name="VercelIcon" path="f:/Study/Code/git/nextjs-ai-chatbot/components/icons.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
    </component>
    <component id="cmp_GitIcon" name="GitIcon" path="f:/Study/Code/git/nextjs-ai-chatbot/components/icons.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
    </component>
    <component id="cmp_BoxIcon" name="BoxIcon" path="f:/Study/Code/git/nextjs-ai-chatbot/components/icons.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
    </component>
    <component id="cmp_HomeIcon" name="HomeIcon" path="f:/Study/Code/git/nextjs-ai-chatbot/components/icons.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
    </component>
    <component id="cmp_GPSIcon" name="GPSIcon" path="f:/Study/Code/git/nextjs-ai-chatbot/components/icons.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
    </component>
    <component id="cmp_InvoiceIcon" name="InvoiceIcon" path="f:/Study/Code/git/nextjs-ai-chatbot/components/icons.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
    </component>
    <component id="cmp_LogoOpenAI" name="LogoOpenAI" path="f:/Study/Code/git/nextjs-ai-chatbot/components/icons.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
    </component>
    <component id="cmp_LogoGoogle" name="LogoGoogle" path="f:/Study/Code/git/nextjs-ai-chatbot/components/icons.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
    </component>
    <component id="cmp_LogoAnthropic" name="LogoAnthropic" path="f:/Study/Code/git/nextjs-ai-chatbot/components/icons.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
    </component>
    <component id="cmp_RouteIcon" name="RouteIcon" path="f:/Study/Code/git/nextjs-ai-chatbot/components/icons.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
    </component>
    <component id="cmp_FileIcon" name="FileIcon" path="f:/Study/Code/git/nextjs-ai-chatbot/components/icons.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
    </component>
    <component id="cmp_LoaderIcon" name="LoaderIcon" path="f:/Study/Code/git/nextjs-ai-chatbot/components/icons.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
    </component>
    <component id="cmp_UploadIcon" name="UploadIcon" path="f:/Study/Code/git/nextjs-ai-chatbot/components/icons.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
    </component>
    <component id="cmp_MenuIcon" name="MenuIcon" path="f:/Study/Code/git/nextjs-ai-chatbot/components/icons.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
    </component>
    <component id="cmp_PencilEditIcon" name="PencilEditIcon" path="f:/Study/Code/git/nextjs-ai-chatbot/components/icons.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
    </component>
    <component id="cmp_CheckedSquare" name="CheckedSquare" path="f:/Study/Code/git/nextjs-ai-chatbot/components/icons.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
    </component>
    <component id="cmp_UncheckedSquare" name="UncheckedSquare" path="f:/Study/Code/git/nextjs-ai-chatbot/components/icons.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
    </component>
    <component id="cmp_MoreIcon" name="MoreIcon" path="f:/Study/Code/git/nextjs-ai-chatbot/components/icons.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
    </component>
    <component id="cmp_TrashIcon" name="TrashIcon" path="f:/Study/Code/git/nextjs-ai-chatbot/components/icons.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
    </component>
    <component id="cmp_InfoIcon" name="InfoIcon" path="f:/Study/Code/git/nextjs-ai-chatbot/components/icons.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
    </component>
    <component id="cmp_ArrowUpIcon" name="ArrowUpIcon" path="f:/Study/Code/git/nextjs-ai-chatbot/components/icons.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
    </component>
    <component id="cmp_StopIcon" name="StopIcon" path="f:/Study/Code/git/nextjs-ai-chatbot/components/icons.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
    </component>
    <component id="cmp_PaperclipIcon" name="PaperclipIcon" path="f:/Study/Code/git/nextjs-ai-chatbot/components/icons.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
    </component>
    <component id="cmp_MoreHorizontalIcon" name="MoreHorizontalIcon" path="f:/Study/Code/git/nextjs-ai-chatbot/components/icons.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
    </component>
    <component id="cmp_MessageIcon" name="MessageIcon" path="f:/Study/Code/git/nextjs-ai-chatbot/components/icons.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
    </component>
    <component id="cmp_CrossIcon" name="CrossIcon" path="f:/Study/Code/git/nextjs-ai-chatbot/components/icons.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
    </component>
    <component id="cmp_CrossSmallIcon" name="CrossSmallIcon" path="f:/Study/Code/git/nextjs-ai-chatbot/components/icons.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
    </component>
    <component id="cmp_UndoIcon" name="UndoIcon" path="f:/Study/Code/git/nextjs-ai-chatbot/components/icons.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
    </component>
    <component id="cmp_RedoIcon" name="RedoIcon" path="f:/Study/Code/git/nextjs-ai-chatbot/components/icons.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
    </component>
    <component id="cmp_DeltaIcon" name="DeltaIcon" path="f:/Study/Code/git/nextjs-ai-chatbot/components/icons.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
    </component>
    <component id="cmp_CpuIcon" name="CpuIcon" path="f:/Study/Code/git/nextjs-ai-chatbot/components/icons.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
    </component>
    <component id="cmp_PenIcon" name="PenIcon" path="f:/Study/Code/git/nextjs-ai-chatbot/components/icons.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
    </component>
    <component id="cmp_SummarizeIcon" name="SummarizeIcon" path="f:/Study/Code/git/nextjs-ai-chatbot/components/icons.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
    </component>
    <component id="cmp_SidebarLeftIcon" name="SidebarLeftIcon" path="f:/Study/Code/git/nextjs-ai-chatbot/components/icons.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
    </component>
    <component id="cmp_PlusIcon" name="PlusIcon" path="f:/Study/Code/git/nextjs-ai-chatbot/components/icons.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
    </component>
    <component id="cmp_CopyIcon" name="CopyIcon" path="f:/Study/Code/git/nextjs-ai-chatbot/components/icons.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
    </component>
    <component id="cmp_ThumbUpIcon" name="ThumbUpIcon" path="f:/Study/Code/git/nextjs-ai-chatbot/components/icons.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
    </component>
    <component id="cmp_ThumbDownIcon" name="ThumbDownIcon" path="f:/Study/Code/git/nextjs-ai-chatbot/components/icons.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
    </component>
    <component id="cmp_ChevronDownIcon" name="ChevronDownIcon" path="f:/Study/Code/git/nextjs-ai-chatbot/components/icons.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
    </component>
    <component id="cmp_SparklesIcon" name="SparklesIcon" path="f:/Study/Code/git/nextjs-ai-chatbot/components/icons.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
    </component>
    <component id="cmp_CheckCircleFillIcon" name="CheckCircleFillIcon" path="f:/Study/Code/git/nextjs-ai-chatbot/components/icons.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
    </component>
    <component id="cmp_GlobeIcon" name="GlobeIcon" path="f:/Study/Code/git/nextjs-ai-chatbot/components/icons.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
    </component>
    <component id="cmp_LockIcon" name="LockIcon" path="f:/Study/Code/git/nextjs-ai-chatbot/components/icons.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
    </component>
    <component id="cmp_EyeIcon" name="EyeIcon" path="f:/Study/Code/git/nextjs-ai-chatbot/components/icons.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
    </component>
    <component id="cmp_ShareIcon" name="ShareIcon" path="f:/Study/Code/git/nextjs-ai-chatbot/components/icons.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
    </component>
    <component id="cmp_CodeIcon" name="CodeIcon" path="f:/Study/Code/git/nextjs-ai-chatbot/components/icons.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
    </component>
    <component id="cmp_PlayIcon" name="PlayIcon" path="f:/Study/Code/git/nextjs-ai-chatbot/components/icons.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
    </component>
    <component id="cmp_PythonIcon" name="PythonIcon" path="f:/Study/Code/git/nextjs-ai-chatbot/components/icons.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
    </component>
    <component id="cmp_TerminalWindowIcon" name="TerminalWindowIcon" path="f:/Study/Code/git/nextjs-ai-chatbot/components/icons.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
    </component>
    <component id="cmp_TerminalIcon" name="TerminalIcon" path="f:/Study/Code/git/nextjs-ai-chatbot/components/icons.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
    </component>
    <component id="cmp_ClockRewind" name="ClockRewind" path="f:/Study/Code/git/nextjs-ai-chatbot/components/icons.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
    </component>
    <component id="cmp_LogsIcon" name="LogsIcon" path="f:/Study/Code/git/nextjs-ai-chatbot/components/icons.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
    </component>
    <component id="cmp_ImageIcon" name="ImageIcon" path="f:/Study/Code/git/nextjs-ai-chatbot/components/icons.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
    </component>
    <component id="cmp_FullscreenIcon" name="FullscreenIcon" path="f:/Study/Code/git/nextjs-ai-chatbot/components/icons.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
    </component>
    <component id="cmp_DownloadIcon" name="DownloadIcon" path="f:/Study/Code/git/nextjs-ai-chatbot/components/icons.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
    </component>
    <component id="cmp_LineChartIcon" name="LineChartIcon" path="f:/Study/Code/git/nextjs-ai-chatbot/components/icons.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
    </component>
    <component id="cmp_WarningIcon" name="WarningIcon" path="f:/Study/Code/git/nextjs-ai-chatbot/components/icons.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
    </component>
    <component id="cmp_ImageEditor" name="ImageEditor" path="f:/Study/Code/git/nextjs-ai-chatbot/components/image-editor.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
      <props>
        <prop name="title" type="any" required="true" />
        <prop name="content" type="any" required="true" />
        <prop name="status" type="any" required="true" />
        <prop name="isInline" type="any" required="true" />
      </props>
      <imports>
        <import name="cn" from="classnames" />
        <import name="LoaderIcon" from="./icons" />
      </imports>
    </component>
    <component id="cmp_PureMessageActions" name="PureMessageActions" path="f:/Study/Code/git/nextjs-ai-chatbot/components/message-actions.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Uses: useSWRConfig, useCopyToClipboard, useMemo</description>
      <props>
        <prop name="chatId" type="any" required="true" />
        <prop name="message" type="any" required="true" />
        <prop name="vote" type="any" required="true" />
        <prop name="isLoading" type="any" required="true" />
        <prop name="setMode" type="any" required="true" />
      </props>
      <imports>
        <import name="equal" from="fast-deep-equal" />
        <import name="memo, useMemo" from="react" />
        <import name="toast" from="sonner" />
        <import name="useSWRConfig" from="swr" />
        <import name="useCopyToClipboard" from="usehooks-ts" />
        <import name="ChatMessage, UserVote" from="@/lib/types" />
        <import name="Action, Actions" from="./elements/actions" />
        <import name="CopyIcon, PencilEditIcon, ThumbDownIcon, ThumbUpIcon" from="./icons" />
      </imports>
      <usesHooks>
        <hook name="useSWRConfig" />
        <hook name="useCopyToClipboard" />
        <hook name="useMemo" />
      </usesHooks>
    </component>
    <component id="cmp_MessageEditor" name="MessageEditor" path="f:/Study/Code/git/nextjs-ai-chatbot/components/message-editor.tsx" kind="ui" isClient="true">
      <description>[Skeleton] State: { isSubmitting, draftContent } | Effects: 1 detected | Uses: useRef, useCallback</description>
      <props>
        <prop name="chatId" type="any" required="true" />
        <prop name="message" type="any" required="true" />
        <prop name="setMode" type="any" required="true" />
        <prop name="setMessages" type="any" required="true" />
        <prop name="regenerate" type="any" required="true" />
      </props>
      <imports>
        <import name="UseChatHelpers" from="@ai-sdk/react" />
        <import name="Dispatch, SetStateAction, useCallback, useEffect, useRef, useState" from="react" />
        <import name="deleteTrailingMessages" from="@/app/(chat)/actions" />
        <import name="ChatMessage" from="@/lib/types" />
        <import name="getTextFromMessage" from="@/lib/utils" />
        <import name="Button" from="./ui/button" />
        <import name="Textarea" from="./ui/textarea" />
      </imports>
      <usesHooks>
        <hook name="useRef" />
        <hook name="useCallback" />
      </usesHooks>
    </component>
    <component id="cmp_MessageReasoning" name="MessageReasoning" path="f:/Study/Code/git/nextjs-ai-chatbot/components/message-reasoning.tsx" kind="ui" isClient="true">
      <description>[Skeleton] State: { hasBeenStreaming, isReasoningStreaming } | Effects: 2 detected | Uses: useRef</description>
      <props>
        <prop name="isLoading" type="any" required="true" />
        <prop name="reasoning" type="any" required="true" />
      </props>
      <imports>
        <import name="useEffect, useRef, useState" from="react" />
        <import name="Reasoning, ReasoningContent, ReasoningTrigger" from="./elements/reasoning" />
      </imports>
      <usesHooks>
        <hook name="useRef" />
      </usesHooks>
    </component>
    <component id="cmp_PurePreviewMessage" name="PurePreviewMessage" path="f:/Study/Code/git/nextjs-ai-chatbot/components/message.tsx" kind="ui" isClient="true">
      <description>[Skeleton] State: { mode }</description>
      <imports>
        <import name="UseChatHelpers" from="@ai-sdk/react" />
        <import name="equal" from="fast-deep-equal" />
        <import name="motion" from="framer-motion" />
        <import name="memo, useState" from="react" />
        <import name="ChatMessage, UserVote" from="@/lib/types" />
        <import name="cn, sanitizeText" from="@/lib/utils" />
        <import name="DocumentToolResult" from="./document" />
        <import name="DocumentPreview" from="./document-preview" />
        <import name="MessageContent" from="./elements/message" />
        <import name="Response" from="./elements/response" />
        <import name="Tool, ToolContent, ToolHeader, ToolInput, ToolOutput" from="./elements/tool" />
        <import name="SparklesIcon" from="./icons" />
        <import name="MessageActions" from="./message-actions" />
        <import name="MessageEditor" from="./message-editor" />
        <import name="MessageReasoning" from="./message-reasoning" />
        <import name="PreviewAttachment" from="./preview-attachment" />
        <import name="Weather" from="./weather" />
      </imports>
    </component>
    <component id="cmp_ThinkingMessage" name="ThinkingMessage" path="f:/Study/Code/git/nextjs-ai-chatbot/components/message.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="UseChatHelpers" from="@ai-sdk/react" />
        <import name="equal" from="fast-deep-equal" />
        <import name="motion" from="framer-motion" />
        <import name="memo, useState" from="react" />
        <import name="ChatMessage, UserVote" from="@/lib/types" />
        <import name="cn, sanitizeText" from="@/lib/utils" />
        <import name="DocumentToolResult" from="./document" />
        <import name="DocumentPreview" from="./document-preview" />
        <import name="MessageContent" from="./elements/message" />
        <import name="Response" from="./elements/response" />
        <import name="Tool, ToolContent, ToolHeader, ToolInput, ToolOutput" from="./elements/tool" />
        <import name="SparklesIcon" from="./icons" />
        <import name="MessageActions" from="./message-actions" />
        <import name="MessageEditor" from="./message-editor" />
        <import name="MessageReasoning" from="./message-reasoning" />
        <import name="PreviewAttachment" from="./preview-attachment" />
        <import name="Weather" from="./weather" />
      </imports>
    </component>
    <component id="cmp_PureMessages" name="PureMessages" path="f:/Study/Code/git/nextjs-ai-chatbot/components/messages.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Effects: 1 detected | Uses: useMessages, useDataStream, useSettingsSnapshot</description>
      <props>
        <prop name="chatId" type="any" required="true" />
        <prop name="status" type="any" required="true" />
        <prop name="votes" type="any" required="true" />
        <prop name="messages" type="any" required="true" />
        <prop name="setMessages" type="any" required="true" />
        <prop name="regenerate" type="any" required="true" />
        <prop name="isReadonly" type="any" required="true" />
        <prop name="isGuest" type="any" required="true" />
      </props>
      <imports>
        <import name="UseChatHelpers" from="@ai-sdk/react" />
        <import name="equal" from="fast-deep-equal" />
        <import name="AnimatePresence" from="framer-motion" />
        <import name="ArrowDownIcon" from="lucide-react" />
        <import name="memo, useEffect" from="react" />
        <import name="useMessages" from="@/hooks/use-messages" />
        <import name="ChatMessage, UserVote" from="@/lib/types" />
        <import name="useSettingsSnapshot" from="@/lib/ui/settings-store" />
        <import name="useDataStream" from="./data-stream-provider" />
        <import name="Conversation, ConversationContent" from="./elements/conversation" />
        <import name="Greeting" from="./greeting" />
        <import name="PreviewMessage, ThinkingMessage" from="./message" />
      </imports>
      <usesHooks>
        <hook name="useMessages" />
        <hook name="useDataStream" />
        <hook name="useSettingsSnapshot" />
      </usesHooks>
    </component>
    <component id="cmp_ModelSelector" name="ModelSelector" path="f:/Study/Code/git/nextjs-ai-chatbot/components/model-selector.tsx" kind="ui" isClient="true">
      <description>[Skeleton] State: { open, isRefreshing } | Uses: useOptimistic, useMemo</description>
      <props>
        <prop name="selectedModelId" type="any" required="true" />
        <prop name="className" type="any" required="true" />
        <prop name="availableModels" type="any" required="true" />
      </props>
      <imports>
        <import name="useMemo, useOptimistic, useState" from="react" />
        <import name="Button" from="@/components/ui/button" />
        <import name="DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger" from="@/components/ui/dropdown-menu" />
        <import name="ModelMetadata, ProviderCatalog" from="@/lib/ai/model-catalog-types" />
        <import name="forceRefreshModelCatalog" from="@/lib/ai/model-registry" />
        <import name="logError" from="@/lib/log" />
        <import name="cn" from="@/lib/utils" />
        <import name="CheckCircleFillIcon, ChevronDownIcon" from="./icons" />
      </imports>
      <usesHooks>
        <hook name="useOptimistic" />
        <hook name="useMemo" />
      </usesHooks>
    </component>
    <component id="cmp_PureMultimodalInput" name="PureMultimodalInput" path="f:/Study/Code/git/nextjs-ai-chatbot/components/multimodal-input.tsx" kind="ui" isClient="true">
      <description>[Skeleton] State: { uploadQueue } | Effects: 3 detected | Uses: useRef, useWindowSize, useCallback, useLocalStorage, useDebounceCallback, useSettingsSnapshot, useMemo</description>
      <props>
        <prop name="chatId" type="any" required="true" />
        <prop name="input" type="any" required="true" />
        <prop name="setInput" type="any" required="true" />
        <prop name="status" type="any" required="true" />
        <prop name="stop" type="any" required="true" />
        <prop name="attachments" type="any" required="true" />
        <prop name="setAttachments" type="any" required="true" />
        <prop name="messages" type="any" required="true" />
        <prop name="setMessages" type="any" required="true" />
        <prop name="sendMessage" type="any" required="true" />
        <prop name="className" type="any" required="true" />
        <prop name="selectedVisibilityType" type="any" required="true" />
        <prop name="selectedModelId" type="any" required="true" />
        <prop name="onModelChange" type="any" required="true" />
        <prop name="usage" type="any" required="true" />
      </props>
      <imports>
        <import name="UseChatHelpers" from="@ai-sdk/react" />
        <import name="Trigger" from="@radix-ui/react-select" />
        <import name="UIMessage" from="ai" />
        <import name="equal" from="fast-deep-equal" />
        <import name="ChangeEvent, Dispatch, memo, SetStateAction, useCallback, useEffect, useMemo, useRef, useState" from="react" />
        <import name="toast" from="sonner" />
        <import name="useDebounceCallback, useLocalStorage, useWindowSize" from="usehooks-ts" />
        <import name="SelectItem" from="@/components/ui/select" />
        <import name="ModelMetadata" from="@/lib/ai/model-catalog-types" />
        <import name="logError" from="@/lib/log" />
        <import name="Attachment, ChatMessage" from="@/lib/types" />
        <import name="useSettingsSnapshot" from="@/lib/ui/settings-store" />
        <import name="AppUsage" from="@/lib/usage" />
        <import name="cn" from="@/lib/utils" />
        <import name="Context" from="./elements/context" />
        <import name="PromptInput, PromptInputModelSelect, PromptInputModelSelectContent, PromptInputSubmit, PromptInputTextarea, PromptInputToolbar, PromptInputTools" from="./elements/prompt-input" />
        <import name="ArrowUpIcon, ChevronDownIcon, CpuIcon, PaperclipIcon, StopIcon" from="./icons" />
        <import name="PreviewAttachment" from="./preview-attachment" />
        <import name="SuggestedActions" from="./suggested-actions" />
        <import name="Button" from="./ui/button" />
        <import name="VisibilityType" from="./visibility-selector" />
      </imports>
      <usesHooks>
        <hook name="useRef" />
        <hook name="useWindowSize" />
        <hook name="useCallback" />
        <hook name="useLocalStorage" />
        <hook name="useDebounceCallback" />
        <hook name="useSettingsSnapshot" />
        <hook name="useMemo" />
      </usesHooks>
    </component>
    <component id="cmp_PureAttachmentsButton" name="PureAttachmentsButton" path="f:/Study/Code/git/nextjs-ai-chatbot/components/multimodal-input.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Stateless UI</description>
      <props>
        <prop name="fileInputRef" type="any" required="true" />
        <prop name="status" type="any" required="true" />
        <prop name="selectedModelId" type="any" required="true" />
      </props>
      <imports>
        <import name="UseChatHelpers" from="@ai-sdk/react" />
        <import name="Trigger" from="@radix-ui/react-select" />
        <import name="UIMessage" from="ai" />
        <import name="equal" from="fast-deep-equal" />
        <import name="ChangeEvent, Dispatch, memo, SetStateAction, useCallback, useEffect, useMemo, useRef, useState" from="react" />
        <import name="toast" from="sonner" />
        <import name="useDebounceCallback, useLocalStorage, useWindowSize" from="usehooks-ts" />
        <import name="SelectItem" from="@/components/ui/select" />
        <import name="ModelMetadata" from="@/lib/ai/model-catalog-types" />
        <import name="logError" from="@/lib/log" />
        <import name="Attachment, ChatMessage" from="@/lib/types" />
        <import name="useSettingsSnapshot" from="@/lib/ui/settings-store" />
        <import name="AppUsage" from="@/lib/usage" />
        <import name="cn" from="@/lib/utils" />
        <import name="Context" from="./elements/context" />
        <import name="PromptInput, PromptInputModelSelect, PromptInputModelSelectContent, PromptInputSubmit, PromptInputTextarea, PromptInputToolbar, PromptInputTools" from="./elements/prompt-input" />
        <import name="ArrowUpIcon, ChevronDownIcon, CpuIcon, PaperclipIcon, StopIcon" from="./icons" />
        <import name="PreviewAttachment" from="./preview-attachment" />
        <import name="SuggestedActions" from="./suggested-actions" />
        <import name="Button" from="./ui/button" />
        <import name="VisibilityType" from="./visibility-selector" />
      </imports>
    </component>
    <component id="cmp_PureModelSelectorCompact" name="PureModelSelectorCompact" path="f:/Study/Code/git/nextjs-ai-chatbot/components/multimodal-input.tsx" kind="ui" isClient="true">
      <description>[Skeleton] State: { optimisticModelId } | Effects: 1 detected</description>
      <props>
        <prop name="selectedModelId" type="any" required="true" />
        <prop name="onModelChange" type="any" required="true" />
        <prop name="availableModels" type="any" required="true" />
      </props>
      <imports>
        <import name="UseChatHelpers" from="@ai-sdk/react" />
        <import name="Trigger" from="@radix-ui/react-select" />
        <import name="UIMessage" from="ai" />
        <import name="equal" from="fast-deep-equal" />
        <import name="ChangeEvent, Dispatch, memo, SetStateAction, useCallback, useEffect, useMemo, useRef, useState" from="react" />
        <import name="toast" from="sonner" />
        <import name="useDebounceCallback, useLocalStorage, useWindowSize" from="usehooks-ts" />
        <import name="SelectItem" from="@/components/ui/select" />
        <import name="ModelMetadata" from="@/lib/ai/model-catalog-types" />
        <import name="logError" from="@/lib/log" />
        <import name="Attachment, ChatMessage" from="@/lib/types" />
        <import name="useSettingsSnapshot" from="@/lib/ui/settings-store" />
        <import name="AppUsage" from="@/lib/usage" />
        <import name="cn" from="@/lib/utils" />
        <import name="Context" from="./elements/context" />
        <import name="PromptInput, PromptInputModelSelect, PromptInputModelSelectContent, PromptInputSubmit, PromptInputTextarea, PromptInputToolbar, PromptInputTools" from="./elements/prompt-input" />
        <import name="ArrowUpIcon, ChevronDownIcon, CpuIcon, PaperclipIcon, StopIcon" from="./icons" />
        <import name="PreviewAttachment" from="./preview-attachment" />
        <import name="SuggestedActions" from="./suggested-actions" />
        <import name="Button" from="./ui/button" />
        <import name="VisibilityType" from="./visibility-selector" />
      </imports>
    </component>
    <component id="cmp_PureStopButton" name="PureStopButton" path="f:/Study/Code/git/nextjs-ai-chatbot/components/multimodal-input.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Stateless UI</description>
      <props>
        <prop name="stop" type="any" required="true" />
        <prop name="setMessages" type="any" required="true" />
      </props>
      <imports>
        <import name="UseChatHelpers" from="@ai-sdk/react" />
        <import name="Trigger" from="@radix-ui/react-select" />
        <import name="UIMessage" from="ai" />
        <import name="equal" from="fast-deep-equal" />
        <import name="ChangeEvent, Dispatch, memo, SetStateAction, useCallback, useEffect, useMemo, useRef, useState" from="react" />
        <import name="toast" from="sonner" />
        <import name="useDebounceCallback, useLocalStorage, useWindowSize" from="usehooks-ts" />
        <import name="SelectItem" from="@/components/ui/select" />
        <import name="ModelMetadata" from="@/lib/ai/model-catalog-types" />
        <import name="logError" from="@/lib/log" />
        <import name="Attachment, ChatMessage" from="@/lib/types" />
        <import name="useSettingsSnapshot" from="@/lib/ui/settings-store" />
        <import name="AppUsage" from="@/lib/usage" />
        <import name="cn" from="@/lib/utils" />
        <import name="Context" from="./elements/context" />
        <import name="PromptInput, PromptInputModelSelect, PromptInputModelSelectContent, PromptInputSubmit, PromptInputTextarea, PromptInputToolbar, PromptInputTools" from="./elements/prompt-input" />
        <import name="ArrowUpIcon, ChevronDownIcon, CpuIcon, PaperclipIcon, StopIcon" from="./icons" />
        <import name="PreviewAttachment" from="./preview-attachment" />
        <import name="SuggestedActions" from="./suggested-actions" />
        <import name="Button" from="./ui/button" />
        <import name="VisibilityType" from="./visibility-selector" />
      </imports>
    </component>
    <component id="cmp_PreviewAttachment" name="PreviewAttachment" path="f:/Study/Code/git/nextjs-ai-chatbot/components/preview-attachment.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="Image" from="next/image" />
        <import name="Attachment" from="@/lib/types" />
        <import name="Loader" from="./elements/loader" />
        <import name="CrossSmallIcon" from="./icons" />
        <import name="Button" from="./ui/button" />
      </imports>
    </component>
    <component id="cmp_PureSpreadsheetEditor" name="PureSpreadsheetEditor" path="f:/Study/Code/git/nextjs-ai-chatbot/components/sheet-editor.tsx" kind="ui" isClient="true">
      <description>[Skeleton] State: { localRows } | Effects: 1 detected | Uses: useTheme, useMemo</description>
      <imports>
        <import name="useTheme" from="next-themes" />
        <import name="parse, unparse" from="papaparse" />
        <import name="memo, useEffect, useMemo, useState" from="react" />
        <import name="DataGrid" from="react-data-grid" />
        <import name="cn" from="@/lib/utils" />
        <import name="" from="react-data-grid/lib/styles.css" />
      </imports>
      <usesHooks>
        <hook name="useTheme" />
        <hook name="useMemo" />
      </usesHooks>
    </component>
    <component id="cmp_PureChatItem" name="PureChatItem" path="f:/Study/Code/git/nextjs-ai-chatbot/components/sidebar-history-item.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Uses: useChatVisibility</description>
      <imports>
        <import name="Link" from="next/link" />
        <import name="memo" from="react" />
        <import name="useChatVisibility" from="@/hooks/use-chat-visibility" />
        <import name="Chat" from="@/lib/db/schema" />
        <import name="CheckCircleFillIcon, GlobeIcon, LoaderIcon, LockIcon, MoreHorizontalIcon, ShareIcon, TrashIcon" from="./icons" />
        <import name="DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuPortal, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger" from="./ui/dropdown-menu" />
        <import name="SidebarMenuAction, SidebarMenuButton, SidebarMenuItem" from="./ui/sidebar" />
      </imports>
      <usesHooks>
        <hook name="useChatVisibility" />
      </usesHooks>
    </component>
    <component id="cmp_SidebarHistory" name="SidebarHistory" path="f:/Study/Code/git/nextjs-ai-chatbot/components/sidebar-history.tsx" kind="ui" isClient="true">
      <description>[Skeleton] State: { deleteId, showDeleteDialog } | Effects: 2 detected | Uses: useSidebar, useParams, useOptimisticChats, useSWRInfinite, useRouter, useRef, useMemo</description>
      <props>
        <prop name="user" type="any" required="true" />
      </props>
      <imports>
        <import name="isToday, isYesterday, subMonths, subWeeks" from="date-fns" />
        <import name="motion" from="framer-motion" />
        <import name="useParams, useRouter" from="next/navigation" />
        <import name="useEffect, useMemo, useRef, useState" from="react" />
        <import name="toast" from="sonner" />
        <import name="useSWRInfinite" from="swr/infinite" />
        <import name="AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle" from="@/components/ui/alert-dialog" />
        <import name="SidebarGroup, SidebarGroupContent, SidebarMenu, useSidebar" from="@/components/ui/sidebar" />
        <import name="useOptimisticChats" from="@/hooks/use-optimistic-chats" />
        <import name="Chat" from="@/lib/db/schema" />
        <import name="fetcher" from="@/lib/utils" />
        <import name="LoaderIcon" from="./icons" />
        <import name="ChatItem" from="./sidebar-history-item" />
      </imports>
      <usesHooks>
        <hook name="useSidebar" />
        <hook name="useParams" />
        <hook name="useOptimisticChats" />
        <hook name="useSWRInfinite" />
        <hook name="useRouter" />
        <hook name="useRef" />
        <hook name="useMemo" />
      </usesHooks>
    </component>
    <component id="cmp_SidebarSkeleton" name="SidebarSkeleton" path="f:/Study/Code/git/nextjs-ai-chatbot/components/sidebar-skeleton.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
    </component>
    <component id="cmp_SidebarToggle" name="SidebarToggle" path="f:/Study/Code/git/nextjs-ai-chatbot/components/sidebar-toggle.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Uses: useSidebar</description>
      <props>
        <prop name="className" type="any" required="true" />
      </props>
      <imports>
        <import name="ComponentProps" from="react" />
        <import name="SidebarTrigger, useSidebar" from="@/components/ui/sidebar" />
        <import name="Tooltip, TooltipContent, TooltipTrigger" from="@/components/ui/tooltip" />
        <import name="cn" from="@/lib/utils" />
        <import name="SidebarLeftIcon" from="./icons" />
        <import name="Button" from="./ui/button" />
      </imports>
      <usesHooks>
        <hook name="useSidebar" />
      </usesHooks>
    </component>
    <component id="cmp_SidebarUserNav" name="SidebarUserNav" path="f:/Study/Code/git/nextjs-ai-chatbot/components/sidebar-user-nav.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Uses: useRouter, useAuth, useTheme, useSWRConfig</description>
      <props>
        <prop name="user" type="any" required="true" />
      </props>
      <imports>
        <import name="ChevronUp" from="lucide-react" />
        <import name="Image" from="next/image" />
        <import name="useRouter" from="next/navigation" />
        <import name="useTheme" from="next-themes" />
        <import name="useSWRConfig" from="swr" />
        <import name="unstable_serialize" from="swr/infinite" />
        <import name="useAuth" from="@/components/auth-provider" />
        <import name="DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger" from="@/components/ui/dropdown-menu" />
        <import name="SidebarMenu, SidebarMenuButton, SidebarMenuItem" from="@/components/ui/sidebar" />
        <import name="getSupabaseBrowserClient" from="@/lib/auth/client" />
        <import name="LoaderIcon" from="./icons" />
        <import name="getChatHistoryPaginationKey" from="./sidebar-history" />
        <import name="toast" from="./toast" />
      </imports>
      <usesHooks>
        <hook name="useRouter" />
        <hook name="useAuth" />
        <hook name="useTheme" />
        <hook name="useSWRConfig" />
      </usesHooks>
    </component>
    <component id="cmp_SubmitButton" name="SubmitButton" path="f:/Study/Code/git/nextjs-ai-chatbot/components/submit-button.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Uses: useFormStatus</description>
      <props>
        <prop name="children" type="any" required="true" />
        <prop name="isSuccessful" type="any" required="true" />
      </props>
      <imports>
        <import name="useFormStatus" from="react-dom" />
        <import name="LoaderIcon" from="@/components/icons" />
        <import name="Button" from="./ui/button" />
      </imports>
      <usesHooks>
        <hook name="useFormStatus" />
      </usesHooks>
    </component>
    <component id="cmp_PureSuggestedActions" name="PureSuggestedActions" path="f:/Study/Code/git/nextjs-ai-chatbot/components/suggested-actions.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Stateless UI</description>
      <props>
        <prop name="chatId" type="any" required="true" />
        <prop name="sendMessage" type="any" required="true" />
      </props>
      <imports>
        <import name="UseChatHelpers" from="@ai-sdk/react" />
        <import name="motion" from="framer-motion" />
        <import name="memo" from="react" />
        <import name="ChatMessage" from="@/lib/types" />
        <import name="Suggestion" from="./elements/suggestion" />
        <import name="VisibilityType" from="./visibility-selector" />
      </imports>
    </component>
    <component id="cmp_Suggestion" name="Suggestion" path="f:/Study/Code/git/nextjs-ai-chatbot/components/suggestion.tsx" kind="ui" isClient="true">
      <description>[Skeleton] State: { isExpanded } | Uses: useWindowSize</description>
      <imports>
        <import name="AnimatePresence, motion" from="framer-motion" />
        <import name="useState" from="react" />
        <import name="useWindowSize" from="usehooks-ts" />
        <import name="UISuggestion" from="@/lib/editor/suggestions-extension" />
        <import name="cn" from="@/lib/utils" />
        <import name="ArtifactKind" from="./artifact" />
        <import name="CrossIcon, MessageIcon" from="./icons" />
        <import name="Button" from="./ui/button" />
      </imports>
      <usesHooks>
        <hook name="useWindowSize" />
      </usesHooks>
    </component>
    <component id="cmp_PureEditor" name="PureEditor" path="f:/Study/Code/git/nextjs-ai-chatbot/components/text-editor.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Effects: 2 detected | Uses: useRef, useMemo, useEditor</description>
      <props>
        <prop name="content" type="any" required="true" />
        <prop name="onSaveContent" type="any" required="true" />
        <prop name="suggestions" type="any" required="true" />
        <prop name="status" type="any" required="true" />
      </props>
      <imports>
        <import name="Mathematics, migrateMathStrings" from="@tiptap/extension-mathematics" />
        <import name="Table" from="@tiptap/extension-table" />
        <import name="TableCell" from="@tiptap/extension-table-cell" />
        <import name="TableHeader" from="@tiptap/extension-table-header" />
        <import name="TableRow" from="@tiptap/extension-table-row" />
        <import name="Markdown" from="@tiptap/markdown" />
        <import name="EditorContent, useEditor" from="@tiptap/react" />
        <import name="StarterKit" from="@tiptap/starter-kit" />
        <import name="memo, useEffect, useMemo, useRef" from="react" />
        <import name="createDecorations, projectWithPositions, SuggestionLike, SuggestionsExtension, suggestionsPluginKey" from="@/lib/editor/suggestions-extension" />
      </imports>
      <usesHooks>
        <hook name="useRef" />
        <hook name="useMemo" />
        <hook name="useEditor" />
      </usesHooks>
    </component>
    <component id="cmp_ThemeProvider" name="ThemeProvider" path="f:/Study/Code/git/nextjs-ai-chatbot/components/theme-provider.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Stateless UI</description>
      <props>
        <prop name="children" type="any" required="true" />
        <prop name="...props" type="any" required="true" />
      </props>
      <imports>
        <import name="ThemeProvider" from="next-themes" />
        <import name="ThemeProviderProps" from="next-themes/dist/types" />
      </imports>
    </component>
    <component id="cmp_Toast" name="Toast" path="f:/Study/Code/git/nextjs-ai-chatbot/components/toast.tsx" kind="ui" isClient="true">
      <description>[Skeleton] State: { multiLine } | Effects: 1 detected | Uses: useRef</description>
      <imports>
        <import name="ReactNode, useEffect, useRef, useState" from="react" />
        <import name="toast" from="sonner" />
        <import name="cn" from="@/lib/utils" />
        <import name="CheckCircleFillIcon, WarningIcon" from="./icons" />
      </imports>
      <usesHooks>
        <hook name="useRef" />
      </usesHooks>
    </component>
    <component id="cmp_Tool" name="Tool" path="f:/Study/Code/git/nextjs-ai-chatbot/components/toolbar.tsx" kind="ui" isClient="true">
      <description>[Skeleton] State: { isHovered } | Effects: 1 detected</description>
      <imports>
        <import name="UseChatHelpers" from="@ai-sdk/react" />
        <import name="cx" from="classnames" />
        <import name="AnimatePresence, motion, useMotionValue, useTransform" from="framer-motion" />
        <import name="nanoid" from="nanoid" />
        <import name="Dispatch, memo, ReactNode, SetStateAction, useEffect, useRef, useState" from="react" />
        <import name="useOnClickOutside" from="usehooks-ts" />
        <import name="Tooltip, TooltipContent, TooltipProvider, TooltipTrigger" from="@/components/ui/tooltip" />
        <import name="ChatSDKError" from="@/lib/errors" />
        <import name="ChatMessage" from="@/lib/types" />
        <import name="ArtifactKind, artifactDefinitions" from="./artifact" />
        <import name="ArtifactToolbarItem" from="./create-artifact" />
        <import name="ArrowUpIcon, StopIcon, SummarizeIcon" from="./icons" />
      </imports>
    </component>
    <component id="cmp_ReadingLevelSelector" name="ReadingLevelSelector" path="f:/Study/Code/git/nextjs-ai-chatbot/components/toolbar.tsx" kind="ui" isClient="true">
      <description>[Skeleton] State: { currentLevel, hasUserSelectedLevel } | Effects: 1 detected | Uses: useMotionValue, useTransform</description>
      <imports>
        <import name="UseChatHelpers" from="@ai-sdk/react" />
        <import name="cx" from="classnames" />
        <import name="AnimatePresence, motion, useMotionValue, useTransform" from="framer-motion" />
        <import name="nanoid" from="nanoid" />
        <import name="Dispatch, memo, ReactNode, SetStateAction, useEffect, useRef, useState" from="react" />
        <import name="useOnClickOutside" from="usehooks-ts" />
        <import name="Tooltip, TooltipContent, TooltipProvider, TooltipTrigger" from="@/components/ui/tooltip" />
        <import name="ChatSDKError" from="@/lib/errors" />
        <import name="ChatMessage" from="@/lib/types" />
        <import name="ArtifactKind, artifactDefinitions" from="./artifact" />
        <import name="ArtifactToolbarItem" from="./create-artifact" />
        <import name="ArrowUpIcon, StopIcon, SummarizeIcon" from="./icons" />
      </imports>
      <usesHooks>
        <hook name="useMotionValue" />
        <hook name="useTransform" />
      </usesHooks>
    </component>
    <component id="cmp_Tools" name="Tools" path="f:/Study/Code/git/nextjs-ai-chatbot/components/toolbar.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="UseChatHelpers" from="@ai-sdk/react" />
        <import name="cx" from="classnames" />
        <import name="AnimatePresence, motion, useMotionValue, useTransform" from="framer-motion" />
        <import name="nanoid" from="nanoid" />
        <import name="Dispatch, memo, ReactNode, SetStateAction, useEffect, useRef, useState" from="react" />
        <import name="useOnClickOutside" from="usehooks-ts" />
        <import name="Tooltip, TooltipContent, TooltipProvider, TooltipTrigger" from="@/components/ui/tooltip" />
        <import name="ChatSDKError" from="@/lib/errors" />
        <import name="ChatMessage" from="@/lib/types" />
        <import name="ArtifactKind, artifactDefinitions" from="./artifact" />
        <import name="ArtifactToolbarItem" from="./create-artifact" />
        <import name="ArrowUpIcon, StopIcon, SummarizeIcon" from="./icons" />
      </imports>
    </component>
    <component id="cmp_PureToolbar" name="PureToolbar" path="f:/Study/Code/git/nextjs-ai-chatbot/components/toolbar.tsx" kind="ui" isClient="true">
      <description>[Skeleton] State: { selectedTool, isAnimating } | Effects: 2 detected | Uses: useRef, useOnClickOutside</description>
      <imports>
        <import name="UseChatHelpers" from="@ai-sdk/react" />
        <import name="cx" from="classnames" />
        <import name="AnimatePresence, motion, useMotionValue, useTransform" from="framer-motion" />
        <import name="nanoid" from="nanoid" />
        <import name="Dispatch, memo, ReactNode, SetStateAction, useEffect, useRef, useState" from="react" />
        <import name="useOnClickOutside" from="usehooks-ts" />
        <import name="Tooltip, TooltipContent, TooltipProvider, TooltipTrigger" from="@/components/ui/tooltip" />
        <import name="ChatSDKError" from="@/lib/errors" />
        <import name="ChatMessage" from="@/lib/types" />
        <import name="ArtifactKind, artifactDefinitions" from="./artifact" />
        <import name="ArtifactToolbarItem" from="./create-artifact" />
        <import name="ArrowUpIcon, StopIcon, SummarizeIcon" from="./icons" />
      </imports>
      <usesHooks>
        <hook name="useRef" />
        <hook name="useOnClickOutside" />
      </usesHooks>
    </component>
    <component id="cmp_VersionFooter" name="VersionFooter" path="f:/Study/Code/git/nextjs-ai-chatbot/components/version-footer.tsx" kind="ui" isClient="true">
      <description>[Skeleton] State: { isMutating } | Uses: useArtifact, useWindowSize, useSWRConfig</description>
      <imports>
        <import name="isAfter" from="date-fns" />
        <import name="motion" from="framer-motion" />
        <import name="useState" from="react" />
        <import name="useSWRConfig" from="swr" />
        <import name="useWindowSize" from="usehooks-ts" />
        <import name="useArtifact" from="@/hooks/use-artifact" />
        <import name="Document" from="@/lib/db/schema" />
        <import name="getDocumentTimestampByIndex" from="@/lib/utils" />
        <import name="LoaderIcon" from="./icons" />
        <import name="Button" from="./ui/button" />
      </imports>
      <usesHooks>
        <hook name="useArtifact" />
        <hook name="useWindowSize" />
        <hook name="useSWRConfig" />
      </usesHooks>
    </component>
    <component id="cmp_VisibilitySelector" name="VisibilitySelector" path="f:/Study/Code/git/nextjs-ai-chatbot/components/visibility-selector.tsx" kind="ui" isClient="true">
      <description>[Skeleton] State: { open } | Uses: useChatVisibility, useMemo</description>
      <props>
        <prop name="chatId" type="any" required="true" />
        <prop name="className" type="any" required="true" />
        <prop name="selectedVisibilityType" type="any" required="true" />
      </props>
      <imports>
        <import name="ReactNode, useMemo, useState" from="react" />
        <import name="Button" from="@/components/ui/button" />
        <import name="DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger" from="@/components/ui/dropdown-menu" />
        <import name="useChatVisibility" from="@/hooks/use-chat-visibility" />
        <import name="cn" from="@/lib/utils" />
        <import name="CheckCircleFillIcon, ChevronDownIcon, GlobeIcon, LockIcon" from="./icons" />
      </imports>
      <usesHooks>
        <hook name="useChatVisibility" />
        <hook name="useMemo" />
      </usesHooks>
    </component>
    <component id="cmp_Weather" name="Weather" path="f:/Study/Code/git/nextjs-ai-chatbot/components/weather.tsx" kind="ui" isClient="true">
      <description>[Skeleton] State: { isMobile } | Effects: 1 detected</description>
      <props>
        <prop name="weatherAtLocation" type="any" required="true" />
      </props>
      <imports>
        <import name="cx" from="classnames" />
        <import name="format, isWithinInterval" from="date-fns" />
        <import name="useEffect, useState" from="react" />
      </imports>
    </component>
    <component id="cmp_SunIcon" name="SunIcon" path="f:/Study/Code/git/nextjs-ai-chatbot/components/weather.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="cx" from="classnames" />
        <import name="format, isWithinInterval" from="date-fns" />
        <import name="useEffect, useState" from="react" />
      </imports>
    </component>
    <component id="cmp_MoonIcon" name="MoonIcon" path="f:/Study/Code/git/nextjs-ai-chatbot/components/weather.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="cx" from="classnames" />
        <import name="format, isWithinInterval" from="date-fns" />
        <import name="useEffect, useState" from="react" />
      </imports>
    </component>
    <component id="cmp_CloudIcon" name="CloudIcon" path="f:/Study/Code/git/nextjs-ai-chatbot/components/weather.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="cx" from="classnames" />
        <import name="format, isWithinInterval" from="date-fns" />
        <import name="useEffect, useState" from="react" />
      </imports>
    </component>
    <component id="cmp_OptimisticChatsProvider" name="OptimisticChatsProvider" path="f:/Study/Code/git/nextjs-ai-chatbot/hooks/use-optimistic-chats.tsx" kind="ui" isClient="true">
      <description>[Skeleton] State: { optimisticChats } | Uses: useCallback</description>
      <props>
        <prop name="children" type="any" required="true" />
      </props>
      <imports>
        <import name="createContext, ReactNode, useCallback, useContext, useState" from="react" />
        <import name="ChatSDKError" from="@/lib/errors" />
      </imports>
      <usesHooks>
        <hook name="useCallback" />
      </usesHooks>
    </component>
    <component id="cmp_ChatLayoutClient" name="ChatLayoutClient" path="f:/Study/Code/git/nextjs-ai-chatbot/app/(chat)/chat-layout-client.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Effects: 1 detected | Uses: useSearchParams</description>
      <props>
        <prop name="children" type="any" required="true" />
      </props>
      <imports>
        <import name="dynamic" from="next/dynamic" />
        <import name="useSearchParams" from="next/navigation" />
        <import name="Script" from="next/script" />
        <import name="ReactNode" from="react" />
        <import name="Suspense, useEffect" from="react" />
        <import name="toast" from="sonner" />
        <import name="DataStreamProvider" from="@/components/data-stream-provider" />
        <import name="Loader" from="@/components/elements/loader" />
        <import name="SidebarSkeleton" from="@/components/sidebar-skeleton" />
        <import name="SidebarInset, SidebarProvider" from="@/components/ui/sidebar" />
        <import name="OptimisticChatsProvider" from="@/hooks/use-optimistic-chats" />
        <import name="SettingsProvider" from="@/lib/ui/settings-store" />
      </imports>
      <usesHooks>
        <hook name="useSearchParams" />
      </usesHooks>
    </component>
    <component id="cmp_Layout" name="Layout" path="f:/Study/Code/git/nextjs-ai-chatbot/app/(chat)/layout.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
      <props>
        <prop name="children" type="any" required="true" />
      </props>
      <imports>
        <import name="ChatLayoutClient" from="./chat-layout-client" />
      </imports>
    </component>
    <component id="cmp_Loading" name="Loading" path="f:/Study/Code/git/nextjs-ai-chatbot/app/(chat)/loading.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
    </component>
    <component id="cmp_Page" name="Page" path="f:/Study/Code/git/nextjs-ai-chatbot/app/(chat)/page.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="cookies" from="next/headers" />
        <import name="Chat" from="@/components/chat" />
        <import name="DataStreamHandler" from="@/components/data-stream-handler" />
        <import name="listChatModels" from="@/lib/ai/model-registry" />
        <import name="DEFAULT_CHAT_MODEL" from="@/lib/ai/models" />
        <import name="generateUUID" from="@/lib/utils" />
      </imports>
    </component>
    <component id="cmp_Actions" name="Actions" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/actions.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="ComponentProps" from="react" />
        <import name="Button" from="@/components/ui/button" />
        <import name="Tooltip, TooltipContent, TooltipProvider, TooltipTrigger" from="@/components/ui/tooltip" />
        <import name="cn" from="@/lib/utils" />
      </imports>
    </component>
    <component id="cmp_Action" name="Action" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/actions.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="ComponentProps" from="react" />
        <import name="Button" from="@/components/ui/button" />
        <import name="Tooltip, TooltipContent, TooltipProvider, TooltipTrigger" from="@/components/ui/tooltip" />
        <import name="cn" from="@/lib/utils" />
      </imports>
    </component>
    <component id="cmp_Branch" name="Branch" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/branch.tsx" kind="ui" isClient="true">
      <description>[Skeleton] State: { currentBranch, branches }</description>
      <imports>
        <import name="UIMessage" from="ai" />
        <import name="ChevronLeftIcon, ChevronRightIcon" from="lucide-react" />
        <import name="ComponentProps, HTMLAttributes, ReactElement" from="react" />
        <import name="createContext, useContext, useEffect, useMemo, useState" from="react" />
        <import name="Button" from="@/components/ui/button" />
        <import name="ChatSDKError" from="@/lib/errors" />
        <import name="cn" from="@/lib/utils" />
      </imports>
    </component>
    <component id="cmp_BranchMessages" name="BranchMessages" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/branch.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Effects: 1 detected | Uses: useBranch, useMemo</description>
      <imports>
        <import name="UIMessage" from="ai" />
        <import name="ChevronLeftIcon, ChevronRightIcon" from="lucide-react" />
        <import name="ComponentProps, HTMLAttributes, ReactElement" from="react" />
        <import name="createContext, useContext, useEffect, useMemo, useState" from="react" />
        <import name="Button" from="@/components/ui/button" />
        <import name="ChatSDKError" from="@/lib/errors" />
        <import name="cn" from="@/lib/utils" />
      </imports>
      <usesHooks>
        <hook name="useBranch" />
        <hook name="useMemo" />
      </usesHooks>
    </component>
    <component id="cmp_BranchSelector" name="BranchSelector" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/branch.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Uses: useBranch</description>
      <imports>
        <import name="UIMessage" from="ai" />
        <import name="ChevronLeftIcon, ChevronRightIcon" from="lucide-react" />
        <import name="ComponentProps, HTMLAttributes, ReactElement" from="react" />
        <import name="createContext, useContext, useEffect, useMemo, useState" from="react" />
        <import name="Button" from="@/components/ui/button" />
        <import name="ChatSDKError" from="@/lib/errors" />
        <import name="cn" from="@/lib/utils" />
      </imports>
      <usesHooks>
        <hook name="useBranch" />
      </usesHooks>
    </component>
    <component id="cmp_BranchPrevious" name="BranchPrevious" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/branch.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Uses: useBranch</description>
      <imports>
        <import name="UIMessage" from="ai" />
        <import name="ChevronLeftIcon, ChevronRightIcon" from="lucide-react" />
        <import name="ComponentProps, HTMLAttributes, ReactElement" from="react" />
        <import name="createContext, useContext, useEffect, useMemo, useState" from="react" />
        <import name="Button" from="@/components/ui/button" />
        <import name="ChatSDKError" from="@/lib/errors" />
        <import name="cn" from="@/lib/utils" />
      </imports>
      <usesHooks>
        <hook name="useBranch" />
      </usesHooks>
    </component>
    <component id="cmp_BranchNext" name="BranchNext" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/branch.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Uses: useBranch</description>
      <imports>
        <import name="UIMessage" from="ai" />
        <import name="ChevronLeftIcon, ChevronRightIcon" from="lucide-react" />
        <import name="ComponentProps, HTMLAttributes, ReactElement" from="react" />
        <import name="createContext, useContext, useEffect, useMemo, useState" from="react" />
        <import name="Button" from="@/components/ui/button" />
        <import name="ChatSDKError" from="@/lib/errors" />
        <import name="cn" from="@/lib/utils" />
      </imports>
      <usesHooks>
        <hook name="useBranch" />
      </usesHooks>
    </component>
    <component id="cmp_BranchPage" name="BranchPage" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/branch.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Uses: useBranch</description>
      <imports>
        <import name="UIMessage" from="ai" />
        <import name="ChevronLeftIcon, ChevronRightIcon" from="lucide-react" />
        <import name="ComponentProps, HTMLAttributes, ReactElement" from="react" />
        <import name="createContext, useContext, useEffect, useMemo, useState" from="react" />
        <import name="Button" from="@/components/ui/button" />
        <import name="ChatSDKError" from="@/lib/errors" />
        <import name="cn" from="@/lib/utils" />
      </imports>
      <usesHooks>
        <hook name="useBranch" />
      </usesHooks>
    </component>
    <component id="cmp_DynamicLanguageCodeBlock" name="DynamicLanguageCodeBlock" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/code-block.tsx" kind="ui" isClient="true">
      <description>[Skeleton] State: { readyLang } | Effects: 2 detected | Uses: useMemo, useRef</description>
      <props>
        <prop name="code" type="any" required="true" />
        <prop name="language" type="any" required="true" />
        <prop name="showLineNumbers" type="any" required="true" />
        <prop name="className" type="any" required="true" />
        <prop name="children" type="any" required="true" />
        <prop name="...props" type="any" required="true" />
      </props>
      <imports>
        <import name="CheckIcon, CopyIcon" from="lucide-react" />
        <import name="ComponentProps, HTMLAttributes, ReactNode" from="react" />
        <import name="createContext, useContext, useEffect, useMemo, useRef, useState" from="react" />
        <import name="PrismLight" from="react-syntax-highlighter" />
        <import name="oneDark, oneLight" from="react-syntax-highlighter/dist/esm/styles/prism" />
        <import name="Button" from="@/components/ui/button" />
        <import name="ChatSDKError" from="@/lib/errors" />
        <import name="cn" from="@/lib/utils" />
      </imports>
      <usesHooks>
        <hook name="useMemo" />
        <hook name="useRef" />
      </usesHooks>
    </component>
    <component id="cmp_CodeBlock" name="CodeBlock" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/code-block.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="CheckIcon, CopyIcon" from="lucide-react" />
        <import name="ComponentProps, HTMLAttributes, ReactNode" from="react" />
        <import name="createContext, useContext, useEffect, useMemo, useRef, useState" from="react" />
        <import name="PrismLight" from="react-syntax-highlighter" />
        <import name="oneDark, oneLight" from="react-syntax-highlighter/dist/esm/styles/prism" />
        <import name="Button" from="@/components/ui/button" />
        <import name="ChatSDKError" from="@/lib/errors" />
        <import name="cn" from="@/lib/utils" />
      </imports>
    </component>
    <component id="cmp_CodeBlockCopyButton" name="CodeBlockCopyButton" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/code-block.tsx" kind="ui" isClient="true">
      <description>[Skeleton] State: { isCopied } | Uses: useContext</description>
      <imports>
        <import name="CheckIcon, CopyIcon" from="lucide-react" />
        <import name="ComponentProps, HTMLAttributes, ReactNode" from="react" />
        <import name="createContext, useContext, useEffect, useMemo, useRef, useState" from="react" />
        <import name="PrismLight" from="react-syntax-highlighter" />
        <import name="oneDark, oneLight" from="react-syntax-highlighter/dist/esm/styles/prism" />
        <import name="Button" from="@/components/ui/button" />
        <import name="ChatSDKError" from="@/lib/errors" />
        <import name="cn" from="@/lib/utils" />
      </imports>
      <usesHooks>
        <hook name="useContext" />
      </usesHooks>
    </component>
    <component id="cmp_InfoRow" name="InfoRow" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/context.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Stateless UI</description>
      <props>
        <prop name="label" type="any" required="true" />
        <prop name="tokens" type="any" required="true" />
        <prop name="costText" type="any" required="true" />
      </props>
      <imports>
        <import name="ComponentProps" from="react" />
        <import name="DropdownMenu, DropdownMenuContent, DropdownMenuTrigger" from="@/components/ui/dropdown-menu" />
        <import name="Progress" from="@/components/ui/progress" />
        <import name="Separator" from="@/components/ui/separator" />
        <import name="AppUsage" from="@/lib/usage" />
        <import name="cn" from="@/lib/utils" />
      </imports>
    </component>
    <component id="cmp_ContextIcon" name="ContextIcon" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/context.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="ComponentProps" from="react" />
        <import name="DropdownMenu, DropdownMenuContent, DropdownMenuTrigger" from="@/components/ui/dropdown-menu" />
        <import name="Progress" from="@/components/ui/progress" />
        <import name="Separator" from="@/components/ui/separator" />
        <import name="AppUsage" from="@/lib/usage" />
        <import name="cn" from="@/lib/utils" />
      </imports>
    </component>
    <component id="cmp_Context" name="Context" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/context.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="ComponentProps" from="react" />
        <import name="DropdownMenu, DropdownMenuContent, DropdownMenuTrigger" from="@/components/ui/dropdown-menu" />
        <import name="Progress" from="@/components/ui/progress" />
        <import name="Separator" from="@/components/ui/separator" />
        <import name="AppUsage" from="@/lib/usage" />
        <import name="cn" from="@/lib/utils" />
      </imports>
    </component>
    <component id="cmp_Conversation" name="Conversation" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/conversation.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="ArrowDownIcon" from="lucide-react" />
        <import name="ComponentProps" from="react" />
        <import name="useCallback" from="react" />
        <import name="StickToBottom, useStickToBottomContext" from="use-stick-to-bottom" />
        <import name="Button" from="@/components/ui/button" />
        <import name="cn" from="@/lib/utils" />
      </imports>
    </component>
    <component id="cmp_ConversationContent" name="ConversationContent" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/conversation.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="ArrowDownIcon" from="lucide-react" />
        <import name="ComponentProps" from="react" />
        <import name="useCallback" from="react" />
        <import name="StickToBottom, useStickToBottomContext" from="use-stick-to-bottom" />
        <import name="Button" from="@/components/ui/button" />
        <import name="cn" from="@/lib/utils" />
      </imports>
    </component>
    <component id="cmp_ConversationScrollButton" name="ConversationScrollButton" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/conversation.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Uses: useStickToBottomContext, useCallback</description>
      <imports>
        <import name="ArrowDownIcon" from="lucide-react" />
        <import name="ComponentProps" from="react" />
        <import name="useCallback" from="react" />
        <import name="StickToBottom, useStickToBottomContext" from="use-stick-to-bottom" />
        <import name="Button" from="@/components/ui/button" />
        <import name="cn" from="@/lib/utils" />
      </imports>
      <usesHooks>
        <hook name="useStickToBottomContext" />
        <hook name="useCallback" />
      </usesHooks>
    </component>
    <component id="cmp_Image" name="Image" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/image.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="Experimental_GeneratedImage" from="ai" />
        <import name="cn" from="@/lib/utils" />
      </imports>
    </component>
    <component id="cmp_InlineCitation" name="InlineCitation" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/inline-citation.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="ArrowLeftIcon, ArrowRightIcon" from="lucide-react" />
        <import name="ComponentProps, createContext, useCallback, useContext, useEffect, useState" from="react" />
        <import name="Badge" from="@/components/ui/badge" />
        <import name="Carousel, CarouselApi, CarouselContent, CarouselItem" from="@/components/ui/carousel" />
        <import name="HoverCard, HoverCardContent, HoverCardTrigger" from="@/components/ui/hover-card" />
        <import name="cn" from="@/lib/utils" />
      </imports>
    </component>
    <component id="cmp_InlineCitationText" name="InlineCitationText" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/inline-citation.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="ArrowLeftIcon, ArrowRightIcon" from="lucide-react" />
        <import name="ComponentProps, createContext, useCallback, useContext, useEffect, useState" from="react" />
        <import name="Badge" from="@/components/ui/badge" />
        <import name="Carousel, CarouselApi, CarouselContent, CarouselItem" from="@/components/ui/carousel" />
        <import name="HoverCard, HoverCardContent, HoverCardTrigger" from="@/components/ui/hover-card" />
        <import name="cn" from="@/lib/utils" />
      </imports>
    </component>
    <component id="cmp_InlineCitationCard" name="InlineCitationCard" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/inline-citation.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="ArrowLeftIcon, ArrowRightIcon" from="lucide-react" />
        <import name="ComponentProps, createContext, useCallback, useContext, useEffect, useState" from="react" />
        <import name="Badge" from="@/components/ui/badge" />
        <import name="Carousel, CarouselApi, CarouselContent, CarouselItem" from="@/components/ui/carousel" />
        <import name="HoverCard, HoverCardContent, HoverCardTrigger" from="@/components/ui/hover-card" />
        <import name="cn" from="@/lib/utils" />
      </imports>
    </component>
    <component id="cmp_InlineCitationCardTrigger" name="InlineCitationCardTrigger" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/inline-citation.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="ArrowLeftIcon, ArrowRightIcon" from="lucide-react" />
        <import name="ComponentProps, createContext, useCallback, useContext, useEffect, useState" from="react" />
        <import name="Badge" from="@/components/ui/badge" />
        <import name="Carousel, CarouselApi, CarouselContent, CarouselItem" from="@/components/ui/carousel" />
        <import name="HoverCard, HoverCardContent, HoverCardTrigger" from="@/components/ui/hover-card" />
        <import name="cn" from="@/lib/utils" />
      </imports>
    </component>
    <component id="cmp_InlineCitationCardBody" name="InlineCitationCardBody" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/inline-citation.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="ArrowLeftIcon, ArrowRightIcon" from="lucide-react" />
        <import name="ComponentProps, createContext, useCallback, useContext, useEffect, useState" from="react" />
        <import name="Badge" from="@/components/ui/badge" />
        <import name="Carousel, CarouselApi, CarouselContent, CarouselItem" from="@/components/ui/carousel" />
        <import name="HoverCard, HoverCardContent, HoverCardTrigger" from="@/components/ui/hover-card" />
        <import name="cn" from="@/lib/utils" />
      </imports>
    </component>
    <component id="cmp_InlineCitationCarousel" name="InlineCitationCarousel" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/inline-citation.tsx" kind="ui" isClient="true">
      <description>[Skeleton] State: { api }</description>
      <imports>
        <import name="ArrowLeftIcon, ArrowRightIcon" from="lucide-react" />
        <import name="ComponentProps, createContext, useCallback, useContext, useEffect, useState" from="react" />
        <import name="Badge" from="@/components/ui/badge" />
        <import name="Carousel, CarouselApi, CarouselContent, CarouselItem" from="@/components/ui/carousel" />
        <import name="HoverCard, HoverCardContent, HoverCardTrigger" from="@/components/ui/hover-card" />
        <import name="cn" from="@/lib/utils" />
      </imports>
    </component>
    <component id="cmp_InlineCitationCarouselContent" name="InlineCitationCarouselContent" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/inline-citation.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="ArrowLeftIcon, ArrowRightIcon" from="lucide-react" />
        <import name="ComponentProps, createContext, useCallback, useContext, useEffect, useState" from="react" />
        <import name="Badge" from="@/components/ui/badge" />
        <import name="Carousel, CarouselApi, CarouselContent, CarouselItem" from="@/components/ui/carousel" />
        <import name="HoverCard, HoverCardContent, HoverCardTrigger" from="@/components/ui/hover-card" />
        <import name="cn" from="@/lib/utils" />
      </imports>
    </component>
    <component id="cmp_InlineCitationCarouselItem" name="InlineCitationCarouselItem" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/inline-citation.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="ArrowLeftIcon, ArrowRightIcon" from="lucide-react" />
        <import name="ComponentProps, createContext, useCallback, useContext, useEffect, useState" from="react" />
        <import name="Badge" from="@/components/ui/badge" />
        <import name="Carousel, CarouselApi, CarouselContent, CarouselItem" from="@/components/ui/carousel" />
        <import name="HoverCard, HoverCardContent, HoverCardTrigger" from="@/components/ui/hover-card" />
        <import name="cn" from="@/lib/utils" />
      </imports>
    </component>
    <component id="cmp_InlineCitationCarouselHeader" name="InlineCitationCarouselHeader" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/inline-citation.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="ArrowLeftIcon, ArrowRightIcon" from="lucide-react" />
        <import name="ComponentProps, createContext, useCallback, useContext, useEffect, useState" from="react" />
        <import name="Badge" from="@/components/ui/badge" />
        <import name="Carousel, CarouselApi, CarouselContent, CarouselItem" from="@/components/ui/carousel" />
        <import name="HoverCard, HoverCardContent, HoverCardTrigger" from="@/components/ui/hover-card" />
        <import name="cn" from="@/lib/utils" />
      </imports>
    </component>
    <component id="cmp_InlineCitationCarouselIndex" name="InlineCitationCarouselIndex" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/inline-citation.tsx" kind="ui" isClient="true">
      <description>[Skeleton] State: { current, count } | Effects: 1 detected | Uses: useCarouselApi</description>
      <imports>
        <import name="ArrowLeftIcon, ArrowRightIcon" from="lucide-react" />
        <import name="ComponentProps, createContext, useCallback, useContext, useEffect, useState" from="react" />
        <import name="Badge" from="@/components/ui/badge" />
        <import name="Carousel, CarouselApi, CarouselContent, CarouselItem" from="@/components/ui/carousel" />
        <import name="HoverCard, HoverCardContent, HoverCardTrigger" from="@/components/ui/hover-card" />
        <import name="cn" from="@/lib/utils" />
      </imports>
      <usesHooks>
        <hook name="useCarouselApi" />
      </usesHooks>
    </component>
    <component id="cmp_InlineCitationCarouselPrev" name="InlineCitationCarouselPrev" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/inline-citation.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Uses: useCarouselApi, useCallback</description>
      <imports>
        <import name="ArrowLeftIcon, ArrowRightIcon" from="lucide-react" />
        <import name="ComponentProps, createContext, useCallback, useContext, useEffect, useState" from="react" />
        <import name="Badge" from="@/components/ui/badge" />
        <import name="Carousel, CarouselApi, CarouselContent, CarouselItem" from="@/components/ui/carousel" />
        <import name="HoverCard, HoverCardContent, HoverCardTrigger" from="@/components/ui/hover-card" />
        <import name="cn" from="@/lib/utils" />
      </imports>
      <usesHooks>
        <hook name="useCarouselApi" />
        <hook name="useCallback" />
      </usesHooks>
    </component>
    <component id="cmp_InlineCitationCarouselNext" name="InlineCitationCarouselNext" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/inline-citation.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Uses: useCarouselApi, useCallback</description>
      <imports>
        <import name="ArrowLeftIcon, ArrowRightIcon" from="lucide-react" />
        <import name="ComponentProps, createContext, useCallback, useContext, useEffect, useState" from="react" />
        <import name="Badge" from="@/components/ui/badge" />
        <import name="Carousel, CarouselApi, CarouselContent, CarouselItem" from="@/components/ui/carousel" />
        <import name="HoverCard, HoverCardContent, HoverCardTrigger" from="@/components/ui/hover-card" />
        <import name="cn" from="@/lib/utils" />
      </imports>
      <usesHooks>
        <hook name="useCarouselApi" />
        <hook name="useCallback" />
      </usesHooks>
    </component>
    <component id="cmp_InlineCitationSource" name="InlineCitationSource" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/inline-citation.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="ArrowLeftIcon, ArrowRightIcon" from="lucide-react" />
        <import name="ComponentProps, createContext, useCallback, useContext, useEffect, useState" from="react" />
        <import name="Badge" from="@/components/ui/badge" />
        <import name="Carousel, CarouselApi, CarouselContent, CarouselItem" from="@/components/ui/carousel" />
        <import name="HoverCard, HoverCardContent, HoverCardTrigger" from="@/components/ui/hover-card" />
        <import name="cn" from="@/lib/utils" />
      </imports>
    </component>
    <component id="cmp_InlineCitationQuote" name="InlineCitationQuote" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/inline-citation.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="ArrowLeftIcon, ArrowRightIcon" from="lucide-react" />
        <import name="ComponentProps, createContext, useCallback, useContext, useEffect, useState" from="react" />
        <import name="Badge" from="@/components/ui/badge" />
        <import name="Carousel, CarouselApi, CarouselContent, CarouselItem" from="@/components/ui/carousel" />
        <import name="HoverCard, HoverCardContent, HoverCardTrigger" from="@/components/ui/hover-card" />
        <import name="cn" from="@/lib/utils" />
      </imports>
    </component>
    <component id="cmp_LoaderIcon" name="LoaderIcon" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/loader.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="HTMLAttributes" from="react" />
        <import name="cn" from="@/lib/utils" />
      </imports>
    </component>
    <component id="cmp_Loader" name="Loader" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/loader.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="HTMLAttributes" from="react" />
        <import name="cn" from="@/lib/utils" />
      </imports>
    </component>
    <component id="cmp_Message" name="Message" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/message.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="UIMessage" from="ai" />
        <import name="ComponentProps, HTMLAttributes" from="react" />
        <import name="Avatar, AvatarFallback, AvatarImage" from="@/components/ui/avatar" />
        <import name="cn" from="@/lib/utils" />
      </imports>
    </component>
    <component id="cmp_MessageContent" name="MessageContent" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/message.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="UIMessage" from="ai" />
        <import name="ComponentProps, HTMLAttributes" from="react" />
        <import name="Avatar, AvatarFallback, AvatarImage" from="@/components/ui/avatar" />
        <import name="cn" from="@/lib/utils" />
      </imports>
    </component>
    <component id="cmp_MessageAvatar" name="MessageAvatar" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/message.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="UIMessage" from="ai" />
        <import name="ComponentProps, HTMLAttributes" from="react" />
        <import name="Avatar, AvatarFallback, AvatarImage" from="@/components/ui/avatar" />
        <import name="cn" from="@/lib/utils" />
      </imports>
    </component>
    <component id="cmp_PromptInput" name="PromptInput" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/prompt-input.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="ChatStatus" from="ai" />
        <import name="Loader2Icon, SendIcon, SquareIcon, XIcon" from="lucide-react" />
        <import name="ComponentProps, HTMLAttributes, KeyboardEventHandler" from="react" />
        <import name="Children" from="react" />
        <import name="Button" from="@/components/ui/button" />
        <import name="Select, SelectContent, SelectItem, SelectTrigger, SelectValue" from="@/components/ui/select" />
        <import name="Textarea" from="@/components/ui/textarea" />
        <import name="cn" from="@/lib/utils" />
      </imports>
    </component>
    <component id="cmp_PromptInputTextarea" name="PromptInputTextarea" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/prompt-input.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="ChatStatus" from="ai" />
        <import name="Loader2Icon, SendIcon, SquareIcon, XIcon" from="lucide-react" />
        <import name="ComponentProps, HTMLAttributes, KeyboardEventHandler" from="react" />
        <import name="Children" from="react" />
        <import name="Button" from="@/components/ui/button" />
        <import name="Select, SelectContent, SelectItem, SelectTrigger, SelectValue" from="@/components/ui/select" />
        <import name="Textarea" from="@/components/ui/textarea" />
        <import name="cn" from="@/lib/utils" />
      </imports>
    </component>
    <component id="cmp_PromptInputToolbar" name="PromptInputToolbar" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/prompt-input.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="ChatStatus" from="ai" />
        <import name="Loader2Icon, SendIcon, SquareIcon, XIcon" from="lucide-react" />
        <import name="ComponentProps, HTMLAttributes, KeyboardEventHandler" from="react" />
        <import name="Children" from="react" />
        <import name="Button" from="@/components/ui/button" />
        <import name="Select, SelectContent, SelectItem, SelectTrigger, SelectValue" from="@/components/ui/select" />
        <import name="Textarea" from="@/components/ui/textarea" />
        <import name="cn" from="@/lib/utils" />
      </imports>
    </component>
    <component id="cmp_PromptInputTools" name="PromptInputTools" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/prompt-input.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="ChatStatus" from="ai" />
        <import name="Loader2Icon, SendIcon, SquareIcon, XIcon" from="lucide-react" />
        <import name="ComponentProps, HTMLAttributes, KeyboardEventHandler" from="react" />
        <import name="Children" from="react" />
        <import name="Button" from="@/components/ui/button" />
        <import name="Select, SelectContent, SelectItem, SelectTrigger, SelectValue" from="@/components/ui/select" />
        <import name="Textarea" from="@/components/ui/textarea" />
        <import name="cn" from="@/lib/utils" />
      </imports>
    </component>
    <component id="cmp_PromptInputButton" name="PromptInputButton" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/prompt-input.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="ChatStatus" from="ai" />
        <import name="Loader2Icon, SendIcon, SquareIcon, XIcon" from="lucide-react" />
        <import name="ComponentProps, HTMLAttributes, KeyboardEventHandler" from="react" />
        <import name="Children" from="react" />
        <import name="Button" from="@/components/ui/button" />
        <import name="Select, SelectContent, SelectItem, SelectTrigger, SelectValue" from="@/components/ui/select" />
        <import name="Textarea" from="@/components/ui/textarea" />
        <import name="cn" from="@/lib/utils" />
      </imports>
    </component>
    <component id="cmp_PromptInputSubmit" name="PromptInputSubmit" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/prompt-input.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="ChatStatus" from="ai" />
        <import name="Loader2Icon, SendIcon, SquareIcon, XIcon" from="lucide-react" />
        <import name="ComponentProps, HTMLAttributes, KeyboardEventHandler" from="react" />
        <import name="Children" from="react" />
        <import name="Button" from="@/components/ui/button" />
        <import name="Select, SelectContent, SelectItem, SelectTrigger, SelectValue" from="@/components/ui/select" />
        <import name="Textarea" from="@/components/ui/textarea" />
        <import name="cn" from="@/lib/utils" />
      </imports>
    </component>
    <component id="cmp_PromptInputModelSelect" name="PromptInputModelSelect" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/prompt-input.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="ChatStatus" from="ai" />
        <import name="Loader2Icon, SendIcon, SquareIcon, XIcon" from="lucide-react" />
        <import name="ComponentProps, HTMLAttributes, KeyboardEventHandler" from="react" />
        <import name="Children" from="react" />
        <import name="Button" from="@/components/ui/button" />
        <import name="Select, SelectContent, SelectItem, SelectTrigger, SelectValue" from="@/components/ui/select" />
        <import name="Textarea" from="@/components/ui/textarea" />
        <import name="cn" from="@/lib/utils" />
      </imports>
    </component>
    <component id="cmp_PromptInputModelSelectTrigger" name="PromptInputModelSelectTrigger" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/prompt-input.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="ChatStatus" from="ai" />
        <import name="Loader2Icon, SendIcon, SquareIcon, XIcon" from="lucide-react" />
        <import name="ComponentProps, HTMLAttributes, KeyboardEventHandler" from="react" />
        <import name="Children" from="react" />
        <import name="Button" from="@/components/ui/button" />
        <import name="Select, SelectContent, SelectItem, SelectTrigger, SelectValue" from="@/components/ui/select" />
        <import name="Textarea" from="@/components/ui/textarea" />
        <import name="cn" from="@/lib/utils" />
      </imports>
    </component>
    <component id="cmp_PromptInputModelSelectContent" name="PromptInputModelSelectContent" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/prompt-input.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="ChatStatus" from="ai" />
        <import name="Loader2Icon, SendIcon, SquareIcon, XIcon" from="lucide-react" />
        <import name="ComponentProps, HTMLAttributes, KeyboardEventHandler" from="react" />
        <import name="Children" from="react" />
        <import name="Button" from="@/components/ui/button" />
        <import name="Select, SelectContent, SelectItem, SelectTrigger, SelectValue" from="@/components/ui/select" />
        <import name="Textarea" from="@/components/ui/textarea" />
        <import name="cn" from="@/lib/utils" />
      </imports>
    </component>
    <component id="cmp_PromptInputModelSelectItem" name="PromptInputModelSelectItem" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/prompt-input.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="ChatStatus" from="ai" />
        <import name="Loader2Icon, SendIcon, SquareIcon, XIcon" from="lucide-react" />
        <import name="ComponentProps, HTMLAttributes, KeyboardEventHandler" from="react" />
        <import name="Children" from="react" />
        <import name="Button" from="@/components/ui/button" />
        <import name="Select, SelectContent, SelectItem, SelectTrigger, SelectValue" from="@/components/ui/select" />
        <import name="Textarea" from="@/components/ui/textarea" />
        <import name="cn" from="@/lib/utils" />
      </imports>
    </component>
    <component id="cmp_PromptInputModelSelectValue" name="PromptInputModelSelectValue" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/prompt-input.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="ChatStatus" from="ai" />
        <import name="Loader2Icon, SendIcon, SquareIcon, XIcon" from="lucide-react" />
        <import name="ComponentProps, HTMLAttributes, KeyboardEventHandler" from="react" />
        <import name="Children" from="react" />
        <import name="Button" from="@/components/ui/button" />
        <import name="Select, SelectContent, SelectItem, SelectTrigger, SelectValue" from="@/components/ui/select" />
        <import name="Textarea" from="@/components/ui/textarea" />
        <import name="cn" from="@/lib/utils" />
      </imports>
    </component>
    <component id="cmp_Sources" name="Sources" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/source.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="BookIcon, ChevronDownIcon" from="lucide-react" />
        <import name="ComponentProps" from="react" />
        <import name="Collapsible, CollapsibleContent, CollapsibleTrigger" from="@/components/ui/collapsible" />
        <import name="cn" from="@/lib/utils" />
      </imports>
    </component>
    <component id="cmp_SourcesTrigger" name="SourcesTrigger" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/source.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="BookIcon, ChevronDownIcon" from="lucide-react" />
        <import name="ComponentProps" from="react" />
        <import name="Collapsible, CollapsibleContent, CollapsibleTrigger" from="@/components/ui/collapsible" />
        <import name="cn" from="@/lib/utils" />
      </imports>
    </component>
    <component id="cmp_SourcesContent" name="SourcesContent" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/source.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="BookIcon, ChevronDownIcon" from="lucide-react" />
        <import name="ComponentProps" from="react" />
        <import name="Collapsible, CollapsibleContent, CollapsibleTrigger" from="@/components/ui/collapsible" />
        <import name="cn" from="@/lib/utils" />
      </imports>
    </component>
    <component id="cmp_Source" name="Source" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/source.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="BookIcon, ChevronDownIcon" from="lucide-react" />
        <import name="ComponentProps" from="react" />
        <import name="Collapsible, CollapsibleContent, CollapsibleTrigger" from="@/components/ui/collapsible" />
        <import name="cn" from="@/lib/utils" />
      </imports>
    </component>
    <component id="cmp_Suggestions" name="Suggestions" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/suggestion.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="ComponentProps" from="react" />
        <import name="Button" from="@/components/ui/button" />
        <import name="ScrollArea, ScrollBar" from="@/components/ui/scroll-area" />
        <import name="cn" from="@/lib/utils" />
      </imports>
    </component>
    <component id="cmp_Suggestion" name="Suggestion" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/suggestion.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="ComponentProps" from="react" />
        <import name="Button" from="@/components/ui/button" />
        <import name="ScrollArea, ScrollBar" from="@/components/ui/scroll-area" />
        <import name="cn" from="@/lib/utils" />
      </imports>
    </component>
    <component id="cmp_TaskItemFile" name="TaskItemFile" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/task.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="ChevronDownIcon, SearchIcon" from="lucide-react" />
        <import name="ComponentProps" from="react" />
        <import name="Collapsible, CollapsibleContent, CollapsibleTrigger" from="@/components/ui/collapsible" />
        <import name="cn" from="@/lib/utils" />
      </imports>
    </component>
    <component id="cmp_TaskItem" name="TaskItem" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/task.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="ChevronDownIcon, SearchIcon" from="lucide-react" />
        <import name="ComponentProps" from="react" />
        <import name="Collapsible, CollapsibleContent, CollapsibleTrigger" from="@/components/ui/collapsible" />
        <import name="cn" from="@/lib/utils" />
      </imports>
    </component>
    <component id="cmp_Task" name="Task" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/task.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="ChevronDownIcon, SearchIcon" from="lucide-react" />
        <import name="ComponentProps" from="react" />
        <import name="Collapsible, CollapsibleContent, CollapsibleTrigger" from="@/components/ui/collapsible" />
        <import name="cn" from="@/lib/utils" />
      </imports>
    </component>
    <component id="cmp_TaskTrigger" name="TaskTrigger" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/task.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="ChevronDownIcon, SearchIcon" from="lucide-react" />
        <import name="ComponentProps" from="react" />
        <import name="Collapsible, CollapsibleContent, CollapsibleTrigger" from="@/components/ui/collapsible" />
        <import name="cn" from="@/lib/utils" />
      </imports>
    </component>
    <component id="cmp_TaskContent" name="TaskContent" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/task.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="ChevronDownIcon, SearchIcon" from="lucide-react" />
        <import name="ComponentProps" from="react" />
        <import name="Collapsible, CollapsibleContent, CollapsibleTrigger" from="@/components/ui/collapsible" />
        <import name="cn" from="@/lib/utils" />
      </imports>
    </component>
    <component id="cmp_Tool" name="Tool" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/tool.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="ToolUIPart" from="ai" />
        <import name="CheckCircleIcon, ChevronDownIcon, CircleIcon, ClockIcon, WrenchIcon, XCircleIcon" from="lucide-react" />
        <import name="ComponentProps, ReactNode" from="react" />
        <import name="Badge" from="@/components/ui/badge" />
        <import name="Collapsible, CollapsibleContent, CollapsibleTrigger" from="@/components/ui/collapsible" />
        <import name="cn" from="@/lib/utils" />
        <import name="CodeBlock" from="./code-block" />
      </imports>
    </component>
    <component id="cmp_ToolHeader" name="ToolHeader" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/tool.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="ToolUIPart" from="ai" />
        <import name="CheckCircleIcon, ChevronDownIcon, CircleIcon, ClockIcon, WrenchIcon, XCircleIcon" from="lucide-react" />
        <import name="ComponentProps, ReactNode" from="react" />
        <import name="Badge" from="@/components/ui/badge" />
        <import name="Collapsible, CollapsibleContent, CollapsibleTrigger" from="@/components/ui/collapsible" />
        <import name="cn" from="@/lib/utils" />
        <import name="CodeBlock" from="./code-block" />
      </imports>
    </component>
    <component id="cmp_ToolContent" name="ToolContent" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/tool.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="ToolUIPart" from="ai" />
        <import name="CheckCircleIcon, ChevronDownIcon, CircleIcon, ClockIcon, WrenchIcon, XCircleIcon" from="lucide-react" />
        <import name="ComponentProps, ReactNode" from="react" />
        <import name="Badge" from="@/components/ui/badge" />
        <import name="Collapsible, CollapsibleContent, CollapsibleTrigger" from="@/components/ui/collapsible" />
        <import name="cn" from="@/lib/utils" />
        <import name="CodeBlock" from="./code-block" />
      </imports>
    </component>
    <component id="cmp_ToolInput" name="ToolInput" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/tool.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="ToolUIPart" from="ai" />
        <import name="CheckCircleIcon, ChevronDownIcon, CircleIcon, ClockIcon, WrenchIcon, XCircleIcon" from="lucide-react" />
        <import name="ComponentProps, ReactNode" from="react" />
        <import name="Badge" from="@/components/ui/badge" />
        <import name="Collapsible, CollapsibleContent, CollapsibleTrigger" from="@/components/ui/collapsible" />
        <import name="cn" from="@/lib/utils" />
        <import name="CodeBlock" from="./code-block" />
      </imports>
    </component>
    <component id="cmp_ToolOutput" name="ToolOutput" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/tool.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="ToolUIPart" from="ai" />
        <import name="CheckCircleIcon, ChevronDownIcon, CircleIcon, ClockIcon, WrenchIcon, XCircleIcon" from="lucide-react" />
        <import name="ComponentProps, ReactNode" from="react" />
        <import name="Badge" from="@/components/ui/badge" />
        <import name="Collapsible, CollapsibleContent, CollapsibleTrigger" from="@/components/ui/collapsible" />
        <import name="cn" from="@/lib/utils" />
        <import name="CodeBlock" from="./code-block" />
      </imports>
    </component>
    <component id="cmp_WebPreview" name="WebPreview" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/web-preview.tsx" kind="ui" isClient="true">
      <description>[Skeleton] State: { url, consoleOpen }</description>
      <imports>
        <import name="ChevronDownIcon" from="lucide-react" />
        <import name="ComponentProps, ReactNode" from="react" />
        <import name="createContext, useContext, useState" from="react" />
        <import name="Button" from="@/components/ui/button" />
        <import name="Collapsible, CollapsibleContent, CollapsibleTrigger" from="@/components/ui/collapsible" />
        <import name="Input" from="@/components/ui/input" />
        <import name="Tooltip, TooltipContent, TooltipProvider, TooltipTrigger" from="@/components/ui/tooltip" />
        <import name="ChatSDKError" from="@/lib/errors" />
        <import name="cn" from="@/lib/utils" />
      </imports>
    </component>
    <component id="cmp_WebPreviewNavigation" name="WebPreviewNavigation" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/web-preview.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="ChevronDownIcon" from="lucide-react" />
        <import name="ComponentProps, ReactNode" from="react" />
        <import name="createContext, useContext, useState" from="react" />
        <import name="Button" from="@/components/ui/button" />
        <import name="Collapsible, CollapsibleContent, CollapsibleTrigger" from="@/components/ui/collapsible" />
        <import name="Input" from="@/components/ui/input" />
        <import name="Tooltip, TooltipContent, TooltipProvider, TooltipTrigger" from="@/components/ui/tooltip" />
        <import name="ChatSDKError" from="@/lib/errors" />
        <import name="cn" from="@/lib/utils" />
      </imports>
    </component>
    <component id="cmp_WebPreviewNavigationButton" name="WebPreviewNavigationButton" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/web-preview.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="ChevronDownIcon" from="lucide-react" />
        <import name="ComponentProps, ReactNode" from="react" />
        <import name="createContext, useContext, useState" from="react" />
        <import name="Button" from="@/components/ui/button" />
        <import name="Collapsible, CollapsibleContent, CollapsibleTrigger" from="@/components/ui/collapsible" />
        <import name="Input" from="@/components/ui/input" />
        <import name="Tooltip, TooltipContent, TooltipProvider, TooltipTrigger" from="@/components/ui/tooltip" />
        <import name="ChatSDKError" from="@/lib/errors" />
        <import name="cn" from="@/lib/utils" />
      </imports>
    </component>
    <component id="cmp_WebPreviewUrl" name="WebPreviewUrl" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/web-preview.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Uses: useWebPreview</description>
      <imports>
        <import name="ChevronDownIcon" from="lucide-react" />
        <import name="ComponentProps, ReactNode" from="react" />
        <import name="createContext, useContext, useState" from="react" />
        <import name="Button" from="@/components/ui/button" />
        <import name="Collapsible, CollapsibleContent, CollapsibleTrigger" from="@/components/ui/collapsible" />
        <import name="Input" from="@/components/ui/input" />
        <import name="Tooltip, TooltipContent, TooltipProvider, TooltipTrigger" from="@/components/ui/tooltip" />
        <import name="ChatSDKError" from="@/lib/errors" />
        <import name="cn" from="@/lib/utils" />
      </imports>
      <usesHooks>
        <hook name="useWebPreview" />
      </usesHooks>
    </component>
    <component id="cmp_WebPreviewBody" name="WebPreviewBody" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/web-preview.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Uses: useWebPreview</description>
      <imports>
        <import name="ChevronDownIcon" from="lucide-react" />
        <import name="ComponentProps, ReactNode" from="react" />
        <import name="createContext, useContext, useState" from="react" />
        <import name="Button" from="@/components/ui/button" />
        <import name="Collapsible, CollapsibleContent, CollapsibleTrigger" from="@/components/ui/collapsible" />
        <import name="Input" from="@/components/ui/input" />
        <import name="Tooltip, TooltipContent, TooltipProvider, TooltipTrigger" from="@/components/ui/tooltip" />
        <import name="ChatSDKError" from="@/lib/errors" />
        <import name="cn" from="@/lib/utils" />
      </imports>
      <usesHooks>
        <hook name="useWebPreview" />
      </usesHooks>
    </component>
    <component id="cmp_WebPreviewConsole" name="WebPreviewConsole" path="f:/Study/Code/git/nextjs-ai-chatbot/components/elements/web-preview.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Uses: useWebPreview</description>
      <imports>
        <import name="ChevronDownIcon" from="lucide-react" />
        <import name="ComponentProps, ReactNode" from="react" />
        <import name="createContext, useContext, useState" from="react" />
        <import name="Button" from="@/components/ui/button" />
        <import name="Collapsible, CollapsibleContent, CollapsibleTrigger" from="@/components/ui/collapsible" />
        <import name="Input" from="@/components/ui/input" />
        <import name="Tooltip, TooltipContent, TooltipProvider, TooltipTrigger" from="@/components/ui/tooltip" />
        <import name="ChatSDKError" from="@/lib/errors" />
        <import name="cn" from="@/lib/utils" />
      </imports>
      <usesHooks>
        <hook name="useWebPreview" />
      </usesHooks>
    </component>
    <component id="cmp_SettingsButton" name="SettingsButton" path="f:/Study/Code/git/nextjs-ai-chatbot/components/settings/settings-sheet.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Uses: useBoolean</description>
      <props>
        <prop name="className" type="any" required="true" />
      </props>
      <imports>
        <import name="Settings2Icon" from="lucide-react" />
        <import name="useBoolean" from="usehooks-ts" />
        <import name="Button" from="@/components/ui/button" />
        <import name="Input" from="@/components/ui/input" />
        <import name="Label" from="@/components/ui/label" />
        <import name="Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle" from="@/components/ui/sheet" />
        <import name="Textarea" from="@/components/ui/textarea" />
        <import name="AppSettings, useSettings, useSettingsSnapshot" from="@/lib/ui/settings-store" />
        <import name="cn" from="@/lib/utils" />
      </imports>
      <usesHooks>
        <hook name="useBoolean" />
      </usesHooks>
    </component>
    <component id="cmp_SettingsSheet" name="SettingsSheet" path="f:/Study/Code/git/nextjs-ai-chatbot/components/settings/settings-sheet.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Uses: useSettings, useSettingsSnapshot</description>
      <props>
        <prop name="open" type="any" required="true" />
        <prop name="onOpenChange" type="any" required="true" />
      </props>
      <imports>
        <import name="Settings2Icon" from="lucide-react" />
        <import name="useBoolean" from="usehooks-ts" />
        <import name="Button" from="@/components/ui/button" />
        <import name="Input" from="@/components/ui/input" />
        <import name="Label" from="@/components/ui/label" />
        <import name="Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle" from="@/components/ui/sheet" />
        <import name="Textarea" from="@/components/ui/textarea" />
        <import name="AppSettings, useSettings, useSettingsSnapshot" from="@/lib/ui/settings-store" />
        <import name="cn" from="@/lib/utils" />
      </imports>
      <usesHooks>
        <hook name="useSettings" />
        <hook name="useSettingsSnapshot" />
      </usesHooks>
    </component>
    <component id="cmp_SettingToggle" name="SettingToggle" path="f:/Study/Code/git/nextjs-ai-chatbot/components/settings/settings-sheet.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Stateless UI</description>
      <props>
        <prop name="checked" type="any" required="true" />
        <prop name="onCheckedChange" type="any" required="true" />
        <prop name="label" type="any" required="true" />
        <prop name="description" type="any" required="true" />
      </props>
      <imports>
        <import name="Settings2Icon" from="lucide-react" />
        <import name="useBoolean" from="usehooks-ts" />
        <import name="Button" from="@/components/ui/button" />
        <import name="Input" from="@/components/ui/input" />
        <import name="Label" from="@/components/ui/label" />
        <import name="Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle" from="@/components/ui/sheet" />
        <import name="Textarea" from="@/components/ui/textarea" />
        <import name="AppSettings, useSettings, useSettingsSnapshot" from="@/lib/ui/settings-store" />
        <import name="cn" from="@/lib/utils" />
      </imports>
    </component>
    <component id="cmp_AlertDialogHeader" name="AlertDialogHeader" path="f:/Study/Code/git/nextjs-ai-chatbot/components/ui/alert-dialog.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="" from="react" />
        <import name="AlertDialog" from="radix-ui" />
        <import name="cn" from="@/lib/utils" />
        <import name="buttonVariants" from="@/components/ui/button" />
      </imports>
    </component>
    <component id="cmp_AlertDialogFooter" name="AlertDialogFooter" path="f:/Study/Code/git/nextjs-ai-chatbot/components/ui/alert-dialog.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="" from="react" />
        <import name="AlertDialog" from="radix-ui" />
        <import name="cn" from="@/lib/utils" />
        <import name="buttonVariants" from="@/components/ui/button" />
      </imports>
    </component>
    <component id="cmp_Badge" name="Badge" path="f:/Study/Code/git/nextjs-ai-chatbot/components/ui/badge.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
      <props>
        <prop name="className" type="any" required="true" />
        <prop name="variant" type="any" required="true" />
        <prop name="...props" type="any" required="true" />
      </props>
      <imports>
        <import name="" from="react" />
        <import name="cva, VariantProps" from="class-variance-authority" />
        <import name="cn" from="@/lib/utils" />
      </imports>
    </component>
    <component id="cmp_DropdownMenuShortcut" name="DropdownMenuShortcut" path="f:/Study/Code/git/nextjs-ai-chatbot/components/ui/dropdown-menu.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="" from="react" />
        <import name="DropdownMenu" from="radix-ui" />
        <import name="Check, ChevronRight, Circle" from="lucide-react" />
        <import name="cn" from="@/lib/utils" />
      </imports>
    </component>
    <component id="cmp_SheetHeader" name="SheetHeader" path="f:/Study/Code/git/nextjs-ai-chatbot/components/ui/sheet.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="" from="react" />
        <import name="Dialog" from="radix-ui" />
        <import name="cva, VariantProps" from="class-variance-authority" />
        <import name="X" from="lucide-react" />
        <import name="cn" from="@/lib/utils" />
      </imports>
    </component>
    <component id="cmp_SheetFooter" name="SheetFooter" path="f:/Study/Code/git/nextjs-ai-chatbot/components/ui/sheet.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="" from="react" />
        <import name="Dialog" from="radix-ui" />
        <import name="cva, VariantProps" from="class-variance-authority" />
        <import name="X" from="lucide-react" />
        <import name="cn" from="@/lib/utils" />
      </imports>
    </component>
    <component id="cmp_Skeleton" name="Skeleton" path="f:/Study/Code/git/nextjs-ai-chatbot/components/ui/skeleton.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
      <props>
        <prop name="className" type="any" required="true" />
        <prop name="...props" type="any" required="true" />
      </props>
      <imports>
        <import name="cn" from="@/lib/utils" />
      </imports>
    </component>
    <component id="cmp_SettingsProvider" name="SettingsProvider" path="f:/Study/Code/git/nextjs-ai-chatbot/lib/ui/settings-store.tsx" kind="ui" isClient="true">
      <description>[Skeleton] Uses: useLocalStorage, useMemo</description>
      <props>
        <prop name="children" type="any" required="true" />
      </props>
      <imports>
        <import name="createContext, ReactNode, useContext, useMemo" from="react" />
        <import name="useLocalStorage" from="usehooks-ts" />
        <import name="ChatSDKError" from="@/lib/errors" />
        <import name="AppSettings" from="@/lib/settings/types" />
      </imports>
      <usesHooks>
        <hook name="useLocalStorage" />
        <hook name="useMemo" />
      </usesHooks>
    </component>
    <component id="cmp_Page" name="Page" path="f:/Study/Code/git/nextjs-ai-chatbot/app/(auth)/login/page.tsx" kind="ui" isClient="true">
      <description>[Skeleton] State: { email, isSuccessful } | Uses: useRouter</description>
      <imports>
        <import name="Link" from="next/link" />
        <import name="useRouter" from="next/navigation" />
        <import name="useState" from="react" />
        <import name="AuthForm" from="@/components/auth-form" />
        <import name="SubmitButton" from="@/components/submit-button" />
        <import name="toast" from="@/components/toast" />
        <import name="getSupabaseBrowserClient" from="@/lib/auth/client" />
      </imports>
      <usesHooks>
        <hook name="useRouter" />
      </usesHooks>
    </component>
    <component id="cmp_Page" name="Page" path="f:/Study/Code/git/nextjs-ai-chatbot/app/(auth)/register/page.tsx" kind="ui" isClient="true">
      <description>[Skeleton] State: { email, isSuccessful } | Uses: useRouter</description>
      <imports>
        <import name="Link" from="next/link" />
        <import name="useRouter" from="next/navigation" />
        <import name="useState" from="react" />
        <import name="AuthForm" from="@/components/auth-form" />
        <import name="SubmitButton" from="@/components/submit-button" />
        <import name="toast" from="@/components/toast" />
        <import name="getSupabaseBrowserClient" from="@/lib/auth/client" />
      </imports>
      <usesHooks>
        <hook name="useRouter" />
      </usesHooks>
    </component>
    <component id="cmp_POST" name="POST" path="f:/Study/Code/git/nextjs-ai-chatbot/app/(chat)/api/chat/route.ts" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="geolocation" from="@vercel/functions" />
        <import name="createUIMessageStream, JsonToSseTransformStream, UIMessage" from="ai" />
        <import name="unstable_cache" from="next/cache" />
        <import name="ModelCatalog" from="tokenlens/core" />
        <import name="VisibilityType" from="@/components/visibility-selector" />
        <import name="executeChatCompletion" from="@/lib/ai/chat-completion" />
        <import name="entitlementsByUserType" from="@/lib/ai/entitlements" />
        <import name="isValidModelId" from="@/lib/ai/model-registry" />
        <import name="RequestHints" from="@/lib/ai/prompts" />
        <import name="generatePlaceholderTitle, generateTitleFromUserMessage" from="@/lib/ai/title-generation" />
        <import name="AppUserType" from="@/lib/auth/session" />
        <import name="getAppSession" from="@/lib/auth/session" />
        <import name="getUserMessageCount" from="@/lib/cache/quota" />
        <import name="isRedisAvailable" from="@/lib/cache/redis" />
        <import name="createContext" from="@/lib/data/base" />
        <import name="chatData" from="@/lib/data/chat" />
        <import name="saveChat, updateChatTitle" from="@/lib/data/chat-operations" />
        <import name="ChatSDKError" from="@/lib/errors" />
        <import name="logError, logInfo, logWarn" from="@/lib/log" />
        <import name="AppUsage" from="@/lib/usage" />
        <import name="convertToUIMessages, generateUUID" from="@/lib/utils" />
        <import name="PostRequestBody, postRequestBodySchema" from="./schema" />
      </imports>
    </component>
    <component id="cmp_Loading" name="Loading" path="f:/Study/Code/git/nextjs-ai-chatbot/app/(chat)/chat/[id]/loading.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
    </component>
    <component id="cmp_Page" name="Page" path="f:/Study/Code/git/nextjs-ai-chatbot/app/(chat)/chat/[id]/page.tsx" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="redirect" from="next/navigation" />
        <import name="Chat" from="@/components/chat" />
        <import name="DataStreamHandler" from="@/components/data-stream-handler" />
        <import name="listChatModels" from="@/lib/ai/model-registry" />
        <import name="DEFAULT_CHAT_MODEL" from="@/lib/ai/models" />
        <import name="getAppSession" from="@/lib/auth/session" />
        <import name="ChatWithMessages, createContext" from="@/lib/data/base" />
        <import name="chatData" from="@/lib/data/chat" />
        <import name="getVotesByChatIdAndUserId" from="@/lib/db/queries" />
        <import name="Vote" from="@/lib/db/schema" />
        <import name="convertToUIMessages" from="@/lib/utils" />
      </imports>
    </component>
    <component id="cmp_GET" name="GET" path="f:/Study/Code/git/nextjs-ai-chatbot/app/(chat)/api/chat/[id]/stream/route.ts" kind="ui" isClient="false">
      <description>[Skeleton] Stateless UI</description>
      <imports>
        <import name="createUIMessageStream, JsonToSseTransformStream" from="ai" />
        <import name="differenceInSeconds" from="date-fns" />
        <import name="getAppSession" from="@/lib/auth/session" />
        <import name="createContext" from="@/lib/data/base" />
        <import name="chatData" from="@/lib/data/chat" />
        <import name="ChatSDKError" from="@/lib/errors" />
        <import name="ChatMessage" from="@/lib/types" />
      </imports>
    </component>
  </components>

  <hooks>

  </hooks>

  <dependencies>
    <lib name="@ai-sdk/gateway" version="^1.0.15" role="dependency" />
    <lib name="@ai-sdk/google" version="^2.0.24" role="dependency" />
    <lib name="@ai-sdk/openai" version="^2.0.54" role="dependency" />
    <lib name="@ai-sdk/provider" version="2.0.0" role="dependency" />
    <lib name="@ai-sdk/react" version="2.0.26" role="dependency" />
    <lib name="@ai-sdk/xai" version="2.0.13" role="dependency" />
    <lib name="@codemirror/lang-javascript" version="^6.2.2" role="dependency" />
    <lib name="@codemirror/lang-python" version="^6.1.6" role="dependency" />
    <lib name="@codemirror/state" version="^6.5.0" role="dependency" />
    <lib name="@codemirror/theme-one-dark" version="^6.1.2" role="dependency" />
    <lib name="@codemirror/view" version="^6.35.3" role="dependency" />
    <lib name="@icons-pack/react-simple-icons" version="^13.7.0" role="dependency" />
    <lib name="@openrouter/ai-sdk-provider" version="^1.2.0" role="dependency" />
    <lib name="@opentelemetry/api" version="^1.9.0" role="dependency" />
    <lib name="@opentelemetry/api-logs" version="^0.200.0" role="dependency" />
    <lib name="@radix-ui/react-icons" version="^1.3.0" role="dependency" />
    <lib name="@radix-ui/react-select" version="^2.2.6" role="dependency" />
    <lib name="@radix-ui/react-use-controllable-state" version="^1.2.2" role="dependency" />
    <lib name="@radix-ui/react-visually-hidden" version="^1.1.0" role="dependency" />
    <lib name="@sentry/nextjs" version="^10.29.0" role="dependency" />
    <lib name="@supabase/ssr" version="^0.7.0" role="dependency" />
    <lib name="@supabase/supabase-js" version="^2.49.1" role="dependency" />
    <lib name="@tiptap/core" version="3.9.0" role="dependency" />
    <lib name="@tiptap/extension-mathematics" version="3.9.0" role="dependency" />
    <lib name="@tiptap/extension-table" version="3.9.0" role="dependency" />
    <lib name="@tiptap/extension-table-cell" version="3.9.0" role="dependency" />
    <lib name="@tiptap/extension-table-header" version="3.9.0" role="dependency" />
    <lib name="@tiptap/extension-table-row" version="3.9.0" role="dependency" />
    <lib name="@tiptap/markdown" version="^3.9.0" role="dependency" />
    <lib name="@tiptap/pm" version="^3.9.0" role="dependency" />
    <lib name="@tiptap/react" version="^3.9.0" role="dependency" />
    <lib name="@tiptap/starter-kit" version="^3.9.0" role="dependency" />
    <lib name="@upstash/redis" version="^1.35.6" role="dependency" />
    <lib name="@vercel/analytics" version="^1.3.1" role="dependency" />
    <lib name="@vercel/blob" version="^0.24.1" role="dependency" />
    <lib name="@vercel/functions" version="^2.0.0" role="dependency" />
    <lib name="@vercel/otel" version="^1.12.0" role="dependency" />
    <lib name="@vercel/postgres" version="^0.10.0" role="dependency" />
    <lib name="@vercel/speed-insights" version="^1.2.0" role="dependency" />
    <lib name="ai" version="5.0.26" role="dependency" />
    <lib name="ai-gateway-provider" version="^2.0.1" role="dependency" />
    <lib name="babel-plugin-react-compiler" version="^1.0.0" role="dependency" />
    <lib name="class-variance-authority" version="^0.7.1" role="dependency" />
    <lib name="classnames" version="^2.5.1" role="dependency" />
    <lib name="clsx" version="^2.1.1" role="dependency" />
    <lib name="codemirror" version="^6.0.1" role="dependency" />
    <lib name="date-fns" version="^4.1.0" role="dependency" />
    <lib name="diff-match-patch" version="^1.0.5" role="dependency" />
    <lib name="dotenv" version="^16.4.5" role="dependency" />
    <lib name="drizzle-orm" version="^0.34.0" role="dependency" />
    <lib name="embla-carousel-react" version="^8.6.0" role="dependency" />
    <lib name="fast-deep-equal" version="^3.1.3" role="dependency" />
    <lib name="framer-motion" version="^11.3.19" role="dependency" />
    <lib name="geist" version="^1.3.1" role="dependency" />
    <lib name="import-in-the-middle" version="^2.0.0" role="dependency" />
    <lib name="jose" version="^6.1.2" role="dependency" />
    <lib name="lucide-react" version="^0.446.0" role="dependency" />
    <lib name="nanoid" version="^5.0.8" role="dependency" />
    <lib name="next" version="16.0.7" role="dependency" />
    <lib name="next-themes" version="^0.3.0" role="dependency" />
    <lib name="orderedmap" version="^2.1.1" role="dependency" />
    <lib name="papaparse" version="^5.5.2" role="dependency" />
    <lib name="postgres" version="^3.4.4" role="dependency" />
    <lib name="radix-ui" version="^1.4.3" role="dependency" />
    <lib name="react" version="19.2.1" role="dependency" />
    <lib name="react-data-grid" version="7.0.0-beta.47" role="dependency" />
    <lib name="react-dom" version="19.2.1" role="dependency" />
    <lib name="react-resizable-panels" version="^2.1.7" role="dependency" />
    <lib name="react-syntax-highlighter" version="^15.6.6" role="dependency" />
    <lib name="refractor" version="4.8.1" role="dependency" />
    <lib name="rehype-katex" version="^7.0.1" role="dependency" />
    <lib name="remark-math" version="^6.0.0" role="dependency" />
    <lib name="require-in-the-middle" version="^8.0.1" role="dependency" />
    <lib name="resumable-stream" version="^2.0.0" role="dependency" />
    <lib name="server-only" version="^0.0.1" role="dependency" />
    <lib name="shiki" version="^3.12.2" role="dependency" />
    <lib name="sonner" version="^1.5.0" role="dependency" />
    <lib name="streamdown" version="^1.3.0" role="dependency" />
    <lib name="swr" version="^2.2.5" role="dependency" />
    <lib name="tailwind-merge" version="^2.5.2" role="dependency" />
    <lib name="tailwindcss-animate" version="^1.0.7" role="dependency" />
    <lib name="tokenlens" version="1.3.0" role="dependency" />
    <lib name="use-stick-to-bottom" version="^1.1.1" role="dependency" />
    <lib name="usehooks-ts" version="^3.1.0" role="dependency" />
    <lib name="workers-ai-provider" version="^2.0.0" role="dependency" />
    <lib name="zod" version="^3.25.76" role="dependency" />
    <lib name="@biomejs/biome" version="2.2.2" role="dependency" />
    <lib name="@google/genai" version="^1.27.0" role="dependency" />
    <lib name="@playwright/test" version="^1.50.1" role="dependency" />
    <lib name="@tailwindcss/postcss" version="^4.1.13" role="dependency" />
    <lib name="@tailwindcss/typography" version="^0.5.15" role="dependency" />
    <lib name="@types/d3-scale" version="^4.0.8" role="dependency" />
    <lib name="@types/node" version="^22.8.6" role="dependency" />
    <lib name="@types/papaparse" version="^5.3.15" role="dependency" />
    <lib name="@types/pdf-parse" version="^1.1.4" role="dependency" />
    <lib name="@types/react" version="19.2.7" role="dependency" />
    <lib name="@types/react-dom" version="19.2.3" role="dependency" />
    <lib name="@types/react-syntax-highlighter" version="^15.5.13" role="dependency" />
    <lib name="drizzle-kit" version="^0.25.0" role="dependency" />
    <lib name="postcss" version="^8" role="dependency" />
    <lib name="tailwindcss" version="^4.1.13" role="dependency" />
    <lib name="tsx" version="^4.19.1" role="dependency" />
    <lib name="typescript" version="^5.6.3" role="dependency" />
    <lib name="ultracite" version="5.3.9" role="dependency" />
  </dependencies>
</codebase>
```

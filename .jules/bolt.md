## 2024-05-23 - Broken Memoization Patterns
**Learning:** Several key components (`Messages`, `PreviewMessage`) had `React.memo` comparison functions that returned `false` by default, effectively disabling memoization and causing constant re-renders. Also found a bug where an array was compared to a number (`messages` vs `messages.length`) in `Artifact` component.
**Action:** When optimizing this codebase, always check `React.memo` comparison functions first. Ensure they return `true` (props equal) when all checks pass. Verify prop types in comparisons.

## 2024-05-22 - Inverted React.memo Logic
**Learning:** React.memo comparison functions should return `true` when props are equal (to skip render) and `false` when props are different (to re-render). A recurring anti-pattern was found where functions returned `false` by default at the end, causing the component to ALWAYS re-render even if all specific property checks passed (were equal).
**Action:** When using `React.memo`, always ensure the default return value is `true` (props are equal) unless a difference is explicitly found. Verify that "no change" results in `true`.

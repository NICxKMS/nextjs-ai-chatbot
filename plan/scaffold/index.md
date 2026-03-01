> **Updated per redesign audit (2026-03-01)**

# Scaffold

> Blueprint for the new project's directory structure, configuration, and shared types.
> These files define the **empty shell** that all feature implementations build upon.
> Uses `proxy.ts` (NOT middleware.ts), "artifact" naming throughout, `useSyncExternalStore`
> for artifact state, handler registry for dependency inversion, 125 tasks across 8 phases.

## Contents

| Document | Description |
|----------|-------------|
| [directory-structure.md](directory-structure.md) | Complete directory tree (~210 files) with proxy.ts, artifact naming, handler registry |
| [base-config.md](base-config.md) | Configuration files: Next.js, Biome, TypeScript, Tailwind, proxy.ts, env vars |
| [shared-types.md](shared-types.md) | Types: UIArtifact, ArtifactKind, ChatSessionValue, ActionResult, ArtifactHandler |

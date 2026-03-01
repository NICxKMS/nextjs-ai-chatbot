# UI Parity Analysis — Index

> **Updated per redesign audit (2026-03-01)**

> Generated from analysis of `oldapp/` source. Zero-regression reference for rebuild.

## Documents

| File | Scope |
|------|-------|
| [screens.md](screens.md) | Every route, layout, page — loading/error/auth states |
| [components-01.md](components-01.md) | Components A–M: app-sidebar through multimodal-input |
| [components-02.md](components-02.md) | Components N–Z: preview-attachment through weather |
| [interactions.md](interactions.md) | All user interaction flows |
| [ai-elements-manifest.md](ai-elements-manifest.md) | Complete manifest of 31 AI element primitives |
| [accessibility.md](accessibility.md) | ARIA, keyboard nav, focus management patterns |

## Key Metrics

- **Routes:** 5 distinct pages (home chat, chat/[id], login, register, global-error)
- **Layout Layers:** 3 (root → chat group → chat page)
- **Components:** 48 component files + 22 UI primitives + 31 AI elements + 1 settings module
- **Hooks:** 7 custom hooks
- **Editors:** 4 artifact editors (text, code, image, sheet)

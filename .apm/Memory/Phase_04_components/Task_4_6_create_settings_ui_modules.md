# Task 4.6 - Create Settings & UI Modules

**Status:** Not Started
**Agent:** Agent_Components
**Started:** 
**Completed:** 

---

## Objective

Settings types/defaults and UI state atoms.

## Output

`lib/settings/`, `lib/ui/`.

## Dependencies

- Task 1.1 Output (by Agent_Infrastructure)

---

## Task Checklist

- [ ] Study `archive/oldapp/lib/settings/` for existing settings patterns
- [ ] Analyze `archive/oldapp/lib/motion.tsx` for Framer Motion utilities
- [ ] Analyze `archive/oldapp/lib/ui/` (if exists) for UI state patterns
- [ ] Create `lib/settings/types.ts` with SamplingSettings, SystemPromptSettings, ModelSettings
- [ ] Create `lib/settings/defaults.ts` with DEFAULT_SETTINGS
- [ ] Create `lib/ui/constants.ts` with breakpoints, animation, sizing, z-index
- [ ] Create `lib/ui/state.ts` with Jotai atoms (settingsAtom, sidebarOpenAtom, themeAtom)
- [ ] Create `lib/ui/settings-context.tsx` with SettingsProvider and useSettings
- [ ] Create `lib/motion.tsx` with Framer Motion animation utilities

---

## Notes


---

## Issues Encountered


---

## Files Modified/Created
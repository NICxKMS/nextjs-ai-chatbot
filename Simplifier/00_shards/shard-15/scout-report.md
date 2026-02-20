# Scout Report - Shard 15: components/ui/**

## Metrics Summary

| Files in shard          | 27 |
| Total LOC               | 3412 |
| Exports catalogued      | 111 |
| Cross-shard edges found | 6 |
| Issues flagged          | 8 |
| Critical complexity (>10)| 0 |

---

## File-by-File Inventory

### 1. index.ts
| Property | Value |
|----------|-------|
| Path | components/ui/index.ts |
| LOC | 206 |
| Classification | Entry point (barrel export) |
| Cyclomatic Complexity | 1 |

**Exports:** Alert, AlertDescription, AlertProps, AlertTitle, AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, Avatar, AvatarFallback, AvatarImage, Badge, BadgeProps, badgeVariants, Button, ButtonProps, buttonVariants, Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Carousel, CarouselApi, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, Collapsible, CollapsibleContent, CollapsibleTrigger, Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut, Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogOverlay, DialogPortal, DialogTitle, DialogTrigger, DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuPortal, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger, HoverCard, HoverCardContent, HoverCardTrigger, Input, InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea, Label, Progress, ScrollArea, ScrollBar, Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectScrollDownButton, SelectScrollUpButton, SelectSeparator, SelectTrigger, SelectValue, Separator, Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetOverlay, SheetPortal, SheetTitle, SheetTrigger, Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupAction, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInput, SidebarInset, SidebarMenu, SidebarMenuAction, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, SidebarMenuSkeleton, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem, SidebarProvider, SidebarRail, SidebarSeparator, SidebarTrigger, Skeleton, Slider, Switch, Textarea, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, useSidebar

---

### 2. button.tsx
| Property | Value |
|----------|-------|
| Path | components/ui/button.tsx |
| LOC | 79 |
| Classification | Presentational component |
| Cyclomatic Complexity | 2 |

**Imports:**
- `@radix-ui/react-slot` (external) - Slot
- `class-variance-authority` (external) - cva, VariantProps
- `react` (external) - ButtonHTMLAttributes, forwardRef
- `@/lib/utils` (cross-shard) - cn

**Exports:** Button, ButtonProps, buttonVariants

---

### 3. input.tsx
| Property | Value |
|----------|-------|
| Path | components/ui/input.tsx |
| LOC | 38 |
| Classification | Presentational component |
| Cyclomatic Complexity | 1 |

**Imports:**
- `react` (external) - forwardRef, InputHTMLAttributes
- `@/lib/utils` (cross-shard) - cn

**Exports:** Input, InputProps

---

### 4. textarea.tsx
| Property | Value |
|----------|-------|
| Path | components/ui/textarea.tsx |
| LOC | 38 |
| Classification | Presentational component |
| Cyclomatic Complexity | 1 |

**Imports:**
- `react` (external) - forwardRef, TextareaHTMLAttributes
- `@/lib/utils` (cross-shard) - cn

**Exports:** Textarea, TextareaProps

---

### 5. dialog.tsx
| Property | Value |
|----------|-------|
| Path | components/ui/dialog.tsx |
| LOC | 152 |
| Classification | Presentational component |
| Cyclomatic Complexity | 1 |

**Imports:**
- `@radix-ui/react-dialog` (external) - DialogPrimitive
- `lucide-react` (external) - X
- `react` (external) - ComponentPropsWithoutRef, ElementRef, forwardRef
- `@/lib/utils` (cross-shard) - cn

**Exports:** Dialog, DialogPortal, DialogOverlay, DialogClose, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription

---

### 6. alert-dialog.tsx
| Property | Value |
|----------|-------|
| Path | components/ui/alert-dialog.tsx |
| LOC | 149 |
| Classification | Presentational component |
| Cyclomatic Complexity | 1 |

**Imports:**
- `@radix-ui/react-alert-dialog` (external) - AlertDialogPrimitive
- `react` (external) - React (namespace import)
- `@/components/ui/button` (intra-shard) - buttonVariants
- `@/lib/utils` (cross-shard) - cn

**Exports:** AlertDialog, AlertDialogPortal, AlertDialogOverlay, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel

---

### 7. sheet.tsx
| Property | Value |
|----------|-------|
| Path | components/ui/sheet.tsx |
| LOC | 151 |
| Classification | Presentational component |
| Cyclomatic Complexity | 2 |

**Imports:**
- `class-variance-authority` (external) - cva, VariantProps
- `lucide-react` (external) - X
- `radix-ui` (external) - Dialog as SheetPrimitive
- `react` (external) - ComponentPropsWithoutRef, ElementRef, forwardRef, HTMLAttributes
- `@/lib/utils` (cross-shard) - cn

**Exports:** Sheet, SheetPortal, SheetOverlay, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription

---

### 8. dropdown-menu.tsx
| Property | Value |
|----------|-------|
| Path | components/ui/dropdown-menu.tsx |
| LOC | 216 |
| Classification | Presentational component |
| Cyclomatic Complexity | 1 |

**Imports:**
- `lucide-react` (external) - Check, ChevronRight, Circle
- `radix-ui` (external) - DropdownMenu as DropdownMenuPrimitive
- `react` (external) - ComponentPropsWithoutRef, ElementRef, forwardRef, HTMLAttributes
- `@/lib/utils` (cross-shard) - cn

**Exports:** DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuCheckboxItem, DropdownMenuRadioItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuGroup, DropdownMenuPortal, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuRadioGroup

---

### 9. select.tsx
| Property | Value |
|----------|-------|
| Path | components/ui/select.tsx |
| LOC | 193 |
| Classification | Presentational component |
| Cyclomatic Complexity | 2 |

**Imports:**
- `lucide-react` (external) - Check, ChevronDown, ChevronUp
- `radix-ui` (external) - Select as SelectPrimitive
- `react` (external) - ComponentPropsWithoutRef, ElementRef, forwardRef
- `@/lib/utils` (cross-shard) - cn

**Exports:** Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectLabel, SelectItem, SelectSeparator, SelectScrollUpButton, SelectScrollDownButton

---

### 10. command.tsx
| Property | Value |
|----------|-------|
| Path | components/ui/command.tsx |
| LOC | 199 |
| Classification | Presentational component |
| Cyclomatic Complexity | 1 |

**Imports:**
- `@radix-ui/react-dialog` (external) - DialogProps
- `cmdk` (external) - Command as CommandPrimitive
- `lucide-react` (external) - Search
- `react` (external) - ComponentPropsWithoutRef, ElementRef, forwardRef, HTMLAttributes
- `@/lib/utils` (cross-shard) - cn
- `./dialog` (intra-shard) - Dialog, DialogContent

**Exports:** Command, CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandShortcut, CommandSeparator

---

### 11. sidebar.tsx (LARGEST FILE)
| Property | Value |
|----------|-------|
| Path | components/ui/sidebar.tsx |
| LOC | 828 |
| Classification | Presentational component (complex) |
| Cyclomatic Complexity | 8 |

**Imports:**
- `@radix-ui/react-slot` (external) - Slot
- `class-variance-authority` (external) - cva, VariantProps
- `lucide-react` (external) - PanelLeft
- `react` (external) - ComponentProps, CSSProperties, createContext, ElementRef, forwardRef, useCallback, useContext, useEffect, useMemo, useState
- `@/components/ui/button` (intra-shard) - Button
- `@/components/ui/input` (intra-shard) - Input
- `@/components/ui/separator` (intra-shard) - Separator
- `@/components/ui/sheet` (intra-shard) - Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle
- `@/components/ui/skeleton` (intra-shard) - Skeleton
- `@/components/ui/tooltip` (intra-shard) - Tooltip, TooltipContent, TooltipTrigger
- `@/hooks/use-mobile` (cross-shard) - useIsMobile
- `@/lib/errors` (cross-shard) - ValidationError
- `@/lib/utils` (cross-shard) - cn

**Exports:** Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupAction, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInput, SidebarInset, SidebarMenu, SidebarMenuAction, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, SidebarMenuSkeleton, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem, SidebarProvider, SidebarRail, SidebarSeparator, SidebarTrigger, useSidebar

---

### 12. scroll-area.tsx
| Property | Value |
|----------|-------|
| Path | components/ui/scroll-area.tsx |
| LOC | 66 |
| Classification | Presentational component |
| Cyclomatic Complexity | 2 |

**Imports:**
- `radix-ui` (external) - ScrollArea as ScrollAreaPrimitive
- `react` (external) - ComponentPropsWithoutRef, ElementRef, forwardRef
- `@/lib/utils` (cross-shard) - cn

**Exports:** ScrollArea, ScrollBar

---

### 13. separator.tsx
| Property | Value |
|----------|-------|
| Path | components/ui/separator.tsx |
| LOC | 44 |
| Classification | Presentational component |
| Cyclomatic Complexity | 2 |

**Imports:**
- `react` (external) - forwardRef, HTMLAttributes
- `@/lib/utils` (cross-shard) - cn

**Exports:** Separator, SeparatorProps

---

### 14. card.tsx
| Property | Value |
|----------|-------|
| Path | components/ui/card.tsx |
| LOC | 122 |
| Classification | Presentational component |
| Cyclomatic Complexity | 1 |

**Imports:**
- `react` (external) - forwardRef, HTMLAttributes
- `@/lib/utils` (cross-shard) - cn

**Exports:** Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, CardAction

---

### 15. badge.tsx
| Property | Value |
|----------|-------|
| Path | components/ui/badge.tsx |
| LOC | 50 |
| Classification | Presentational component |
| Cyclomatic Complexity | 1 |

**Imports:**
- `class-variance-authority` (external) - cva, VariantProps
- `react` (external) - HTMLAttributes
- `@/lib/utils` (cross-shard) - cn

**Exports:** Badge, BadgeProps, badgeVariants

---

### 16. avatar.tsx
| Property | Value |
|----------|-------|
| Path | components/ui/avatar.tsx |
| LOC | 71 |
| Classification | Presentational component |
| Cyclomatic Complexity | 1 |

**Imports:**
- `radix-ui` (external) - Avatar as AvatarPrimitive
- `react` (external) - ComponentPropsWithoutRef, ElementRef, forwardRef
- `@/lib/utils` (cross-shard) - cn

**Exports:** Avatar, AvatarImage, AvatarFallback

---

### 17. tooltip.tsx
| Property | Value |
|----------|-------|
| Path | components/ui/tooltip.tsx |
| LOC | 52 |
| Classification | Presentational component |
| Cyclomatic Complexity | 1 |

**Imports:**
- `radix-ui` (external) - Tooltip as TooltipPrimitive
- `react` (external) - ComponentPropsWithoutRef, ElementRef, forwardRef
- `@/lib/utils` (cross-shard) - cn

**Exports:** Tooltip, TooltipTrigger, TooltipContent, TooltipProvider

---

### 18. hover-card.tsx
| Property | Value |
|----------|-------|
| Path | components/ui/hover-card.tsx |
| LOC | 44 |
| Classification | Presentational component |
| Cyclomatic Complexity | 1 |

**Imports:**
- `radix-ui` (external) - HoverCard as HoverCardPrimitive
- `react` (external) - ComponentPropsWithoutRef, ElementRef, forwardRef
- `@/lib/utils` (cross-shard) - cn

**Exports:** HoverCard, HoverCardTrigger, HoverCardContent

---

### 19. skeleton.tsx
| Property | Value |
|----------|-------|
| Path | components/ui/skeleton.tsx |
| LOC | 24 |
| Classification | Presentational component |
| Cyclomatic Complexity | 1 |

**Imports:**
- `react` (external) - forwardRef, HTMLAttributes
- `@/lib/utils` (cross-shard) - cn

**Exports:** Skeleton

---

### 20. progress.tsx
| Property | Value |
|----------|-------|
| Path | components/ui/progress.tsx |
| LOC | 43 |
| Classification | Presentational component |
| Cyclomatic Complexity | 1 |

**Imports:**
- `radix-ui` (external) - Progress as ProgressPrimitive
- `react` (external) - ComponentPropsWithoutRef, ElementRef, forwardRef
- `@/lib/utils` (cross-shard) - cn

**Exports:** Progress

---

### 21. slider.tsx
| Property | Value |
|----------|-------|
| Path | components/ui/slider.tsx |
| LOC | 33 |
| Classification | Presentational component |
| Cyclomatic Complexity | 1 |

**Imports:**
- `react` (external) - ComponentPropsWithoutRef, forwardRef
- `@/lib/utils` (cross-shard) - cn

**Exports:** Slider

---

### 22. switch.tsx
| Property | Value |
|----------|-------|
| Path | components/ui/switch.tsx |
| LOC | 33 |
| Classification | Presentational component |
| Cyclomatic Complexity | 1 |

**Imports:**
- `react` (external) - ComponentPropsWithoutRef, forwardRef
- `@/lib/utils` (cross-shard) - cn

**Exports:** Switch

---

### 23. collapsible.tsx
| Property | Value |
|----------|-------|
| Path | components/ui/collapsible.tsx |
| LOC | 45 |
| Classification | Presentational component |
| Cyclomatic Complexity | 1 |

**Imports:**
- `radix-ui` (external) - Collapsible as CollapsiblePrimitive
- `react` (external) - ComponentPropsWithoutRef, ElementRef, forwardRef
- `@/lib/utils` (cross-shard) - cn

**Exports:** Collapsible, CollapsibleTrigger, CollapsibleContent

---

### 24. carousel.tsx
| Property | Value |
|----------|-------|
| Path | components/ui/carousel.tsx |
| LOC | 305 |
| Classification | Presentational component (complex) |
| Cyclomatic Complexity | 5 |

**Imports:**
- `embla-carousel-react` (external) - useEmblaCarousel, UseEmblaCarouselType
- `lucide-react` (external) - ArrowLeft, ArrowRight
- `react` (external) - ComponentProps, createContext, forwardRef, HTMLAttributes, KeyboardEvent, useCallback, useContext, useEffect, useState
- `@/lib/errors` (cross-shard) - ValidationError
- `@/lib/utils` (cross-shard) - cn
- `./button` (intra-shard) - Button

**Exports:** CarouselApi, Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext

---

### 25. label.tsx
| Property | Value |
|----------|-------|
| Path | components/ui/label.tsx |
| LOC | 30 |
| Classification | Presentational component |
| Cyclomatic Complexity | 1 |

**Imports:**
- `class-variance-authority` (external) - cva, VariantProps
- `radix-ui` (external) - Label as LabelPrimitive
- `react` (external) - ComponentPropsWithoutRef, ElementRef, forwardRef
- `@/lib/utils` (cross-shard) - cn

**Exports:** Label

---

### 26. alert.tsx
| Property | Value |
|----------|-------|
| Path | components/ui/alert.tsx |
| LOC | 86 |
| Classification | Presentational component |
| Cyclomatic Complexity | 1 |

**Imports:**
- `class-variance-authority` (external) - cva, VariantProps
- `react` (external) - HTMLAttributes
- `@/lib/utils` (cross-shard) - cn

**Exports:** Alert, AlertTitle, AlertDescription, AlertProps

---

### 27. input-group.tsx
| Property | Value |
|----------|-------|
| Path | components/ui/input-group.tsx |
| LOC | 116 |
| Classification | Presentational component |
| Cyclomatic Complexity | 5 |

**Imports:**
- `react` (external) - ButtonHTMLAttributes, forwardRef, HTMLAttributes, TextareaHTMLAttributes
- `@/lib/utils` (cross-shard) - cn

**Exports:** InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea

---

## Cross-Shard Dependency Edges

| Source File | Target Module | Type |
|-------------|---------------|------|
| sidebar.tsx | @/hooks/use-mobile | Hook import |
| sidebar.tsx | @/lib/errors | Error class import |
| sidebar.tsx | @/lib/utils | Utility import |
| carousel.tsx | @/lib/errors | Error class import |
| carousel.tsx | @/lib/utils | Utility import |
| All 27 files | @/lib/utils | Utility import (cn function) |

---

## Intra-Shard Dependency Edges

| Source File | Target Module | Exports Used |
|-------------|---------------|--------------|
| alert-dialog.tsx | ./button | buttonVariants |
| command.tsx | ./dialog | Dialog, DialogContent |
| sidebar.tsx | ./button | Button |
| sidebar.tsx | ./input | Input |
| sidebar.tsx | ./separator | Separator |
| sidebar.tsx | ./sheet | Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle |
| sidebar.tsx | ./skeleton | Skeleton |
| sidebar.tsx | ./tooltip | Tooltip, TooltipContent, TooltipTrigger |
| carousel.tsx | ./button | Button |

---

## Pattern Flags

### 1. ⚠️ DUPLICATE CODE: Header/Footer Pattern
**Files:** dialog.tsx, alert-dialog.tsx, sheet.tsx  
**Lines:** 
- dialog.tsx:77-89 (DialogHeader), 94-106 (DialogFooter)
- alert-dialog.tsx:56-68 (AlertDialogHeader), 70-82 (AlertDialogFooter)
- sheet.tsx:88-100 (SheetHeader), 102-114 (SheetFooter)

**Issue:** Nearly identical header/footer components across three dialog-like components. Same pattern: `flex flex-col space-y-* text-center sm:text-left` for header, `flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2` for footer.

---

### 2. ⚠️ DUPLICATE CODE: Content Wrapper Pattern
**Files:** dialog.tsx, alert-dialog.tsx, sheet.tsx  
**Lines:**
- dialog.tsx:50-72 (DialogContent)
- alert-dialog.tsx:38-54 (AlertDialogContent)
- sheet.tsx:67-86 (SheetContent)

**Issue:** Similar portal/overlay/content structure with close button rendering.

---

### 3. ⚠️ DUPLICATE CODE: Item Indicator Pattern
**Files:** dropdown-menu.tsx, select.tsx  
**Lines:**
- dropdown-menu.tsx:121-125 (CheckboxItem indicator), 144-148 (RadioItem indicator)
- select.tsx:156-160 (SelectItem indicator)

**Issue:** Same pattern for rendering check/radio indicators with `<span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">`.

---

### 4. ⚠️ REDUNDANT TYPE: InputGroupButton vs Button
**Files:** input-group.tsx:61-95  
**Issue:** InputGroupButton re-implements button variant styling manually instead of using buttonVariants from button.tsx. This creates duplicate style definitions and potential inconsistency.

---

### 5. ⚠️ LARGE FILE: sidebar.tsx (828 LOC)
**File:** sidebar.tsx  
**Issue:** Single file exports 26 components and a hook. Consider splitting into:
- sidebar-context.tsx (context + hook)
- sidebar-provider.tsx
- sidebar-layout.tsx (Sidebar, SidebarInset)
- sidebar-menu.tsx (menu-related components)
- sidebar-actions.tsx (trigger, rail)

---

### 6. ⚠️ INCONSISTENT IMPORT STYLE
**Files:** alert-dialog.tsx:13, other files  
**Issue:** alert-dialog.tsx uses `import * as React from "react"` while other files use named imports like `import { forwardRef, ... } from "react"`.

---

### 7. ⚠️ MISSING RADIX PRIMITIVE: Slider & Switch
**Files:** slider.tsx, switch.tsx  
**Issue:** These components use native HTML `<input type="range">` and `<input type="checkbox">` instead of Radix UI primitives. This is inconsistent with other components that use Radix primitives for accessibility and state management. Other projects typically use @radix-ui/react-slider and @radix-ui/react-switch.

---

### 8. ⚠️ NAMING INCONSISTENCY: DisplayName Assignment
**Files:** Multiple  
**Issue:** Some files assign displayName via `Component.displayName = "Name"` while others use `Component.displayName = Primitive.displayName`. Both patterns are valid but inconsistent within the codebase.

---

## Component Pattern Consistency Analysis

All components follow the shadcn/ui pattern consistently:

1. **forwardRef pattern** - All interactive components use forwardRef for ref forwarding
2. **cn utility** - All components use the cn utility for class merging
3. **displayName** - All components set displayName for debugging
4. **TypeScript strict** - All components are properly typed
5. **JSDoc comments** - All components have module-level and component-level documentation

---

## Dead Code Candidates

**None identified.** All exported components are re-exported through index.ts barrel file, indicating intentional public API surface.

---

## Complexity Assessment

| File | Complexity | Status |
|------|------------|--------|
| sidebar.tsx | 8 | Acceptable |
| carousel.tsx | 5 | Acceptable |
| input-group.tsx | 5 | Acceptable |
| button.tsx | 2 | Low |
| sheet.tsx | 2 | Low |
| select.tsx | 2 | Low |
| scroll-area.tsx | 2 | Low |
| separator.tsx | 2 | Low |
| All others | 1 | Low |

**No files exceed cyclomatic complexity threshold of 10.**

---

## ⚠️ ESCALATION Items

1. **sidebar.tsx size (828 LOC)** - Consider architectural review for splitting. This is the largest file in the shard by significant margin (2.7x larger than next largest file carousel.tsx at 305 LOC).

2. **InputGroupButton duplicate styling** - Should be refactored to use buttonVariants from button.tsx to maintain consistency.

---

## ⚠️ SCOPE EXTENSION Items

**None.** All analysis remained within components/ui/** scope.

---

## Summary

The components/ui directory contains a standard shadcn/ui component library with 27 files and 3412 total LOC. The components are well-structured, properly typed, and follow consistent patterns. Key findings:

- **No critical complexity issues** - All files have complexity < 10
- **8 pattern flags identified** - Mostly minor duplication and inconsistency
- **6 cross-shard edges** - All to @/lib/utils, @/lib/errors, and @/hooks/use-mobile
- **1 large file** - sidebar.tsx at 828 LOC warrants consideration for splitting
- **1 redundant implementation** - InputGroupButton should use buttonVariants

The shard is well-maintained with clear separation between presentational components. The barrel export pattern (index.ts) provides a clean public API.

# Creator Interaction Primitives Audit

Scope: shadcn/Radix interaction primitives available to the Local Creator App.

The Creator UI should compose existing shadcn/Radix primitives instead of
hand-rolling interaction behavior. This audit proves the required primitives
exist and names how Creator currently uses or reserves them.

## Primitive Matrix

| Primitive | Source File | Radix Base | Creator Use |
| --- | --- | --- | --- |
| Alert Dialog | `app/src/components/ui/alert-dialog.tsx` | `@radix-ui/react-alert-dialog` | Used through `ConfirmActionDialog` for publish, reject, similar-request view, hide, archive, and clear settings. |
| Dialog | `app/src/components/ui/dialog.tsx` | `@radix-ui/react-dialog` | Available for non-danger modal flows. |
| Sheet | `app/src/components/ui/sheet.tsx` | `@radix-ui/react-dialog` | Available for responsive side panels and mobile detail surfaces. |
| Popover | `app/src/components/ui/popover.tsx` | `@radix-ui/react-popover` | Available for lightweight contextual controls. |
| Dropdown Menu | `app/src/components/ui/dropdown-menu.tsx` | `@radix-ui/react-dropdown-menu` | Available for compact command menus. |
| Select | `app/src/components/ui/select.tsx` | `@radix-ui/react-select` | Used by Creator filters, status selectors, work/branch choices, and settings. |
| Tabs | `app/src/components/ui/tabs.tsx` | `@radix-ui/react-tabs` | Available for tabbed Creator subviews when needed. |
| Scroll Area | `app/src/components/ui/scroll-area.tsx` | `@radix-ui/react-scroll-area` | Used by request queues and locked previews. |
| Tooltip | `app/src/components/ui/tooltip.tsx` | `@radix-ui/react-tooltip` | Available for icon-only controls and dense workbench hints. |

## Creator Rules

1. Dangerous or public-write actions must use `ConfirmActionDialog` or another
   AlertDialog-based confirmation.
2. New Creator menus, popovers, sheets, and tabs should import from
   `components/ui` and keep semantic token styling.
3. Do not create page-local floating div menus when a Radix primitive already
   exists.
4. Interactive primitives must keep accessible labels or screen-reader text.
5. If a new primitive is introduced, add it to this audit and to
   `scripts/check-creator-ui-contract.ts`.

# Huddle Design Direction

## Experience goal

Huddle should feel calm, quick, and collaborative: a focused workspace where a team can turn an unstructured conversation into an organized plan in seconds. The meeting-notes import is the signature interaction and should feel visibly alive without becoming theatrical.

## Design principles

1. **Work first.** Keep chrome quiet and give board content the visual weight.
2. **Obvious state.** Users should always know the active organization, board, connection state, and import progress.
3. **Fast feedback.** Mutations respond immediately, then reconcile clearly through real-time events.
4. **Friendly precision.** Use warm, direct language and disciplined spacing rather than decorative clutter.
5. **Accessible by default.** Keyboard, focus, contrast, reduced motion, and non-drag alternatives are part of the base design.

## Visual character

- Light-first interface with a soft neutral canvas and white elevated work surfaces.
- Ink-like dark text, restrained borders, and one distinctive violet/indigo brand accent.
- Status colors are muted and never carry meaning without labels or icons.
- Corners are moderately rounded, not pill-shaped everywhere.
- Shadows are subtle and reserved for menus, dialogs, lifted drag cards, and active overlays.
- Avoid gradients on routine UI. A restrained accent glow may appear in the import experience only.

## Typography

- Primary font: `Inter`, with a system sans-serif fallback.
- Use a compact scale with strong hierarchy:
  - Page title: 28–32 px, semibold
  - Section title: 18–20 px, semibold
  - Card title/body: 14 px
  - Metadata/labels: 12–13 px
- Body copy should use comfortable line height. Do not use all caps for long labels.

## Iconography

- Use Hugeicons Free with the Stroke Rounded style throughout the product.
- Render icons with `HugeiconsIcon` from `@hugeicons/react` and source them from `@hugeicons/core-free-icons`.
- Use a consistent 1.5 stroke width unless optical balance requires a small adjustment.
- Standard sizes: 16 px for compact controls, 20 px for regular actions, and 24 px for prominent or empty-state icons.
- Decorative icons should be hidden from assistive technology. Icon-only buttons must have an accessible label and tooltip.
- Do not mix Hugeicons with Lucide or another icon family.

## Color tokens

These are starting tokens and should be implemented as CSS variables compatible with shadcn/ui.

```css
:root {
  --background: 220 20% 97%;
  --foreground: 224 28% 14%;
  --card: 0 0% 100%;
  --card-foreground: 224 28% 14%;
  --primary: 252 75% 58%;
  --primary-foreground: 0 0% 100%;
  --secondary: 220 18% 94%;
  --secondary-foreground: 224 20% 24%;
  --muted: 220 16% 94%;
  --muted-foreground: 220 9% 44%;
  --border: 220 15% 88%;
  --ring: 252 75% 58%;
  --destructive: 0 72% 51%;
  --radius: 0.75rem;
}
```

Suggested status accents:

- Upcoming: slate
- In progress: amber
- Done: emerald
- AI/import activity: violet

## App shell

Desktop layout:

- A compact left sidebar contains the Huddle mark, organization switcher, primary navigation, and user menu.
- The main header contains breadcrumbs, board title, member avatars, connection indicator, and primary actions.
- The board fills the remaining viewport and scrolls horizontally when necessary.

Mobile/tablet layout:

- Collapse the sidebar into a sheet.
- Keep organization and board context in the top bar.
- Columns may snap-scroll horizontally, with one nearly full-width column visible at a time.
- Maintain a persistent, reachable create action.

## Core screens

### Authentication

- Centered, compact card with product promise and Google sign-in as the primary action.
- If email/password is included later, visually separate it with a clear divider.
- Explain errors inline and keep retry actions available.

### Organization setup

- One short form: organization name and optional description.
- Show a small preview of how the name appears in the workspace.
- Finish with a single clear action: `Create workspace`.

### Dashboard

- Lead with recently visited boards and the active organization.
- Let members create boards and navigate all boards available in the active organization.
- Seeded/demo boards should look intentional, not like placeholder cards.
- Empty state points directly to creating a board or importing sample notes.

### Board

- Default columns: `Upcoming`, `In progress`, and `Done`.
- These are starter columns, not fixed statuses. Users can add, rename, and reorder columns.
- Each column header shows name, item count, a compact add button, and a menu for rename, move, and delete actions.
- Provide a visible `Add column` control after the final column.
- Reordering columns and cards must work through drag-and-drop and keyboard-accessible menu actions.
- Deleting a non-empty column opens a confirmation dialog that requires choosing another column for its cards.
- Do not permit deletion when it would leave the board without a column.
- Cards show title first, then a short description preview and lightweight metadata.
- Use generous vertical gaps so cards remain scannable.
- During drag, raise and slightly rotate the active card only when reduced motion is not requested.
- Always offer a card menu or column selector as an alternative to drag-and-drop.

### Issue detail

- Use a wide dialog or right-side sheet on desktop; full-screen sheet on mobile.
- Prioritize title, description, column, and comments in that order.
- Save explicit field edits with clear progress/error feedback.
- The optional Claude mention experience belongs in the comment composer and must be removable without disrupting ordinary comments.

### Import from notes

- Primary board action label: `Import notes`.
- Open a large dialog with a labeled textarea, example placeholder, character count, and privacy note.
- Before submission, explain that actionable tasks will be created on the current board.
- Import button label: `Create tasks`.
- When submitted, keep the dialog open long enough to acknowledge processing, then show progress on the board.
- Cards enter individually about 300 ms apart with a subtle fade/slide.
- Announce new cards with an ARIA live region, but batch announcements to avoid noise.
- Show completion as a compact summary such as `6 tasks created` with an undo/review affordance only if supported by the backend.
- On failure, preserve the pasted notes so the user can retry.

## Motion

- Standard UI transitions: 120–180 ms.
- Dialog and sheet transitions: 180–240 ms.
- Imported card entrance: approximately 220 ms, staggered by server events.
- Never make users wait for a decorative animation.
- Respect `prefers-reduced-motion`; replace movement with opacity or instant state changes.

## Component foundations

Use shadcn/ui primitives for:

- Button, Input, Textarea, Label
- Dialog, Sheet, Dropdown Menu, Popover
- Avatar, Badge, Tooltip
- Alert, Toast/Sonner, Skeleton
- Tabs or Select where needed

Build project-specific components for:

- `AppShell`
- `OrganizationSwitcher`
- `BoardHeader`
- `BoardSwitcher`
- `KanbanColumn`
- `AddColumnButton`
- `ColumnMenu`
- `IssueCard`
- `IssueDetailSheet`
- `ImportNotesDialog`
- `ConnectionStatus`
- `MemberStack`

## Content style

- Use short, active labels: `Add issue`, `Import notes`, `Move to done`.
- Prefer `issue` or `task` consistently in a given user-facing context; use `Issue` in code.
- Avoid vague errors such as `Something went wrong` when a useful recovery action is known.
- Do not describe Claude as infallible. Let users review and edit generated tasks.

## Accessibility checklist

- Meet WCAG 2.2 AA contrast targets.
- Provide visible `:focus-visible` treatment for every interactive element.
- Dialogs trap focus, have an accessible name, and restore focus on close.
- Forms have persistent labels and linked error messages.
- Drag-and-drop provides keyboard operation or a non-drag status menu.
- Column and card order remain understandable to screen readers.
- Socket updates do not unexpectedly steal focus.
- Live announcements are concise and rate-limited.

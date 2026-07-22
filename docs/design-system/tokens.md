# Design Tokens

Creator must use semantic variables instead of hard-coded product colors in business components.

`app/src/styles/parallel-universe-tokens.css` is the sole owner for system-level
Reader, Creator, shadcn-theme, workbench, and Writing Desk token definitions.
`app/src/index.css` may consume those variables but may not redefine them. The
only custom-property declarations retained there are component-private
`--pu-liquid-*-local` modifier values whose scope is the active glass instance.

Required Creator token family:

- `--creator-bg`
- `--creator-surface`
- `--creator-surface-strong`
- `--creator-border`
- `--creator-border-strong`
- `--creator-text`
- `--creator-text-muted`
- `--creator-text-dim`
- `--creator-accent`
- `--creator-accent-soft`
- `--creator-confirm`
- `--creator-danger`
- `--creator-editor-bg`
- `--creator-editor-text`
- `--creator-editor-control`
- `--creator-editor-control-strong`
- `--creator-editor-line`
- `--creator-workbench-paper`
- `--creator-workbench-paper-ruling`
- `--creator-workbench-paper-edge`
- `--creator-workbench-main-ruling`
- `--creator-workbench-main-shade`

Reader reading-paper controls use their own semantic family:

- `--pu-reader-tool-border`
- `--pu-reader-tool-border-hover`
- `--pu-reader-tool-background`
- `--pu-reader-tool-background-hover`
- `--pu-reader-tool-foreground`

These values are owned by `parallel-universe-tokens.css` and consumed by
`ReaderReadingToolButton`. Story pages must not copy the underlying color
values or restore a page-global `reader-tool-button` selector.

Reader-specific image and reading-surface tokens must not be used by Creator
surfaces. In practice, Creator app and `components/creator` code must not
reference:

- `--ink-*`
- `--worldline-*`
- `--manuscript-*`
- Reader depth/background assets

Creator workbench backgrounds must read as local writing software, not as the
Reader cosmic surface. Use the Creator workbench paper/ruling tokens above; do
not put Reader planet images, depth stages, nebula effects, or radial hero glows
inside the Creator workbench root or main scroll surface.

Script: `npm run check:design-tokens`. The gate checks both presence in the
token layer and absence of system-token definitions from `index.css`.
